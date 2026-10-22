// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, MapPin, Phone, Clock, Loader2, RefreshCw, 
  Search, ChevronRight, ShoppingBag, User, CheckCircle2, 
  Smartphone, Navigation, Calendar, X, AlertCircle, ArrowRight,
  Eye, Truck, Check, Store, ShieldAlert
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getAgentAppOrders, updateAgentOrderStatus } from '../services/routeOrderService';

export default function RouteAppOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') === 'processed') ? 'processed' : 'app_orders';

  const [activeTab, setActiveTab] = useState<'app_orders' | 'processed'>(initialTab);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [vehicle, setVehicle] = useState<any>(null);
  const [counts, setCounts] = useState({ appOrders: 0, processed: 0 });
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, totalPages: 1 });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');

  // Modals & Action loading
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Sync tab with URL search parameter
  const switchTab = (tab: 'app_orders' | 'processed') => {
    setActiveTab(tab);
    setStatusFilter('ALL');
    setSearchParams(tab === 'processed' ? { tab: 'processed' } : {});
  };

  const fetchOrders = useCallback(async (isSilentRefresh = false) => {
    if (isSilentRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await getAgentAppOrders({
        tab: activeTab,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchTerm.trim() || undefined,
        date: dateFilter || undefined,
        page: pagination.page,
        limit: pagination.limit
      });

      if (res.success) {
        setOrders(res.orders || []);
        setVehicle(res.vehicle || null);
        setCounts(res.counts || { appOrders: 0, processed: 0 });
        setPagination(res.pagination || { total: 0, page: 1, limit: 50, totalPages: 1 });
      } else {
        toast.error(res.message || 'Failed to load app orders');
      }
    } catch (err: any) {
      console.error('[RouteAppOrders Error]:', err);
      toast.error(err?.response?.data?.message || 'Could not fetch route app orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, statusFilter, searchTerm, dateFilter, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusTransition = async (orderId: string, nextStatus: string) => {
    setActionLoadingId(orderId);
    try {
      const res = await updateAgentOrderStatus(orderId, nextStatus);
      if (res.success) {
        toast.success(res.message || `Order updated to ${nextStatus}`);
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(prev => prev ? { ...prev, status: nextStatus } : null);
        }
        await fetchOrders(true);
      } else {
        toast.error(res.message || 'Status update failed');
      }
    } catch (err: any) {
      console.error('[Update Order Error]:', err);
      toast.error(err?.response?.data?.message || 'Failed to update order status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PLACED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 animate-pulse">NEW ORDER</span>;
      case 'CONFIRMED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-700">ACCEPTED</span>;
      case 'PACKED':
      case 'PROCESSING':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">PACKING</span>;
      case 'READY_FOR_PICKUP':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-700">READY FOR PICKUP</span>;
      case 'OUT_FOR_DELIVERY':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700">OUT FOR CUSTOMER</span>;
      case 'COMPLETED':
      case 'DELIVERED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300 border border-green-300 dark:border-green-700">DELIVERED</span>;
      case 'CANCELLED':
      case 'FAILED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700">CANCELLED</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-150 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-200 dark:shadow-none shrink-0">
            <Smartphone size={24} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Route Orders
              </h1>
              {vehicle && (
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                  <Truck size={13} className="text-emerald-600" />
                  {vehicle.vehicleName || 'Vehicle'} ({vehicle.vehicleNumber})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customer Mobile App Orders for Your Vehicle & Route
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchOrders(true)}
          disabled={loading || refreshing}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin text-emerald-600' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* 2. Warning if Agent Has No Vehicle Assigned */}
      {!loading && !vehicle && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
          <ShieldAlert size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">No Vehicle Assigned</h4>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              You are currently not assigned to an active vehicle or route. Route app orders placed by customers are scoped exclusively to their chosen vehicle.
            </p>
          </div>
        </div>
      )}

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-gray-200 dark:border-slate-800">
        <button
          onClick={() => switchTab('app_orders')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === 'app_orders'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <ShoppingBag size={15} />
          <span>App Orders</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeTab === 'app_orders'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
          }`}>
            {counts.appOrders}
          </span>
        </button>

        <button
          onClick={() => switchTab('processed')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === 'processed'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <CheckCircle2 size={15} />
          <span>Processed Orders</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeTab === 'processed'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
          }`}>
            {counts.processed}
          </span>
        </button>
      </div>

      {/* 4. Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-grow">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Order ID, Customer Name, Mobile..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            {activeTab === 'app_orders' ? (
              <>
                <option value="PLACED">New (PLACED)</option>
                <option value="CONFIRMED">Accepted (CONFIRMED)</option>
                <option value="PACKED">Packing / Packed</option>
                <option value="READY_FOR_PICKUP">Ready for Pickup</option>
                <option value="OUT_FOR_DELIVERY">Out for Customer</option>
              </>
            ) : (
              <>
                <option value="COMPLETED">Delivered / Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="FAILED">Failed</option>
              </>
            )}
          </select>

          {/* Date Filter */}
          <div className="relative">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {dateFilter && (
              <button 
                onClick={() => setDateFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. Order Cards List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-850 animate-pulse border border-slate-200 dark:border-slate-800" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
            <ShoppingBag size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {activeTab === 'app_orders' ? 'No Active App Orders' : 'No Processed Orders'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {activeTab === 'app_orders'
              ? 'When customers select your vehicle on the mobile app and check out, their orders will appear here in real time.'
              : 'Orders that have been delivered, completed, or cancelled will be archived here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isActing = actionLoadingId === order.id;

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-200 dark:border-slate-800 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700 transition-all space-y-4"
              >
                {/* Order Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-slate-900 dark:text-white tracking-wide">
                      {order.displayId}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock size={12} />
                      {order.placementTime}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(order.status)}
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      order.paymentMethod === 'COD'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                        : 'bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800'
                    }`}>
                      {order.paymentMethod === 'COD' ? 'Cash on Delivery (COD)' : 'UPI Paid'}
                    </span>
                  </div>
                </div>

                {/* Customer & Location Details Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {/* Customer Info */}
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                      <User size={15} />
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="font-bold text-slate-800 dark:text-white truncate">
                        {order.customer.name}
                      </p>
                      <a
                        href={order.customer.phone ? `tel:${order.customer.phone}` : undefined}
                        className="text-slate-500 hover:text-emerald-600 flex items-center gap-1 font-semibold"
                      >
                        <Phone size={11} />
                        {order.customer.phone || 'No Phone Provided'}
                      </a>
                    </div>
                  </div>

                  {/* Pickup Stop */}
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold">
                      <MapPin size={15} />
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pickup Point</p>
                      <p className="font-bold text-slate-800 dark:text-white truncate">
                        {order.pickupPoint}
                      </p>
                    </div>
                  </div>

                  {/* Order Total */}
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center font-bold">
                      <Package size={15} />
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {order.itemCount} Items • Total
                      </p>
                      <p className="text-sm font-black text-slate-900 dark:text-white">
                        ₹{order.totalAmount}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Items Preview Chips */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {order.items.slice(0, 4).map((item) => (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300"
                    >
                      <span className="font-bold text-emerald-600">{item.quantity}x</span>
                      <span className="truncate max-w-[140px]">{item.productName}</span>
                    </span>
                  ))}
                  {order.items.length > 4 && (
                    <span className="text-[11px] font-bold text-slate-400">
                      +{order.items.length - 4} more
                    </span>
                  )}
                </div>

                {/* Action Buttons Row */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Eye size={14} />
                    <span>View Details</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {order.allowedActions && order.allowedActions.map((act) => {
                      let btnStyle = 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200';
                      if (act.color === 'amber') btnStyle = 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200';
                      if (act.color === 'purple') btnStyle = 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200';
                      if (act.color === 'blue') btnStyle = 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200';

                      return (
                        <button
                          key={act.action}
                          disabled={isActing}
                          onClick={() => handleStatusTransition(order.id, act.action)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-[0.98] disabled:opacity-50 ${btnStyle}`}
                        >
                          {isActing ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Check size={14} strokeWidth={3} />
                          )}
                          <span>{act.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl border border-gray-150 dark:border-slate-800">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Order #{selectedOrder.displayId}
                </h3>
                <p className="text-xs text-slate-400">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleDateString()} at {selectedOrder.placementTime}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Status & Payment Overview */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-850">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</p>
                <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment</p>
                <p className="text-xs font-black text-slate-800 dark:text-white mt-1">
                  {selectedOrder.paymentMethod} • <span className="text-emerald-600">{selectedOrder.paymentStatus}</span>
                </p>
              </div>
            </div>

            {/* Customer & Route Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl border border-gray-150 dark:border-slate-800 space-y-2">
                <p className="font-black uppercase tracking-wider text-slate-400 text-[10px]">Customer Details</p>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{selectedOrder.customer.name}</p>
                <p className="text-slate-600 dark:text-slate-300">{selectedOrder.customer.phone}</p>
                <p className="text-slate-500">{selectedOrder.pickupPoint}</p>
              </div>

              <div className="p-4 rounded-2xl border border-gray-150 dark:border-slate-800 space-y-2">
                <p className="font-black uppercase tracking-wider text-slate-400 text-[10px]">Vehicle & Route</p>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{selectedOrder.vehicle.vehicleName} ({selectedOrder.vehicle.vehicleNumber})</p>
                <p className="text-slate-600 dark:text-slate-300">Route: {selectedOrder.route.routeName}</p>
                <p className="text-slate-500">Fulfillment: Vehicle Pickup Only</p>
              </div>
            </div>

            {/* Itemized Breakdown Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Items ({selectedOrder.items.length})</h4>
              <div className="divide-y divide-gray-100 dark:divide-slate-800 rounded-2xl border border-gray-150 dark:border-slate-800 overflow-hidden">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="p-3.5 flex items-center justify-between text-xs bg-white dark:bg-slate-900">
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-900 dark:text-white">
                        {item.productName}
                      </p>
                      {item.variantName && (
                        <p className="text-[11px] text-slate-400">{item.variantName}</p>
                      )}
                      <p className="text-slate-500">₹{item.unitPrice} per unit</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-900 dark:text-white">
                        ₹{item.totalPrice}
                      </p>
                      <p className="text-slate-400">Qty: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Total Summary */}
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Total Payable</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">All Taxes & Packaging Included</p>
              </div>
              <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                ₹{selectedOrder.totalAmount}
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>

              {selectedOrder.allowedActions && selectedOrder.allowedActions.map((act) => (
                <button
                  key={act.action}
                  onClick={() => handleStatusTransition(selectedOrder.id, act.action)}
                  className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-600 text-white hover:bg-emerald-700 shadow-md transition-all active:scale-95"
                >
                  {act.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
