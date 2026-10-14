import React, { useState, useEffect } from 'react';
import {
  Receipt, Plus, Search, Loader2, X, Package, Edit3, Trash2, ArrowLeft, Check, FileUp, FileArchive,
  Barcode, ScanBarcode, Users, Phone, Mail, User, Clock, DollarSign, Building2, Tag,
  ToggleLeft, ToggleRight, ShieldAlert, CreditCard, Hash, ChevronLeft, ChevronRight,
  ShieldCheck, FileText, MapPin
} from 'lucide-react';
import BarcodeScannerOverlay from '../../../../components/BarcodeScannerOverlay';
import * as XLSX from 'xlsx';
import { procurementAPI } from '../../vsms/services/procurementService';
import { adminAPI } from '../../vsms/services/adminService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useUserStore } from '../../vsms/store/userStore';

/**
 * Generates a unique VGK-prefixed invoice number.
 * Format: VGK-YYYYMMDD-XXXX (4 random uppercase alphanumeric chars)
 * Example: VGK-20260917-A3F9
 */
const generateInvoiceNumber = () => {
  const now = new Date();
  const datePart = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rand = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `VGK-${datePart}-${rand}`;
};

const extractList = (res) => Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data?.data?.data) ? res.data.data.data : [])));

/** Safely extract a string from a unit field that may be an object {name, type} or a plain string */
const resolveUnit = (u) => {
  if (!u) return '';
  if (typeof u === 'object') return u.name || u.type || '';
  return String(u);
};

const PurchasesSection = ({ can, setHeaderExtra, storeId }) => {
  const user = useUserStore(s => s.user);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    // Clear header on mount/unmount
    if (setHeaderExtra) setHeaderExtra(null);
    return () => {
      if (setHeaderExtra) setHeaderExtra(null);
    };
  }, [setHeaderExtra]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    vendorId: '', grnId: '', invoiceNumber: generateInvoiceNumber(), invoiceDate: format(new Date(), 'yyyy-MM-dd'),
    transportCharges: '0', otherCharges: '0', items: []
  });
  const [showQuickVendor, setShowQuickVendor] = useState(false);
  const [showQuickProduct, setShowQuickProduct] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [showItemResults, setShowItemResults] = useState(false);
  const [itemFilter, setItemFilter] = useState('');
  const [searchQty, setSearchQty] = useState('1');
  const [searchPrice, setSearchPrice] = useState('0');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quickVendorForm, setQuickVendorForm] = useState({
    vendorName: '', mobile: '', email: '', address: '',
    gstNumber: '', contactPerson: '', creditDays: '30', openingBalance: '0',
    paymentTerms: 'Net 30', creditLimit: '0',
    bankName: '', accountNumber: '', ifscCode: '', bankBranch: '',
    vendorCategory: 'RAW_MATERIAL', minOrderQty: '1', isTaxable: false
  });
  const [activeVendorTab, setActiveVendorTab] = useState('general');
  const [quickProductForm, setQuickProductForm] = useState({
    name: '', description: '', mrp: '', price: '', landingPrice: '',
    purchasePrice: '', discount: '0', discountType: 'RUPEE', categoryId: 'default',
    subCategoryId: 'default', brandId: 'default', unitId: '', unitValue: '',
    gst: '0', isFree: false, minShopAmount: '0', status: 'ACTIVE',
    barcode: '', skuCode: '', stock: '0'
  });
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [taxSlabs, setTaxSlabs] = useState([0, 5, 12, 18, 28]);
  const [actionLoading, setActionLoading] = useState({ id: null, type: null });
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [grns, setGrns] = useState([]);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await procurementAPI.getPurchases({ storeId });
        setPurchases(data);
      } catch { toast.error('Failed to load purchases'); }
      finally { setLoading(false); }
    };
    load();
  }, [storeId]);

  const openForm = async () => {
    setFormLoading(true);
    // We always refetch products to ensure latest prices/taxes are used
    try {
      const [v, p, c, u, sc, s, po, g] = await Promise.all([
        procurementAPI.getVendors({ storeId: storeId || undefined }),
        adminAPI.getItems({ storeId: storeId || undefined }),
        adminAPI.getCategories(),
        adminAPI.getUnits(),
        adminAPI.getSubCategories(),
        adminAPI.getSettings(),
        procurementAPI.getPurchaseOrders({ status: 'APPROVED,ORDERED,DELIVERED', storeId: storeId || undefined }),
        procurementAPI.getGRNs({ status: 'APPROVED,PARTIAL', storeId: storeId || undefined })
      ]);
      const rawProducts = (p.data || []).filter(x => x.isActive || x.status === 'APPROVED');
      const flattenedProducts = [];
      rawProducts.forEach(prod => {
        // Add the base product
        flattenedProducts.push({
          ...prod,
          id: prod.id,
          productId: prod.id,
          skuCode: prod.skuCode || prod.sku || 'NO-SKU',
          sku: prod.sku || prod.skuCode || '',
          variantName: prod.variantName || ''
        });
        // If the product has variants, add each active variant as a discrete product item
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
              productId: variant.productId || (variant.id && !variant.id.includes('_') ? variant.id : prod.id),
              parentProductId: prod.id,
              name: prod.name,
              variantName: variant.variantName || variant.name || '',
              isVariantItem: true,
              price: variant.sellingPrice ?? variant.price ?? prod.price,
              purchasePrice: variant.purchasePrice ?? variant.costPrice ?? variant.landingPrice ?? prod.purchasePrice ?? prod.price,
              skuCode: variant.sku || variant.skuCode || prod.skuCode || prod.sku || 'NO-SKU',
              sku: variant.sku || variant.skuCode || '',
              barcode: variant.barcode || prod.barcode,
              unit: resolveUnit(variant.unit || variant.unitType || prod.unit),
              unitValue: variant.measurement || variant.unitValue || prod.unitValue,
              measurement: variant.measurement || prod.measurement,
              variants: [] // prevent nesting
            });
          });
        }
      });

      setVendors(extractList(v));
      setProducts(flattenedProducts);
      setCategories(c.data?.categories || c.data?.data?.categories || (Array.isArray(c.data) ? c.data : []));
      setUnits(Array.isArray(u.data) ? u.data : u.data?.units || u.data?.data?.units || []);
      setSubCategories(Array.isArray(sc.data) ? sc.data : sc.data?.subCategories || sc.data?.data?.subCategories || []);
      setPurchaseOrders(po.data || []);
      setGrns(g.data?.data || g.data || g || []);

      if (s.data?.success && s.data?.data?.taxRates) {
        const rates = s.data.data.taxRates.split(',').map(r => parseFloat(r.trim())).filter(r => !isNaN(r));
        setTaxSlabs(rates);
      }
      setForm({ vendorId: '', grnId: '', invoiceNumber: generateInvoiceNumber(), invoiceDate: format(new Date(), 'yyyy-MM-dd'), transportCharges: '0', otherCharges: '0', items: [] });
      setShowForm(true);
    } catch { toast.error('Failed to load data'); }
    finally { setFormLoading(false); }
  };

  useEffect(() => {
    if (showForm && vendors.length === 0 && !formLoading) {
      openForm();
    }
  }, [showForm]);

  const handleOpenVendorModal = () => {
    setActiveVendorTab('general');
    setQuickVendorForm({
      vendorName: '', mobile: '', email: '', address: '',
      gstNumber: '', contactPerson: '', creditDays: '30', openingBalance: '0',
      paymentTerms: 'Net 30', creditLimit: '0',
      bankName: '', accountNumber: '', ifscCode: '', bankBranch: '',
      vendorCategory: 'RAW_MATERIAL', minOrderQty: '1', isTaxable: false
    });
    setShowQuickVendor(true);
  };

  const nextVendorTab = () => {
    const sequence = ['general', 'commercial', 'regulation', 'settlement'];
    const idx = sequence.indexOf(activeVendorTab);
    if (idx < sequence.length - 1) {
      setActiveVendorTab(sequence[idx + 1]);
    }
  };

  const prevVendorTab = () => {
    const sequence = ['general', 'commercial', 'regulation', 'settlement'];
    const idx = sequence.indexOf(activeVendorTab);
    if (idx > 0) {
      setActiveVendorTab(sequence[idx - 1]);
    }
  };

  const isVendorTabIncomplete = (tabId) => {
    if (tabId === 'regulation') {
      return quickVendorForm.isTaxable && (!quickVendorForm.gstNumber || quickVendorForm.gstNumber.trim().length !== 15);
    }
    return false;
  };

  const handleQuickVendor = async (e) => {
    if (e) e.preventDefault();

    if (!quickVendorForm.vendorName || !quickVendorForm.mobile) {
      setActiveVendorTab('general');
      return toast.error('Vendor name and mobile are required');
    }

    if (quickVendorForm.isTaxable && (!quickVendorForm.gstNumber || !quickVendorForm.gstNumber.trim())) {
      setActiveVendorTab('regulation');
      toast.error('GST Identification Number is mandatory for taxable vendors.');
      return;
    }

    if (quickVendorForm.gstNumber && quickVendorForm.gstNumber.trim() && quickVendorForm.gstNumber.trim().length !== 15) {
      setActiveVendorTab('regulation');
      toast.error('GST Identification Number must be exactly 15 characters.');
      return;
    }

    try {
      const { data } = await procurementAPI.createVendor(quickVendorForm);
      toast.success('Vendor added successfully');
      const v = await procurementAPI.getVendors({ storeId: storeId || undefined });
      setVendors(extractList(v));
      setForm(prev => ({ ...prev, vendorId: data.id }));
      setShowQuickVendor(false);
      setActiveVendorTab('general');
      setQuickVendorForm({
        vendorName: '', mobile: '', email: '', address: '',
        gstNumber: '', contactPerson: '', creditDays: '30', openingBalance: '0',
        paymentTerms: 'Net 30', creditLimit: '0',
        bankName: '', accountNumber: '', ifscCode: '', bankBranch: '',
        vendorCategory: 'RAW_MATERIAL', minOrderQty: '1', isTaxable: false
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error adding vendor');
    }
  };

  const handleQuickProduct = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.keys(quickProductForm).forEach(key => {
        if (quickProductForm[key] !== undefined && quickProductForm[key] !== null) {
          formData.append(key, quickProductForm[key]);
        }
      });

      await adminAPI.createItem(formData);
      toast.success('Product added');
      const p = await adminAPI.getItems();
      setProducts(p.data.filter(x => x.status === 'ACTIVE'));
      setShowQuickProduct(false);
      setQuickProductForm({
        name: '', description: '', mrp: '', price: '', landingPrice: '',
        purchasePrice: '', discount: '0', discountType: 'RUPEE', categoryId: 'default',
        subCategoryId: 'default', brandId: 'default', unitId: '', unitValue: '',
        gst: '0', isFree: false, minShopAmount: '0', status: 'ACTIVE',
        barcode: '', skuCode: '', stock: '0'
      });
    } catch (err) { toast.error(err.response?.data?.message || 'Error adding product'); }
  };

  const addItem = (product = null) => {
    const newItem = {
      productId: product?.id || '',
      name: product?.name || '',
      variantName: product?.variantName || '',
      skuCode: product?.skuCode || 'NO-SKU',
      barcode: product?.barcode || '',
      unit: product?.uom || 'PACK',
      uom: product?.uom || 'PACK',
      quantity: '1',
      unitCostBeforeDiscount: String(product?.purchasePrice || product?.price || '0'),
      discountPercent: '0',
      unitCostBeforeTax: String(product?.purchasePrice || product?.price || '0'),
      subtotalBeforeTax: String(product?.purchasePrice || product?.price || '0'),
      taxType: (product?.gst && product.gst > 0) ? 'GST' : 'NONE',
      taxPercent: String(product?.gst || '0'),
      netCost: String(product?.purchasePrice || product?.price || '0'),
      profitMargin: '0',
      unitSellingPrice: String(product?.price || '0'),
      mfgDate: '',
      expDate: '',
      total: String(product?.purchasePrice || product?.price || '0')
    };
    setForm(prev => ({ ...prev, items: [...prev.items, calculateItemValues(newItem)] }));
  };

  const handleGRNSelect = async (grnId) => {
    if (!grnId) {
      setForm(prev => ({ ...prev, grnId: '', items: [] }));
      return;
    }

    const grn = grns.find(g => g.id === grnId);
    if (!grn) return;

    const targetVendorId = grn.po?.vendorId || grn.po?.vendor?.id || form.vendorId;

    let vendorMappings = [];
    if (targetVendorId) {
      try {
        const { data: vMapRes } = await procurementAPI.getVendorMappings(targetVendorId);
        vendorMappings = vMapRes?.data || vMapRes || [];
      } catch (e) {
        console.error('Failed to load vendor mappings:', e);
      }
    }

    const approvedItems = (grn.items || []).filter(i => i.qcStatus === 'APPROVED');
    const eligibleItems = approvedItems.length > 0
      ? approvedItems
      : (grn.items || []).filter(i => i.qcStatus !== 'REJECTED');

    if (eligibleItems.length === 0) {
      toast.error('Selected GRN has no eligible items (all rejected).');
      setForm(prev => ({ ...prev, grnId: '', items: [] }));
      return;
    }

    const poItemsList = (grn.po && Array.isArray(grn.po.items)) ? grn.po.items : [];

    const mappedItems = eligibleItems.map((item, idx) => {
      // Find matching PO item: first by index, or by variant/product ID
      const poItem = poItemsList[idx] || poItemsList.find(pi => 
        (item.productVariantId && pi.productVariantId === item.productVariantId) ||
        (pi.productId === item.productId)
      );

      // Find variant product item from preloaded products
      const variantProd = (item.productVariantId && products)
        ? products.find(p => p.id === item.productVariantId || (p.isVariantItem && p.productId === item.productVariantId))
        : (item.product?.variants && (item.productVariantId || item.variantName || item.mrp || poItem?.rate))
          ? item.product.variants.find(v => 
              (item.productVariantId && v.id === item.productVariantId) || 
              (item.variantName && v.variantName === item.variantName) || 
              (item.skuCode && v.sku === item.skuCode) || 
              (item.mrp > 0 && Number(v.mrp) === Number(item.mrp)) || 
              (poItem?.rate > 0 && Number(v.price) === Number(poItem.rate))
            )
          : null;

      const prod = products.find(p => p.id === item.productId && !p.isVariantItem) ||
                   products.find(p => p.id === item.productId || p.productId === item.productId);

      const m = (Array.isArray(vendorMappings) ? vendorMappings : []).find(vItem =>
        vItem.productId === item.productVariantId || vItem.productId === item.productId || vItem.product?.id === item.productId || vItem.productId === prod?.id
      );

      const mappedMrp = parseFloat(
        item.mrp > 0 ? item.mrp : 
        (poItem?.mrp > 0 ? poItem.mrp : 
        (variantProd?.mrp > 0 ? variantProd.mrp : 
        (m?.mrp > 0 ? m.mrp : 
        (m?.moq > 0 ? m.moq : 
        (item.product?.mrp > 0 ? item.product.mrp : 
        (prod?.mrp > 0 ? prod.mrp : (prod?.price || 0)))))))
      );

      const mappedLandingPrice = parseFloat(
        item.landingPrice > 0 ? item.landingPrice : 
        (poItem?.landingPrice > 0 ? poItem.landingPrice : 
        (poItem?.rate > 0 ? poItem.rate : 
        (m?.landingPrice > 0 ? m.landingPrice : 
        (variantProd?.purchasePrice > 0 ? variantProd.purchasePrice : 
        (item.product?.purchasePrice > 0 ? item.product.purchasePrice : 
        (prod?.landingPrice > 0 ? prod.landingPrice : (prod?.purchasePrice || 0)))))))
      );

      const mappedSellingPrice = parseFloat(
        item.sellingPrice > 0 ? item.sellingPrice : 
        (poItem?.sellingPrice > 0 ? poItem.sellingPrice : 
        (variantProd?.price > 0 ? variantProd.price : 
        (m?.sellingPrice > 0 ? m.sellingPrice : 
        (item.product?.price > 0 ? item.product.price : 
        (prod?.sellingPrice > 0 ? prod.sellingPrice : (prod?.price || 0))))))
      );

      const qty = item.receivedQty || 1;
      const taxRate = prod?.gst || item.product?.gst || 0;
      const variantName = item.variantName || poItem?.variantName || variantProd?.variantName || prod?.variantName || item.product?.variantName || '';
      const mappedUom = resolveUnit(item.uom || poItem?.uom || variantProd?.unit || m?.uom) || 'PACK';
      const sku = item.skuCode || poItem?.skuCode || item.sku || poItem?.sku || variantProd?.sku || variantProd?.skuCode || prod?.skuCode || prod?.sku || m?.vendorSku || item.product?.skuCode || '';

      const margin = mappedLandingPrice > 0 ? (((mappedSellingPrice - mappedLandingPrice) / mappedLandingPrice) * 100).toFixed(2) : '0';

      return {
        productId: item.productId,
        productVariantId: item.productVariantId || poItem?.productVariantId || variantProd?.id || null,
        name: item.name || poItem?.productName || item.product?.name || prod?.name || 'Unknown Product',
        variantName: variantName,
        skuCode: sku || 'NO-SKU',
        barcode: item.barcode || variantProd?.barcode || item.product?.barcode || prod?.barcode || '',
        unit: mappedUom,
        uom: mappedUom,
        quantity: String(qty),
        maxQuantity: qty,
        mrp: String(mappedMrp),
        unitCostBeforeDiscount: String(mappedLandingPrice),
        discountPercent: '0',
        unitCostBeforeTax: String(mappedLandingPrice),
        subtotalBeforeTax: String(qty * mappedLandingPrice),
        taxType: taxRate > 0 ? 'GST' : 'NONE',
        taxPercent: String(taxRate),
        netCost: String(mappedLandingPrice),
        profitMargin: String(margin),
        unitSellingPrice: String(mappedSellingPrice),
        mfgDate: item.mfgDate ? format(new Date(item.mfgDate), 'yyyy-MM-dd') : '',
        expDate: item.expiryDate ? format(new Date(item.expiryDate), 'yyyy-MM-dd') : '',
        total: poItem?.total !== undefined && poItem.total !== null ? String(poItem.total) : String(qty * mappedLandingPrice)
      };
    });

    setForm(prev => ({
      ...prev,
      grnId,
      vendorId: targetVendorId || prev.vendorId,
      items: mappedItems.map(i => calculateItemValues(i))
    }));

    const label = approvedItems.length > 0 ? 'approved' : 'received';
    toast.success(`Loaded ${eligibleItems.length} ${label} items from GRN #${grn.displayId}`);
  };

  const calculateItemValues = (item) => {
    const qty = parseFloat(item.quantity) || 0;
    const unitCostBD = parseFloat(item.unitCostBeforeDiscount) || 0;
    const discPer = parseFloat(item.discountPercent) || 0;
    const taxPer = parseFloat(item.taxPercent) || 0;
    const unitSellPrice = parseFloat(item.unitSellingPrice) || 0;

    // Subtotal before tax (Cost after discount)
    const subtotalBT = (unitCostBD * qty) * (1 - discPer / 100);
    const unitCostBT = qty > 0 ? subtotalBT / qty : 0;

    // Tax Amount calculated on the Subtotal Before Tax (Exclusive)
    const taxAmount = subtotalBT * (taxPer / 100);

    // Total amount including tax
    const lineTotal = subtotalBT + taxAmount;

    const netCost = qty > 0 ? lineTotal / qty : 0;
    const profitMargin = netCost > 0 ? ((unitSellPrice - netCost) / netCost) * 100 : 0;

    return {
      ...item,
      unitCostBeforeTax: unitCostBT.toFixed(2),
      subtotalBeforeTax: subtotalBT.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: lineTotal.toFixed(2),
      netCost: netCost.toFixed(2),
      profitMargin: profitMargin.toFixed(2)
    };
  };

  const removeItem = (idx) => {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const updateItem = (idx, field, value) => {
    setForm(f => ({
      ...f,
      items: f.items.map((item, i) => {
        if (i === idx) {
          const updatedItem = typeof field === 'object' ? { ...item, ...field } : { ...item, [field]: value };
          return calculateItemValues(updatedItem);
        }
        return item;
      })
    }));
  };

  const handleBarcodeScan = (code) => {
    if (!code) return;
    const cleanCode = String(code).trim();
    const product = products.find(p => 
      (p.barcode && String(p.barcode).trim() === cleanCode) || 
      (p.skuCode && String(p.skuCode).trim() === cleanCode)
    );

    if (product) {
      setForm(prev => {
        const existingIdx = prev.items.findIndex(i => i.productId === product.id);
        if (existingIdx > -1) {
          const updatedItems = [...prev.items];
          const currentQty = parseInt(updatedItems[existingIdx].quantity || 0);
          updatedItems[existingIdx] = calculateItemValues({
            ...updatedItems[existingIdx],
            quantity: String(currentQty + 1)
          });
          toast.success(`Updated Quantity: ${product.name} (${currentQty + 1})`);
          return { ...prev, items: updatedItems };
        } else {
          toast.success(`Added to Invoice: ${product.name}`);
          const newItem = {
            productId: product.id,
            name: product.name,
            skuCode: product.skuCode || 'NO-SKU',
            quantity: '1',
            maxQuantity: null,
            unitCostBeforeDiscount: String(product.purchasePrice || product.price || 0),
            discountPercent: '0',
            unitCostBeforeTax: String(product.purchasePrice || product.price || 0),
            subtotalBeforeTax: '0',
            taxType: (product.gst && product.gst > 0) ? 'GST' : 'NONE',
            taxPercent: String(product.gst || '0'),
            netCost: String(product.purchasePrice || product.price || 0),
            profitMargin: '0',
            unitSellingPrice: String(product.price || 0),
            mfgDate: '',
            expDate: '',
            total: '0'
          };
          return {
            ...prev,
            items: [
              ...prev.items,
              calculateItemValues(newItem)
            ]
          };
        }
      });
      setSelectedProduct(null);
      setItemSearch('');
      setShowItemResults(false);
      setSearchQty('1');
      setSearchPrice('0');
    } else {
      toast.error('Product not found for this barcode');
    }
  };

  const handleEdit = async (purchase) => {
    setActionLoading({ id: purchase.id, type: 'edit' });
    try {
      const [vRes, pRes, cRes, uRes, scRes, sRes, poRes, gRes] = await Promise.all([
        procurementAPI.getVendors({ storeId: storeId || undefined }),
        adminAPI.getItems({ storeId: storeId || undefined }),
        adminAPI.getCategories(),
        adminAPI.getUnits(),
        adminAPI.getSubCategories(),
        adminAPI.getSettings(),
        procurementAPI.getPurchaseOrders({ status: 'APPROVED,ORDERED,DELIVERED', storeId: storeId || undefined }),
        procurementAPI.getGRNs({ status: 'APPROVED,PARTIAL', storeId: storeId || undefined })
      ]);

      const loadedVendors = extractList(vRes);
      const rawProducts = (pRes.data || []).filter(x => x.isActive || x.status === 'APPROVED');
      const loadedProducts = [];
      rawProducts.forEach(prod => {
        loadedProducts.push({
          ...prod,
          id: prod.id,
          productId: prod.id,
          skuCode: prod.skuCode || prod.sku || 'NO-SKU',
          sku: prod.sku || prod.skuCode || '',
          variantName: prod.variantName || ''
        });
        if (Array.isArray(prod.variants) && prod.variants.length > 0) {
          prod.variants.forEach(variant => {
            loadedProducts.push({
              ...prod,
              id: variant.id || `${prod.id}_${variant.variantName}`,
              productId: variant.productId || (variant.id && !variant.id.includes('_') ? variant.id : prod.id),
              parentProductId: prod.id,
              name: prod.name,
              variantName: variant.variantName || variant.name || '',
              isVariantItem: true,
              price: variant.sellingPrice ?? variant.price ?? prod.price,
              purchasePrice: variant.purchasePrice ?? variant.costPrice ?? variant.landingPrice ?? prod.purchasePrice ?? prod.price,
              skuCode: variant.sku || variant.skuCode || prod.skuCode || prod.sku || 'NO-SKU',
              sku: variant.sku || variant.skuCode || '',
              barcode: variant.barcode || prod.barcode,
              unit: resolveUnit(variant.unit || variant.unitType || prod.unit),
              unitValue: variant.measurement || variant.unitValue || prod.unitValue,
              measurement: variant.measurement || prod.measurement,
              variants: []
            });
          });
        }
      });

      const loadedCategories = cRes.data?.categories || cRes.data?.data?.categories || (Array.isArray(cRes.data) ? cRes.data : []);
      const loadedUnits = Array.isArray(uRes.data) ? uRes.data : uRes.data?.units || uRes.data?.data?.units || [];
      const loadedSubCats = Array.isArray(scRes.data) ? scRes.data : scRes.data?.subCategories || scRes.data?.data?.subCategories || [];
      const loadedPOs = poRes.data || [];
      const loadedGrns = gRes.data?.data || gRes.data || gRes || [];

      setVendors(loadedVendors);
      setProducts(loadedProducts);
      setCategories(loadedCategories);
      setUnits(loadedUnits);
      setSubCategories(loadedSubCats);
      setPurchaseOrders(loadedPOs);
      setGrns(loadedGrns);

      if (sRes.data?.success && sRes.data?.data?.taxRates) {
        const rates = sRes.data.data.taxRates.split(',').map(r => parseFloat(r.trim())).filter(r => !isNaN(r));
        setTaxSlabs(rates);
      }

      // 2. Fetch target purchase invoice details
      const res = await procurementAPI.getPurchaseById(purchase.id);
      const data = res.data?.data || res.data || purchase;

      let vMappings = [];
      if (data.vendorId) {
        try {
          const vMapRes = await procurementAPI.getVendorMappings(data.vendorId);
          vMappings = Array.isArray(vMapRes.data?.data) ? vMapRes.data.data : (Array.isArray(vMapRes.data) ? vMapRes.data : []);
        } catch (e) {
          console.warn('Vendor mappings fetch warning:', e);
        }
      }

      const rawItems = Array.isArray(data.items) ? data.items : [];
      const invoiceDateFormatted = data.invoiceDate 
        ? String(data.invoiceDate).split('T')[0] 
        : format(new Date(), 'yyyy-MM-dd');

      const mappedItems = rawItems.map(i => {
        const cost = parseFloat(i.unitCostBeforeDiscount) || parseFloat(i.price) || 0;
        const taxRate = parseFloat(i.taxPercent) || 0;
        const prod = (loadedProducts || []).find(p => 
          (i.productVariantId && (p.id === i.productVariantId || (p.isVariantItem && p.productId === i.productVariantId))) ||
          (!i.productVariantId && p.id === i.productId && !p.isVariantItem)
        ) || (loadedProducts || []).find(p => p.id === i.productId);
        const m = (vMappings || []).find(x => 
          String(x.vendorId) === String(data.vendorId) && 
          (String(x.productId) === String(i.productVariantId || i.productId) || String(x.product?.id) === String(i.productId))
        );

        const mappedMrp = parseFloat(
          (i.mrp !== undefined && i.mrp !== null && i.mrp !== '' && parseFloat(i.mrp) > 0)
            ? i.mrp
            : (m?.mrp > 0 ? m.mrp : 
              (m?.moq > 0 ? m.moq : 
              (m?.price > 0 ? m.price : 
              (i.product?.mrp > 0 ? i.product.mrp : 
              (prod?.mrp > 0 ? prod.mrp : 
              (i.product?.price > 0 ? i.product.price : 
              (prod?.price > 0 ? prod.price : 
              (cost > 0 ? cost : 0))))))))
        );

        const mappedLandingPrice = (i.unitCostBeforeDiscount !== undefined && parseFloat(i.unitCostBeforeDiscount) > 0)
          ? i.unitCostBeforeDiscount
          : (i.price > 0 ? i.price : (m?.landingPrice || i.product?.purchasePrice || prod?.landingPrice || prod?.purchasePrice || cost));

        const mappedSellingPrice = (i.unitSellingPrice !== undefined && parseFloat(i.unitSellingPrice) > 0)
          ? i.unitSellingPrice
          : (m?.sellingPrice || i.product?.price || prod?.sellingPrice || prod?.price || cost);

        const mappedUom = resolveUnit(m?.uom || i.uom || prod?.unit) || 'PACK';

        const baseItem = {
          productId: i.productId,
          productVariantId: i.productVariantId || null,
          name: i.product?.name || prod?.name || 'Unknown',
          variantName: i.variantName || prod?.variantName || i.product?.variantName || '',
          skuCode: i.skuCode || i.product?.skuCode || prod?.skuCode || prod?.sku || 'NO-SKU',
          barcode: i.barcode || i.product?.barcode || prod?.barcode || '',
          unit: mappedUom,
          uom: mappedUom,
          quantity: String(i.quantity || 1),
          maxQuantity: i.quantity || 1,
          mrp: String(mappedMrp || 0),
          unitCostBeforeDiscount: String(mappedLandingPrice || 0),
          discountPercent: String(i.discountPercent || 0),
          unitCostBeforeTax: String(i.unitCostBeforeTax || mappedLandingPrice || 0),
          subtotalBeforeTax: String(i.subtotalBeforeTax || (i.quantity * mappedLandingPrice)),
          taxType: i.taxType || (taxRate > 0 ? 'GST' : 'NONE'),
          taxPercent: String(taxRate),
          netCost: String(i.netCost || mappedLandingPrice || 0),
          profitMargin: String(i.profitMargin || 0),
          unitSellingPrice: String(mappedSellingPrice || 0),
          mfgDate: (i.mfgDate || i.mfg_date || i.mfg) ? String(i.mfgDate || i.mfg_date || i.mfg).split('T')[0] : '',
          expDate: (i.expDate || i.expiryDate || i.exp_date || i.exp) ? String(i.expDate || i.expiryDate || i.exp_date || i.exp).split('T')[0] : '',
          total: String(i.total || (i.quantity * mappedLandingPrice))
        };
        return calculateItemValues(baseItem);
      });

      setForm({
        id: data.id,
        vendorId: data.vendorId || '',
        grnId: data.grnId || '',
        invoiceNumber: data.invoiceNumber || '',
        invoiceDate: invoiceDateFormatted,
        transportCharges: String(data.transportCharges || 0),
        otherCharges: String(data.otherCharges || 0),
        items: mappedItems
      });

      setShowForm(true);
    } catch (err) {
      console.error('handleEdit error:', err);
      toast.error(err.response?.data?.message || err.message || 'Error loading purchase invoice for edit');
    } finally {
      setActionLoading({ id: null, type: null });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this purchase invoice? This will revert stock and vendor balance.')) return;
    setActionLoading({ id, type: 'delete' });
    try {
      await procurementAPI.deletePurchase(id);
      toast.success('Purchase deleted');
      const { data } = await procurementAPI.getPurchases();
      setPurchases(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting purchase');
    } finally {
      setActionLoading({ id: null, type: null });
    }
  };

  const handleZipUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.name.endsWith('.zip')) {
      toast.success('ZIP file received. Processing contents...');
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws);

        if (rawData.length === 0) {
          toast.error('Import file is empty');
          return;
        }

        const cleanNum = (val) => {
          if (val === undefined || val === null || val === '') return 0;
          if (typeof val === 'number') return val;
          const cleaned = String(val).replace(/[^0-9.-]/g, '');
          const num = parseFloat(cleaned);
          return isNaN(num) ? 0 : num;
        };

        const finalItemsToAdd = [];
        rawData.forEach(row => {
          const sku = String(row['SKU Code'] || row['SKU'] || row['sku'] || '').trim();
          const pName = String(row['Product Name'] || row['Name'] || row['name'] || '').trim();
          const qty = cleanNum(row['Quantity'] || row['Qty'] || row['qty'] || 1);
          const price = cleanNum(row['Price'] || row['Unit Cost'] || row['Cost'] || 0);

          let found = null;
          if (sku) found = products.find(p => p.skuCode?.toLowerCase() === sku.toLowerCase());
          if (!found && pName) found = products.find(p => p.name?.toLowerCase() === pName.toLowerCase());

          if (found) {
            finalItemsToAdd.push({
              productId: found.id,
              quantity: qty,
              price: price || String(found.purchasePrice || found.price || 0)
            });
          }
        });

        if (finalItemsToAdd.length > 0) {
          const processedItems = finalItemsToAdd.map(item => {
            const product = products.find(p => p.id === item.productId);
            const cost = parseFloat(item.price) || product?.purchasePrice || product?.price || 0;
            const newItem = {
              productId: item.productId,
              name: product?.name || 'Unknown Product',
              skuCode: product?.skuCode || 'NO-SKU',
              quantity: String(item.quantity),
              maxQuantity: null,
              unitCostBeforeDiscount: String(cost),
              discountPercent: '0',
              unitCostBeforeTax: String(cost),
              subtotalBeforeTax: '0',
              taxType: (product?.gst && product.gst > 0) ? 'GST' : 'NONE',
              taxPercent: String(product?.gst || '0'),
              netCost: String(cost),
              profitMargin: '0',
              unitSellingPrice: String(product?.price || 0),
              mfgDate: '',
              expDate: '',
              total: '0'
            };
            return calculateItemValues(newItem);
          });
          setForm(prev => ({
            ...prev,
            items: [...prev.items, ...processedItems]
          }));
          toast.success(`Imported ${finalItemsToAdd.length} items from ${file.name}`);
        } else {
          toast.error('No matching products found in import file');
        }
      } catch (err) {
        console.error('File Import Error:', err);
        toast.error('Failed to parse import file');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vendorId || !form.invoiceNumber || !form.grnId || form.items.length === 0) {
      return toast.error('Vendor, Invoice Number, and GRN are required');
    }
    if (form.items.some(i => !i.productId || !i.quantity || i.quantity <= 0)) {
      return toast.error('Please select a product and valid quantity for all items');
    }
    try {
      setIsSubmitting(true);
      const payload = {
        ...form,
        items: form.items.map(i => ({
          productId: i.productId,
          quantity: parseInt(i.quantity),
          price: parseFloat(i.netCost), // Using netCost as the base price for stock/ledger if needed
          unitCostBeforeDiscount: parseFloat(i.unitCostBeforeDiscount),
          discountPercent: parseFloat(i.discountPercent),
          unitCostBeforeTax: parseFloat(i.unitCostBeforeTax),
          subtotalBeforeTax: parseFloat(i.subtotalBeforeTax),
          taxType: i.taxType,
          taxPercent: parseFloat(i.taxPercent),
          netCost: parseFloat(i.netCost),
          total: parseFloat(i.total),
          profitMargin: parseFloat(i.profitMargin),
          unitSellingPrice: parseFloat(i.unitSellingPrice),
          mfgDate: i.mfgDate || null,
          expDate: i.expDate || null
        }))
      };

      if (form.id) {
        await procurementAPI.updatePurchase(form.id, payload);
        toast.success('Purchase invoice updated');
      } else {
        await procurementAPI.createPurchase(payload);
        toast.success('Purchase invoice created');
      }

      setShowForm(false);
      setForm({ vendorId: '', poId: '', invoiceNumber: generateInvoiceNumber(), invoiceDate: format(new Date(), 'yyyy-MM-dd'), transportCharges: '0', otherCharges: '0', items: [] });
      // Reload
      const { data } = await procurementAPI.getPurchases();
      setPurchases(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving purchase');
    } finally {
      setIsSubmitting(false);
    }
  };

  const invoiceStatusColors = {
    DRAFT: 'bg-gray-100 text-gray-500',
    CONFIRMED: 'bg-blue-50 text-blue-600 border-blue-100',
    PAID: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    PARTIAL_PAID: 'bg-orange-50 text-orange-600 border-orange-100'
  };

  return (
    <div className="space-y-4 h-full overflow-y-auto custom-scrollbar pb-10 pr-2">
      {(!showForm && !showQuickProduct && !showQuickVendor) && (
        <>
          <div className="flex items-center gap-2 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={14} />
              <input
                type="text"
                placeholder="Search invoices..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white border border-gray-100 rounded-xl pl-9 pr-4 py-2 text-[11px] font-black text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-gray-300"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="bg-white px-4 py-1.5 rounded-xl border border-gray-100 shadow-sm flex flex-col items-end">
                <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 leading-none">Total Purchases</span>
                <span className="text-xs font-black text-gray-900 mt-0.5">₹{purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0).toLocaleString()}</span>
              </div>

              {can('PROCUREMENT', 'CREATE', 'PURCHASES') && (
                <button
                  onClick={openForm}
                  disabled={formLoading}
                  className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/10 active:scale-95 disabled:opacity-70">
                  {formLoading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} strokeWidth={3} />}
                  New Purchase
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-emerald-600" size={40} /></div>
          ) : purchases.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 border border-dashed border-gray-200 text-center">
              <Receipt size={48} className="mx-auto text-gray-200 mb-3" />
              <h3 className="text-lg font-black text-gray-300">No Purchases Yet</h3>
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar w-full">
                <table className="w-max min-w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100 whitespace-nowrap">
                      <th className="px-6 py-3 text-left text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 whitespace-nowrap">Invoice</th>
                      <th className="px-6 py-3 text-left text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 whitespace-nowrap">PO</th>
                      <th className="px-6 py-3 text-left text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 whitespace-nowrap">Date</th>
                      <th className="px-6 py-3 text-left text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 whitespace-nowrap">Vendor</th>
                      <th className="px-6 py-3 text-center text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 whitespace-nowrap">Total</th>
                      <th className="px-6 py-3 text-right text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 sticky right-0 bg-gray-50 z-10 shadow-[-10px_0_10px_-3px_rgba(0,0,0,0.05)] whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {purchases.filter(p =>
                      !search ||
                      p.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
                      p.vendor?.vendorName.toLowerCase().includes(search.toLowerCase())
                    ).map(p => (
                      <tr key={p.id} className="hover:bg-emerald-50/30 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] font-black text-gray-900 leading-none">#{p.invoiceNumber}</span>
                            {p.displayId && <span className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter leading-none">{p.displayId}</span>}
                            
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">
                            {p.po ? (p.po.displayId || `PO${p.po.poNumber}`) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-black text-gray-500 uppercase">{format(new Date(p.invoiceDate), 'dd MMM yyyy')}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-gray-700 truncate">{p.vendor?.vendorName}</span>
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{p.vendor?.mobile || 'No Contact'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <span className="text-[12px] font-black text-gray-900">₹{(p.totalAmount || 0).toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4 text-right sticky right-0 bg-white group-hover:bg-emerald-50/30 transition-all z-10 shadow-[-10px_0_10px_-3px_rgba(0,0,0,0.05)] whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {can('PROCUREMENT', 'UPDATE', 'PURCHASES') && (
                              <button
                                onClick={() => handleEdit(p)}
                                disabled={actionLoading.id === p.id}
                                className="p-2 bg-white text-gray-400 hover:text-emerald-600 rounded-xl border border-gray-100 shadow-sm transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
                                title="Edit"
                              >
                                {actionLoading.id === p.id && actionLoading.type === 'edit' ? (
                                  <Loader2 size={14} className="animate-spin text-emerald-600" />
                                ) : (
                                  <Edit3 size={14} strokeWidth={3} />
                                )}
                              </button>
                            )}
                            {can('PROCUREMENT', 'DELETE', 'PURCHASES') && (
                              <button
                                onClick={() => handleDelete(p.id)}
                                disabled={actionLoading.id === p.id}
                                className="p-2 bg-white text-gray-400 hover:text-rose-600 rounded-xl border border-gray-100 shadow-sm transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
                                title="Delete"
                              >
                                {actionLoading.id === p.id && actionLoading.type === 'delete' ? (
                                  <Loader2 size={14} className="animate-spin text-rose-600" />
                                ) : (
                                  <Trash2 size={14} strokeWidth={3} />
                                )}
                              </button>
                            )}
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
      )}

      {showForm && (
        <div className={`bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 ${showQuickProduct || showQuickVendor ? 'hidden' : 'block'}`}>
          <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
            <button type="button" onClick={() => setShowForm(false)} className="p-2 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 hover:text-emerald-600 transition-all">
              <ArrowLeft size={18} />
            </button>
            <h3 className="text-xl font-black text-gray-900">{form.id ? 'Edit Purchase Invoice' : 'New Purchase Invoice'}</h3>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Vendor *</label>
                <select value={form.vendorId} onChange={e => setForm({ ...form, vendorId: e.target.value })} required
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                  <option value="">Select Vendor</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.vendorName}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Link GRN (Mandatory) *</label>
                <select
                  required
                  value={form.grnId}
                  onChange={e => handleGRNSelect(e.target.value)}
                  className="w-full bg-emerald-50/50 rounded-xl px-4 py-3 text-sm font-bold border border-emerald-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-emerald-700">
                  <option value="">Select GRN</option>
                  {(form.vendorId
                    ? grns.filter(g =>
                        g.po?.vendorId === form.vendorId ||
                        g.po?.vendor?.id === form.vendorId ||
                        g.vendorId === form.vendorId
                      )
                    : grns
                  ).map(g => (
                    <option key={g.id} value={g.id}>GRN #{g.displayId} — {format(new Date(g.createdAt), 'dd MMM yyyy')} ({g.status})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between pl-1 pr-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Invoice # *</label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, invoiceNumber: generateInvoiceNumber() })}
                    className="text-[9px] font-black text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                    title="Generate a new invoice number"
                  >
                    ↻ Regenerate
                  </button>
                </div>
                <input required placeholder="e.g. VGK-20260917-A3F9" value={form.invoiceNumber} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono tracking-wide" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Invoice Date</label>
                <input type="date" value={form.invoiceDate} onChange={e => setForm({ ...form, invoiceDate: e.target.value })}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
            </div>
            {/* Items */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div className="flex flex-col">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 pl-1">Line Items</label>
                  <p className="text-xs text-gray-500 font-bold mt-1 pl-1">Items are auto-fetched from the linked GRN.</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50/50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <Package size={14} className="text-emerald-600" />
                    Line Items ({form.items.length})
                  </h3>
                  <div className="relative group">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={10} />
                    <input
                      type="text"
                      placeholder="FILTER ADDED ITEMS..."
                      value={itemFilter}
                      onChange={(e) => setItemFilter(e.target.value)}
                      className="pl-8 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-[9px] font-black w-72 sm:w-[720px] focus:ring-2 focus:ring-emerald-500 outline-none transition-all uppercase placeholder:text-gray-300"
                    />
                    {itemFilter && (
                      <button onClick={() => setItemFilter('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X size={10} strokeWidth={3} />
                      </button>
                    )}
                  </div>
                </div>
                
              </div>
              <div className="bg-white rounded-b-3xl border-t border-gray-100 overflow-x-auto custom-scrollbar" onClick={() => setShowItemResults(false)}>
                {form.items.length === 0 ? (
                  <div className="py-12 text-center">
                    <Package className="mx-auto text-gray-200 mb-3" size={48} />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No items added yet</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[850px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-200/80">
                        <th className="px-3 py-2.5 text-center text-[9px] font-black uppercase tracking-wider text-gray-500 w-8">#</th>
                        <th className="px-4 py-2.5 text-left text-[9px] font-black uppercase tracking-wider text-gray-500 min-w-[220px]">Product</th>
                        <th className="px-3 py-2.5 text-right text-[9px] font-black uppercase tracking-wider text-gray-500 min-w-[70px]">Qty</th>
                        <th className="px-3 py-2.5 text-center text-[9px] font-black uppercase tracking-wider text-gray-500 min-w-[65px]">UOM</th>
                        <th className="px-3 py-2.5 text-right text-[9px] font-black uppercase tracking-wider text-gray-500 min-w-[90px]">MRP</th>
                        <th className="px-3 py-2.5 text-right text-[9px] font-black uppercase tracking-wider text-gray-500 min-w-[105px]">Landing Price</th>
                        <th className="px-3 py-2.5 text-right text-[9px] font-black uppercase tracking-wider text-gray-500 min-w-[85px]">Margin %</th>
                        <th className="px-3 py-2.5 text-right text-[9px] font-black uppercase tracking-wider text-gray-500 min-w-[105px]">Selling Price</th>
                        <th className="px-3 py-2.5 text-center text-[9px] font-black uppercase tracking-wider text-gray-500 min-w-[120px]">Mfg. Date</th>
                        <th className="px-3 py-2.5 text-center text-[9px] font-black uppercase tracking-wider text-gray-500 min-w-[120px]">Expiry Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {form.items
                        .map((item, index) => ({ ...item, originalIndex: index }))
                        .filter(item => {
                          const p = products.find(x => 
                            (item.productVariantId && (x.id === item.productVariantId || (x.isVariantItem && x.productId === item.productVariantId))) ||
                            (!item.productVariantId && x.id === item.productId && !x.isVariantItem)
                          ) || products.find(x => x.id === item.productId);
                          const search = itemFilter.toLowerCase();
                          if (!search) return true;
                          const name = item.name || p?.name || '';
                          const variant = item.variantName || p?.variantName || '';
                          const barcode = item.barcode || p?.barcode || '';
                          const sku = item.skuCode || item.sku || p?.skuCode || p?.sku || '';
                          return (
                            name.toLowerCase().includes(search) ||
                            variant.toLowerCase().includes(search) ||
                            barcode.toLowerCase().includes(search) ||
                            sku.toLowerCase().includes(search)
                          );
                        })
                        .map((item, filteredIdx) => {
                          const p = products.find(x => 
                            (item.productVariantId && (x.id === item.productVariantId || (x.isVariantItem && x.productId === item.productVariantId))) ||
                            (!item.productVariantId && x.id === item.productId && !x.isVariantItem)
                          ) || products.find(x => x.id === item.productId);
                          const originalIdx = item.originalIndex;
                          const currentVariant = item.variantName || p?.variantName;
                          const currentSku = item.skuCode || item.sku || p?.skuCode || p?.sku || item.product?.skuCode || item.barcode || p?.barcode || 'NO-SKU';
                          const unitLabel = resolveUnit(item.uom) || resolveUnit(item.unit) || 'PACK';
                          return (
                            <tr key={originalIdx} className="hover:bg-slate-50/80 transition-colors group">
                              <td className="px-3 py-3 text-center">
                                <span className="text-[10px] font-black text-gray-400">{originalIdx + 1}</span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[11px] font-black text-gray-900 uppercase tracking-tight leading-tight">{item.name || p?.name}</span>
                                    {currentVariant && (
                                      <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100/60">
                                        {currentVariant}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[9px] font-semibold text-gray-400 mt-0.5">({currentSku})</span>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-right">
                                <input
                                  type="text"
                                  readOnly
                                  value={item.quantity || '0'}
                                  className="w-16 bg-slate-100/70 border border-slate-200/50 rounded-lg px-2 py-1 text-[10px] font-black text-right text-slate-700 cursor-not-allowed focus:outline-none ml-auto"
                                />
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className="inline-block bg-slate-100/80 text-slate-600 font-black text-[9px] px-2 py-0.5 rounded uppercase tracking-wider border border-slate-200/60">
                                  {unitLabel || 'PCS'}
                                </span>
                              </td>

                              <td className="px-3 py-3 text-right">
                                <input
                                  type="text"
                                  readOnly
                                  value={item.mrp !== undefined && item.mrp !== '' ? `₹${parseFloat(item.mrp || 0).toFixed(2)}` : '₹0.00'}
                                  className="w-20 bg-slate-100/70 border border-slate-200/50 rounded-lg px-2 py-1 text-[10px] font-black text-right text-slate-700 cursor-not-allowed focus:outline-none ml-auto"
                                />
                              </td>
                              <td className="px-3 py-3 text-right">
                                <input
                                  type="text"
                                  readOnly
                                  value={(item.unitCostBeforeDiscount || item.landingPrice) ? `₹${parseFloat(item.unitCostBeforeDiscount || item.landingPrice || 0).toFixed(2)}` : '₹0.00'}
                                  className="w-20 bg-slate-100/70 border border-slate-200/50 rounded-lg px-2 py-1 text-[10px] font-black text-right text-slate-700 cursor-not-allowed focus:outline-none ml-auto"
                                />
                              </td>
                              <td className="px-3 py-3 text-right">
                                <span className={`inline-flex items-center justify-end px-2 py-0.5 rounded-md text-[10px] font-black ${parseFloat(item.profitMargin) >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/60' : 'bg-rose-50 text-rose-700 border border-rose-100/60'}`}>
                                  {item.profitMargin}%
                                </span>
                              </td>
                              <td className="px-3 py-3 text-right">
                                <input
                                  type="text"
                                  readOnly
                                  value={item.unitSellingPrice ? `₹${parseFloat(item.unitSellingPrice || 0).toFixed(2)}` : '₹0.00'}
                                  className="w-20 bg-slate-100/70 border border-slate-200/50 rounded-lg px-2 py-1 text-[10px] font-black text-right text-slate-700 cursor-not-allowed focus:outline-none ml-auto"
                                />
                              </td>
                              <td className="px-3 py-3 text-center">
                                <input
                                  type="date"
                                  value={item.mfgDate || ''}
                                  onChange={e => updateItem(originalIdx, 'mfgDate', e.target.value)}
                                  className="w-full bg-white border border-gray-200 rounded-lg px-1.5 py-1 text-[9px] font-black text-center focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                />
                              </td>
                              <td className="px-3 py-3 text-center">
                                <input
                                  type="date"
                                  value={item.expDate || ''}
                                  onChange={e => updateItem(originalIdx, 'expDate', e.target.value)}
                                  className="w-full bg-white border border-gray-200 rounded-lg px-1.5 py-1 text-[9px] font-black text-center focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                />
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <><Loader2 className="animate-spin" size={16} /> Saving...</>
              ) : (
                form.id ? 'Update Purchase Invoice' : 'Create Purchase Invoice'
              )}
            </button>
          </form>
        </div>
      )}

      {/* Quick Product Form (Inline) */}
      {showQuickProduct && (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
            <button type="button" onClick={() => setShowQuickProduct(false)} className="p-3 bg-gray-50 text-gray-400 hover:text-emerald-600 rounded-2xl transition-all active:scale-90">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Full Item Creation</h3>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Master Inventory Entry</p>
            </div>
          </div>

          <form onSubmit={handleQuickProduct} className="space-y-10">
            {/* Basic Information */}
            <section className="space-y-6">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-l-4 border-emerald-500 pl-3">Basic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Product Name *</label>
                  <input placeholder="Enter product name" required value={quickProductForm.name} onChange={e => setQuickProductForm({ ...quickProductForm, name: e.target.value })}
                    className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">SKU Code</label>
                  <input placeholder="Internal identifier" value={quickProductForm.skuCode} onChange={e => setQuickProductForm({ ...quickProductForm, skuCode: e.target.value })}
                    className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Barcode (EAN/UPC)</label>
                  <div className="flex gap-2">
                    <input placeholder="Scan or type barcode" value={quickProductForm.barcode} onChange={e => setQuickProductForm({ ...quickProductForm, barcode: e.target.value })}
                      className="flex-1 bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner" />
                    <button type="button" onClick={() => setShowScanner(true)} className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-100 transition-all">
                      <ScanBarcode size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Classification */}
            <section className="space-y-6">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-l-4 border-blue-500 pl-3">Classification</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Category *</label>
                  <select required value={quickProductForm.categoryId} onChange={e => setQuickProductForm({ ...quickProductForm, categoryId: e.target.value })}
                    className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all shadow-inner">
                    <option value="default">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Sub-Category</label>
                  <select value={quickProductForm.subCategoryId} onChange={e => setQuickProductForm({ ...quickProductForm, subCategoryId: e.target.value })}
                    className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all shadow-inner">
                    <option value="default">Select Sub-Category</option>
                    {subCategories.filter(sc => sc.categoryId === quickProductForm.categoryId).map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                  </select>
                </div>
              </div>
            </section>

            {/* Pricing & Tax */}
            <section className="space-y-6">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-l-4 border-purple-500 pl-3">Pricing & Tax</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">MRP (₹)</label>
                  <input type="number" step="0.01" placeholder="0.00" value={quickProductForm.mrp} onChange={e => setQuickProductForm({ ...quickProductForm, mrp: e.target.value })}
                    className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Purchase Price (₹)</label>
                  <input type="number" step="0.01" placeholder="0.00" value={quickProductForm.purchasePrice} onChange={e => setQuickProductForm({ ...quickProductForm, purchasePrice: e.target.value })}
                    className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Selling Price *</label>
                  <input type="number" step="0.01" placeholder="0.00" required value={quickProductForm.price} onChange={e => setQuickProductForm({ ...quickProductForm, price: e.target.value })}
                    className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">GST (%)</label>
                  <select value={quickProductForm.gst} onChange={e => setQuickProductForm({ ...quickProductForm, gst: e.target.value })}
                    className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                    {taxSlabs.map(s => <option key={s} value={s}>{s}%</option>)}
                  </select>
                </div>
              </div>
            </section>

            {/* Units & Initial Stock */}
            <section className="space-y-6">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-l-4 border-amber-500 pl-3">Units & Initial Stock</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Unit Type</label>
                  <select value={quickProductForm.unitId} onChange={e => setQuickProductForm({ ...quickProductForm, unitId: e.target.value })}
                    className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all shadow-inner">
                    <option value="">Select Unit</option>
                    {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Unit Value</label>
                  <input placeholder="e.g. 500" value={quickProductForm.unitValue} onChange={e => setQuickProductForm({ ...quickProductForm, unitValue: e.target.value })}
                    className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Opening Stock (In Store)</label>
                  <input type="number" placeholder="0" value={quickProductForm.stock} onChange={e => setQuickProductForm({ ...quickProductForm, stock: e.target.value })}
                    className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner" />
                </div>
              </div>
            </section>

            <div className="flex gap-4 pt-6 border-t border-gray-100">
              <button type="button" onClick={() => setShowQuickProduct(false)} className="flex-1 py-4 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 rounded-2xl transition-all">Cancel</button>
              <button className="flex-[2] bg-emerald-600 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all">Create Master Item</button>
            </div>
          </form>
        </div>
      )}
      {showScanner && (
        <BarcodeScannerOverlay
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};

export default PurchasesSection;
