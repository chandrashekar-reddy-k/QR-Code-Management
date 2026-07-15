import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  FolderPlus, 
  Layers, 
  Inbox, 
  MapPin, 
  Trash2, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  Loader2
} from "lucide-react";

// Local API instance matching the parent setup
const api = axios.create({
  baseURL: import.meta.env.VITE_URL || "http://localhost:3004/api/v1",
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("staffToken");
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
  
  // Layout states
  const [racks, setRacks] = useState<Rack[]>([]);
  const [loadingLayout, setLoadingLayout] = useState(false);
  
  // New layout entity forms
  const [newRackName, setNewRackName] = useState("");
  
  const [selectedRackForShelf, setSelectedRackForShelf] = useState("");
  const [newShelfName, setNewShelfName] = useState("");
  
  const [selectedRackForTray, setSelectedRackForTray] = useState("");
  const [selectedShelfForTray, setSelectedShelfForTray] = useState("");
  const [newTrayName, setNewTrayName] = useState("");
  
  // Mapping states
  const [products, setProducts] = useState<Product[]>([]);
  const [mappings, setMappings] = useState<ProductLocation[]>([]);
  const [loadingMapping, setLoadingMapping] = useState(false);
  const [searchProductQuery, setSearchProductQuery] = useState("");
  const [selectedProductKey, setSelectedProductKey] = useState("");
  const [selectedRackForMap, setSelectedRackForMap] = useState("");
  const [selectedShelfForMap, setSelectedShelfForMap] = useState("");
  const [selectedTrayForMap, setSelectedTrayForMap] = useState("");
  
  // Notification states
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
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
    setSuccessMsg(msg);
    setErrorMsg("");
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg("");
    setTimeout(() => setErrorMsg(""), 4000);
  };

  // ==========================================
  // API FETCH OPERATIONS
  // ==========================================

  const fetchLayout = async () => {
    setLoadingLayout(true);
    try {
      const res = await api.get("/partner/settings/layout");
      if (res.data && res.data.data) {
        setRacks(res.data.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch layout", err);
      showError(err.response?.data?.message || "Failed to load warehouse layout");
    } finally {
      setLoadingLayout(false);
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

  const handleCreateRack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRackName.trim()) return;
    setSubmitting(true);
    try {
      await api.post("/partner/settings/racks", { name: newRackName.trim() });
      showSuccess(`Rack "${newRackName}" created successfully!`);
      setNewRackName("");
      fetchLayout();
    } catch (err: any) {
      showError(err.response?.data?.message || "Failed to create rack");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateShelf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRackForShelf || !newShelfName.trim()) return;
    setSubmitting(true);
    try {
      await api.post("/partner/settings/shelves", { 
        rackId: selectedRackForShelf, 
        name: newShelfName.trim() 
      });
      showSuccess(`Shelf "${newShelfName}" created successfully!`);
      setNewShelfName("");
      fetchLayout();
    } catch (err: any) {
      showError(err.response?.data?.message || "Failed to create shelf");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTray = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShelfForTray || !newTrayName.trim()) return;
    setSubmitting(true);
    try {
      await api.post("/partner/settings/trays", { 
        shelfId: selectedShelfForTray, 
        name: newTrayName.trim() 
      });
      showSuccess(`Tray "${newTrayName}" created successfully!`);
      setNewTrayName("");
      fetchLayout();
    } catch (err: any) {
      showError(err.response?.data?.message || "Failed to create tray");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEntity = async (type: "rack" | "shelf" | "tray", id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${type} "${name}"? This will delete all containing elements and clear product mappings.`)) {
      return;
    }
    try {
      const endpoint = type === "rack" ? `/partner/settings/racks/${id}` : type === "shelf" ? `/partner/settings/shelves/${id}` : `/partner/settings/trays/${id}`;
      await api.delete(endpoint);
      showSuccess(`${type.toUpperCase()} "${name}" deleted.`);
      fetchLayout();
      fetchMappings(); // Refresh mappings in case some were deleted
    } catch (err: any) {
      showError(err.response?.data?.message || `Failed to delete ${type}`);
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

  // Helper arrays for cascading dropdowns
  const shelfOptionsForTray = racks.find(r => r.id === selectedRackForTray)?.shelves || [];
  


  return (
    <div className="w-full bg-[#F5F7FA] dark:bg-gray-900 min-h-screen">
      {/* Header section */}
      <div className="bg-white dark:bg-gray-800 px-6 py-5 border-b border-gray-200 dark:border-gray-700 shadow-sm rounded-2xl mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <MapPin className="text-[#00891D]" size={24} /> Warehouse Settings
        </h1>
        <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm mt-1">
          Configure store layout structure (Racks, Shelves, Trays) and assign products to their physical locations.
        </p>

        {/* Tab Buttons */}
        <div className="flex gap-4 mt-6 border-b border-gray-100 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("layout")}
            className={`pb-3 font-semibold text-sm transition-all border-b-2 px-1 ${
              activeTab === "layout"
                ? "border-[#00891D] text-[#00891D]"
                : "border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:text-gray-500"
            }`}
          >
            Store Layout Configuration
          </button>
          <button
            onClick={() => setActiveTab("mapping")}
            className={`pb-3 font-semibold text-sm transition-all border-b-2 px-1 ${
              activeTab === "mapping"
                ? "border-[#00891D] text-[#00891D]"
                : "border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:text-gray-500"
            }`}
          >
            Product Location Mapping
          </button>
        </div>
      </div>

      {/* Success/Error Alerts */}
      <div className="max-w-4xl mx-auto px-2">
        {successMsg && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 text-green-700 text-sm shadow-sm animate-fadeIn">
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700 text-sm shadow-sm animate-fadeIn">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Tab Contents */}
      <div className="max-w-4xl mx-auto px-2 pb-16">
        
        {/* ======================================================== */}
        {/* TAB 1: STORE LAYOUT                                      */}
        {/* ======================================================== */}
        {activeTab === "layout" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Create Forms (Left column) */}
            <div className="md:col-span-1 flex flex-col gap-6">
              
              {/* Rack form */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm flex items-center gap-2 mb-3">
                  <FolderPlus size={16} className="text-[#00891D]" /> Create New Rack
                </h3>
                <form onSubmit={handleCreateRack} className="flex flex-col gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Rack Name (e.g. Rack A)"
                    value={newRackName}
                    onChange={(e) => setNewRackName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00891D]"
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#00891D] hover:bg-[#006614] disabled:bg-gray-300 text-white font-semibold text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    {submitting ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    Create Rack
                  </button>
                </form>
              </div>

              {/* Shelf form */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm flex items-center gap-2 mb-3">
                  <Layers size={16} className="text-[#00891D]" /> Create New Shelf
                </h3>
                <form onSubmit={handleCreateShelf} className="flex flex-col gap-3">
                  <CustomSelect
                    label="1. Select Rack"
                    value={selectedRackForShelf}
                    onChange={setSelectedRackForShelf}
                    options={racks.map(r => ({ id: r.id, name: r.name }))}
                    placeholder="-- Choose Rack --"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Shelf Name (e.g. Shelf 1)"
                    value={newShelfName}
                    onChange={(e) => setNewShelfName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00891D]"
                  />
                  <button
                    type="submit"
                    disabled={submitting || !selectedRackForShelf}
                    className="w-full bg-[#00891D] hover:bg-[#006614] disabled:bg-gray-300 text-white font-semibold text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    {submitting ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    Create Shelf
                  </button>
                </form>
              </div>

              {/* Tray form */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm flex items-center gap-2 mb-3">
                  <Inbox size={16} className="text-[#00891D]" /> Create New Tray
                </h3>
                <form onSubmit={handleCreateTray} className="flex flex-col gap-3">
                  <CustomSelect
                    label="1. Select Rack"
                    value={selectedRackForTray}
                    onChange={(val) => {
                      setSelectedRackForTray(val);
                      setSelectedShelfForTray("");
                    }}
                    options={racks.map(r => ({ id: r.id, name: r.name }))}
                    placeholder="-- Choose Rack --"
                  />
                  <CustomSelect
                    label="2. Select Shelf"
                    disabled={!selectedRackForTray}
                    value={selectedShelfForTray}
                    onChange={setSelectedShelfForTray}
                    options={shelfOptionsForTray.map(s => ({ id: s.id, name: s.name }))}
                    placeholder="-- Choose Shelf --"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Tray Name (e.g. Tray X)"
                    value={newTrayName}
                    onChange={(e) => setNewTrayName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00891D]"
                  />
                  <button
                    type="submit"
                    disabled={submitting || !selectedShelfForTray}
                    className="w-full bg-[#00891D] hover:bg-[#006614] disabled:bg-gray-300 text-white font-semibold text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    {submitting ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    Create Tray
                  </button>
                </form>
              </div>

            </div>

            {/* Layout Tree list (Right 2 columns) */}
            <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-800 dark:text-gray-200 text-base mb-4 flex items-center gap-2">
                🏠 Store Layout Hierarchy
              </h3>

              {loadingLayout ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500 gap-2">
                  <Loader2 className="animate-spin text-[#00891D]" size={32} />
                  <p className="text-xs">Loading layout tree...</p>
                </div>
              ) : racks.length === 0 ? (
                <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                  <p className="text-sm">No racks or layout elements found.</p>
                  <p className="text-xs mt-1">Use the forms on the left to start building your layout.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {racks.map(rack => (
                    <div key={rack.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-700/50/50">
                      <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                        <span className="font-bold text-gray-800 dark:text-gray-200 text-sm flex items-center gap-1.5">
                          📂 {rack.name}
                        </span>
                        <button
                          onClick={() => handleDeleteEntity("rack", rack.id, rack.name)}
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {rack.shelves.length === 0 ? (
                        <p className="text-gray-400 dark:text-gray-500 text-[11px] italic ml-6">No shelves under this rack.</p>
                      ) : (
                        <div className="flex flex-col gap-3 ml-4 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
                          {rack.shelves.map(shelf => (
                            <div key={shelf.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700 shadow-2xs">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-semibold text-gray-700 dark:text-gray-300 text-xs flex items-center gap-1">
                                  🥞 {shelf.name}
                                </span>
                                <button
                                  onClick={() => handleDeleteEntity("shelf", shelf.id, shelf.name)}
                                  className="text-red-400 hover:text-red-600 p-0.5 rounded hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>

                              {shelf.trays.length === 0 ? (
                                <p className="text-gray-400 dark:text-gray-500 text-[10px] italic ml-5">No trays on this shelf.</p>
                              ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 ml-4">
                                  {shelf.trays.map(tray => (
                                    <div 
                                      key={tray.id} 
                                      className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 rounded-md px-2.5 py-1 text-[11px] text-gray-600 dark:text-gray-400 dark:text-gray-500 font-medium"
                                    >
                                      <span>📥 {tray.name}</span>
                                      <button
                                        onClick={() => handleDeleteEntity("tray", tray.id, tray.name)}
                                        className="text-red-400 hover:text-red-600 ml-1"
                                      >
                                        <Trash2 size={10} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
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

      </div>
    </div>
  );
}
