// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import {
  Package, MapPin, Phone, Clock, Plus, Search, CheckCircle2,
  Calendar, ArrowRight, User, DollarSign, FileText, AlertCircle,
  Truck, X, ChevronRight, Check, Send, Printer, RefreshCw,
  Camera, ShoppingBag, CreditCard, ChevronDown, MessageSquare,
  ArrowLeft, ChevronLeft, Wand2, Sparkles, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useUserStore } from '../store/userStore';
import { getTodayPlan } from '../services/routeService';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3004/api/v1' : '/api/v1';

const getAgentToken = () =>
  localStorage.getItem('token') ||
  localStorage.getItem('partnerToken') ||
  localStorage.getItem('authToken') || '';

const api = axios.create({ baseURL: API_BASE });
api.interceptors.request.use(cfg => {
  const t = getAgentToken();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  RECEIVED:         { label: 'Received',         bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  CONFIRMED:        { label: 'Confirmed',        bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
  PACKED:           { label: 'Packed in Hub',    bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200' },
  LOADED:           { label: 'Loaded on Vehicle',bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200' },
  DELIVERED:        { label: 'Delivered',        bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  CANCELLED:        { label: 'Cancelled',        bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200' },
  RESCHEDULED:      { label: 'Rescheduled',      bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200' },
};

// view: 'list' | 'form' | 'detail' | 'complete'
export default function AgentPreOrders() {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const [view, setView] = useState<'list' | 'form' | 'detail' | 'complete'>('list');
  const [activeTab, setActiveTab] = useState<'deliveries' | 'my_bookings'>('deliveries');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deliveriesToday, setDeliveriesToday] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [todayPlan, setTodayPlan] = useState<any>(null);

  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any | null>(null);
  const [deliveryOrder, setDeliveryOrder] = useState<any | null>(null);
  const [deliveryPaymentMode, setDeliveryPaymentMode] = useState('CASH');
  const [deliveryCollectedAmount, setDeliveryCollectedAmount] = useState<number>(0);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  // Form State for Booking
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [villageName, setVillageName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [deliveryDateOption, setDeliveryDateOption] = useState<'tomorrow' | 'day_after' | 'custom'>('tomorrow');
  const [customDate, setCustomDate] = useState('');
  const [deliverySlot, setDeliverySlot] = useState('Morning (8 AM - 12 PM)');
  const [customNotes, setCustomNotes] = useState('');
  const [customEstimatedAmount, setCustomEstimatedAmount] = useState<string>('');
  const [advanceAmount, setAdvanceAmount] = useState<string>('0');
  const [advanceMode, setAdvanceMode] = useState<'NONE' | 'CASH' | 'UPI'>('NONE');
  const [submitting, setSubmitting] = useState(false);

  // Product Catalog
  const [itemMode, setItemMode] = useState<'catalog' | 'word_of_mouth'>('word_of_mouth');
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCatalogItems, setSelectedCatalogItems] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const dayAfterStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  }, []);

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [res, planData] = await Promise.all([
        api.get('/agent/pre-orders'),
        getTodayPlan().catch(() => null)
      ]);
      if (res.data.success) {
        setDeliveriesToday(res.data.deliveriesToday || []);
        setMyBookings(res.data.myBookings || []);
      }
      if (planData) {
        setTodayPlan(planData);
        if (planData.villageName && !villageName) setVillageName(planData.villageName);
      }
    } catch (err: any) {
      toast.error('Could not fetch pre-orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (view === 'form' && catalogProducts.length === 0) fetchCatalog();
  }, [view]);

  const fetchCatalog = async () => {
    setLoadingProducts(true);
    try {
      let res;
      try {
        res = await api.get('/agent/products');
      } catch {
        res = await api.get('/vsms/products');
      }
      const data = Array.isArray(res.data) ? res.data : (res.data?.products || []);
      setCatalogProducts(data);
    } catch { } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (customerPhone.length === 10) {
      api.get(`/agent/pre-orders/search-customer?query=${customerPhone}`)
        .then(res => {
          if (res.data.customers?.length > 0) {
            const match = res.data.customers[0];
            setCustomerName(match.name || '');
            if (match.address) setDeliveryAddress(match.address);
            toast.success(`Found: ${match.name}`);
          }
        }).catch(() => {});
    }
  }, [customerPhone]);

  const filteredCatalog = useMemo(() => {
    if (!catalogSearch) return catalogProducts.slice(0, 15);
    const q = catalogSearch.toLowerCase();
    return catalogProducts.filter(p =>
      p.name?.toLowerCase().includes(q) || p.skuCode?.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [catalogProducts, catalogSearch]);

  const handleAddCatalogItem = (prod: any) => {
    const existing = selectedCatalogItems.find(i => i.productId === prod.id);
    if (existing) {
      setSelectedCatalogItems(prev => prev.map(i => i.productId === prod.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setSelectedCatalogItems(prev => [...prev, {
        productId: prod.id,
        productName: prod.name,
        unitPrice: Number(prod.sellingPrice || prod.price || 0),
        quantity: 1,
        image: prod.images?.[0] || prod.image || null,
        unit: prod.unit || 'pcs'
      }]);
    }
  };

  const handleUpdateCatalogQty = (identifier: string, delta: number) => {
    setSelectedCatalogItems(prev => prev.map(item => {
      const match = (item.productId && item.productId === identifier) || item.productName === identifier || identifier.includes(item.productName);
      if (match) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const catalogSubtotal = useMemo(() =>
    selectedCatalogItems.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0)
  , [selectedCatalogItems]);

  const calculatedTotal = useMemo(() =>
    catalogSubtotal + Number(customEstimatedAmount || 0)
  , [catalogSubtotal, customEstimatedAmount]);

  const handleCreatePreOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerPhone || !customerName) return toast.error('Customer name and phone required');
    if (!villageName) return toast.error('Village / locality is required');
    if (selectedCatalogItems.length === 0 && !customNotes.trim()) return toast.error('Add items or enter customer notes');

    let resolvedDate = tomorrowStr;
    if (deliveryDateOption === 'day_after') resolvedDate = dayAfterStr;
    if (deliveryDateOption === 'custom' && customDate) resolvedDate = customDate;

    setSubmitting(true);
    try {
      const res = await api.post('/agent/pre-orders', {
        customerMobile: customerPhone,
        customerName,
        villageName,
        deliveryAddress,
        landmark,
        deliveryDate: resolvedDate,
        deliverySlot,
        catalogItems: selectedCatalogItems,
        customNotes,
        customEstimatedAmount: Number(customEstimatedAmount || 0),
        advanceAmount: Number(advanceAmount || 0),
        advancePaymentMode: advanceMode,
        source: 'VEHICLE_AGENT'
      });
      if (res.data.success) {
        toast.success('Pre-order booked!');
        setSelectedOrderDetails(res.data.preOrder);
        resetForm();
        loadData();
        setView('detail');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create pre-order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutofillPreOrder = async () => {
    let prods = catalogProducts;
    if (prods.length === 0) {
      setLoadingProducts(true);
      try {
        let res;
        try {
          res = await api.get('/agent/products');
        } catch {
          res = await api.get('/vsms/products');
        }
        prods = Array.isArray(res.data) ? res.data : (res.data?.products || []);
        setCatalogProducts(prods);
      } catch {
        // fallback
      } finally {
        setLoadingProducts(false);
      }
    }

    // Pick 10-15 products
    const sampleNames = [
      'Ramesh Kumar', 'Suresh Reddy', 'Lakshmi Bai', 'Venkatesh Goud',
      'Narayana Murthy', 'Anitha Devi', 'Mallesh Yadav', 'Rajesh Sharma'
    ];
    const sampleVillages = [
      'Shankarpally', 'Chevella', 'Mokila', 'Janwada', 'Kondapur Village', 'Mirzaguda'
    ];

    const randomName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
    const randomVillage = todayPlan?.villageName || sampleVillages[Math.floor(Math.random() * sampleVillages.length)];
    const randomMobile = '98' + Math.floor(10000000 + Math.random() * 90000000);

    setCustomerName(randomName);
    setCustomerPhone(randomMobile);
    setVillageName(randomVillage);
    setLandmark('Near Ramalayam Temple');
    setDeliveryAddress(`H.No 3-45, Main Bazaar, ${randomVillage}`);
    setDeliveryDateOption('tomorrow');
    setDeliverySlot('Morning (8 AM - 12 PM)');
    setItemMode('catalog');

    if (prods && prods.length > 0) {
      // Pick 10 to 15 random or sequential products from catalog
      const count = Math.min(prods.length, Math.floor(Math.random() * 6) + 10); // 10 to 15
      const shuffled = [...prods].sort(() => 0.5 - Math.random()).slice(0, count);
      const items = shuffled.map((p, idx) => ({
        productId: p.id,
        productName: p.name,
        unitPrice: Number(p.sellingPrice || p.price || 100),
        quantity: Math.floor(Math.random() * 3) + 1,
        image: p.images?.[0] || p.image || null,
        unit: p.unit?.type || p.unit || 'pcs'
      }));
      setSelectedCatalogItems(items);
      const total = items.reduce((s, it) => s + (it.unitPrice * it.quantity), 0);
      const adv = Math.floor(total * 0.2); // 20% advance
      setAdvanceMode('CASH');
      setAdvanceAmount(String(adv));
      toast.success(`Autofilled with ${items.length} products!`);
    } else {
      // Fallback if catalog products API is empty: populate with realistic 12 grocery items
      const mockGrocery = [
        { name: 'Sona Masoori Rice (25kg Bag)', price: 1450, qty: 1 },
        { name: 'Freedom Sunflower Oil (1L Pouch)', price: 135, qty: 2 },
        { name: 'Aashirvaad Superior MP Sharbati Atta (5kg)', price: 290, qty: 1 },
        { name: 'Toor Dal Premium (1kg)', price: 165, qty: 2 },
        { name: 'Tata Salt Crystal (1kg)', price: 25, qty: 2 },
        { name: 'Tata Tea Gold (500g)', price: 280, qty: 1 },
        { name: 'Surf Excel Quick Wash Detergent (1kg)', price: 155, qty: 1 },
        { name: 'Vim Dishwash Bar (300g)', price: 35, qty: 3 },
        { name: 'Colgate Strong Teeth Toothpaste (200g)', price: 110, qty: 1 },
        { name: 'Organic Jaggery (Bellam 1kg)', price: 75, qty: 2 },
        { name: 'Red Chilli Powder (500g)', price: 120, qty: 1 },
        { name: 'Dettol Original Soap (Pack of 3)', price: 140, qty: 1 }
      ];
      const items = mockGrocery.map((p) => ({
        productId: null,
        productName: p.name,
        unitPrice: p.price,
        quantity: p.qty,
        image: null,
        unit: 'pack'
      }));
      setSelectedCatalogItems(items);
      const total = items.reduce((s, it) => s + (it.unitPrice * it.quantity), 0);
      const adv = Math.floor(total * 0.2);
      setAdvanceMode('CASH');
      setAdvanceAmount(String(adv));
      toast.success(`Autofilled with ${items.length} products!`);
    }
  };

  const resetForm = () => {
    setCustomerPhone(''); setCustomerName(''); setDeliveryAddress(''); setLandmark('');
    setCustomNotes(''); setCustomEstimatedAmount(''); setAdvanceAmount('0'); setAdvanceMode('NONE');
    setSelectedCatalogItems([]); setDeliveryDateOption('tomorrow'); setItemMode('word_of_mouth');
  };

  const handleUpdateStatus = async (orderId: string, status: string, additionalData = {}) => {
    setUpdatingStatusId(orderId);
    try {
      const res = await api.put(`/agent/pre-orders/${orderId}/status`, { status, ...additionalData });
      if (res.data.success) {
        toast.success(`Marked as ${status.toLowerCase()}`);
        await loadData();
        if (view === 'complete') setView('list');
        if (view === 'detail') setView('list');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Status update failed');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const shareReceiptWhatsApp = (order: any) => {
    const text = `*VillagKart Pre-Order*\n\n*#:* ${order.preOrderNumber}\n*Customer:* ${order.customerName} (${order.customerMobile})\n*Village:* ${order.villageName || 'N/A'}\n*Delivery:* ${new Date(order.deliveryDate).toLocaleDateString('en-IN')} – ${order.deliverySlot || 'Anytime'}\n*Total:* ₹${order.estimatedTotal}  |  *Advance:* ₹${order.advanceAmount}\n*Balance Due:* ₹${order.balanceAmount}\n\n${order.customNotes ? `*Items:* ${order.customNotes}\n` : ''}Thank you!`;
    window.open(`https://wa.me/91${order.customerMobile}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // ─────────────────────────────────────────────
  // VIEW: ORDER DETAIL / RECEIPT
  // ─────────────────────────────────────────────
  if (view === 'detail' && selectedOrderDetails) {
    const order = selectedOrderDetails;
    const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.RECEIVED;
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800">
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 py-4 flex items-center gap-3 shadow-md sticky top-0 z-10">
          <button onClick={() => setView('list')} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Pre-Order Receipt</p>
            <h2 className="text-base font-black">{order.preOrderNumber}</h2>
          </div>
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${status.bg} ${status.text} ${status.border}`}>
            {status.label}
          </span>
        </div>

        <div className="p-4 space-y-4 max-w-lg mx-auto">
          {/* Customer Block */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-400">Customer Details</p>
            <p className="text-base font-black text-slate-900">{order.customerName}</p>
            <a href={`tel:${order.customerMobile}`} className="font-bold text-emerald-700 text-sm flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" /> {order.customerMobile}
            </a>
            <p className="text-slate-600 font-medium text-xs">{order.villageName || ''} {order.landmark ? `(${order.landmark})` : ''}</p>
            {order.deliveryAddress && <p className="text-slate-500 text-xs">{order.deliveryAddress}</p>}
          </div>

          {/* Delivery Schedule */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <p className="text-[10px] uppercase font-bold text-emerald-800 mb-1">Target Delivery Schedule</p>
            <p className="font-black text-emerald-950 text-sm">
              {new Date(order.deliveryDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
            <p className="font-semibold text-emerald-700 text-xs mt-0.5">Slot: {order.deliverySlot || 'Anytime'}</p>
          </div>

          {/* Word-of-Mouth Note */}
          {order.customNotes && (
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
              <p className="text-[10px] uppercase font-bold text-amber-800 mb-1">Customer's Item List</p>
              <p className="font-medium text-slate-800 text-xs italic leading-relaxed">"{order.customNotes}"</p>
            </div>
          )}

          {/* Catalog Items */}
          {order.items?.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Catalog Items</p>
              <div className="space-y-2">
                {order.items.map((it: any) => (
                  <div key={it.id} className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-800">{it.productName} × {it.quantity}</span>
                    <span className="font-black text-slate-900">₹{it.totalPrice}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financials */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-slate-400">Estimated Total:</span><span className="font-bold">₹{order.estimatedTotal}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Advance Paid ({order.advancePaymentMode || 'None'}):</span><span className="font-bold text-emerald-400">₹{order.advanceAmount}</span></div>
            <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-black">
              <span className="text-amber-300">Balance on Delivery:</span>
              <span className="text-amber-400 text-base">₹{order.balanceAmount}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={() => shareReceiptWhatsApp(order)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
            >
              <Send className="w-4 h-4" /> Share Receipt via WhatsApp
            </button>

            {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
              <button
                onClick={() => { setDeliveryOrder(order); setDeliveryCollectedAmount(order.balanceAmount || 0); setView('complete'); }}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Complete Delivery & Collect Payment
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // VIEW: COMPLETE DELIVERY & COLLECT PAYMENT
  // ─────────────────────────────────────────────
  if (view === 'complete' && deliveryOrder) {
    const order = deliveryOrder;
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800">
        <div className="bg-slate-900 text-white px-4 py-4 flex items-center gap-3 shadow-md sticky top-0 z-10">
          <button onClick={() => { setView(selectedOrderDetails ? 'detail' : 'list'); }} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Collect Payment</p>
            <h2 className="text-base font-black">Complete Pre-Order Delivery</h2>
          </div>
        </div>

        <div className="p-4 space-y-4 max-w-lg mx-auto">
          {/* Order Summary */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1.5 text-xs">
            <p className="font-black text-slate-800 text-sm">{order.customerName}</p>
            <p className="text-slate-500 font-medium">Pre-Order: {order.preOrderNumber}</p>
            <p className="text-slate-500 font-medium flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {order.villageName}</p>
            <div className="pt-2 border-t border-slate-100 flex justify-between font-bold text-sm">
              <span>Balance Remaining:</span>
              <span className="text-rose-600 font-black text-base">₹{order.balanceAmount}</span>
            </div>
          </div>

          {order.customNotes && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs italic text-amber-900 font-medium">
              "{order.customNotes}"
            </div>
          )}

          {/* Payment Mode */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">Payment Collection Mode</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDeliveryPaymentMode('CASH')}
                className={`py-3 rounded-xl font-black text-sm border flex items-center justify-center gap-2 ${deliveryPaymentMode === 'CASH' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200'}`}
              >
                <DollarSign className="w-4 h-4" /> Cash
              </button>
              <button
                onClick={() => setDeliveryPaymentMode('UPI')}
                className={`py-3 rounded-xl font-black text-sm border flex items-center justify-center gap-2 ${deliveryPaymentMode === 'UPI' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200'}`}
              >
                <CreditCard className="w-4 h-4" /> UPI
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">Amount Collected (₹)</label>
            <input
              type="number"
              value={deliveryCollectedAmount}
              onChange={(e) => setDeliveryCollectedAmount(Number(e.target.value))}
              className="w-full text-2xl font-black px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900"
            />
          </div>

          <button
            onClick={() => handleUpdateStatus(order.id, 'DELIVERED', {
              finalPaymentMode: deliveryPaymentMode,
              finalCollectedAmount: deliveryCollectedAmount
            })}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" /> Confirm Delivered & Close Order
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // VIEW: TAKE NEW PRE-ORDER FORM
  // ─────────────────────────────────────────────
  if (view === 'form') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-4 py-4 flex items-center justify-between shadow-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => { setView('list'); resetForm(); }} className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 transition-all">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-200">Village Sales</span>
              <h2 className="text-base font-black flex items-center gap-2"><Plus className="w-4 h-4 stroke-[3]" /> Take Customer Pre-Order</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAutofillPreOrder}
            className="py-1.5 px-3 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-900 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all uppercase tracking-wider"
            title="Autofill preorder with sample customer and 10-15 products"
          >
            <Sparkles className="w-3.5 h-3.5 fill-slate-900" />
            Autofill (10-15 Items)
          </button>
        </div>

        <form onSubmit={handleCreatePreOrder} className="p-4 space-y-4 max-w-lg mx-auto pb-24">
          {/* Customer Info */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Customer Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">Mobile *</label>
                <input
                  type="tel" required maxLength={10} placeholder="9876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-sm font-bold px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">Name *</label>
                <input
                  type="text" required placeholder="e.g. Ramesh"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full text-sm font-bold px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">Village / Locality *</label>
                <input
                  type="text" required placeholder="Village Name"
                  value={villageName}
                  onChange={(e) => setVillageName(e.target.value)}
                  className="w-full text-sm font-bold px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">Landmark / House #</label>
                <input
                  type="text" placeholder="Near temple / shop"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="w-full text-sm font-medium px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Delivery Schedule */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Delivery Schedule</p>
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">Expected Delivery Date *</label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(['tomorrow', 'day_after', 'custom'] as const).map(opt => (
                <button
                  key={opt} type="button"
                  onClick={() => setDeliveryDateOption(opt)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${deliveryDateOption === opt ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {opt === 'tomorrow' ? 'Tomorrow' : opt === 'day_after' ? 'Day After' : 'Custom Date'}
                </button>
              ))}
            </div>
            {deliveryDateOption === 'custom' && (
              <input
                type="date" min={tomorrowStr} value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full mb-3 text-sm font-bold px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            )}
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">Preferred Time Slot</label>
            <select
              value={deliverySlot} onChange={(e) => setDeliverySlot(e.target.value)}
              className="w-full text-sm font-bold px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option>Morning (8 AM - 12 PM)</option>
              <option>Afternoon (12 PM - 4 PM)</option>
              <option>Evening (4 PM - 8 PM)</option>
              <option>Anytime (8 AM - 7 PM)</option>
            </select>
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pre-Order Products</p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleAutofillPreOrder}
                  className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-black text-[11px] flex items-center gap-1 transition-all"
                  title="Autofill with 10-15 items"
                >
                  <Sparkles className="w-3 h-3 text-amber-700" />
                  Autofill 10-15 Items
                </button>
                <div className="flex bg-slate-100 rounded-lg p-0.5 text-xs font-bold">
                  <button type="button" onClick={() => setItemMode('word_of_mouth')}
                    className={`px-2.5 py-1 rounded-md transition-all ${itemMode === 'word_of_mouth' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500'}`}>
                    Verbal List
                  </button>
                  <button type="button" onClick={() => setItemMode('catalog')}
                    className={`px-2.5 py-1 rounded-md transition-all ${itemMode === 'catalog' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500'}`}>
                    Catalog
                  </button>
                </div>
              </div>
            </div>

            {itemMode === 'word_of_mouth' ? (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">Customer's Word-of-Mouth Request *</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. 2 bags 25kg Sona Masoori Rice, 2L Sunflower Oil, 1kg Jaggery, 1 pack Surf Excel"
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    className="w-full text-sm font-medium p-2.5 rounded-xl border border-amber-200 bg-amber-50/30 focus:ring-2 focus:ring-amber-500 outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Estimated Total Amount (₹)</label>
                  <input
                    type="number" placeholder="e.g. 1500"
                    value={customEstimatedAmount}
                    onChange={(e) => setCustomEstimatedAmount(e.target.value)}
                    className="w-full text-sm font-black px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text" placeholder="Search product by name or SKU..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                {selectedCatalogItems.length > 0 && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
                    <p className="text-[10px] font-black uppercase text-emerald-800">Selected Items ({selectedCatalogItems.length}):</p>
                    {selectedCatalogItems.map((item, idx) => {
                      const itemKey = item.productId || `item_${idx}_${item.productName}`;
                      return (
                        <div key={itemKey} className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{item.productName}</span>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => handleUpdateCatalogQty(itemKey, -1)} className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 font-black flex items-center justify-center">−</button>
                            <span className="font-black w-6 text-center">{item.quantity}</span>
                            <button type="button" onClick={() => handleUpdateCatalogQty(itemKey, +1)} className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-black flex items-center justify-center">+</button>
                            <span className="font-black text-slate-900 w-16 text-right">₹{item.unitPrice * item.quantity}</span>
                          </div>
                        </div>
                      );
                    })}
                    <div className="pt-1.5 border-t border-emerald-200 flex justify-between font-black text-xs text-emerald-900">
                      <span>Catalog Subtotal:</span><span>₹{catalogSubtotal}</span>
                    </div>
                  </div>
                )}
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {loadingProducts ? (
                    <p className="text-xs text-center text-slate-400 py-4">Loading products...</p>
                  ) : filteredCatalog.map(prod => (
                    <div key={prod.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-emerald-300 cursor-pointer"
                      onClick={() => handleAddCatalogItem(prod)}>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{prod.name}</p>
                        <p className="text-[10px] text-slate-400">₹{prod.sellingPrice || prod.price}</p>
                      </div>
                      <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">+ Add</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Advance Payment */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Advance Payment (Optional)</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(['NONE', 'CASH', 'UPI'] as const).map(mode => (
                <button key={mode} type="button" onClick={() => setAdvanceMode(mode)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${advanceMode === mode
                    ? mode === 'NONE' ? 'bg-slate-600 text-white border-slate-600' : mode === 'CASH' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200'}`}>
                  {mode === 'NONE' ? 'No Advance' : mode === 'CASH' ? 'Cash Advance' : 'UPI Advance'}
                </button>
              ))}
            </div>
            {advanceMode !== 'NONE' && (
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Advance Amount Collected (₹)</label>
                <input
                  type="number" required min={1} placeholder="e.g. 500"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  className="w-full text-sm font-black px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            )}
          </div>

          {/* Total + Submit */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between sticky bottom-4 shadow-xl">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Estimated Total / Due</p>
              <p className="text-lg font-black text-amber-400">
                ₹{calculatedTotal} <span className="text-xs text-slate-300 font-semibold">(Due: ₹{Math.max(0, calculatedTotal - Number(advanceAmount || 0))})</span>
              </p>
            </div>
            <button
              type="submit" disabled={submitting}
              className="py-3 px-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
            >
              {submitting ? 'Booking...' : 'Confirm Pre-Order'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // VIEW: MAIN LIST
  // ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-4 pt-4 pb-6 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-200">Field Operations</span>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2"><ShoppingBag className="w-5 h-5" /> Pre-Orders</h1>
          </div>
          <button onClick={() => loadData(true)} disabled={refreshing} className="p-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Vehicle Context */}
        <div className="mt-3 bg-white/10 backdrop-blur-md rounded-2xl p-3 flex items-center justify-between border border-white/20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold">
              <Truck className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-100">Assigned Vehicle</p>
              <p className="text-sm font-black tracking-wide">{user?.assignedVehicle?.vehicleNumber || 'No Vehicle Linked'}</p>
            </div>
          </div>
          {todayPlan?.villageName && (
            <div className="text-right">
              <p className="text-[10px] text-emerald-200 font-bold uppercase">Today's Village</p>
              <p className="text-xs font-black bg-emerald-800/60 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-emerald-300" /> {todayPlan.villageName}
              </p>
            </div>
          )}
        </div>

        {/* Take Pre-Order CTA */}
        <button
          onClick={() => {
            if (todayPlan?.villageName && !villageName) setVillageName(todayPlan.villageName);
            setView('form');
          }}
          className="mt-4 w-full py-3.5 px-4 bg-amber-400 hover:bg-amber-300 text-slate-900 font-black rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 text-sm uppercase tracking-wider active:scale-[0.98] transition-all"
        >
          <Plus className="w-5 h-5 stroke-[3]" /> Take New Pre-Order
        </button>
      </div>

      {/* Tabs */}
      <div className="px-4 -mt-2">
        <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-slate-200 flex gap-1">
          {(['deliveries', 'my_bookings'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${activeTab === tab ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>
              {tab === 'deliveries' ? <><Truck className="w-4 h-4" /> Deliver Today ({deliveriesToday.length})</> : <><FileText className="w-4 h-4" /> Booked by Me ({myBookings.length})</>}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-500">Loading pre-orders...</p>
          </div>
        ) : activeTab === 'deliveries' ? (
          <div>
            {deliveriesToday.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm mt-2">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3"><Package className="w-7 h-7" /></div>
                <h3 className="font-black text-slate-800 text-base">No Deliveries Scheduled Today</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">No pre-orders assigned to vehicle {user?.assignedVehicle?.vehicleNumber || ''} for delivery today.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {deliveriesToday.map((order) => {
                  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.RECEIVED;
                  const isDelivered = order.status === 'DELIVERED';
                  const isCancelled = order.status === 'CANCELLED';
                  return (
                    <div key={order.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">{order.preOrderNumber}</span>
                          <h4 className="text-base font-black text-slate-900 mt-0.5">{order.customerName}</h4>
                          <a href={`tel:${order.customerMobile}`} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 mt-0.5">
                            <Phone className="w-3 h-3" /> {order.customerMobile}
                          </a>
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${status.bg} ${status.text} ${status.border}`}>{status.label}</span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 bg-slate-50 rounded-xl p-2.5 text-xs text-slate-700">
                        <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /><span className="truncate font-semibold">{order.villageName || 'Direct'}</span></div>
                        <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /><span className="truncate font-semibold">{order.deliverySlot || 'Anytime'}</span></div>
                      </div>

                      {order.customNotes && (
                        <div className="mt-3 text-xs bg-amber-50/60 rounded-xl p-2.5 border border-amber-100">
                          <p className="font-bold text-amber-900 flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-amber-600" /> Items:</p>
                          <p className="text-slate-700 mt-1 italic font-medium">"{order.customNotes}"</p>
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Total / Balance Due</p>
                          <p className="font-black text-slate-900 text-sm">₹{order.estimatedTotal} <span className="text-rose-600 font-bold text-xs">(Due: ₹{order.balanceAmount})</span></p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold text-slate-400">Advance Paid</p>
                          <p className="font-bold text-emerald-600 text-xs">₹{order.advanceAmount} ({order.advancePaymentMode || 'None'})</p>
                        </div>
                      </div>

                      {!isDelivered && !isCancelled && (
                        <div className="mt-3.5 grid grid-cols-2 gap-2">
                          {['RECEIVED', 'CONFIRMED', 'PACKED'].includes(order.status) ? (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'LOADED')}
                              disabled={updatingStatusId === order.id}
                              className="py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              {updatingStatusId === order.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <><Truck className="w-3.5 h-3.5" /> Mark Loaded</>
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'OUT_FOR_DELIVERY')}
                              disabled={updatingStatusId === order.id}
                              className="py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              {updatingStatusId === order.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <><ArrowRight className="w-3.5 h-3.5" /> Out for Delivery</>
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => { setDeliveryOrder(order); setDeliveryCollectedAmount(order.balanceAmount || 0); setView('complete'); }}
                            disabled={updatingStatusId === order.id}
                            className="py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Complete Delivery
                          </button>
                        </div>
                      )}

                      <div className="mt-2.5 flex items-center justify-between text-xs pt-2">
                        <button onClick={() => { setSelectedOrderDetails(order); setView('detail'); }} className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-0.5">
                          View Full Details <ChevronRight className="w-3 h-3" />
                        </button>
                        <button onClick={() => shareReceiptWhatsApp(order)} className="text-slate-500 hover:text-emerald-600 font-bold inline-flex items-center gap-1">
                          <Send className="w-3 h-3 text-emerald-600" /> Share WhatsApp
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3.5">
            {myBookings.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm mt-2">
                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3"><FileText className="w-7 h-7" /></div>
                <h3 className="font-black text-slate-800 text-base">No Bookings Yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">Tap 'Take New Pre-Order' above to record one.</p>
              </div>
            ) : (
              myBookings.map(order => {
                const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.RECEIVED;
                return (
                  <div key={order.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">{order.preOrderNumber}</span>
                        <h4 className="text-base font-black text-slate-900 mt-0.5">{order.customerName}</h4>
                        <p className="text-xs text-slate-500 font-medium">{order.customerMobile}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${status.bg} ${status.text} ${status.border}`}>{status.label}</span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl text-slate-700">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Target Delivery</p>
                        <p className="font-black text-slate-800">{new Date(order.deliveryDate).toLocaleDateString('en-IN')} ({order.villageName || 'Direct'})</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Est. Amount</p>
                        <p className="font-black text-emerald-700">₹{order.estimatedTotal}</p>
                      </div>
                    </div>

                    {order.customNotes && (
                      <p className="mt-2 text-xs bg-amber-50 text-amber-900 p-2 rounded-lg italic font-medium">"{order.customNotes}"</p>
                    )}

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <button onClick={() => { setSelectedOrderDetails(order); setView('detail'); }} className="text-emerald-700 font-bold hover:underline flex items-center gap-0.5">
                        View Slip <ChevronRight className="w-3 h-3" />
                      </button>
                      <button onClick={() => shareReceiptWhatsApp(order)} className="text-slate-600 font-bold flex items-center gap-1 hover:text-emerald-600">
                        <Send className="w-3 h-3 text-emerald-600" /> Share Slip
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
