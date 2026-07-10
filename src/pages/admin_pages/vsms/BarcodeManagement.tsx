import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Barcode, Search, QrCode, ShieldCheck, Printer, RefreshCw, Upload, FileText,
  Trash2, Plus, Info, Tag, Check, AlertCircle, Calendar, PlusCircle, CheckCircle2,
  Package, LayoutGrid, Layers, Camera, X, ArrowLeft, Eye, Edit2, RotateCcw, Filter,
  Minus, ChevronLeft, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { barcodeAPI } from './services/barcodeService';
import adminAPI from './services/adminService';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useBarcodeScanner } from './agent/hooks/useBarcodeScanner';
import BarcodeScannerOverlay from '../../../components/BarcodeScannerOverlay';

// Code 128 Barcode drawing function on Canvas
const drawBarcode128 = (canvas, text) => {
  if (!canvas || !text) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Code 128 pattern table
  const PATTERNS = [
    [2, 1, 2, 2, 2, 2], [2, 2, 2, 1, 2, 2], [2, 2, 2, 2, 2, 1], [1, 2, 1, 2, 2, 3], // 0-3
    [1, 2, 1, 3, 2, 2], [1, 3, 1, 2, 2, 2], [1, 2, 2, 2, 1, 3], [1, 2, 2, 3, 1, 2], // 4-7
    [1, 3, 2, 2, 1, 2], [2, 2, 1, 2, 1, 3], [2, 2, 1, 3, 1, 2], [2, 3, 1, 2, 1, 2], // 8-11
    [1, 1, 2, 2, 3, 2], [1, 2, 2, 1, 3, 2], [1, 2, 2, 2, 3, 1], [1, 1, 3, 2, 2, 2], // 12-15
    [1, 2, 3, 1, 2, 2], [1, 2, 3, 2, 2, 1], [2, 2, 3, 2, 1, 1], [2, 2, 1, 1, 3, 2], // 16-19
    [2, 2, 1, 2, 3, 1], [2, 1, 3, 2, 1, 2], [2, 2, 3, 1, 1, 2], [3, 1, 2, 1, 3, 1], // 20-23
    [3, 1, 1, 2, 2, 2], [3, 2, 1, 1, 2, 2], [3, 2, 1, 2, 2, 1], [3, 1, 2, 2, 1, 2], // 24-27
    [3, 2, 2, 1, 1, 2], [3, 2, 2, 2, 1, 1], [2, 1, 2, 1, 2, 3], [2, 1, 2, 3, 2, 1], // 32-35
    [2, 3, 2, 1, 2, 1], [1, 1, 1, 3, 2, 3], [1, 3, 1, 1, 2, 3], [1, 3, 1, 3, 2, 1], // 36-39
    [1, 1, 2, 3, 1, 3], [1, 3, 2, 1, 1, 3], [1, 3, 2, 3, 1, 1], [2, 1, 1, 3, 1, 3], // 40-43
    [2, 3, 1, 1, 1, 3], [2, 3, 1, 3, 1, 1], [1, 1, 2, 1, 3, 3], [1, 1, 2, 3, 3, 1], // 44-47
    [1, 3, 2, 1, 3, 1], [1, 1, 3, 1, 2, 3], [1, 1, 3, 3, 2, 1], [1, 3, 3, 1, 2, 1], // 48-51
    [3, 1, 3, 1, 2, 1], [2, 1, 1, 3, 3, 1], [2, 3, 1, 1, 3, 1], [2, 1, 3, 1, 1, 3], // 52-55
    [2, 1, 3, 3, 1, 1], [2, 1, 3, 1, 3, 1], [3, 1, 1, 1, 2, 3], [3, 1, 1, 3, 2, 1], // 56-59
    [3, 3, 1, 1, 2, 1], [3, 1, 2, 1, 1, 3], [3, 1, 2, 3, 1, 1], [3, 3, 2, 1, 1, 1], // 60-63
    [3, 1, 4, 1, 1, 1], [2, 2, 1, 4, 1, 1], [4, 3, 1, 1, 1, 1], [1, 1, 1, 2, 2, 4], // 64-67
    [1, 1, 1, 4, 2, 2], [1, 2, 1, 1, 2, 4], [1, 2, 1, 4, 2, 1], [1, 4, 1, 1, 2, 2], // 68-71
    [1, 4, 1, 2, 2, 1], [1, 1, 2, 2, 1, 4], [1, 1, 2, 4, 1, 2], [1, 2, 2, 1, 1, 4], // 72-75
    [1, 2, 2, 4, 1, 1], [1, 4, 2, 1, 1, 2], [1, 4, 2, 2, 1, 1], [2, 4, 1, 2, 1, 1], // 76-79
    [2, 2, 1, 1, 1, 4], [4, 1, 3, 1, 1, 1], [2, 4, 1, 1, 1, 2], [1, 3, 4, 1, 1, 1], // 80-83
    [1, 1, 1, 2, 4, 2], [1, 2, 1, 1, 4, 2], [1, 2, 1, 2, 4, 1], [1, 1, 4, 2, 1, 2], // 84-87
    [1, 2, 4, 1, 1, 2], [1, 2, 4, 2, 1, 1], [4, 1, 1, 2, 1, 2], [4, 2, 1, 1, 1, 2], // 88-91
    [4, 2, 1, 2, 1, 1], [2, 1, 2, 1, 4, 1], [2, 1, 4, 1, 2, 1], [4, 1, 2, 1, 2, 1], // 92-95
    [1, 1, 1, 1, 4, 3], [1, 1, 1, 3, 4, 1], [1, 3, 1, 1, 4, 1], [1, 1, 4, 1, 1, 3], // 96-99
    [1, 1, 4, 3, 1, 1], [4, 1, 1, 1, 1, 3], [4, 1, 1, 3, 1, 1], [1, 1, 3, 1, 4, 1], // 100-103
    [1, 1, 4, 1, 3, 1], [3, 1, 1, 1, 4, 1], [4, 1, 1, 1, 3, 1], [2, 1, 1, 4, 1, 2], // 104-107
    [2, 1, 1, 2, 1, 4], [2, 1, 1, 2, 3, 2], [2, 3, 3, 1, 1, 1, 2]
  ];

  const getCharValue = (char) => {
    const code = char.charCodeAt(0);
    if (code >= 32 && code <= 126) return code - 32;
    return 0;
  };

  const startValue = 104;
  let checksum = startValue;
  const codes = [startValue];

  for (let i = 0; i < text.length; i++) {
    const val = getCharValue(text[i]);
    codes.push(val);
    checksum += val * (i + 1);
  }

  const stopValue = 106;
  codes.push(checksum % 103);
  codes.push(stopValue);

  let bars = [];
  codes.forEach((c) => {
    bars = bars.concat(PATTERNS[c]);
  });
  bars = bars.concat(PATTERNS[106]);

  const scale = 2.4; // Increased from 1.8 for a wider and more legible barcode print
  const padding = 10;
  const barcodeWidth = bars.reduce((acc, curr) => acc + curr, 0) * scale;

  canvas.width = barcodeWidth + padding * 2;
  canvas.height = 80;

  let x = padding;
  let isBar = true;

  bars.forEach((width) => {
    const w = width * scale;
    if (isBar) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(x, 4, w, 72);
    }
    x += w;
    isBar = !isBar;
  });
};

export default function BarcodeManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'master';

  // Sub-view flow tracker: 'list', 'view', 'create', 'edit'
  const [currentView, setCurrentView] = useState('list');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [stats, setStats] = useState({
    totalProducts: 0,
    totalVariants: 0,
    productsWithBarcode: 0,
    productsWithoutBarcode: 0,
    barcodesGeneratedToday: 0,
    labelsPrintedToday: 0,
    nextBarcodeSequence: 'VGK00000001'
  });

  // Master Section Data
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [masterLoading, setMasterLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedBarcodeType, setSelectedBarcodeType] = useState('all');

  // Modals & Forms
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [uploadFilename, setUploadFilename] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  // Custom Searchable Product Select States
  const [unassignedProducts, setUnassignedProducts] = useState([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);

  // Form State for Create/Edit
  const [formProduct, setFormProduct] = useState('');
  const [formVariant, setFormVariant] = useState(''); // variant name string
  const [formVariantId, setFormVariantId] = useState(''); // variant id
  const [selectedProductVariants, setSelectedProductVariants] = useState([]); // variants of selected product
  const [formBarcodeType, setFormBarcodeType] = useState('VGK_INTERNAL');
  const [formSKU, setFormSKU] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formUnit, setFormUnit] = useState('');
  const [formPackSize, setFormPackSize] = useState('');
  const [formStatus, setFormStatus] = useState('ACTIVE');
  const [formBarcodeNum, setFormBarcodeNum] = useState('');

  // Printing Studio State (Exactly matching mockup)
  const [printType, setPrintType] = useState('single');
  const [selectedPrintProductId, setSelectedPrintProductId] = useState('');
  const [selectedPrintProductIds, setSelectedPrintProductIds] = useState([]);
  const [printProducts, setPrintProducts] = useState([]);
  const [printItems, setPrintItems] = useState([]);
  const [printSearchTerm, setPrintSearchTerm] = useState('');
  const [printDropdownOpen, setPrintDropdownOpen] = useState(false);
  const [labelWidth, setLabelWidth] = useState('50');
  const [labelWidthUnit, setLabelWidthUnit] = useState('mm');
  const [labelHeight, setLabelHeight] = useState('25');
  const [labelHeightUnit, setLabelHeightUnit] = useState('mm');
  const [labelsCount, setLabelsCount] = useState(1);
  const [previewIndex, setPreviewIndex] = useState(0);

  const [selectedPrintItemIds, setSelectedPrintItemIds] = useState([]);
  const [bulkLabelWidth, setBulkLabelWidth] = useState('50');
  const [bulkLabelWidthUnit, setBulkLabelWidthUnit] = useState('mm');
  const [bulkLabelHeight, setBulkLabelHeight] = useState('25');
  const [bulkLabelHeightUnit, setBulkLabelHeightUnit] = useState('mm');
  const [bulkLabelsCount, setBulkLabelsCount] = useState(1);

  const handleUpdatePrintItem = (id, field, value) => {
    setPrintItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleApplyBulkConfig = () => {
    if (selectedPrintItemIds.length === 0) return;
    setPrintItems(prev => prev.map(item => {
      if (selectedPrintItemIds.includes(item.id)) {
        return {
          ...item,
          labelWidth: bulkLabelWidth,
          labelWidthUnit: bulkLabelWidthUnit,
          labelHeight: bulkLabelHeight,
          labelHeightUnit: bulkLabelHeightUnit,
          labelsCount: bulkLabelsCount
        };
      }
      return item;
    }));
  };

  const handleToggleSelectPrintItem = (id) => {
    setSelectedPrintItemIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllPrintItems = (checked) => {
    setSelectedPrintItemIds(checked ? printItems.map(i => i.id) : []);
  };

  // Toggles for Label Information
  const [showName, setShowName] = useState(true);
  const [showBarcodeToggle, setShowBarcodeToggle] = useState(true);
  const [showSKUToggle, setShowSKUToggle] = useState(true);
  const [showCategoryToggle, setShowCategoryToggle] = useState(true);
  const [showBrandToggle, setShowBrandToggle] = useState(true);
  const [showUnitToggle, setShowUnitToggle] = useState(true);
  const [showMRPToggle, setShowMRPToggle] = useState(true);
  const [showPriceToggle, setShowPriceToggle] = useState(true);

  // Camera Scanner
  const [scannerActive, setScannerActive] = useState(false);
  const scannerRef = useRef(null);

  // Barcode Preview Reference inside create/edit/view screens
  const previewCanvasRef = useRef(null);
  const printPreviewCanvasRef = useRef(null);

  const getPageNumbers = () => {
    const pageLimit = 5;
    const pages = [];
    if (totalPages <= pageLimit) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, currentPage + 2);

      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages) {
        if (end < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  useEffect(() => {
    fetchStats();
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchMasterList();
  }, [activeTab, searchQuery, selectedCategory, selectedStatus, currentPage]);

  useEffect(() => {
    if (activeTab === 'printing') {
      fetchPrintProducts();
    }
  }, [activeTab]);

  // Pre-select first product for print preview
  useEffect(() => {
    if (printProducts.length > 0 && !selectedPrintProductId) {
      // Find first product with a barcode or supplier mapping
      // Find first product with a barcode
      const firstValid = printProducts.find(p => p.barcode);
      if (firstValid) {
        setSelectedPrintProductId(firstValid.id);
        setPrintItems([{
          id: firstValid.id,
          name: firstValid.name,
          labelWidth: labelWidth || '50',
          labelWidthUnit: labelWidthUnit || 'mm',
          labelHeight: labelHeight || '25',
          labelHeightUnit: labelHeightUnit || 'mm',
          labelsCount: labelsCount || 1,
          sync: true
        }]);
      } else if (printProducts.length > 0) {
        // Fallback to first product if no product has barcode yet
        const first = printProducts[0];
        setSelectedPrintProductId(first.id);
        setPrintItems([{
          id: first.id,
          name: first.name,
          labelWidth: labelWidth || '50',
          labelWidthUnit: labelWidthUnit || 'mm',
          labelHeight: labelHeight || '25',
          labelHeightUnit: labelHeightUnit || 'mm',
          labelsCount: labelsCount || 1,
          sync: true
        }]);
      }
    }
  }, [printProducts]);

  // Listen for hardware barcode scanner inputs to automatically fill the Supplier Barcode field
  useBarcodeScanner((scannedValue) => {
    if ((currentView === 'create' || currentView === 'edit') && formBarcodeType === 'SUPPLIER') {
      setFormBarcodeNum(scannedValue);
      toast.success(`Scanned barcode: ${scannedValue}`);
    }
  });

  // Handle dynamic barcode drawing on view/create/edit screen load (Only if type is NOT Supplier)
  useEffect(() => {
    if (previewCanvasRef.current) {
      if (formBarcodeType === 'SUPPLIER') {
        const ctx = previewCanvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
      } else if (formBarcodeNum) {
        drawBarcode128(previewCanvasRef.current, formBarcodeNum);
      }
    }
  }, [currentView, formBarcodeNum, formBarcodeType]);

  // Handle dynamic barcode drawing on print label preview (for the active previewItem)
  useEffect(() => {
    if (activeTab === 'printing' && printItems.length > 0) {
      const currentItem = printItems[previewIndex];
      if (currentItem) {
        // Delay slightly to ensure canvas DOM elements are mounted
        const timer = setTimeout(() => {
          const canvas = document.getElementById(`preview-barcode-${currentItem.id}`);
          if (canvas) {
            const prod = printProducts.find(p => p.id === currentItem.id) || products.find(p => p.id === currentItem.id);
            const code = prod?.barcode || prod?.supplierBarcodes?.[0]?.supplierBarcode || 'VGK00000001';
            drawBarcode128(canvas, code);
          }
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [activeTab, printItems, previewIndex, printProducts, currentView, showBarcodeToggle]);

  // Keep preview index in bounds
  useEffect(() => {
    if (previewIndex >= printItems.length) {
      setPreviewIndex(Math.max(0, printItems.length - 1));
    }
  }, [printItems]);

  const fetchStats = async () => {
    try {
      const res = await barcodeAPI.getDashboardStats();
      setStats(prev => ({
        ...prev,
        totalProducts: res.data.totalProducts,
        totalVariants: res.data.totalVariants || 0,
        productsWithBarcode: res.data.productsWithBarcode,
        productsWithoutBarcode: res.data.productsWithoutBarcode,
        barcodesGeneratedToday: res.data.barcodesGeneratedToday,
        nextBarcodeSequence: res.data.nextBarcodeSequence
      }));
    } catch (error) {
      console.error(error);
    }
  };

  const fetchFilters = async () => {
    try {
      const [catsRes, brandsRes] = await Promise.all([
        adminAPI.getCategories(),
        adminAPI.getBrands()
      ]);
      const catsData = catsRes.data?.data?.categories || catsRes.data?.data || catsRes.data || [];
      setCategories(Array.isArray(catsData) ? catsData : []);

      const brandsData = brandsRes.data?.data?.brands || brandsRes.data?.data || brandsRes.data || [];
      setBrands(Array.isArray(brandsData) ? brandsData : []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMasterList = async () => {
    try {
      setMasterLoading(true);
      const res = await barcodeAPI.getBarcodeMasterList({
        search: searchQuery,
        categoryId: selectedCategory,
        page: currentPage,
        limit: 10,
        type: activeTab
      });
      setProducts(res.data.products);
      setTotalPages(res.data.pages);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setMasterLoading(false);
    }
  };

  const fetchPrintProducts = async () => {
    try {
      const res = await barcodeAPI.getBarcodeMasterList({
        limit: 10000,
        type: 'mapping'
      });
      const rawProducts = res.data.products || [];
      const flattened = [];
      rawProducts.forEach(p => {
        // 1. If product itself has a barcode, add it
        const hasProductBarcode = p.barcode || (p.supplierBarcodes?.[0]?.supplierBarcode);
        if (hasProductBarcode) {
          flattened.push({
            id: p.id,
            dbId: p.id,
            variantId: null,
            barcode: p.barcode || p.supplierBarcodes?.[0]?.supplierBarcode || '',
            name: p.name,
            sku: p.sku || '',
            category: p.category,
            brand: p.brand,
            unit: p.unit || '',
            measurement: p.measurement || '',
            mrp: p.mrp || 0,
            price: p.price || 0
          });
        }
        // 2. Add variants that have barcodes
        if (p.variants && p.variants.length > 0) {
          p.variants.forEach(v => {
            if (v.gtin) {
              flattened.push({
                id: `${p.id}_var_${v.id}`, // safe separator
                dbId: p.id,
                variantId: v.id,
                barcode: v.gtin,
                name: `${p.name} (${v.variantName})`,
                sku: v.sku || p.sku || '',
                category: p.category,
                brand: p.brand,
                unit: v.unit || p.unit || '',
                measurement: v.measurement || p.measurement || '',
                mrp: v.mrp || p.mrp || 0,
                price: v.sellingPrice || p.price || 0
              });
            }
          });
        }
      });
      setPrintProducts(flattened);
    } catch (error) {
      console.error(error);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedStatus('all');
    setSelectedBarcodeType('all');
    setCurrentPage(1);
  };

  const handleFormCreateOrUpdate = async (e) => {
    e.preventDefault();
    try {
      if (currentView === 'create') {
        if (!formProduct) {
          toast.error('Please select product');
          return;
        }
        if (formBarcodeType === 'VGK_INTERNAL') {
          await barcodeAPI.generateBarcode(formProduct, formVariantId || null);
          toast.success('Unique Barcode Generated Successfully');
        } else {
          if (!formBarcodeNum) {
            toast.error('Please enter supplier barcode');
            return;
          }
          await barcodeAPI.mapSupplierBarcode({
            productId: formProduct,
            variantId: formVariantId || null,
            supplierBarcode: formBarcodeNum
          });
          toast.success('Supplier Barcode Mapped Successfully');
        }
      } else {
        // Edit flow: Map or Update Supplier Mapping
        if (formBarcodeType === 'SUPPLIER' && formBarcodeNum) {
          await barcodeAPI.mapSupplierBarcode({
            productId: selectedProduct.id,
            variantId: formVariantId || null,
            supplierBarcode: formBarcodeNum
          });
        }
        toast.success('Barcode Details Updated Successfully');
      }
      setCurrentView('list');
      fetchStats();
      fetchMasterList();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed');
    }
  };

  const handleDeleteBarcode = async (prod) => {
    if (!window.confirm('Are you sure you want to delete/reset this barcode?')) return;
    try {
      // Reset the barcode field on product via the dedicated endpoint
      await barcodeAPI.resetBarcode(prod.id, prod.variantId || null);
      toast.success('Barcode removed successfully');
      fetchMasterList();
    } catch (error) {
      toast.error('Action failed');
    }
  };

  const handleBulkImport = async () => {
    try {
      if (!bulkData) {
        toast.error('No Excel data parsed yet');
        return;
      }
      
      const parsed = JSON.parse(bulkData);
      if (parsed.length === 0) {
        toast.error('No rows found to import');
        return;
      }

      setImportLoading(true);
      const res = await barcodeAPI.bulkImport(parsed);
      const { successCount, errors, message } = res.data;

      if (errors && errors.length > 0) {
        // Build a detailed error summary
        const errorDetails = errors.map(e => `• SKU "${e.item.sku}": ${e.reason}`).slice(0, 5).join('\n');
        const overflow = errors.length > 5 ? `\n...and ${errors.length - 5} more errors` : '';
        alert(`${message}\n\nImport Errors:\n${errorDetails}${overflow}`);
      } else {
        toast.success(message || `Successfully imported ${successCount} barcodes!`);
      }

      setImportModalOpen(false);
      setBulkData('');
      setUploadFilename('');
      fetchStats();
      fetchMasterList();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Import failed');
    } finally {
      setImportLoading(false);
    }
  };

  const triggerViewBarcode = (prod) => {
    setSelectedProduct(prod);
    setFormBarcodeNum(prod.barcode || (prod.supplierBarcodes?.[0]?.supplierBarcode) || '');
    setCurrentView('view');
  };

  const triggerEditBarcode = (prod) => {
    setSelectedProduct(prod);
    setFormProduct(prod.id);
    setFormSKU(prod.sku || '');
    setFormCategory(prod.category?.name || '');
    setFormBrand(prod.brand?.name || '');
    setFormUnit(prod.unit || ''); // unit is a scalar string
    setFormPackSize(prod.measurement || '');
    setFormStatus(prod.status || 'ACTIVE');
    setFormBarcodeNum(prod.barcode || (prod.supplierBarcodes?.[0]?.supplierBarcode) || '');
    setFormBarcodeType(prod.barcode ? 'VGK_INTERNAL' : 'SUPPLIER');
    setFormVariantId('');
    setFormVariant('');
    setSelectedProductVariants(prod.variants || []);
    setCurrentView('edit');
  };

  const triggerCreateBarcode = async () => {
    try {
      const res = await barcodeAPI.getNoBarcodeProducts();
      setUnassignedProducts(res.data || []);
    } catch (err) {
      toast.error('Failed to load unassigned products');
    }
    setFormProduct('');
    setFormSKU('');
    setFormCategory('');
    setFormBrand('');
    setFormUnit('');
    setFormPackSize('');
    setFormStatus('ACTIVE');
    setFormBarcodeNum('');
    setFormBarcodeType('VGK_INTERNAL');
    setFormVariantId('');
    setFormVariant('');
    setSelectedProductVariants([]);
    setCurrentView('create');
  };

  const handlePrintSingleBarcode = (prod) => {
    const barcodeVal = prod.barcode || (prod.supplierBarcodes?.[0]?.supplierBarcode) || '8901234567890';
    
    // Draw barcode offscreen -> PNG data URL
    const offCanvas = document.createElement('canvas');
    drawBarcode128(offCanvas, barcodeVal);
    const barcodeDataUrl = offCanvas.toDataURL('image/png');
    // Render layout rows explicitly
    let rowsHtml = '';
    
    // Row 1: Category & Brand
    if (showCategoryToggle || showBrandToggle) {
      rowsHtml += `
        <div class="meta-row">
          <div class="meta-cell">${showCategoryToggle ? `<span class="meta-label">Category:</span><span class="meta-value">${prod.category?.name || '—'}</span>` : ''}</div>
          <div class="meta-cell">${showBrandToggle ? `<span class="meta-label">Brand:</span><span class="meta-value">${prod.brand?.name || 'Unbranded'}</span>` : ''}</div>
        </div>
      `;
    }

    // Row 2: SKU & Unit Size
    if (showSKUToggle || showUnitToggle) {
      rowsHtml += `
        <div class="meta-row">
          <div class="meta-cell" style="width: 55%;">${showSKUToggle ? `<span class="meta-label">SKU:</span><span class="meta-value font-mono">${prod.sku || '—'}</span>` : ''}</div>
          <div class="meta-cell" style="width: 41%;">${showUnitToggle ? `<span class="meta-label">Unit Size:</span><span class="meta-value">${prod.measurement || prod.unit || '—'}</span>` : ''}</div>
        </div>
      `;
    }

    // Row 3: MRP & Selling Price
    if (showMRPToggle || showPriceToggle) {
      rowsHtml += `
        <div class="meta-row">
          <div class="meta-cell">${showMRPToggle ? `<span class="meta-label">MRP:</span><span class="meta-value">₹${prod.mrp || '0.00'}</span>` : ''}</div>
          <div class="meta-cell">${showPriceToggle ? `<span class="meta-label">Selling Price:</span><span class="meta-value">₹${prod.price || '0.00'}</span>` : ''}</div>
        </div>
      `;
    }

    const cardBody = `
      ${showName ? `<div class="card-title">${prod.name}</div>` : ''}
      <div class="meta-container">${rowsHtml}</div>
      <div class="barcode-section">
        <img src="${barcodeDataUrl}" class="barcode-img" alt="barcode" />
        <div class="barcode-code">${barcodeVal}</div>
      </div>
    `;

    const wVal = labelWidth || '50';
    const wUnit = labelWidthUnit || 'mm';
    const hVal = labelHeight || '25';
    const hUnit = labelHeightUnit || 'mm';
    const finalWidth = `${wVal}${wUnit}`;
    const finalHeight = `${hVal}${hUnit}`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            @page {
              size: ${finalWidth} ${finalHeight};
              margin: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background: #fff;
              display: flex;
              justify-content: center;
              align-items: center;
              height: ${finalHeight};
              width: ${finalWidth};
              margin: 0;
              overflow: hidden;
            }
            .label-card {
              background: #ffffff;
              width: ${finalWidth};
              height: ${finalHeight};
              padding: 2px 6px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              gap: 1px;
              overflow: hidden;
            }
            .card-title {
              font-size: 9px;
              font-weight: 800;
              color: #111827;
              line-height: 1;
              word-break: break-word;
            }
            .meta-container {
              display: flex;
              flex-direction: column;
              gap: 1px;
              width: 100%;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
              width: 100%;
              gap: 4px;
              line-height: 1.1;
            }
            .meta-cell {
              display: flex;
              align-items: baseline;
              gap: 2px;
              width: 48%;
              overflow: hidden;
              white-space: nowrap;
            }
            .meta-label {
              font-size: 7px;
              font-weight: 600;
              color: #6b7280;
              flex-shrink: 0;
            }
            .meta-value {
              font-size: 7.5px;
              font-weight: 800;
              color: #111827;
            }
            .meta-value.font-mono {
              font-family: monospace;
              font-size: 7px;
            }
            .barcode-section {
              border-top: 1px solid #e5e7eb;
              padding-top: 1px;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 0px;
            }
            .barcode-img {
              width: 90%;
              height: 22px;
              display: block;
            }
            .barcode-code {
              font-size: 7px;
              font-weight: 700;
              color: #111827;
              letter-spacing: 0.03em;
              font-family: monospace;
              line-height: 1;
            }
          </style>
        </head>
        <body>
          <div class="label-card">${cardBody}</div>
          <script>
            window.onload = function() { window.focus(); window.print(); };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintLabels = () => {
    if (printItems.length === 0) {
      toast.error('Please select at least one product to print');
      return;
    }

    const labelCards = [];

    printItems.forEach(item => {
      const prod = printProducts.find(p => p.id === item.id) || products.find(p => p.id === item.id);
      if (!prod) return;

      const barcodeVal = prod.barcode || (prod.supplierBarcodes?.[0]?.supplierBarcode) || '8901234567890';
      const wVal = item.labelWidth || '50';
      const wUnit = item.labelWidthUnit || 'mm';
      const hVal = item.labelHeight || '25';
      const hUnit = item.labelHeightUnit || 'mm';
      const finalWidth = `${wVal}${wUnit}`;
      const finalHeight = `${hVal}${hUnit}`;

      // Draw barcode offscreen and get data URL + dimensions
      let barcodeDataUrl = '';
      if (showBarcodeToggle) {
        const offCanvas = document.createElement('canvas');
        drawBarcode128(offCanvas, barcodeVal);
        barcodeDataUrl = offCanvas.toDataURL('image/png');
      }

      // Render layout rows explicitly
      let rowsHtml = '';
      
      // Row 1: Category & Brand
      if (showCategoryToggle || showBrandToggle) {
        rowsHtml += `
          <div class="meta-row">
            <div class="meta-cell">${showCategoryToggle ? `<span class="meta-label">Category:</span><span class="meta-value">${prod.category?.name || '—'}</span>` : ''}</div>
            <div class="meta-cell">${showBrandToggle ? `<span class="meta-label">Brand:</span><span class="meta-value">${prod.brand?.name || 'Unbranded'}</span>` : ''}</div>
          </div>
        `;
      }

      // Row 2: SKU & Unit Size
      if (showSKUToggle || showUnitToggle) {
        rowsHtml += `
          <div class="meta-row">
            <div class="meta-cell" style="width: 55%;">${showSKUToggle ? `<span class="meta-label">SKU:</span><span class="meta-value font-mono">${prod.sku || '—'}</span>` : ''}</div>
            <div class="meta-cell" style="width: 41%;">${showUnitToggle ? `<span class="meta-label">Unit Size:</span><span class="meta-value">${prod.measurement || prod.unit || '—'}</span>` : ''}</div>
          </div>
        `;
      }

      // Row 3: MRP & Selling Price
      if (showMRPToggle || showPriceToggle) {
        rowsHtml += `
          <div class="meta-row">
            <div class="meta-cell">${showMRPToggle ? `<span class="meta-label">MRP:</span><span class="meta-value">₹${prod.mrp || '0.00'}</span>` : ''}</div>
            <div class="meta-cell">${showPriceToggle ? `<span class="meta-label">Selling Price:</span><span class="meta-value">₹${prod.price || '0.00'}</span>` : ''}</div>
          </div>
        `;
      }

      const cardBody = `
        ${showName ? `<div class="card-title">${item.name}</div>` : ''}
        <div class="meta-container">${rowsHtml}</div>
        ${barcodeDataUrl ? `
          <div class="barcode-section">
            <img src="${barcodeDataUrl}" class="barcode-img" alt="barcode" />
            <div class="barcode-code">${barcodeVal}</div>
          </div>` : ''}
      `;

      for (let i = 0; i < item.labelsCount; i++) {
        labelCards.push(`<div class="label-card" style="width: ${finalWidth}; height: ${finalHeight};">${cardBody}</div>`);
      }
    });

    // Use the first item's dimensions for @page settings in print grid mode
    const firstItem = printItems[0] || {};
    const globalW = `${firstItem.labelWidth || '50'}${firstItem.labelWidthUnit || 'mm'}`;
    const globalH = `${firstItem.labelHeight || '25'}${firstItem.labelHeightUnit || 'mm'}`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            @page {
              size: ${globalW} ${globalH};
              margin: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background: #fff;
              padding: 0;
              margin: 0;
            }
            .label-grid {
              display: block;
            }
            .label-card {
              background: #ffffff;
              padding: 2px 6px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              gap: 1px;
              page-break-inside: avoid;
              break-inside: avoid;
              page-break-after: always;
              break-after: page;
              overflow: hidden;
            }
            .card-title {
              font-size: 9px;
              font-weight: 800;
              color: #111827;
              line-height: 1;
              word-break: break-word;
            }
            .meta-container {
              display: flex;
              flex-direction: column;
              gap: 1px;
              width: 100%;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
              width: 100%;
              gap: 4px;
              line-height: 1.1;
            }
            .meta-cell {
              display: flex;
              align-items: baseline;
              gap: 2px;
              width: 48%;
              overflow: hidden;
              white-space: nowrap;
            }
            .meta-label {
              font-size: 7px;
              font-weight: 600;
              color: #6b7280;
              flex-shrink: 0;
            }
            .meta-value {
              font-size: 7.5px;
              font-weight: 800;
              color: #111827;
            }
            .meta-value.font-mono {
              font-family: monospace;
              font-size: 7px;
            }
            .barcode-section {
              border-top: 1px solid #e5e7eb;
              padding-top: 1px;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 0px;
            }
            .barcode-img {
              width: 90%;
              height: 22px;
              display: block;
            }
            .barcode-code {
              font-size: 7px;
              font-weight: 700;
              color: #111827;
              letter-spacing: 0.03em;
              font-family: monospace;
              line-height: 1;
            }
            @media print {
              body { background: #fff; }
              .label-card { border: none; box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="label-grid">
            ${labelCards.join('')}
          </div>
          <script>
            window.onload = function() { window.focus(); window.print(); };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const previewProduct = printProducts.find(p => p.id === selectedPrintProductId) || printProducts[0] || products[0];

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 animate-in fade-in duration-300">

      {/* HEADER SECTION */}
      {currentView === 'list' && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
              <Barcode size={32} className="text-emerald-600 animate-pulse" />
              {activeTab === 'master' ? 'Barcode Master' : 'Print Barcode Labels'}
            </h1>
            <p className="text-sm font-medium text-gray-500 mt-1">
              {activeTab === 'master'
                ? 'Manage and maintain barcodes for all warehouse products.'
                : 'Generate and print barcode labels for your products.'}
            </p>
          </div>
          {activeTab === 'master' && (
            <div className="flex items-center gap-3">
              <button
                onClick={triggerCreateBarcode}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-5 py-3 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all"
              >
                <Plus size={16} /> Add Barcode
              </button>
              <button
                onClick={() => setImportModalOpen(true)}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 px-5 py-3 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all"
              >
                <Upload size={16} /> Bulk Import
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW: VIEW SINGLE BARCODE */}
      {currentView === 'view' && selectedProduct && (
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-8 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-gray-50 pb-6">
            <button
              onClick={() => setCurrentView('list')}
              className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 transition-colors font-bold text-sm bg-gray-50 px-4 py-2 rounded-xl"
            >
              <ArrowLeft size={16} /> Back to List
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-black text-gray-900">View Barcode</h2>
            </div>
            <button
              onClick={() => handlePrintSingleBarcode(selectedProduct)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-white rounded-xl text-sm font-black shadow-sm transition-all"
            >
              <Printer size={16} /> Print Barcode
            </button>
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Barcode Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Barcode Number</span>
                <span className="font-bold text-gray-900">{formBarcodeNum || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Product Name</span>
                <span className="font-bold text-gray-900">{selectedProduct.name}</span>
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Barcode Type</span>
                <span className="font-bold text-emerald-600">{selectedProduct.barcode ? 'VGK Internal' : 'Supplier Mapped'}</span>
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">SKU</span>
                <span className="font-bold text-gray-900">{selectedProduct.sku || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Category</span>
                <span className="font-bold text-gray-900">{selectedProduct.category?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Brand</span>
                <span className="font-bold text-gray-900">{selectedProduct.brand?.name || 'Generic'}</span>
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Unit</span>
                <span className="font-bold text-gray-900">{selectedProduct.unit || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Pack Size</span>
                <span className="font-bold text-gray-900">{selectedProduct.measurement || selectedProduct.unit || "N/A"}</span>
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Status</span>
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Active
                </span>
              </div>
            </div>

            <div className="bg-gray-50/65 rounded-[2rem] border border-gray-100 p-8 flex flex-col items-center justify-center space-y-4">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest self-start">Barcode Preview</span>
              <canvas ref={previewCanvasRef} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100"></canvas>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: CREATE OR EDIT BARCODE */}
      {(currentView === 'create' || currentView === 'edit') && (
        <form onSubmit={handleFormCreateOrUpdate} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-8 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-gray-50 pb-6">
            <button
              type="button"
              onClick={() => setCurrentView('list')}
              className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 transition-colors font-bold text-sm bg-gray-50 px-4 py-2 rounded-xl"
            >
              <ArrowLeft size={16} /> Cancel
            </button>
            <h2 className="text-lg font-black text-gray-900">{currentView === 'create' ? 'Create Barcode' : 'Edit Barcode'}</h2>
            <div className="w-[100px]"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {currentView === 'create' ? (
              <div className="space-y-1.5 relative z-30">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 block">Product Name *</label>

                {/* Custom Trigger Button */}
                <button
                  type="button"
                  onClick={() => setProductDropdownOpen(!productDropdownOpen)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 text-left focus:outline-none flex justify-between items-center"
                >
                  <span className="truncate">
                    {formProduct ? unassignedProducts.find(p => p.id === formProduct)?.name : 'Select Product'}
                  </span>
                  <Search size={14} className="text-gray-400 flex-shrink-0" />
                </button>

                {/* Dropdown Menu */}
                {productDropdownOpen && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-150 rounded-xl shadow-xl p-3 space-y-2 max-h-[300px] overflow-y-auto">
                    {/* Search Field */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type="text"
                        placeholder="Search product name or SKU..."
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg outline-none font-medium text-xs focus:bg-white transition-all"
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                      />
                    </div>

                    {/* Options List */}
                    <div className="divide-y divide-gray-50 max-h-[180px] overflow-y-auto">
                      {unassignedProducts.filter(p =>
                        p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                        (p.sku && p.sku.toLowerCase().includes(productSearchTerm.toLowerCase()))
                      ).length === 0 ? (
                        <div className="text-center py-4 text-gray-400 text-xs">No products found</div>
                      ) : (
                        unassignedProducts.filter(p =>
                          p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                          (p.sku && p.sku.toLowerCase().includes(productSearchTerm.toLowerCase()))
                        ).map(p => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setFormProduct(p.id);
                              // Store variants for this product
                              const variants = p.variants || [];
                              setSelectedProductVariants(variants);
                              
                              if (p.barcode && variants.length > 0) {
                                // Automatically select first variant since Default (No Variant) is not allowed
                                const firstVar = variants[0];
                                setFormVariantId(firstVar.id);
                                setFormVariant(firstVar.variantName);
                                setFormSKU(firstVar.sku || p.sku || '');
                                setFormCategory(p.category?.name || '');
                                setFormBrand(p.brand?.name || '');
                                setFormUnit(firstVar.unit || p.unit || '');
                                setFormPackSize(firstVar.measurement || p.measurement || '');
                              } else {
                                setFormVariantId('');
                                setFormVariant('');
                                // Populate fields from product-level data
                                setFormSKU(p.sku || '');
                                setFormCategory(p.category?.name || '');
                                setFormBrand(p.brand?.name || '');
                                setFormUnit(p.unit || ''); // unit is a scalar string on Product
                                setFormPackSize(p.measurement || (p.unit ? `${p.unit}` : ''));
                              }
                              if (formBarcodeType === 'VGK_INTERNAL') {
                                setFormBarcodeNum(stats.nextBarcodeSequence || 'VGK00000001');
                              } else {
                                setFormBarcodeNum('');
                              }
                              setProductDropdownOpen(false);
                              setProductSearchTerm('');
                            }}
                            className="py-2.5 px-3 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg text-xs font-bold cursor-pointer transition-colors flex justify-between items-center"
                          >
                            <span className="truncate pr-2">{p.name}</span>
                            <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">{p.sku}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Product Name *</label>
                <input
                  type="text"
                  readOnly
                  className="w-full bg-gray-100 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none"
                  value={products.find(p => p.id === formProduct)?.name || ''}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Select Variant *</label>
              <select
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none"
                value={formVariantId}
                onChange={(e) => {
                  const varId = e.target.value;
                  setFormVariantId(varId);
                  if (varId) {
                    // Find the chosen variant and update fields
                    const chosenVariant = selectedProductVariants.find(v => v.id === varId);
                    if (chosenVariant) {
                      setFormVariant(chosenVariant.variantName);
                      setFormSKU(chosenVariant.sku || formSKU);
                      setFormUnit(chosenVariant.unit || formUnit);
                      setFormPackSize(chosenVariant.measurement || formPackSize);
                    }
                  } else {
                    // Reset to product-level values
                    const prod = unassignedProducts.find(p => p.id === formProduct);
                    if (prod) {
                      setFormVariant('');
                      setFormSKU(prod.sku || '');
                      setFormUnit(prod.unit || '');
                      setFormPackSize(prod.measurement || '');
                    }
                  }
                }}
              >
                {!unassignedProducts.find(p => p.id === formProduct)?.barcode && (
                  <option value="">Default (No Variant)</option>
                )}
                {selectedProductVariants.filter(v => {
                  if (v.gtin) return false;
                  const parentProduct = unassignedProducts.find(p => p.id === formProduct);
                  if (parentProduct?.barcode && selectedProductVariants.length === 1) {
                    return false;
                  }
                  return true;
                }).map(v => (
                  <option key={v.id} value={v.id}>
                    {v.variantName}{v.unit ? ` — ${v.unit}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Barcode Type *</label>
              <select
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none"
                value={formBarcodeType}
                onChange={(e) => {
                  const type = e.target.value;
                  setFormBarcodeType(type);
                  if (currentView === 'create') {
                    if (type === 'VGK_INTERNAL') {
                      setFormBarcodeNum(stats.nextBarcodeSequence || 'VGK00000001');
                    } else {
                      setFormBarcodeNum('');
                    }
                  }
                }}
              >
                <option value="VGK_INTERNAL">VGK Internal</option>
                <option value="SUPPLIER">Supplier</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">SKU *</label>
              <input
                type="text"
                readOnly
                placeholder="SKU-09878"
                className="w-full bg-gray-100 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none"
                value={formSKU}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Category *</label>
              <input
                type="text"
                readOnly
                className="w-full bg-gray-100 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none"
                value={formCategory}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Brand *</label>
              <input
                type="text"
                readOnly
                className="w-full bg-gray-100 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none"
                value={formBrand}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Unit *</label>
              <input
                type="text"
                readOnly
                className="w-full bg-gray-100 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none"
                value={formUnit}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Pack Size *</label>
              <input
                type="text"
                readOnly
                className="w-full bg-gray-100 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none"
                value={formPackSize}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Status *</label>
              <select
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            {formBarcodeType === 'SUPPLIER' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Supplier Barcode Number *</label>
                  <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full animate-pulse font-mono">Hardware/USB Active</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. 8901058002314 (Or scan hardware barcode)"
                    className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                    value={formBarcodeNum}
                    onChange={(e) => setFormBarcodeNum(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setScannerActive(true)}
                    className="px-4 bg-emerald-550 hover:bg-emerald-600 text-emerald-700 bg-emerald-50 hover:text-emerald-800 border border-emerald-100 rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs font-bold active:scale-[0.98]"
                    title="Scan using Camera"
                  >
                    <Camera size={16} />
                    <span>Scan</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Render Camera Scanner overlay if active */}
          {scannerActive && (
            <BarcodeScannerOverlay
              onScan={(scannedCode) => {
                setFormBarcodeNum(scannedCode);
                toast.success(`Scanned: ${scannedCode}`);
                setScannerActive(false);
              }}
              onClose={() => setScannerActive(false)}
            />
          )}

          {formBarcodeType !== 'SUPPLIER' ? (
            formProduct ? (
              <div className="bg-gray-50/65 rounded-[2rem] border border-gray-100 p-8 flex flex-col items-center justify-center space-y-4 animate-in fade-in">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest self-start">Barcode Preview</span>
                <canvas ref={previewCanvasRef} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100"></canvas>
              </div>
            ) : (
              <div className="bg-gray-50/40 rounded-[2rem] border border-dashed border-gray-200 p-8 flex flex-col items-center justify-center text-gray-400 text-xs font-bold text-center">
                Please select a product to display its unique barcode preview.
              </div>
            )
          ) : null}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
            <button
              type="button"
              onClick={() => setCurrentView('list')}
              className="px-6 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-bold text-gray-500 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            >
              {currentView === 'create' ? 'Create Barcode' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}

      {/* VIEW: MAIN LIST FLOW (TAB DYNAMICS) */}
      {currentView === 'list' && (
        <div className="space-y-6">

          {/* KPI Dashboard Metrics Cards */}
          {activeTab === 'master' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 animate-in fade-in duration-300">
              {/* Card 1: Total Products & Variants */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Total Products</span>
                  <h3 className="text-2xl font-black text-gray-900">{(stats.totalProducts).toLocaleString()}</h3>
                  <span className="text-[10px] text-gray-400 font-semibold">{stats.totalVariants} variant{stats.totalVariants !== 1 ? 's' : ''} across all products</span>
                </div>
                <div className="p-3.5 rounded-2xl text-gray-600 bg-gray-50">
                  <Package size={20} />
                </div>
              </div>
              {/* Card 2: With Barcode */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Items with Barcode</span>
                  <h3 className="text-2xl font-black text-gray-900">{stats.productsWithBarcode.toLocaleString()}</h3>
                  <span className="text-[10px] text-emerald-600 font-semibold">Products &amp; variants combined</span>
                </div>
                <div className="p-3.5 rounded-2xl text-emerald-600 bg-emerald-50">
                  <ShieldCheck size={20} />
                </div>
              </div>
              {/* Card 3: Without Barcode */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Items without Barcode</span>
                  <h3 className="text-2xl font-black text-gray-900">{stats.productsWithoutBarcode.toLocaleString()}</h3>
                  <span className="text-[10px] text-amber-500 font-semibold">Still need barcode assignment</span>
                </div>
                <div className="p-3.5 rounded-2xl text-amber-500 bg-amber-50">
                  <AlertCircle size={20} />
                </div>
              </div>
              {/* Card 4: Generated Today */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Generated Today</span>
                  <h3 className="text-2xl font-black text-gray-900">{stats.barcodesGeneratedToday.toLocaleString()}</h3>
                  <span className="text-[10px] text-indigo-500 font-semibold">Barcodes created today</span>
                </div>
                <div className="p-3.5 rounded-2xl text-indigo-600 bg-indigo-50">
                  <Printer size={20} />
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE TAB 1: MASTER LIST */}
          {activeTab === 'master' && (
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-6 animate-in fade-in duration-300">

              {/* Filter controls */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b border-gray-50 pb-6">
                <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
                  <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-400">
                    <Filter size={18} />
                  </div>
                  <select
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-600 focus:outline-none"
                    value={selectedCategory}
                    onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                  >
                    <option value="all">Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-600 focus:outline-none"
                    value={selectedStatus}
                    onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                  >
                    <option value="all">Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                  {/* Barcode Type Filter */}
                  <select
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-600 focus:outline-none"
                    value={selectedBarcodeType}
                    onChange={(e) => setSelectedBarcodeType(e.target.value)}
                  >
                    <option value="all">All Barcodes</option>
                    <option value="vgk">VGK Internal</option>
                    <option value="supplier">Supplier</option>
                  </select>
                  <button
                    onClick={handleResetFilters}
                    className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-orange-600 hover:text-orange-700 ml-2"
                  >
                    <RotateCcw size={14} /> Reset Filter
                  </button>
                </div>
                <div className="relative w-full md:max-w-xs">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search ...."
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-medium text-sm focus:bg-white transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                      <th className="py-4 px-4 w-16">#</th>
                      <th className="py-4 px-4">Barcode</th>
                      <th className="py-4 px-4">Product</th>
                      <th className="py-4 px-4">SKU</th>
                      <th className="py-4 px-4">Category</th>
                      <th className="py-4 px-4">Brand</th>
                      <th className="py-4 px-4">Unit</th>
                      <th className="py-4 px-4">Pack Size</th>
                      <th className="py-4 px-4">Barcode Type</th>
                      <th className="py-4 px-4">Status</th>
                      <th className="py-4 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm font-medium text-gray-600">
                    {masterLoading ? (
                      <tr>
                        <td colSpan={11} className="text-center py-8 text-gray-400">Loading products...</td>
                      </tr>
                    ) : (() => {
                      const rows = [];
                      products.forEach((prod) => {
                        // 1. Product-level barcode row
                        const hasProductBarcode = prod.barcode || (prod.supplierBarcodes?.[0]?.supplierBarcode);
                        if (hasProductBarcode) {
                          rows.push({
                            id: `${prod.id}-product`,
                            dbId: prod.id,
                            variantId: null,
                            barcode: prod.barcode || prod.supplierBarcodes?.[0]?.supplierBarcode || '',
                            name: prod.name,
                            sku: prod.sku,
                            category: prod.category?.name,
                            brand: prod.brand?.name,
                            unit: prod.unit,
                            measurement: prod.measurement,
                            type: prod.barcode ? 'VGK (Internal)' : 'Supplier',
                            status: prod.status || 'ACTIVE',
                            original: prod
                          });
                        }
                        
                        // 2. Variant-level barcode rows
                        if (prod.variants && prod.variants.length > 0) {
                          prod.variants.forEach(v => {
                            if (v.gtin) {
                              rows.push({
                                id: `${prod.id}-variant-${v.id}`,
                                dbId: prod.id,
                                variantId: v.id,
                                barcode: v.gtin,
                                name: `${prod.name} (${v.variantName})`,
                                sku: v.sku || prod.sku,
                                category: prod.category?.name,
                                brand: prod.brand?.name,
                                unit: v.unit || prod.unit,
                                measurement: v.measurement || prod.measurement,
                                type: v.gtin.startsWith('VGK') ? 'VGK (Internal)' : 'Supplier',
                                status: v.status || 'ACTIVE',
                                original: {
                                  ...prod,
                                  id: prod.id,
                                  variantId: v.id,
                                  barcode: v.gtin,
                                  name: `${prod.name} (${v.variantName})`,
                                  sku: v.sku || prod.sku,
                                  unit: v.unit || prod.unit,
                                  measurement: v.measurement || prod.measurement
                                }
                              });
                            }
                          });
                        }
                      });

                      const filteredRows = rows.filter(row => {
                        if (selectedBarcodeType === 'vgk') {
                          return row.type.includes('VGK');
                        }
                        if (selectedBarcodeType === 'supplier') {
                          return row.type.includes('Supplier');
                        }
                        return true;
                      });

                      if (filteredRows.length === 0) {
                        return (
                          <tr>
                            <td colSpan={11} className="text-center py-8 text-gray-400">No products found.</td>
                          </tr>
                        );
                      }

                      return filteredRows.map((row, idx) => (
                        <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 px-4 font-bold text-gray-400 text-xs w-16">{idx + 1 + (currentPage - 1) * 10}</td>
                          <td className="py-4 px-4 font-mono font-bold text-gray-900">{row.barcode || '—'}</td>
                          <td className="py-4 px-4 font-bold text-gray-900">{row.name}</td>
                          <td className="py-4 px-4 font-mono text-xs">{row.sku || '—'}</td>
                          <td className="py-4 px-4">{row.category || '—'}</td>
                          <td className="py-4 px-4">{row.brand || 'Generic'}</td>
                          <td className="py-4 px-4">{row.unit || '—'}</td>
                          <td className="py-4 px-4">{row.measurement || "—"}</td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              row.type.includes('VGK') 
                                ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' 
                                : 'bg-orange-50 border border-orange-100 text-orange-700'
                            }`}>
                              {row.type}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> {row.status}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {row.barcode && (
                                <button
                                  onClick={() => triggerViewBarcode(row.original)}
                                  className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                  title="View Barcode"
                                >
                                  <Eye size={16} />
                                </button>
                              )}
                              <button
                                onClick={() => triggerEditBarcode(row.original)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                title="Edit Barcode"
                              >
                                <Edit2 size={16} />
                              </button>
                              {row.barcode && (
                                <button
                                  onClick={() => handleDeleteBarcode({ id: row.dbId, variantId: row.variantId })}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                  title="Delete Barcode"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 pt-6">
                  <span className="text-xs font-bold text-gray-400">
                    Showing {(currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, stats.totalProducts)} of {stats.totalProducts} products
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className="p-2 border border-gray-200 rounded-xl text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                      title="Previous Page"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {getPageNumbers().map((pageNum, idx) => {
                      if (pageNum === '...') {
                        return (
                          <span key={`ellip-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs font-bold text-gray-400">
                            ...
                          </span>
                        );
                      }
                      return (
                        <button
                          key={`page-${pageNum}`}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-xl text-xs font-black transition-all ${currentPage === pageNum
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100'
                            : 'border border-transparent text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className="p-2 border border-gray-200 rounded-xl text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                      title="Next Page"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ACTIVE TAB 3: BARCODE PRINTING STUDIO (EXACTLY MATCHING MOCKUP) */}
          {activeTab === 'printing' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* Column 1: Print Options */}
                <div className="lg:col-span-7 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                  <div className="border-b border-gray-50 pb-4">
                    <h3 className="text-xl font-bold text-gray-900">Print Options</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-600 block">Select Print Type</label>
                      <select
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none"
                        value={printType}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPrintType(val);
                          setPrintItems([]);
                          setSelectedPrintProductId('');
                          setSelectedPrintProductIds([]);
                        }}
                      >
                        <option value="single">Single Product</option>
                        <option value="multiple">Multiple Products</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 relative z-30">
                      <label className="text-xs font-bold text-gray-600 block">Select Product</label>

                      {/* Searchable Trigger Button */}
                      <button
                        type="button"
                        onClick={() => setPrintDropdownOpen(!printDropdownOpen)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 text-left focus:outline-none flex justify-between items-center"
                      >
                        <span className="truncate">
                          {printType === 'single'
                            ? (selectedPrintProductId ? printProducts.find(p => p.id === selectedPrintProductId)?.name : 'Select Product')
                            : `Select Products (${selectedPrintProductIds.length} selected)`}
                        </span>
                        <Search size={14} className="text-gray-400 flex-shrink-0" />
                      </button>

                      {/* Dropdown Menu */}
                      {printDropdownOpen && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-150 rounded-xl shadow-xl p-3 space-y-2 max-h-[300px] overflow-y-auto">
                          {/* Search Input */}
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                              type="text"
                              placeholder="Search products..."
                              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg outline-none font-medium text-xs focus:bg-white transition-all"
                              value={printSearchTerm}
                              onChange={(e) => setPrintSearchTerm(e.target.value)}
                            />
                          </div>

                          {/* Options List */}
                          <div className="divide-y divide-gray-50 max-h-[180px] overflow-y-auto">
                            {printProducts
                              .filter(p =>
                                p.name.toLowerCase().includes(printSearchTerm.toLowerCase()) ||
                                (p.sku && p.sku.toLowerCase().includes(printSearchTerm.toLowerCase()))
                              ).length === 0 ? (
                              <div className="text-center py-4 text-gray-400 text-xs">No products found</div>
                            ) : (
                              printProducts
                                .filter(p =>
                                  p.name.toLowerCase().includes(printSearchTerm.toLowerCase()) ||
                                  (p.sku && p.sku.toLowerCase().includes(printSearchTerm.toLowerCase()))
                                ).map(p => {
                                  const isSelected = printType === 'single'
                                    ? selectedPrintProductId === p.id
                                    : selectedPrintProductIds.includes(p.id);
                                  return (
                                    <div
                                      key={p.id}
                                      onClick={() => {
                                        if (printType === 'single') {
                                          setSelectedPrintProductId(p.id);
                                          setPrintItems([{
                                            id: p.id,
                                            name: p.name,
                                            labelWidth: labelWidth || '50',
                                            labelWidthUnit: labelWidthUnit || 'mm',
                                            labelHeight: labelHeight || '25',
                                            labelHeightUnit: labelHeightUnit || 'mm',
                                            labelsCount: labelsCount || 1,
                                            sync: true
                                          }]);
                                          setPrintDropdownOpen(false);
                                        } else {
                                          setPrintItems(prev => {
                                            const exists = prev.some(item => item.id === p.id);
                                            if (exists) {
                                              return prev.filter(item => item.id !== p.id);
                                            } else {
                                              return [...prev, {
                                                id: p.id,
                                                name: p.name,
                                                labelWidth: '50',
                                                labelWidthUnit: 'mm',
                                                labelHeight: '25',
                                                labelHeightUnit: 'mm',
                                                labelsCount: 1,
                                                sync: true
                                              }];
                                            }
                                          });
                                        }
                                        setPrintSearchTerm('');
                                      }}
                                      className={`py-2.5 px-3 rounded-lg text-xs font-bold cursor-pointer transition-colors flex justify-between items-center ${isSelected
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                    >
                                      <span className="truncate pr-2">{p.name}</span>
                                      <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">
                                        {p.sku}
                                      </span>
                                    </div>
                                  );
                                })
                            )}
                          </div>
                        </div>
                      )}

                    </div>

                    {printType === 'single' && (
                      <>
                        <div className="col-span-2 bg-slate-50 border border-slate-200/60 p-3 rounded-2xl space-y-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Standard Presets</span>
                          <div className="flex gap-2 flex-wrap">
                            {[
                              { label: '50mm × 25mm', w: '50', h: '25', u: 'mm' },
                              { label: '50mm × 30mm', w: '50', h: '30', u: 'mm' },
                              { label: '38mm × 25mm', w: '38', h: '25', u: 'mm' },
                              { label: '5cm × 2.5cm', w: '5', h: '2.5', u: 'cm' },
                            ].map((preset, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setLabelWidth(preset.w);
                                  setLabelWidthUnit(preset.u);
                                  setLabelHeight(preset.h);
                                  setLabelHeightUnit(preset.u);
                                  if (printItems.length > 0) {
                                    handleUpdatePrintItem(printItems[0].id, 'labelWidth', preset.w);
                                    handleUpdatePrintItem(printItems[0].id, 'labelWidthUnit', preset.u);
                                    handleUpdatePrintItem(printItems[0].id, 'labelHeight', preset.h);
                                    handleUpdatePrintItem(printItems[0].id, 'labelHeightUnit', preset.u);
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors shadow-sm"
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-600 block">Label Width</label>
                          <div className="flex gap-1.5 items-center">
                            <input
                              type="number"
                              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-emerald-300 transition-all"
                              value={labelWidth}
                              onChange={(e) => {
                                const val = e.target.value;
                                setLabelWidth(val);
                                if (printItems.length > 0) {
                                  handleUpdatePrintItem(printItems[0].id, 'labelWidth', val);
                                }
                              }}
                            />
                            <select
                              className="bg-gray-50 border border-gray-100 rounded-xl px-2 py-3 text-xs font-extrabold text-gray-700 focus:outline-none focus:bg-white"
                              value={labelWidthUnit}
                              onChange={(e) => {
                                const val = e.target.value;
                                setLabelWidthUnit(val);
                                if (printItems.length > 0) {
                                  handleUpdatePrintItem(printItems[0].id, 'labelWidthUnit', val);
                                }
                              }}
                            >
                              <option value="mm">mm</option>
                              <option value="cm">cm</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-600 block">Label Height</label>
                          <div className="flex gap-1.5 items-center">
                            <input
                              type="number"
                              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-emerald-300 transition-all"
                              value={labelHeight}
                              onChange={(e) => {
                                const val = e.target.value;
                                setLabelHeight(val);
                                if (printItems.length > 0) {
                                  handleUpdatePrintItem(printItems[0].id, 'labelHeight', val);
                                }
                              }}
                            />
                            <select
                              className="bg-gray-50 border border-gray-100 rounded-xl px-2 py-3 text-xs font-extrabold text-gray-700 focus:outline-none focus:bg-white"
                              value={labelHeightUnit}
                              onChange={(e) => {
                                const val = e.target.value;
                                setLabelHeightUnit(val);
                                if (printItems.length > 0) {
                                  handleUpdatePrintItem(printItems[0].id, 'labelHeightUnit', val);
                                }
                              }}
                            >
                              <option value="mm">mm</option>
                              <option value="cm">cm</option>
                            </select>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {printType === 'single' && (
                    <div className="space-y-2.5">
                      <label className="text-xs font-bold text-gray-600 block">No of labels</label>
                      <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-150 rounded-xl px-2.5 py-1.5 w-fit">
                        <button
                          type="button"
                          onClick={() => {
                            const newCount = Math.max(1, labelsCount - 1);
                            setLabelsCount(newCount);
                            if (printItems.length > 0) {
                              handleUpdatePrintItem(printItems[0].id, 'labelsCount', newCount);
                            }
                          }}
                          className="p-1 text-gray-500 hover:text-gray-900 transition-colors"
                        >
                          <Minus size={16} />
                        </button>
                        <input
                          type="text"
                          readOnly
                          className="w-10 text-center bg-transparent border-0 text-sm font-black text-gray-900 focus:outline-none"
                          value={labelsCount}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newCount = labelsCount + 1;
                            setLabelsCount(newCount);
                            if (printItems.length > 0) {
                              handleUpdatePrintItem(printItems[0].id, 'labelsCount', newCount);
                            }
                          }}
                          className="p-1 text-gray-500 hover:text-gray-900 transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Multi Products Config table */}
                  {printType === 'multiple' && printItems.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                      {/* Header with select all */}
                      <div className="flex items-center justify-between pl-1 pb-2 border-b border-gray-50">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Flexible Product Settings</h4>
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            checked={selectedPrintItemIds.length === printItems.length && printItems.length > 0}
                            onChange={(e) => handleSelectAllPrintItems(e.target.checked)}
                          />
                          <span className="text-[11px] font-bold text-gray-500">
                            Select All
                          </span>
                        </label>
                      </div>

                      {/* Product rows — single row: checkbox + name + fields + remove */}
                      <div className="space-y-2">
                        {printItems.map((item, idx) => {
                          const isChecked = selectedPrintItemIds.includes(item.id);
                          return (
                            <div
                              key={item.id}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                                isChecked
                                  ? 'bg-emerald-50 border-emerald-200'
                                  : 'bg-gray-50/50 border-gray-100'
                              }`}
                            >
                              {/* Checkbox */}
                              <input
                                type="checkbox"
                                className="w-4 h-4 flex-shrink-0 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                checked={isChecked}
                                onChange={() => handleToggleSelectPrintItem(item.id)}
                              />

                              {/* Product name */}
                              <span className="text-xs font-extrabold text-gray-800 flex-1 min-w-0 truncate">
                                #{idx + 1} — {item.name}
                              </span>

                              {/* Width */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">W</span>
                                <input
                                  type="number"
                                  className="w-10 bg-white border border-gray-200 rounded-lg px-1 py-1 text-xs font-bold text-gray-900 outline-none focus:border-emerald-400 transition-all text-center"
                                  value={item.labelWidth}
                                  onChange={(e) => handleUpdatePrintItem(item.id, 'labelWidth', e.target.value)}
                                  placeholder="50"
                                />
                                <select
                                  className="bg-white border border-gray-200 rounded-lg py-1 px-0.5 text-[10px] font-black text-gray-700 focus:outline-none"
                                  value={item.labelWidthUnit || 'mm'}
                                  onChange={(e) => handleUpdatePrintItem(item.id, 'labelWidthUnit', e.target.value)}
                                >
                                  <option value="mm">mm</option>
                                  <option value="cm">cm</option>
                                </select>
                              </div>

                              {/* Height */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">H</span>
                                <input
                                  type="number"
                                  className="w-10 bg-white border border-gray-200 rounded-lg px-1 py-1 text-xs font-bold text-gray-900 outline-none focus:border-emerald-400 transition-all text-center"
                                  value={item.labelHeight}
                                  onChange={(e) => handleUpdatePrintItem(item.id, 'labelHeight', e.target.value)}
                                  placeholder="25"
                                />
                                <select
                                  className="bg-white border border-gray-200 rounded-lg py-1 px-0.5 text-[10px] font-black text-gray-700 focus:outline-none"
                                  value={item.labelHeightUnit || 'mm'}
                                  onChange={(e) => handleUpdatePrintItem(item.id, 'labelHeightUnit', e.target.value)}
                                >
                                  <option value="mm">mm</option>
                                  <option value="cm">cm</option>
                                </select>
                              </div>

                              {/* No. of Labels */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Qty</span>
                                <div className="flex items-center bg-white border border-gray-200 rounded-lg px-1 py-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdatePrintItem(item.id, 'labelsCount', Math.max(1, item.labelsCount - 1))}
                                    className="p-0.5 text-gray-400 hover:text-gray-900"
                                  >
                                    <Minus size={10} />
                                  </button>
                                  <input
                                    type="number"
                                    className="w-8 text-center text-xs font-bold text-gray-900 outline-none"
                                    value={item.labelsCount}
                                    onChange={(e) => handleUpdatePrintItem(item.id, 'labelsCount', Math.max(1, parseInt(e.target.value) || 1))}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdatePrintItem(item.id, 'labelsCount', item.labelsCount + 1)}
                                    className="p-0.5 text-gray-400 hover:text-gray-900"
                                  >
                                    <Plus size={10} />
                                  </button>
                                </div>
                              </div>

                              {/* Remove */}
                              <button
                                type="button"
                                onClick={() => {
                                  setPrintItems(prev => prev.filter(p => p.id !== item.id));
                                  setSelectedPrintItemIds(prev => prev.filter(x => x !== item.id));
                                }}
                                className="p-1 flex-shrink-0 hover:bg-red-100 hover:text-red-600 rounded-lg text-gray-300 transition-colors"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Bulk apply panel */}
                      {selectedPrintItemIds.length > 0 && (
                        <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                            <span className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-wider">
                              Set for {selectedPrintItemIds.length} selected product{selectedPrintItemIds.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-500 uppercase tracking-wider block">Width</label>
                              <div className="flex gap-1">
                                <input
                                  type="number"
                                  className="w-full bg-white border border-emerald-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-900 outline-none focus:border-emerald-500 transition-all"
                                  value={bulkLabelWidth}
                                  onChange={(e) => setBulkLabelWidth(e.target.value)}
                                  placeholder="50"
                                />
                                <select
                                  className="bg-white border border-emerald-200 rounded-lg py-1 px-0.5 text-xs font-black text-gray-700 focus:outline-none"
                                  value={bulkLabelWidthUnit}
                                  onChange={(e) => setBulkLabelWidthUnit(e.target.value)}
                                >
                                  <option value="mm">mm</option>
                                  <option value="cm">cm</option>
                                </select>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-500 uppercase tracking-wider block">Height</label>
                              <div className="flex gap-1">
                                <input
                                  type="number"
                                  className="w-full bg-white border border-emerald-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-900 outline-none focus:border-emerald-500 transition-all"
                                  value={bulkLabelHeight}
                                  onChange={(e) => setBulkLabelHeight(e.target.value)}
                                  placeholder="25"
                                />
                                <select
                                  className="bg-white border border-emerald-200 rounded-lg py-1 px-0.5 text-xs font-black text-gray-700 focus:outline-none"
                                  value={bulkLabelHeightUnit}
                                  onChange={(e) => setBulkLabelHeightUnit(e.target.value)}
                                >
                                  <option value="mm">mm</option>
                                  <option value="cm">cm</option>
                                </select>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-500 uppercase tracking-wider block">No. of Labels</label>
                              <div className="flex items-center gap-1 bg-white border border-emerald-200 rounded-lg px-1.5 py-0.5">
                                <button
                                  type="button"
                                  onClick={() => setBulkLabelsCount(prev => Math.max(1, prev - 1))}
                                  className="p-0.5 text-gray-400 hover:text-gray-900"
                                >
                                  <Minus size={11} />
                                </button>
                                <input
                                  type="number"
                                  className="w-10 text-center text-xs font-bold text-gray-900 outline-none"
                                  value={bulkLabelsCount}
                                  onChange={(e) => setBulkLabelsCount(Math.max(1, parseInt(e.target.value) || 1))}
                                />
                                <button
                                  type="button"
                                  onClick={() => setBulkLabelsCount(prev => prev + 1)}
                                  className="p-0.5 text-gray-400 hover:text-gray-900"
                                >
                                  <Plus size={11} />
                                </button>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleApplyBulkConfig}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition-colors"
                          >
                            Apply to {selectedPrintItemIds.length} Selected Product{selectedPrintItemIds.length > 1 ? 's' : ''}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Label Information Toggles */}
                  <div className="space-y-3.5 pt-4 border-t border-gray-50">
                    <h4 className="text-sm font-black text-gray-900">Label Information</h4>

                    {[
                      { label: 'Product Name', value: showName, setter: setShowName },
                      { label: 'Barcode', value: showBarcodeToggle, setter: setShowBarcodeToggle },
                      { label: 'SKU', value: showSKUToggle, setter: setShowSKUToggle },
                      { label: 'Category', value: showCategoryToggle, setter: setShowCategoryToggle },
                      { label: 'Brand', value: showBrandToggle, setter: setShowBrandToggle },
                      { label: 'Unit Size', value: showUnitToggle, setter: setShowUnitToggle },
                      { label: 'MRP', value: showMRPToggle, setter: setShowMRPToggle },
                      { label: 'Selling Price', value: showPriceToggle, setter: setShowPriceToggle }
                    ].map((toggle, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-b-0">
                        <span className="text-sm font-bold text-gray-600">{toggle.label}</span>
                        <button
                          type="button"
                          onClick={() => toggle.setter(!toggle.value)}
                          className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${toggle.value ? 'bg-emerald-600' : 'bg-gray-200'
                            }`}
                        >
                          <span className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow-sm transition-transform ${toggle.value ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 2: Label Preview */}
                <div className="lg:col-span-5 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                  <div className="border-b border-gray-50 pb-4">
                    <h3 className="text-xl font-bold text-gray-900">Label Preview</h3>
                  </div>

                  <div className="bg-gray-50/50 border border-gray-100 p-6 rounded-2xl flex flex-col items-center justify-between min-h-[360px] gap-6">
                    {printItems.length > 0 ? (
                      <>
                        {/* Active Item Card */}
                        {(() => {
                          const item = printItems[previewIndex];
                          if (!item) return null;
                          const prod = printProducts.find(p => p.id === item.id) || products.find(p => p.id === item.id);
                          if (!prod) return null;

                          // Compute width/height styles for the visual preview card (scaled up slightly for display readability)
                          const wVal = parseFloat(item.labelWidth) || 50;
                          const wUnit = item.labelWidthUnit || 'mm';
                          const hVal = parseFloat(item.labelHeight) || 25;
                          const hUnit = item.labelHeightUnit || 'mm';
                          const multiplier = wUnit === 'cm' ? 60 : 6; // scale factor to look good on screen

                          return (
                            <div 
                              className="bg-white border border-gray-150 rounded-xl p-4 space-y-2 shadow-sm animate-in fade-in duration-200 flex flex-col justify-between overflow-hidden"
                              style={{ 
                                width: `${wVal * multiplier}px`, 
                                height: `${hVal * multiplier}px`,
                                maxHeight: '340px' 
                              }}
                            >
                              {/* Name */}
                              {showName && (
                                <div className="font-extrabold text-[11px] text-gray-900 break-words leading-tight">
                                  {item.name}
                                </div>
                              )}

                              {/* Metadata Grid */}
                              <div className="flex flex-col gap-0.5 text-[8px] text-gray-500 font-bold w-full leading-normal">
                                {/* Row 1: Category & Brand */}
                                {(showCategoryToggle || showBrandToggle) && (
                                  <div className="flex justify-between w-full gap-2">
                                    <div className="flex items-baseline gap-0.5 w-[48%] overflow-hidden whitespace-nowrap">
                                      {showCategoryToggle && (
                                        <>
                                          <span className="text-gray-400">Cat:</span>
                                          <span className="text-gray-900 font-extrabold truncate">{prod.category?.name || '—'}</span>
                                        </>
                                      )}
                                    </div>
                                    <div className="flex items-baseline gap-0.5 w-[48%] overflow-hidden whitespace-nowrap">
                                      {showBrandToggle && (
                                        <>
                                          <span className="text-gray-400">Brand:</span>
                                          <span className="text-gray-900 font-extrabold truncate">{prod.brand?.name || 'Generic'}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Row 2: SKU & Unit Size */}
                                {(showSKUToggle || showUnitToggle) && (
                                  <div className="flex justify-between w-full gap-2">
                                    <div className="flex items-baseline gap-0.5 w-[55%] overflow-hidden whitespace-nowrap">
                                      {showSKUToggle && (
                                        <>
                                          <span className="text-gray-400">SKU:</span>
                                          <span className="text-gray-900 font-extrabold font-mono truncate">{prod.sku || '—'}</span>
                                        </>
                                      )}
                                    </div>
                                    <div className="flex items-baseline gap-0.5 w-[41%] overflow-hidden whitespace-nowrap">
                                      {showUnitToggle && (
                                        <>
                                          <span className="text-gray-400">Unit:</span>
                                          <span className="text-gray-900 font-extrabold truncate">{prod.measurement || prod.unit || "—"}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Row 3: MRP & Selling Price */}
                                {(showMRPToggle || showPriceToggle) && (
                                  <div className="flex justify-between w-full gap-2">
                                    <div className="flex items-baseline gap-0.5 w-[48%] overflow-hidden whitespace-nowrap">
                                      {showMRPToggle && (
                                        <>
                                          <span className="text-gray-400">MRP:</span>
                                          <span className="text-gray-900 font-extrabold truncate">₹{prod.mrp || '0.00'}</span>
                                        </>
                                      )}
                                    </div>
                                    <div className="flex items-baseline gap-0.5 w-[48%] overflow-hidden whitespace-nowrap">
                                      {showPriceToggle && (
                                        <>
                                          <span className="text-gray-400">Price:</span>
                                          <span className="text-gray-900 font-extrabold truncate">₹{prod.price || '0.00'}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Barcode Canvas */}
                              {showBarcodeToggle && (
                                <div className="w-full overflow-hidden flex flex-col items-center">
                                  <canvas
                                    id={`preview-barcode-${item.id}`}
                                    style={{ width: '90%', height: 'auto', maxHeight: '30px', display: 'block' }}
                                  ></canvas>
                                  <div className="text-[9px] font-mono font-bold text-gray-800 mt-0.5 leading-none">
                                    {prod?.barcode || (prod?.supplierBarcodes?.[0]?.supplierBarcode) || 'VGK00000001'}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Pagination controls for preview */}
                        {printItems.length > 1 && (
                          <div className="flex items-center gap-4 bg-white border border-gray-150 px-4 py-2.5 rounded-2xl shadow-sm mt-2">
                            <button
                              type="button"
                              disabled={previewIndex === 0}
                              onClick={() => setPreviewIndex(prev => Math.max(0, prev - 1))}
                              className="p-1.5 border border-gray-150 rounded-lg text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                            >
                              <ChevronLeft size={16} />
                            </button>
                            <span className="text-xs font-black text-gray-600">
                              Showing {previewIndex + 1} of {printItems.length} labels
                            </span>
                            <button
                              type="button"
                              disabled={previewIndex === printItems.length - 1}
                              onClick={() => setPreviewIndex(prev => Math.min(printItems.length - 1, prev + 1))}
                              className="p-1.5 border border-gray-150 rounded-lg text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                            >
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-gray-400 text-xs font-bold text-center w-full py-12">No products selected for preview</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Sticky Action Bar */}
              <div className="flex items-center justify-end gap-3.5 bg-gray-50 border border-gray-100 p-4 rounded-2xl mt-6">
                <button
                  onClick={() => setSearchParams({ tab: 'master' })}
                  className="px-6 py-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 bg-white hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePrintLabels}
                  disabled={printItems.length === 0}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-6 py-3 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all disabled:opacity-50"
                >
                  <Printer size={15} /> Print Labels
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Modal: Bulk Import */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full border border-gray-100 shadow-lg space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <h3 className="text-lg font-black text-gray-900">Bulk Import Barcodes</h3>
              <button 
                onClick={() => {
                  setImportModalOpen(false);
                  setBulkData('');
                  setUploadFilename('');
                }} 
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-emerald-800 uppercase tracking-wider block">Excel Template</span>
                    <span className="text-[10px] font-bold text-emerald-600 block">Download unified import template sheet</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const XLSX = window.XLSX;
                      if (!XLSX) {
                        toast.error('SheetJS library not loaded');
                        return;
                      }
                      const headers = [[
                        'productName',
                        'barcodeType',
                        'barcodeValue',
                        'sku',
                        'category',
                        'brand',
                        'unit',
                        'packSize',
                        'status'
                      ]];
                      const sampleRows = [
                        ['Aachi chicken masala', 'VGK Internal', 'VGK00000006', 'VK-ITM-BAKE-413', 'Bakery & Biscuits', 'Unbranded', 'Pack', '1', 'ACTIVE'],
                        ['Basmati Rice 1kg', 'Supplier', '8901058002314', 'VK-ITM-GROC-234', 'Grocery', 'Unbranded', 'Pack', '1', 'ACTIVE']
                      ];
                      const ws = XLSX.utils.aoa_to_sheet([...headers, ...sampleRows]);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, 'Products & Barcodes');
                      XLSX.writeFile(wb, 'products_barcode_template.xlsx');
                      toast.success('Excel Template downloaded successfully');
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-colors"
                  >
                    Download Template
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 block">Upload Excel Sheet (.xlsx / .xls)</label>
                <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all relative ${uploadFilename ? 'border-emerald-500 bg-emerald-50/10' : 'border-gray-200 hover:border-emerald-500 bg-gray-50/10'}`}>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;

                      // Save filename in component local storage/state to show the user
                      setUploadFilename(file.name);

                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        try {
                          const XLSX = window.XLSX;
                          if (!XLSX) {
                            toast.error('SheetJS library not loaded');
                            return;
                          }
                          const data = new Uint8Array(evt.target.result);
                          const workbook = XLSX.read(data, { type: 'array' });
                          const sheetName = workbook.SheetNames[0];
                          const worksheet = workbook.Sheets[sheetName];
                          const jsonData = XLSX.utils.sheet_to_json(worksheet);

                          if (jsonData.length === 0) {
                            toast.error('No rows found in Excel sheet');
                            return;
                          }

                          // Map Excel columns to match API structure
                          const parsedRows = jsonData.map(row => {
                            const isSupplier = row.barcodeType?.toString().toLowerCase().includes('supplier');
                            return {
                              sku: row.sku?.toString().trim() || row.sku?.toString().trim() || '',
                              name: row.productName?.toString().trim() || '',
                              category: row.category?.toString().trim() || '',
                              brand: row.brand?.toString().trim() || '',
                              unit: row.unit?.toString().trim() || '',
                              packSize: row.packSize?.toString().trim() || '',
                              status: row.status?.toString().trim() || 'ACTIVE',
                              barcode: !isSupplier ? (row.barcodeValue?.toString().trim() || '') : '',
                              supplierBarcode: isSupplier ? (row.barcodeValue?.toString().trim() || '') : ''
                            };
                          }).filter(row => row.sku);

                          if (parsedRows.length === 0) {
                            toast.error('Missing mandatory column "sku" in rows');
                            return;
                          }

                          setBulkData(JSON.stringify(parsedRows));
                          toast.success(`Loaded ${parsedRows.length} rows from Excel!`);
                        } catch (err) {
                          toast.error('Failed to parse Excel file');
                        }
                      };
                      reader.readAsArrayBuffer(file);
                    }}
                  />
                  <div className="space-y-1.5 pointer-events-none">
                    <Upload className={uploadFilename ? "mx-auto text-emerald-500" : "mx-auto text-gray-400"} size={24} />
                    {uploadFilename ? (
                      <>
                        <span className="text-xs font-black text-emerald-600 block">Selected: {uploadFilename}</span>
                        <span className="text-[10px] text-gray-400 block">Click to change or replace file</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xs font-bold text-gray-600 block">Click or drag Excel file here</span>
                        <span className="text-[10px] text-gray-400 block">Supports .xlsx and .xls formats</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
                <button
                  type="button"
                  disabled={importLoading}
                  onClick={() => {
                    setImportModalOpen(false);
                    setBulkData('');
                    setUploadFilename('');
                  }}
                  className="px-5 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-bold text-gray-500 disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkImport}
                  disabled={!bulkData || importLoading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {importLoading && (
                    <RefreshCw size={14} className="animate-spin" />
                  )}
                  <span>{importLoading ? 'Importing...' : 'Upload & Import'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
