import React, { useState, useEffect } from 'react';
import { 
  Package, 
  ArrowRight, 
  RefreshCw, 
  Search, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  Smartphone,
  ScanLine,
  Truck,
  Store,
  CheckCircle
} from 'lucide-react';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import { toast } from 'react-toastify';
import fetchData from '../../../helper';
import Pagination from '../../../components/ui/Pagination';

export interface ProductionProduct {
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
}

export default function ProductionManagement() {
  const [products, setProducts] = useState<ProductionProduct[]>([]);
  const [storeroomCount, setStoreroomCount] = useState(0);
  const [liveCount, setLiveCount] = useState(0);
  const [posCount, setPosCount] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductionProduct | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [releaseQuantity, setReleaseQuantity] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [channelOnline, setChannelOnline] = useState(true);
  const [channelPos, setChannelPos] = useState(true);
  const [channelVehicle, setChannelVehicle] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);

  const loadProductionData = async () => {
    setIsLoading(true);
    try {
      const listRes = await fetchData<{ status: boolean; data: any[] | { products?: any[] } }>('productmanagement/product?limit=2000', 'GET')
        .catch(() => fetchData<{ status: boolean; data: any[] | { products?: any[] } }>('product/getProducts?limit=2000', 'GET'));
      const raw = Array.isArray(listRes?.data) ? listRes.data : (listRes?.data as any)?.products || [];
      
      let storeCount = 0;
      let liveStockCount = 0;
      let posTotal = 0;
      let onlineTotal = 0;

      raw.forEach((p: any) => {
        const tags = Array.isArray(p.tags) ? p.tags : [];
        const tagStage = tags.find((t: string) => t.startsWith('LIFECYCLE:'))?.split(':')[1];
        const stage = p.lifecycleStage || tagStage || 'STORE_ROOM';
        if (stage === 'STORE_ROOM') storeCount++;
        else if (stage === 'LIVE') liveStockCount++;

        const hasChTag = tags.some((t: string) => t.startsWith('CH:'));
        const isOnline = hasChTag ? tags.includes('CH:ONLINE') : (p.isOnline !== false);
        const isPos = hasChTag ? tags.includes('CH:POS') : (p.isPos !== false);
        if (isPos) posTotal++;
        if (isOnline) onlineTotal++;
      });

      setStoreroomCount(storeCount);
      setLiveCount(liveStockCount);
      setPosCount(posTotal);
      setOnlineCount(onlineTotal);

      const mapped: ProductionProduct[] = raw
        .filter((p: any) => {
          if (p.stageStocks?.IN_PRODUCTION !== undefined) {
            return Number(p.stageStocks.IN_PRODUCTION) > 0;
          }
          if (p.productionStock !== undefined) {
            return Number(p.productionStock) > 0;
          }
          const tags = Array.isArray(p.tags) ? p.tags : [];
          const tagStage = tags.find((t: string) => t.startsWith('LIFECYCLE:'))?.split(':')[1];
          const stage = p.lifecycleStage || tagStage;
          return stage === 'IN_PRODUCTION' || stage === 'READY_FOR_LIVE';
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
          const stageStock = (p.stageStocks?.IN_PRODUCTION !== undefined)
            ? Number(p.stageStocks.IN_PRODUCTION)
            : (p.productionStock !== undefined ? Number(p.productionStock) : Number(p.stock || 0));

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
            status: p.status || (p.isActive ? 'APPROVED' : 'PENDING'),
            lifecycleStage: 'IN_PRODUCTION',
            stageNotes: p.stageNotes || '',
            updatedAt: p.updatedAt || new Date().toISOString()
          };
        });

      setProducts(mapped);
    } catch (err) {
      console.error('Failed to load production items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProductionData();
  }, []);

  const handleOpenRelease = (product: ProductionProduct) => {
    setSelectedProduct(product);
    setReleaseQuantity(product.stock > 0 ? product.stock : 1);
    setNotes('');
    setChannelOnline(product.isOnline);
    setChannelPos(product.isPos);
    setChannelVehicle(product.isVehicle);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (product: ProductionProduct) => {
    setTogglingStatusId(product.id);
    const newStatus = product.status === 'APPROVED' ? 'PENDING' : 'APPROVED';
    const isActive = newStatus === 'APPROVED';

    try {
      await fetchData(`productmanagement/product/${product.id}/status`, 'PATCH', {
        isActive,
        status: newStatus
      }).catch(() => fetchData(`product/${product.id}/status`, 'PATCH', {
        isActive,
        status: newStatus
      }));

      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, status: newStatus } : p));
      toast.success(`Status updated for ${product.name}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update status');
    } finally {
      setTogglingStatusId(null);
    }
  };

  const handleConfirmRelease = async () => {
    if (!selectedProduct) return;
    if (releaseQuantity <= 0) {
      toast.error('Please enter a valid release quantity greater than 0');
      return;
    }
    setIsSubmitting(true);
    try {
      await fetchData(`productmanagement/product/${selectedProduct.id}/lifecycle`, 'POST', {
        stage: 'LIVE',
        quantity: Number(releaseQuantity),
        notes: notes ? `[Qty: ${releaseQuantity}] ${notes}` : `Release Qty: ${releaseQuantity}`,
        isOnline: channelOnline,
        isPos: channelPos,
        isVehicle: channelVehicle
      }).catch(() => fetchData(`product/${selectedProduct.id}/lifecycle`, 'POST', {
        stage: 'LIVE',
        quantity: Number(releaseQuantity),
        notes: notes ? `[Qty: ${releaseQuantity}] ${notes}` : `Release Qty: ${releaseQuantity}`,
        isOnline: channelOnline,
        isPos: channelPos,
        isVehicle: channelVehicle
      }));
      toast.success(`${releaseQuantity} units of ${selectedProduct.name} successfully released to Live Channels`);
      setProducts(prev => prev.filter(p => p.id !== selectedProduct.id));
      setIsModalOpen(false);
      loadProductionData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to release product to live');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = products.filter(p => 
    !search.trim() || 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.productId.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    p.variantName.toLowerCase().includes(search.toLowerCase())
  );

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2.5">
            <Package className="text-emerald-600 dark:text-emerald-400" size={26} />
            Production & Packing Management
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Active processing, sorting, grading, packaging, labeling and quality verification queue.
          </p>
        </div>
        <button
          onClick={loadProductionData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      <Breadcrumbs />

      {/* Stage & Channel Count Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Store size={20} />
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Store-Room (Raw)</div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{storeroomCount}</div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold">
              <Package size={20} />
            </div>
            <div>
              <div className="text-xs opacity-85 font-medium">In Production</div>
              <div className="text-xl font-bold">{products.length}</div>
            </div>
          </div>
          <span className="text-[11px] font-semibold bg-white/20 px-2 py-0.5 rounded-full">Current</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle size={20} />
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Live Stock</div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{liveCount}</div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">POS Enabled</div>
              <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{posCount}</div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Online Portal</div>
              <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{onlineCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search production items by ID, name, SKU, or variant..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-gray-100"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center">
            <RefreshCw className="animate-spin text-blue-500 mx-auto mb-3" size={28} />
            <p className="text-sm text-gray-500">Loading production items...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400 space-y-2">
            <AlertCircle size={36} className="mx-auto text-gray-300 dark:text-gray-600" />
            <p className="text-sm font-medium">No products currently in Production</p>
            <p className="text-xs text-gray-400">Transfer raw items from Store-Room to start packing.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
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
                {paginatedProducts.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/30 dark:hover:bg-gray-700/30 transition-colors">
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
                          <Package size={18} className="text-gray-400" />
                        )}
                      </div>
                    </td>

                    {/* NAME */}
                    <td className="px-3.5 py-3.5">
                      <div className="font-semibold text-gray-900 dark:text-gray-100 max-w-[200px] truncate" title={item.name}>
                        {item.name}
                      </div>
                      <div className="text-[11px] text-gray-400">SKU: {item.sku}</div>
                      {item.stageNotes && (
                        <div className="text-[11px] text-blue-600 dark:text-blue-400">{item.stageNotes}</div>
                      )}
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
                      <span className="font-bold text-blue-700 dark:text-blue-400 text-sm">{item.stock}</span>
                    </td>

                    {/* LIVE */}
                    <td className="px-3.5 py-3.5 text-center">
                      <span className="font-medium text-gray-400 text-xs">0</span>
                    </td>

                    {/* IN VEHICLE */}
                    <td className="px-3.5 py-3.5 text-center">
                      <span className={`font-semibold text-xs ${item.vehicleStock > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                        {item.vehicleStock}
                      </span>
                    </td>

                    {/* POS */}
                    <td className="px-3.5 py-3.5 text-center">
                      <span className={`text-xs font-semibold ${item.isPos && item.lifecycleStage === 'LIVE' ? 'text-blue-600 dark:text-blue-400 font-bold' : item.isPos ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                        {item.isPos ? (item.lifecycleStage === 'LIVE' ? item.stock : (item.stock > 0 ? item.stock : 0)) : 0}
                      </span>
                    </td>

                    {/* ONLINE */}
                    <td className="px-3.5 py-3.5 text-center">
                      <span className={`text-xs font-semibold ${item.isOnline && item.lifecycleStage === 'LIVE' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : item.isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                        {item.isOnline ? (item.lifecycleStage === 'LIVE' ? item.stock : (item.stock > 0 ? item.stock : 0)) : 0}
                      </span>
                    </td>

                    {/* STATUS TOGGLE */}
                    <td className="px-3.5 py-3.5 text-center">
                      {(() => {
                        const isApproved = item.status === 'APPROVED' || item.status === 'ACTIVE';
                        const isToggling = togglingStatusId === item.id;
                        return (
                          <div className="flex flex-col items-center justify-center gap-1">
                            <button
                              onClick={() => handleToggleStatus(item)}
                              disabled={isToggling}
                              className={`
                                relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                                ${isApproved ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}
                                ${isToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                              `}
                              title={isApproved ? 'Click to make inactive / pending' : 'Click to approve / activate'}
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
                    <td className="px-3.5 py-3.5 text-right">
                      <button
                        onClick={() => handleOpenRelease(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
                      >
                        <CheckCircle2 size={13} />
                        <span>Release Live</span>
                      </button>
                    </td>
                  </tr>
                ))}
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
                  className="w-14 sm:w-16 h-7 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium text-blue-600 dark:text-blue-500"
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

      {/* Release to Live Modal */}
      {isModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-500" />
                Release Finished Goods to Live Channels
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/40 text-xs text-emerald-900 dark:text-emerald-200">
                Releasing <strong className="font-semibold text-emerald-950 dark:text-white">{selectedProduct.name}</strong> as ready stock. Select live distribution channels:
              </div>

              {/* Quantity to Release */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Release Quantity ({selectedProduct.unit || 'Units'}) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-gray-500">
                    Available in Production: <strong className="text-blue-600 font-bold">{selectedProduct.stock}</strong>
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={selectedProduct.stock > 0 ? selectedProduct.stock : undefined}
                    value={releaseQuantity}
                    onChange={(e) => setReleaseQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-gray-100"
                    placeholder="Enter quantity to release"
                    required
                  />
                  {selectedProduct.stock > 0 && (
                    <button
                      type="button"
                      onClick={() => setReleaseQuantity(selectedProduct.stock)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-[11px] font-bold hover:bg-emerald-200 transition-colors"
                    >
                      Max ({selectedProduct.stock})
                    </button>
                  )}
                </div>
              </div>

              {/* Channels */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  Target Live Channels:
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channelOnline}
                      onChange={(e) => setChannelOnline(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <Smartphone size={16} className="text-emerald-500" />
                    <div>
                      <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">Customer Portal & App (Online Orders)</div>
                      <div className="text-[11px] text-gray-400">Available for consumer online grocery shopping</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channelPos}
                      onChange={(e) => setChannelPos(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <ScanLine size={16} className="text-blue-500" />
                    <div>
                      <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">POS Section (Store Counter Billing)</div>
                      <div className="text-[11px] text-gray-400">Visible for retail register point-of-sale checkout</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channelVehicle}
                      onChange={(e) => setChannelVehicle(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <Truck size={16} className="text-amber-500" />
                    <div>
                      <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">Vehicle Stock & Deliveries</div>
                      <div className="text-[11px] text-gray-400">Available for loading onto delivery vans and fleets</div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Packaging / Release Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., QC passed, 100 units bagged and barcoded..."
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-gray-100"
                />
              </div>
            </div>
            <div className="px-5 py-3.5 bg-gray-50 dark:bg-gray-700/40 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2.5">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRelease}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Releasing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={13} />
                    <span>Confirm Live Release</span>
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
