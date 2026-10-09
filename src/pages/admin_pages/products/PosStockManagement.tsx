import { useState, useEffect, useMemo } from 'react';
import {
  ScanLine,
  RefreshCw,
  Search,
  Barcode,
  AlertTriangle,
  Package,
  Store,
  CreditCard,
  Camera
} from 'lucide-react';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import { toast } from 'react-toastify';
import fetchData from '../../../helper';
import Pagination from '../../../components/ui/Pagination';
// @ts-ignore
import BarcodeScannerOverlay from '../../../components/BarcodeScannerOverlay';

export interface PosStockProduct {
  id: string;
  productId: string;
  name: string;
  image?: string;
  variantName: string;
  variantsCount: number;
  productType: string;
  unit: string;
  unitType: string;
  sku: string;
  barcode?: string;
  price: number;
  mrp?: number;
  landingPrice?: number;
  sellingPrice?: number;
  posPrice?: number;
  stock: number;
  isOnline: boolean;
  isPos: boolean;
  isVehicle: boolean;
  status: string;
  lifecycleStage: string;
  stageNotes?: string;
  updatedAt: string;
  shelfLocation?: string;
  taxRate?: number;
  baseStock?: number;
}

const sanitizeUrl = (url: string | null | undefined): string | null => {
  if (!url || typeof url !== 'string' || !url.trim()) return null;
  let clean = url.trim();
  clean = clean.replace('https://villagkart-media.s3.ap-south-1.amazonaws.com', 'https://dev-villagkart-media.s3.ap-south-1.amazonaws.com');
  try {
    return encodeURI(clean);
  } catch {
    return clean;
  }
};

export const extractProductImage = (p: any): string | null => {
  if (!p) return null;

  if (typeof p.image === 'string' && p.image.trim()) return sanitizeUrl(p.image);
  if (typeof p.mainImage === 'string' && p.mainImage.trim()) return sanitizeUrl(p.mainImage);

  if (Array.isArray(p.images) && p.images.length > 0) {
    const first = p.images[0];
    if (typeof first === 'string' && first.trim()) return sanitizeUrl(first);
    if (first && typeof first === 'object') {
      const url = first.url || first.src || first.image || first.path;
      if (typeof url === 'string' && url.trim()) return sanitizeUrl(url);
    }
  }

  if (typeof p.images === 'string' && p.images.trim()) {
    const trimmed = p.images.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed[0];
          if (typeof first === 'string' && first.trim()) return sanitizeUrl(first);
          if (first && typeof first === 'object') {
            const url = first.url || first.src || first.image || first.path;
            if (typeof url === 'string' && url.trim()) return sanitizeUrl(url);
          }
        }
      } catch {
        // Ignored
      }
    } else if (trimmed.startsWith('http') || trimmed.startsWith('/') || trimmed.startsWith('data:')) {
      return sanitizeUrl(trimmed);
    }
  }

  if (p.product && typeof p.product === 'object' && p.product !== p) {
    const nestedImg = extractProductImage(p.product);
    if (nestedImg) return nestedImg;
  }

  if (Array.isArray(p.variants) && p.variants.length > 0) {
    for (const v of p.variants) {
      if (!v) continue;
      if (typeof v.image === 'string' && v.image.trim()) return sanitizeUrl(v.image);
      if (Array.isArray(v.primaryImages) && v.primaryImages.length > 0) {
        const first = v.primaryImages[0];
        if (typeof first === 'string' && first.trim()) return sanitizeUrl(first);
      }
      if (Array.isArray(v.images) && v.images.length > 0) {
        const first = v.images[0];
        if (typeof first === 'string' && first.trim()) return sanitizeUrl(first);
      }
    }
  }

  return null;
};

export default function PosStockManagement() {
  const [products, setProducts] = useState<PosStockProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [filterPos, setFilterPos] = useState<'ALL' | 'ENABLED' | 'DISABLED'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Return to ready modal
  const [confirmProduct, setConfirmProduct] = useState<PosStockProduct | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isBulkReturning, setIsBulkReturning] = useState(false);
  const [showBulkReturnModal, setShowBulkReturnModal] = useState(false);

  // Edit POS quick modal
  const [editProduct, setEditProduct] = useState<PosStockProduct | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPosPrice, setEditPosPrice] = useState<number | string>('');
  const [editBarcode, setEditBarcode] = useState<string>('');
  const [editShelfLocation, setEditShelfLocation] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk POS Price Edit State
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
  const [bulkPriceItems, setBulkPriceItems] = useState<
    Record<string, { posPrice: string | number; sellingPrice: string | number; mrp: string | number; barcode?: string }>
  >({});
  const [bulkPriceMode, setBulkPriceMode] = useState<'TABLE' | 'UNIFORM'>('TABLE');
  const [uniformType, setUniformType] = useState<'FIXED' | 'PERCENT_MRP' | 'FLAT_DISCOUNT'>('FIXED');
  const [uniformVal, setUniformVal] = useState<string | number>('');
  const [isSubmittingBulkPrice, setIsSubmittingBulkPrice] = useState(false);

  const loadPosStock = async () => {
    setIsLoading(true);
    try {
      const listRes = await fetchData<{ status: boolean; data: any[] | { products?: any[] } }>('productmanagement/product?limit=2000', 'GET')
        .catch(() => fetchData<{ status: boolean; data: any[] | { products?: any[] } }>('product/getProducts?limit=2000', 'GET'));
      const raw = Array.isArray(listRes?.data) ? listRes.data : (listRes?.data as any)?.products || [];

      const mapped: PosStockProduct[] = raw
        .filter((p: any) => {
          const isPos = p.posStoreStock?.isPosEnabled !== undefined
            ? Boolean(p.posStoreStock.isPosEnabled)
            : (p.isPos === true || (Array.isArray(p.tags) && p.tags.includes('CH:POS')));
          const hasPosStock = Number(p.posStock ?? p.posStoreStock?.posStock ?? p.liveStockChannel?.posAvailable) > 0;

          return isPos || hasPosStock;
        })
        .map((p: any) => {
          const tags = Array.isArray(p.tags) ? p.tags : [];
          const hasChTag = tags.some((t: string) => t.startsWith('CH:'));
          const isOnline = p.onlineAppStock?.isPublished !== undefined
            ? Boolean(p.onlineAppStock.isPublished)
            : (hasChTag ? tags.includes('CH:ONLINE') : Boolean(p.isOnline));
          const isPos = p.posStoreStock?.isPosEnabled !== undefined
            ? Boolean(p.posStoreStock.isPosEnabled)
            : (hasChTag ? tags.includes('CH:POS') : Boolean(p.isPos));
          const isVehicle = hasChTag ? tags.includes('CH:VEHICLE') : Boolean(p.isVehicle);

          const variants = Array.isArray(p.variants) ? p.variants : [];
          const firstVar = variants[0] || {};
          const variantName = p.variantName || firstVar.variantName || firstVar.name || 'Default';
          const variantsCount = variants.length;

          const productId = (p.productId as string) || String(p.id ?? '').slice(0, 8).toUpperCase();
          const img = extractProductImage(p);
          const stageStock = (p.posStock !== undefined && p.posStock !== null)
            ? Number(p.posStock)
            : (p.posStoreStock?.posStock !== undefined && p.posStoreStock?.posStock !== null
              ? Number(p.posStoreStock.posStock)
              : (p.liveStockChannel?.posAvailable !== undefined ? Number(p.liveStockChannel.posAvailable) : 0));

          // Sanitize clean unit label (strip UUIDs)
          let cleanUnit = p.unit || 'Unit';
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanUnit)) {
            cleanUnit = p.unitType || 'Unit';
          }
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanUnit)) {
            cleanUnit = 'Unit';
          }

          return {
            id: p.id,
            productId,
            name: p.name || '',
            image: img,
            variantName,
            variantsCount,
            productType: p.productType || p.inventoryType || 'Standard',
            unit: cleanUnit,
            unitType: p.unitType || 'Unit',
            sku: p.sku || firstVar.sku || 'N/A',
            barcode: p.barcode || firstVar.barcode || p.gtin || '',
            price: Number(p.price || 0),
            mrp: Number(p.mrp || 0), // From Product master
            landingPrice: Number(p.landingPrice ?? p.costPrice ?? 0), // From Product master (costPrice)
            sellingPrice: Number(p.sellingPrice ?? p.finalPrice ?? p.price ?? 0), // From Product master
            posPrice: Number(p.posPrice ?? p.posStoreStock?.posPrice ?? p.posStoreStock?.price ?? p.price ?? 0), // From ChannelInventory
            stock: stageStock, // Channel Available Qty from ChannelInventory
            isOnline,
            isPos,
            isVehicle,
            status: p.status || (p.isActive ? 'APPROVED' : 'PENDING'),
            lifecycleStage: 'LIVE',
            stageNotes: p.stageNotes || '',
            updatedAt: p.updatedAt || new Date().toISOString(),
            shelfLocation: p.tags?.find((t: string) => t.startsWith('SHELF:'))?.split(':')[1] || '',
            taxRate: p.taxRate || 5,
            baseStock: p.baseStock // Warehouse stock from Product table
          };
        });

      setProducts(mapped);
    } catch (err) {
      console.error('Failed to load POS stock data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPosStock();
  }, []);

  const handleTogglePosStatus = async (product: PosStockProduct) => {
    setTogglingId(product.id);
    const newPos = !product.isPos;

    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isPos: newPos } : p));

    try {
      await fetchData(`productmanagement/product/${product.id}/lifecycle`, 'POST', {
        stage: 'LIVE',
        isOnline: product.isOnline,
        isPos: newPos,
        isVehicle: product.isVehicle,
        notes: product.stageNotes
      }).catch(() => fetchData(`product/${product.id}/lifecycle`, 'POST', {
        stage: 'LIVE',
        isOnline: product.isOnline,
        isPos: newPos,
        isVehicle: product.isVehicle,
        notes: product.stageNotes
      }));
      toast.success(`${product.name} ${newPos ? 'Enabled for Store POS' : 'Disabled from Store POS'}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update POS status');
      loadPosStock();
    } finally {
      setTogglingId(null);
    }
  };

  const handleOpenEditModal = (product: PosStockProduct) => {
    setEditProduct(product);
    setEditPosPrice((product.posPrice ?? 0) > 0 ? (product.posPrice as number) : '');
    setEditBarcode(product.barcode || '');
    setEditShelfLocation(product.shelfLocation || '');
    setIsEditModalOpen(true);
  };

  const handleReturnToReady = (product: PosStockProduct) => {
    setConfirmProduct(product);
  };

  const executeReturnToReady = async () => {
    if (!confirmProduct) return;
    const product = confirmProduct;
    setReturningId(product.id);
    setConfirmProduct(null);
    try {
      await fetchData(`productmanagement/product/bulk/lifecycle/return-to-ready`, 'POST', {
        productIds: [product.id],
        channel: 'POS'
      });

      toast.success(`${product.name} returned to Ready Inventory and disabled from POS`);
      loadPosStock();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to return product to Ready Inventory');
    } finally {
      setReturningId(null);
    }
  };

  const handleSavePosConfig = async () => {
    if (!editProduct) return;
    setIsSubmitting(true);
    try {
      await fetchData(`productmanagement/product/${editProduct.id}`, 'PUT', {
        posPrice: Number(editPosPrice),
        barcode: editBarcode
      }).catch(() => fetchData(`product/${editProduct.id}`, 'PUT', {
        posPrice: Number(editPosPrice),
        barcode: editBarcode
      }));

      setProducts(prev => prev.map(p => p.id === editProduct.id ? {
        ...p,
        posPrice: Number(editPosPrice),
        barcode: editBarcode,
        shelfLocation: editShelfLocation
      } : p));

      toast.success(`POS settings updated for ${editProduct.name}`);
      setIsEditModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update POS parameters');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSelection = (productId: string) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === filtered.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filtered.map(p => p.id)));
    }
  };

  const executeBulkReturnToReady = async () => {
    if (selectedProducts.size === 0) return;
    setIsBulkReturning(true);
    setShowBulkReturnModal(false);
    try {
      await fetchData(`productmanagement/product/bulk/lifecycle/return-to-ready`, 'POST', {
        productIds: Array.from(selectedProducts),
        channel: 'POS'
      });
      toast.success(`Successfully returned ${selectedProducts.size} products to Ready Inventory`);
      setSelectedProducts(new Set());
      loadPosStock();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to perform bulk return');
    } finally {
      setIsBulkReturning(false);
    }
  };

  const handleOpenBulkPriceModal = () => {
    const initial: Record<string, { posPrice: string | number; sellingPrice: string | number; mrp: string | number; barcode?: string }> = {};
    products.forEach((p) => {
      if (selectedProducts.has(p.id)) {
        initial[p.id] = {
          posPrice: p.posPrice || 0,
          sellingPrice: p.sellingPrice || 0,
          mrp: p.mrp || 0,
          barcode: p.barcode || '',
        };
      }
    });
    setBulkPriceItems(initial);
    setBulkPriceMode('TABLE');
    setUniformVal('');
    setShowBulkPriceModal(true);
  };

  const handleApplyUniformRule = () => {
    const val = Number(uniformVal);
    if (isNaN(val) || val < 0) {
      toast.error('Please enter a valid positive number');
      return;
    }

    setBulkPriceItems((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        const prod = products.find((p) => p.id === id);
        if (!prod) return;

        let newPos = Number(updated[id].posPrice);
        const mrp = Number(updated[id].mrp || prod.mrp || 0);
        const selling = Number(updated[id].sellingPrice || prod.sellingPrice || 0);

        if (uniformType === 'FIXED') {
          newPos = val;
        } else if (uniformType === 'PERCENT_MRP') {
          if (mrp > 0) {
            newPos = Math.max(0, Math.round(mrp * (1 - val / 100) * 100) / 100);
          }
        } else if (uniformType === 'FLAT_DISCOUNT') {
          const base = selling > 0 ? selling : mrp;
          newPos = Math.max(0, Math.round((base - val) * 100) / 100);
        }

        updated[id] = {
          ...updated[id],
          posPrice: newPos,
        };
      });
      return updated;
    });

    toast.success('Applied rule across selected products');
    setBulkPriceMode('TABLE');
  };

  const handleSaveBulkPrice = async () => {
    setIsSubmittingBulkPrice(true);
    try {
      const updates = Object.keys(bulkPriceItems).map((productId) => {
        const item = bulkPriceItems[productId];
        return {
          productId,
          posPrice: Number(item.posPrice),
          sellingPrice: Number(item.sellingPrice),
          mrp: Number(item.mrp),
          barcode: item.barcode || undefined,
        };
      });

      const res = await fetchData<{ status: boolean; message?: string }>('productmanagement/product/bulk-update-online-price', 'POST', { updates })
        .catch(() => fetchData<{ status: boolean; message?: string }>('product/bulk-update-online-price', 'POST', { updates }));

      toast.success(res?.message || `Successfully updated POS prices for ${updates.length} products`);

      setProducts((prev) =>
        prev.map((p) => {
          if (bulkPriceItems[p.id]) {
            const item = bulkPriceItems[p.id];
            return {
              ...p,
              posPrice: Number(item.posPrice),
              sellingPrice: Number(item.sellingPrice),
              mrp: Number(item.mrp),
              barcode: item.barcode || p.barcode,
            };
          }
          return p;
        })
      );

      setSelectedProducts(new Set());
      setShowBulkPriceModal(false);
    } catch (err: any) {
      console.error('Failed to bulk update POS prices:', err);
      toast.error(err?.message || 'Failed to update POS prices. Please try again.');
    } finally {
      setIsSubmittingBulkPrice(false);
    }
  };

  // Metrics
  const totalCatalogCount = products.length;
  const posActiveCount = useMemo(() => products.filter(p => p.isPos).length, [products]);
  const posStockSum = useMemo(() => products.filter(p => p.isPos).reduce((acc, curr) => acc + curr.stock, 0), [products]);
  const barcodeReadyCount = useMemo(() => products.filter(p => p.barcode && p.barcode.length > 5).length, [products]);

  const filtered = products.filter(p => {
    const matchesSearch = !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.productId.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.includes(search)) ||
      p.sku.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filterPos === 'ENABLED' && !p.isPos) return false;
    if (filterPos === 'DISABLED' && p.isPos) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedProducts = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const paginationObj = {
    page: currentPage,
    limit: itemsPerPage,
    total: filtered.length,
    totalPages: totalPages,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1
  };

  return (
    <div className="w-full px-2 sm:px-4 py-4 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2.5">
            <ScanLine className="text-emerald-600 dark:text-emerald-400" size={26} />
            Store POS (Point of Sale) Stock Management
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Manage checkout register stock, barcode associations, instant barcode billing, and counter inventory.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadPosStock}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <Breadcrumbs />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 flex items-center justify-between">
          <div>
            <div className="text-xs opacity-85 font-medium">POS Register Enabled</div>
            <div className="text-2xl font-bold mt-1">{posActiveCount} <span className="text-xs font-normal opacity-75">/ {totalCatalogCount} Products</span></div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold">
            <CreditCard size={20} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">POS Shelved Units</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{posStockSum.toLocaleString()}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Package size={20} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Barcode Ready</div>
            <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-300 mt-1">{barcodeReadyCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Barcode size={20} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">POS Disabled</div>
            <div className="text-2xl font-bold text-gray-700 dark:text-gray-300 mt-1">{totalCatalogCount - posActiveCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 flex items-center justify-center font-bold">
            <AlertTriangle size={20} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 flex-1 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by barcode, product name, SKU, or Product ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-gray-100"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl shadow-sm hover:shadow transition-all text-xs sm:text-sm font-semibold whitespace-nowrap active:scale-95 shrink-0 cursor-pointer"
            title="Scan product barcode using camera"
          >
            <Camera size={16} />
            <span className="hidden sm:inline">Scan</span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => { setFilterPos('ALL'); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${filterPos === 'ALL' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              All
            </button>
            <button
              onClick={() => { setFilterPos('ENABLED'); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${filterPos === 'ENABLED' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              POS Enabled
            </button>
            <button
              onClick={() => { setFilterPos('DISABLED'); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${filterPos === 'DISABLED' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              Disabled
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedProducts.size > 0 && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
              {selectedProducts.size} product{selectedProducts.size > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenBulkPriceModal}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-sm font-semibold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <CreditCard size={16} />
              Bulk Edit POS Prices
            </button>
            <button
              onClick={() => setShowBulkReturnModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <RefreshCw size={16} />
              Bulk Return to Ready
            </button>
          </div>
        </div>
      )}

      {isScannerOpen && (
        <BarcodeScannerOverlay
          onScan={(code: string) => {
            const cleanCode = String(code || '').trim();
            if (cleanCode) {
              setSearch(cleanCode);
              setCurrentPage(1);
              setIsScannerOpen(false);
            }
          }}
          onClose={() => setIsScannerOpen(false)}
        />
      )}

      {/* Products Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <RefreshCw className="animate-spin mb-3 text-emerald-500" size={32} />
            <p className="text-sm">Loading Store POS stock items...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <ScanLine className="mb-3 text-gray-300 dark:text-gray-600" size={42} />
            <p className="text-base font-semibold text-gray-700 dark:text-gray-300">No POS products found</p>
            <p className="text-xs text-gray-500 mt-1">Try adjusting your search query or POS filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/75 dark:bg-gray-900/40 text-gray-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      checked={filtered.length > 0 && selectedProducts.size === filtered.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-4">MRP</th>
                  <th className="py-3 px-4">Landing Price</th>
                  <th className="py-3 px-4">Selling Price</th>
                  <th className="py-3 px-4">POS Billing Price</th>
                  <th className="py-3 px-4">Barcode / GTIN</th>
                  <th className="py-3 px-4">Counter Stock</th>
                  <th className="py-3 px-4">Shelf / Bay Location</th>
                  <th className="py-3 px-4 text-center">POS Terminal</th>
                  <th className="py-3 px-4 text-right">Quick Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {paginatedProducts.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 transition-colors group">
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        checked={selectedProducts.has(p.id)}
                        onChange={() => toggleSelection(p.id)}
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {p.image ? (
                          <div className="relative shrink-0">
                            <img 
                              src={p.image} 
                              alt={p.name} 
                              className="w-10 h-10 rounded-xl object-cover border border-gray-200 dark:border-gray-700 shrink-0 bg-gray-50 shadow-xs" 
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                                const sibling = (e.target as HTMLElement).nextElementSibling;
                                if (sibling) sibling.classList.remove('hidden');
                              }}
                            />
                            <div className="hidden w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                              {(p.name || 'P').slice(0, 2).toUpperCase()}
                            </div>
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                            {(p.name || 'P').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">{p.name}</div>
                          <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-emerald-600 dark:text-emerald-400">ID: {p.productId}</span>
                            <span>•</span>
                            <span>{p.variantName}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">₹{p.mrp?.toFixed(2) || '0.00'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">₹{p.landingPrice?.toFixed(2) || '0.00'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">₹{p.sellingPrice?.toFixed(2) || '0.00'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900 dark:text-gray-100">₹{(p.posPrice || 0).toFixed(2)}</div>
                      <div className="text-[10px] text-gray-400 font-medium">Incl. Tax ({p.taxRate}%)</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700/60 font-mono text-xs text-gray-800 dark:text-gray-200">
                        <Barcode size={13} className="text-gray-500" />
                        <span>{p.barcode || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold w-max ${p.stock <= 5 ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'}`}>
                          {p.stock}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/40 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-600">
                        <Store size={12} className="text-gray-400" />
                        {p.shelfLocation}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleTogglePosStatus(p)}
                        disabled={togglingId === p.id}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${p.isPos ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${p.isPos ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleReturnToReady(p)}
                          disabled={returningId === p.id}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 hover:text-amber-600 transition-colors cursor-pointer disabled:opacity-50"
                          title="Return to Ready Inventory"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" /></svg>
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors cursor-pointer"
                        >
                          Edit POS
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Show
            <select
              className="mx-2 border rounded p-1"
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            >
              {[10, 20, 50, 100].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            entries
          </div>
          <Pagination
            currentPage={currentPage}
            pagination={paginationObj}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      </div>

      {/* Edit POS Config Modal */}
      {isEditModalOpen && editProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">POS Product Configuration</h3>
                <p className="text-xs text-gray-400 mt-0.5">{editProduct.name}</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer">✕</button>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">POS Billing Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={editPosPrice}
                  onChange={(e) => setEditPosPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Barcode / GTIN Number</label>
                <input
                  type="text"
                  value={editBarcode}
                  onChange={(e) => setEditBarcode(e.target.value)}
                  placeholder="Scan or enter barcode..."
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Shelf / Bay Allocation</label>
                <input
                  type="text"
                  value={editShelfLocation}
                  onChange={(e) => setEditShelfLocation(e.target.value)}
                  placeholder="e.g. Aisle 2 - Rack B"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePosConfig}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting && <RefreshCw size={12} className="animate-spin" />}
                <span>Save POS Setup</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Return Confirmation Modal */}
      {showBulkReturnModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Confirm Bulk Return</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You are about to return {selectedProducts.size} product{selectedProducts.size > 1 ? 's' : ''} to Ready Inventory.
                </p>
              </div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 p-3 rounded-xl text-xs leading-relaxed mb-6 border border-orange-100 dark:border-orange-800/50 font-medium">
              This will set the POS Counter Stock for all selected products to 0 and disable them from the POS system immediately.
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowBulkReturnModal(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors cursor-pointer"
                disabled={isBulkReturning}
              >
                Cancel
              </button>
              <button
                onClick={executeBulkReturnToReady}
                disabled={isBulkReturning}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-xs shadow-red-500/20 cursor-pointer"
              >
                {isBulkReturning ? <RefreshCw className="animate-spin" size={16} /> : null}
                Yes, Return {selectedProducts.size} Item{selectedProducts.size > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return to Ready Confirmation Modal */}
      {confirmProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-500 mb-2">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Return to Ready Inventory?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Are you sure you want to return <strong>{confirmProduct.name}</strong> ({confirmProduct.variantName}) to Ready Inventory?
                </p>
                {confirmProduct.isPos && (
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-2 font-medium">
                    This will also disable the product from Store POS.
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 w-full mt-6">
              <button
                onClick={() => setConfirmProduct(null)}
                className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeReturnToReady}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                Yes, Return
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Bulk POS Price Edit Modal */}
      {showBulkPriceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-slate-50 dark:bg-gray-900/50">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <CreditCard className="text-emerald-500" size={20} />
                  Bulk Edit POS Prices ({selectedProducts.size} Items)
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Update POS Billing Prices individually per product or apply a mass rule across selected items.
                </p>
              </div>
              <button
                onClick={() => setShowBulkPriceModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="px-6 pt-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-6 bg-white dark:bg-gray-800">
              <button
                onClick={() => setBulkPriceMode('TABLE')}
                className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                  bulkPriceMode === 'TABLE'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Batch Table Edit (Different Prices)
              </button>
              <button
                onClick={() => setBulkPriceMode('UNIFORM')}
                className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                  bulkPriceMode === 'UNIFORM'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Apply Uniform Mass Rule
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {bulkPriceMode === 'UNIFORM' ? (
                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/40 rounded-xl p-5 space-y-4">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    Apply Mass Rule across {selectedProducts.size} Selected Items
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Rule Strategy
                      </label>
                      <select
                        value={uniformType}
                        onChange={(e: any) => setUniformType(e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-xs sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="FIXED">Set Fixed POS Price (₹)</option>
                        <option value="PERCENT_MRP">Apply % Discount off MRP</option>
                        <option value="FLAT_DISCOUNT">Flat ₹ Discount off Selling Price</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        {uniformType === 'FIXED' ? 'Fixed POS Price (₹)' : uniformType === 'PERCENT_MRP' ? 'Discount Percentage (%)' : 'Flat Discount Amount (₹)'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder={uniformType === 'PERCENT_MRP' ? 'e.g. 10' : 'e.g. 50'}
                        value={uniformVal}
                        onChange={(e) => setUniformVal(e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-xs sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleApplyUniformRule}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                    >
                      Apply Rule to Preview Table
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Table Preview & Individual Inputs */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900/30">
                <div className="overflow-x-auto max-h-[350px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 uppercase text-[10px] font-bold tracking-wider z-10">
                      <tr>
                        <th className="p-3">Product Name</th>
                        <th className="p-3">MRP (₹)</th>
                        <th className="p-3">Selling Price (₹)</th>
                        <th className="p-3 text-emerald-600 dark:text-emerald-400">POS Billing Price (₹)</th>
                        <th className="p-3">Barcode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {products
                        .filter((p) => selectedProducts.has(p.id))
                        .map((p) => {
                          const itemState = bulkPriceItems[p.id] || {
                            posPrice: p.posPrice || 0,
                            sellingPrice: p.sellingPrice || 0,
                            mrp: p.mrp || 0,
                            barcode: p.barcode || '',
                          };

                          return (
                            <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                              <td className="p-3 max-w-[200px]">
                                <div className="font-semibold text-gray-900 dark:text-gray-100 truncate" title={p.name}>
                                  {p.name}
                                </div>
                                <div className="text-[10px] text-gray-400">SKU: {p.sku}</div>
                              </td>
                              <td className="p-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={itemState.mrp}
                                  onChange={(e) =>
                                    setBulkPriceItems((prev) => ({
                                      ...prev,
                                      [p.id]: { ...prev[p.id], mrp: e.target.value },
                                    }))
                                  }
                                  className="w-20 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </td>
                              <td className="p-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={itemState.sellingPrice}
                                  onChange={(e) =>
                                    setBulkPriceItems((prev) => ({
                                      ...prev,
                                      [p.id]: { ...prev[p.id], sellingPrice: e.target.value },
                                    }))
                                  }
                                  className="w-20 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </td>
                              <td className="p-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={itemState.posPrice}
                                  onChange={(e) =>
                                    setBulkPriceItems((prev) => ({
                                      ...prev,
                                      [p.id]: { ...prev[p.id], posPrice: e.target.value },
                                    }))
                                  }
                                  className="w-28 border border-emerald-500 rounded px-2 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 focus:ring-2 focus:ring-emerald-500"
                                />
                              </td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  value={itemState.barcode || ''}
                                  onChange={(e) =>
                                    setBulkPriceItems((prev) => ({
                                      ...prev,
                                      [p.id]: { ...prev[p.id], barcode: e.target.value },
                                    }))
                                  }
                                  className="w-32 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                                  placeholder="Barcode"
                                />
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-3 bg-gray-50 dark:bg-gray-900/50">
              <button
                onClick={() => setShowBulkPriceModal(false)}
                disabled={isSubmittingBulkPrice}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBulkPrice}
                disabled={isSubmittingBulkPrice}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors disabled:opacity-60 flex items-center gap-2 shadow-xs cursor-pointer"
              >
                {isSubmittingBulkPrice ? <RefreshCw className="animate-spin" size={16} /> : null}
                <span>Save Prices for {selectedProducts.size} Products</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

