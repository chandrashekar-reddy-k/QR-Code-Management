import { useState, useEffect, useMemo } from 'react';
import { 
  Truck, 
  RefreshCw, 
  Search, 
  Package, 
  User, 
  Navigation, 
  Plus, 
  Layers,
  Eye,
  X,
  Calendar,
  Tag,
  DollarSign,
  AlertTriangle,
  Sliders
} from 'lucide-react';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import { toast } from 'react-toastify';
import fetchData from '../../../helper';
import Pagination from '../../../components/ui/Pagination';

export interface VehicleInventoryItem {
  id: string;
  productId: string;
  name: string;
  image?: string;
  variantName: string;
  unit: string;
  sku: string;
  price: number;
  mrp?: number;
  landingPrice?: number;
  sellingPrice?: number;
  vsmPrice?: number;
  totalCatalogStock: number;
  vehicleStoreStock: number;
  vehicleStock: number;
  vehicleAssignedCount: number;
  isVehicle: boolean;
  assignedVehicles?: { 
    vehicleId: string; 
    vehicleNumber: string; 
    vehicleName: string;
    driverName: string; 
    driverPhone?: string;
    driverEmail?: string;
    quantity: number 
  }[];
  updatedAt: string;
}

export default function VehicleStockManagement() {
  const [items, setItems] = useState<VehicleInventoryItem[]>([]);
  const [vehicles, setVehicles] = useState<{ 
    id: string; 
    registrationNumber: string; 
    vehicleName: string;
    driverName: string;
    driverPhone?: string;
  }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'ALL' | 'LOADED' | 'UNASSIGNED'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Return to ready modal
  const [confirmProduct, setConfirmProduct] = useState<VehicleInventoryItem | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isBulkReturning, setIsBulkReturning] = useState(false);
  const [showBulkReturnModal, setShowBulkReturnModal] = useState(false);

  // View Vehicle Stock Details Modal
  const [viewProduct, setViewProduct] = useState<VehicleInventoryItem | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Edit VSM Config Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<VehicleInventoryItem | null>(null);
  const [editVsmPrice, setEditVsmPrice] = useState<number>(0);

  // Transfer / Load Modal
  const [selectedProduct, setSelectedProduct] = useState<VehicleInventoryItem | null>(null);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [loadQuantity, setLoadQuantity] = useState<number>(1);
  const [loadNotes, setLoadNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadVehicleData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch fleet vehicles
      const vehRes = await fetchData<any>('vsms/vehicles?limit=200', 'GET')
        .catch(() => fetchData<any>('vehicles?limit=200', 'GET'));
      
      const rawVeh = Array.isArray(vehRes?.data) 
        ? vehRes.data 
        : (Array.isArray(vehRes) ? vehRes : (vehRes?.data as any)?.vehicles || vehRes?.vehicles || []);
      
      const mappedVehicles = rawVeh.map((v: any) => {
        const assignedUser = Array.isArray(v.assignedUsers) ? v.assignedUsers[0] : null;
        const driverName = assignedUser?.name || v.driverName || v.assignedDriver?.name || 'Unassigned Driver';
        const driverPhone = assignedUser?.phone || v.driverPhone || v.assignedDriver?.phone || '';
        const driverEmail = assignedUser?.email || v.driverEmail || '';
        const vehicleNumber = v.vehicleNumber || v.registrationNumber || v.plateNumber || 'Fleet Van';
        const vehicleName = v.vehicleName || 'Delivery Fleet Van';

        return {
          id: v.id,
          registrationNumber: vehicleNumber,
          vehicleName: vehicleName,
          driverName: driverName,
          driverPhone: driverPhone,
          driverEmail: driverEmail
        };
      });

      setVehicles(mappedVehicles);
      if (mappedVehicles.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(mappedVehicles[0].id);
      }

      // 2. Fetch products
      const listRes = await fetchData<{ status: boolean; data: any[] | { products?: any[] } }>('productmanagement/product?limit=2000', 'GET')
        .catch(() => fetchData<{ status: boolean; data: any[] | { products?: any[] } }>('product/getProducts?limit=2000', 'GET'));
      const raw = Array.isArray(listRes?.data) ? listRes.data : (listRes?.data as any)?.products || [];

      const mapped: VehicleInventoryItem[] = raw
        .filter((p: any) => {
          const isVehicle = p.isVehicle === true || p.liveStockChannel?.isVehicle === true || (Array.isArray(p.tags) && p.tags.includes('CH:VEHICLE'));
          let parsedNotes: any = {};
          if (p.liveStockChannel?.channelNotes && typeof p.liveStockChannel.channelNotes === 'string') {
            try {
              parsedNotes = JSON.parse(p.liveStockChannel.channelNotes);
            } catch (e) {
              // Ignore invalid JSON in legacy data
            }
          }
          const hasVehicleStock = Number(p.vehicleStock) > 0 || Number(parsedNotes?.vehicleStoreStock || 0) > 0;
          
          if (p.inventoryType === 'READY' || p.inventoryType === 'RAW') {
            return isVehicle;
          }

          return isVehicle || hasVehicleStock;
        })
        .map((p: any) => {
          const tags = Array.isArray(p.tags) ? p.tags : [];
          const hasChTag = tags.some((t: string) => t.startsWith('CH:'));
          const isVehicle = hasChTag ? tags.includes('CH:VEHICLE') : (p.isVehicle !== false);
          const variants = Array.isArray(p.variants) ? p.variants : [];
          const firstVar = variants[0] || {};
          const variantName = p.variantName || firstVar.variantName || firstVar.name || 'Default';

          const productId = (p.productId as string) || String(p.id ?? '').slice(0, 8).toUpperCase();
          const img = p.image || (Array.isArray(p.images) ? p.images[0] : null);
          // Total In-Van Stock: only count actual per-vehicle loaded quantities (NOT the channel reservation)
          const vStock = Number(Array.isArray(p.vehicleStocks) ? p.vehicleStocks.reduce((a: number, c: any) => a + (c.quantity || 0), 0) : 0);

          // Sanitize clean unit label (strip UUIDs)
          let cleanUnit = p.unit || 'Unit';
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanUnit)) {
            cleanUnit = p.unitType || 'Unit';
          }
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanUnit)) {
            cleanUnit = 'Unit';
          }

          const rawVs = Array.isArray(p.vehicleStocks) ? p.vehicleStocks : [];
          const assignedVehicles = rawVs
            .filter((vs: any) => Number(vs.quantity) > 0)
            .map((vs: any) => {
              const matchedVeh = mappedVehicles.find((v: any) => v.id === vs.vehicleId);
              return {
                vehicleId: vs.vehicleId,
                vehicleNumber: matchedVeh?.registrationNumber || vs.vehicle?.vehicleNumber || vs.vehicle?.registrationNumber || 'Fleet Van',
                vehicleName: matchedVeh?.vehicleName || vs.vehicle?.vehicleName || 'Delivery Fleet Van',
                driverName: matchedVeh?.driverName || vs.vehicle?.assignedDriver?.name || 'Unassigned Driver',
                driverPhone: matchedVeh?.driverPhone || vs.vehicle?.assignedDriver?.phone || '',
                driverEmail: matchedVeh?.driverEmail || '',
                quantity: Number(vs.quantity || 0)
              };
            });


          return {
            id: p.id,
            productId,
            name: p.name || '',
            image: img,
            variantName,
            unit: cleanUnit,
            sku: p.sku || firstVar.sku || 'N/A',
            price: Number(p.price || 0),
            mrp: Number(p.mrp || 0),
            landingPrice: Number(p.landingPrice || 0),
            sellingPrice: Number(p.sellingPrice || 0),
            vsmPrice: Number(p.vsmPrice || 0),
            totalCatalogStock: Number(p.stock || 0),
            vehicleStoreStock: Number(p.vehicleStoreStock ?? p.stageStocks?.VEHICLE ?? p.vehicleStock ?? vStock ?? 0),
            vehicleStock: vStock,
            vehicleAssignedCount: assignedVehicles.length || (vStock > 0 ? 1 : 0),
            isVehicle,
            assignedVehicles,
            updatedAt: p.updatedAt || new Date().toISOString()
          };
        });

      setItems(mapped);
    } catch (err) {
      console.error('Failed to load vehicle stock data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVehicleData();
  }, []);

  const handleToggleVehicleChannel = async (item: VehicleInventoryItem) => {
    setTogglingId(item.id);
    const newVehicle = !item.isVehicle;

    setItems(prev => prev.map(i => i.id === item.id ? { ...i, isVehicle: newVehicle } : i));

    try {
      await fetchData(`productmanagement/product/${item.id}/lifecycle`, 'POST', {
        stage: 'LIVE',
        isVehicle: newVehicle,
        isOnline: true,
        isPos: true
      }).catch(() => fetchData(`product/${item.id}/lifecycle`, 'POST', {
        stage: 'LIVE',
        isVehicle: newVehicle,
        isOnline: true,
        isPos: true
      }));
      toast.success(`${item.name} ${newVehicle ? 'Enabled for Fleet Delivery Vans' : 'Disabled from Fleet Vans'}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update vehicle authorization');
      loadVehicleData();
    } finally {
      setTogglingId(null);
    }
  };

  const handleOpenLoadModal = (item: VehicleInventoryItem) => {
    setSelectedProduct(item);
    setLoadQuantity(1);
    setLoadNotes('');
    setIsLoadModalOpen(true);
  };

  const handleOpenEditModal = (item: VehicleInventoryItem) => {
    setEditProduct(item);
    setEditVsmPrice(item.vsmPrice || item.sellingPrice || item.price || 0);
    setIsEditModalOpen(true);
  };

  const handleSaveVsmConfig = async () => {
    if (!editProduct) return;
    setIsSubmitting(true);
    try {
      await fetchData(`productmanagement/product/${editProduct.id}`, 'PUT', {
        vsmPrice: Number(editVsmPrice)
      }).catch(() => fetchData(`product/${editProduct.id}`, 'PUT', {
        vsmPrice: Number(editVsmPrice)
      }));

      // Update local state
      setItems((prev: VehicleInventoryItem[]) => prev.map(p => p.id === editProduct.id ? { ...p, vsmPrice: Number(editVsmPrice) } : p));

      toast.success(`Vehicle channel configuration updated for ${editProduct.name}`);
      setIsEditModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update vehicle channel configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnToReady = (item: VehicleInventoryItem) => {
    setConfirmProduct(item);
  };

  const executeReturnToReady = async () => {
    if (!confirmProduct) return;
    const item = confirmProduct;
    setReturningId(item.id);
    setConfirmProduct(null);
    try {
      await fetchData(`productmanagement/product/${item.id}`, 'PUT', {
        inventoryType: 'READY'
      }).catch(() => fetchData(`product/${item.id}`, 'PUT', {
        inventoryType: 'READY'
      }));

      if (item.isVehicle) {
        await fetchData(`productmanagement/product/${item.id}/lifecycle`, 'POST', {
          stage: 'LIVE',
          isVehicle: false,
          isOnline: true,
          isPos: true
        }).catch(() => fetchData(`product/${item.id}/lifecycle`, 'POST', {
          stage: 'LIVE',
          isVehicle: false,
          isOnline: true,
          isPos: true
        }));
      }

      toast.success(`${item.name} returned to Ready Inventory and disabled from Vehicles`);
      loadVehicleData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to return product to Ready Inventory');
    } finally {
      setReturningId(null);
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
        channel: 'VEHICLE'
      });
      toast.success(`Successfully returned ${selectedProducts.size} products to Ready Inventory`);
      setSelectedProducts(new Set());
      loadVehicleData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to perform bulk return');
    } finally {
      setIsBulkReturning(false);
    }
  };

  const handleConfirmVehicleLoad = async () => {
    if (!selectedProduct || !selectedVehicleId) return;
    if (loadQuantity <= 0) {
      toast.error('Please enter a valid load quantity greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      await fetchData('vsms/vehicles/inventory/load', 'POST', {
        vehicleId: selectedVehicleId,
        productId: selectedProduct.id,
        quantity: Number(loadQuantity),
        notes: loadNotes
      }).catch(() => fetchData('vsms/agent/inventory/refill', 'POST', {
        vehicleId: selectedVehicleId,
        productId: selectedProduct.id,
        quantity: Number(loadQuantity),
        notes: loadNotes
      }));

      toast.success(`Loaded ${loadQuantity} units of ${selectedProduct.name} to vehicle`);
      setIsLoadModalOpen(false);
      loadVehicleData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to assign inventory to vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics
  const totalItemsCount = items.length;
  const inVanStockSum = useMemo(() => items.reduce((acc, curr) => acc + curr.vehicleStock, 0), [items]);
  const vehicleAllowedCount = useMemo(() => items.filter(i => i.isVehicle).length, [items]);
  const activeFleetCount = vehicles.length;

  const filtered = items.filter(i => {
    const matchesSearch = !search.trim() || 
      i.name.toLowerCase().includes(search.toLowerCase()) || 
      i.productId.toLowerCase().includes(search.toLowerCase()) || 
      i.sku.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filterActive === 'LOADED' && i.vehicleStock <= 0) return false;
    if (filterActive === 'UNASSIGNED' && i.vehicleStock > 0) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
            <Truck className="text-emerald-600 dark:text-emerald-400" size={26} />
            Vehicle (Delivery Fleet) Stock Management
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Track on-the-road vehicle inventory, driver stock allocations, mobile store refills, and in-transit delivery units.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadVehicleData}
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
            <div className="text-xs opacity-85 font-medium">In-Transit Fleet Units</div>
            <div className="text-2xl font-bold mt-1">{inVanStockSum.toLocaleString()}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold">
            <Truck size={20} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Van Authorized SKUs</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{vehicleAllowedCount} <span className="text-xs font-normal text-gray-400">/ {totalItemsCount}</span></div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Package size={20} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Active Fleet Delivery Vans</div>
            <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-300 mt-1">{activeFleetCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Navigation size={20} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Vehicle Store Stock</div>
            <div className="text-2xl font-bold text-gray-700 dark:text-gray-300 mt-1">{items.reduce((a, c) => a + c.vehicleStoreStock, 0).toLocaleString()}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 flex items-center justify-center font-bold">
            <Layers size={20} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search products by name, SKU, or Product ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-gray-100"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => { setFilterActive('ALL'); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${filterActive === 'ALL' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              All
            </button>
            <button
              onClick={() => { setFilterActive('LOADED'); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${filterActive === 'LOADED' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              Loaded in Vans
            </button>
            <button
              onClick={() => { setFilterActive('UNASSIGNED'); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${filterActive === 'UNASSIGNED' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              Warehouse Only
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedProducts.size > 0 && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
              {selectedProducts.size} product{selectedProducts.size > 1 ? 's' : ''} selected
            </span>
          </div>
          <button
            onClick={() => setShowBulkReturnModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <RefreshCw size={16} />
            Bulk Return to Ready
          </button>
        </div>
      )}

      {/* Vehicle Inventory Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <RefreshCw className="animate-spin mb-3 text-emerald-500" size={32} />
            <p className="text-sm">Loading Vehicle Fleet Inventory...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <Truck className="mb-3 text-gray-300 dark:text-gray-600" size={42} />
            <p className="text-base font-semibold text-gray-700 dark:text-gray-300">No vehicle stock entries found</p>
            <p className="text-xs text-gray-500 mt-1">Try adjusting search term or load items to delivery vans.</p>
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
                  <th className="py-3 px-4">VSM Price</th>
                  <th className="py-3 px-4">Vehicle Store Stock</th>
                  <th className="py-3 px-4">Total In-Van Stock</th>
                  <th className="py-3 px-4">Van Channel Status</th>
                  <th className="py-3 px-4 text-center">Van Permission</th>
                  <th className="py-3 px-4 text-right pr-[110px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {paginatedItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 transition-colors group">
                    <td className="py-3 px-4 text-center">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        checked={selectedProducts.has(item.id)}
                        onChange={() => toggleSelection(item.id)}
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-10 h-10 rounded-xl object-cover border border-gray-200 dark:border-gray-700 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                            {item.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">{item.name}</div>
                          <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-emerald-600 dark:text-emerald-400">ID: {item.productId}</span>
                            <span>•</span>
                            <span>{item.variantName}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">₹{item.mrp?.toFixed(2) || '0.00'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">₹{item.landingPrice?.toFixed(2) || '0.00'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">₹{(item.sellingPrice || 0).toFixed(2)}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400">₹{(item.vsmPrice || 0).toFixed(2)}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-800 dark:text-gray-200">{item.vehicleStoreStock}</div>
                      <div className="text-[10px] text-gray-400">Reserved for Vehicle</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${item.vehicleStock > 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200' : 'bg-gray-100 dark:bg-gray-700/50 text-gray-500'}`}>
                        <Truck size={12} />
                        {item.vehicleStock} in Fleet
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${item.isVehicle ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${item.isVehicle ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                        {item.isVehicle ? 'Van Authorized' : 'Not Loaded'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleVehicleChannel(item)}
                        disabled={togglingId === item.id}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${item.isVehicle ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${item.isVehicle ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => handleReturnToReady(item)}
                          disabled={returningId === item.id}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 hover:text-amber-600 transition-colors cursor-pointer disabled:opacity-50"
                          title="Return to Ready Inventory"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-700 dark:bg-gray-750 dark:hover:bg-blue-950/40 dark:text-gray-300 dark:hover:text-blue-400 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 transition-colors cursor-pointer"
                          title="Quick Edit VSM Price"
                        >
                          <Sliders size={12} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => { setViewProduct(item); setIsViewModalOpen(true); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 dark:bg-gray-750 dark:hover:bg-emerald-950/40 dark:text-gray-300 dark:hover:text-emerald-400 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 transition-colors cursor-pointer"
                          title="View Vehicle Fleet Allocations & Inventory Breakdown"
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => handleOpenLoadModal(item)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                        >
                          <Plus size={12} />
                          <span>Load Van</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <Pagination
            currentPage={currentPage}
            pagination={paginationObj}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      </div>

      {/* Load Van Modal */}
      {isLoadModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Load Inventory to Delivery Van</h3>
                <p className="text-xs text-gray-400 mt-0.5">{selectedProduct.name} ({selectedProduct.variantName})</p>
              </div>
              <button onClick={() => setIsLoadModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer">✕</button>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Select Delivery Vehicle / Driver</label>
                {vehicles.length > 0 ? (
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.registrationNumber} — {v.driverName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-rose-500">No active fleet vehicles found. Please add a vehicle in VSMS.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Load Quantity ({selectedProduct.unit}s)
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedProduct.totalCatalogStock || 9999}
                  value={loadQuantity}
                  onChange={(e) => setLoadQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl font-bold text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="text-[11px] text-gray-400 mt-1">Available warehouse units: {selectedProduct.totalCatalogStock}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Assignment Notes / Gate Pass</label>
                <input
                  type="text"
                  value={loadNotes}
                  onChange={(e) => setLoadNotes(e.target.value)}
                  placeholder="e.g. Route A morning loadout"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setIsLoadModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVehicleLoad}
                disabled={isSubmitting || vehicles.length === 0}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting && <RefreshCw size={12} className="animate-spin" />}
                <span>Confirm Van Load</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Vehicle Stock Details Modal */}
      {isViewModalOpen && viewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                {viewProduct.image ? (
                  <img src={viewProduct.image} alt={viewProduct.name} className="w-12 h-12 rounded-xl object-cover border border-gray-200 dark:border-gray-700" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center font-bold text-sm">
                    {viewProduct.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{viewProduct.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">ID: {viewProduct.productId}</span>
                    <span>•</span>
                    <span>SKU: {viewProduct.sku}</span>
                    <span>•</span>
                    <span>{viewProduct.variantName}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsViewModalOpen(false)} 
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-3 gap-3 my-4">
              <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                <div className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300">Total In-Van Fleet</div>
                <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {viewProduct.vehicleStock}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700">
                <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Vehicle Store Stock</div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                  {viewProduct.vehicleStoreStock}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                <div className="text-[11px] font-medium text-blue-800 dark:text-blue-300">Total Available</div>
                <div className="text-lg font-bold text-blue-700 dark:text-blue-400 mt-0.5">
                  {viewProduct.vehicleStoreStock + viewProduct.vehicleStock}
                </div>
              </div>
            </div>

            {/* Product Meta & Channel Info */}
            <div className="space-y-2.5 p-3.5 bg-gray-50/70 dark:bg-gray-750/50 rounded-xl border border-gray-100 dark:border-gray-700/60 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-gray-200/60 dark:border-gray-700/60">
                <span className="text-gray-500 flex items-center gap-1.5"><DollarSign size={13} className="text-emerald-500" /> Selling Price</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">₹{viewProduct.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-200/60 dark:border-gray-700/60">
                <span className="text-gray-500 flex items-center gap-1.5"><Truck size={13} className="text-emerald-500" /> Van Authorization</span>
                <span className={`inline-flex items-center gap-1 font-semibold ${viewProduct.isVehicle ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'}`}>
                  {viewProduct.isVehicle ? 'Authorized for Fleet Loading' : 'Not Authorized'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-200/60 dark:border-gray-700/60">
                <span className="text-gray-500 flex items-center gap-1.5"><Tag size={13} className="text-emerald-500" /> Unit of Measure</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{viewProduct.unit}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500 flex items-center gap-1.5"><Calendar size={13} className="text-emerald-500" /> Last Synchronized</span>
                <span className="text-gray-600 dark:text-gray-400">{new Date(viewProduct.updatedAt).toLocaleString()}</span>
              </div>
            </div>

            {/* Vehicle Allocations List */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                  <Truck size={14} className="text-emerald-600" />
                  <span>Fleet Vehicle Stock Allocations ({viewProduct.assignedVehicles?.length || 0})</span>
                </h4>
                {viewProduct.assignedVehicles && viewProduct.assignedVehicles.length > 0 && (
                  <span className="text-[11px] font-semibold text-emerald-600">
                    {viewProduct.assignedVehicles.reduce((a, c) => a + c.quantity, 0)} in circulation
                  </span>
                )}
              </div>

              {viewProduct.assignedVehicles && viewProduct.assignedVehicles.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {viewProduct.assignedVehicles.map((vs, idx) => (
                    <div 
                      key={vs.vehicleId || idx} 
                      className="p-3.5 bg-white dark:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-between hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center font-bold text-sm shrink-0">
                          <Truck size={17} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                              {vs.vehicleName}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-emerald-700 dark:text-emerald-300 font-mono font-semibold border border-gray-200 dark:border-gray-600">
                              {vs.vehicleNumber}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                            <div className="flex items-center gap-1">
                              <User size={12} className="text-emerald-600 dark:text-emerald-400" />
                              <span className="font-medium text-gray-700 dark:text-gray-300">
                                Assigned to: {vs.driverName}
                              </span>
                            </div>
                            {vs.driverPhone && (
                              <span className="text-gray-400 font-mono text-[11px]">
                                ({vs.driverPhone})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right pl-3">
                        <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                          {vs.quantity}
                        </div>
                        <div className="text-[10px] text-gray-400 font-medium">In Van Stock</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center bg-gray-50 dark:bg-gray-750/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 text-xs">
                  <Truck size={28} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p className="font-medium text-gray-600 dark:text-gray-300">No vehicle allocations active</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">This product is currently only stored in the main warehouse.</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const p = viewProduct;
                  setIsViewModalOpen(false);
                  handleOpenLoadModal(p);
                }}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={13} />
                <span>Load Into Van</span>
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
              This will set the Vehicle Store Stock for all selected products to 0 and disable them from the Fleet system immediately.
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
                {confirmProduct.isVehicle && (
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-2 font-medium">
                    This will also disable the product from Fleet Vans.
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

      {/* Edit VSM Config Modal */}
      {isEditModalOpen && editProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Vehicle Channel Configuration</h3>
                <p className="text-xs text-gray-400 mt-0.5">{editProduct.name}</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer">✕</button>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">VSM Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={editVsmPrice}
                  onChange={(e) => setEditVsmPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-3 w-full mt-6 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveVsmConfig}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting && <RefreshCw size={14} className="animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

