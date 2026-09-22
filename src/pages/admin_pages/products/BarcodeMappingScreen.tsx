import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Barcode, Search, Camera, Check, AlertCircle, RefreshCw,
  Layers, Package, ArrowLeft, Filter, CheckCircle2, ChevronRight,
  ChevronDown, X, Sparkles, SlidersHorizontal, Eye, ExternalLink,
  Zap, Save
} from 'lucide-react';
import toast from 'react-hot-toast';
import { barcodeAPI } from '../vsms/services/barcodeService';
import BarcodeScannerOverlay from '../../../components/BarcodeScannerOverlay';
import Breadcrumbs from '../../../components/common/Breadcrumbs';

interface Variant {
  id: string;
  variantName: string;
  sku: string;
  unit: string;
  unitType: string;
  measurement: string;
  status: string;
  gtin: string | null;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  unit: string;
  unitType: string;
  price: number;
  mrp: number | null;
  images: string[];
  category?: { id: string; name: string };
  brand?: { id: string; name: string };
  variants: Variant[];
  masterProductId?: string | null;
}

export default function BarcodeMappingScreen() {
  const navigate = useNavigate();

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    barcoded: 0,
    unbarcoded: 0
  });

  // Filter states
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'BARCODED' | 'UNBARCODED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  // Input editing state: { [targetKey: string]: string }
  // targetKey is either product.id or `${product.id}_var_${variant.id}`
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedSuccessKey, setSavedSuccessKey] = useState<string | null>(null);

  // Scanner Modal state
  const [scannerTarget, setScannerTarget] = useState<{
    productId: string;
    variantId?: string | null;
    productName: string;
    key: string;
  } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 25;

  // Refs for focusing inputs sequentially
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      if (categoryFilter !== 'all') {
        params.categoryId = categoryFilter;
      }

      if (statusFilter === 'BARCODED') {
        params.filter = 'barcoded';
      } else if (statusFilter === 'UNBARCODED') {
        params.filter = 'unbarcoded';
      }

      const res = await barcodeAPI.getBarcodeMasterList(params);
      const fetchedProducts: Product[] = res.data?.products || [];
      setProducts(fetchedProducts);
      setTotalPages(res.data?.pages || 1);
      setTotalCount(res.data?.total || 0);

      // Populate initial values
      const initialMap: Record<string, string> = {};
      const uniqueCategories = new Map<string, string>();

      fetchedProducts.forEach((p) => {
        initialMap[p.id] = p.barcode || '';
        if (p.category?.id && p.category?.name) {
          uniqueCategories.set(p.category.id, p.category.name);
        }
        if (p.variants && p.variants.length > 0) {
          p.variants.forEach((v) => {
            initialMap[`${p.id}_var_${v.id}`] = v.gtin || '';
          });
        }
      });

      setInputValues((prev) => {
        const next = { ...prev };
        Object.keys(initialMap).forEach((k) => {
          next[k] = initialMap[k];
        });
        return next;
      });

      // Extract categories for dropdown
      if (categories.length === 0 && uniqueCategories.size > 0) {
        setCategories(
          Array.from(uniqueCategories.entries()).map(([id, name]) => ({ id, name }))
        );
      }
    } catch (err: any) {
      console.error('Failed to fetch barcode products:', err);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchQuery, categoryFilter, statusFilter, categories.length]);

  // Fetch summary stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await barcodeAPI.getDashboardStats();
      if (res.data) {
        setStats({
          total: res.data.totalProducts || 0,
          barcoded: res.data.productsWithBarcode || 0,
          unbarcoded: res.data.productsWithoutBarcode || 0
        });
      }
    } catch (err) {
      console.warn('Dashboard stats fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Focus the next row's input automatically
  const focusNextInput = (currentKey: string) => {
    const keys = Object.keys(inputRefs.current);
    const currentIndex = keys.indexOf(currentKey);
    if (currentIndex !== -1 && currentIndex + 1 < keys.length) {
      const nextKey = keys[currentIndex + 1];
      inputRefs.current[nextKey]?.focus();
      inputRefs.current[nextKey]?.select();
    }
  };

  // Quick save a barcode mapping
  const handleSaveBarcode = async (
    productId: string,
    variantId: string | null = null,
    targetKey: string,
    advanceFocus = true
  ) => {
    const rawVal = inputValues[targetKey] || '';
    const cleanBarcode = rawVal.trim() ? rawVal.trim() : null;

    setSavingKey(targetKey);
    try {
      const res = await barcodeAPI.quickMapBarcode({
        productId,
        variantId,
        barcode: cleanBarcode
      });

      if (res.data?.success || res.status === 200) {
        setSavedSuccessKey(targetKey);
        setTimeout(() => setSavedSuccessKey(null), 2500);
        toast.success(
          cleanBarcode
            ? `Mapped "${cleanBarcode}" to Product & Master catalog`
            : 'Barcode cleared'
        );

        // Update local product item state
        setProducts((prev) =>
          prev.map((p) => {
            if (p.id === productId) {
              if (variantId) {
                return {
                  ...p,
                  variants: (p.variants || []).map((v) =>
                    v.id === variantId ? { ...v, gtin: cleanBarcode } : v
                  )
                };
              }
              return { ...p, barcode: cleanBarcode };
            }
            return p;
          })
        );

        // Refresh summary stats
        fetchStats();

        // Advance focus if requested
        if (advanceFocus) {
          focusNextInput(targetKey);
        }
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to map barcode';
      toast.error(errorMsg);
    } finally {
      setSavingKey(null);
    }
  };

  // Camera scan success handler
  const handleScanComplete = (scannedCode: string) => {
    if (!scannerTarget) return;
    const cleanCode = String(scannedCode || '').trim();
    if (!cleanCode) return;

    setInputValues((prev) => ({
      ...prev,
      [scannerTarget.key]: cleanCode
    }));

    // Instantly save
    handleSaveBarcode(
      scannerTarget.productId,
      scannerTarget.variantId || null,
      scannerTarget.key,
      true
    );

    setScannerTarget(null);
  };

  return (
    <div className="w-full min-h-screen bg-gray-50/50 dark:bg-gray-950 p-3 sm:p-6 space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="space-y-2">
        <Breadcrumbs />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/products/manage')}
              className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-all shadow-sm"
              title="Back to Manage Products"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  Barcode Quick Mapping
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40">
                  Live Auto-Sync
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
                Scan or enter barcodes row-by-row. Values automatically map and update both MasterProduct and Product records.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchProducts()}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin text-emerald-600' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Total Catalog */}
        <div
          onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
          className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 ${
            statusFilter === 'ALL'
              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 ring-2 ring-blue-400/30'
              : 'bg-white dark:bg-gray-900 border-gray-200/80 dark:border-gray-800 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Total Catalog</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{stats.total || totalCount}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Package size={24} />
            </div>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 font-medium">All registered products in warehouse</p>
        </div>

        {/* Barcoded Products */}
        <div
          onClick={() => { setStatusFilter('BARCODED'); setCurrentPage(1); }}
          className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 ${
            statusFilter === 'BARCODED'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 ring-2 ring-emerald-400/30'
              : 'bg-white dark:bg-gray-900 border-gray-200/80 dark:border-gray-800 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Mapped (Barcoded)</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{stats.barcoded}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={24} />
            </div>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 font-medium">Products with valid barcode assigned</p>
        </div>

        {/* Non-Barcoded Products */}
        <div
          onClick={() => { setStatusFilter('UNBARCODED'); setCurrentPage(1); }}
          className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 ${
            statusFilter === 'UNBARCODED'
              ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-400 dark:border-amber-700 ring-2 ring-amber-400/30'
              : 'bg-white dark:bg-gray-900 border-gray-200/80 dark:border-gray-800 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Needs Barcode</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{stats.unbarcoded}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <AlertCircle size={24} />
            </div>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 font-medium">Items waiting for barcode scan/input</p>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-4 shadow-sm space-y-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Status Filter Pill Tabs */}
          <div className="inline-flex p-1 bg-gray-100/80 dark:bg-gray-800 rounded-xl">
            <button
              onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              All Products
            </button>
            <button
              onClick={() => { setStatusFilter('BARCODED'); setCurrentPage(1); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                statusFilter === 'BARCODED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-emerald-600'
              }`}
            >
              <CheckCircle2 size={15} />
              <span>Barcoded</span>
            </button>
            <button
              onClick={() => { setStatusFilter('UNBARCODED'); setCurrentPage(1); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                statusFilter === 'UNBARCODED'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-amber-600'
              }`}
            >
              <AlertCircle size={15} />
              <span>Non-Barcoded</span>
            </button>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 max-w-xl">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by product name, SKU, barcode..."
                className="w-full pl-9 pr-8 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:bg-white focus:border-emerald-500 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Category Dropdown */}
            {categories.length > 0 && (
              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="appearance-none pl-3 pr-8 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200 outline-none focus:border-emerald-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            )}
          </div>
        </div>

        {/* Tip banner */}
        <div className="flex items-center gap-2 p-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
          <Zap size={14} className="text-emerald-600 shrink-0 fill-emerald-600" />
          <span>
            <strong>ProTip:</strong> Type or scan barcode into any row and press <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-emerald-300 dark:border-emerald-800 rounded font-mono font-bold text-[10px]">Enter</kbd> to automatically save and jump to the next item in sequence!
          </span>
        </div>
      </div>

      {/* Main Products Rows Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <RefreshCw size={28} className="animate-spin text-emerald-600" />
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Loading catalog items...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 mb-3">
              <Barcode size={32} />
            </div>
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">No products found</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mt-1">
              Try adjusting your search query or filter to see products.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {/* Table Header Bar */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 bg-gray-50/80 dark:bg-gray-800/60 text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <div className="col-span-5">Product Details & SKU</div>
              <div className="col-span-2">Category / Unit</div>
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-4">Barcode Mapping & Quick Scanner</div>
            </div>

            {/* Product Rows */}
            {products.map((product) => {
              const targetKey = product.id;
              const hasBarcode = Boolean(product.barcode && product.barcode.trim());
              const isSaving = savingKey === targetKey;
              const isSaved = savedSuccessKey === targetKey;
              const hasVariants = product.variants && product.variants.length > 0;

              return (
                <div key={product.id} className="p-4 sm:px-6 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    {/* Col 1: Product Thumbnail & Name */}
                    <div className="md:col-span-5 flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
                        {product.images && product.images[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Package size={20} className="text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                            {product.name}
                          </h4>
                          {hasVariants && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              {product.variants.length} Variants
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-mono font-semibold text-gray-500 dark:text-gray-400">
                            SKU: {product.sku || 'N/A'}
                          </span>
                          {product.price > 0 && (
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                              • ₹{product.price}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Col 2: Category & Unit */}
                    <div className="md:col-span-2 text-xs">
                      <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                        {product.category?.name || 'General'}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-[11px] mt-0.5">
                        {product.unit || 'Pack'} {product.unitType ? `(${product.unitType})` : ''}
                      </p>
                    </div>

                    {/* Col 3: Status Badge */}
                    <div className="md:col-span-1 flex md:justify-center">
                      {hasBarcode ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <Check size={12} />
                          <span>Mapped</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <AlertCircle size={12} />
                          <span>Missing</span>
                        </span>
                      )}
                    </div>

                    {/* Col 4: Barcode Input & Scanner Button */}
                    <div className="md:col-span-4 flex items-center gap-2">
                      <div className="relative flex-1">
                        <Barcode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          ref={(el) => { inputRefs.current[targetKey] = el; }}
                          type="text"
                          value={inputValues[targetKey] ?? ''}
                          onChange={(e) =>
                            setInputValues((prev) => ({
                              ...prev,
                              [targetKey]: e.target.value
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveBarcode(product.id, null, targetKey, true);
                            }
                          }}
                          placeholder="Scan or enter barcode..."
                          className={`w-full pl-9 pr-8 py-2 text-xs sm:text-sm font-mono font-bold rounded-xl border outline-none transition-all shadow-inner ${
                            isSaved
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                              : hasBarcode
                              ? 'bg-gray-50/90 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:bg-white focus:border-emerald-500'
                              : 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60 text-gray-900 dark:text-white focus:bg-white focus:border-emerald-500'
                          }`}
                        />
                        {inputValues[targetKey] && (
                          <button
                            type="button"
                            onClick={() => {
                              setInputValues((prev) => ({ ...prev, [targetKey]: '' }));
                              handleSaveBarcode(product.id, null, targetKey, false);
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-500 p-0.5"
                            title="Clear barcode"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>

                      {/* Camera Scanner Button for this item */}
                      <button
                        type="button"
                        onClick={() =>
                          setScannerTarget({
                            productId: product.id,
                            variantId: null,
                            productName: product.name,
                            key: targetKey
                          })
                        }
                        className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-sm hover:shadow text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
                        title="Scan using camera"
                      >
                        <Camera size={15} />
                        <span className="hidden sm:inline">Scan</span>
                      </button>

                      {/* Save Button */}
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleSaveBarcode(product.id, null, targetKey, false)}
                        className={`p-2 rounded-xl border text-xs font-bold transition-all shrink-0 ${
                          isSaved
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 hover:bg-emerald-50 hover:text-emerald-600 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200'
                        }`}
                        title="Save Barcode"
                      >
                        {isSaving ? (
                          <RefreshCw size={15} className="animate-spin text-emerald-600" />
                        ) : isSaved ? (
                          <Check size={15} />
                        ) : (
                          <Save size={15} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Multi-variant nested mappings if product has variants */}
                  {hasVariants && (
                    <div className="mt-3 pl-6 sm:pl-12 pr-2 py-3 bg-gray-50/70 dark:bg-gray-850/50 rounded-xl border border-gray-100 dark:border-gray-800 space-y-2.5">
                      <p className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        Product Variants (GTIN Barcode per variant)
                      </p>
                      {product.variants.map((variant) => {
                        const varKey = `${product.id}_var_${variant.id}`;
                        const currentVal = inputValues[varKey] ?? variant.gtin ?? '';
                        const hasVarBarcode = Boolean(currentVal && currentVal.trim());
                        const isVarSaving = savingKey === varKey;
                        const isVarSaved = savedSuccessKey === varKey;
                        const searchLower = searchQuery.trim().toLowerCase();
                        const isSearchMatch = Boolean(
                          searchLower && (
                            (variant.gtin && variant.gtin.toLowerCase().includes(searchLower)) ||
                            (currentVal && currentVal.toLowerCase().includes(searchLower)) ||
                            (variant.sku && variant.sku.toLowerCase().includes(searchLower)) ||
                            (variant.variantName && variant.variantName.toLowerCase().includes(searchLower))
                          )
                        );

                        return (
                          <div
                            key={variant.id}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2 rounded-xl transition-all ${
                              isSearchMatch
                                ? 'bg-emerald-100/60 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-400/40'
                                : 'border-t border-gray-200/50 dark:border-gray-800 first:border-0'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                {variant.variantName}
                              </span>
                              <span className="text-[11px] font-mono text-gray-400">
                                ({variant.sku || 'SKU N/A'})
                              </span>
                              {isSearchMatch && (
                                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-600 text-white shadow-xs">
                                  Matched
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 sm:w-96">
                              <div className="relative flex-1">
                                <input
                                  ref={(el) => { inputRefs.current[varKey] = el; }}
                                  type="text"
                                  value={inputValues[varKey] ?? ''}
                                  onChange={(e) =>
                                    setInputValues((prev) => ({
                                      ...prev,
                                      [varKey]: e.target.value
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSaveBarcode(product.id, variant.id, varKey, true);
                                    }
                                  }}
                                  placeholder="Variant barcode..."
                                  className={`w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border outline-none transition-all ${
                                    isVarSaved
                                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                                      : hasVarBarcode
                                      ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white'
                                      : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 text-gray-900 dark:text-white'
                                  }`}
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setScannerTarget({
                                    productId: product.id,
                                    variantId: variant.id,
                                    productName: `${product.name} - ${variant.variantName}`,
                                    key: varKey
                                  })
                                }
                                className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs"
                                title="Scan Variant"
                              >
                                <Camera size={14} />
                              </button>

                              <button
                                type="button"
                                disabled={isVarSaving}
                                onClick={() => handleSaveBarcode(product.id, variant.id, varKey, false)}
                                className="p-1.5 bg-gray-100 hover:bg-emerald-50 rounded-lg text-xs border border-gray-200 text-gray-700"
                              >
                                {isVarSaving ? (
                                  <RefreshCw size={14} className="animate-spin text-emerald-600" />
                                ) : (
                                  <Save size={14} />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs font-semibold text-gray-600 dark:text-gray-400">
            <div>
              Showing Page {currentPage} of {totalPages} ({totalCount} total items)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg disabled:opacity-40 hover:bg-gray-200 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg disabled:opacity-40 hover:bg-gray-200 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Camera Barcode Scanner Modal */}
      {scannerTarget && (
        <BarcodeScannerOverlay
          onScan={handleScanComplete}
          onClose={() => setScannerTarget(null)}
        />
      )}
    </div>
  );
}
