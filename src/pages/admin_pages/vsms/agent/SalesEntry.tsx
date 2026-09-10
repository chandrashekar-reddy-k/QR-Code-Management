// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Search, ShoppingCart, Smartphone, Gift, Grid, ScanBarcode, AlertTriangle, Plus, Minus } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { productsAPI } from '../services/api';
import { useCartStore } from '../store/cartStore';
import ProductGrid from './components/ProductGrid';
import CartDrawer from './components/CartDrawer';
import BarcodeScannerOverlay from './components/BarcodeScannerOverlay';
import { useBarcodeScanner } from './hooks/useBarcodeScanner';
import { getCashStatus } from '../services/cashService';
import { getTodayPlan } from '../services/routeService';
import adminAPI from '../services/adminService';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function SalesEntry() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterSubCategory, setFilterSubCategory] = useState('ALL');
  const [filterFreeOnly, setFilterFreeOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [unavailableCode, setUnavailableCode] = useState(null);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [scannedQuantity, setScannedQuantity] = useState(1);
  const [plan, setPlan] = useState(null);
  const { user } = useUserStore();
  const { items, customerMobile, setCustomerMobile, customerName, setCustomerName, totalAmount, addItem } = useCartStore();
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  // Load products when component mounts or user details are updated
  useEffect(() => {
    fetchSettings();
    if (user) {
      checkCashStatus();
      loadPlan();
      loadProducts(user);
    } else {
      loadProducts(null);
    }
  }, [user?.id, user?.assignedVehicleId]);


  const loadPlan = async () => {
    try {
      const data = await getTodayPlan();
      setPlan(data);
    } catch (err) {
      console.error('Failed to load plan');
    }
  };

  const fetchSettings = async () => {
    try {
      const { data } = await adminAPI.getSettings();
      if (data?.success && data.data.deliverySlabs) {
        useCartStore.getState().setDeliverySlabs(data.data.deliverySlabs);
      }
    } catch (err) {
      console.warn('Failed to load settings');
    }
  };

  const handleBarcodeScan = (code) => {
    const product = products.find(p => p.skuCode === code || p.barcode === code);
    if (product) {
      if (product.stock <= 0) {
        toast.error(`${product.name} is out of stock`);
      } else {
        setScannedProduct(product);
        setScannedQuantity(1);
      }
    } else {
      setUnavailableCode(code);
    }
  };

  useBarcodeScanner(handleBarcodeScan);
  // console.log('token:', localStorage.getItem('token'));
  const checkCashStatus = async () => {
    try {
      const status = await getCashStatus();
      if (status.vehicleAssigned === false) {
        toast.error('No vehicle assigned to your profile');
        return;
      }
    } catch (err) {
      console.error('Error checking cash status:', err);
    }
  };

  const loadProducts = async (currentUser) => {
    try {
      setLoading(true);
      const targetUser = currentUser || user;
      let vehicleId = targetUser?.assignedVehicleId || targetUser?.assignedVehicle?.id;

      if (!vehicleId) {
        try {
          const meRes = await authAPI.me();
          const meData = meRes.data?.data || meRes.data;
          vehicleId = meData?.assignedVehicleId || meData?.assignedVehicle?.id;
        } catch (e) {
          console.warn('Could not fetch user me for vehicleId', e);
        }
      }

      const params = {};
      if (vehicleId) {
        params.vehicleId = vehicleId;
      }

      const { data } = await productsAPI.getAll(params);
      const rawProducts = Array.isArray(data)
        ? data
        : (data?.data?.products || data?.products || data?.data || []);

      setProducts(rawProducts);
      setFiltered(rawProducts);
    } catch (err) {
      console.error('Failed to load products', err);
      toast.error('Failed to load vehicle stock');
    } finally {
      setLoading(false);
    }
  };


  const categories = React.useMemo(() => {
    const catsMap = {};
    products.forEach(p => {
      if (p.category) {
        catsMap[p.category.name] = { id: p.categoryId, name: p.category.name };
      }
    });
    return Object.values(catsMap);
  }, [products]);

  const subCategories = React.useMemo(() => {
    const subsMap = {};
    products.forEach(p => {
      if (p.subCategory) {
        subsMap[p.subCategory.name] = {
          id: p.subCategoryId,
          name: p.subCategory.name,
          categoryId: p.categoryId,
          categoryName: p.category?.name
        };
      }
    });
    return Object.values(subsMap);
  }, [products]);

  useEffect(() => {
    let result = products;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    }
    if (filterCategory !== 'ALL') {
      result = result.filter(p => p.category?.name === filterCategory);
    }
    if (filterSubCategory !== 'ALL') {
      result = result.filter(p => p.subCategory?.name === filterSubCategory);
    }
    if (filterFreeOnly) {
      result = result.filter((p) => p.isFree);
    }
    setFiltered(result);
  }, [search, products, filterFreeOnly, filterCategory, filterSubCategory]);
  return (
    <div className="min-h-screen pb-32 bg-[#FAFAFA]">
      {/* Sticky Header Section (Title + Customer Name & Mobile Card + Search + Categories fixed together) */}
      <div className="sticky top-0 z-40 bg-[#FAFAFA] pt-2 pb-2.5 border-b border-gray-100 shadow-2xs">
        <div className="max-w-[420px] mx-auto px-4 space-y-3">
          {/* Title */}
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Sales Grid</h1>
          </div>

          {/* Customer Input Card (Customer Name & Mobile Number) */}
          <div className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-2xs space-y-2.5">
            <div className="grid grid-cols-2 gap-3">
              {/* Customer Name */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-gray-900 flex items-center gap-0.5">
                  Customer Name <span className="text-red-500 font-extrabold">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Customer Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#00891D] transition-colors"
                />
              </div>

              {/* Mobile Number */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-gray-900 flex items-center gap-0.5">
                  Mobile Number <span className="text-red-500 font-extrabold">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="Enter Mobile Number"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#00891D] transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Search Bar with Barcode Scanner Icon */}
          <div className="bg-white rounded-2xl p-2.5 px-3.5 border border-gray-200 shadow-2xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <Search size={16} className="text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="text-gray-400 hover:text-gray-600 cursor-pointer shrink-0"
              title="Scan Barcode"
            >
              <ScanBarcode size={18} />
            </button>
          </div>

          {/* Category Pills (Horizontal Scroll from Live Backend Data) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 no-scrollbar">
            <button
              type="button"
              onClick={() => setFilterCategory('ALL')}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
                filterCategory === 'ALL'
                  ? 'bg-[#00891D] text-white shadow-2xs'
                  : 'bg-[#EAEAEA] text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Items
            </button>
            {categories.map((cat) => {
              const isSelected = filterCategory === cat.name;
              return (
                <button
                  key={cat.id || cat.name}
                  type="button"
                  onClick={() => setFilterCategory(cat.name)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-[#00891D] text-white shadow-2xs'
                      : 'bg-[#EAEAEA] text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-[420px] mx-auto px-4 pt-3 space-y-3.5">
        {/* 3-Column Product Grid (100% Live Backend Data) */}
        <div className="pt-0.5">
          <ProductGrid
            products={filtered}
            loading={loading}
          />
        </div>
      </div>

      {/* Floating Bottom Cart Bar (Exact to Mockup) */}
      {totalItems > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pointer-events-none">
          <div className="max-w-[420px] mx-auto bg-white rounded-3xl p-3 border border-gray-100 shadow-xl pointer-events-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center relative text-gray-700 border border-gray-100">
                <ShoppingCart size={18} className="text-gray-600" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#00891D] text-white text-[9px] font-black flex items-center justify-center border-2 border-white">
                  {totalItems}
                </span>
              </div>
              <div>
                <p className="text-[11px] font-extrabold text-gray-900 leading-tight">
                  {totalItems} Items in Cart
                </p>
                <p className="text-xs font-black text-[#00891D] mt-0.5">
                  Total ₹{totalAmount.toFixed(2)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="px-5 py-3 bg-[#00891D] hover:bg-[#007018] text-white rounded-2xl text-xs font-black shadow-sm active:scale-98 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Review Cart</span>
              <span className="font-black text-sm tracking-tighter">₹{Math.round(totalAmount)} →</span>
            </button>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        products={products}
        routeId={plan?.routeId}
        villageName={plan?.villageName}
      />

      {/* Barcode Scanner Overlay */}
      {showScanner && (
        <BarcodeScannerOverlay
          onScan={(code) => {
            handleBarcodeScan(code);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Unavailable Product Modal */}
      {unavailableCode && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Product Not Found</h3>
            <p className="text-sm text-gray-500 mb-6">
              The scanned barcode <span className="font-bold text-gray-900">"{unavailableCode}"</span> does not match any product in your inventory.
            </p>
            <button
              onClick={() => setUnavailableCode(null)}
              className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition-colors"
            >
              Okay
            </button>
          </div>
        </div>
      )}

      {/* Scanned Product Quantity Modal */}
      {scannedProduct && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black text-gray-900 mb-1">{scannedProduct.name}</h3>
            <p className="text-xs text-emerald-600 font-bold mb-6">Price: ₹{Math.round(scannedProduct.price)} • Stock: {scannedProduct.stock}</p>

            <div className="flex items-center justify-center gap-6 mb-8">
              <button
                onClick={() => setScannedQuantity(Math.max(1, scannedQuantity - 1))}
                className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
              >
                <Minus size={24} strokeWidth={3} />
              </button>
              <span className="text-4xl font-black text-gray-900 w-16">{scannedQuantity}</span>
              <button
                onClick={() => setScannedQuantity(Math.min(scannedProduct.stock, scannedQuantity + 1))}
                className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
              >
                <Plus size={24} strokeWidth={3} />
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setScannedProduct(null)}
                className="flex-1 bg-gray-100 text-gray-600 font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  addItem(scannedProduct, scannedQuantity);
                  toast.success(`Added ${scannedQuantity}x ${scannedProduct.name}`);
                  setScannedProduct(null);
                }}
                className="flex-[2] bg-emerald-600 text-white font-black py-3.5 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
