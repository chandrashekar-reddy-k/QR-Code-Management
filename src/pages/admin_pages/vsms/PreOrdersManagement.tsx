// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  Package, MapPin, Phone, Clock, Loader2, RefreshCw, Search,
  Truck, User, CheckCircle2, Navigation, Wallet, Filter,
  Calendar, Hash, ArrowLeft, ChevronRight, CreditCard,
  ShoppingCart, RotateCcw, X, ArrowUpDown, Home, Plus,
  FileText, Printer, Send, AlertTriangle, Eye, Check, ChevronDown,
  ShoppingBag
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3004/api/v1' : '/api/v1';

const getAuthToken = () =>
  localStorage.getItem('partnerToken') ||
  localStorage.getItem('authToken') ||
  localStorage.getItem('token') ||
  sessionStorage.getItem('staffToken') || '';

const api = axios.create({ baseURL: API_BASE });
api.interceptors.request.use(cfg => {
  const t = getAuthToken();
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

// view: 'list' | 'detail' | 'create' | 'packing'
export default function PreOrdersManagement() {
  const [view, setView] = useState<'list' | 'detail' | 'create' | 'packing'>('list');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [preOrders, setPreOrders] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>({ bookedToday: 0, forTomorrow: 0, pendingFulfillment: 0, outForDelivery: 0, delivered: 0, totalRevenue: 0, advanceCollected: 0 });
  const [filterOptions, setFilterOptions] = useState<any>({ vehicles: [], routes: [] });

  // Filters
  const [activeQuickFilter, setActiveQuickFilter] = useState<'tomorrow' | 'today' | 'upcoming' | 'all'>('tomorrow');
  const [statusFilter, setStatusFilter] = useState('all');
  const [villageFilter, setVillageFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Detail view
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [assignTargetVehicle, setAssignTargetVehicle] = useState('');
  const [showAssignSection, setShowAssignSection] = useState(false);

  // Packing sheet
  const [packingData, setPackingData] = useState<any | null>(null);
  const [loadingPacking, setLoadingPacking] = useState(false);

  // Create form
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newVillage, setNewVillage] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newDeliveryDate, setNewDeliveryDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0];
  });
  const [newDeliverySlot, setNewDeliverySlot] = useState('Morning (8 AM - 12 PM)');
  const [newCustomNotes, setNewCustomNotes] = useState('');
  const [newEstimatedAmount, setNewEstimatedAmount] = useState('');
  const [newAdvanceAmount, setNewAdvanceAmount] = useState('0');
  const [newAdvanceMode, setNewAdvanceMode] = useState('NONE');
  const [submittingCreate, setSubmittingCreate] = useState(false);

  const fetchPreOrders = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const params: Record<string, any> = {
        filterType: activeQuickFilter,
        status: statusFilter,
        village: villageFilter,
        vehicleId: vehicleFilter,
        search
      };
      const [res, vehiclesRes] = await Promise.all([
        api.get('/vsms/pre-orders', { params }),
        api.get('/vsms/vehicles').catch(() => ({ data: { vehicles: [] } }))
      ]);
      if (res.data.success) {
        setPreOrders(res.data.preOrders || []);
        setKpis(res.data.kpis || {});
        setFilterOptions(prev => ({ ...prev, vehicles: vehiclesRes.data.vehicles || [] }));
      }
    } catch (err: any) {
      toast.error('Failed to load pre-orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeQuickFilter, statusFilter, villageFilter, vehicleFilter, search]);

  useEffect(() => { fetchPreOrders(); }, [fetchPreOrders]);

  const loadPackingSheet = async () => {
    setLoadingPacking(true);
    setView('packing');
    try {
      const res = await api.get('/vsms/pre-orders/packing-summary');
      if (res.data.success) setPackingData(res.data.summary);
    } catch { toast.error('Failed to load packing sheet'); }
    finally { setLoadingPacking(false); }
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      const res = await api.put(`/vsms/pre-orders/${orderId}/status`, { status });
      if (res.data.success) {
        toast.success(`Status updated to ${status}`);
        fetchPreOrders(true);
        if (selectedOrder?.id === orderId) setSelectedOrder(prev => ({ ...prev, status }));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Status update failed');
    }
  };

  const handleAssignVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTargetVehicle || !selectedOrder) return;
    try {
      const res = await api.put(`/vsms/pre-orders/${selectedOrder.id}/assign-vehicle`, { vehicleId: assignTargetVehicle });
      if (res.data.success) {
        toast.success('Vehicle assigned successfully');
        fetchPreOrders(true);
        setShowAssignSection(false);
        setSelectedOrder(prev => ({
          ...prev,
          assignedVehicleId: assignTargetVehicle,
          assignedVehicle: filterOptions.vehicles.find((v: any) => v.id === assignTargetVehicle) || prev.assignedVehicle
        }));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Vehicle assignment failed');
    }
  };

  const handleCreatePreOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCreate(true);
    try {
      const res = await api.post('/vsms/pre-orders', {
        customerMobile: newCustomerPhone,
        customerName: newCustomerName,
        villageName: newVillage,
        deliveryAddress: newAddress,
        deliveryDate: newDeliveryDate,
        deliverySlot: newDeliverySlot,
        customNotes: newCustomNotes,
        customEstimatedAmount: Number(newEstimatedAmount || 0),
        advanceAmount: Number(newAdvanceAmount || 0),
        advancePaymentMode: newAdvanceMode,
        source: 'PARTNER_PORTAL'
      });
      if (res.data.success) {
        toast.success('Pre-order created!');
        resetCreateForm();
        fetchPreOrders();
        setView('list');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create pre-order');
    } finally {
      setSubmittingCreate(false);
    }
  };

  const resetCreateForm = () => {
    setNewCustomerPhone(''); setNewCustomerName(''); setNewVillage(''); setNewAddress('');
    setNewCustomNotes(''); setNewEstimatedAmount(''); setNewAdvanceAmount('0'); setNewAdvanceMode('NONE');
  };

  const uniqueVillages = useMemo(() => {
    const set = new Set<string>();
    preOrders.forEach(po => { if (po.villageName) set.add(po.villageName); });
    return Array.from(set);
  }, [preOrders]);

  const shareWhatsApp = (order: any) => {
    const text = `*VillagKart Pre-Order Update*\n\n*Order #:* ${order.preOrderNumber}\n*Customer:* ${order.customerName}\n*Delivery Date:* ${new Date(order.deliveryDate).toLocaleDateString('en-IN')}\n*Estimated Total:* ₹${order.estimatedTotal}\n*Status:* ${order.status}\n*Items:* ${order.customNotes || 'Catalog Products'}`;
    window.open(`https://wa.me/91${order.customerMobile}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // ─────────────────────────────────────────────
  // VIEW: ORDER DETAIL
  // ─────────────────────────────────────────────
  if (view === 'detail' && selectedOrder) {
    const order = selectedOrder;
    const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.RECEIVED;
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center gap-3 shadow-md sticky top-0 z-10">
          <button onClick={() => { setView('list'); setShowAssignSection(false); }} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Pre-Order Details</p>
            <h2 className="text-lg font-black">{order.preOrderNumber}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => shareWhatsApp(order)} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1">
              <Send className="w-3.5 h-3.5" /> Share
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto p-6 space-y-5">
          {/* Status & Change */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Current Status</p>
                <span className={`inline-flex mt-1 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${status.bg} ${status.text} ${status.border}`}>{status.label}</span>
              </div>
              <div className="flex flex-col items-end gap-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Change Status</p>
                <select
                  value={order.status}
                  onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="RECEIVED">Received</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="PACKED">Packed in Hub</option>
                  <option value="LOADED">Loaded on Vehicle</option>
                  <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2 text-sm">
            <p className="text-[10px] uppercase font-bold text-slate-400">Customer Profile</p>
            <p className="text-base font-black text-slate-900">{order.customerName}</p>
            <a href={`tel:${order.customerMobile}`} className="font-bold text-emerald-700 flex items-center gap-1 text-sm">
              <Phone className="w-3.5 h-3.5" /> {order.customerMobile}
            </a>
            <p className="text-slate-600 font-medium">{order.villageName || 'Direct'} {order.landmark ? `(${order.landmark})` : ''}</p>
            {order.deliveryAddress && <p className="text-slate-500 text-xs">{order.deliveryAddress}</p>}
          </div>

          {/* Delivery Logistics */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3 text-sm">
            <p className="text-[10px] uppercase font-bold text-emerald-800">Target Delivery Schedule</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-slate-500 font-medium text-xs">Delivery Date:</p>
                <p className="font-black text-slate-900">{new Date(order.deliveryDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</p>
              </div>
              <div>
                <p className="text-slate-500 font-medium text-xs">Slot:</p>
                <p className="font-black text-slate-900">{order.deliverySlot || 'Anytime'}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-emerald-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 font-medium text-xs">Assigned Vehicle:</p>
                  <p className="font-bold text-slate-900">{order.assignedVehicle?.vehicleNumber || 'Unassigned'}</p>
                </div>
                <button
                  onClick={() => { setShowAssignSection(!showAssignSection); setAssignTargetVehicle(order.assignedVehicleId || ''); }}
                  className="text-xs font-bold text-emerald-700 hover:underline px-3 py-1.5 bg-emerald-100 rounded-lg"
                >
                  {showAssignSection ? 'Cancel' : 'Change Vehicle'}
                </button>
              </div>

              {showAssignSection && (
                <form onSubmit={handleAssignVehicle} className="mt-3 space-y-2">
                  <p className="text-xs text-slate-600 font-medium">Select vehicle for delivery to <b>{order.villageName || 'customer'}</b> on <b>{new Date(order.deliveryDate).toLocaleDateString('en-IN')}</b>:</p>
                  <select
                    value={assignTargetVehicle}
                    onChange={(e) => setAssignTargetVehicle(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-emerald-300 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">-- Select Vehicle --</option>
                    {filterOptions.vehicles?.map((v: any) => (
                      <option key={v.id} value={v.id}>{v.vehicleNumber} ({v.vehicleName || 'Vehicle'})</option>
                    ))}
                  </select>
                  <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs">
                    Save Assignment
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Word-of-Mouth Notes */}
          {order.customNotes && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <p className="text-[10px] uppercase font-bold text-amber-800 mb-1">Customer's Word-of-Mouth List</p>
              <p className="text-slate-800 text-sm italic font-medium leading-relaxed">"{order.customNotes}"</p>
            </div>
          )}

          {/* Catalog Items */}
          {order.items?.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-3">Catalog Line Items</p>
              <div className="divide-y divide-slate-100">
                {order.items.map((it: any) => (
                  <div key={it.id} className="py-2.5 flex justify-between items-center text-sm">
                    <div>
                      <p className="font-bold text-slate-800">{it.productName}</p>
                      <p className="text-xs text-slate-400">Qty: {it.quantity} × ₹{it.unitPrice}</p>
                    </div>
                    <p className="font-black text-slate-900">₹{it.totalPrice}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financials */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Estimated Total:</span><span className="font-bold">₹{order.estimatedTotal}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Advance Paid ({order.advancePaymentMode || 'None'}):</span><span className="font-bold text-emerald-400">₹{order.advanceAmount}</span></div>
            <div className="pt-2 border-t border-slate-800 flex justify-between text-base font-black">
              <span className="text-amber-300">Balance on Delivery:</span>
              <span className="text-amber-400">₹{order.balanceAmount}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // VIEW: CREATE PRE-ORDER
  // ─────────────────────────────────────────────
  if (view === 'create') {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-emerald-700 text-white px-6 py-4 flex items-center gap-3 shadow-md sticky top-0 z-10">
          <button onClick={() => { setView('list'); resetCreateForm(); }} className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200">Partner Booking</p>
            <h2 className="text-lg font-black flex items-center gap-2"><Plus className="w-5 h-5 stroke-[3]" /> Create Customer Pre-Order</h2>
          </div>
        </div>

        <form onSubmit={handleCreatePreOrder} className="max-w-xl mx-auto p-6 space-y-5">
          {/* Customer Details */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Customer Details</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">Mobile *</label>
                <input type="tel" required maxLength={10} placeholder="9876543210"
                  value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-sm font-bold px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">Name *</label>
                <input type="text" required placeholder="e.g. Anand"
                  value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full text-sm font-bold px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">Village *</label>
                <input type="text" required placeholder="Village Name"
                  value={newVillage} onChange={(e) => setNewVillage(e.target.value)}
                  className="w-full text-sm font-bold px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">Address</label>
                <input type="text" placeholder="Delivery address"
                  value={newAddress} onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full text-sm font-medium px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
            </div>
          </div>

          {/* Delivery Schedule */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Delivery Schedule</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">Delivery Date *</label>
                <input type="date" required value={newDeliveryDate} onChange={(e) => setNewDeliveryDate(e.target.value)}
                  className="w-full text-sm font-bold px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">Time Slot</label>
                <select value={newDeliverySlot} onChange={(e) => setNewDeliverySlot(e.target.value)}
                  className="w-full text-sm font-bold px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
                  <option>Morning (8 AM - 12 PM)</option>
                  <option>Afternoon (12 PM - 4 PM)</option>
                  <option>Evening (4 PM - 8 PM)</option>
                  <option>Anytime (8 AM - 7 PM)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Customer Request */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Customer Request</p>
            <div>
              <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">Items / Custom Request *</label>
              <textarea rows={3} required placeholder="e.g. 5kg Toor Dal, 2 tins oil, 2 bags Rice"
                value={newCustomNotes} onChange={(e) => setNewCustomNotes(e.target.value)}
                className="w-full text-sm font-medium p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
          </div>

          {/* Financials */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Financials</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">Estimated Total (₹)</label>
                <input type="number" placeholder="1200"
                  value={newEstimatedAmount} onChange={(e) => setNewEstimatedAmount(e.target.value)}
                  className="w-full text-sm font-black px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">Advance Collected (₹)</label>
                <input type="number" placeholder="0"
                  value={newAdvanceAmount} onChange={(e) => setNewAdvanceAmount(e.target.value)}
                  className="w-full text-sm font-black px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">Advance Payment Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {['NONE', 'CASH', 'UPI'].map(mode => (
                  <button key={mode} type="button" onClick={() => setNewAdvanceMode(mode)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${newAdvanceMode === mode ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button type="submit" disabled={submittingCreate}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-all">
            {submittingCreate ? 'Saving...' : 'Book Pre-Order'}
          </button>
        </form>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // VIEW: PACKING & LOADING SHEET
  // ─────────────────────────────────────────────
  if (view === 'packing') {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center gap-3 shadow-md sticky top-0 z-10 print:hidden">
          <button onClick={() => setView('list')} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 flex items-center gap-3">
            <Printer className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Warehouse Operations</p>
              <h2 className="text-base font-black">Consolidated Packing & Loading Sheet</h2>
            </div>
          </div>
          <button onClick={() => window.print()} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Print Sheet
          </button>
        </div>

        <div className="max-w-4xl mx-auto p-6 space-y-6 text-xs">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm print:shadow-none">
            <p className="text-sm font-black text-slate-700">Tomorrow's Pre-Orders — Grouped by Vehicle & Village</p>
            <p className="text-slate-400 font-medium text-xs mt-0.5">Generated on {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          {loadingPacking ? (
            <div className="py-20 text-center">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-500">Generating packing sheet...</p>
            </div>
          ) : !packingData || packingData.vehicles?.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-bold">No pre-orders scheduled for packing tomorrow.</p>
            </div>
          ) : (
            packingData.vehicles.map((vg: any) => (
              <div key={vg.vehicleId} className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                <div className="bg-slate-100 px-5 py-4 flex items-center justify-between border-b border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500">Vehicle Loading Unit</span>
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 mt-0.5">
                      <Truck className="w-4 h-4 text-emerald-600" /> {vg.vehicleNumber} ({vg.vehicleName || 'Vehicle'})
                    </h4>
                    <p className="text-[11px] font-semibold text-slate-600">Route: {vg.routeName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-900 text-sm">{vg.totalOrders} Orders</p>
                    <p className="text-[11px] font-bold text-emerald-700">Total: ₹{vg.totalValue}</p>
                  </div>
                </div>

                <div className="p-4 bg-amber-50/40 border-b border-slate-200">
                  <p className="text-[10px] font-black uppercase text-amber-900 mb-2">Total Items to Load:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {vg.productTotals?.map((pt: any, idx: number) => (
                      <div key={idx} className="bg-white p-2 rounded-lg border border-amber-200 flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-800 truncate mr-2">{pt.productName}</span>
                        <span className="font-black text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">{pt.quantity} {pt.unit || ''}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {vg.villages?.map((v: any, vIdx: number) => (
                    <div key={vIdx} className="bg-slate-50 p-3 rounded-xl">
                      <p className="font-black text-slate-900 text-xs flex items-center gap-1 mb-2">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Village: {v.villageName} ({v.orders?.length} Pre-orders)
                      </p>
                      <div className="space-y-2">
                        {v.orders?.map((o: any) => (
                          <div key={o.id} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs flex justify-between items-start">
                            <div>
                              <p className="font-bold text-slate-900">{o.customerName} ({o.customerMobile})</p>
                              {o.customNotes && <p className="text-[11px] text-slate-600 italic">"{o.customNotes}"</p>}
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{o.preOrderNumber}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-slate-900">₹{o.estimatedTotal}</p>
                              <p className="text-[10px] text-rose-600 font-bold">Due: ₹{o.balanceAmount}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // VIEW: MAIN LIST
  // ─────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">
            <ShoppingBag className="w-4 h-4" /> Village Sales & Pre-Orders
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Pre-Orders Management</h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Track village customer pre-orders, assign vehicles, and generate loading sheets.</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadPackingSheet()}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4 text-slate-500" /> Packing & Loading Sheet
          </button>
          <button
            onClick={() => setView('create')}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Create Pre-Order
          </button>
          <button onClick={() => fetchPreOrders(true)} disabled={refreshing} className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-6">
        {[
          { label: 'Booked Today', value: kpis.bookedToday || 0, color: 'text-slate-900', border: 'border-slate-200' },
          { label: 'Delivery Tomorrow', value: kpis.forTomorrow || 0, color: 'text-blue-700', border: 'border-blue-200' },
          { label: 'Pending Packing', value: kpis.pendingFulfillment || 0, color: 'text-purple-700', border: 'border-purple-200' },
          { label: 'Out for Delivery', value: kpis.outForDelivery || 0, color: 'text-indigo-700', border: 'border-indigo-200' },
          { label: 'Delivered', value: kpis.delivered || 0, color: 'text-emerald-700', border: 'border-emerald-200' },
        ].map(kpi => (
          <div key={kpi.label} className={`bg-white p-4 rounded-2xl border ${kpi.border} shadow-sm`}>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
            <p className={`text-2xl font-black mt-1 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm">
          <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Total Value / Adv.</p>
          <p className="text-lg font-black text-slate-900 mt-1">₹{kpis.totalRevenue || 0}<span className="block text-[10px] text-emerald-600 font-bold">Adv: ₹{kpis.advanceCollected || 0}</span></p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold w-fit">
            {[
              { key: 'tomorrow', label: `Tomorrow's Deliveries (${kpis.forTomorrow})` },
              { key: 'today', label: "Today's Deliveries" },
              { key: 'upcoming', label: 'All Upcoming' },
              { key: 'all', label: 'All Pre-Orders' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setActiveQuickFilter(key as any)}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${activeQuickFilter === key ? 'bg-white shadow-sm text-emerald-700 font-black' : 'text-slate-600 hover:text-slate-900'}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input type="text" placeholder="Search by pre-order #, customer, mobile, village..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white">
              <option value="all">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Village</label>
            <select value={villageFilter} onChange={(e) => setVillageFilter(e.target.value)}
              className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white">
              <option value="all">All Villages</option>
              {uniqueVillages.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Vehicle</label>
            <select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)}
              className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white">
              <option value="all">All Vehicles</option>
              {filterOptions.vehicles?.map((v: any) => <option key={v.id} value={v.id}>{v.vehicleNumber}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => { setStatusFilter('all'); setVillageFilter('all'); setVehicleFilter('all'); setSearch(''); }}
              className="w-full py-1.5 px-3 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold">
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-500">Loading pre-orders...</p>
          </div>
        ) : preOrders.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3"><ShoppingBag className="w-7 h-7" /></div>
            <h3 className="font-bold text-slate-800 text-base">No Pre-Orders Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">No customer pre-orders match the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3.5">Pre-Order #</th>
                  <th className="px-4 py-3.5">Customer & Village</th>
                  <th className="px-4 py-3.5">Delivery Target</th>
                  <th className="px-4 py-3.5">Items / Request</th>
                  <th className="px-4 py-3.5">Financials</th>
                  <th className="px-4 py-3.5">Assigned Vehicle</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preOrders.map(order => {
                  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.RECEIVED;
                  return (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-mono font-bold text-slate-700">{order.preOrderNumber}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{order.source}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-900">{order.customerName}</p>
                        <p className="text-slate-500 font-medium">{order.customerMobile}</p>
                        {order.villageName && <p className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5"><MapPin className="w-2.5 h-2.5" />{order.villageName}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-900">{new Date(order.deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                        <p className="text-slate-400 text-[10px]">{order.deliverySlot || 'Anytime'}</p>
                      </td>
                      <td className="px-4 py-3.5 max-w-[160px]">
                        {order.customNotes && <p className="text-slate-600 italic truncate">"{order.customNotes}"</p>}
                        {order.items?.length > 0 && <p className="text-[10px] text-slate-400 mt-0.5">{order.items.length} catalog item{order.items.length > 1 ? 's' : ''}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-black text-slate-900">₹{order.estimatedTotal}</p>
                        <p className="text-[10px] text-emerald-600 font-bold">Adv: ₹{order.advanceAmount}</p>
                        <p className="text-[10px] text-rose-600 font-bold">Due: ₹{order.balanceAmount}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        {order.assignedVehicle ? (
                          <span className="font-bold text-slate-800">{order.assignedVehicle.vehicleNumber}</span>
                        ) : (
                          <button
                            onClick={() => { setSelectedOrder(order); setAssignTargetVehicle(''); setShowAssignSection(true); setView('detail'); }}
                            className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold hover:bg-amber-100"
                          >
                            + Assign Vehicle
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${status.bg} ${status.text} ${status.border}`}>{status.label}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => { setSelectedOrder(order); setShowAssignSection(false); setView('detail'); }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600" title="View Details">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => shareWhatsApp(order)} className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700" title="Share WhatsApp">
                            <Send className="w-4 h-4" />
                          </button>
                          {order.status === 'RECEIVED' && (
                            <button onClick={() => handleUpdateStatus(order.id, 'CONFIRMED')} className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[11px]">Confirm</button>
                          )}
                          {order.status === 'CONFIRMED' && (
                            <button onClick={() => handleUpdateStatus(order.id, 'PACKED')} className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-[11px]">Mark Packed</button>
                          )}
                          {order.status === 'PACKED' && (
                            <button onClick={() => handleUpdateStatus(order.id, 'LOADED')} className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg text-[11px]">Mark Loaded</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
