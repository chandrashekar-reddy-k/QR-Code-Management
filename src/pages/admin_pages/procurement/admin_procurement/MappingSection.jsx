import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Link2, CheckCircle2, ChevronRight, ChevronDown, Package, Loader2,
  Star, Clock, ShieldCheck, Tag, Info, AlertCircle, Sparkles,
  ToggleLeft, ToggleRight, X, ArrowLeft, ArrowUpRight, DollarSign, Calendar,
  CheckSquare, Square
} from 'lucide-react';
import { procurementAPI } from '../../vsms/services/procurementService';
import { adminAPI } from '../../vsms/services/adminService';
import toast from 'react-hot-toast';

const ProductThumbnail = ({ p, isMapped }) => {
  const [hasError, setHasError] = useState(false);
  const prodImg = p.image || p.imageUrl || (Array.isArray(p.images) ? p.images[0] : (typeof p.images === 'string' ? p.images : null)) || p.thumbnail || p.photo;

  return (
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 overflow-hidden ${
      isMapped ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20' : 'bg-gray-100 text-gray-400'
    }`}>
      {prodImg && !hasError ? (
        <img 
          src={prodImg} 
          alt={p.name} 
          className="w-full h-full object-cover rounded-xl"
          onError={() => setHasError(true)}
        />
      ) : (
        <Package size={16} />
      )}
    </div>
  );
};

const getCategoryName = (p) => {
  if (!p) return 'General / Uncategorized';
  if (typeof p.category === 'string' && p.category.trim() !== '') return p.category.trim();
  if (p.category?.name && typeof p.category.name === 'string' && p.category.name.trim() !== '') return p.category.name.trim();
  if (p.categoryName && typeof p.categoryName === 'string' && p.categoryName.trim() !== '') return p.categoryName.trim();
  return 'General / Uncategorized';
};

const getProductUom = (p) => {
  return 'PACK';
};

const MappingSection = ({ can, setHideMainHeader, storeId }) => {
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [products, setProducts] = useState([]);
  
  // mappedItems maps productId -> mapping data object
  const [mappedItems, setMappedItems] = useState({});
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vSearch, setVSearch] = useState('');
  const [pSearch, setPSearch] = useState('');
  
  // State to manage showing price history modal
  const [historyModal, setHistoryModal] = useState(null);

  useEffect(() => {
    if (setHideMainHeader) {
      setHideMainHeader(!!selectedVendor);
    }
    return () => {
      if (setHideMainHeader) setHideMainHeader(false);
    };
  }, [selectedVendor, setHideMainHeader]);

  useEffect(() => {
    const load = async () => {
      try {
        const [v, p] = await Promise.all([
          procurementAPI.getVendors({ limit: 100, storeId: storeId || undefined }),
          adminAPI.getItems({ storeId: storeId || undefined })
        ]);
        setVendors(v.data?.data || v.data || []);
        
        const rawProducts = p.data?.data || p.data || [];
        const flattenedProducts = [];
        (Array.isArray(rawProducts) ? rawProducts : []).forEach(prod => {
          // Add the base product
          flattenedProducts.push(prod);
          // If the product has variants, add each active variant as its own discrete product item
          if (Array.isArray(prod.variants) && prod.variants.length > 0) {
            prod.variants
              .filter(variant => {
                if (!variant) return false;
                const status = String(variant.status || '').toUpperCase();
                if (status === 'INACTIVE' || status === 'DISABLED') return false;
                if (variant.isEnabled === false || variant.isActive === false) return false;
                return true;
              })
              .forEach(variant => {
                flattenedProducts.push({
                  ...prod,
                  id: variant.id || `${prod.id}_${variant.variantName}`,
                  productId: variant.productId || prod.id,
                  parentProductId: prod.id,
                  name: prod.name,
                  variantName: variant.variantName || variant.name || '',
                  isVariantItem: true,
                  price: variant.sellingPrice ?? variant.price ?? prod.price,
                  purchasePrice: variant.purchasePrice ?? variant.costPrice ?? variant.landingPrice ?? prod.purchasePrice ?? prod.price,
                  skuCode: variant.sku || variant.skuCode || prod.skuCode,
                  barcode: variant.barcode || prod.barcode,
                  unit: variant.unit || variant.unitType || prod.unit,
                  unitValue: variant.measurement || variant.unitValue || prod.unitValue,
                  measurement: variant.measurement || prod.measurement,
                  variants: [] // prevent recursive expansion
                });
              });
          }
        });
        setProducts(flattenedProducts);
      } catch { 
        toast.error('Failed to load initial data'); 
      } finally { 
        setLoading(false); 
      }
    };
    load();
  }, [storeId]);

  const selectVendor = async (v) => {
    setSelectedVendor(v);
    try {
      const { data } = await procurementAPI.getVendorMappings(v.id);
      
      const mappingDict = {};
      const mappingArray = data?.data || data || [];
      mappingArray.forEach(m => {
        const prod = products.find(p => p.id === m.productId || p.productId === m.productId);
        if (prod) {
          mappingDict[prod.id] = {
            productId: prod.id,
            vendorSku: m.vendorSku || prod.skuCode || prod.sku || '',
            uom: m.uom || 'PACK',
            purchasePrice: String(m.purchasePrice || 0),
            mrp: String(m.mrp ?? prod.mrp ?? 0),
            landingPrice: String(m.landingPrice ?? prod.landingPrice ?? prod.purchasePrice ?? 0),
            quantity: String(m.quantity ?? 1),
            moq: String(m.moq || 1),
            leadTime: String(m.leadTime || 0),
            taxPercent: String(m.taxPercent || 0),
            lastPurchaseRate: String(m.lastPurchaseRate || 0),
            isPreferred: m.isPreferred || false,
            priceHistory: m.priceHistory || []
          };
        } else {
          mappingDict[m.productId] = {
            productId: m.productId,
            vendorSku: m.vendorSku || '',
            uom: m.uom || 'PACK',
            purchasePrice: String(m.purchasePrice || 0),
            mrp: String(m.mrp || 0),
            landingPrice: String(m.landingPrice || 0),
            quantity: String(m.quantity || 1),
            moq: String(m.moq || 1),
            leadTime: String(m.leadTime || 0),
            taxPercent: String(m.taxPercent || 0),
            lastPurchaseRate: String(m.lastPurchaseRate || 0),
            isPreferred: m.isPreferred || false,
            priceHistory: m.priceHistory || []
          };
        }
      });
      setMappedItems(mappingDict);
    } catch { 
      toast.error('Failed to load existing mappings'); 
    }
  };

  const toggleProduct = (productId, standardPrice = 0) => {
    const p = products.find(item => item.id === productId);
    setMappedItems(prev => {
      const next = { ...prev };
      if (next[productId]) {
        delete next[productId];
      } else {
        next[productId] = {
          productId,
          vendorSku: p?.skuCode || p?.sku || '',
          uom: getProductUom(p),
          purchasePrice: String(standardPrice),
          mrp: String(p?.mrp || 0),
          landingPrice: String(p?.landingPrice || standardPrice || p?.purchasePrice || p?.price || 0),
          quantity: '1',
          moq: '1',
          leadTime: '3',
          taxPercent: '0',
          lastPurchaseRate: '0',
          isPreferred: false,
          priceHistory: []
        };
      }
      return next;
    });
  };

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(pSearch.toLowerCase()) || 
    p.variantName?.toLowerCase().includes(pSearch.toLowerCase()) ||
    p.skuCode?.toLowerCase().includes(pSearch.toLowerCase())
  );

  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  const toggleCategoryCollapse = (catName) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [catName]: !prev[catName]
    }));
  };

  const allCategories = useMemo(() => {
    const cats = new Set();
    products.forEach(p => cats.add(getCategoryName(p)));
    return Array.from(cats).sort();
  }, [products]);

  const groupedProducts = useMemo(() => {
    const groups = {};
    filteredProducts.forEach(p => {
      const catName = getCategoryName(p);
      if (!groups[catName]) {
        groups[catName] = [];
      }
      groups[catName].push(p);
    });

    Object.keys(groups).forEach(cat => {
      groups[cat].sort((a, b) => {
        const isAMapped = !!mappedItems[a.id];
        const isBMapped = !!mappedItems[b.id];
        if (isAMapped && !isBMapped) return -1;
        if (!isAMapped && isBMapped) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });
    });

    return groups;
  }, [filteredProducts, mappedItems]);

  const handleToggleCategorySelectAll = (categoryProducts) => {
    const areAllCatSelected = categoryProducts.length > 0 && categoryProducts.every(p => !!mappedItems[p.id]);
    setMappedItems(prev => {
      const next = { ...prev };
      if (areAllCatSelected) {
        categoryProducts.forEach(p => {
          delete next[p.id];
        });
      } else {
        categoryProducts.forEach(p => {
          if (!next[p.id]) {
            next[p.id] = {
              productId: p.id,
              vendorSku: p.skuCode || p.sku || '',
              uom: getProductUom(p),
              purchasePrice: String(p.purchasePrice || p.price || 0),
              mrp: String(p.mrp || 0),
              landingPrice: String(p.landingPrice || p.purchasePrice || p.price || 0),
              quantity: '1',
              moq: '1',
              leadTime: '3',
              taxPercent: '0',
              lastPurchaseRate: '0',
              isPreferred: false,
              priceHistory: []
            };
          }
        });
      }
      return next;
    });
  };

  const areAllFilteredSelected = filteredProducts.length > 0 && filteredProducts.every(p => !!mappedItems[p.id]);

  const handleToggleSelectAll = () => {
    setMappedItems(prev => {
      const next = { ...prev };
      if (areAllFilteredSelected) {
        filteredProducts.forEach(p => {
          delete next[p.id];
        });
      } else {
        filteredProducts.forEach(p => {
          if (!next[p.id]) {
            next[p.id] = {
              productId: p.id,
              vendorSku: p.skuCode || p.sku || '',
              uom: getProductUom(p),
              purchasePrice: String(p.purchasePrice || p.price || 0),
              mrp: String(p.mrp || 0),
              landingPrice: String(p.landingPrice || p.purchasePrice || p.price || 0),
              quantity: '1',
              moq: '1',
              leadTime: '3',
              taxPercent: '0',
              lastPurchaseRate: '0',
              isPreferred: false,
              priceHistory: []
            };
          }
        });
      }
      return next;
    });
  };

  const handleFieldChange = (productId, field, value) => {
    setMappedItems(prev => {
      if (!prev[productId]) return prev;
      return {
        ...prev,
        [productId]: {
          ...prev[productId],
          [field]: value
        }
      };
    });
  };

  const handleTogglePreferred = (productId) => {
    setMappedItems(prev => {
      if (!prev[productId]) return prev;
      return {
        ...prev,
        [productId]: {
          ...prev[productId],
          isPreferred: !prev[productId].isPreferred
        }
      };
    });
  };

  const saveMappings = async () => {
    if (!selectedVendor) return;

    // Client-side validations
    const payload = Object.values(mappedItems).map(item => ({
      productId: item.productId,
      vendorSku: item.vendorSku ? item.vendorSku.trim() : null,
      uom: item.uom ? item.uom.trim() : null,
      purchasePrice: parseFloat(item.purchasePrice) || 0,
      mrp: parseFloat(item.mrp) || 0,
      landingPrice: parseFloat(item.landingPrice) || 0,
      quantity: parseInt(item.quantity) || 1,
      moq: parseInt(item.moq) || 1,
      leadTime: parseFloat(item.leadTime) || 0,
      taxPercent: parseFloat(item.taxPercent) || 0,
      isPreferred: !!item.isPreferred
    }));

    // Verify validity
    for (const item of payload) {
      if (item.purchasePrice < 0) {
        toast.error('Purchase Price cannot be negative.');
        return;
      }
      if (item.mrp < 0) {
        toast.error('MRP cannot be negative.');
        return;
      }
      if (item.landingPrice < 0) {
        toast.error('Landing Price cannot be negative.');
        return;
      }
    }

    setSaving(true);
    try {
      await procurementAPI.updateVendorMappings(selectedVendor.id, { mappings: payload });
      toast.success('Supplier mappings updated successfully');
      
      // Reload mappings to get generated IDs and histories
      selectVendor(selectedVendor);
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Failed to save mappings'); 
    } finally { 
      setSaving(false); 
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 text-gray-400 gap-3">
      <Loader2 className="animate-spin text-emerald-600" size={40} />
      <span className="text-[10px] font-black uppercase tracking-widest">Loading catalog...</span>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {!selectedVendor ? (
        <div className="flex-1 flex flex-col min-h-0 space-y-4 animate-in slide-in-from-left duration-300">
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col flex-1">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Procurement Management</h4>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Vendor Item Mapping</h2>
              </div>
              <div className="relative group w-full sm:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Search vendor..." 
                  className="w-full bg-white border border-gray-100 rounded-2xl pl-12 pr-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-inner"
                  value={vSearch}
                  onChange={e => setVSearch(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
                {(Array.isArray(vendors) ? vendors : []).filter(v => 
                  v.vendorName?.toLowerCase().includes(vSearch.toLowerCase()) || 
                  v.mobile?.includes(vSearch)
                ).map(v => (
                  <button 
                    key={v.id} 
                    onClick={() => selectVendor(v)}
                    className="group bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-100 hover:scale-[1.01] active:scale-[0.99] transition-all text-left flex items-center justify-between w-full"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shrink-0">
                        <Link2 size={22} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-black text-gray-950 tracking-tight truncate group-hover:text-emerald-600 transition-colors">{v.vendorName}</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{v.mobile}</span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-gray-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 animate-in slide-in-from-right duration-300">
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm flex flex-col flex-1 relative" style={{minHeight: 0}}>
            
            {/* Header */}
            <div className="p-5 border-b border-gray-50 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedVendor(null)}
                  className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm active:scale-95"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="flex flex-col">
                  <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                    Vendor Item Mapping
                  </h4>
                  <h2 className="text-lg font-black text-gray-900 tracking-tight">{selectedVendor.vendorName}</h2>
                </div>
              </div>
              
              <div className="flex items-center gap-3 flex-wrap">
                {/* Select / Deselect All Button */}
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all shadow-sm active:scale-95 border ${
                    areAllFilteredSelected
                      ? 'bg-rose-50 text-rose-700 border-rose-200/80 hover:bg-rose-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100'
                  }`}
                >
                  {areAllFilteredSelected ? (
                    <>
                      <Square size={13} className="text-rose-600" />
                      <span>Deselect All</span>
                    </>
                  ) : (
                    <>
                      <CheckSquare size={13} className="text-emerald-600" />
                      <span>Select All</span>
                    </>
                  )}
                </button>

                {/* Category Filter Dropdown */}
                {allCategories.length > 0 && (
                  <div className="relative">
                    <select
                      value={selectedCategoryFilter}
                      onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                      className="bg-white border border-gray-200 text-gray-700 text-[11px] font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm cursor-pointer"
                    >
                      <option value="ALL">All Categories ({allCategories.length})</option>
                      {allCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Stats indicators */}
                <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 border border-emerald-100/50 px-3 py-1.5 rounded-xl">
                  <Sparkles size={12} className="text-emerald-600" />
                  <span className="text-[9px] font-black text-emerald-800 uppercase tracking-wider">
                    {Object.keys(mappedItems).length} Mapped Products
                  </span>
                </div>
                
                <div className="relative group w-56">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={12} />
                  <input 
                    type="text" 
                    placeholder="Filter products..." 
                    className="w-full bg-white border border-gray-100 rounded-xl pl-9 pr-4 py-1.5 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-inner"
                    value={pSearch}
                    onChange={e => setPSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Product List Grouped By Category */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-50/40 pb-28">
              <div className="flex flex-col gap-5 w-full max-w-6xl mx-auto">
                {Object.keys(groupedProducts).length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                    <Package className="mx-auto text-gray-300 mb-2" size={32} />
                    <p className="text-xs font-bold text-gray-500">No products found matching your search</p>
                  </div>
                ) : (
                  Object.entries(groupedProducts)
                    .filter(([catName]) => selectedCategoryFilter === 'ALL' || selectedCategoryFilter === catName)
                    .map(([catName, categoryProducts]) => {
                      const isCollapsed = !!collapsedCategories[catName];
                      const mappedCatCount = categoryProducts.filter(p => !!mappedItems[p.id]).length;
                      const isAllCatSelected = categoryProducts.length > 0 && mappedCatCount === categoryProducts.length;

                      return (
                        <div key={catName} className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden transition-all">
                          {/* Category Header Bar */}
                          <div 
                            className="px-5 py-3 bg-gradient-to-r from-emerald-50/70 via-slate-50/40 to-white border-b border-gray-100 flex items-center justify-between cursor-pointer select-none"
                            onClick={() => toggleCategoryCollapse(catName)}
                          >
                            <div className="flex items-center gap-3">
                              <button 
                                type="button" 
                                className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-100/50 transition-colors"
                              >
                                {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                              </button>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">{catName}</h3>
                              </div>
                              <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100/80 border border-emerald-200/60 px-2.5 py-0.5 rounded-full">
                                {mappedCatCount} / {categoryProducts.length} Mapped
                              </span>
                            </div>

                            <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleToggleCategorySelectAll(categoryProducts)}
                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-black transition-all border shadow-2xs ${
                                  isAllCatSelected
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                    : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                                }`}
                              >
                                {isAllCatSelected ? 'Deselect Category' : 'Select Category'}
                              </button>
                            </div>
                          </div>

                          {/* Category Items */}
                          {!isCollapsed && (
                            <div className="p-4 flex flex-col gap-3 bg-slate-50/30">
                              {categoryProducts.map((p, pIdx) => {
                                const isMapped = !!mappedItems[p.id];
                                const itemData = mappedItems[p.id];

                                return (
                                  <div 
                                    key={p.id ? `${p.id}_${p.variantName || pIdx}` : pIdx}
                                    className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                                      isMapped 
                                        ? 'bg-white border-emerald-300 shadow-sm ring-1 ring-emerald-500/10' 
                                        : 'bg-white border-gray-200/80 hover:border-gray-300'
                                    }`}
                                  >
                                    {/* Main row click to toggle mapping */}
                                    <div 
                                      onClick={() => toggleProduct(p.id, p.purchasePrice || p.price)}
                                      className={`flex items-center justify-between p-4 cursor-pointer select-none transition-all ${
                                        isMapped ? 'bg-slate-50/80 border-b border-slate-100' : 'hover:bg-slate-50/20'
                                      }`}
                                    >
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <ProductThumbnail p={p} isMapped={isMapped} />
                                        
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-black text-gray-900 tracking-tight">{p.name}</span>
                                            {p.variantName && (
                                              <span className="bg-purple-50 text-purple-700 border border-purple-200/60 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                                                Variant: {p.variantName}
                                              </span>
                                            )}
                                            {isMapped && itemData.isPreferred && (
                                              <span className="inline-flex items-center gap-0.5 bg-amber-50 border border-amber-200/50 px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-amber-600 tracking-wide">
                                                <Star size={8} fill="currentColor" /> Preferred Supplier
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                            {(() => {
                                              const unitStr = typeof p.unit === 'object' ? (p.unit?.type || p.unit?.name || '') : (p.unit || '');
                                              const cleanUnit = unitStr.includes('-') && unitStr.length > 20 ? '' : unitStr;
                                              const measurement = p.unitValue || p.measurement || (typeof p.weight === 'number' && p.weight > 0 ? p.weight : '');
                                              const label = [measurement, cleanUnit].filter(Boolean).join(' ');
                                              if (!label) return null;
                                              return (
                                                <span className="text-[9px] text-slate-700 font-extrabold bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/60">
                                                  {label}
                                                </span>
                                              );
                                            })()}
                                            {p.variants && p.variants.length > 0 && (
                                              <div className="flex items-center gap-1">
                                                <span className="text-[8px] font-black uppercase text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">
                                                  {p.variants.length} Variants Available:
                                                </span>
                                                {p.variants.map((v, vIdx) => {
                                                  const vUnitStr = typeof v.unit === 'object' ? (v.unit?.type || v.unit?.name || '') : (v.unit || '');
                                                  const cleanVUnit = vUnitStr.includes('-') && vUnitStr.length > 20 ? '' : vUnitStr;
                                                  const vMeasurement = v.measurement || v.unitValue || '';
                                                  const vVal = [vMeasurement, cleanVUnit].filter(Boolean).join(' ');
                                                  return (
                                                    <span key={v.id || vIdx} className="text-[8px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-1 py-0.5 rounded">
                                                      {v.variantName || v.name}{vVal ? ` - ${vVal}` : ''} (₹{v.price || v.sellingPrice || 0})
                                                    </span>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-4 shrink-0">
                                        <div className="flex flex-col items-end">
                                          <span className="text-[9px] font-black uppercase tracking-wider text-gray-400">Standard Price</span>
                                          <span className="text-xs font-black text-slate-800">₹{p.purchasePrice || p.price}</span>
                                        </div>
                                        
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                          isMapped ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-200'
                                        }`}>
                                          {isMapped && <CheckCircle2 size={12} strokeWidth={3} />}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Detail inputs expanded if mapped */}
                                    {isMapped && (
                                      <div className="p-4 bg-white grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 animate-in slide-in-from-top-2 duration-300">
                                        {/* Product SKU */}
                                        <div className="space-y-1">
                                          <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Product SKU</label>
                                          <input 
                                            type="text" 
                                            value={(itemData.vendorSku && itemData.vendorSku !== 'NO-SKU') ? itemData.vendorSku : ((p.skuCode && p.skuCode !== 'NO-SKU') ? p.skuCode : ((p.sku && p.sku !== 'NO-SKU') ? p.sku : '-'))} 
                                            readOnly
                                            disabled
                                            className="w-full bg-slate-100/70 text-slate-600 rounded-xl px-3 py-1.5 text-xs font-bold border border-slate-100 cursor-not-allowed select-none"
                                          />
                                        </div>

                                        {/* Quantity */}
                                        <div className="space-y-1">
                                          <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Quantity</label>
                                          <input 
                                            type="number" 
                                            value={itemData.quantity ?? ''} 
                                            onChange={e => handleFieldChange(p.id, 'quantity', e.target.value)}
                                            className="w-full bg-slate-50/50 rounded-xl px-3 py-1.5 text-xs font-bold border border-slate-100 focus:bg-white focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all"
                                            placeholder="1"
                                          />
                                        </div>

                                        {/* UOM */}
                                        <div className="space-y-1">
                                          <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">UOM</label>
                                          <input 
                                            type="text" 
                                            value={itemData.uom ?? 'PACK'} 
                                            onChange={e => handleFieldChange(p.id, 'uom', e.target.value)}
                                            className="w-full bg-slate-50/50 rounded-xl px-3 py-1.5 text-xs font-bold border border-slate-100 focus:bg-white focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all uppercase"
                                            placeholder="e.g. KG, PACK"
                                          />
                                        </div>

                                        {/* MRP */}
                                        <div className="space-y-1">
                                          <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">MRP (₹)</label>
                                          <div className="relative">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-bold">₹</span>
                                            <input 
                                              type="number" 
                                              value={itemData.mrp ?? ''} 
                                              onChange={e => handleFieldChange(p.id, 'mrp', e.target.value)}
                                              className="w-full bg-slate-50/50 rounded-xl pl-6 pr-2 py-1.5 text-xs font-bold border border-slate-100 focus:bg-white focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all"
                                              placeholder="0.00"
                                            />
                                          </div>
                                        </div>

                                        {/* Landing Price */}
                                        <div className="space-y-1">
                                          <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Landing Price (₹)</label>
                                          <div className="relative">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-bold">₹</span>
                                            <input 
                                              type="number" 
                                              value={itemData.landingPrice ?? ''} 
                                              onChange={e => handleFieldChange(p.id, 'landingPrice', e.target.value)}
                                              className="w-full bg-slate-50/50 rounded-xl pl-6 pr-2 py-1.5 text-xs font-bold border border-slate-100 focus:bg-white focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all"
                                              placeholder="0.00"
                                            />
                                          </div>
                                        </div>

                                        {/* Selling Price */}
                                        <div className="space-y-1">
                                          <div className="flex justify-between items-center">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Selling Price (₹)</label>
                                            {itemData.priceHistory?.length > 0 && (
                                              <button 
                                                type="button" 
                                                onClick={() => setHistoryModal(itemData)}
                                                className="text-emerald-600 hover:text-emerald-700 transition-colors"
                                                title="View Rate History Logs"
                                              >
                                                <Clock size={10} strokeWidth={3} />
                                              </button>
                                            )}
                                          </div>
                                          <div className="relative">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-bold">₹</span>
                                            <input 
                                              type="number" 
                                              value={itemData.purchasePrice} 
                                              onChange={e => handleFieldChange(p.id, 'purchasePrice', e.target.value)}
                                              className="w-full bg-slate-50/50 rounded-xl pl-6 pr-2 py-1.5 text-xs font-bold border border-slate-100 focus:bg-white focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all"
                                              placeholder="0.00"
                                            />
                                          </div>
                                        </div>

                                        {/* Preferred Vendor Switch */}
                                        <div className="space-y-1 flex flex-col justify-end pb-1 items-start md:items-center">
                                          <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 select-none cursor-pointer" onClick={() => handleTogglePreferred(p.id)}>
                                            Preferred Supplier
                                          </label>
                                          <button
                                            type="button"
                                            onClick={() => handleTogglePreferred(p.id)}
                                            className="focus:outline-none transition-all active:scale-95 mt-1"
                                          >
                                            {itemData.isPreferred ? (
                                              <ToggleRight size={26} className="text-amber-500 cursor-pointer" />
                                            ) : (
                                              <ToggleLeft size={26} className="text-gray-300 cursor-pointer" />
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* Save Button — always visible when editing a vendor's mappings */}
            <div className="shrink-0 px-6 py-4 bg-gradient-to-t from-white via-white to-transparent border-t border-gray-50 flex justify-center">
              <button 
                onClick={saveMappings} 
                disabled={saving}
                className="flex items-center gap-3 bg-emerald-600 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_20px_50px_rgba(5,150,105,0.25)] hover:bg-emerald-700 hover:-translate-y-1 transition-all active:translate-y-0 disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {saving ? 'Saving...' : 'Save Mapping Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historical Purchase Rate Logs Modal */}
      {historyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setHistoryModal(null)}>
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-50 pb-3">
              <div>
                <h3 className="text-sm font-black text-gray-950 uppercase tracking-tight">Price History Log</h3>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Historical Purchase Rate Tracking</p>
              </div>
              <button onClick={() => setHistoryModal(null)} className="p-1 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-rose-500 transition-all"><X size={18} /></button>
            </div>

            <div className="space-y-4 py-2">
              {historyModal.priceHistory?.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <Clock size={28} className="mx-auto text-gray-200" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No price history logged yet</p>
                </div>
              ) : (
                <div className="relative border-l border-emerald-100 pl-5 ml-2.5 space-y-5">
                  {historyModal.priceHistory.map((log, idx) => (
                    <div key={log.id} className="relative group">
                      {/* Timeline dot */}
                      <span className="absolute -left-[27px] top-1 w-3 h-3 rounded-full border-2 border-emerald-500 bg-white group-hover:scale-125 transition-transform" />
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-gray-950 uppercase tracking-wide">
                            Price Changed
                          </span>
                          <span className="text-[8px] font-bold text-gray-400 flex items-center gap-1">
                            <Calendar size={10} /> {new Date(log.changedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        
                        <div className="bg-slate-50 border border-slate-100/50 p-2.5 rounded-xl flex items-center justify-between text-xs font-bold">
                          <div className="flex flex-col">
                            <span className="text-[7.5px] font-black text-gray-400 uppercase tracking-wider">Before</span>
                            <span className="text-gray-500 line-through">₹{log.oldPrice}</span>
                          </div>
                          <ChevronRight size={14} className="text-gray-300" />
                          <div className="flex flex-col items-end">
                            <span className="text-[7.5px] font-black text-emerald-600 uppercase tracking-wider">New Rate</span>
                            <span className="text-emerald-700 font-black">₹{log.newPrice}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MappingSection;
