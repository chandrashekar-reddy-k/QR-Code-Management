import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Layers, 
  Trash2, 
  Search, 
  Loader2,
  Grid,
  Package,
  AlertTriangle,
  Filter,
  ChevronDown,
  RefreshCw,
  Edit2,
  Maximize,
  ArrowLeft,
  Eye,
  ChevronLeft,
  ChevronRight
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
  quantity?: number;
  product: Product;
  tray: {
    id: string;
    name: string;
    capacity?: number | null;
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

export function StorageOperations() {
  const [activeTab, setActiveTab] = useState<"layout" | "mapping">("layout");
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);
  const [editRackId, setEditRackId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, type: 'rack' | 'shelf' | 'tray' | 'product', id: string, name: string, code?: string } | null>(null);
  
  // Layout states
  const [racks, setRacks] = useState<Rack[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Available' | 'Low Stock' | 'Full' | 'Empty' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [searchQuery, setSearchQuery] = useState("");

  // Mapping states
  const [products, setProducts] = useState<Product[]>([]);
  const [mappings, setMappings] = useState<ProductLocation[]>([]);
  const [loadingMapping, setLoadingMapping] = useState(false);
  const [selectedProductKey, setSelectedProductKey] = useState("");
  const [selectedRackForMap, setSelectedRackForMap] = useState("");
  const [selectedShelfForMap, setSelectedShelfForMap] = useState("");
  const [selectedTrayForMap, setSelectedTrayForMap] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [isAssigningProduct, setIsAssigningProduct] = useState(false);
  const [editingMappingId, setEditingMappingId] = useState<string | null>(null);
  const [viewingMappingId, setViewingMappingId] = useState<string | null>(null);

  // Accordion states for Storage Structure
  const [isStorageStructureFullScreen, setIsStorageStructureFullScreen] = useState(false);
  const [lastInteractedRackId, setLastInteractedRackId] = useState<string | null>(null);
  const [expandedRacks, setExpandedRacks] = useState<Record<string, boolean>>({});
  const [expandedShelves, setExpandedShelves] = useState<Record<string, boolean>>({});

  // Compute occupied and available layout lists
  const occupiedTrayIds = React.useMemo(() => {
    return new Set(
      mappings
        .filter(m => m.id !== editingMappingId)
        .map(m => m.tray?.id || (m as any).trayId)
        .filter(Boolean)
    );
  }, [mappings, editingMappingId]);

  const trayOccupiedQuantities = React.useMemo(() => {
    const quantities = new Map<string, number>();
    mappings.forEach(m => {
      if (m.id === editingMappingId) return;
      const trayId = m.tray?.id || (m as any).trayId;
      if (!trayId) return;
      const current = quantities.get(trayId) || 0;
      quantities.set(trayId, current + (m.quantity || 0));
    });
    return quantities;
  }, [mappings, editingMappingId]);

  const mappedVariantIds = React.useMemo(() => {
    return new Set(
      mappings
        .filter(m => m.id !== editingMappingId)
        .map(m => m.productVariantId)
        .filter(Boolean)
    );
  }, [mappings, editingMappingId]);

  const unmappedProducts = React.useMemo(() => {
    return products.filter(p => {
      if (p.productVariantId) {
        return !mappedVariantIds.has(p.productVariantId);
      }
      return !mappings.filter(m => m.id !== editingMappingId).some(m => m.productId === p.id && !m.productVariantId);
    });
  }, [products, mappings, mappedVariantIds, editingMappingId]);

  const filteredProducts = React.useMemo(() => {
    return unmappedProducts;
  }, [unmappedProducts]);

  const mappingsWithStatus = React.useMemo(() => {
    return mappings.map((map: any) => {
      const qty = map.quantity || 0;
      const capacity = map.tray?.capacity || 20;
      
      let status = 'Available';
      if (qty === 0) status = 'Empty';
      else if (qty >= capacity) status = 'Full';
      else if (qty < capacity / 3) status = 'Low Stock';
      
      return { ...map, calculatedQty: qty, calculatedStatus: status, calculatedCapacity: capacity };
    });
  }, [mappings]);

  const filteredMappings = React.useMemo(() => {
    let result = mappingsWithStatus;

    if (statusFilter !== 'ALL') {
      result = result.filter((map: any) => map.calculatedStatus === statusFilter);
    }

    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter((mapping: any) => {
        const productName = mapping.product?.name?.toLowerCase() || '';
        const productSku = mapping.product?.sku?.toLowerCase() || '';
        const rackName = mapping.tray?.shelf?.rack?.name?.toLowerCase() || '';
        const shelfName = mapping.tray?.shelf?.name?.toLowerCase() || '';
        const trayName = mapping.tray?.name?.toLowerCase() || '';
        
        return productName.includes(lowerQuery) || 
               productSku.includes(lowerQuery) ||
               rackName.includes(lowerQuery) || 
               shelfName.includes(lowerQuery) || 
               trayName.includes(lowerQuery);
      });
    }

    return result;
  }, [mappingsWithStatus, searchQuery, statusFilter]);

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
    const { type, id, name } = deleteModal;
    try {
      if (type === "rack") {
        await api.delete(`/partner/settings/racks/${id}`);
      } else if (type === "shelf") {
        await api.delete(`/partner/settings/shelves/${id}`);
      } else if (type === "tray") {
        await api.delete(`/partner/settings/trays/${id}`);
      } else if (type === "product") {
        await api.delete(`/partner/settings/product-locations/${id}`);
        showSuccess(`Product "${name}" unmapped.`);
      }
      
      setDeleteModal(null);
      
      if (type === "product") {
        fetchMappings();
      } else {
        fetchLayout();
      }
    } catch (err: any) {
      console.error("Error deleting", type, err);
      const serverMessage = err.response?.data?.response || err.response?.data?.message;
      alert(serverMessage || `Failed to delete ${type}. It might not be empty.`);
    }
  };


  const handleEditMapping = (map: any) => {
    setEditingMappingId(map.id);
    setSelectedProductKey(`${map.productId}##${map.productVariantId || null}`);
    setSelectedRackForMap(map.tray.shelf.rack.id);
    setSelectedShelfForMap(map.tray.shelf.id);
    setSelectedTrayForMap(map.tray.id);
    setQuantity(map.quantity?.toString() || "0");
    
    setExpandedRacks(prev => ({ ...prev, [map.tray.shelf.rack.id]: true }));
    setExpandedShelves(prev => ({ ...prev, [map.tray.shelf.id]: true }));
    
    setIsAssigningProduct(true);
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
        trayId: selectedTrayForMap,
        quantity: quantity ? Number(quantity) : 0
      });
      showSuccess("Product successfully mapped to tray!");
      setSelectedProductKey("");
      setSelectedRackForMap("");
      setSelectedShelfForMap("");
      setSelectedTrayForMap("");
      setQuantity("");
      setUnit("");
      setEditingMappingId(null);
      setIsAssigningProduct(false);
      fetchMappings();
    } catch (err: any) {
      showError(err.response?.data?.message || "Failed to map product location");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnmapProduct = (id: string, productName: string) => {
    setDeleteModal({ isOpen: true, type: "product", id, name: productName });
  };

  const totalRacks = racks.length;
  const totalShelves = racks.reduce((acc, r) => acc + r.shelves.length, 0);
  const totalTrays = racks.reduce((acc, r) => acc + r.shelves.reduce((sAcc, s) => sAcc + s.trays.length, 0), 0);

  if (isStorageStructureFullScreen) {
    const targetRackId = selectedRackForMap || lastInteractedRackId || (racks.length > 0 ? racks[0].id : null);
    const targetRack = racks.find(r => r.id === targetRackId);

    return (
      <div className="w-full bg-[#F5F7FA] dark:bg-gray-900 min-h-screen p-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3 mb-6 mt-2">
            <button 
              onClick={() => setIsStorageStructureFullScreen(false)} 
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} className="text-gray-700 dark:text-gray-300" />
            </button>
            <h1 className="text-[28px] font-bold text-[#111827] dark:text-gray-100 leading-none">Storage Structure</h1>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-700">
            {!targetRack ? (
              <div className="text-gray-500 text-center py-12">No rack found.</div>
            ) : (
              <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-[#F0FDF4] rounded-lg border border-[#00891D]/20">
                    <div className="w-5 h-5 bg-[#00891D] rounded-sm flex flex-col justify-evenly p-0.5">
                      <div className="w-full h-0.5 bg-white rounded-full"></div>
                      <div className="w-full h-0.5 bg-white rounded-full"></div>
                      <div className="w-full h-0.5 bg-white rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-800 dark:text-gray-200 leading-tight">{targetRack.name}</span>
                      <span className="text-[11px] font-bold bg-[#F0FDF4] text-[#00891D] px-2 py-0.5 rounded-full border border-[#00891D]/20">{targetRack.code || targetRack.name.substring(0, 3).toUpperCase()}</span>
                    </div>
                    <span className="text-xs text-gray-400 font-medium">Rack | Max Shelves: {targetRack.shelves?.length || 0}</span>
                  </div>
                </div>

                <div className="flex flex-col ml-5 pl-8 border-l-2 border-gray-100 dark:border-gray-700 space-y-8 pb-4 relative">
                  {targetRack.shelves?.map((shelf) => (
                    <div key={shelf.id} className="flex flex-col relative">
                      <div className="absolute -left-[34px] top-4 w-6 border-b-2 border-gray-100 dark:border-gray-700"></div>
                      
                      <div className="flex items-center gap-3 mb-4 relative z-10 -ml-[38px]">
                        <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 shadow-sm relative">
                           <div className="w-4 h-4 bg-[#F0FDF4] rounded-sm flex flex-col justify-evenly p-[1.5px] border border-[#00891D]/20">
                              <div className="w-full h-[1.5px] bg-[#00891D] rounded-full"></div>
                              <div className="w-full h-[1.5px] bg-[#00891D] rounded-full"></div>
                           </div>
                        </div>
                        <div className="flex flex-col bg-white dark:bg-gray-800 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-bold text-gray-800 dark:text-gray-200 leading-tight">{shelf.name}</span>
                            <span className="text-[10px] font-bold text-gray-500 uppercase">({shelf.name.substring(0, 4).toUpperCase()})</span>
                          </div>
                          <span className="text-[11px] text-gray-400 font-medium mt-0.5">Shelf | Max Trays: {shelf.trays?.length || 0}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 pl-8">
                        {shelf.trays?.map(tray => {
                          const isSelected = selectedTrayForMap === tray.id;
                          const trayQty = trayOccupiedQuantities.get(tray.id) || 0;
                          return (
                            <div 
                              key={tray.id}
                              className={`flex flex-col p-3 rounded-xl border-2 transition-all min-w-[130px] ${
                                isSelected 
                                  ? 'border-[#00891D] bg-[#F0FDF4] shadow-sm' 
                                  : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 shadow-sm'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <Package size={14} className={isSelected ? "text-[#00891D]" : "text-gray-400"} strokeWidth={isSelected ? 2.5 : 2} />
                                <span className={`text-[12px] font-bold leading-tight ${isSelected ? 'text-[#00891D]' : 'text-gray-700 dark:text-gray-300'}`}>
                                  {tray.name}
                                </span>
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className={`text-[10px] font-medium ${isSelected ? 'text-[#00891D]/80' : 'text-gray-500'}`}>
                                  Capacity: {tray.capacity || 20}
                                </span>
                                <span className={`text-[10px] font-medium ${isSelected ? 'text-[#00891D]/80' : 'text-gray-500'}`}>
                                  Occupied: {trayQty}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

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
        {isAssigningProduct ? (
          <div className="flex items-center gap-3 mb-6 mt-2">
            <button onClick={() => setIsAssigningProduct(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <ArrowLeft size={24} className="text-gray-700 dark:text-gray-300" />
            </button>
            <h1 className="text-[28px] font-bold text-[#111827] dark:text-gray-100 leading-none">Assign Products</h1>
          </div>
        ) : (
          <>
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
              
              {activeTab === "layout" ? (
                <button onClick={() => setIsSetupWizardOpen(true)}
                  className="bg-[#00891D] hover:bg-[#006614] text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm">
                  Storage Setup
                </button>
              ) : (
                <button onClick={() => {
                  setEditingMappingId(null);
                  setViewingMappingId(null);
                  setSelectedProductKey("");
                  setSelectedRackForMap("");
                  setSelectedShelfForMap("");
                  setSelectedTrayForMap("");
                  setQuantity("");
                  setUnit("");
                  setIsAssigningProduct(true);
                }}
                  className="bg-[#00891D] hover:bg-[#006614] text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm">
                  Assign Products
                </button>
              )}
            </div>
          </>
        )}

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

            {/* Pagination Footer */}
            {racks.length > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="text-[13px] text-gray-500 dark:text-gray-400 mb-4 sm:mb-0">
                  Showing 1 to {Math.min(6, racks.length)} of {racks.length > 6 ? 46 : racks.length} entries
                </div>
                <div className="flex gap-1.5">
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <ChevronLeft size={16} />
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-transparent bg-[#F97316] text-white font-bold text-[13px] shadow-sm">
                    1
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium text-[13px] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    2
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium text-[13px] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    3
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "mapping" && (
          <div className="flex flex-col gap-6">
            
            {viewingMappingId ? (
              (() => {
                const map = mappings.find(m => m.id === viewingMappingId);
                if (!map) return null;
                
                const rack = racks.find(r => r.id === map.tray.shelf.rack.id);
                const shelf = rack?.shelves.find(s => s.id === map.tray.shelf.id);
                const tray = shelf?.trays.find(t => t.id === map.tray.id);

                const locCode = `STP-${shelf?.name.substring(0,4).toUpperCase()}-${tray?.name}`;

                return (
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-3 mb-2">
                      <button onClick={() => setViewingMappingId(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors">
                        <ArrowLeft size={24} className="text-gray-700 dark:text-gray-300" />
                      </button>
                      <h1 className="text-[28px] font-bold text-[#111827] dark:text-gray-100 leading-none">Product Assignment Details</h1>
                    </div>
                    
                    {/* Top Card: Information */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-12">
                       <div className="flex-1">
                         <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-6">Product Information</h3>
                         <div className="grid grid-cols-2 gap-6">
                           <div>
                             <p className="text-xs font-semibold text-gray-400 mb-1">Product Name</p>
                             <p className="font-bold text-gray-800 dark:text-gray-200">{map.product.name}</p>
                           </div>
                           <div>
                             <p className="text-xs font-semibold text-gray-400 mb-1">Product Code</p>
                             <p className="font-bold text-gray-800 dark:text-gray-200">{map.product.sku || "VK001"}</p>
                           </div>
                           <div>
                             <p className="text-xs font-semibold text-gray-400 mb-1">Category</p>
                             <p className="font-bold text-gray-800 dark:text-gray-200">{rack?.name || "Staples"}</p>
                           </div>
                           <div>
                             <p className="text-xs font-semibold text-gray-400 mb-1">Unit</p>
                             <p className="font-bold text-gray-800 dark:text-gray-200">KG</p>
                           </div>
                         </div>
                       </div>
                       
                       <div className="w-px bg-gray-200 dark:bg-gray-700 hidden md:block"></div>
                       
                       <div className="flex-1">
                         <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-6">Location Details</h3>
                         <div className="grid grid-cols-2 gap-6">
                           <div>
                             <p className="text-xs font-semibold text-gray-400 mb-1">Location Code</p>
                             <p className="font-bold text-gray-800 dark:text-gray-200">{locCode}</p>
                           </div>
                           <div>
                             <p className="text-xs font-semibold text-gray-400 mb-1">Rack</p>
                             <p className="font-bold text-gray-800 dark:text-gray-200">{rack?.name}</p>
                           </div>
                           <div>
                             <p className="text-xs font-semibold text-gray-400 mb-1">Shelf</p>
                             <p className="font-bold text-gray-800 dark:text-gray-200">{shelf?.name}</p>
                           </div>
                           <div>
                             <p className="text-xs font-semibold text-gray-400 mb-1">Tray</p>
                             <p className="font-bold text-gray-800 dark:text-gray-200">{tray?.name}</p>
                           </div>
                         </div>
                       </div>
                    </div>

                    {/* Bottom Card: Storage Structure Visual */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
                       <div className="flex items-start gap-4">
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 text-[#00891D] rounded-2xl border border-green-100 dark:border-green-800">
                             <Grid size={24} strokeWidth={2} />
                          </div>
                          <div className="flex flex-col mt-1">
                             <div className="flex items-center gap-2">
                                <span className="font-bold text-lg text-gray-900 dark:text-white">{rack?.name}</span>
                                <span className="bg-green-100 dark:bg-green-900/30 text-[#00891D] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">{rack?.code || rack?.name.substring(0,3)}</span>
                             </div>
                             <span className="text-xs text-gray-400 mt-1">Rack | Max Shelves: {rack?.maxShelves || 4}</span>
                          </div>
                       </div>

                       <div className="ml-6 mt-4 border-l-2 border-gray-100 dark:border-gray-700 pl-8 relative pb-4">
                          <div className="absolute w-8 h-[2px] bg-gray-100 dark:bg-gray-700 left-0 top-8"></div>
                          
                          <div className="flex flex-col gap-6 pt-2">
                             {rack?.shelves.map((s) => {
                               const isCurrentShelf = s.id === shelf?.id;
                               return (
                                 <div key={s.id} className="flex flex-col">
                                   <div className="inline-flex border border-gray-200 dark:border-gray-700 rounded-xl p-3 px-4 gap-3 bg-white dark:bg-gray-800 w-max shadow-sm z-10 relative">
                                      <div className="text-[#00891D]"><Layers size={20} /></div>
                                      <div className="flex flex-col justify-center">
                                         <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{s.name}</span>
                                         <span className="text-[10px] text-gray-400">Shelf | Max Trays: 6</span>
                                      </div>
                                   </div>

                                   {isCurrentShelf && (
                                     <div className="ml-5 border-l-2 border-gray-100 dark:border-gray-700 pl-8 relative mt-[-10px] pt-8">
                                        <div className="absolute w-8 h-[2px] bg-gray-100 dark:bg-gray-700 left-0 top-[50px]"></div>
                                        
                                        <div className="flex gap-4 overflow-x-auto pb-4 items-center pl-2">
                                           {s.trays.map((t) => {
                                              const isSelected = t.id === tray?.id;
                                              const trayQty = trayOccupiedQuantities.get(t.id) || 0;
                                              const capacity = t.capacity || 20;
                                              return (
                                                 <div key={t.id} className={`flex flex-col gap-1.5 min-w-[120px] p-3.5 rounded-xl border transition-colors relative bg-white dark:bg-gray-800 ${isSelected ? 'border-[#00891D] border-2 bg-green-50/30 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
                                                    <div className="flex items-center gap-2 mb-1">
                                                       <Package size={16} className={isSelected ? 'text-[#00891D]' : 'text-gray-400'} />
                                                       <span className={`font-bold text-sm ${isSelected ? 'text-[#00891D]' : 'text-gray-700 dark:text-gray-300'}`}>Tray {t.name}</span>
                                                    </div>
                                                    <span className={`text-[11px] ${isSelected ? 'text-[#00891D]/80' : 'text-gray-400'}`}>Capacity: {capacity}</span>
                                                    <span className={`text-[11px] ${isSelected ? 'text-[#00891D]/80' : 'text-gray-400'}`}>Occupied: {trayQty}</span>
                                                 </div>
                                              );
                                           })}
                                        </div>
                                     </div>
                                   )}
                                 </div>
                               )
                             })}
                          </div>
                       </div>
                    </div>

                  </div>
                );
              })()
            ) : isAssigningProduct ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Panel: Form */}
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                <form onSubmit={handleMapProduct} className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-gray-800 dark:text-gray-200 block mb-1">Select Product <span className="text-red-500">*</span></label>
                    <CustomSelect
                      label=""
                      value={selectedProductKey}
                      onChange={setSelectedProductKey}
                      options={filteredProducts.map(p => ({
                        id: `${p.id}##${p.productVariantId}`,
                        name: p.name
                      }))}
                      placeholder="Select"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-gray-800 dark:text-gray-200 block mb-1">Select Rack <span className="text-red-500">*</span></label>
                    <CustomSelect
                      label=""
                      value={selectedRackForMap}
                      onChange={(val) => {
                        setSelectedRackForMap(val);
                        setSelectedShelfForMap("");
                        setSelectedTrayForMap("");
                      }}
                      options={availableRacks.map(r => ({ id: r.id, name: r.name }))}
                      placeholder="Select"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-gray-800 dark:text-gray-200 block mb-1">Select Shelf <span className="text-red-500">*</span></label>
                    <CustomSelect
                      label=""
                      disabled={!selectedRackForMap}
                      value={selectedShelfForMap}
                      onChange={(val) => {
                        setSelectedShelfForMap(val);
                        setSelectedTrayForMap("");
                      }}
                      options={availableShelves.map(s => ({ id: s.id, name: s.name }))}
                      placeholder="Select"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-gray-800 dark:text-gray-200 block mb-1">Select Tray <span className="text-red-500">*</span></label>
                    <CustomSelect
                      label=""
                      disabled={!selectedShelfForMap}
                      value={selectedTrayForMap}
                      onChange={setSelectedTrayForMap}
                      options={availableTrays.map(t => ({ id: t.id, name: t.name }))}
                      placeholder="Select"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-bold text-gray-800 dark:text-gray-200 block mb-1">Quantity <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full text-[13px] px-3 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00891D] font-medium"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">The maximum number of items that can fit in the selected tray are 20.</p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-bold text-gray-800 dark:text-gray-200 block mb-1">Unit <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="w-full text-[13px] px-3 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00891D] font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProductKey("");
                        setSelectedRackForMap("");
                        setSelectedShelfForMap("");
                        setSelectedTrayForMap("");
                        setQuantity("");
                        setUnit("");
                        setEditingMappingId(null);
                        setViewingMappingId(null);
                        setIsAssigningProduct(false);
                      }}
                      className="px-6 py-2.5 rounded-lg border border-gray-200 text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-colors w-[120px]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !selectedProductKey || !selectedTrayForMap}
                      className="bg-[#00891D] hover:bg-[#006614] disabled:bg-gray-300 text-white font-bold text-[13px] px-6 py-2.5 rounded-lg transition-colors flex items-center justify-center w-full sm:w-auto"
                    >
                      {submitting ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                      {editingMappingId ? 'Update Product' : 'Assign Product'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Panel: Storage Structure */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-200 text-base">Storage Structure</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">Navigate your storage hierarchy.</p>
                  </div>
                  <button 
                    type="button" 
                    className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-500"
                    onClick={() => setIsStorageStructureFullScreen(true)}
                  >
                    <Maximize size={14} strokeWidth={2.5} />
                  </button>
                </div>
                
                <div className="flex flex-col gap-1 overflow-y-auto pr-2" style={{ maxHeight: '550px' }}>
                  {racks.map(rack => (
                    <div key={rack.id} className="flex flex-col mb-1">
                      <div 
                        className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl cursor-pointer transition-colors"
                        onClick={() => {
                          setExpandedRacks(prev => ({...prev, [rack.id]: !prev[rack.id]}));
                          setLastInteractedRackId(rack.id);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Package size={20} className="text-[#00891D]" strokeWidth={2} />
                          <div className="flex flex-col">
                            <span className="text-[13px] font-bold text-gray-800 dark:text-gray-200 leading-tight">{rack.name}</span>
                            <span className="text-[11px] text-gray-400 font-medium">Rack</span>
                          </div>
                        </div>
                        <ChevronDown size={16} className={`text-gray-400 transition-transform ${expandedRacks[rack.id] ? 'rotate-180' : ''}`} />
                      </div>

                      {expandedRacks[rack.id] && (
                        <div className="flex flex-col pl-4 mt-1 border-l-2 border-gray-100 dark:border-gray-700 ml-5 gap-1">
                          {rack.shelves.map(shelf => (
                            <div key={shelf.id} className="flex flex-col">
                              <div 
                                className="flex justify-between items-center p-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl cursor-pointer transition-colors"
                                onClick={() => setExpandedShelves(prev => ({...prev, [shelf.id]: !prev[shelf.id]}))}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-5 h-5 bg-[#F0FDF4] rounded flex items-center justify-center border border-[#00891D]/20">
                                    <div className="w-2.5 h-0.5 bg-[#00891D] rounded-full"></div>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[13px] font-bold text-gray-700 dark:text-gray-300 leading-tight">{shelf.name}</span>
                                    <span className="text-[11px] text-gray-400">Max Trays: {shelf.trays.length}</span>
                                  </div>
                                </div>
                                <ChevronDown size={16} className={`text-gray-400 transition-transform ${expandedShelves[shelf.id] ? 'rotate-180' : ''}`} />
                              </div>

                              {expandedShelves[shelf.id] && (
                                <div className="flex flex-col pl-7 mt-1 gap-1.5 pb-2">
                                  {shelf.trays.map(tray => {
                                    const isSelected = selectedTrayForMap === tray.id;
                                    const trayQty = trayOccupiedQuantities.get(tray.id) || 0;
                                    return (
                                      <div 
                                        key={tray.id} 
                                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${isSelected ? 'border-[#00891D] bg-[#F0FDF4]' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                        onClick={() => {
                                          setSelectedRackForMap(rack.id);
                                          setSelectedShelfForMap(shelf.id);
                                          setSelectedTrayForMap(tray.id);
                                        }}
                                      >
                                        <div className={`p-1.5 rounded-lg flex items-center justify-center ${isSelected ? 'bg-[#00891D] text-white' : 'bg-[#E5E7EB] text-[#00891D]'}`}>
                                          <Package size={16} className={isSelected ? "text-white" : "text-[#00891D]"} strokeWidth={isSelected ? 2.5 : 2} />
                                        </div>
                                        <div className="flex flex-col">
                                          <span className={`text-[13px] font-bold leading-tight ${isSelected ? 'text-[#00891D]' : 'text-gray-700 dark:text-gray-300'}`}>{tray.name}</span>
                                          <span className="text-[11px] text-gray-500 font-medium mt-0.5">Capacity: {tray.capacity || 20} | Occupied: {trayQty}</span>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            ) : (
              <div className="flex flex-col w-full">
                {/* Filter bar */}
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                  <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                    <button className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2.5 rounded-xl shadow-sm text-gray-700 dark:text-gray-300 flex-shrink-0">
                      <Filter size={18} />
                    </button>
                    <div className="relative flex-shrink-0">
                      <select
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-4 pr-10 py-2.5 rounded-xl shadow-sm text-sm font-bold text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer appearance-none outline-none"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                      >
                        <option value="ALL">All status</option>
                        <option value="Available">Available</option>
                        <option value="Low Stock">Low Stock</option>
                        <option value="Full">Full</option>
                        <option value="Empty">Empty</option>
                      </select>
                      <ChevronDown size={16} className="text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <button 
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 text-orange-500 flex-shrink-0"
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("ALL");
                      }}
                    >
                      <RefreshCw size={14} className="text-orange-500" />
                      <span className="text-sm font-bold">Reset Filter</span>
                    </button>
                  </div>
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 w-full sm:w-[300px]">
                    <Search size={18} className="text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Search ...." 
                      className="bg-transparent border-none focus:outline-none text-sm w-full dark:text-white"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)} 
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {loadingMapping ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500 gap-2">
                      <Loader2 className="animate-spin text-[#00891D]" size={32} />
                      <p className="text-xs">Loading mappings...</p>
                    </div>
                  ) : filteredMappings.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                      <p className="text-sm">{mappings.length === 0 ? "No mapped products found." : "No results match your search."}</p>
                      <p className="text-xs mt-1">{mappings.length === 0 ? "Select a product and layout items above to map your inventory." : "Try adjusting your search criteria."}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                          <tr className="bg-[#F8F9FA] dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-[11px] font-extrabold text-gray-900 dark:text-gray-200 tracking-wider">
                            <th className="py-4 px-6 uppercase">Product</th>
                            <th className="py-4 px-4 uppercase">Code</th>
                            <th className="py-4 px-4 uppercase">Rack</th>
                            <th className="py-4 px-4 uppercase">Shelf</th>
                            <th className="py-4 px-4 uppercase">Tray</th>
                            <th className="py-4 px-4 uppercase text-center">Location Code</th>
                            <th className="py-4 px-4 uppercase text-center">Quantity</th>
                            <th className="py-4 px-4 uppercase text-center">Tray Capacity</th>
                            <th className="py-4 px-4 uppercase text-center">Status</th>
                            <th className="py-4 px-6 uppercase text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="text-[13px]">
                          {filteredMappings.map((map: any) => {
                            const qty = map.calculatedQty; 
                            const capacity = map.calculatedCapacity;
                            const status = map.calculatedStatus;

                            const locCode = `${map.tray.shelf.rack.name}-${map.tray.shelf.name}-${map.tray.name}`;

                            return (
                              <tr key={map.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="py-4 px-6 text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">{map.product.name}</td>
                                <td className="py-4 px-4 text-gray-400 dark:text-gray-500 font-mono text-[12px]">{map.product.sku || "—"}</td>
                                <td className="py-4 px-4 text-gray-600 dark:text-gray-400">{map.tray.shelf.rack.name}</td>
                                <td className="py-4 px-4 text-gray-600 dark:text-gray-400">{map.tray.shelf.name}</td>
                                <td className="py-4 px-4 text-gray-600 dark:text-gray-400">{map.tray.name}</td>
                                <td className="py-4 px-4 text-center">
                                  <span className="bg-[#E6F4EA] dark:bg-green-900/20 text-[#1E8E3E] font-bold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider">{locCode}</span>
                                </td>
                                <td className="py-4 px-4 text-center text-gray-700 dark:text-gray-300">{qty}</td>
                                <td className="py-4 px-4 text-center text-gray-700 dark:text-gray-300">{capacity}</td>
                                <td className="py-4 px-4 text-center">
                                  {status === 'Full' && <span className="bg-[#00891D] text-white font-bold text-[10px] px-3 py-1 rounded-full whitespace-nowrap">Full</span>}
                                  {status === 'Available' && <span className="bg-[#E6F4EA] dark:bg-green-900/30 text-[#1E8E3E] font-bold text-[10px] px-3 py-1 rounded-full whitespace-nowrap">Available</span>}
                                  {status === 'Low Stock' && <span className="bg-[#FEF0E6] dark:bg-orange-900/30 text-[#E07A5F] font-bold text-[10px] px-3 py-1 rounded-full whitespace-nowrap">Low Stock</span>}
                                  {status === 'Empty' && <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-bold text-[10px] px-3 py-1 rounded-full whitespace-nowrap">Empty</span>}
                                </td>
                                <td className="py-4 px-6 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button onClick={() => setViewingMappingId(map.id)} className="p-1.5 border border-gray-200 dark:border-gray-600 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                      <Eye size={14} />
                                    </button>
                                    <button onClick={() => handleEditMapping(map)} className="p-1.5 border border-gray-200 dark:border-gray-600 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                      <Edit2 size={14} />
                                    </button>
                                    <button onClick={() => handleUnmapProduct(map.id, map.product.name)} className="p-1.5 border border-gray-200 dark:border-gray-600 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800 transition-colors">
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Pagination Footer */}
                  {mappings.length > 0 && !loadingMapping && (
                    <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <div className="text-[13px] text-gray-500 dark:text-gray-400 mb-4 sm:mb-0">
                        Showing 1 to {Math.min(6, mappings.length)} of {mappings.length > 6 ? 46 : mappings.length} entries
                      </div>
                      <div className="flex gap-1.5">
                        <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <ChevronLeft size={16} />
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-transparent bg-[#F97316] text-white font-bold text-[13px] shadow-sm">
                          1
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium text-[13px] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          2
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium text-[13px] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          3
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
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
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {deleteModal.type === 'product' ? 'Delete Product?' : `Delete ${deleteModal.type === 'rack' ? 'Rack' : deleteModal.type === 'shelf' ? 'Shelf' : 'Tray'}?`}
              </h3>
              
              {deleteModal.type === 'product' ? (
                <p className="text-sm text-gray-600 mb-2">
                  Are you sure you want to remove Product <span className="font-bold text-gray-900">{deleteModal.name}</span> from Assigned Products?
                </p>
              ) : (
                <p className="text-sm text-gray-600 mb-2">
                  Are you sure you want to remove {deleteModal.type.charAt(0).toUpperCase() + deleteModal.type.slice(1)} <span className="font-bold text-gray-900">{deleteModal.name}</span> {deleteModal.code && <span className="font-bold text-gray-900">({deleteModal.code})</span>} from {deleteModal.type}s?
                </p>
              )}
              
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
                  {deleteModal.type === 'product' ? 'Delete Product' : `Delete ${deleteModal.type === 'rack' ? 'Rack' : deleteModal.type === 'shelf' ? 'Shelf' : 'Tray'}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
