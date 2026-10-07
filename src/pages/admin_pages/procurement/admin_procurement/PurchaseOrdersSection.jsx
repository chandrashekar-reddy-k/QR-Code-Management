import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Plus, Search, Loader2, ClipboardList, X, ArrowLeft, Edit3, Trash2, CheckCircle2,
  Truck, PackageCheck, FileText, Check, Eye, Download, Upload, Paperclip, Users, TrendingUp,
  Sparkles, RefreshCw, Barcode, Camera, Image as ImageIcon, CheckSquare, Square
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useGetProductCategoriesList, useGetProductUnitTypesList, useGetUnitsMapForUnitTypes } from '../../../../hooks/product';
import fetchData from '../../../../helper';
import { uploadImageFile } from '../../../../lib/uploadImage';
import BarcodeScannerOverlay from '../../../../components/BarcodeScannerOverlay';
import { procurementAPI } from '../../vsms/services/procurementService';
import { adminAPI } from '../../vsms/services/adminService';
import { productsAPI, API_URL } from '../../vsms/services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import AddProduct from '../../products/AddProducts';

const generateAutoSku = (name = '', unit = 'KG', category = '') => {
  const nameStr = typeof name === 'string' ? name : (name ? String(name) : '');
  const catStr = typeof category === 'string' ? category : (category ? String(category) : '');
  const unitStr = typeof unit === 'string' ? unit : (unit ? String(unit) : '');

  const letters = (nameStr || catStr || 'ITEM').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'ITEM';
  const cleanUnit = (unitStr || 'KG').replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'KG';
  const randNum = Math.floor(100 + Math.random() * 900);
  return `VK-${letters}-${cleanUnit}-${randNum}`;
};

const CATEGORY_HSN_MAP = {
  'veg': '0709',
  'fruit': '0804',
  'dairy': '0401',
  'milk': '0401',
  'grain': '1006',
  'rice': '1006',
  'cereal': '1006',
  'pulse': '0713',
  'dal': '0713',
  'spice': '0910',
  'oil': '1512',
  'flour': '1101',
  'atta': '1101',
  'bakery': '1905',
  'snack': '1905',
  'beverage': '2202',
  'tea': '0902',
  'coffee': '0901',
  'sweet': '1704',
  'sugar': '1701',
  'salt': '2501',
  'meat': '0201',
  'poultry': '0207',
  'egg': '0407',
  'clean': '3402',
  'soap': '3401',
  'personal': '3304',
  'pack': '4819'
};

const generateAutoHsn = (category = '', name = '') => {
  const cat = (category || '').toLowerCase();
  const nm = (name || '').toLowerCase();
  for (const [key, code] of Object.entries(CATEGORY_HSN_MAP)) {
    if (cat.includes(key) || nm.includes(key)) {
      return code;
    }
  }
  return '2106';
};

const containsUnicode = (str) => /[^\x00-\x7F]/.test(str);

const getTextWidth = (pdf, text, fontSize) => {
  if (!containsUnicode(text)) {
    pdf.setFontSize(fontSize);
    return pdf.getTextWidth(text);
  }
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `${fontSize}px "Segoe UI", "Noto Sans Telugu", "Gidugu", Arial, sans-serif`;
  return ctx.measureText(text).width * 0.264583;
};

const drawUnicodeText = (pdf, text, x, y, options = {}) => {
  const fontSize = options.fontSize || 9;
  const isBold = options.isBold || false;
  const align = options.align || 'left';
  const color = options.color || [30, 41, 59]; // default color in PO

  if (!containsUnicode(text)) {
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    pdf.setFontSize(fontSize);
    pdf.setTextColor(...color);
    pdf.text(text, x, y, { align: align === 'right' ? 'right' : 'left' });
    return;
  }

  // Draw Unicode text to canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Set scale for high resolution rendering
  const scale = 4;
  const canvasFontSize = fontSize * scale;
  ctx.font = `${isBold ? 'bold' : 'normal'} ${canvasFontSize}px "Segoe UI", "Noto Sans Telugu", "Gidugu", "Helvetica Neue", Arial, sans-serif`;

  // Measure text
  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width;
  const textHeight = canvasFontSize * 1.25;

  canvas.width = textWidth + 10;
  canvas.height = textHeight + 10;

  // Re-apply style
  ctx.font = `${isBold ? 'bold' : 'normal'} ${canvasFontSize}px "Segoe UI", "Noto Sans Telugu", "Gidugu", "Helvetica Neue", Arial, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = `rgb(${color.join(',')})`;
  ctx.fillText(text, 5, canvas.height / 2);

  const imgData = canvas.toDataURL('image/png');

  // Convert canvas size to PDF mm dimensions
  const heightInMm = fontSize * 0.352778 * 1.25;
  const widthInMm = (textWidth / canvasFontSize) * fontSize * 0.352778;

  let targetX = x;
  if (align === 'right') {
    targetX = x - widthInMm;
  } else if (align === 'center') {
    targetX = x - (widthInMm / 2);
  }

  // Base offset to align nicely with pdf.text baseline
  const targetY = y - (heightInMm * 0.72);

  pdf.addImage(imgData, 'PNG', targetX, targetY, widthInMm, heightInMm);
};


const SearchableProductDropdown = ({ products, selectedProductId, onChange, onCreateNew, placeholder = "Select a product" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedProduct = products.find(p => p.id === selectedProductId || (p.productId || p.id) === selectedProductId);

  const filteredProducts = products.filter(p => {
    const nameMatch = p.name?.toLowerCase().includes(search.toLowerCase());
    const skuMatch = p.skuCode?.toLowerCase().includes(search.toLowerCase());
    const variantMatch = (p.variantName || '')?.toLowerCase().includes(search.toLowerCase());
    const subVariantMatch = p.variants?.some(v => (v.variantName || v.name)?.toLowerCase().includes(search.toLowerCase()));
    return nameMatch || skuMatch || variantMatch || subVariantMatch;
  });

  return (
    <div className="w-full">
      <div
        onClick={() => {
          setIsOpen(true);
          setSearch('');
        }}
        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer flex justify-between items-center min-h-[38px] hover:bg-slate-50/50 transition-all shadow-sm"
      >
        <span className={selectedProduct ? 'text-slate-800' : 'text-slate-400 font-normal'}>
          {selectedProduct ? (
            <span className="flex items-center gap-1.5 flex-wrap">
              <span>{selectedProduct.name}</span>
              {selectedProduct.variantName && (
                <span className="bg-purple-50 text-purple-700 border border-purple-200/60 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">
                  {selectedProduct.variantName}
                </span>
              )}
              {selectedProduct.skuCode && <span className="text-slate-400 font-normal text-[10px]">({selectedProduct.skuCode})</span>}
            </span>
          ) : placeholder}
        </span>
        <span className="text-slate-400 text-[10px]">▼</span>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh] bg-black/40 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Select Product & Variant</span>
              <div className="flex items-center gap-2">
                {onCreateNew && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onCreateNew();
                    }}
                    className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black rounded-lg transition-all shadow-sm shadow-emerald-600/20 active:scale-95 uppercase tracking-wider"
                  >
                    <Plus size={13} strokeWidth={3} /> Add New Product
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-4 border-b border-slate-100">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search product name, SKU or variant..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-400 font-bold"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto max-h-72 custom-scrollbar p-2 divide-y divide-slate-50">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <p className="text-xs font-bold text-slate-400">No products found {search ? `matching "${search}"` : ''}</p>
                  {onCreateNew && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onCreateNew();
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-sm active:scale-95 uppercase tracking-wider"
                    >
                      <Plus size={14} strokeWidth={3} /> Create Product Form
                    </button>
                  )}
                </div>
              ) : (
                filteredProducts.map((p, pIdx) => {
                  const itemKey = p.id || p.productId;
                  const keyId = p.id ? `${p.id}_${p.variantName || pIdx}` : `prod_${itemKey}_${pIdx}`;
                  const isSelected = selectedProductId && (p.id === selectedProductId || p.productId === selectedProductId);

                  return (
                    <div key={keyId} className="flex flex-col">
                      <div
                        onClick={() => {
                          onChange(itemKey, p);
                          setIsOpen(false);
                        }}
                        className={`flex items-center justify-between px-4 py-3 text-xs font-bold rounded-xl cursor-pointer transition-colors ${isSelected
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'text-slate-700 hover:bg-slate-50'
                          }`}
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-900 font-extrabold">{p.name}</span>
                            {p.variantName && (
                              <span className="bg-purple-50 text-purple-700 border border-purple-200/60 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">
                                {p.variantName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {p.skuCode && <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{p.skuCode}</span>}
                            {(p.purchasePrice || p.price) && <span className="text-[9px] text-emerald-600 font-black">₹{p.purchasePrice || p.price}</span>}
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="text-emerald-600" size={16} />}
                      </div>

                      {/* Render product variants if present */}
                      {p.variants && p.variants.length > 0 && (
                        <div className="pl-6 pr-2 py-1 bg-slate-50/50 rounded-lg my-1 flex flex-col gap-1 border-l-2 border-purple-400 ml-3">
                          <span className="text-[8px] font-black uppercase tracking-wider text-purple-700">Variants:</span>
                          {p.variants.map((v, vIdx) => {
                            const subVariantObj = {
                              ...p,
                              id: v.id || `${p.id}_${v.variantName}`,
                              productId: v.productId || p.id,
                              variantName: v.variantName || v.name || '',
                              skuCode: v.sku || v.skuCode || p.skuCode,
                              purchasePrice: v.purchasePrice ?? v.costPrice ?? v.landingPrice ?? p.purchasePrice ?? p.price,
                              rate: v.purchasePrice ?? v.costPrice ?? v.landingPrice ?? p.purchasePrice ?? p.price,
                              price: v.sellingPrice ?? v.price ?? p.price
                            };
                            return (
                              <div
                                key={v.id || vIdx}
                                onClick={() => {
                                  onChange(subVariantObj.id, subVariantObj);
                                  setIsOpen(false);
                                }}
                                className="flex items-center justify-between px-2 py-1 rounded text-[10px] font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-900 cursor-pointer"
                              >
                                <span>{v.variantName || v.name}</span>
                                <span className="font-bold text-emerald-600">₹{subVariantObj.purchasePrice}</span>
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
        </div>
      )}
    </div>
  );
};

const PurchaseOrdersSection = ({ can, setHeaderExtra, setHideMainHeader, storeId }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showTypeSelection, setShowTypeSelection] = useState(false);
  const [poType, setPoType] = useState(null); // 'REQUISITION' | 'DIRECT'
  const [vendors, setVendors] = useState([]);
  const [mappedItems, setMappedItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [form, setForm] = useState({
    vendorId: '', poDate: format(new Date(), 'yyyy-MM-dd'),
    expectedDelivery: '', remarks: '', items: [],
    taxDiscount: ''
  });
  const [attachments, setAttachments] = useState({
    vendorQuotations: null,
    bills: null,
    supportingDocs: null
  });

  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [newVendorForm, setNewVendorForm] = useState({
    vendorName: '', mobile: '', contactPerson: '', creditDays: '30', openingBalance: '0'
  });
  const [isNewVendor, setIsNewVendor] = useState(false);
  const [inlineVendor, setInlineVendor] = useState({ vendorName: '', mobile: '', gstNumber: '', address: '' });
  const [preloadedProducts, setPreloadedProducts] = useState([]);
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [activeItemIndexForProduct, setActiveItemIndexForProduct] = useState(null);

  const [activeBarcodeScanIdx, setActiveBarcodeScanIdx] = useState(null);
  const [uploadingImageIdx, setUploadingImageIdx] = useState(null);
  const fileInputRefs = useRef({});

  const { data: categoriesData } = useGetProductCategoriesList();
  const { data: unitTypesData } = useGetProductUnitTypesList();
  const { data: brandsData } = useQuery({
    queryKey: ['procurementProductBrandsList'],
    queryFn: () => fetchData('productmanagement/product/brands/list', 'GET'),
    retry: false
  });

  const unitTypesList = useMemo(() => {
    const root = unitTypesData?.data?.data || unitTypesData?.data || unitTypesData || [];
    if (!Array.isArray(root)) return [];
    return root.filter(ut => ut && (ut.status === 'ACTIVE' || !ut.status));
  }, [unitTypesData]);

  const unitTypeIds = useMemo(() => unitTypesList.map(ut => ut.id).filter(Boolean), [unitTypesList]);
  const unitsByTypeId = useGetUnitsMapForUnitTypes(unitTypeIds);

  const categoryList = useMemo(() => {
    const root = categoriesData?.data?.data || categoriesData?.data || categoriesData || [];
    if (!Array.isArray(root)) return [];
    return root.map(c => ({
      id: c.id || c._id || c.name,
      name: c.name || c.title || '',
      subCategories: (c.subCategories || c.subcategories || []).map(sc => ({
        id: sc.id || sc._id || sc.name,
        name: sc.name || sc.title || ''
      }))
    })).filter(c => c.name);
  }, [categoriesData]);

  const brandList = useMemo(() => {
    let root = brandsData?.data?.data || brandsData?.data || brandsData?.brands || brandsData || [];
    if (!Array.isArray(root)) return [];
    return root.map(b => typeof b === 'string' ? b : (b.name || b.brandName || b.title || '')).filter(Boolean);
  }, [brandsData]);

  const handleProductCreated = (createdProduct) => {
    if (!createdProduct || !createdProduct.id) return;

    const catName = typeof createdProduct.category === 'string' ? createdProduct.category : (createdProduct.category?.name || 'UNCATEGORIZED');
    const autoSku = createdProduct.skuCode || generateAutoSku(createdProduct.name, createdProduct.unit, catName);
    const autoHsn = createdProduct.hsnCode || generateAutoHsn(catName, createdProduct.name);

    const formattedItem = {
      productId: createdProduct.id,
      id: createdProduct.id,
      name: createdProduct.name,
      skuCode: autoSku,
      category: catName,
      subCategory: createdProduct.subCategory || '',
      brand: createdProduct.brand || 'Villagkart',
      hsnCode: autoHsn,
      weight: createdProduct.weight || createdProduct.unit || 'KG',
      mrp: Number(createdProduct.mrp || 0),
      purchasePrice: Number(createdProduct.purchasePrice ?? createdProduct.rate ?? createdProduct.price ?? 0),
      rate: Number(createdProduct.purchasePrice ?? createdProduct.rate ?? createdProduct.price ?? 0),
      tax: Number(createdProduct.tax ?? createdProduct.taxRate ?? 0),
      discount: Number(createdProduct.discount ?? 0),
      quantity: Number(createdProduct.quantity || 1),
      unit: String(createdProduct.unit || 'KG').toUpperCase()
    };

    // Update mapped items and preloaded products
    setMappedItems(prev => [formattedItem, ...prev.filter(p => (p.productId || p.id) !== createdProduct.id)]);
    setPreloadedProducts(prev => [createdProduct, ...prev.filter(p => p.id !== createdProduct.id)]);

    // Update active row or add new item to form
    setForm(prevForm => {
      const targetIdx = activeItemIndexForProduct;
      if (targetIdx !== null && targetIdx !== undefined && prevForm.items[targetIdx]) {
        const updated = [...prevForm.items];
        updated[targetIdx] = {
          ...updated[targetIdx],
          productId: createdProduct.id,
          name: createdProduct.name,
          skuCode: formattedItem.skuCode,
          category: formattedItem.category,
          subCategory: formattedItem.subCategory,
          brand: formattedItem.brand,
          hsnCode: formattedItem.hsnCode,
          mrp: formattedItem.mrp,
          rate: formattedItem.rate,
          unit: formattedItem.unit,
          tax: formattedItem.tax,
          discount: formattedItem.discount,
          quantity: updated[targetIdx].quantity || formattedItem.quantity || 1
        };
        return { ...prevForm, items: updated };
      } else {
        const emptyIdx = prevForm.items.findIndex(it => !it.productId);
        if (emptyIdx !== -1) {
          const updated = [...prevForm.items];
          updated[emptyIdx] = {
            ...updated[emptyIdx],
            productId: createdProduct.id,
            name: createdProduct.name,
            skuCode: formattedItem.skuCode,
            category: formattedItem.category,
            subCategory: formattedItem.subCategory,
            brand: formattedItem.brand,
            hsnCode: formattedItem.hsnCode,
            mrp: formattedItem.mrp,
            rate: formattedItem.rate,
            unit: formattedItem.unit,
            tax: formattedItem.tax,
            discount: formattedItem.discount,
            quantity: updated[emptyIdx].quantity || formattedItem.quantity || 1
          };
          return { ...prevForm, items: updated };
        } else {
          return {
            ...prevForm,
            items: [
              ...prevForm.items,
              {
                productId: createdProduct.id,
                name: createdProduct.name,
                skuCode: formattedItem.skuCode,
                category: formattedItem.category,
                subCategory: formattedItem.subCategory,
                brand: formattedItem.brand,
                hsnCode: formattedItem.hsnCode,
                mrp: formattedItem.mrp,
                quantity: formattedItem.quantity || 1,
                unit: formattedItem.unit,
                rate: formattedItem.rate,
                tax: formattedItem.tax,
                discount: formattedItem.discount
              }
            ]
          };
        }
      }
    });

    setShowCreateProductModal(false);
    setActiveItemIndexForProduct(null);
    toast.success(`Product "${createdProduct.name}" created and added to PO!`);
  };

  const [isSubmitDraft, setIsSubmitDraft] = useState(false);

  const handleAttachmentChange = (key, file) => {
    if (!file) return;
    setAttachments(prev => ({ ...prev, [key]: file }));
    toast.success(`${file.name} uploaded successfully!`);
  };

  const handleRemoveAttachment = (key) => {
    setAttachments(prev => ({ ...prev, [key]: null }));
    toast.success('Attachment removed');
  };

  const [selectedPO, setSelectedPO] = useState(null);
  const [viewingPO, setViewingPO] = useState(null);
  const [loadingPO, setLoadingPO] = useState(false);

  const TABS = [
    { label: 'All', value: '' },
    { label: 'Draft', value: 'CREATED' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Delivered', value: 'DELIVERED' },
    { label: 'Closed', value: 'CLOSED' },
    { label: 'Cancelled', value: 'CANCELLED' }
  ];

  const statusBadgeStyles = {
    CREATED: 'bg-gray-100 text-gray-650 border-gray-250',
    APPROVED: 'bg-emerald-50 text-emerald-705 border-emerald-250',
    ORDERED: 'bg-purple-50 text-purple-705 border-purple-250',
    DELIVERED: 'bg-amber-50 text-amber-705 border-amber-250',
    CLOSED: 'bg-slate-100 text-slate-705 border-slate-250',
    CANCELLED: 'bg-rose-50 text-rose-705 border-rose-250'
  };

  const statusLabel = {
    CREATED: 'Draft',
    APPROVED: 'Approved',
    ORDERED: 'Arrived',
    DELIVERED: 'Delivered',
    CLOSED: 'Closed',
    CANCELLED: 'Cancelled'
  };

  const loadPOs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await procurementAPI.getPurchaseOrders({ status: statusFilter || undefined, storeId: storeId || undefined });
      const poArray = data?.data || data || [];
      setPOs(Array.isArray(poArray) ? poArray : []);
    } catch { toast.error('Failed to load POs'); }
    finally { setLoading(false); }
  }, [statusFilter, storeId]);

  useEffect(() => { loadPOs(); }, [loadPOs]);

  useEffect(() => {
    if (selectedPO?.vendorId) {
      const loadMappingsForPO = async () => {
        try {
          const { data } = await procurementAPI.getVendorMappings(selectedPO.vendorId);
          const mappedArray = data?.data || data || [];
          if (Array.isArray(mappedArray) && mappedArray.length > 0) {
            setMappedItems(mappedArray.map(m => {
              const prod = m.product || {};
              const unitStr = typeof prod.unit === 'object' ? (prod.unit?.type || prod.unit?.name || '') : (prod.unit || '');
              const finalUom = m.uom || 'PACK';
              return {
                productId: prod.id || m.productId,
                id: prod.id || m.productId,
                name: prod.name || 'Unknown Product',
                variantName: prod.variantName || '',
                skuCode: m.vendorSku || prod.skuCode || prod.sku || 'NO-SKU',
                barcode: prod.barcode || '',
                category: prod.category?.name || (typeof prod.category === 'string' ? prod.category : 'UNCATEGORIZED'),
                subCategory: prod.subCategory?.name || prod.subCategory || '',
                brand: prod.brand?.name || prod.brand || 'Villagkart',
                weight: finalUom,
                unit: finalUom,
                uom: finalUom,
                mrp: parseFloat(m.mrp > 0 ? m.mrp : (m.moq > 0 ? m.moq : 0)),
                landingPrice: parseFloat(m.landingPrice > 0 ? m.landingPrice : (m.leadTime > 0 ? m.leadTime : 0)),
                sellingPrice: parseFloat(m.sellingPrice > 0 ? m.sellingPrice : (m.purchasePrice > 0 ? m.purchasePrice : 0)),
                purchasePrice: parseFloat(m.purchasePrice > 0 ? m.purchasePrice : 0),
                rate: parseFloat(m.landingPrice > 0 ? m.landingPrice : (m.leadTime > 0 ? m.leadTime : 0)),
                quantity: parseInt(m.quantity ?? (m.taxPercent > 0 ? m.taxPercent : 1)) || 1
              };
            }));
          }
        } catch (err) {
          console.error('Failed to load vendor mappings for selectedPO', err);
        }
      };
      loadMappingsForPO();
    }
  }, [selectedPO?.vendorId]);

  useEffect(() => {
    const preloadData = async () => {
      try {
        const [vendorsRes, productsRes] = await Promise.all([
          procurementAPI.getVendors({ status: 'ACTIVE', storeId: storeId || undefined }),
          productsAPI.getAll({ showAll: true, storeId: storeId || undefined })
        ]);
        const vData = vendorsRes.data?.data || vendorsRes.data || [];
        setVendors(Array.isArray(vData) ? vData : []);
        const pData = productsRes.data?.data || productsRes.data || [];
        setPreloadedProducts(Array.isArray(pData) ? pData : []);
      } catch (err) {
        console.error('Failed to preload active vendors or products', err);
      }
    };
    preloadData();
  }, [storeId]);

  useEffect(() => {
    if (setHideMainHeader) {
      setHideMainHeader(showForm || showTypeSelection || !!selectedPO);
    }
    return () => {
      if (setHideMainHeader) setHideMainHeader(false);
    };
  }, [showForm, showTypeSelection, selectedPO, setHideMainHeader]);

  const handleSelectPoType = (type) => {
    setPoType(type);
    openForm(type);
  };

  const openForm = (type) => {
    const selectedType = type || poType;
    setIsNewVendor(false);
    setInlineVendor({ vendorName: '', mobile: '', gstNumber: '', address: '' });
    setAttachments({ vendorQuotations: null, bills: null, supportingDocs: null });

    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 4);
    const deliveryDateStr = format(deliveryDate, 'yyyy-MM-dd');

    setForm({
      vendorId: '',
      poDate: format(new Date(), 'yyyy-MM-dd'),
      expectedDelivery: deliveryDateStr,
      remarks: '',
      items: selectedType === 'DIRECT'
        ? [{ productId: '', name: '', quantity: 1, unit: 'KG', rate: 0, tax: 0, discount: 0 }]
        : [],
      taxDiscount: ''
    });

    setShowForm(true);
    setShowTypeSelection(false);

    // Resolve system vendors and products in the background asynchronously
    const resolveBackgroundData = async () => {
      try {
        if (vendors.length === 0) {
          const { data } = await procurementAPI.getVendors({ status: 'ACTIVE' });
          setVendors(data?.data || data || []);
        }

        if (selectedType === 'DIRECT') {
          let prods = preloadedProducts;
          if (prods.length === 0) {
            const { data } = await productsAPI.getAll({ showAll: true });
            setPreloadedProducts(data);
            prods = data;
          }
          const flattened = [];
          (Array.isArray(prods) ? prods : []).forEach(p => {
            // Base product
            flattened.push({
              productId: p.id,
              id: p.id,
              name: p.name,
              variantName: p.variantName || '',
              skuCode: p.skuCode || 'NO-SKU',
              barcode: p.barcode || '',
              category: p.category?.name || 'UNCATEGORIZED',
              subCategory: p.subCategory?.name || p.subCategory || '',
              brand: p.brand?.name || p.brand || 'Villagkart',
              unitType: p.unitType || '',
              pack: p.pack || '',
              measurement: p.measurement || '',
              weight: p.uom || 'PACK',
              unit: p.uom || 'PACK',
              mrp: p.mrp || 0,
              landingPrice: p.landingPrice || p.purchasePrice || 0,
              sellingPrice: p.sellingPrice || p.price || 0,
              purchasePrice: p.purchasePrice || p.price || 0,
              quantity: 0,
              rate: p.purchasePrice || p.price || 0
            });
            // Variants as individual items
            if (Array.isArray(p.variants) && p.variants.length > 0) {
              p.variants.forEach(v => {
                flattened.push({
                  productId: v.productId || p.id,
                  id: v.id || `${p.id}_${v.variantName}`,
                  parentProductId: p.id,
                  name: p.name,
                  variantName: v.variantName || v.name || '',
                  isVariantItem: true,
                  skuCode: v.sku || v.skuCode || p.skuCode || 'NO-SKU',
                  barcode: v.barcode || p.barcode || '',
                  category: p.category?.name || 'UNCATEGORIZED',
                  subCategory: p.subCategory?.name || p.subCategory || '',
                  brand: p.brand?.name || p.brand || 'Villagkart',
                  unitType: v.unitType || p.unitType || '',
                  pack: v.pack || p.pack || '',
                  measurement: v.measurement || p.measurement || '',
                  weight: v.uom || p.uom || 'PACK',
                  unit: v.uom || p.uom || 'PACK',
                  mrp: v.mrp || p.mrp || 0,
                  landingPrice: v.landingPrice || v.purchasePrice || p.landingPrice || 0,
                  sellingPrice: v.sellingPrice || v.price || p.sellingPrice || p.price || 0,
                  purchasePrice: v.purchasePrice || v.costPrice || v.landingPrice || p.purchasePrice || p.price || 0,
                  quantity: 0,
                  rate: v.purchasePrice || v.costPrice || v.landingPrice || p.purchasePrice || p.price || 0
                });
              });
            }
          });
          setMappedItems(flattened);
        } else {
          setMappedItems([]);
        }
      } catch (err) {
        console.error('Failed to resolve background data for PO form', err);
      }
    };
    resolveBackgroundData();
  };

  const onVendorSelect = async (vendorId) => {
    setForm(f => ({
      ...f,
      vendorId,
      items: poType === 'DIRECT'
        ? (f.items.length > 0 ? f.items : [{ productId: '', name: '', quantity: 1, unit: 'KG', rate: 0, tax: 0, discount: 0 }])
        : []
    }));
    if (!vendorId) { setMappedItems([]); return; }
    try {
      if (poType === 'DIRECT') {
        let prods = preloadedProducts;
        if (prods.length === 0) {
          const { data } = await productsAPI.getAll({ showAll: true });
          setPreloadedProducts(data);
          prods = data;
        }
        const flattened = [];
        (Array.isArray(prods) ? prods : []).forEach(p => {
          flattened.push({
            productId: p.id,
            id: p.id,
            name: p.name,
            variantName: p.variantName || '',
            skuCode: p.skuCode || 'NO-SKU',
            barcode: p.barcode || '',
            category: p.category?.name || 'UNCATEGORIZED',
            subCategory: p.subCategory?.name || p.subCategory || '',
            brand: p.brand?.name || p.brand || 'Villagkart',
            unitType: p.unitType || '',
            pack: p.pack || '',
            measurement: p.measurement || '',
            weight: p.uom || 'PACK',
            unit: p.uom || 'PACK',
            mrp: p.mrp || 0,
            landingPrice: p.landingPrice || p.purchasePrice || 0,
            sellingPrice: p.sellingPrice || p.price || 0,
            purchasePrice: p.purchasePrice || p.price || 0,
            quantity: 0,
            rate: p.purchasePrice || p.price || 0
          });
          if (Array.isArray(p.variants) && p.variants.length > 0) {
            p.variants.forEach(v => {
              flattened.push({
                productId: v.productId || p.id,
                id: v.id || `${p.id}_${v.variantName}`,
                parentProductId: p.id,
                name: p.name,
                variantName: v.variantName || v.name || '',
                isVariantItem: true,
                skuCode: v.sku || v.skuCode || p.skuCode || 'NO-SKU',
                barcode: v.barcode || p.barcode || '',
                category: p.category?.name || 'UNCATEGORIZED',
                subCategory: p.subCategory?.name || p.subCategory || '',
                brand: p.brand?.name || p.brand || 'Villagkart',
                unitType: v.unitType || p.unitType || '',
                pack: v.pack || p.pack || '',
                measurement: v.measurement || p.measurement || '',
                weight: v.uom || p.uom || 'PACK',
                unit: v.uom || p.uom || 'PACK',
                mrp: v.mrp || p.mrp || 0,
                landingPrice: v.landingPrice || v.purchasePrice || p.landingPrice || 0,
                sellingPrice: v.sellingPrice || v.price || p.sellingPrice || p.price || 0,
                purchasePrice: v.purchasePrice || v.costPrice || v.landingPrice || p.purchasePrice || p.price || 0,
                quantity: 0,
                rate: v.purchasePrice || v.costPrice || v.landingPrice || p.purchasePrice || p.price || 0
              });
            });
          }
        });
        setMappedItems(flattened);
      } else {
        const { data } = await procurementAPI.getVendorMappings(vendorId);
        const mappedArray = data?.data || data || [];
        setMappedItems(mappedArray.map(m => {
          const prod = m.product || {};
          const unitStr = typeof prod.unit === 'object' ? (prod.unit?.type || prod.unit?.name || '') : (prod.unit || '');
          const finalUom = m.uom || 'PACK';

          const mappedMrp = parseFloat(m.mrp > 0 ? m.mrp : (m.moq > 0 ? m.moq : (prod.mrp > 0 ? prod.mrp : (prod.price || 0))));
          const mappedLandingPrice = parseFloat(m.landingPrice > 0 ? m.landingPrice : (m.leadTime > 0 ? m.leadTime : (prod.landingPrice > 0 ? prod.landingPrice : (prod.purchasePrice || 0))));
          const mappedSellingPrice = parseFloat(m.sellingPrice > 0 ? m.sellingPrice : (m.purchasePrice > 0 ? m.purchasePrice : (prod.sellingPrice > 0 ? prod.sellingPrice : (prod.price || 0))));
          const mappedRate = parseFloat(m.landingPrice > 0 ? m.landingPrice : (m.leadTime > 0 ? m.leadTime : (m.purchasePrice > 0 ? m.purchasePrice : (prod.purchasePrice || prod.price || 0))));
          const mappedQuantity = parseInt(m.quantity ?? (m.taxPercent > 0 ? m.taxPercent : 1)) || 1;

          return {
            productId: prod.id || m.productId,
            id: prod.id || m.productId,
            name: prod.name || 'Unknown Product',
            variantName: prod.variantName || '',
            skuCode: m.vendorSku || prod.skuCode || prod.sku || 'NO-SKU',
            barcode: prod.barcode || '',
            category: prod.category?.name || (typeof prod.category === 'string' ? prod.category : 'UNCATEGORIZED'),
            subCategory: prod.subCategory?.name || prod.subCategory || '',
            brand: prod.brand?.name || prod.brand || 'Villagkart',
            weight: finalUom,
            unit: finalUom,
            uom: finalUom,
            mrp: mappedMrp,
            landingPrice: mappedLandingPrice,
            sellingPrice: mappedSellingPrice,
            purchasePrice: mappedRate,
            rate: mappedRate,
            tax: parseFloat(m.tax || 0),
            discount: parseFloat(m.discount || 0),
            quantity: mappedQuantity
          };
        }));
      }
    } catch (err) { console.error('onVendorSelect Error:', err); toast.error(poType === 'DIRECT' ? 'Failed to load products' : 'Failed to load mapped items'); }
  };

  const toggleItem = (productId) => {
    setForm(f => {
      const exists = f.items.find(i => i.productId === productId);
      if (exists) return { ...f, items: f.items.filter(i => i.productId !== productId) };
      const item = mappedItems.find(m => m.productId === productId);
      return { ...f, items: [...f.items, { productId, quantity: item?.quantity || 1, rate: item?.landingPrice || item?.purchasePrice || 0, uom: item?.uom || 'PACK', mrp: item?.mrp || 0, landingPrice: item?.landingPrice || 0, sellingPrice: item?.sellingPrice || 0, tax: 0, discount: 0 }] };
    });
  };

  const handleToggleCategorySelectAll = (categoryItems) => {
    setForm(f => {
      const isAllSelected = categoryItems.length > 0 && categoryItems.every(item => f.items.some(fi => fi.productId === item.productId));
      if (isAllSelected) {
        const catProductIds = new Set(categoryItems.map(item => item.productId));
        return {
          ...f,
          items: f.items.filter(fi => !catProductIds.has(fi.productId))
        };
      } else {
        const existingIds = new Set(f.items.map(fi => fi.productId));
        const newItems = categoryItems
          .filter(item => !existingIds.has(item.productId))
          .map(item => ({
            productId: item.productId, quantity: item.quantity || 1, rate: item.landingPrice || item.purchasePrice || 0, landingPrice: item.landingPrice || 0, sellingPrice: item.sellingPrice || 0, mrp: item.mrp || 0, uom: item.uom || 'PACK',
            tax: 0,
            discount: 0
          }));
        return {
          ...f,
          items: [...f.items, ...newItems]
        };
      }
    });
  };

  const filteredMappedItems = useMemo(() => {
    return mappedItems.filter(item => 
      !itemSearch || 
      item.name?.toLowerCase().includes(itemSearch.toLowerCase()) ||
      item.skuCode?.toLowerCase().includes(itemSearch.toLowerCase())
    );
  }, [mappedItems, itemSearch]);

  const areAllFilteredItemsSelected = useMemo(() => {
    return filteredMappedItems.length > 0 && 
      filteredMappedItems.every(item => form.items.some(fi => fi.productId === item.productId));
  }, [filteredMappedItems, form.items]);

  const handleToggleGlobalSelectAll = () => {
    setForm(f => {
      if (areAllFilteredItemsSelected) {
        const filteredIds = new Set(filteredMappedItems.map(item => item.productId));
        return {
          ...f,
          items: f.items.filter(fi => !filteredIds.has(fi.productId))
        };
      } else {
        const existingIds = new Set(f.items.map(item => item.productId));
        const newItems = filteredMappedItems
          .filter(item => !existingIds.has(item.productId))
          .map(item => ({
            productId: item.productId, quantity: item.quantity || 1, rate: item.landingPrice || item.purchasePrice || 0, landingPrice: item.landingPrice || 0, sellingPrice: item.sellingPrice || 0, mrp: item.mrp || 0, uom: item.uom || 'PACK',
            tax: 0,
            discount: 0
          }));
        return {
          ...f,
          items: [...f.items, ...newItems]
        };
      }
    });
  };

  const updateItemField = (productId, field, value) => {
    setForm(f => ({
      ...f,
      items: f.items.map(i => i.productId === productId ? { ...i, [field]: value } : i)
    }));
  };

  // const PRESET_PRODUCTS_LIST = [
  //   { name: 'Surf Excel 88 gm', qty: 15, unit: 'KG', rate: 10 },
  //   { name: 'Surf Excel', qty: 15, unit: 'KG', rate: 10 },
  //   { name: 'Vim Bar 480gm', qty: 2, unit: 'KG', rate: 48 },
  //   { name: 'Vim Bar Tub 240g', qty: 5, unit: 'KG', rate: 27 },
  //   { name: 'Vim Bar 60gm', qty: 20, unit: 'KG', rate: 4 },
  //   { name: 'Exo Dishwash Bar Pack of 4 90g', qty: 3, unit: 'KG', rate: 28 },
  //   { name: 'Exo Round Ginger 250g', qty: 3, unit: 'KG', rate: 27 },
  //   { name: 'Santoor Sandal & Turmeric Soap 10rs', qty: 9, unit: 'KG', rate: 10 },
  //   { name: 'Santoor 4+1 PACK 125gm', qty: 15, unit: 'KG', rate: 220 },
  //   { name: 'Margo Original PACK', qty: 1, unit: 'KG', rate: 150 },
  //   { name: 'Cinthol Original 4 Pack', qty: 1, unit: 'KG', rate: 260 },
  //   { name: 'Pears Soft & Fresh Soap', qty: 3, unit: 'KG', rate: 150 },
  //   { name: 'Margo Original Neem Soap', qty: 5, unit: 'KG', rate: 35 },
  //   { name: 'LIFEBUOY SOAP TOTAL 125 g', qty: 5, unit: 'KG', rate: 45 },
  //   { name: 'Rexona Coconut & Olive Oil 100g', qty: 5, unit: 'KG', rate: 40 },
  //   { name: 'Santoor Sandal & Turmeric 100gm', qty: 15, unit: 'KG', rate: 38 },
  //   { name: 'Fiama Men Refreshing Pulse Gel Bar', qty: 1, unit: 'KG', rate: 65 },
  //   { name: 'Fiama Patchouli & Macadamia Gel Bar', qty: 1, unit: 'KG', rate: 65 },
  //   { name: 'Exo Bacto Scrub', qty: 12, unit: 'KG', rate: 15 },
  //   { name: 'ASR Iodised Crystal Salt', qty: 10, unit: 'KG', rate: 10 },
  //   { name: 'Tata Salt', qty: 5, unit: 'KG', rate: 31 },
  //   { name: 'Suji Rava', qty: 10, unit: 'KG', rate: 35 },
  //   { name: 'Three Mangoes Chilli Powder', qty: 3, unit: 'KG', rate: 150 },
  //   { name: 'Madhuri Sambar Powder', qty: 2, unit: 'KG', rate: 150 },
  //   { name: 'AHA Papad', qty: 10, unit: 'KG', rate: 15 },
  //   { name: 'Aashirvaad Turmeric', qty: 10, unit: 'KG', rate: 35 },
  //   { name: 'Agririch Black Pepper (Miriyalu )', qty: 10, unit: 'KG', rate: 10 },
  //   { name: 'Agririch Lavangalu (Cloves)', qty: 10, unit: 'KG', rate: 10 },
  //   { name: 'Dalchina Chakka', qty: 11, unit: 'KG', rate: 10 },
  //   { name: 'Yalukalu', qty: 10, unit: 'KG', rate: 10 },
  //   { name: "Mom's Magic Cashew & Almond PACK", qty: 2, unit: 'KG', rate: 55 },
  //   { name: 'Continental Xtra Coffee', qty: 60, unit: 'KG', rate: 2 },
  //   { name: 'Freedom Sunflower Oil Tin 15kg', qty: 1, unit: 'KG', rate: 2950 },
  //   { name: 'Ruchi Gold', qty: 1, unit: 'KG', rate: 135 },
  //   { name: 'Colgate Active Salt 100gm', qty: 10, unit: 'KG', rate: 70 },
  //   { name: 'Colgate Brush', qty: 18, unit: 'KG', rate: 20 },
  //   { name: 'Closeup Red Hot Gel Toothpaste 150GM', qty: 5, unit: 'KG', rate: 125 },
  //   { name: 'Mysore Sandal Soap Pack', qty: 5, unit: 'KG', rate: 225 },
  //   { name: 'Mysore Sandal Soap 125GM', qty: 10, unit: 'KG', rate: 61 },
  //   { name: 'Mysore Sandal Gold Soap', qty: 6, unit: 'KG', rate: 85 },
  //   { name: 'All Out Mosquito Repellent Machine', qty: 1, unit: 'KG', rate: 185 },
  //   { name: 'Harpic Power Plus 10X TC Cleaner 600ML', qty: 2, unit: 'KG', rate: 115 },
  //   { name: 'Lizol Surface Cleaner Floral 625ml', qty: 3, unit: 'KG', rate: 150 },
  //   { name: 'Lizol Surface Cleaner Citrus 200 ml', qty: 10, unit: 'KG', rate: 47 },
  //   { name: 'Domex Ocean Fresh Disinfectant Toilet Cleaner', qty: 2, unit: 'KG', rate: 99 },
  //   { name: 'Kissan Mixed Fruit Jam', qty: 5, unit: 'KG', rate: 25 },
  //   { name: 'Kurnool Rice', qty: 2, unit: 'KG', rate: 1630 },
  //   { name: 'Kinley Soda Original', qty: 5, unit: 'KG', rate: 20 },
  //   { name: 'Maaza 1.75 Ltr', qty: 5, unit: 'KG', rate: 90 },
  //   { name: 'kindly soda original', qty: 29, unit: 'KG', rate: 11 },
  //   { name: 'Sprite 250ml', qty: 16, unit: 'KG', rate: 20 },
  //   { name: 'Fanta Orange', qty: 13, unit: 'KG', rate: 19 },
  //   { name: 'Fanta Orange Soft Drink 250ML Case', qty: 1, unit: 'KG', rate: 480 },
  //   { name: 'Amaravathi Sonamasoori Normal', qty: 2, unit: 'KG', rate: 1950 },
  //   { name: 'Bingo Tedhe Medhe Tomato Twist', qty: 15, unit: 'KG', rate: 5 },
  //   { name: 'Bingo Tedhe Medhe Masala tadka', qty: 17, unit: 'KG', rate: 5 },
  //   { name: 'Bingo Mad Angles Very Peri Peri', qty: 22, unit: 'KG', rate: 5 },
  //   { name: 'Bingo Original Style', qty: 18, unit: 'KG', rate: 10 },
  //   { name: 'Shiva Idli Rava', qty: 13, unit: 'KG', rate: 48 },
  //   { name: 'Bambino Vermicelli', qty: 5, unit: 'KG', rate: 45 },
  //   { name: 'Sabudana 500gm', qty: 5, unit: 'KG', rate: 45 },
  //   { name: 'Fried Gram', qty: 5, unit: 'KG', rate: 100 },
  //   { name: '(Fried Gram)500gm', qty: 3, unit: 'KG', rate: 55 },
  //   { name: 'Idli Rava', qty: 9, unit: 'KG', rate: 42 },
  //   { name: 'Toor Dal', qty: 10, unit: 'KG', rate: 120 },
  //   { name: 'MD ANUSHRI ROSE', qty: 3, unit: 'KG', rate: 60 },
  //   { name: 'MD ANUSHRI MOGRA', qty: 3, unit: 'KG', rate: 60 },
  //   { name: 'Mangaldeep Sambhrani Cups', qty: 2, unit: 'KG', rate: 70 },
  //   { name: 'Mangaldeep Sadhvi Agarbatti', qty: 6, unit: 'KG', rate: 30 },
  //   { name: 'Cotton Pooja Wicks', qty: 35, unit: 'KG', rate: 10 },
  //   { name: 'Pooja Gold Oil', qty: 5, unit: 'KG', rate: 55 },
  //   { name: 'Yippee Noodles 6 pack 420gm', qty: 2, unit: 'KG', rate: 80 },
  //   { name: 'Jelimals Space Runners Jellies', qty: 15, unit: 'KG', rate: 10 },
  //   { name: 'Bingo xxx Hot & Spicy', qty: 15, unit: 'KG', rate: 5 },
  //   { name: 'Bingo Sizzling Chilli', qty: 15, unit: 'KG', rate: 5 },
  //   { name: 'Bingo Knockin Korean', qty: 13, unit: 'KG', rate: 5 },
  //   { name: 'Bingo Mad Angles Achaari Masti', qty: 11, unit: 'KG', rate: 5 },
  //   { name: 'Bingo Slayin Salt', qty: 16, unit: 'KG', rate: 5 },
  //   { name: 'Yippee Noodles 4 Pack 280gm', qty: 2, unit: 'KG', rate: 60 },
  //   { name: 'Yippee Magic Masala 50gm', qty: 10, unit: 'KG', rate: 10 },
  //   { name: 'Sunfeast Dark Fantasy Choco Fills', qty: 2, unit: 'KG', rate: 155 },
  //   { name: 'Sunfeast Dark Fantasy Choco Fills 10rs', qty: 17, unit: 'KG', rate: 10 },
  //   { name: 'Bounce choco orange cream', qty: 5, unit: 'KG', rate: 10 },
  //   { name: 'Sunfeast Marie Light biscuits 10rs', qty: 5, unit: 'KG', rate: 10 },
  //   { name: 'Sunfeast Fantastik Choco Meltz', qty: 1, unit: 'KG', rate: 5 },
  //   { name: 'Engage Man Rush Deodorant Spray', qty: 5, unit: 'KG', rate: 80 },
  //   { name: 'Comfort Farbic', qty: 10, unit: 'KG', rate: 4 },
  //   { name: 'Sunsilk Jasmine & Vetiver Shampoo Sachet', qty: 107, unit: 'KG', rate: 1 },
  //   { name: 'Head & Shoulders Shampoo', qty: 135, unit: 'KG', rate: 2 },
  //   { name: 'Gillette Guard Disposable Razor', qty: 10, unit: 'KG', rate: 26 },
  //   { name: 'Pottu Minapappu', qty: 6, unit: 'KG', rate: 132 },
  //   { name: 'Pulpy orange', qty: 5, unit: 'KG', rate: 80 },
  //   { name: 'Thums Up', qty: 5, unit: 'KG', rate: 65 },
  //   { name: 'Kurnool Groundnut Oil 1Ltr', qty: 1, unit: 'KG', rate: 176 },
  //   { name: 'Bingo Killin Crean &Onion', qty: 15, unit: 'KG', rate: 5 },
  //   { name: 'Maida', qty: 10, unit: 'KG', rate: 30 },
  //   { name: 'All Out Ultra Single Refill', qty: 1, unit: 'KG', rate: 100 }
  // ];

  const handleLoadPresetProducts = () => {
    const newItems = PRESET_PRODUCTS_LIST.map(preset => {
      const cleanPreset = preset.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const matched = mappedItems.find(p => {
        const cleanDb = (p.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanDb === cleanPreset || (p.name || '').toLowerCase().includes(preset.name.toLowerCase());
      });

      const autoSku = generateAutoSku(preset.name, preset.unit, '');
      const autoHsn = generateAutoHsn('', preset.name);

      return {
        productId: matched ? (matched.productId || matched.id) : '',
        selectedKey: matched ? matched.id : '',
        name: preset.name,
        skuCode: matched?.skuCode || autoSku,
        barcode: matched?.barcode || '',
        image: matched?.image || '',
        category: matched?.category || '',
        subCategory: matched?.subCategory || '',
        brand: matched?.brand || 'Villagkart',
        hsnCode: matched?.hsnCode || autoHsn,
        unitType: matched?.unitType || '',
        pack: matched?.pack || '',
        measurement: matched?.measurement || '',
        mrp: matched?.mrp || preset.rate,
        landingPrice: matched?.landingPrice || preset.rate,
        sellingPrice: matched?.sellingPrice || preset.rate,
        quantity: preset.qty,
        unit: preset.unit,
        rate: preset.rate,
        tax: 0,
        discount: 0
      };
    });

    setForm(f => ({
      ...f,
      items: newItems
    }));
    toast.success(`Loaded ${newItems.length} products into Purchase Order!`);
  };

  const handleAddDirectItem = () => {
    const autoSku = generateAutoSku('', 'KG', '');
    const autoHsn = generateAutoHsn('', '');
    setForm(f => ({
      ...f,
      items: [...f.items, {
        productId: '',
        name: '',
        skuCode: autoSku,
        barcode: '',
        image: '',
        category: '',
        subCategory: '',
        brand: 'Villagkart',
        hsnCode: autoHsn,
        unitType: '',
        pack: '',
        measurement: '',
        mrp: 0,
        landingPrice: 0,
        sellingPrice: 0,
        quantity: 1,
        unit: 'KG',
        rate: 0,
        tax: 0,
        discount: 0
      }]
    }));
  };

  const handleImageRowUpload = async (index, file) => {
    if (!file) return;
    try {
      setUploadingImageIdx(index);
      const url = await uploadImageFile(file);
      if (url) {
        handleDirectItemChange(index, 'image', url);
        toast.success('Product image uploaded successfully!');
      }
    } catch (err) {
      console.error('Image upload failed', err);
      toast.error('Failed to upload product image');
    } finally {
      setUploadingImageIdx(null);
    }
  };

  const handleRemoveDirectItem = (index) => {
    setForm(f => ({
      ...f,
      items: f.items.filter((_, i) => i !== index)
    }));
  };

  const handleDirectItemChange = (index, field, value) => {
    setForm(f => {
      const updated = [...f.items];
      updated[index] = { ...updated[index], [field]: value };

      if (field === 'name') {
        const matched = mappedItems.find(p => p.name.toLowerCase() === value.toLowerCase());
        if (matched) {
          updated[index].productId = matched.productId;
          updated[index].rate = matched.purchasePrice || 0;
          const weightStr = typeof matched.weight === 'string' ? matched.weight.replace(/[\d\s.]/g, '') : (typeof matched.unit === 'string' ? matched.unit : (matched.unit ? String(matched.unit) : 'KG'));
          updated[index].unit = weightStr || 'KG';
        } else {
          updated[index].productId = '';
        }
      }
      return { ...f, items: updated };
    });
  };

  const handleEdit = async (po) => {
    try {
      const { data: v } = await procurementAPI.getVendors({ status: 'ACTIVE' });
      setVendors(v?.data || v || []);
      const { data: m } = await procurementAPI.getVendorMappings(po.vendorId);
      const mappedArray = Array.isArray(m?.data) ? m.data : (Array.isArray(m) ? m : []);
      const mapped = mappedArray.map(item => ({
        productId: item.product?.id || item.productId,
        name: item.product?.name || 'Product',
        skuCode: item.product?.skuCode || 'NO-SKU',
        category: item.product?.category?.name || 'UNCATEGORIZED',
        weight: item.uom || 'PACK',
        purchasePrice: item.lastPurchaseRate > 0 ? item.lastPurchaseRate : (item.purchasePrice > 0 ? item.purchasePrice : (item.product?.purchasePrice || item.product?.price || 0)),
        quantity: 0,
        rate: item.lastPurchaseRate > 0 ? item.lastPurchaseRate : (item.purchasePrice > 0 ? item.purchasePrice : (item.product?.purchasePrice || item.product?.price || 0))
      }));

      // Append items in po.items that are not in mapped
      if (Array.isArray(po.items)) {
        po.items.forEach(poItem => {
          if (!mapped.some(x => x.productId === poItem.productId)) {
            mapped.push({
              productId: poItem.productId,
              name: poItem.product?.name || 'Product',
              skuCode: poItem.product?.skuCode || 'NO-SKU',
              category: poItem.product?.category?.name || 'UNCATEGORIZED',
              weight: poItem.uom || 'PACK',
              purchasePrice: poItem.rate || poItem.product?.purchasePrice || 0,
              quantity: poItem.quantity,
              rate: poItem.rate
            });
          }
        });
      }

      setMappedItems(mapped);
      const computedPoType = po.poType || (po.items?.some(poItem => !mappedArray.some(x => (x.product?.id || x.productId) === poItem.productId)) ? 'DIRECT' : 'REQUISITION');
      setPoType(computedPoType);
      setAttachments({
        vendorQuotations: po.attachments?.vendorQuotations || null,
        bills: po.attachments?.bills || null,
        supportingDocs: po.attachments?.supportingDocs || null
      });

      const cleanRemarks = po.remarks && po.remarks.includes('\n[PO_METADATA]:')
        ? po.remarks.slice(0, po.remarks.indexOf('\n[PO_METADATA]:'))
        : (po.remarks || '');

      setForm({
        id: po.id,
        vendorId: po.vendorId,
        poDate: po.poDate ? format(new Date(po.poDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        expectedDelivery: po.expectedDelivery ? format(new Date(po.expectedDelivery), 'yyyy-MM-dd') : '',
        remarks: cleanRemarks,
        taxDiscount: po.taxDiscount || '',
        items: (po.items || []).map(i => ({
          productId: i.productId,
          name: i.product?.name || (mapped.find(m => m.productId === i.productId)?.name || ''),
          quantity: i.quantity,
          rate: i.rate,
          tax: i.tax || 0,
          discount: i.discount || 0,
          unit: i.product?.unitValue ? (i.product?.unit?.name || 'KG') : 'KG'
        }))
      });
      setSelectedPO(null);
      setViewingPO(null);
      setShowForm(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load data for editing');
    }
  };

  const handleDeletePO = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Purchase Order?')) return;
    try {
      await procurementAPI.deletePurchaseOrder(id);
      toast.success('Purchase Order deleted');
      loadPOs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting PO');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isNewVendor) {
      if (!inlineVendor.vendorName || !inlineVendor.mobile) {
        return toast.error('Vendor Name and Mobile Number are required for onboarding');
      }
    } else {
      if (!form.vendorId) {
        return toast.error('Select a vendor to continue');
      }
    }

    if (form.items.length === 0) {
      return toast.error('Select or add at least one item');
    }

    try {
      let finalVendorId = form.vendorId;

      if (isNewVendor) {
        // Automatically register vendor inline in the background
        const { data: newV } = await procurementAPI.createVendor({
          vendorName: inlineVendor.vendorName,
          mobile: inlineVendor.mobile,
          contactPerson: '',
          address: inlineVendor.address || 'Direct Market',
          gstNumber: inlineVendor.gstNumber || 'N/A',
          creditDays: 30,
          openingBalance: 0
        });
        finalVendorId = newV.id;
        toast.success(`Vendor '${inlineVendor.vendorName}' successfully onboarded!`);
      }

      // Upload any local File attachments to server storage
      const uploadedUrls = {};
      const uploadKeys = ['vendorQuotations', 'bills', 'supportingDocs'];
      let uploadToastId = null;

      const filesToUpload = uploadKeys.filter(k => attachments[k] instanceof File);
      if (filesToUpload.length > 0) {
        uploadToastId = toast.loading('Uploading attachments...');
      }

      for (const key of uploadKeys) {
        if (attachments[key] instanceof File) {
          const file = attachments[key];
          const formData = new FormData();
          formData.append('image', file);
          formData.append('folder', 'po_attachments');
          try {
            const { data } = await adminAPI.uploadProductImage(formData);
            uploadedUrls[key] = {
              name: file.name,
              url: data.data?.url || data.url
            };
          } catch (uploadErr) {
            console.error(`Failed to upload ${key}`, uploadErr);
            toast.error(`Failed to upload attachment: ${file.name}`);
          }
        } else if (attachments[key] && attachments[key].url) {
          uploadedUrls[key] = attachments[key];
        }
      }

      if (uploadToastId) {
        toast.dismiss(uploadToastId);
      }

      const payload = {
        storeId: storeId || undefined,
        vendorId: finalVendorId,
        poDate: form.poDate,
        expectedDelivery: form.expectedDelivery || null,
        remarks: form.remarks,
        items: form.items.map(i => ({ productId: i.productId, quantity: parseInt(i.quantity), rate: parseFloat(i.landingPrice || i.rate || 0), mrp: parseFloat(i.mrp || 0), landingPrice: parseFloat(i.landingPrice || i.rate || 0), sellingPrice: parseFloat(i.sellingPrice || 0), tax: parseFloat(i.tax || 0), discount: parseFloat(i.discount || 0) })),
        poType: poType,
        taxDiscount: form.taxDiscount,
        attachments: uploadedUrls
      };

      if (form.id) {
        await procurementAPI.updatePurchaseOrder(form.id, payload);
        toast.success('Purchase Order updated successfully!');
      } else {
        await procurementAPI.createPurchaseOrder(payload);
        if (!isSubmitDraft) {
          toast.success('Purchase Order Created successfully!');
        } else {
          toast.success('Purchase Order Draft Saved successfully!');
        }
      }

      setShowForm(false);
      setForm({ vendorId: '', poDate: format(new Date(), 'yyyy-MM-dd'), expectedDelivery: '', remarks: '', items: [], taxDiscount: '' });
      setAttachments({ vendorQuotations: null, bills: null, supportingDocs: null });
      setIsNewVendor(false);
      setInlineVendor({ vendorName: '', mobile: '', gstNumber: '', address: '' });
      loadPOs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving PO');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await procurementAPI.updatePOStatus(id, { status });
      toast.success(`PO status updated to ${statusLabel[status] || status}`);
      loadPOs();
    } catch { toast.error('Failed to update status'); }
  };

  const handleViewDetails = async (po) => {
    setLoadingPO(true);
    setSelectedPO(po);
    try {
      const { data } = await procurementAPI.getPurchaseOrderById(po.id);
      setViewingPO(data);
    } catch {
      toast.error('Failed to load purchase order details');
      setSelectedPO(null);
    } finally {
      setLoadingPO(false);
    }
  };

  const downloadPO_PDF = (po) => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const now = format(new Date(), 'dd MMM yyyy, hh:mm a');
      const poNum = po.displayId || po.id.slice(-6).toUpperCase();

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 35, 'F');

      doc.setFillColor(16, 185, 129);
      doc.rect(0, 35, 210, 1.5, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('VILLAGKART', 15, 18);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('PREMIUM FRESH PRODUCE & GROCERIES DIRECTLY FROM VILLAGES', 15, 24);

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('PURCHASE ORDER', 195, 18, { align: 'right' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`#${poNum}`, 195, 24, { align: 'right' });

      let y = 48;
      doc.setTextColor(30, 41, 59);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('ORDER TO (VENDOR):', 15, y);
      doc.text('SHIP TO (BRANCH):', 110, y);

      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(po.vendor?.vendorName || 'N/A', 15, y);
      doc.text(po.store?.name || 'VillagKart Hub', 110, y);

      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);

      doc.text(`Mobile: ${po.vendor?.mobile || 'N/A'}`, 15, y);
      doc.text(`Address: ${po.store?.address || 'Main Storage Hub'}`, 110, y);

      y += 4.5;
      doc.text(`GSTIN: ${po.vendor?.gstNumber || 'N/A'}`, 15, y);
      doc.text(`Contact: ${po.store?.contactPhone || 'N/A'}`, 110, y);

      y += 4.5;
      doc.text(`Address: ${po.vendor?.address || 'N/A'}`, 15, y);

      y += 12;
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y - 5, 180, 14, 'F');
      doc.setDrawColor(241, 245, 249);
      doc.rect(15, y - 5, 180, 14, 'D');

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('PO NUMBER', 20, y);
      doc.text('DATE CREATED', 65, y);
      doc.text('EXPECTED DELIVERY', 115, y);
      doc.text('LIFECYCLE STATUS', 160, y);

      y += 5.5;
      doc.setFont('helvetica', 'normal');
      doc.text(`#${poNum}`, 20, y);
      doc.text(format(new Date(po.poDate), 'dd MMM yyyy'), 65, y);
      doc.text(po.expectedDelivery ? format(new Date(po.expectedDelivery), 'dd MMM yyyy') : 'N/A', 115, y);
      doc.text(statusLabel[po.status] || po.status, 160, y);

      y += 16;

      doc.setFillColor(241, 245, 249);
      doc.rect(15, y - 5, 180, 8, 'F');

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text('S.No.', 18, y);
      doc.text('ITEM DESCRIPTION', 35, y);
      doc.text('RATE (INR)', 110, y, { align: 'right' });
      doc.text('QTY (UNITS)', 145, y, { align: 'right' });
      doc.text('SUBTOTAL', 190, y, { align: 'right' });

      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      (po.items || []).forEach((item, index) => {
        if (index % 2 === 1) {
          doc.setFillColor(250, 250, 250);
          doc.rect(15, y - 4.5, 180, 6.5, 'F');
        }

        doc.setTextColor(51, 65, 85);
        doc.text(String(index + 1), 18, y);
        doc.setFont('helvetica', 'bold');
        let desc = item.product?.name || 'N/A';
        if (item.tax || item.discount) {
          desc += ` (Tax: ${item.tax || 0}%, Disc: ${item.discount || 0}%)`;
        }
        drawUnicodeText(doc, desc, 35, y, { fontSize: 8, isBold: true, color: [51, 65, 85] });
        doc.setFont('helvetica', 'normal');

        doc.text(`Rs ${item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 110, y, { align: 'right' });
        doc.text(String(item.quantity), 145, y, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.text(`Rs ${item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 190, y, { align: 'right' });
        doc.setFont('helvetica', 'normal');

        y += 6.5;

        if (y > 260) {
          doc.addPage();
          y = 30;

          doc.setFillColor(241, 245, 249);
          doc.rect(15, y - 5, 180, 8, 'F');

          doc.setTextColor(30, 41, 59);
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'bold');
          doc.text('S.No.', 18, y);
          doc.text('ITEM DESCRIPTION', 35, y);
          doc.text('RATE (INR)', 110, y, { align: 'right' });
          doc.text('QTY (UNITS)', 145, y, { align: 'right' });
          doc.text('SUBTOTAL', 190, y, { align: 'right' });

          y += 6;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
        }
      });

      y += 4;
      doc.setDrawColor(241, 245, 249);
      doc.line(15, y, 195, y);
      y += 6;

      const totalTax = po.items?.reduce((sum, i) => {
        const base = i.quantity * i.rate;
        const disc = base * ((i.discount || 0) / 100);
        return sum + ((base - disc) * ((i.tax || 0) / 100));
      }, 0) || 0;

      const totalDisc = po.items?.reduce((sum, i) => sum + ((i.quantity * i.rate) * ((i.discount || 0) / 100)), 0) || 0;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);

      doc.text('Total Discount Amount:', 135, y);
      doc.text(`Rs ${totalDisc.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 190, y, { align: 'right' });

      y += 4.5;
      doc.text('Total GST / Tax Amount:', 135, y);
      doc.text(`Rs ${totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 190, y, { align: 'right' });

      y += 6.5;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('FINAL PO VALUE:', 135, y);
      doc.setTextColor(16, 185, 129);
      doc.text(`Rs ${po.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 190, y, { align: 'right' });

      y += 12;
      if (po.remarks) {
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('REMARKS / SPECIAL INSTRUCTIONS:', 15, y);
        y += 4.5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        const splitRemarks = doc.splitTextToSize(po.remarks, 180);
        doc.text(splitRemarks, 15, y);
        y += splitRemarks.length * 4.5;
      }

      y = Math.max(y + 15, 245);
      doc.setDrawColor(226, 232, 240);
      doc.line(15, y, 65, y);
      doc.line(145, y, 195, y);

      y += 4.5;
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Authorized By', 15, y);
      doc.text('Vendor Partner Sign', 145, y);

      const pages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${i} of ${pages}  |  VillagKart Enterprise Purchase Order  |  Printed: ${now}`, 105, 287, { align: 'center' });
      }

      doc.save(`PO_${poNum}_${format(new Date(), 'dd_MMM_yyyy')}.pdf`);
      toast.success('Purchase Order PDF downloaded');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to export PDF');
    }
  };

  const poTotal = form.items.reduce((s, i) => {
    const qty = parseFloat(i.quantity || 0);
    const rate = parseFloat(i.rate || 0);
    const discount = parseFloat(i.discount || 0);
    const tax = parseFloat(i.tax || 0);
    const baseVal = qty * rate;
    const discVal = baseVal * (discount / 100);
    const taxVal = (baseVal - discVal) * (tax / 100);
    return s + (baseVal - discVal + taxVal);
  }, 0);

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4 overflow-hidden">
      {selectedPO ? (
        <div className="flex-col flex-1 min-h-0 bg-[#f8fafc] p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar animate-in fade-in duration-300 relative flex">
          {/* Header Navigation with back button */}
          <div className="flex items-center gap-5 border-b border-slate-200/85 pb-5 mb-2 shrink-0">
            <button
              onClick={() => { setSelectedPO(null); setViewingPO(null); }}
              className="p-3 bg-white hover:bg-slate-100 text-slate-700 rounded-2xl border border-slate-200 transition-all shadow-sm active:scale-95 shrink-0"
              type="button"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {viewingPO?.status === 'CREATED' ? 'Review Purchase Order' : 'View Purchase Order'}
              </h1>
              <p className="text-sm text-slate-500">
                {viewingPO?.status === 'CREATED'
                  ? 'Verify procurement details before approving vendor order.'
                  : 'Review complete purchase order details and procurement summary.'}
              </p>
            </div>
          </div>

          {/* Scrollable details content */}
          <div className="flex-1 space-y-6">
            {loadingPO ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <Loader2 className="animate-spin text-emerald-600" size={36} />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Fetching PO details...</p>
              </div>
            ) : viewingPO ? (
              viewingPO.status === 'CREATED' ? (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* Basic Details Section */}
                  <div className="bg-white rounded-2xl border border-slate-200/60 p-6 md:p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <FileText size={18} className="text-emerald-600" />
                      <h2 className="text-xs font-black uppercase tracking-widest text-slate-900">Basic Details</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">PO Number</span>
                        <p className="text-lg font-black text-slate-900">
                          #{viewingPO.displayId || `PO-VK-2026-${String(viewingPO.poNumber).padStart(5, '0')}`}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Vendor</span>
                        <p className="text-sm font-black text-slate-800">
                          {viewingPO.vendor?.vendorName}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Expected Delivery Date</span>
                        <p className="text-sm font-bold text-slate-700">
                          {viewingPO.expectedDelivery ? format(new Date(viewingPO.expectedDelivery), 'dd-MM-yyyy') : 'N/A'}
                        </p>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Terms & Conditions / Notes</span>
                        <p className="text-xs font-semibold text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                          {viewingPO.remarks || 'Payment within 30 days. No return policy for perishable goods.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Items Section */}
                  <div className="bg-white rounded-2xl border border-slate-200/60 p-6 md:p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <ClipboardList size={18} className="text-emerald-600" />
                      <h2 className="text-xs font-black uppercase tracking-widest text-slate-900">Items</h2>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-6 py-3.5 text-xs font-black text-slate-600 uppercase tracking-wider text-center">SKU</th>
                            <th className="px-6 py-3.5 text-xs font-black text-slate-600 uppercase tracking-wider">Product Name</th>
                            <th className="px-6 py-3.5 text-xs font-black text-slate-600 uppercase tracking-wider text-center">Quantity</th>
                            <th className="px-6 py-3.5 text-xs font-black text-slate-600 uppercase tracking-wider text-center">MRP</th>
                            <th className="px-6 py-3.5 text-xs font-black text-slate-600 uppercase tracking-wider text-center">Landing Price</th>
                            <th className="px-6 py-3.5 text-xs font-black text-slate-600 uppercase tracking-wider text-center">Selling Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {viewingPO.items?.map((item) => {
                            const targetProd = (preloadedProducts || []).find(p => 
                              (p.id && (p.id === item.productId || p.id === item.product?.id || p.id === item.product_id)) ||
                              (p.name && (item.product?.name || item.name) && p.name.trim().toLowerCase() === (item.product?.name || item.name).trim().toLowerCase())
                            );

                            const rawSku = 
                              (item.product?.skuCode && item.product.skuCode !== 'NO-SKU') ? item.product.skuCode :
                              (item.product?.sku && item.product.sku !== 'NO-SKU') ? item.product.sku :
                              (item.skuCode && item.skuCode !== 'NO-SKU') ? item.skuCode :
                              (item.sku && item.sku !== 'NO-SKU') ? item.sku :
                              (item.vendorSku && item.vendorSku !== 'NO-SKU') ? item.vendorSku :
                              (targetProd?.skuCode && targetProd.skuCode !== 'NO-SKU') ? targetProd.skuCode :
                              (targetProd?.sku && targetProd.sku !== 'NO-SKU') ? targetProd.sku :
                              (targetProd?.vendorSku && targetProd.vendorSku !== 'NO-SKU') ? targetProd.vendorSku :
                              null;

                            const skuDisplay = (!rawSku || rawSku === 'NO-SKU' || rawSku === 'N/A' || rawSku.trim() === '') ? '-' : rawSku;
                            const mapItem = (mappedItems || []).find(m => (m.productId || m.id) === (item.productId || item.product?.id));
                            const mrp = item.mrp > 0 ? item.mrp : (mapItem?.mrp > 0 ? mapItem.mrp : (mapItem?.moq > 0 ? mapItem.moq : (item.product?.mrp > 0 ? item.product.mrp : (item.product?.price > 0 ? item.product.price : (targetProd?.mrp > 0 ? targetProd.mrp : (targetProd?.price || 0))))));
                            const landingPrice = item.landingPrice > 0 ? item.landingPrice : (mapItem?.landingPrice > 0 ? mapItem.landingPrice : (mapItem?.leadTime > 0 ? mapItem.leadTime : (item.rate > 0 ? item.rate : (item.product?.landingPrice > 0 ? item.product.landingPrice : (item.product?.purchasePrice > 0 ? item.product.purchasePrice : (targetProd?.landingPrice || targetProd?.purchasePrice || 0))))));
                            const sellingPrice = item.sellingPrice > 0 ? item.sellingPrice : (mapItem?.sellingPrice > 0 ? mapItem.sellingPrice : (mapItem?.purchasePrice > 0 ? mapItem.purchasePrice : (item.product?.sellingPrice > 0 ? item.product.sellingPrice : (item.product?.price > 0 ? item.product.price : (targetProd?.sellingPrice > 0 ? targetProd.sellingPrice : (targetProd?.price || 0))))));
                            const qty = item.quantity ?? 1;
                            const unit = item.uom || mapItem?.uom || 'PACK';

                            return (
                              <tr key={item.id || item.productId} className="hover:bg-slate-50/20 transition-all duration-150">
                                <td className="px-6 py-4 text-center text-xs font-bold text-slate-400">{skuDisplay}</td>
                                <td className="px-6 py-4 text-sm font-black text-slate-800 tracking-tight">{item.product?.name || item.name}</td>
                                <td className="px-6 py-4 text-center text-sm font-bold text-slate-800">{qty} {unit}</td>
                                <td className="px-6 py-4 text-center text-sm font-bold text-slate-700">₹{Number(mrp).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="px-6 py-4 text-center text-sm font-black text-slate-700">₹{Number(landingPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="px-6 py-4 text-center text-sm font-bold text-slate-700">₹{Number(sellingPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                      <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Purchase Value</span>
                      <span className="text-xl font-black text-emerald-600">
                        ₹{viewingPO.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Attachments Section */}
                  <div className="bg-white rounded-2xl border border-slate-200/60 p-6 md:p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <Paperclip size={18} className="text-emerald-600" />
                      <h2 className="text-xs font-black uppercase tracking-widest text-slate-900">Attachments</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="border border-slate-200/60 rounded-xl p-5 flex flex-col justify-between min-h-[120px] bg-slate-50/20">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Vendor Quotations</span>
                          {viewingPO.attachments?.vendorQuotations?.url ? (
                            <div className="flex items-center gap-2.5">
                              <FileText size={18} className="text-emerald-600 animate-pulse" />
                              <span className="text-xs font-semibold text-slate-700 truncate max-w-[150px]">{viewingPO.attachments.vendorQuotations.name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No File Uploaded</span>
                          )}
                        </div>
                        {viewingPO.attachments?.vendorQuotations?.url && (
                          <a
                            href={viewingPO.attachments.vendorQuotations.url.startsWith('http') ? viewingPO.attachments.vendorQuotations.url : `${API_URL.replace(/\/api\/?$/, '')}${viewingPO.attachments.vendorQuotations.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-black text-emerald-600 hover:underline mt-4 flex items-center gap-1 w-max"
                          >
                            <Download size={10} /> Download
                          </a>
                        )}
                      </div>

                      <div className="border border-slate-200/60 rounded-xl p-5 flex flex-col justify-between min-h-[120px] bg-slate-50/20">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Bills</span>
                          {viewingPO.attachments?.bills?.url ? (
                            <div className="flex items-center gap-2.5">
                              <FileText size={18} className="text-emerald-600 animate-pulse" />
                              <span className="text-xs font-semibold text-slate-700 truncate max-w-[150px]">{viewingPO.attachments.bills.name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No File Uploaded</span>
                          )}
                        </div>
                        {viewingPO.attachments?.bills?.url && (
                          <a
                            href={viewingPO.attachments.bills.url.startsWith('http') ? viewingPO.attachments.bills.url : `${API_URL.replace(/\/api\/?$/, '')}${viewingPO.attachments.bills.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-black text-emerald-600 hover:underline mt-4 flex items-center gap-1 w-max"
                          >
                            <Download size={10} /> Download
                          </a>
                        )}
                      </div>

                      <div className="border border-slate-200/60 rounded-xl p-5 flex flex-col justify-between min-h-[120px] bg-slate-50/20">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Supporting Documents</span>
                          {viewingPO.attachments?.supportingDocs?.url ? (
                            <div className="flex items-center gap-2.5">
                              <FileText size={18} className="text-emerald-600 animate-pulse" />
                              <span className="text-xs font-semibold text-slate-700 truncate max-w-[150px]">{viewingPO.attachments.supportingDocs.name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No File Uploaded</span>
                          )}
                        </div>
                        {viewingPO.attachments?.supportingDocs?.url && (
                          <a
                            href={viewingPO.attachments.supportingDocs.url.startsWith('http') ? viewingPO.attachments.supportingDocs.url : `${API_URL.replace(/\/api\/?$/, '')}${viewingPO.attachments.supportingDocs.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-black text-emerald-600 hover:underline mt-4 flex items-center gap-1 w-max"
                          >
                            <Download size={10} /> Download
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Status & Metadata card */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">PO Number</span>
                      <p className="text-xs font-black text-slate-900">
                        {viewingPO.displayId || `PO-VK-2026-${String(viewingPO.poNumber).padStart(5, '0')}`}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">ID</span>
                      <p className="text-xs font-bold text-slate-500 uppercase">
                        {viewingPO.id.slice(-6).toUpperCase()}
                      </p>
                    </div>
                    <div className="space-y-1 col-span-2 md:col-span-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Vendor</span>
                      <p className="text-xs font-black text-slate-900 truncate">
                        {viewingPO.vendor?.vendorName}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Order Date</span>
                      <p className="text-xs font-black text-slate-700">
                        {format(new Date(viewingPO.poDate), 'dd MMM yyyy')}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Expected Delivery</span>
                      <p className="text-xs font-black text-slate-700">
                        {viewingPO.expectedDelivery ? format(new Date(viewingPO.expectedDelivery), 'dd MMM yyyy') : 'N/A'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Status</span>
                      <div className="pt-0.5">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${statusBadgeStyles[viewingPO.status] || ''}`}>
                          {statusLabel[viewingPO.status] || viewingPO.status}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1 col-span-2 md:col-span-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Value</span>
                      <p className="text-sm font-black text-emerald-650">
                        ₹{viewingPO.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {/* Vendor & Hub Details cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Vendor Information Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <Users size={16} className="text-emerald-650 animate-pulse" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Vendor Information</h3>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-450">Name:</span>
                          <span className="font-bold text-slate-800 text-right">{viewingPO.vendor?.vendorName}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-450">Contact:</span>
                          <span className="font-bold text-slate-800 text-right">{viewingPO.vendor?.mobile || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-450">GST:</span>
                          <span className="font-bold text-slate-800 text-right uppercase">{viewingPO.vendor?.gstNumber || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-xs gap-4">
                          <span className="font-medium text-slate-450 shrink-0">Address:</span>
                          <span className="font-bold text-slate-800 text-right break-words">{viewingPO.vendor?.address || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Terms & Conditions Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm space-y-4 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                          <FileText size={16} className="text-emerald-650" />
                          <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Terms & Conditions</h3>
                        </div>
                        <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                          Payment within 15 days. Organic certification required.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                  {/* Notes Card */}
                  <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <Paperclip size={16} className="text-emerald-650" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Notes</h3>
                    </div>
                    <p className="text-xs font-medium text-slate-650 leading-relaxed italic">
                      "{viewingPO.remarks || 'Verified organic supplier.'}"
                    </p>
                  </div>
                </div>

                {/* Purchase Items Breakdown Table */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-455 pl-1">Purchase Items</h3>
                  <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100 whitespace-nowrap">
                            <th className="px-6 py-3 text-[9px] font-black text-slate-455 uppercase tracking-widest text-center">SKU</th>
                            <th className="px-6 py-3 text-[9px] font-black text-slate-455 uppercase tracking-widest text-left">Procurement Item</th>
                            <th className="px-6 py-3 text-[9px] font-black text-slate-455 uppercase tracking-widest text-center">Quantity</th>
                            <th className="px-6 py-3 text-[9px] font-black text-slate-455 uppercase tracking-widest text-center">MRP</th>
                            <th className="px-6 py-3 text-[9px] font-black text-slate-455 uppercase tracking-widest text-center">Landing Price</th>
                            <th className="px-6 py-3 text-[9px] font-black text-slate-455 uppercase tracking-widest text-center">Selling Price</th>
                            <th className="px-6 py-3 text-[9px] font-black text-slate-455 uppercase tracking-widest text-right">Total Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {viewingPO.items?.map((item) => {
                            const targetProd = (preloadedProducts || []).find(p => 
                              (p.id && (p.id === item.productId || p.id === item.product?.id || p.id === item.product_id)) ||
                              (p.name && (item.product?.name || item.name) && p.name.trim().toLowerCase() === (item.product?.name || item.name).trim().toLowerCase())
                            );

                            const rawSku = 
                              (item.product?.skuCode && item.product.skuCode !== 'NO-SKU') ? item.product.skuCode :
                              (item.product?.sku && item.product.sku !== 'NO-SKU') ? item.product.sku :
                              (item.skuCode && item.skuCode !== 'NO-SKU') ? item.skuCode :
                              (item.sku && item.sku !== 'NO-SKU') ? item.sku :
                              (item.vendorSku && item.vendorSku !== 'NO-SKU') ? item.vendorSku :
                              (targetProd?.skuCode && targetProd.skuCode !== 'NO-SKU') ? targetProd.skuCode :
                              (targetProd?.sku && targetProd.sku !== 'NO-SKU') ? targetProd.sku :
                              (targetProd?.vendorSku && targetProd.vendorSku !== 'NO-SKU') ? targetProd.vendorSku :
                              null;

                            const skuDisplay = (!rawSku || rawSku === 'NO-SKU' || rawSku === 'N/A' || rawSku.trim() === '') ? '-' : rawSku;
                            const mapItem = (mappedItems || []).find(m => (m.productId || m.id) === (item.productId || item.product?.id));
                            const mrp = item.mrp > 0 ? item.mrp : (mapItem?.mrp > 0 ? mapItem.mrp : (mapItem?.moq > 0 ? mapItem.moq : (item.product?.mrp > 0 ? item.product.mrp : (item.product?.price > 0 ? item.product.price : (targetProd?.mrp > 0 ? targetProd.mrp : (targetProd?.price || 0))))));
                            const landingPrice = item.landingPrice > 0 ? item.landingPrice : (mapItem?.landingPrice > 0 ? mapItem.landingPrice : (mapItem?.leadTime > 0 ? mapItem.leadTime : (item.rate > 0 ? item.rate : (item.product?.landingPrice > 0 ? item.product.landingPrice : (item.product?.purchasePrice > 0 ? item.product.purchasePrice : (targetProd?.landingPrice || targetProd?.purchasePrice || 0))))));
                            const sellingPrice = item.sellingPrice > 0 ? item.sellingPrice : (mapItem?.sellingPrice > 0 ? mapItem.sellingPrice : (mapItem?.purchasePrice > 0 ? mapItem.purchasePrice : (item.product?.sellingPrice > 0 ? item.product.sellingPrice : (item.product?.price > 0 ? item.product.price : (targetProd?.sellingPrice > 0 ? targetProd.sellingPrice : (targetProd?.price || 0))))));
                            const qty = item.quantity ?? 1;
                            const unit = item.uom || mapItem?.uom || 'PACK';
                            const totalValuation = item.total ?? ((landingPrice || 0) * qty);

                            return (
                              <tr key={item.id || item.productId} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-3.5 text-center text-xs font-medium text-slate-400">{skuDisplay}</td>
                                <td className="px-6 py-3.5 text-xs font-black text-slate-900 tracking-tight">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span>{item.product?.name || item.name}</span>
                                    {(item.product?.variantName || item.variantName || item.productVariant?.variantName) && (
                                      <span className="bg-purple-50 text-purple-700 border border-purple-200/60 px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider">
                                        {item.product?.variantName || item.variantName || item.productVariant?.variantName}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-3.5 text-center text-xs font-bold text-slate-800">{qty} {unit}</td>
                                <td className="px-6 py-3.5 text-center text-xs font-bold text-slate-700">₹{Number(mrp).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="px-6 py-3.5 text-center text-xs font-bold text-slate-700">₹{Number(landingPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="px-6 py-3.5 text-center text-xs font-bold text-slate-700">₹{Number(sellingPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="px-6 py-3.5 text-right text-xs font-black text-slate-900">₹{Number(totalValuation).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Items Totals Breakdown Summary Sheet */}
                    <div className="bg-slate-50 border-t border-slate-200/60 p-6 grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-xs font-semibold text-slate-655">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Total Items</span>
                        <span className="text-sm font-black text-slate-900">
                          {viewingPO.items?.length || 0}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Total Quantity</span>
                        <span className="text-sm font-black text-slate-900">
                          {viewingPO.items?.reduce((sum, i) => sum + i.quantity, 0) || 0}
                        </span>
                      </div>
                      <div className="space-y-1 col-span-2 md:col-span-1 border-t md:border-t-0 md:border-l border-slate-200/80 pt-3 md:pt-0 md:pl-6 text-right md:text-left">
                        <span className="text-[9px] font-bold text-emerald-650 uppercase tracking-widest block">Final Purchase Value</span>
                        <span className="text-sm font-black text-emerald-650 tracking-tighter">
                          ₹{viewingPO.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                  {/* Attachments Section */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-455 pl-1">Attachments</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {viewingPO.attachments && Object.values(viewingPO.attachments).some(att => att && att.url) ? (
                        Object.entries(viewingPO.attachments).map(([key, attachment]) => {
                          if (!attachment || !attachment.url) return null;
                          const labelMap = {
                            vendorQuotations: viewingPO.poType === 'DIRECT' ? 'Market Bills' : 'Vendor Quotations',
                            bills: viewingPO.poType === 'DIRECT' ? 'Vendor Quotations' : 'Bills',
                            supportingDocs: 'Supporting Documents'
                          };
                          return (
                            <div key={key} className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm flex flex-col justify-between hover:border-emerald-500 hover:shadow-md transition-all group">
                              <div className="space-y-2">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                                  {labelMap[key] || key}
                                </span>
                                <div className="flex items-center gap-2.5">
                                  <FileText size={20} className="text-slate-400 group-hover:text-emerald-650 transition-colors" />
                                  <span className="text-xs font-black text-slate-700 truncate max-w-[180px]">
                                    {attachment.name}
                                  </span>
                                </div>
                              </div>
                              <a
                                href={attachment.url.startsWith('http') ? attachment.url : `${API_URL.replace(/\/api\/?$/, '')}${attachment.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-black text-emerald-650 hover:underline mt-4 flex items-center gap-1 w-max"
                              >
                                <Download size={10} /> Download
                              </a>
                            </div>
                          );
                        })
                      ) : (
                        <div className="col-span-full bg-slate-50 rounded-2xl border border-slate-200/40 p-6 text-center space-y-1.5 shadow-sm">
                          <FileText size={24} className="text-slate-400 mx-auto" />
                          <p className="text-xs font-bold text-slate-500">No Attachments Uploaded</p>
                          <p className="text-[10px] text-slate-400 font-medium">This Purchase Order does not have any attached bills, quotations, or supporting documents.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )) : null}
          </div>

          {/* Footer - Permanently Docked */}
          {viewingPO && (
            <div className="bg-white border-t border-slate-200 px-8 py-5 flex items-center justify-between shadow-[0_-15px_30px_-15px_rgba(0,0,0,0.05)] shrink-0 rounded-b-3xl">
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Total Valuation</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-black text-emerald-650">₹</span>
                  <span className="text-lg font-black text-slate-900 tracking-tighter">{viewingPO.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {viewingPO.status === 'CREATED' && (
                  <button 
                    onClick={() => {
                      const poToEdit = viewingPO;
                      setSelectedPO(null);
                      setViewingPO(null);
                      handleEdit(poToEdit);
                    }}
                    className="h-10 px-5 bg-amber-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-amber-600 transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Edit3 size={14} strokeWidth={2.5} /> Edit PO
                  </button>
                )}
                {viewingPO.status === 'CREATED' ? (
                  <>
                    <button
                      onClick={() => { updateStatus(viewingPO.id, 'CANCELLED'); setSelectedPO(null); setViewingPO(null); }}
                      className="h-10 px-5 bg-rose-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <X size={14} strokeWidth={3} /> Reject
                    </button>
                    <button
                      onClick={() => { setSelectedPO(null); setViewingPO(null); }}
                      className="h-10 px-5 bg-white text-slate-700 rounded-xl border border-slate-200 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                    >
                      Save Draft
                    </button>
                    {can('PROCUREMENT', 'UPDATE', 'PO') && (
                      <button
                        onClick={() => { updateStatus(viewingPO.id, 'APPROVED'); setSelectedPO(null); setViewingPO(null); }}
                        className="h-10 px-6 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <Check size={14} strokeWidth={3} /> Approve PO
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => downloadPO_PDF(viewingPO)}
                      className="h-10 px-4 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Download size={14} /> Download PDF
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      ) : showTypeSelection ? (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50 rounded-3xl p-8 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-10 shrink-0">
            <button
              onClick={() => setShowTypeSelection(false)}
              className="p-3 bg-white hover:bg-slate-100 text-slate-700 rounded-2xl border border-slate-200 transition-all shadow-sm active:scale-95"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Choose Order Type</h1>
              <p className="text-sm text-slate-500">Select how you want to create your purchase order.</p>
            </div>
          </div>

          {/* Type Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            {/* Direct PO Card */}
            <div
              onClick={() => handleSelectPoType('DIRECT')}
              className="group bg-white p-8 rounded-3xl border border-slate-200/80 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 cursor-pointer flex flex-col justify-between h-[280px] relative overflow-hidden"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-sm">
                  <Plus size={24} strokeWidth={2.5} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                    Direct Purchase Order
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Create purchase orders directly with standard line items, perfect for local market purchases and spot procurement.
                  </p>
                </div>
              </div>
              <div className="flex items-center text-xs font-bold text-emerald-600 tracking-wider uppercase gap-2 group-hover:translate-x-1 transition-transform">
                <span>Create Direct PO</span>
                <span>→</span>
              </div>
            </div>

            {/* PO Against Requisition Card */}
            <div
              onClick={() => handleSelectPoType('REQUISITION')}
              className="group bg-white p-8 rounded-3xl border border-slate-200/80 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 cursor-pointer flex flex-col justify-between h-[280px] relative overflow-hidden"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-sm">
                  <ClipboardList size={24} strokeWidth={2.5} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                    PO Against Requisition
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Select products from registered vendors with predefined item mappings and negotiated rates for regular replenishment.
                  </p>
                </div>
              </div>
              <div className="flex items-center text-xs font-bold text-emerald-600 tracking-wider uppercase gap-2 group-hover:translate-x-1 transition-transform">
                <span>Select Mapped Items</span>
                <span>→</span>
              </div>
            </div>
          </div>
        </div>
      ) : !showForm ? (
        <>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shrink-0">
            <div className="flex flex-wrap items-center gap-3 flex-1 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-gray-100 shadow-sm flex-1 md:max-w-md focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
                <Search size={16} className="text-gray-400" />
                <input
                  placeholder="Search PO # or Vendor"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="bg-transparent border-none focus:outline-none text-xs font-bold text-gray-700 w-full placeholder:text-gray-400"
                />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {TABS.map(tab => (
                  <button key={tab.label} onClick={() => setStatusFilter(tab.value)}
                    className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all ${statusFilter === tab.value ? 'bg-slate-900 text-white border border-slate-900 shadow-lg shadow-slate-900/10' : 'bg-white text-slate-500 border border-gray-100 hover:border-gray-200 hover:bg-gray-50 shadow-sm'
                      }`}>{tab.label}</button>
                ))}
              </div>
            </div>
            <button onClick={() => { setForm({ vendorId: '', poDate: format(new Date(), 'yyyy-MM-dd'), expectedDelivery: '', remarks: '', items: [], taxDiscount: '' }); setAttachments({ vendorQuotations: null, bills: null, supportingDocs: null }); setPoType(null); setShowTypeSelection(true); }}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-emerald-600/20 shrink-0">
              <Plus size={16} strokeWidth={3} /> New Purchase Order
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-emerald-600" size={40} /></div>
          ) : pos.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 border border-dashed border-gray-200 text-center">
              <ClipboardList size={48} className="mx-auto text-gray-200 mb-3" />
              <h3 className="text-lg font-black text-gray-300">No Purchase Orders</h3>
            </div>
          ) : (
            <div className="flex-1 bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-0">
              <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1 w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 whitespace-nowrap">
                    <th className="py-4 px-6 text-xs font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">PO Number</th>
                    <th className="py-4 px-6 text-xs font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">Vendor</th>
                    <th className="py-4 px-6 text-xs font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">Order Date</th>
                    <th className="py-4 px-6 text-xs font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">Total Value</th>
                    <th className="py-4 px-6 text-xs font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">Status</th>
                    <th className="py-4 px-6 text-xs font-black text-gray-400 uppercase tracking-wider text-right sticky right-0 bg-[#f8fafc] z-20 shadow-[-10px_0_10px_-3px_rgba(0,0,0,0.05)] whitespace-nowrap min-w-[280px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pos.filter(po => {
                    const searchLower = search.toLowerCase();
                    const poNumStr = po.displayId?.toString() || '';
                    const vendorStr = po.vendor?.vendorName || '';
                    const poIdStr = po.id?.toString() || '';
                    
                    return !search || 
                      poNumStr.toLowerCase().includes(searchLower) || 
                      vendorStr.toLowerCase().includes(searchLower) ||
                      poIdStr.toLowerCase().includes(searchLower);
                  }).map(po => (
                    <tr key={po.id} className="hover:bg-gray-50/50 transition-all group border-b border-gray-50 last:border-0">
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-gray-955 uppercase tracking-tight">#{po.displayId}</span>
                          <span className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase">ID: {po.id.slice(-6).toUpperCase()}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="text-sm font-black text-gray-900">{po.vendor?.vendorName}</span>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-600">{format(new Date(po.poDate), 'dd MMM yyyy')}</span>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="text-sm font-black text-gray-955">₹{po.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${statusBadgeStyles[po.status] || 'bg-gray-50 text-gray-500'}`}>
                          {statusLabel[po.status] || po.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-gray-50 transition-all z-20 shadow-[-10px_0_10px_-3px_rgba(0,0,0,0.05)] min-w-[280px]">
                        <div className="flex items-center justify-end gap-2">
                          {/* Edit PO: only allowed when status is CREATED */}
                          {po.status === 'CREATED' && (
                            <button
                              onClick={() => handleEdit(po)}
                              className="flex items-center gap-1 px-2.5 py-1.5 border border-amber-200 text-amber-600 hover:text-white hover:bg-amber-600 rounded-xl text-[10px] font-black uppercase tracking-wider bg-amber-50/50 transition-all shadow-sm active:scale-95"
                              title="Edit Purchase Order"
                            >
                              <Edit3 size={12} strokeWidth={2.5} /> Edit
                            </button>
                          )}

                          {/* View Details button */}
                          <button 
                            onClick={() => handleViewDetails(po)} 
                            className="flex items-center gap-1 px-2.5 py-1.5 border border-emerald-200 text-emerald-600 hover:text-white hover:bg-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-50/50 transition-all shadow-sm active:scale-95"
                            title={po.status === 'CREATED' ? 'Review & Approve PO' : 'View Details'}
                          >
                            <Eye size={12} /> {po.status === 'CREATED' ? 'Review / Approve' : 'View'}
                          </button>

                          {/* Download PDF button */}
                          <button 
                            onClick={() => downloadPO_PDF(po)} 
                            className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 text-gray-600 hover:text-emerald-600 hover:border-emerald-200 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white transition-all shadow-sm active:scale-95"
                            title="Download PDF"
                          >
                            <Download size={12} /> PDF
                          </button>

                          {/* Delete PO button */}
                          <button
                            onClick={() => handleDeletePO(po.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 border border-rose-200 text-rose-600 hover:text-white hover:bg-rose-600 rounded-xl text-[10px] font-black uppercase tracking-wider bg-rose-50/50 transition-all shadow-sm active:scale-95"
                            title="Delete Purchase Order"
                          >
                            <Trash2 size={12} strokeWidth={2.5} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col flex-1 min-h-0 bg-[#f8fafc] p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar animate-in fade-in duration-300 relative">
          {/* Internal Navigation Header */}
          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={() => {
                if (form.id) {
                  setShowForm(false);
                  setShowTypeSelection(false);
                } else {
                  setShowForm(false);
                  setShowTypeSelection(true);
                }
              }}
              className="p-3 bg-white hover:bg-slate-100 text-slate-700 rounded-2xl border border-slate-200 transition-all shadow-sm active:scale-95 shrink-0"
              type="button"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {form.id
                  ? 'Refine Purchase Order'
                  : poType === 'DIRECT'
                    ? 'Create Direct Purchase Order'
                    : 'Create PO Against Requisition'}
              </h1>
              <p className="text-sm text-slate-500">
                {form.id
                  ? 'Modify this draft purchase order details.'
                  : poType === 'DIRECT'
                    ? 'Create purchase orders for direct market procurement.'
                    : 'Create purchase orders using existing vendor-item mappings.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 space-y-6">
            {/* Scrollable Content Area */}
            <div className="space-y-6">

              {/* Basic Details Section */}
              <div className="bg-white rounded-xl border border-slate-200/60 p-6 md:p-8 space-y-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900">Basic Details</h2>
                  {poType === 'DIRECT' && can('PROCUREMENT', 'CREATE', 'VENDORS') && (
                    <button
                      type="button"
                      onClick={() => setIsNewVendor(!isNewVendor)}
                      className="text-xs font-black text-emerald-650 hover:text-emerald-700 hover:underline flex items-center gap-1 transition-all active:scale-95"
                    >
                      {isNewVendor ? (
                        <>Select Existing Vendor</>
                      ) : (
                        <><Plus size={14} strokeWidth={3} /> Add New Vendor</>
                      )}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                  {isNewVendor ? (
                    <>
                      {/* Vendor Name */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Vendor Name *</label>
                        <input
                          type="text"
                          required
                          value={inlineVendor.vendorName}
                          onChange={e => setInlineVendor({ ...inlineVendor, vendorName: e.target.value })}
                          placeholder="Enter vendor name"
                          className="w-full bg-white rounded-lg px-4 py-2.5 text-sm text-slate-800 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-sm"
                        />
                      </div>

                      {/* Mobile Number */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Mobile Number *</label>
                        <input
                          type="text"
                          required
                          value={inlineVendor.mobile}
                          onChange={e => setInlineVendor({ ...inlineVendor, mobile: e.target.value })}
                          placeholder="Enter mobile number"
                          className="w-full bg-white rounded-lg px-4 py-2.5 text-sm text-slate-800 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-sm"
                        />
                      </div>

                      {/* GST Number */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">GST Number</label>
                        <input
                          type="text"
                          value={inlineVendor.gstNumber}
                          onChange={e => setInlineVendor({ ...inlineVendor, gstNumber: e.target.value })}
                          placeholder="Enter GST number"
                          className="w-full bg-white rounded-lg px-4 py-2.5 text-sm text-slate-800 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-sm"
                        />
                      </div>

                      {/* Address */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Address</label>
                        <input
                          type="text"
                          value={inlineVendor.address}
                          onChange={e => setInlineVendor({ ...inlineVendor, address: e.target.value })}
                          placeholder="Enter address"
                          className="w-full bg-white rounded-lg px-4 py-2.5 text-sm text-slate-800 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-sm"
                        />
                      </div>
                    </>
                  ) : (
                    /* Select Existing Vendor Dropdown */
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Vendor *</label>
                      <select value={form.vendorId} onChange={e => onVendorSelect(e.target.value)}
                        className="w-full bg-white hover:bg-slate-50/50 rounded-lg px-4 py-2.5 text-sm text-slate-800 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-sm" required>
                        <option value="">Select vendor</option>
                        {vendors.map(v => <option key={v.id} value={v.id}>{v.vendorName}</option>)}
                      </select>
                    </div>
                  )}{/* Expected Delivery Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Expected Delivery Date</label>
                    <input type="date" value={form.expectedDelivery} onChange={e => setForm({ ...form, expectedDelivery: e.target.value })}
                      className="w-full bg-white rounded-lg px-4 py-2.5 text-sm text-slate-850 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-sm" required />
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Notes</label>
                    <textarea
                      rows={3}
                      value={form.remarks}
                      onChange={e => setForm({ ...form, remarks: e.target.value })}
                      placeholder={poType === 'DIRECT' ? "Add direct procurement notes..." : "Add procurement notes..."}
                      className="w-full bg-white rounded-lg px-4 py-2.5 text-sm text-slate-800 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all resize-none shadow-sm placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Attachments Section */}
              <div className="bg-white rounded-xl border border-slate-200/60 p-6 md:p-8 space-y-6 shadow-sm">
                <h2 className="text-base font-bold text-slate-900">Attachments</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* First Box: Market Bills / Vendor Quotations */}
                  <div className="relative">
                    <input
                      type="file"
                      id="vendorQuotations"
                      onChange={e => handleAttachmentChange('vendorQuotations', e.target.files[0])}
                      className="hidden"
                    />
                    {attachments.vendorQuotations ? (
                      <div className="border border-emerald-200 bg-emerald-50/10 rounded-lg p-5 flex flex-col items-center justify-center text-center space-y-3 relative group transition-all min-h-[120px]">
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment('vendorQuotations')}
                          className="absolute top-2 right-2 p-1 bg-slate-100 text-slate-500 rounded-full hover:bg-rose-500 hover:text-white transition-colors shadow-sm"
                        >
                          <X size={12} strokeWidth={2.5} />
                        </button>
                        <FileText className="text-emerald-600" size={24} />
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-slate-700 truncate max-w-[180px]">{attachments.vendorQuotations.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {poType === 'DIRECT' ? 'Market Bills' : 'Vendor Quotations'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <label
                        htmlFor="vendorQuotations"
                        className="cursor-pointer border border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/5 rounded-lg p-5 flex flex-col items-center justify-center text-center space-y-2 transition-all duration-200 min-h-[120px] bg-slate-50/30"
                      >
                        <Upload size={18} className="text-slate-400" />
                        <span className="text-xs font-semibold text-slate-600">
                          {poType === 'DIRECT' ? 'Market Bills' : 'Vendor Quotations'}
                        </span>
                      </label>
                    )}
                  </div>

                  {/* Second Box: Vendor Quotations / Bills */}
                  <div className="relative">
                    <input
                      type="file"
                      id="bills"
                      onChange={e => handleAttachmentChange('bills', e.target.files[0])}
                      className="hidden"
                    />
                    {attachments.bills ? (
                      <div className="border border-emerald-200 bg-emerald-50/10 rounded-lg p-5 flex flex-col items-center justify-center text-center space-y-3 relative group transition-all min-h-[120px]">
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment('bills')}
                          className="absolute top-2 right-2 p-1 bg-slate-100 text-slate-500 rounded-full hover:bg-rose-500 hover:text-white transition-colors shadow-sm"
                        >
                          <X size={12} strokeWidth={2.5} />
                        </button>
                        <FileText className="text-emerald-600" size={24} />
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-slate-700 truncate max-w-[180px]">{attachments.bills.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {poType === 'DIRECT' ? 'Vendor Quotations' : 'Bills'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <label
                        htmlFor="bills"
                        className="cursor-pointer border border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/5 rounded-lg p-5 flex flex-col items-center justify-center text-center space-y-2 transition-all duration-200 min-h-[120px] bg-slate-50/30"
                      >
                        <Upload size={18} className="text-slate-400" />
                        <span className="text-xs font-semibold text-slate-600">
                          {poType === 'DIRECT' ? 'Vendor Quotations' : 'Bills'}
                        </span>
                      </label>
                    )}
                  </div>

                  {/* Third Box: Supporting Documents */}
                  <div className="relative">
                    <input
                      type="file"
                      id="supportingDocs"
                      onChange={e => handleAttachmentChange('supportingDocs', e.target.files[0])}
                      className="hidden"
                    />
                    {attachments.supportingDocs ? (
                      <div className="border border-emerald-200 bg-emerald-50/10 rounded-lg p-5 flex flex-col items-center justify-center text-center space-y-3 relative group transition-all min-h-[120px]">
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment('supportingDocs')}
                          className="absolute top-2 right-2 p-1 bg-slate-100 text-slate-500 rounded-full hover:bg-rose-500 hover:text-white transition-colors shadow-sm"
                        >
                          <X size={12} strokeWidth={2.5} />
                        </button>
                        <FileText className="text-emerald-600" size={24} />
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-slate-700 truncate max-w-[180px]">{attachments.supportingDocs.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">Supporting Documents</p>
                        </div>
                      </div>
                    ) : (
                      <label
                        htmlFor="supportingDocs"
                        className="cursor-pointer border border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/5 rounded-lg p-5 flex flex-col items-center justify-center text-center space-y-2 transition-all duration-200 min-h-[120px] bg-slate-50/30"
                      >
                        <Upload size={18} className="text-slate-400" />
                        <span className="text-xs font-semibold text-slate-600">Supporting Documents</span>
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Items / Order Components Section */}
              {poType === 'DIRECT' ? (
                /* Direct PO Items spreadsheet Card */
                <div className="bg-white rounded-xl border border-slate-200/60 p-6 md:p-8 space-y-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h2 className="text-base font-bold text-slate-900">Items</h2>
                    <div className="flex items-center gap-2">
                      {/* <button 
                        type="button"
                        onClick={handleLoadPresetProducts}
                        className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md active:scale-95 border border-emerald-500"
                        title="Auto-fill 88 procurement items and quantities in 1 click"
                      >
                        <PackageCheck size={14} strokeWidth={2.5} /> Quick Load Purchase Preset (88 Items)
                      </button> */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveItemIndexForProduct(null);
                          setShowCreateProductModal(true);
                        }}
                        className="flex items-center gap-1.5 bg-white text-slate-700 hover:bg-slate-50 px-3.5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 border border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
                      >
                        <Plus size={14} strokeWidth={2.5} className="text-emerald-600" /> Create Product Form
                      </button>
                      <button
                        type="button"
                        onClick={handleAddDirectItem}
                        className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-95 border border-emerald-100"
                      >
                        <Plus size={14} strokeWidth={2.5} /> Add Item Row
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[2150px]">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/80">
                          <th className="px-2.5 py-3 text-xs font-black text-slate-700 uppercase tracking-wider text-center w-16">Image</th>
                          <th className="px-3.5 py-3 text-xs font-black text-slate-700 uppercase tracking-wider min-w-[200px]">Item Name</th>
                          <th className="px-2.5 py-3 text-xs font-black text-slate-700 uppercase tracking-wider text-center w-40">Barcode</th>
                          <th className="px-2.5 py-3 text-xs font-black text-slate-700 uppercase tracking-wider text-center w-36">Category</th>
                          <th className="px-2.5 py-3 text-xs font-black text-slate-700 uppercase tracking-wider text-center w-36">Sub Category</th>
                          <th className="px-2.5 py-3 text-xs font-black text-slate-700 uppercase tracking-wider text-center w-32">Brand</th>
                          <th className="px-2.5 py-3 text-xs font-black text-slate-700 uppercase tracking-wider text-center w-36">SKU Code</th>
                          <th className="px-2.5 py-3 text-xs font-black text-slate-700 uppercase tracking-wider text-center w-28">HSN Code</th>
                          <th className="px-2.5 py-3 text-xs font-black text-slate-700 uppercase tracking-wider text-center w-32">Unit Type</th>
                          <th className="px-2.5 py-3 text-xs font-black text-slate-700 uppercase tracking-wider text-center w-28">Measurement</th>
                          <th className="px-2.5 py-3 text-xs font-black text-slate-700 uppercase tracking-wider text-center w-24">Pack</th>
                          <th className="px-2.5 py-3 text-xs font-black text-slate-700 uppercase tracking-wider text-center w-24">Unit</th>
                          <th className="px-2.5 py-3 text-xs font-black text-slate-700 uppercase tracking-wider text-center w-24">Quantity</th>
                          <th className="px-2.5 py-3 text-xs font-black text-slate-700 uppercase tracking-wider text-center w-28">MRP</th>
                          <th className="px-2.5 py-3 text-xs font-black text-slate-700 uppercase tracking-wider text-center w-32">Purchase Rate</th>
                          <th className="px-2.5 py-3 text-xs font-black text-slate-700 uppercase tracking-wider text-center w-28">Landing Price</th>
                          <th className="px-2.5 py-3 text-xs font-black text-slate-700 uppercase tracking-wider text-center w-28">Selling Price</th>
                          <th className="px-3.5 py-3 text-xs font-black text-slate-700 uppercase tracking-wider text-right w-32">Total Value</th>
                          <th className="px-2 py-3 text-xs font-black text-slate-700 uppercase tracking-wider text-center w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {form.items.map((item, idx) => {
                          const activeCatObj = categoryList.find(c => (c.name || '').toLowerCase() === (item.category || '').toLowerCase() || c.id === item.category);
                          const subCatList = activeCatObj?.subCategories || [];
                          const activeUnitTypeId = item.unitType ? (unitTypesList.find(ut => ut.id === item.unitType || (ut.name || '').toLowerCase() === item.unitType.toLowerCase())?.id || item.unitType) : '';
                          const measurementUnits = activeUnitTypeId ? (unitsByTypeId[activeUnitTypeId] || []) : [];

                          return (
                            <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                              {/* Image Upload / Preview */}
                              <td className="px-2 py-3 text-center">
                                <input
                                  type="file"
                                  accept="image/*"
                                  ref={el => fileInputRefs.current[idx] = el}
                                  className="hidden"
                                  onChange={e => {
                                    if (e.target.files?.[0]) {
                                      handleImageRowUpload(idx, e.target.files[0]);
                                    }
                                  }}
                                />
                                <div
                                  onClick={() => fileInputRefs.current[idx]?.click()}
                                  title={item.image ? "Click to change image" : "Upload product image"}
                                  className="relative w-10 h-10 mx-auto rounded-lg border border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 flex items-center justify-center cursor-pointer transition-all overflow-hidden group shadow-sm"
                                >
                                  {uploadingImageIdx === idx ? (
                                    <Loader2 size={16} className="animate-spin text-emerald-600" />
                                  ) : item.image ? (
                                    <>
                                      <img src={item.image} alt="Product" className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <Upload size={12} className="text-white" />
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-emerald-600">
                                      <ImageIcon size={14} />
                                      <span className="text-[8px] font-bold leading-none mt-0.5">Add</span>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Item Name */}
                              <td className="px-3.5 py-3">
                                <SearchableProductDropdown
                                  products={mappedItems}
                                  selectedProductId={item.selectedKey || item.productId}
                                  onCreateNew={() => {
                                    setActiveItemIndexForProduct(idx);
                                    setShowCreateProductModal(true);
                                  }}
                                  onChange={(selectedKey, selectedObj) => {
                                    const matched = selectedObj || mappedItems.find(p => p.id === selectedKey || (p.productId || p.id) === selectedKey);
                                    const realProductId = matched?.productId || (matched?.id && !matched.id.includes('_') ? matched.id : selectedKey);
                                    setForm(f => {
                                      const updated = [...f.items];
                                      const matchedCat = matched ? (typeof matched.category === 'string' ? matched.category : (matched.category?.name || '')) : '';
                                      const matchedName = matched ? matched.name : '';
                                      const rawWeightStr = typeof matched?.weight === 'string' ? matched.weight.replace(/[\d\s.]/g, '') : '';
                                      const rawUnitStr = typeof matched?.unit === 'string' ? matched.unit : (typeof matched?.unit?.name === 'string' ? matched.unit.name : (matched?.unit ? String(matched.unit) : ''));
                                      const matchedUnit = (rawWeightStr || rawUnitStr || 'KG').toUpperCase();
                                      const autoSku = matched?.skuCode && matched?.skuCode !== 'NO-SKU'
                                        ? matched.skuCode
                                        : generateAutoSku(matchedName, matchedUnit, matchedCat);
                                      const autoHsn = matched?.hsnCode || generateAutoHsn(matchedCat, matchedName);

                                      updated[idx] = {
                                        ...updated[idx],
                                        productId: realProductId,
                                        selectedKey: matched?.id || selectedKey,
                                        name: matchedName,
                                        variantName: matched?.variantName || '',
                                        skuCode: autoSku,
                                        barcode: matched?.barcode || updated[idx].barcode || '',
                                        image: matched?.image || matched?.imageUrl || updated[idx].image || '',
                                        category: matchedCat,
                                        subCategory: matched?.subCategory || '',
                                        brand: matched ? (typeof matched.brand === 'string' ? matched.brand : (matched.brand?.name || 'Villagkart')) : 'Villagkart',
                                        hsnCode: autoHsn,
                                        unitType: matched?.unitType || updated[idx].unitType || '',
                                        pack: matched?.pack || updated[idx].pack || '',
                                        measurement: matched?.measurement || updated[idx].measurement || '',
                                        mrp: matched ? (matched.mrp || 0) : 0,
                                        landingPrice: matched ? (matched.landingPrice || matched.purchasePrice || 0) : 0,
                                        sellingPrice: matched ? (matched.sellingPrice || matched.price || 0) : 0,
                                        rate: matched ? (matched.purchasePrice ?? matched.rate ?? 0) : 0,
                                        unit: matchedUnit,
                                        tax: matched?.tax ?? matched?.taxRate ?? updated[idx].tax ?? 0,
                                        discount: matched?.discount ?? updated[idx].discount ?? 0
                                      };
                                      return { ...f, items: updated };
                                    });
                                  }}
                                />
                              </td>

                              {/* Barcode Number with Scanner Button */}
                              <td className="px-2 py-3 text-center">
                                <div className="relative flex items-center">
                                  <input
                                    type="text"
                                    value={item.barcode || ''}
                                    placeholder="Barcode"
                                    onChange={e => handleDirectItemChange(idx, 'barcode', e.target.value)}
                                    className="w-full bg-slate-50 hover:bg-white rounded-lg pl-2 pr-7 py-2 text-xs text-slate-800 font-bold border border-slate-200 focus:border-emerald-500 focus:bg-white outline-none transition-all shadow-sm"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setActiveBarcodeScanIdx(idx)}
                                    className="absolute right-1 p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-all"
                                    title="Scan Barcode using Camera"
                                  >
                                    <Camera size={14} className="text-emerald-600" />
                                  </button>
                                </div>
                              </td>

                              {/* Category Dropdown */}
                              <td className="px-2 py-3 text-center">
                                <select
                                  value={item.category || ''}
                                  onChange={e => {
                                    const newCat = e.target.value;
                                    const autoHsn = generateAutoHsn(newCat, item.name);
                                    handleDirectItemChange(idx, 'category', newCat);
                                    handleDirectItemChange(idx, 'subCategory', '');
                                    if (!item.hsnCode || item.hsnCode === '2106') {
                                      handleDirectItemChange(idx, 'hsnCode', autoHsn);
                                    }
                                    if (!item.skuCode || item.skuCode.startsWith('VK-ITEM')) {
                                      handleDirectItemChange(idx, 'skuCode', generateAutoSku(item.name, item.unit, newCat));
                                    }
                                  }}
                                  className="w-full bg-slate-50 hover:bg-white rounded-lg px-2 py-2 text-xs text-slate-800 font-bold border border-slate-200 focus:border-emerald-500 focus:bg-white outline-none transition-all shadow-sm cursor-pointer"
                                >
                                  <option value="">Select Category</option>
                                  {categoryList.map(c => (
                                    <option key={c.id || c.name} value={c.name}>{c.name}</option>
                                  ))}
                                  {item.category && !categoryList.some(c => (c.name || '').toLowerCase() === item.category.toLowerCase()) && (
                                    <option value={item.category}>{item.category}</option>
                                  )}
                                </select>
                              </td>

                              {/* Sub Category Dropdown */}
                              <td className="px-2 py-3 text-center">
                                <select
                                  value={item.subCategory || ''}
                                  onChange={e => handleDirectItemChange(idx, 'subCategory', e.target.value)}
                                  className="w-full bg-slate-50 hover:bg-white rounded-lg px-2 py-2 text-xs text-slate-800 font-semibold border border-slate-200 focus:border-emerald-500 focus:bg-white outline-none transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={!item.category}
                                >
                                  <option value="">{item.category ? 'Select Subcategory' : 'Choose Category'}</option>
                                  {subCatList.map(sc => (
                                    <option key={sc.id || sc.name} value={sc.name}>{sc.name}</option>
                                  ))}
                                  {item.subCategory && !subCatList.some(sc => (sc.name || '').toLowerCase() === item.subCategory.toLowerCase()) && (
                                    <option value={item.subCategory}>{item.subCategory}</option>
                                  )}
                                </select>
                              </td>

                              {/* Brand Dropdown */}
                              <td className="px-2 py-3 text-center">
                                <select
                                  value={item.brand || 'Villagkart'}
                                  onChange={e => handleDirectItemChange(idx, 'brand', e.target.value)}
                                  className="w-full bg-slate-50 hover:bg-white rounded-lg px-2 py-2 text-xs text-slate-800 font-semibold border border-slate-200 focus:border-emerald-500 focus:bg-white outline-none transition-all shadow-sm cursor-pointer"
                                >
                                  <option value="Villagkart">Villagkart</option>
                                  <option value="Generic">Generic / Loose</option>
                                  {brandList.filter(b => b !== 'Villagkart' && b !== 'Generic').map(b => (
                                    <option key={b} value={b}>{b}</option>
                                  ))}
                                  {item.brand && item.brand !== 'Villagkart' && item.brand !== 'Generic' && !brandList.includes(item.brand) && (
                                    <option value={item.brand}>{item.brand}</option>
                                  )}
                                </select>
                              </td>

                              {/* SKU Code (Auto-generated with refresh button) */}
                              <td className="px-2 py-3 text-center">
                                <div className="relative flex items-center">
                                  <input
                                    type="text"
                                    value={item.skuCode || ''}
                                    placeholder="SKU"
                                    onChange={e => handleDirectItemChange(idx, 'skuCode', e.target.value)}
                                    className="w-full bg-slate-50 hover:bg-white rounded-lg pl-2 pr-6 py-2 text-xs text-slate-800 font-bold border border-slate-200 focus:border-emerald-500 focus:bg-white text-center outline-none transition-all shadow-sm"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleDirectItemChange(idx, 'skuCode', generateAutoSku(item.name, item.unit, item.category))}
                                    className="absolute right-1 p-1 text-slate-400 hover:text-emerald-600 rounded transition-all"
                                    title="Auto-generate SKU"
                                  >
                                    <Sparkles size={12} className="text-emerald-600" />
                                  </button>
                                </div>
                              </td>

                              {/* HSN Code (Auto-generated with refresh button) */}
                              <td className="px-2 py-3 text-center">
                                <div className="relative flex items-center">
                                  <input
                                    type="text"
                                    value={item.hsnCode || ''}
                                    placeholder="HSN"
                                    onChange={e => handleDirectItemChange(idx, 'hsnCode', e.target.value)}
                                    className="w-full bg-slate-50 hover:bg-white rounded-lg pl-2 pr-6 py-2 text-xs text-slate-800 font-bold border border-slate-200 focus:border-emerald-500 focus:bg-white text-center outline-none transition-all shadow-sm"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleDirectItemChange(idx, 'hsnCode', generateAutoHsn(item.category, item.name))}
                                    className="absolute right-1 p-1 text-slate-400 hover:text-emerald-600 rounded transition-all"
                                    title="Auto-resolve HSN Code"
                                  >
                                    <Sparkles size={12} className="text-emerald-600" />
                                  </button>
                                </div>
                              </td>

                              {/* Unit Type Dropdown */}
                              <td className="px-2 py-3 text-center">
                                <select
                                  value={item.unitType || ''}
                                  onChange={e => {
                                    handleDirectItemChange(idx, 'unitType', e.target.value);
                                  }}
                                  className="w-full bg-slate-50 hover:bg-white rounded-lg px-2 py-2 text-xs text-slate-800 font-semibold border border-slate-200 focus:border-emerald-500 focus:bg-white outline-none transition-all shadow-sm cursor-pointer"
                                >
                                  <option value="">Select Unit Type</option>
                                  {unitTypesList.map(ut => (
                                    <option key={ut.id || ut.name} value={ut.name || ut.id}>
                                      {ut.name}
                                    </option>
                                  ))}
                                  {item.unitType && !unitTypesList.some(ut => ut.name === item.unitType || ut.id === item.unitType) && (
                                    <option value={item.unitType}>{item.unitType}</option>
                                  )}
                                </select>
                              </td>

                              {/* Measurement */}
                              <td className="px-2 py-3 text-center">
                                {measurementUnits.length > 0 ? (
                                  <select
                                    value={item.measurement || ''}
                                    onChange={e => handleDirectItemChange(idx, 'measurement', e.target.value)}
                                    className="w-full bg-white rounded-lg px-2 py-2 text-xs text-slate-800 font-semibold border border-slate-200 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer"
                                  >
                                    <option value="">Select</option>
                                    {measurementUnits.map(u => (
                                      <option key={u.value} value={u.label || u.value}>{u.label}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    value={item.measurement || ''}
                                    placeholder="e.g. 500"
                                    onChange={e => handleDirectItemChange(idx, 'measurement', e.target.value)}
                                    className="w-full bg-white rounded-lg px-2 py-2 text-xs text-slate-800 font-semibold border border-slate-200 focus:border-emerald-500 text-center outline-none transition-all shadow-sm"
                                  />
                                )}
                              </td>

                              {/* Pack */}
                              <td className="px-2 py-3 text-center">
                                <input
                                  type="text"
                                  value={item.pack || ''}
                                  placeholder="e.g. 1"
                                  onChange={e => handleDirectItemChange(idx, 'pack', e.target.value)}
                                  className="w-full bg-white rounded-lg px-2 py-2 text-xs text-slate-800 font-semibold border border-slate-200 focus:border-emerald-500 text-center outline-none transition-all shadow-sm"
                                />
                              </td>

                              {/* Unit */}
                              <td className="px-2.5 py-3 text-center">
                                <select
                                  value={item.unit || 'KG'}
                                  onChange={e => handleDirectItemChange(idx, 'unit', e.target.value)}
                                  className="w-full bg-white rounded-lg px-2 py-2 text-xs text-slate-850 font-bold border border-slate-200 focus:border-emerald-500 outline-none transition-all shadow-sm cursor-pointer"
                                >
                                  <option value="KG">KG</option>
                                  <option value="PCS">PCS</option>
                                  <option value="PACK">PACK</option>
                                  <option value="BOX">BOX</option>
                                  <option value="LTR">LTR</option>
                                  <option value="GRAMS">GRAMS</option>
                                </select>
                              </td>

                              {/* Quantity */}
                              <td className="px-2.5 py-3 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity || 1}
                                  onChange={e => handleDirectItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                                  className="w-full bg-white rounded-lg px-2 py-2 text-sm text-slate-850 font-bold border border-slate-200 focus:border-emerald-500 text-center outline-none transition-all shadow-sm"
                                  required
                                />
                              </td>

                              {/* MRP */}
                              <td className="px-2.5 py-3 text-center">
                                <div className="relative flex items-center">
                                  <span className="absolute left-2 text-slate-400 text-xs font-semibold">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={item.mrp || ''}
                                    placeholder="0"
                                    onChange={e => handleDirectItemChange(idx, 'mrp', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-white rounded-lg pl-5 pr-2 py-2 text-xs text-slate-850 border border-slate-200 focus:border-emerald-500 outline-none transition-all shadow-sm font-semibold"
                                  />
                                </div>
                              </td>

                              {/* Purchase Rate */}
                              <td className="px-2.5 py-3 text-center">
                                <div className="relative flex items-center">
                                  <span className="absolute left-2.5 text-slate-400 text-xs font-semibold">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={item.rate || ''}
                                    placeholder="0"
                                    onChange={e => handleDirectItemChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-white rounded-lg pl-6 pr-2 py-2 text-sm text-slate-850 font-black border border-slate-200 focus:border-emerald-500 outline-none transition-all shadow-sm text-emerald-700"
                                    required
                                  />
                                </div>
                              </td>

                              {/* Landing Price */}
                              <td className="px-2.5 py-3 text-center">
                                <div className="relative flex items-center">
                                  <span className="absolute left-2 text-slate-400 text-xs font-semibold">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={item.landingPrice || ''}
                                    placeholder="0"
                                    onChange={e => handleDirectItemChange(idx, 'landingPrice', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-white rounded-lg pl-5 pr-2 py-2 text-xs text-slate-850 font-semibold border border-slate-200 focus:border-emerald-500 outline-none transition-all shadow-sm"
                                  />
                                </div>
                              </td>

                              {/* Selling Price */}
                              <td className="px-2.5 py-3 text-center">
                                <div className="relative flex items-center">
                                  <span className="absolute left-2 text-slate-400 text-xs font-semibold">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={item.sellingPrice || ''}
                                    placeholder="0"
                                    onChange={e => handleDirectItemChange(idx, 'sellingPrice', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-white rounded-lg pl-5 pr-2 py-2 text-xs text-slate-850 font-bold text-emerald-600 border border-slate-200 focus:border-emerald-500 outline-none transition-all shadow-sm"
                                  />
                                </div>
                              </td>

                              {/* Total Value */}
                              <td className="px-3.5 py-3 text-right font-black text-slate-900 text-sm whitespace-nowrap">
                                ₹{(() => {
                                  const base = (item.quantity || 0) * (item.rate || 0);
                                  const disc = base * ((item.discount || 0) / 100);
                                  const tax = (base - disc) * ((item.tax || 0) / 100);
                                  return base - disc + tax;
                                })().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>

                              {/* Remove Row */}
                              <td className="px-2 py-3 text-center">
                                {form.items.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveDirectItem(idx)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                    title="Delete Item"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Grand total purchase value row */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Purchase Value</span>
                    <span className="text-xl font-black text-emerald-600">
                      ₹{poTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ) : (
                /* Order Components Section (Requisition PO) */
                <div className="bg-white rounded-xl border border-slate-200/60 p-6 md:p-8 space-y-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
                    <h2 className="text-base font-bold text-slate-900">Order Components</h2>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={handleToggleGlobalSelectAll}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all shadow-sm active:scale-95 border ${
                          areAllFilteredItemsSelected
                            ? 'bg-rose-50 text-rose-700 border-rose-200/80 hover:bg-rose-100'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100'
                        }`}
                      >
                        {areAllFilteredItemsSelected ? (
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
                      <div className="relative w-72">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          placeholder="Filter items by name or SKU..."
                          value={itemSearch}
                          onChange={e => setItemSearch(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-400 text-slate-850"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Grouped Items List */}
                  <div className="space-y-4">
                    {Object.entries(
                      filteredMappedItems
                        .reduce((acc, item) => {
                          if (!acc[item.category]) acc[item.category] = [];
                          acc[item.category].push(item);
                          return acc;
                        }, {})
                    ).map(([category, items]) => {
                      const categoryItems = items.filter(i =>
                        form.items.find(fi => fi.productId === i.productId)
                      );
                      const isCategoryAllSelected = items.length > 0 && items.every(i => form.items.some(fi => fi.productId === i.productId));
                      const catQty = categoryItems.reduce((s, i) => s + (parseInt(form.items.find(fi => fi.productId === i.productId)?.quantity || 0)), 0);
                      const catTotal = categoryItems.reduce((s, i) => {
                        const fi = form.items.find(f => f.productId === i.productId);
                        const qty = parseFloat(fi?.quantity || 0);
                        const rate = parseFloat(fi?.landingPrice > 0 ? fi.landingPrice : (i.landingPrice > 0 ? i.landingPrice : (fi?.rate > 0 ? fi.rate : 0)));
                        const discount = parseFloat(fi?.discount || 0);
                        const tax = parseFloat(fi?.tax || 0);
                        const baseVal = qty * rate;
                        const discVal = baseVal * (discount / 100);
                        const taxVal = (baseVal - discVal) * (tax / 100);
                        return s + (baseVal - discVal + taxVal);
                      }, 0);

                      return (
                        <div key={category} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                          <div className="bg-emerald-50/50 px-8 py-2 flex items-center justify-between border-b border-emerald-100/30">
                            <div className="flex items-center gap-4">
                              <button
                                type="button"
                                onClick={() => handleToggleCategorySelectAll(items)}
                                className={`w-5 h-5 rounded flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                                  isCategoryAllSelected 
                                    ? 'bg-emerald-600 text-white' 
                                    : 'bg-white border border-emerald-300 text-transparent hover:border-emerald-600'
                                }`}
                                title={isCategoryAllSelected ? "Deselect category" : "Select all in category"}
                              >
                                <CheckCircle2 size={12} className={isCategoryAllSelected ? 'text-white' : 'text-emerald-600 opacity-40'} />
                              </button>
                              <span 
                                onClick={() => handleToggleCategorySelectAll(items)}
                                className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-900 cursor-pointer select-none hover:text-emerald-700"
                              >
                                {category}
                              </span>
                            </div>
                            <div className="flex items-center gap-10">
                              <div className="text-right">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">CATEGORY QTY</p>
                                <p className="text-xs font-black text-gray-700">{catQty} UNITS</p>
                              </div>
                              <div className="text-right border-l border-emerald-100/50 pl-8">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">CATEGORY TOTAL</p>
                                <p className="text-sm font-black text-emerald-600">₹{catTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                              </div>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-gray-50/50 bg-gray-50/30">
                                  <th className="px-8 py-2 text-left text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                    <div className="flex items-center gap-6">
                                      <input 
                                        type="checkbox" 
                                        checked={isCategoryAllSelected}
                                        onChange={() => handleToggleCategorySelectAll(items)}
                                        className="w-5 h-5 rounded-lg border-gray-200 text-emerald-600 focus:ring-emerald-500/20 transition-all cursor-pointer shadow-sm" 
                                        title="Select / Deselect all items in this category"
                                      />
                                      <span>Procurement Item</span>
                                    </div>
                                  </th>
                                  <th className="px-4 py-2 text-center text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Quantity</th>
                                  <th className="px-4 py-2 text-center text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">UOM</th>
                                  <th className="px-4 py-2 text-center text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">MRP</th>
                                  <th className="px-4 py-2 text-center text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Landing Price</th>
                                  <th className="px-4 py-2 text-center text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Selling Price</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50/50">
                                {items.map(item => {
                                  const inForm = form.items.find(i => i.productId === item.productId);
                                  return (
                                    <tr key={item.productId} className={`transition-all duration-300 ${inForm ? 'bg-emerald-50/5' : 'bg-transparent hover:bg-gray-50/30'}`}>
                                      <td className="px-6 py-1.5">
                                        <div className="flex items-center gap-4">
                                          <div className="relative group/cb">
                                            <input
                                              type="checkbox"
                                              checked={!!inForm}
                                              onChange={() => toggleItem(item.productId)}
                                              className="w-5 h-5 rounded-lg border-gray-200 text-emerald-600 focus:ring-emerald-500/20 transition-all cursor-pointer shadow-sm"
                                            />
                                          </div>
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs font-black text-gray-900 tracking-tight">{item.name}</span>
                                              {item.variantName && (
                                                <span className="text-[8px] font-extrabold bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded uppercase border border-purple-100">
                                                  {item.variantName}
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">SKU: {item.skuCode}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-3 py-1.5 text-center">
                                        <span className="text-xs font-bold text-slate-700">{inForm ? inForm.quantity : (item.quantity || 1)}</span>
                                      </td>
                                      <td className="px-3 py-1.5 text-center">
                                        <span className="text-[10px] font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60 uppercase">
                                          {item.uom || 'PACK'}
                                        </span>
                                      </td>
                                      <td className="px-3 py-1.5 text-center">
                                        <span className="text-xs font-bold text-slate-700">₹{Number(inForm ? (inForm.mrp !== undefined ? inForm.mrp : (item.mrp || 0)) : (item.mrp || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                      </td>
                                      <td className="px-3 py-1.5 text-center">
                                        <span className="text-xs font-bold text-slate-700">₹{Number(inForm ? (inForm.landingPrice !== undefined ? inForm.landingPrice : (item.landingPrice || 0)) : (item.landingPrice || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                      </td>
                                      <td className="px-3 py-1.5 text-center">
                                        <span className="text-xs font-bold text-slate-700">₹{Number(inForm ? (inForm.sellingPrice !== undefined ? inForm.sellingPrice : (item.sellingPrice || 0)) : (item.sellingPrice || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                      </td>

                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* Floating Action Footer - Permanently Docked */}
            <div className="bg-white border-t border-slate-200/80 px-10 py-4 flex items-center justify-end gap-3 shrink-0 rounded-b-xl">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="h-10 px-4 bg-white text-slate-700 rounded-lg border border-slate-200 font-semibold text-sm hover:bg-slate-50 shadow-sm transition-all active:scale-95"
              >
                Cancel
              </button>
              {form.id ? (
                <button
                  type="submit"
                  className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm shadow-sm transition-all active:scale-95"
                >
                  Save Changes
                </button>
              ) : (
                <>
                  <button
                    type="submit"
                    onClick={() => setIsSubmitDraft(true)}
                    className="h-10 px-4 bg-white border border-slate-200 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-50 shadow-sm transition-all active:scale-95"
                  >
                    Save Draft
                  </button>
                  <button
                    type="submit"
                    onClick={() => setIsSubmitDraft(false)}
                    className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm shadow-md transition-all active:scale-95"
                  >
                    Create PO
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Inline Add New Vendor Modal */}
      {showAddVendorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 md:p-8 border border-slate-200 shadow-2xl space-y-5 flex flex-col relative transform hover:scale-[1.01] transition-transform">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="text-emerald-600" size={20} />
                <h3 className="text-base font-bold text-slate-900">Onboard New Vendor</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddVendorModal(false);
                  setNewVendorForm({ vendorName: '', mobile: '', contactPerson: '', creditDays: '30', openingBalance: '0' });
                }}
                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const { data } = await procurementAPI.createVendor(newVendorForm);
                  toast.success('Vendor onboarding complete!');

                  // Reload active vendors
                  const vendorsRes = await procurementAPI.getVendors({ status: 'ACTIVE' });
                  setVendors(vendorsRes.data?.data || vendorsRes.data || []);

                  // Auto-select the newly created vendor
                  setForm(f => ({ ...f, vendorId: data.id }));

                  // Close and clean up
                  setShowAddVendorModal(false);
                  setNewVendorForm({ vendorName: '', mobile: '', contactPerson: '', creditDays: '30', openingBalance: '0' });
                } catch (err) {
                  toast.error(err.response?.data?.message || 'Error registering vendor');
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Business Name *</label>
                <input
                  type="text"
                  required
                  value={newVendorForm.vendorName}
                  onChange={e => setNewVendorForm({ ...newVendorForm, vendorName: e.target.value })}
                  placeholder="e.g. Fresh Farms Agro"
                  className="w-full bg-white rounded-lg px-3 py-2 text-sm text-slate-800 border border-slate-200 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Primary Contact No. *</label>
                <input
                  type="text"
                  required
                  value={newVendorForm.mobile}
                  onChange={e => setNewVendorForm({ ...newVendorForm, mobile: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-white rounded-lg px-3 py-2 text-sm text-slate-800 border border-slate-200 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Contact Person Name</label>
                <input
                  type="text"
                  value={newVendorForm.contactPerson}
                  onChange={e => setNewVendorForm({ ...newVendorForm, contactPerson: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full bg-white rounded-lg px-3 py-2 text-sm text-slate-800 border border-slate-200 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Credit Days</label>
                  <input
                    type="number"
                    value={newVendorForm.creditDays}
                    onChange={e => setNewVendorForm({ ...newVendorForm, creditDays: e.target.value })}
                    placeholder="30"
                    className="w-full bg-white rounded-lg px-3 py-2 text-sm text-slate-800 border border-slate-200 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Opening Balance</label>
                  <input
                    type="number"
                    value={newVendorForm.openingBalance}
                    onChange={e => setNewVendorForm({ ...newVendorForm, openingBalance: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-white rounded-lg px-3 py-2 text-sm text-slate-800 border border-slate-200 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddVendorModal(false);
                    setNewVendorForm({ vendorName: '', mobile: '', contactPerson: '', creditDays: '30', openingBalance: '0' });
                  }}
                  className="h-9 px-4 bg-white text-slate-700 rounded-lg border border-slate-200 font-semibold text-sm hover:bg-slate-50 shadow-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm shadow-sm transition-all active:scale-95"
                >
                  Register Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Direct Purchase Product Creation Modal */}
      {showCreateProductModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 md:p-6 overflow-hidden">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="overflow-y-auto custom-scrollbar p-3 sm:p-6 flex-1">
              <AddProduct
                isModal={true}
                onClose={() => {
                  setShowCreateProductModal(false);
                  setActiveItemIndexForProduct(null);
                }}
                onProductCreated={handleProductCreated}
              />
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Overlay */}
      {activeBarcodeScanIdx !== null && (
        <BarcodeScannerOverlay
          onScan={(code) => {
            if (code && activeBarcodeScanIdx !== null) {
              handleDirectItemChange(activeBarcodeScanIdx, 'barcode', code);
              toast.success(`Scanned Barcode: ${code}`);
            }
            setActiveBarcodeScanIdx(null);
          }}
          onClose={() => setActiveBarcodeScanIdx(null)}
        />
      )}
    </div>
  );
};

export default PurchaseOrdersSection;
