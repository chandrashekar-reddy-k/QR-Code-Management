import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  RefreshCw, 
  Search, 
  AlertCircle,
  Smartphone,
  ScanLine,
  Truck,
  RotateCcw,
  SlidersHorizontal,
  Check,
  Building2,
  XCircle,
  Store,
  Package
} from 'lucide-react';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import { toast } from 'react-toastify';
import fetchData from '../../../helper';
import Pagination from '../../../components/ui/Pagination';

export interface LiveProduct {
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
  price: number;
  stock: number;
  vehicleStock: number;
  isOnline: boolean;
  isPos: boolean;
  isVehicle: boolean;
  status: string;
  lifecycleStage: string;
  stageNotes?: string;
  updatedAt: string;
  tags?: string[];
}

export default function LiveStockManagement() {
  const [products, setProducts] = useState<LiveProduct[]>([]);
  const [storeroomCount, setStoreroomCount] = useState(0);
  const [productionCount, setProductionCount] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<'ALL' | 'ONLINE' | 'POS' | 'VEHICLE'>('ALL');
  
  // Return to production modal
  const [selectedProduct, setSelectedProduct] = useState<LiveProduct | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnQuantity, setReturnQuantity] = useState<number>(1);
  const [returnNotes, setReturnNotes] = useState('');
  
  // Channel Assignment Drawer/Modal
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [channelEditProduct, setChannelEditProduct] = useState<LiveProduct | null>(null);
  const [editOnline, setEditOnline] = useState(true);
  const [editPos, setEditPos] = useState(true);
  const [editVehicle, setEditVehicle] = useState(true);
  
  // Bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkChannelModalOpen, setIsBulkChannelModalOpen] = useState(false);
  const [bulkOnline, setBulkOnline] = useState(true);
  const [bulkPos, setBulkPos] = useState(true);
  const [bulkVehicle, setBulkVehicle] = useState(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [togglingChannelId, setTogglingChannelId] = useState<string | null>(null);
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);

  const loadLiveData = async () => {
    setIsLoading(true);
    try {
      const listRes = await fetchData<{ status: boolean; data: any[] | { products?: any[] } }>('productmanagement/product?limit=2000', 'GET')
        .catch(() => fetchData<{ status: boolean; data: any[] | { products?: any[] } }>('product/getProducts?limit=2000', 'GET'));
      const raw = Array.isArray(listRes?.data) ? listRes.data : (listRes?.data as any)?.products || [];
      
      let storeCount = 0;
      let prodCount = 0;

      raw.forEach((p: any) => {
        const tagStage = Array.isArray(p.tags) ? p.tags.find((t: string) => t.startsWith('LIFECYCLE:'))?.split(':')[1] : null;
        const stage = p.lifecycleStage || tagStage || 'STORE_ROOM';
        if (stage === 'STORE_ROOM') storeCount++;
        else if (stage === 'IN_PRODUCTION' || stage === 'READY_FOR_LIVE') prodCount++;
      });

      setStoreroomCount(storeCount);
      setProductionCount(prodCount);

      const mapped: LiveProduct[] = raw
        .filter((p: any) => {
          if (p.stageStocks?.LIVE !== undefined) {
            return Number(p.stageStocks.LIVE) > 0;
          }
          if (p.liveStock !== undefined) {
            return Number(p.liveStock) > 0;
          }
          const tagStage = Array.isArray(p.tags) ? p.tags.find((t: string) => t.startsWith('LIFECYCLE:'))?.split(':')[1] : null;
          const stage = p.lifecycleStage || tagStage;
          return stage === 'LIVE';
        })
        .map((p: any) => {
          const tags = Array.isArray(p.tags) ? p.tags : [];
          // Channel resolution from tags or flags
          const hasChTag = tags.some((t: string) => t.startsWith('CH:'));
          const isOnline = hasChTag ? tags.includes('CH:ONLINE') : (p.isOnline !== false);
          const isPos = hasChTag ? tags.includes('CH:POS') : (p.isPos !== false);
          const isVehicle = hasChTag ? tags.includes('CH:VEHICLE') : (p.isVehicle !== false);

          const variants = Array.isArray(p.variants) ? p.variants : [];
          const firstVar = variants[0] || {};
          const variantName = p.variantName || firstVar.variantName || firstVar.name || 'Default';
          const variantsCount = variants.length;

          const productId = (p.productId as string) || String(p.id ?? '').slice(0, 8).toUpperCase();
          const img = p.image || (Array.isArray(p.images) ? p.images[0] : null);
          const stageStock = (p.stageStocks?.LIVE !== undefined)
            ? Number(p.stageStocks.LIVE)
            : (p.liveStock !== undefined ? Number(p.liveStock) : Number(p.stock || 0));

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
            price: Number(p.price || p.mrp || 0),
            stock: stageStock,
            vehicleStock: Number(p.vehicleStock || 0),
            isOnline,
            isPos,
            isVehicle,
            status: p.status || 'APPROVED',
            lifecycleStage: 'LIVE',
            stageNotes: p.stageNotes || '',
            updatedAt: p.updatedAt || new Date().toISOString(),
            tags
          };
        });

      setProducts(mapped);
    } catch (err) {
      console.error('Failed to load live stock items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLiveData();
  }, []);

  // Quick toggle channel
  const handleToggleChannel = async (product: LiveProduct, channel: 'online' | 'pos' | 'vehicle') => {
    const updatedOnline = channel === 'online' ? !product.isOnline : product.isOnline;
    const updatedPos = channel === 'pos' ? !product.isPos : product.isPos;
    const updatedVehicle = channel === 'vehicle' ? !product.isVehicle : product.isVehicle;

    // Optimistic local update
    setProducts(prev => prev.map(p => p.id === product.id ? {
      ...p,
      isOnline: updatedOnline,
      isPos: updatedPos,
      isVehicle: updatedVehicle
    } : p));

    try {
      await fetchData(`productmanagement/product/${product.id}/lifecycle`, 'POST', {
        stage: 'LIVE',
        isOnline: updatedOnline,
        isPos: updatedPos,
        isVehicle: updatedVehicle,
        notes: product.stageNotes
      }).catch(() => fetchData(`product/${product.id}/lifecycle`, 'POST', {
        stage: 'LIVE',
        isOnline: updatedOnline,
        isPos: updatedPos,
        isVehicle: updatedVehicle,
        notes: product.stageNotes
      }));
      toast.success(`Channel routing updated for ${product.name}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update channel routing');
      loadLiveData();
    }
  };

  // Open channel edit modal
  const handleOpenChannelModal = (product: LiveProduct) => {
    setChannelEditProduct(product);
    setEditOnline(product.isOnline);
    setEditPos(product.isPos);
    setEditVehicle(product.isVehicle);
    setIsChannelModalOpen(true);
  };

  const handleSaveChannelModal = async () => {
    if (!channelEditProduct) return;
    setIsSubmitting(true);
    try {
      await fetchData(`productmanagement/product/${channelEditProduct.id}/lifecycle`, 'POST', {
        stage: 'LIVE',
        isOnline: editOnline,
        isPos: editPos,
        isVehicle: editVehicle,
        notes: channelEditProduct.stageNotes
      }).catch(() => fetchData(`product/${channelEditProduct.id}/lifecycle`, 'POST', {
        stage: 'LIVE',
        isOnline: editOnline,
        isPos: editPos,
        isVehicle: editVehicle,
        notes: channelEditProduct.stageNotes
      }));
      
      setProducts(prev => prev.map(p => p.id === channelEditProduct.id ? {
        ...p,
        isOnline: editOnline,
        isPos: editPos,
        isVehicle: editVehicle
      } : p));

      toast.success(`Channels updated for ${channelEditProduct.name}`);
      setIsChannelModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update channels');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bulk Channel Assignment
  const handleApplyBulkChannels = async () => {
    if (selectedIds.size === 0) return;
    setIsSubmitting(true);
    try {
      const promises = Array.from(selectedIds).map(id => {
        return fetchData(`productmanagement/product/${id}/lifecycle`, 'POST', {
          stage: 'LIVE',
          isOnline: bulkOnline,
          isPos: bulkPos,
          isVehicle: bulkVehicle
        }).catch(() => fetchData(`product/${id}/lifecycle`, 'POST', {
          stage: 'LIVE',
          isOnline: bulkOnline,
          isPos: bulkPos,
          isVehicle: bulkVehicle
        }));
      });

      await Promise.all(promises);
      toast.success(`Updated channels for ${selectedIds.size} products`);
      setSelectedIds(new Set());
      setIsBulkChannelModalOpen(false);
      loadLiveData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update bulk channels');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Return to production
  const handleOpenReturn = (product: LiveProduct) => {
    setSelectedProduct(product);
    setReturnQuantity(product.stock > 0 ? product.stock : 1);
    setReturnNotes('');
    setIsReturnModalOpen(true);
  };

  const handleConfirmReturn = async () => {
    if (!selectedProduct) return;
    if (returnQuantity <= 0) {
      toast.error('Please enter a valid return quantity greater than 0');
      return;
    }
    setIsSubmitting(true);
    try {
      await fetchData(`productmanagement/product/${selectedProduct.id}/lifecycle`, 'POST', {
        stage: 'IN_PRODUCTION',
        quantity: Number(returnQuantity),
        notes: returnNotes ? `[Return Qty: ${returnQuantity}] ${returnNotes}` : `Returned ${returnQuantity} units from Live back to Production`
      }).catch(() => fetchData(`product/${selectedProduct.id}/lifecycle`, 'POST', {
        stage: 'IN_PRODUCTION',
        quantity: Number(returnQuantity),
        notes: returnNotes ? `[Return Qty: ${returnQuantity}] ${returnNotes}` : `Returned ${returnQuantity} units from Live back to Production`
      }));
      toast.success(`${returnQuantity} units of ${selectedProduct.name} moved back to Production`);
      setProducts(prev => prev.filter(p => p.id !== selectedProduct.id));
      setIsReturnModalOpen(false);
      loadLiveData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to move product');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Selection helpers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(paginatedProducts.map(p => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filtered & Paginated
  const filtered = products.filter(p => {
    const matchesSearch = !search.trim() || 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.productId.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.variantName.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (channelFilter === 'ONLINE') return p.isOnline;
    if (channelFilter === 'POS') return p.isPos;
    if (channelFilter === 'VEHICLE') return p.isVehicle;

    return true;
  });

  const onlineCount = products.filter(p => p.isOnline).length;
  const posCount = products.filter(p => p.isPos).length;
  const vehicleCount = products.filter(p => p.isVehicle).length;

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
            <CheckCircle2 className="text-emerald-500" size={26} />
            Live Stock Channel Distribution & Assignment
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Flexibly assign, toggle, and route sellable products across Customer App, Store POS registers, and Delivery Vans.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={() => setIsBulkChannelModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm text-xs font-semibold transition-all cursor-pointer animate-in fade-in"
            >
              <SlidersHorizontal size={14} />
              <span>Assign Channels ({selectedIds.size})</span>
            </button>
          )}
          <button
            onClick={loadLiveData}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <Breadcrumbs />

      {/* Stage Count Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Store size={20} />
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Store-Room (Raw)</div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{storeroomCount} Products</div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Package size={20} />
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Production & Packing</div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{productionCount} Products</div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="text-xs opacity-85 font-medium">Live Sellable Stock</div>
              <div className="text-xl font-bold">{products.length} Products</div>
            </div>
          </div>
          <span className="text-[11px] font-semibold bg-white/20 px-2 py-0.5 rounded-full">Current</span>
        </div>
      </div>

      {/* Interactive Channel Cards (Click to Filter) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <button
          onClick={() => { setChannelFilter('ALL'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
            channelFilter === 'ALL'
              ? 'bg-gray-900 text-white border-gray-900 shadow-md dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
              channelFilter === 'ALL' ? 'bg-white/20 text-white dark:bg-black/10 dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}>
              <Building2 size={20} />
            </div>
            <div>
              <div className="text-xs opacity-75 font-medium">All Live Stock</div>
              <div className="text-lg font-bold">{products.length}</div>
            </div>
          </div>
          {channelFilter === 'ALL' && <Check size={16} />}
        </button>

        <button
          onClick={() => { setChannelFilter('ONLINE'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
            channelFilter === 'ONLINE'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
              channelFilter === 'ONLINE' ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            }`}>
              <Smartphone size={20} />
            </div>
            <div>
              <div className="text-xs opacity-75 font-medium">Customer App (Online)</div>
              <div className="text-lg font-bold">{onlineCount}</div>
            </div>
          </div>
          {channelFilter === 'ONLINE' && <Check size={16} />}
        </button>

        <button
          onClick={() => { setChannelFilter('POS'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
            channelFilter === 'POS'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
              channelFilter === 'POS' ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
            }`}>
              <ScanLine size={20} />
            </div>
            <div>
              <div className="text-xs opacity-75 font-medium">POS Registers</div>
              <div className="text-lg font-bold">{posCount}</div>
            </div>
          </div>
          {channelFilter === 'POS' && <Check size={16} />}
        </button>

        <button
          onClick={() => { setChannelFilter('VEHICLE'); setCurrentPage(1); }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
            channelFilter === 'VEHICLE'
              ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-500/20'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
              channelFilter === 'VEHICLE' ? 'bg-white/20 text-white' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
            }`}>
              <Truck size={20} />
            </div>
            <div>
              <div className="text-xs opacity-75 font-medium">Delivery Vans</div>
              <div className="text-lg font-bold">{vehicleCount}</div>
            </div>
          </div>
          {channelFilter === 'VEHICLE' && <Check size={16} />}
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search live stock by ID, name, SKU, or variant..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-gray-100"
          />
        </div>
      </div>

      {/* Table List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center">
            <RefreshCw className="animate-spin text-emerald-500 mx-auto mb-3" size={28} />
            <p className="text-sm text-gray-500">Loading live products & channel assignments...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400 space-y-2">
            <AlertCircle size={36} className="mx-auto text-gray-300 dark:text-gray-600" />
            <p className="text-sm font-medium">No products found in this channel view</p>
            <p className="text-xs text-gray-400">Try changing the channel filter or release products from Production.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-3.5 py-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={paginatedProducts.length > 0 && paginatedProducts.every(p => selectedIds.has(p.id))}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-3.5 py-3.5 text-center">ID</th>
                  <th className="px-3.5 py-3.5 text-center">IMAGE</th>
                  <th className="px-3.5 py-3.5">NAME</th>
                  <th className="px-3.5 py-3.5">VARIANT</th>
                  <th className="px-3.5 py-3.5">TYPE</th>
                  <th className="px-3.5 py-3.5 text-center">STORE-ROOM</th>
                  <th className="px-3.5 py-3.5 text-center">PRODUCTION</th>
                  <th className="px-3.5 py-3.5 text-center">LIVE</th>
                  <th className="px-3.5 py-3.5 text-center">IN VEHICLE</th>
                  <th className="px-3.5 py-3.5 text-center">POS</th>
                  <th className="px-3.5 py-3.5 text-center">ONLINE</th>
                  <th className="px-3.5 py-3.5 text-center">STATUS</th>
                  <th className="px-3.5 py-3.5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {paginatedProducts.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <tr key={item.id} className={`hover:bg-emerald-50/30 dark:hover:bg-gray-700/30 transition-colors ${isSelected ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}`}>
                      <td className="px-3.5 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(item.id)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* ID */}
                      <td className="px-3.5 py-3.5 text-center font-mono font-bold text-xs text-gray-700 dark:text-gray-300">
                        {item.productId}
                      </td>

                      {/* IMAGE */}
                      <td className="px-3.5 py-3.5 text-center">
                        <div className="w-10 h-10 mx-auto rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 overflow-hidden flex items-center justify-center">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <CheckCircle2 size={18} className="text-gray-400" />
                          )}
                        </div>
                      </td>

                      {/* NAME */}
                      <td className="px-3.5 py-3.5">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 max-w-[200px] truncate" title={item.name}>
                          {item.name}
                        </div>
                        <div className="text-[11px] text-gray-400">SKU: {item.sku}</div>
                      </td>

                      {/* VARIANT */}
                      <td className="px-3.5 py-3.5">
                        <div className="font-medium text-gray-800 dark:text-gray-200">{item.variantName}</div>
                        <div className="text-[11px] text-gray-400">{item.unit} ({item.unitType})</div>
                      </td>

                      {/* TYPE */}
                      <td className="px-3.5 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          {item.productType}
                        </span>
                      </td>

                      {/* STORE-ROOM */}
                      <td className="px-3.5 py-3.5 text-center">
                        <span className="font-medium text-gray-400 text-xs">0</span>
                      </td>

                      {/* PRODUCTION */}
                      <td className="px-3.5 py-3.5 text-center">
                        <span className="font-medium text-gray-400 text-xs">0</span>
                      </td>

                      {/* LIVE */}
                      <td className="px-3.5 py-3.5 text-center">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">{item.stock}</span>
                      </td>

                      {/* IN VEHICLE */}
                      <td className="px-3.5 py-3.5 text-center">
                        <span className={`font-semibold text-xs ${item.vehicleStock > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>
                          {item.vehicleStock}
                        </span>
                      </td>

                      {/* POS */}
                      <td className="px-3.5 py-3.5 text-center">
                        <button
                          onClick={() => handleToggleSingleChannel(item, 'isPos')}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            item.isPos 
                              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200' 
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200'
                          }`}
                          title={item.isPos ? `POS Enabled: ${item.stock} in stock (Click to toggle)` : 'POS Off (Click to toggle)'}
                        >
                          {item.isPos ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          <span>{item.isPos ? item.stock : 0}</span>
                        </button>
                      </td>

                      {/* ONLINE */}
                      <td className="px-3.5 py-3.5 text-center">
                        <button
                          onClick={() => handleToggleSingleChannel(item, 'isOnline')}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            item.isOnline 
                              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200' 
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200'
                          }`}
                          title={item.isOnline ? `Online Enabled: ${item.stock} in stock (Click to toggle)` : 'Online Off (Click to toggle)'}
                        >
                          {item.isOnline ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          <span>{item.isOnline ? item.stock : 0}</span>
                        </button>
                      </td>

                      {/* STATUS TOGGLE */}
                      <td className="px-3.5 py-3.5 text-center">
                        {(() => {
                          const isApproved = item.status === 'APPROVED' || item.status === 'ACTIVE';
                          const isToggling = togglingChannelId === item.id;
                          return (
                            <div className="flex flex-col items-center justify-center gap-1">
                              <button
                                onClick={async () => {
                                  setTogglingChannelId(item.id);
                                  const newStatus = isApproved ? 'PENDING' : 'APPROVED';
                                  const isActive = newStatus === 'APPROVED';
                                  try {
                                    await fetchData(`productmanagement/product/${item.id}/status`, 'PATCH', {
                                      isActive,
                                      status: newStatus
                                    }).catch(() => fetchData(`product/${item.id}/status`, 'PATCH', {
                                      isActive,
                                      status: newStatus
                                    }));
                                    setProducts(prev => prev.map(p => p.id === item.id ? { ...p, status: newStatus } : p));
                                    toast.success(`Status updated for ${item.name}`);
                                  } catch (err: any) {
                                    toast.error(err?.message || 'Failed to update status');
                                  } finally {
                                    setTogglingChannelId(null);
                                  }
                                }}
                                disabled={isToggling}
                                className={`
                                  relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
                                  ${isApproved ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}
                                  ${isToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                `}
                                title={isApproved ? 'Click to deactivate' : 'Click to activate'}
                              >
                                <span
                                  className={`
                                    inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform
                                    ${isApproved ? 'translate-x-4.5' : 'translate-x-1'}
                                  `}
                                />
                              </button>
                              <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                                {isApproved ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* ACTIONS */}
                      <td className="px-3.5 py-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => handleOpenChannelModal(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium transition-colors cursor-pointer"
                          title="Configure Channel Details"
                        >
                          <SlidersHorizontal size={12} />
                          <span>Routing</span>
                        </button>

                        <button
                          onClick={() => handleOpenReturn(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs font-medium transition-colors cursor-pointer"
                          title="Return to Production for repackaging or QC"
                        >
                          <RotateCcw size={12} />
                          <span>Return</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filtered.length > 0 && (
          <div className="px-4 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Show
                </span>
                <select
                  value={itemsPerPage.toString()}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="w-14 sm:w-16 h-7 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium text-emerald-600 dark:text-emerald-500"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}
                </span>
              </div>
              <Pagination
                currentPage={currentPage}
                pagination={paginationObj}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        )}
      </div>

      {/* Individual Channel Routing Modal */}
      {isChannelModalOpen && channelEditProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-emerald-500" />
                Configure Channel Routing
              </h3>
              <button
                onClick={() => setIsChannelModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-800/40 text-xs text-emerald-900 dark:text-emerald-200">
                Configure which customer ordering and billing channels are authorized to sell <strong className="font-semibold">{channelEditProduct.name}</strong>.
              </div>

              <div className="space-y-2.5">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={editOnline}
                    onChange={(e) => setEditOnline(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Smartphone size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">Customer Mobile App & Web Portal</div>
                    <div className="text-[11px] text-gray-400">Available for online grocery orders and scheduled deliveries</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={editPos}
                    onChange={(e) => setEditPos(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <ScanLine size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">POS Store Registers</div>
                    <div className="text-[11px] text-gray-400">Available at walk-in retail billing counters & barcode scanners</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={editVehicle}
                    onChange={(e) => setEditVehicle(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                  />
                  <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Truck size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">Delivery Fleet & Mobile Vans</div>
                    <div className="text-[11px] text-gray-400">Available for vehicle stocking, mobile sales, and direct runs</div>
                  </div>
                </label>
              </div>
            </div>
            <div className="px-5 py-3.5 bg-gray-50 dark:bg-gray-700/40 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2.5">
              <button
                onClick={() => setIsChannelModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChannelModal}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Save Routing</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Channel Assignment Modal */}
      {isBulkChannelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-emerald-500" />
                Bulk Channel Assignment ({selectedIds.size} Products)
              </h3>
              <button
                onClick={() => setIsBulkChannelModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-800/40 text-xs text-emerald-900 dark:text-emerald-200">
                Apply target live distribution channels to all <strong className="font-semibold">{selectedIds.size}</strong> selected products simultaneously:
              </div>

              <div className="space-y-2.5">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={bulkOnline}
                    onChange={(e) => setBulkOnline(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <Smartphone size={16} className="text-emerald-500" />
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">Customer Mobile App & Web Portal</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={bulkPos}
                    onChange={(e) => setBulkPos(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <ScanLine size={16} className="text-blue-500" />
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">POS Store Registers</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={bulkVehicle}
                    onChange={(e) => setBulkVehicle(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                  />
                  <Truck size={16} className="text-amber-500" />
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">Delivery Fleet & Mobile Vans</span>
                </label>
              </div>
            </div>
            <div className="px-5 py-3.5 bg-gray-50 dark:bg-gray-700/40 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2.5">
              <button
                onClick={() => setIsBulkChannelModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyBulkChannels}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Applying...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Apply to All Selected</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return to Production Modal */}
      {isReturnModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <RotateCcw size={18} className="text-amber-500" />
                Return to Production
              </h3>
              <button
                onClick={() => setIsReturnModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200">
                Return <strong className="font-semibold">{selectedProduct.name}</strong> from Live channels back to the Production stage for repackaging or adjustment.
              </div>

              {/* Quantity to Return */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Return Quantity ({selectedProduct.unit || 'Units'}) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-gray-500">
                    Available Live Stock: <strong className="text-emerald-600 font-bold">{selectedProduct.stock}</strong>
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={selectedProduct.stock > 0 ? selectedProduct.stock : undefined}
                    value={returnQuantity}
                    onChange={(e) => setReturnQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:text-gray-100"
                    placeholder="Enter quantity to return"
                    required
                  />
                  {selectedProduct.stock > 0 && (
                    <button
                      type="button"
                      onClick={() => setReturnQuantity(selectedProduct.stock)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-lg text-[11px] font-bold hover:bg-amber-200 transition-colors"
                    >
                      Max ({selectedProduct.stock})
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Reason for Return
                </label>
                <textarea
                  rows={2}
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="e.g., Repackaging requested or batch quality recheck..."
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:text-gray-100"
                />
              </div>
            </div>
            <div className="px-5 py-3.5 bg-gray-50 dark:bg-gray-700/40 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2.5">
              <button
                onClick={() => setIsReturnModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReturn}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={13} />
                    <span>Confirm Return</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
