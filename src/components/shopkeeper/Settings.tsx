import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Layers, 
  Trash2, 
  Plus, 
  Search, 
  Loader2,
  Grid,
  Package,
  AlertTriangle,
  Filter,
  ChevronDown,
  RefreshCw,
  Edit2
} from "lucide-react";
import toast from "react-hot-toast";
import SetupWizard from "./SetupWizard";

// Local API instance matching the parent setup
const api = axios.create({
  baseURL: import.meta.env.VITE_URL || "http://localhost:3004/api/v1",
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("staffToken") || localStorage.getItem("partnerToken") || localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

interface Tray {
  id: string;
  name: string;
  shelfId: string;
  capacity?: number | null;
}

interface Shelf {
  id: string;
  name: string;
  rackId: string;
  trays: Tray[];
}

interface Rack {
  id: string;
  name: string;
  code: string | null;
  maxShelves: number | null;
  isActive: boolean;
  shelves: Shelf[];
}

interface Product {
  id: string;
  productVariantId: string | null;
  name: string;
  sku: string | null;
}

interface ProductLocation {
  id: string;
  productId: string;
  productVariantId: string | null;
  product: Product;
  tray: {
    id: string;
    name: string;
    shelf: {
      id: string;
      name: string;
      rack: {
        id: string;
        name: string;
      }
    }
  }
}

interface CustomSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; name: string }[];
  placeholder: string;
  disabled?: boolean;
}

function CustomSelect({ label, value, onChange, options, placeholder, disabled = false }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedName = options.find(o => o.id === value)?.name || "";

  return (
    <div className="flex flex-col gap-1.5 relative w-full">
      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 dark:text-gray-500">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left text-xs px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00891D] bg-white dark:bg-gray-800 flex justify-between items-center disabled:bg-gray-50 dark:bg-gray-700/50 disabled:text-gray-400 dark:text-gray-500"
      >
        <span className="truncate">{selectedName || placeholder}</span>
        <span className="text-gray-400 dark:text-gray-500 text-[10px]">▼</span>
      </button>

      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-[62px] left-0 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-[160px] overflow-y-auto z-50 py-1">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 italic font-normal">No options available</div>
            ) : (
              options.map(option => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                  }}
                  className="w-full text-left text-xs px-3 py-2 hover:bg-green-50 hover:text-[#00891D] transition-colors font-medium text-gray-700 dark:text-gray-300"
                >
                  {option.name}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function Settings() {
  const [activeTab, setActiveTab] = useState<"layout" | "mapping">("layout");
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);
  const [editRackId, setEditRackId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, type: 'rack' | 'shelf' | 'tray', id: string, name: string, code?: string } | null>(null);
  
  // Layout states
  const [racks, setRacks] = useState<Rack[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [searchQuery, setSearchQuery] = useState("");

  // Mapping states
  const [products, setProducts] = useState<Product[]>([]);
  const [mappings, setMappings] = useState<ProductLocation[]>([]);
  const [loadingMapping, setLoadingMapping] = useState(false);
  const [searchProductQuery, setSearchProductQuery] = useState("");
  const [selectedProductKey, setSelectedProductKey] = useState("");
  const [selectedRackForMap, setSelectedRackForMap] = useState("");
  const [selectedShelfForMap, setSelectedShelfForMap] = useState("");
  const [selectedTrayForMap, setSelectedTrayForMap] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Compute occupied and available layout lists
  const occupiedTrayIds = React.useMemo(() => {
    return new Set(
      mappings.map(m => m.tray?.id || (m as any).trayId).filter(Boolean)
    );
  }, [mappings]);

  const mappedVariantIds = React.useMemo(() => {
    return new Set(
      mappings.map(m => m.productVariantId).filter(Boolean)
    );
  }, [mappings]);

  const unmappedProducts = React.useMemo(() => {
    return products.filter(p => {
      if (p.productVariantId) {
        return !mappedVariantIds.has(p.productVariantId);
      }
      return !mappings.some(m => m.productId === p.id && !m.productVariantId);
    });
  }, [products, mappings, mappedVariantIds]);

  const filteredProducts = React.useMemo(() => {
    return unmappedProducts.filter(p =>
      p.name.toLowerCase().includes(searchProductQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchProductQuery.toLowerCase()))
    );
  }, [unmappedProducts, searchProductQuery]);

  const availableRacks = React.useMemo(() => {
    return racks.filter(rack => {
      if (rack.shelves.length === 0) return true;
      const allShelvesFull = rack.shelves.every(shelf => {
        if (shelf.trays.length === 0) return true;
        return shelf.trays.every(t => occupiedTrayIds.has(t.id));
      });
      return !allShelvesFull;
    });
  }, [racks, occupiedTrayIds]);

  const availableShelves = React.useMemo(() => {
    const selectedRackObj = racks.find(r => r.id === selectedRackForMap);
    if (!selectedRackObj) return [];
    return selectedRackObj.shelves.filter(shelf => {
      if (shelf.trays.length === 0) return true;
      return !shelf.trays.every(t => occupiedTrayIds.has(t.id));
    });
  }, [racks, selectedRackForMap, occupiedTrayIds]);

  const availableTrays = React.useMemo(() => {
    const selectedShelfObj = availableShelves.find(s => s.id === selectedShelfForMap);
    if (!selectedShelfObj) return [];
    return selectedShelfObj.trays.filter(tray => {
      return !occupiedTrayIds.has(tray.id);
    });
  }, [availableShelves, selectedShelfForMap, occupiedTrayIds]);

  useEffect(() => {
    fetchLayout();
    fetchProducts();
    fetchMappings();
  }, []);

  const showSuccess = (msg: string) => {
    toast.success(msg);
  };

  const showError = (msg: string) => {
    toast.error(msg);
  };

  // ==========================================
  // API FETCH OPERATIONS
  // ==========================================

  const fetchLayout = async () => {
    try {
      const res = await api.get(`/partner/settings/layout?t=${Date.now()}`);
      if (res.data?.success || res.data?.status) {
        setRacks(res.data.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch layout", err);
      showError(err.response?.data?.message || "Failed to load warehouse layout");
    }
  };

  const toggleStatus = async (rackId: string) => {
    // Optimistic UI update
    setRacks(prevRacks => 
      prevRacks.map(rack => 
        rack.id === rackId ? { ...rack, isActive: !rack.isActive } : rack
      )
    );

    try {
      await api.patch(`/partner/settings/racks/${rackId}/status`);
      // We don't strictly need to fetch layout immediately since we updated optimistically, 
      // but doing it in the background keeps it perfectly in sync without blocking the UI.
      fetchLayout(); 
    } catch (error) {
      console.error("Error toggling status", error);
      // Revert optimistic update on failure
      setRacks(prevRacks => 
        prevRacks.map(rack => 
          rack.id === rackId ? { ...rack, isActive: !rack.isActive } : rack
        )
      );
      showError("Failed to toggle rack status. Changes reverted.");
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get("/partner/settings/products");
      if (res.data && res.data.data) {
        setProducts(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch products", err);
    }
  };

  const fetchMappings = async () => {
    setLoadingMapping(true);
    try {
      const res = await api.get("/partner/settings/product-locations");
      if (res.data && res.data.data) {
        setMappings(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch mappings", err);
    } finally {
      setLoadingMapping(false);
    }
  };

  // ==========================================
  // CREATION / DELETION ACTION HANDLERS
  // ==========================================
  const handleDeleteEntity = (type: "rack" | "shelf" | "tray", id: string, name: string) => {
    setDeleteModal({ isOpen: true, type, id, name });
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    const { type, id } = deleteModal;
    try {
      if (type === "rack") {
        await api.delete(`/partner/settings/racks/${id}`);
      } else if (type === "shelf") {
        await api.delete(`/partner/settings/shelves/${id}`);
      } else if (type === "tray") {
        await api.delete(`/partner/settings/trays/${id}`);
      }
      setDeleteModal(null);
      fetchLayout();
    } catch (err: any) {
      console.error("Error deleting", type, err);
      const serverMessage = err.response?.data?.response || err.response?.data?.message;
      alert(serverMessage || `Failed to delete ${type}. It might not be empty.`);
    }
  };



  const handleMapProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductKey || !selectedTrayForMap) {
      showError("Please select both a product and a destination tray");
      return;
    }
    const [productId, productVariantIdStr] = selectedProductKey.split("##");
    const productVariantId = productVariantIdStr === "null" ? null : productVariantIdStr;

    setSubmitting(true);
    try {
      await api.post("/partner/settings/product-locations", {
        productId,
        productVariantId,
        trayId: selectedTrayForMap
      });
      showSuccess("Product successfully mapped to tray!");
      setSelectedProductKey("");
      setSelectedRackForMap("");
      setSelectedShelfForMap("");
      setSelectedTrayForMap("");
      fetchMappings();
    } catch (err: any) {
      showError(err.response?.data?.message || "Failed to map product location");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnmapProduct = async (id: string, productName: string) => {
    if (!window.confirm(`Remove product "${productName}" from its location?`)) {
      return;
    }
    try {
      await api.delete(`/partner/settings/product-locations/${id}`);
      showSuccess(`Product "${productName}" unmapped.`);
      fetchMappings();
    } catch (err: any) {
      showError(err.response?.data?.message || "Failed to unmap product");
    }
  };

  const totalRacks = racks.length;
  const totalShelves = racks.reduce((acc, r) => acc + r.shelves.length, 0);
  const totalTrays = racks.reduce((acc, r) => acc + r.shelves.reduce((sAcc, s) => sAcc + s.trays.length, 0), 0);

  if (isSetupWizardOpen) {
    return (
      <SetupWizard 
        onClose={() => {
          setIsSetupWizardOpen(false);
          setEditRackId(null);
        }} 
        api={api as any} 
        fetchLayout={fetchLayout} 
        racks={racks}
        editRackId={editRackId}
      />
    );
  }

  return (
    <div className="w-full bg-[#F5F7FA] dark:bg-gray-900 min-h-screen p-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Header section */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-[32px] font-bold text-[#111827] dark:text-gray-100 leading-none mb-2">Storage Operations</h1>
            <p className="text-[13px] text-gray-500">View and manage product storage locations (Rack &rarr; Shelf &rarr; Tray)</p>
          </div>
        </div>

        {/* Tabs and Action Button */}
        <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-xl border border-gray-100 dark:border-gray-700 w-fit">
          <button
            onClick={() => setActiveTab("layout")}
            className={`px-6 py-2 text-sm font-bold rounded-lg transition-colors ${
              activeTab === "layout"
                ? "bg-white dark:bg-gray-700 text-[#00891D] shadow-sm border-b-2 border-[#00891D]"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Storage Setup
          </button>
          <button
            onClick={() => setActiveTab("mapping")}
            className={`px-6 py-2 text-sm font-bold rounded-lg transition-colors ${
              activeTab === "mapping"
                ? "bg-white dark:bg-gray-700 text-[#00891D] shadow-sm border-b-2 border-[#00891D]"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Assign Products
          </button>
        </div>
        
        <button onClick={() => setIsSetupWizardOpen(true)}
          className="bg-[#00891D] hover:bg-[#006614] text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm">
          Storage Setup
        </button>
        </div>

        {activeTab === "layout" && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 flex justify-between items-start shadow-sm">
                <div>
                  <p className="text-[11px] text-gray-500 font-semibold mb-1 uppercase tracking-wider">Total Racks</p>
                  <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">{totalRacks}</h3>
                  <p className="text-[10px] text-gray-400 font-medium">Active racks in warehouse</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-[#00891D]">
                  <Layers size={18} strokeWidth={2.5} />
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 flex justify-between items-start shadow-sm">
                <div>
                  <p className="text-[11px] text-gray-500 font-semibold mb-1 uppercase tracking-wider">Total Shelves</p>
                  <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">{totalShelves}</h3>
                  <p className="text-[10px] text-gray-400 font-medium">Across all racks</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-[#00891D]">
                  <Grid size={18} strokeWidth={2.5} />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 flex justify-between items-start shadow-sm">
                <div>
                  <p className="text-[11px] text-gray-500 font-semibold mb-1 uppercase tracking-wider">Total Trays</p>
                  <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">{totalTrays}</h3>
                  <p className="text-[10px] text-gray-400 font-medium">Storage compartments</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-[#00891D]">
                  <Package size={18} strokeWidth={2.5} />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 flex justify-between items-start shadow-sm">
                <div>
                  <p className="text-[11px] text-gray-500 font-semibold mb-1 uppercase tracking-wider">Low Stock Products</p>
                  <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">0</h3>
                  <p className="text-[10px] text-gray-400 font-medium">Need attention</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-[#F97316]">
                  <AlertTriangle size={18} strokeWidth={2.5} />
                </div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <button className="w-10 h-10 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-50 flex items-center justify-center shadow-sm">
                  <Filter size={18} className="text-gray-800 dark:text-gray-200" />
                </button>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 px-4 py-2.5 text-[13px] font-bold shadow-sm cursor-pointer text-gray-900 dark:text-white appearance-none pr-10 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  >
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <button 
                  onClick={() => {
                    setStatusFilter('ALL');
                    setSearchQuery("");
                  }}
                  className="flex items-center gap-1.5 text-[#F97316] hover:text-[#EA580C] text-[13px] font-bold ml-2 transition-colors"
                >
                  <RefreshCw size={14} strokeWidth={2.5} /> Reset Filter
                </button>
              </div>
              
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search ...." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 w-[300px] shadow-sm" 
                />
              </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-[#F8FAFC] dark:bg-gray-900/50">
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700" style={{ height: "64px" }}>
                    <th className="text-left px-[24px] py-[16px] text-[12px] font-medium text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Rack Name</th>
                    <th className="text-left px-[24px] py-[16px] text-[12px] font-medium text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Rack Code</th>
                    <th className="text-left px-[24px] py-[16px] text-[12px] font-medium text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Shelves</th>
                    <th className="text-left px-[24px] py-[16px] text-[12px] font-medium text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Trays</th>
                    <th className="text-left px-[24px] py-[16px] text-[12px] font-medium text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Shelf Capacity</th>
                    <th className="text-left px-[24px] py-[16px] text-[12px] font-medium text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tray Capacity</th>
                    <th className="text-center px-[24px] py-[16px] text-[12px] font-medium text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-right px-[24px] py-[16px] text-[12px] font-medium text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-[13px] divide-y divide-gray-100 dark:divide-gray-700">
                  {racks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">
                        No storage setup found. Click on 'Storage Setup' button to create one.
                      </td>
                    </tr>
                  ) : (
                    racks
                      .filter(rack => {
                        let matchStatus = true;
                        if (statusFilter === 'ACTIVE') matchStatus = rack.isActive;
                        if (statusFilter === 'INACTIVE') matchStatus = !rack.isActive;
                        
                        let matchSearch = true;
                        if (searchQuery.trim() !== '') {
                          const query = searchQuery.toLowerCase();
                          matchSearch = 
                            rack.name.toLowerCase().includes(query) || 
                            (rack.code && rack.code.toLowerCase().includes(query)) || false;
                        }
                        
                        return matchStatus && matchSearch;
                      })
                      .map((rack) => (
                      <tr key={rack.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 align-top transition-colors">
                        <td className="px-[24px] py-[16px] text-[14px] text-gray-900 dark:text-gray-100">
                          {rack.name}
                        </td>
                        <td className="px-[24px] py-[16px]">
                          <span className="bg-green-50 text-[#00891D] font-bold text-[10px] px-2.5 py-1 rounded uppercase">
                            {rack.code || rack.name.substring(0, 3)}
                          </span>
                        </td>
                        <td className="px-[24px] py-[16px] text-[14px] text-gray-900 dark:text-gray-100">
                          <div className="flex flex-col gap-1.5 mt-1">
                            {rack.shelves.map(shelf => {
                              const match = shelf.name.match(/^(.*?)\s*\((.*?)\)$/);
                              const displayName = match ? match[1] : shelf.name;
                              const displayCode = match ? match[2] : shelf.name.substring(0,3).toUpperCase();
                              return (
                                <div key={shelf.id} className="text-gray-600 dark:text-gray-300 font-medium text-[11px]">
                                  {displayName} <span className="text-gray-400 font-normal">({displayCode})</span>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-[24px] py-[16px] text-[14px] text-gray-900 dark:text-gray-100">
                          <div className="flex flex-col gap-1.5 mt-1">
                            {rack.shelves.map(shelf => {
                              const displayName = shelf.name.match(/^(.*?)\s*\(/)?.[1] || shelf.name.split(' ')[0];
                              return (
                                <div key={shelf.id} className="text-gray-500 dark:text-gray-400 text-[11px]">
                                  {displayName} : 001 &ndash; 00{Math.max(1, shelf.trays.length)}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-[24px] py-[16px] text-[14px] text-gray-900 dark:text-gray-100">
                          <div className="flex flex-col gap-1.5 mt-1">
                            {rack.shelves.map(shelf => {
                              const displayName = shelf.name.match(/^(.*?)\s*\(/)?.[1] || shelf.name.split(' ')[0];
                              const trayCapacity = shelf.trays[0]?.capacity || 10; // Fallback to 10
                              const shelfCapacity = shelf.trays.length * trayCapacity;
                              return (
                                <div key={shelf.id} className="text-gray-500 dark:text-gray-400 text-[11px]">
                                  {displayName} : <span className="font-bold text-gray-700 dark:text-gray-300">{shelfCapacity} Items</span>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-[24px] py-[16px] text-[14px] text-gray-900 dark:text-gray-100 font-bold">
                          {rack.shelves[0]?.trays[0]?.capacity || 10} Items
                        </td>
                        <td className="px-[24px] py-[16px] text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            {/* Toggle Switch */}
                            <div 
                              onClick={() => toggleStatus(rack.id)}
                              className={`w-9 h-5 rounded-full relative cursor-pointer shadow-inner transition-colors ${rack.isActive === false ? 'bg-gray-300' : 'bg-[#00891D]'}`}
                            >
                              <div className={`w-[14px] h-[14px] bg-white rounded-full absolute top-[3px] shadow-sm transition-all ${rack.isActive === false ? 'left-[3px]' : 'right-[3px]'}`}></div>
                            </div>
                            <span className={`text-[9px] font-bold tracking-wide ${rack.isActive === false ? 'text-gray-500' : 'text-[#00891D]'}`}>
                              {rack.isActive === false ? 'Inactive' : 'Active'}
                            </span>
                          </div>
                        </td>
                        <td className="px-[24px] py-[16px] text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => {
                                setEditRackId(rack.id);
                                setIsSetupWizardOpen(true);
                              }}
                              className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-900 hover:border-gray-300 transition-colors shadow-sm">
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteEntity("rack", rack.id, rack.name)}
                              className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ======================================================== */}
        {/* TAB 2: PRODUCT LOCATION MAPPING                           */}
        {/* ======================================================== */}
        {activeTab === "mapping" && (
          <div className="flex flex-col gap-6">
            
            {/* Mapping configuration form */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-800 dark:text-gray-200 text-base mb-4 flex items-center gap-2">
                📍 Map Product to Location
              </h3>
              
              <form onSubmit={handleMapProduct} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                
                {/* Product Search & Select */}
                <div className="flex flex-col gap-1.5 md:col-span-1">
                  <div className="relative mb-0.5">
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 dark:text-gray-500 block mb-1">1. Select Product</label>
                    <input
                      type="text"
                      placeholder="Search product..."
                      value={searchProductQuery}
                      onChange={(e) => setSearchProductQuery(e.target.value)}
                      className="w-full text-xs pl-8 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00891D]"
                    />
                    <Search className="absolute left-2.5 top-[29px] text-gray-400 dark:text-gray-500" size={14} />
                  </div>
                  <CustomSelect
                    label=""
                    value={selectedProductKey}
                    onChange={setSelectedProductKey}
                    options={filteredProducts.map(p => ({
                      id: `${p.id}##${p.productVariantId}`,
                      name: p.name
                    }))}
                    placeholder="-- Choose Product --"
                  />
                </div>

                {/* Rack Selector */}
                <div className="flex flex-col gap-1.5 md:col-span-1">
                  <CustomSelect
                    label="2. Select Rack"
                    value={selectedRackForMap}
                    onChange={(val) => {
                      setSelectedRackForMap(val);
                      setSelectedShelfForMap("");
                      setSelectedTrayForMap("");
                    }}
                    options={availableRacks.map(r => ({ id: r.id, name: r.name }))}
                    placeholder="-- Select Rack --"
                  />
                </div>

                {/* Shelf Selector */}
                <div className="flex flex-col gap-1.5 md:col-span-1">
                  <CustomSelect
                    label="3. Select Shelf"
                    disabled={!selectedRackForMap}
                    value={selectedShelfForMap}
                    onChange={(val) => {
                      setSelectedShelfForMap(val);
                      setSelectedTrayForMap("");
                    }}
                    options={availableShelves.map(s => ({ id: s.id, name: s.name }))}
                    placeholder="-- Select Shelf --"
                  />
                </div>

                {/* Tray Selector */}
                <div className="flex flex-col gap-1.5 md:col-span-1">
                  <CustomSelect
                    label="4. Select Tray"
                    disabled={!selectedShelfForMap}
                    value={selectedTrayForMap}
                    onChange={setSelectedTrayForMap}
                    options={availableTrays.map(t => ({ id: t.id, name: t.name }))}
                    placeholder="-- Select Tray --"
                  />
                </div>

                <div className="md:col-span-4 mt-2">
                  <button
                    type="submit"
                    disabled={submitting || !selectedProductKey || !selectedTrayForMap}
                    className="w-full md:w-auto bg-[#00891D] hover:bg-[#006614] disabled:bg-gray-300 text-white font-semibold text-xs px-6 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 ml-auto"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Assign Product Location
                  </button>
                </div>

              </form>
            </div>

            {/* Mapped Products list */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <h3 className="font-bold text-gray-800 dark:text-gray-200 text-base mb-4">
                📋 Current Product Locations
              </h3>

              {loadingMapping ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500 gap-2">
                  <Loader2 className="animate-spin text-[#00891D]" size={32} />
                  <p className="text-xs">Loading mappings...</p>
                </div>
              ) : mappings.length === 0 ? (
                <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                  <p className="text-sm">No mapped products found.</p>
                  <p className="text-xs mt-1">Select a product and layout items above to map your inventory.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500 text-[10px] uppercase font-bold tracking-wider bg-gray-50 dark:bg-gray-700/50/50">
                        <th className="py-3 px-4">Product Name</th>
                        <th className="py-3 px-4">SKU / Batch</th>
                        <th className="py-3 px-4">Location</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mappings.map(map => (
                        <tr key={map.id} className="border-b border-gray-50 hover:bg-gray-50 dark:hover:bg-gray-700/50 dark:bg-gray-700/50/30 transition-colors text-xs text-gray-700 dark:text-gray-300">
                          <td className="py-3.5 px-4 font-medium text-gray-800 dark:text-gray-200">
                            {map.product.name}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-gray-500 dark:text-gray-400 dark:text-gray-500">
                            {map.product.sku || "—"}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-[#00891D]">
                            {map.tray.shelf.rack.name} / {map.tray.shelf.name} / {map.tray.name}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleUnmapProduct(map.id, map.product.name)}
                              className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition-colors"
                              title="Remove location assignment"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Delete Modal */}
        {deleteModal?.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteModal(null)}></div>
            <div className="bg-white rounded-3xl p-8 max-w-[400px] w-full mx-4 relative z-10 shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-5">
                <AlertTriangle size={28} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete {deleteModal.type === 'rack' ? 'Rack' : deleteModal.type === 'shelf' ? 'Shelf' : 'Tray'}?</h3>
              <p className="text-sm text-gray-600 mb-2">
                Are you sure you want to remove {deleteModal.type.charAt(0).toUpperCase() + deleteModal.type.slice(1)} <span className="font-bold text-gray-900">{deleteModal.name}</span> {deleteModal.code && <span className="font-bold text-gray-900">({deleteModal.code})</span>} from {deleteModal.type}s?
              </p>
              <p className="text-[13px] text-gray-400 font-medium mb-8">This action cannot be undone.</p>
              
              <div className="flex w-full gap-3">
                <button 
                  onClick={() => setDeleteModal(null)}
                  className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#FF0000] text-white font-bold hover:bg-red-700 transition-colors"
                >
                  Delete {deleteModal.type === 'rack' ? 'Rack' : deleteModal.type === 'shelf' ? 'Shelf' : 'Tray'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
