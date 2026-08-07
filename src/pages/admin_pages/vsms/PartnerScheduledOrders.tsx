// @ts-nocheck
import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  Package, MapPin, Phone, Clock, Loader2, RefreshCw, Search,
  Truck, User, CheckCircle, Navigation, Wallet, Filter,
  Calendar, Hash, ArrowLeft, ChevronRight, CreditCard,
  ShoppingCart, RotateCcw, X, ArrowUpDown, Home
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3004/api/v1' : '/api/v1';

const getToken = () =>
  localStorage.getItem('partnerToken') ||
  localStorage.getItem('authToken') ||
  localStorage.getItem('token') ||
  sessionStorage.getItem('staffToken') || '';

const api = axios.create({ baseURL: API_BASE });
api.interceptors.request.use(cfg => {
  const t = getToken();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  CONFIRMED:        { label: 'Confirmed',        bg: 'bg-blue-100',    text: 'text-blue-700' },
  PROCESSING:       { label: 'Processing',        bg: 'bg-yellow-100',  text: 'text-yellow-700' },
  READY_FOR_PICKUP: { label: 'Ready',             bg: 'bg-purple-100',  text: 'text-purple-700' },
  ASSIGNED:         { label: 'Assigned',          bg: 'bg-indigo-100',  text: 'text-indigo-700' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery',  bg: 'bg-orange-100',  text: 'text-orange-700' },
  DELIVERED:        { label: 'Delivered',         bg: 'bg-green-100',   text: 'text-green-700'  },
  CANCELLED:        { label: 'Cancelled',         bg: 'bg-red-100',     text: 'text-red-700'    },
  FAILED:           { label: 'Failed',            bg: 'bg-red-100',     text: 'text-red-700'    },
  RETURNED:         { label: 'Returned',          bg: 'bg-gray-100',    text: 'text-gray-600'   },
};

function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${m.bg} ${m.text}`}>
      {m.label}
    </span>
  );
}

function PaymentPill({ order }: { order: any }) {
  const isCOD = order.paymentMethod?.toUpperCase() === 'COD' ||
    order.paymentMode?.toUpperCase() === 'COD' ||
    order.paymentMode === 'CASH';
  return isCOD
    ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">COD</span>
    : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Prepaid</span>;
}

function Avatar({ name }: { name: string }) {
  const letter = (name || '?')[0].toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 text-sm font-bold flex-shrink-0 bg-gray-200">
      {letter}
    </div>
  );
}

// ─── Stat Card (matches screenshot style) ────────────────────────────────────
function StatCard({ label, value, icon, iconBg }: { label: string; value: string | number; icon: React.ReactNode; iconBg: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between shadow-sm">
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
        {icon}
      </div>
    </div>
  );
}

// ─── Sort Header ─────────────────────────────────────────────────────────────
function SortTh({ label, field, sort, onSort }: any) {
  const active = sort.field === field;
  return (
    <th
      onClick={() => onSort(field)}
      className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 group"
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 transition-colors ${active ? 'text-green-600' : 'text-gray-300 group-hover:text-gray-400'}`} />
      </span>
    </th>
  );
}

// ─── Detail InfoRow ───────────────────────────────────────────────────────────
function InfoRow({ label, value, icon: Icon }: any) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      {Icon && <Icon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" strokeWidth={1.8} />}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-semibold text-gray-800 mt-0.5">{value || '—'}</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PartnerScheduledOrders() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [routeFilter, setRouteFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ field: 'orderNumber', dir: 'asc' });

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await api.get('/vsms/agent-routes/scheduled-deliveries');
      if (res.data.success) {
        setAssignments(res.data.assignments || []);
        setDeliveries(res.data.deliveries || []);
      } else {
        toast.error(res.data.message || 'Failed to load');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error loading data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, []);

  const isCOD = (o: any) =>
    o.paymentMethod?.toUpperCase() === 'COD' ||
    o.paymentMode?.toUpperCase() === 'COD' ||
    o.paymentMode === 'CASH';

  const getAssignment = (o: any) => assignments.find(a => a.route?.id === o.routeId);

  // Stats
  const total = deliveries.length;
  const delivered = deliveries.filter(o => o.status === 'DELIVERED').length;
  const active = deliveries.filter(o => !['DELIVERED','CANCELLED','FAILED','RETURNED'].includes(o.status)).length;
  const failed = deliveries.filter(o => ['CANCELLED','FAILED','RETURNED'].includes(o.status)).length;

  const handleSort = (field: string) => {
    setSort(s => ({ field, dir: s.field === field && s.dir === 'asc' ? 'desc' : 'asc' }));
  };

  const filtered = useMemo(() => {
    let list = [...deliveries];

    if (routeFilter !== 'all') {
      const a = assignments.find(a => a.id === routeFilter);
      list = list.filter(o => o.routeId === a?.route?.id);
    }
    if (statusFilter !== 'all') list = list.filter(o => o.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(o => {
        const name = (o.customer?.name || o.consumer?.name || '').toLowerCase();
        const phone = (o.customer?.mobile || o.consumer?.phone || '').toLowerCase();
        const addr = `${o.address?.city || ''} ${o.address?.mandal || ''}`.toLowerCase();
        const num = (o.orderNumber || '').toLowerCase();
        return name.includes(q) || phone.includes(q) || addr.includes(q) || num.includes(q);
      });
    }

    list.sort((a, b) => {
      let va: any, vb: any;
      if (sort.field === 'orderNumber') { va = a.orderNumber; vb = b.orderNumber; }
      else if (sort.field === 'customer') { va = a.customer?.name || a.consumer?.name || ''; vb = b.customer?.name || b.consumer?.name || ''; }
      else if (sort.field === 'status') { va = a.status; vb = b.status; }
      else if (sort.field === 'amount') { va = parseFloat(a.totalAmount); vb = parseFloat(b.totalAmount); }
      else if (sort.field === 'slot') { va = a.deliverySlot; vb = b.deliverySlot; }
      else { va = a.deliveryDate; vb = b.deliveryDate; }
      if (va < vb) return sort.dir === 'asc' ? -1 : 1;
      if (va > vb) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [deliveries, assignments, routeFilter, statusFilter, search, sort]);

  const resetFilters = () => { setRouteFilter('all'); setStatusFilter('all'); setSearch(''); };
  const hasFilter = routeFilter !== 'all' || statusFilter !== 'all' || search !== '';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin text-green-600" />
        <span className="text-sm font-semibold">Loading scheduled orders…</span>
      </div>
    );
  }

  // ─── DETAIL PAGE ─────────────────────────────────────────────────────────────
  if (selectedOrder) {
    const o = selectedOrder;
    const assignment = getAssignment(o);
    const custName = o.customer?.name || o.consumer?.name || 'Customer';
    const custPhone = o.customer?.mobile || o.consumer?.phone;
    const cod = isCOD(o);
    const sm = STATUS_META[o.status] || { label: o.status, bg: 'bg-gray-100', text: 'text-gray-600' };

    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Order Detail</h1>
            <nav className="flex items-center gap-1.5 text-sm mt-1 text-gray-500">
              <span>Home</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span>Scheduled Deliveries</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-green-600 font-semibold">{o.orderNumber}</span>
            </nav>
          </div>
          <button
            onClick={() => setSelectedOrder(null)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-lg shadow-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to List
          </button>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Order Amount" value={`₹${parseFloat(o.totalAmount || 0).toLocaleString('en-IN')}`}
            icon={<ShoppingCart className="w-6 h-6 text-purple-500" />} iconBg="bg-purple-50" />
          <StatCard label="Total Items" value={o.items?.length || 0}
            icon={<Package className="w-6 h-6 text-amber-500" />} iconBg="bg-amber-50" />
          <StatCard label="Payment Mode" value={cod ? 'COD' : 'Prepaid'}
            icon={<Wallet className="w-6 h-6 text-green-500" />} iconBg="bg-green-50" />
          <StatCard label="Status" value={sm.label}
            icon={<CheckCircle className="w-6 h-6 text-blue-500" />} iconBg="bg-blue-50" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Customer Info */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-700">Customer Info</h3>
              <User className="w-4 h-4 text-gray-400" />
            </div>
            <div className="px-5 py-2">
              <div className="flex items-center gap-3 py-3 border-b border-gray-100">
                <Avatar name={custName} />
                <div>
                  <p className="text-sm font-bold text-gray-800">{custName}</p>
                  {custPhone && <p className="text-xs text-orange-500 font-semibold">{custPhone}</p>}
                </div>
              </div>
              {custPhone && (
                <div className="py-3">
                  <a href={`tel:${custPhone}`}
                    className="flex items-center justify-center gap-2 w-full py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors">
                    <Phone className="w-3.5 h-3.5" /> Call Customer
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Info */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-700">Delivery Info</h3>
              <Clock className="w-4 h-4 text-gray-400" />
            </div>
            <div className="px-5 divide-y divide-gray-100">
              <InfoRow label="Delivery Slot" value={o.deliverySlot || '—'} icon={Clock} />
              <InfoRow label="Delivery Date" value={o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} icon={Calendar} />
              <InfoRow label="Status" value={<StatusPill status={o.status} />} />
            </div>
          </div>

          {/* Route & Agent */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-700">Route & Agent</h3>
              <Navigation className="w-4 h-4 text-gray-400" />
            </div>
            <div className="px-5 divide-y divide-gray-100">
              <InfoRow label="Route" value={o.route?.routeName || assignment?.route?.routeName || 'Not assigned'} icon={MapPin} />
              <InfoRow label="Agent" value={assignment?.agent?.name || 'Unassigned'} icon={User} />
              <InfoRow label="Vehicle" value={assignment?.vehicle?.vehicleNumber ? `${assignment.vehicle.vehicleNumber}${assignment.vehicle.vehicleName ? ` (${assignment.vehicle.vehicleName})` : ''}` : '—'} icon={Truck} />
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700">Delivery Address</h3>
            <MapPin className="w-4 h-4 text-gray-400" />
          </div>
          <div className="px-5 py-4 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-green-600" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {o.address?.line1}{o.address?.line2 ? `, ${o.address.line2}` : ''}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                {o.address?.city}, {o.address?.state} — {o.address?.pincode}
              </p>
              {o.address?.mandal && (
                <span className="inline-block mt-2 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full">
                  Mandal: {o.address.mandal}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Order Items Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700">Order Items</h3>
            <span className="text-xs text-gray-400 font-semibold">{o.items?.length || 0} items</span>
          </div>
          {o.items?.length > 0 ? (
            <>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Product</th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Qty</th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Unit Price</th>
                    <th className="px-5 py-3 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wider">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {o.items.map((item: any, i: number) => (
                    <tr key={item.id || i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                            <Package className="w-4.5 h-4.5 text-gray-400" strokeWidth={1.5} />
                          </div>
                          <span className="text-sm font-semibold text-gray-800">
                            {item.productName || item.product?.name || 'Unknown Product'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-gray-700">{item.quantity}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-gray-700">₹{item.price || item.unitPrice || '—'}</td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-sm font-bold text-gray-900">
                          ₹{((parseFloat(item.price || item.unitPrice || 0)) * item.quantity).toLocaleString('en-IN')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t border-gray-200">
                    <td colSpan={3} className="px-5 py-3.5 text-sm font-bold text-gray-600 uppercase tracking-wider">Total</td>
                    <td className="px-5 py-3.5 text-right text-base font-black text-gray-900">
                      ₹{parseFloat(o.totalAmount || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </>
          ) : (
            <div className="py-10 text-center text-gray-400">
              <Package className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">No items found</p>
            </div>
          )}
        </div>

        {/* COD Notice */}
        {cod && !['DELIVERED','CANCELLED','FAILED','RETURNED'].includes(o.status) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Wallet className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-800">Cash Collection Required</p>
              <p className="text-sm text-amber-700 mt-0.5">
                Agent must collect <strong>₹{parseFloat(o.totalAmount || 0).toLocaleString('en-IN')}</strong> from the customer upon delivery.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── LIST PAGE ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Scheduled Deliveries</h1>
          <nav className="flex items-center gap-1.5 text-sm mt-1 text-gray-500">
            <span>Home</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Route Management</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-green-600 font-semibold">Scheduled Deliveries</span>
          </nav>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards — matches screenshot layout */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Orders" value={total}
          icon={<Hash className="w-6 h-6 text-purple-500" />} iconBg="bg-purple-50" />
        <StatCard label="Active / Pending" value={active}
          icon={<Package className="w-6 h-6 text-amber-500" />} iconBg="bg-amber-50" />
        <StatCard label="Delivered" value={delivered}
          icon={<CheckCircle className="w-6 h-6 text-green-500" />} iconBg="bg-green-50" />
        <StatCard label="Failed / Cancelled" value={failed}
          icon={<RotateCcw className="w-6 h-6 text-red-400" />} iconBg="bg-red-50" />
      </div>

      {/* Filter Bar — matches screenshot */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 text-gray-500">
          <Filter className="w-4 h-4" />
        </div>

        {/* Route Filter */}
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
          <select
            value={routeFilter}
            onChange={e => setRouteFilter(e.target.value)}
            className="text-sm text-gray-700 font-medium focus:outline-none bg-transparent pr-2"
          >
            <option value="all">Route</option>
            {assignments.map(a => (
              <option key={a.id} value={a.id}>
                {a.route?.routeName}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-sm text-gray-700 font-medium focus:outline-none bg-transparent pr-2"
          >
            <option value="all">Status</option>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Reset */}
        {hasFilter && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Filter
          </button>
        )}

        {/* Search — pushed right */}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-9 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-400 w-56 bg-white"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-500">No orders found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <SortTh label="ID" field="orderNumber" sort={sort} onSort={handleSort} />
                  <SortTh label="Customer" field="customer" sort={sort} onSort={handleSort} />
                  <SortTh label="Address" field="address" sort={sort} onSort={handleSort} />
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Route / Agent</th>
                  <SortTh label="Slot" field="slot" sort={sort} onSort={handleSort} />
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Payment</th>
                  <SortTh label="Amount" field="amount" sort={sort} onSort={handleSort} />
                  <SortTh label="Status" field="status" sort={sort} onSort={handleSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((order, idx) => {
                  const assignment = getAssignment(order);
                  const custName = order.customer?.name || order.consumer?.name || 'Customer';
                  const custPhone = order.customer?.mobile || order.consumer?.phone;
                  const shortId = (order.id || '').substring(0, 8) + '...';

                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors group"
                    >
                      {/* ID */}
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-gray-600 font-medium">{shortId}</span>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={custName} />
                          <div>
                            <p className="text-sm font-semibold text-blue-600 group-hover:text-blue-700">{custName}</p>
                            {custPhone && (
                              <p className="text-xs text-orange-500 font-medium">{custPhone}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Address */}
                      <td className="px-4 py-3.5 max-w-[160px]">
                        <p className="text-sm text-gray-700 font-medium truncate">{order.address?.city || '—'}</p>
                        {order.address?.mandal && (
                          <p className="text-xs text-gray-400 truncate">{order.address.mandal}</p>
                        )}
                      </td>

                      {/* Route / Agent */}
                      <td className="px-4 py-3.5">
                        {assignment ? (
                          <div>
                            <p className="text-sm font-semibold text-gray-700">
                              {assignment.route?.routeName || order.route?.routeName || '—'}
                            </p>
                            <p className="text-xs text-gray-400">{assignment.agent?.name || 'Unassigned'}</p>
                          </div>
                        ) : order.route?.routeName ? (
                          <div>
                            <p className="text-sm font-semibold text-gray-700">{order.route.routeName}</p>
                            <p className="text-xs text-gray-400 italic">No agent assigned</p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Not assigned</span>
                        )}
                      </td>

                      {/* Slot */}
                      <td className="px-4 py-3.5">
                        <p className="text-sm text-gray-700 font-medium">{order.deliverySlot || '—'}</p>
                        {order.deliveryDate && (
                          <p className="text-xs text-gray-400">
                            {new Date(order.deliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                      </td>

                      {/* Payment */}
                      <td className="px-4 py-3.5">
                        <PaymentPill order={order} />
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-bold text-gray-900">
                          ₹{parseFloat(order.totalAmount || 0).toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <StatusPill status={order.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer */}
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Showing <span className="font-semibold text-gray-700">{filtered.length}</span> of <span className="font-semibold text-gray-700">{deliveries.length}</span> orders
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
