import { useState, useEffect, useMemo } from 'react';
import { 
  Smartphone, 
  RefreshCw, 
  Search,  
  Package,  
  Eye, 
  EyeOff, 
  Sliders,
  TrendingUp
} from 'lucide-react';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import { toast } from 'react-toastify';
import fetchData from '../../../helper';
import Pagination from '../../../components/ui/Pagination';

export interface OnlineStockProduct {
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
  isOnline: boolean;
  isPos: boolean;
  isVehicle: boolean;
  status: string;
  lifecycleStage: string;
  stageNotes?: string;
  updatedAt: string;
  appVisibility: boolean;
  minOrderQty: number;
  maxOrderQty: number;
  discountPercentage?: number;
  badge?: string;
  baseStock?: number;
}

export default function OnlineStockManagement() {
  const [products, setProducts] = useState<OnlineStockProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterVisibility, setFilterVisibility] = useState<'ALL' | 'VISIBLE' | 'HIDDEN'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Quick edit modal for Online App Settings
  const [editProduct, setEditProduct] = useState<OnlineStockProduct | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editMinQty, setEditMinQty] = useState<number>(1);
  const [editMaxQty, setEditMaxQty] = useState<number>(100);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadOnlineStock = async () => {
    setIsLoading(true);
    try {
      const listRes = await fetchData<{ status: boolean; data: any[] | { products?: any[] } }>('productmanagement/product?limit=2000', 'GET')
        .catch(() => fetchData<{ status: boolean; data: any[] | { products?: any[] } }>('product/getProducts?limit=2000', 'GET'));
      const raw = Array.isArray(listRes?.data) ? listRes.data : (listRes?.data as any)?.products || [];

      const mapped: OnlineStockProduct[] = raw
        .filter((p: any) => {
          if (Number(p.baseStock ?? p.stock) > 0) return true;
          if (p.stageStocks?.LIVE !== undefined && Number(p.stageStocks.LIVE) > 0) return true;
          if (p.liveStock !== undefined && Number(p.liveStock) > 0) return true;
          const tagStage = Array.isArray(p.tags) ? p.tags.find((t: string) => t.startsWith('LIFECYCLE:'))?.split(':')[1] : null;
          const stage = p.lifecycleStage || tagStage;
          return stage === 'LIVE';
        })
        .map((p: any) => {
          const tags = Array.isArray(p.tags) ? p.tags : [];
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
          const stageStock = (p.onlineStock !== undefined && p.onlineStock !== null)
            ? Number(p.onlineStock)
            : (p.onlineAppStock?.onlineStock !== undefined && p.onlineAppStock?.onlineStock !== null
              ? Number(p.onlineAppStock.onlineStock)
              : (p.stageStocks?.LIVE !== undefined ? Number(p.stageStocks.LIVE) : 0));
              
          if (p.onlineAppStock || p.onlineStock !== undefined) {
            console.log(`Product ${p.name} has onlineStock: ${p.onlineStock}, onlineAppStock:`, p.onlineAppStock, 'stageStock evaluated to:', stageStock);
          }

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
            isOnline,
            isPos,
            isVehicle,
            status: p.status || (p.isActive ? 'APPROVED' : 'PENDING'),
            lifecycleStage: 'LIVE',
            stageNotes: p.stageNotes || '',
            updatedAt: p.updatedAt || new Date().toISOString(),
            appVisibility: isOnline && (p.isActive !== false),
            minOrderQty: p.minOrderQuantity || p.minOrderQty || 1,
            maxOrderQty: p.maxOrderQuantity || p.maxOrderQty || 50,
            badge: p.tags?.find((t: string) => t.startsWith('BADGE:'))?.split(':')[1] || (stageStock <= 5 ? 'Low Stock' : 'In Stock'),
            baseStock: p.baseStock
          };
        });

      setProducts(mapped);
    } catch (err) {
      console.error('Failed to load online stock data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOnlineStock();
  }, []);

  const handleToggleOnlineVisibility = async (product: OnlineStockProduct) => {
    setTogglingId(product.id);
    const newOnline = !product.isOnline;

    // Optimistic update
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isOnline: newOnline, appVisibility: newOnline && p.status === 'APPROVED' } : p));

    try {
      await fetchData(`productmanagement/product/${product.id}/lifecycle`, 'POST', {
        stage: 'LIVE',
        isOnline: newOnline,
        isPos: product.isPos,
        isVehicle: product.isVehicle,
        notes: product.stageNotes
      }).catch(() => fetchData(`product/${product.id}/lifecycle`, 'POST', {
        stage: 'LIVE',
        isOnline: newOnline,
        isPos: product.isPos,
        isVehicle: product.isVehicle,
        notes: product.stageNotes
      }));
      toast.success(`${product.name} ${newOnline ? 'Published to Customer App' : 'Hidden from Customer App'}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update App visibility');
      loadOnlineStock();
    } finally {
      setTogglingId(null);
    }
  };

  const handleOpenEditModal = (product: OnlineStockProduct) => {
    setEditProduct(product);
    setEditPrice(product.price);
    setEditMinQty(product.minOrderQty);
    setEditMaxQty(product.maxOrderQty);
    // setEditBadge(product.badge || '');
    setIsEditModalOpen(true);
  };

  const handleSaveAppConfig = async () => {
    if (!editProduct) return;
    setIsSubmitting(true);
    try {
      await fetchData(`productmanagement/product/${editProduct.id}`, 'PUT', {
        price: Number(editPrice),
        minOrderQuantity: Number(editMinQty),
        maxOrderQuantity: Number(editMaxQty)
      }).catch(() => fetchData(`product/${editProduct.id}`, 'PUT', {
        price: Number(editPrice),
        minOrderQuantity: Number(editMinQty),
        maxOrderQuantity: Number(editMaxQty)
      }));

      setProducts(prev => prev.map(p => p.id === editProduct.id ? {
        ...p,
        price: Number(editPrice),
        minOrderQty: Number(editMinQty),
        maxOrderQty: Number(editMaxQty)
      } : p));

      toast.success(`Online configuration updated for ${editProduct.name}`);
      setIsEditModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update product details');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Aggregated Stats
  const totalCatalogCount = products.length;
  const publishedCount = useMemo(() => products.filter(p => p.isOnline).length, [products]);
  const activeStockSum = useMemo(() => products.filter(p => p.isOnline).reduce((acc, curr) => acc + curr.stock, 0), [products]);
  const lowStockCount = useMemo(() => products.filter(p => p.isOnline && p.stock <= 5).length, [products]);

  const filtered = products.filter(p => {
    const matchesSearch = !search.trim() || 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.productId.toLowerCase().includes(search.toLowerCase()) || 
      p.sku.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filterVisibility === 'VISIBLE' && !p.isOnline) return false;
    if (filterVisibility === 'HIDDEN' && p.isOnline) return false;
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
            <Smartphone className="text-emerald-500" size={26} />
            Online (Customer App) Stock Management
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Control consumer-facing catalog display, live app inventory buffer, pricing, and order limits.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadOnlineStock}
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
            <div className="text-xs opacity-85 font-medium">Published on App</div>
            <div className="text-2xl font-bold mt-1">{publishedCount} <span className="text-xs font-normal opacity-75">/ {totalCatalogCount} Products</span></div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold">
            <Eye size={20} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">App Available Units</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{activeStockSum.toLocaleString()}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Package size={20} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Low Stock Alerts</div>
            <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-300 mt-1">{lowStockCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <TrendingUp size={20} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Hidden from App</div>
            <div className="text-2xl font-bold text-gray-700 dark:text-gray-300 mt-1">{totalCatalogCount - publishedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 flex items-center justify-center font-bold">
            <EyeOff size={20} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by product name, SKU, or Product ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-gray-100"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => { setFilterVisibility('ALL'); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${filterVisibility === 'ALL' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              All
            </button>
            <button
              onClick={() => { setFilterVisibility('VISIBLE'); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${filterVisibility === 'VISIBLE' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              Published
            </button>
            <button
              onClick={() => { setFilterVisibility('HIDDEN'); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${filterVisibility === 'HIDDEN' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              Hidden
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <RefreshCw className="animate-spin mb-3 text-emerald-500" size={32} />
            <p className="text-sm">Loading Customer App stock catalogue...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <Smartphone className="mb-3 text-gray-300 dark:text-gray-600" size={42} />
            <p className="text-base font-semibold text-gray-700 dark:text-gray-300">No products matching filters</p>
            <p className="text-xs text-gray-500 mt-1">Check search query or adjust app visibility toggle.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/75 dark:bg-gray-900/40 text-gray-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-4">Online Price</th>
                  <th className="py-3 px-4">Available Qty</th>
                  <th className="py-3 px-4">Order Limits (Min / Max)</th>
                  <th className="py-3 px-4">App Status</th>
                  <th className="py-3 px-4 text-center">App Visibility</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {paginatedProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-750/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-10 h-10 rounded-xl object-cover border border-gray-200 dark:border-gray-700 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                            {p.name.slice(0, 2).toUpperCase()}
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
                      <div className="font-bold text-gray-900 dark:text-gray-100">₹{p.price.toFixed(2)}</div>
                      <div className="text-[10px] text-gray-400">per {p.unit}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold w-max ${p.stock <= 5 ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'}`}>
                          {p.stock} {p.unit}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium mt-1">
                          {p.baseStock ?? 0} {p.unit} in Warehouse
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300">
                      <span className="font-medium">{p.minOrderQty}</span> min / <span className="font-medium">{p.maxOrderQty}</span> max
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${p.isOnline ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border border-gray-200'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.isOnline ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                        {p.isOnline ? 'Active on App' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleOnlineVisibility(p)}
                        disabled={togglingId === p.id}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${p.isOnline ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${p.isOnline ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenEditModal(p)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 hover:text-emerald-600 transition-colors cursor-pointer"
                        title="Configure App Settings"
                      >
                        <Sliders size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <Pagination
              currentPage={currentPage}
              pagination={paginationObj}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        )}
      </div>

      {/* Edit App Config Modal */}
      {isEditModalOpen && editProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Customer App Stock Settings</h3>
                <p className="text-xs text-gray-400 mt-0.5">{editProduct.name} ({editProduct.variantName})</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer">✕</button>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Customer App Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={editPrice}
                  onChange={(e) => setEditPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Min Order Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={editMinQty}
                    onChange={(e) => setEditMinQty(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Max Order Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={editMaxQty}
                    onChange={(e) => setEditMaxQty(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
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
                onClick={handleSaveAppConfig}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting && <RefreshCw size={12} className="animate-spin" />}
                <span>Save App Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
