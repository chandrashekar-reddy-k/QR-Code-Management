import React, { useState, useEffect } from 'react';
import { 
  Package, MapPin, Phone, Clock, Loader2, RefreshCw, 
  Search, ChevronRight, ShoppingBag, User, CheckSquare, Square, History, Wallet, ArrowLeft
} from 'lucide-react';
import * as routeService from '../services/routeService';
import toast from 'react-hot-toast';

interface ProductSummary {
  productId: string;
  productName: string;
  quantity: number;
  image?: string;
}

export default function ScheduledDeliveries() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>({ route: null, vehicle: null, deliveries: [], assignments: [], isAdmin: false });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'load' | 'deliver' | 'history'>('load');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('all');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const fetchDeliveries = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await routeService.getScheduledDeliveries();
      if (res.success) {
        setData({
          route: res.route,
          vehicle: res.vehicle,
          deliveries: res.deliveries || [],
          assignments: res.assignments || [],
          isAdmin: !!res.isAdmin
        });
        if (selectedOrder) {
          const updated = (res.deliveries || []).find((o: any) => o.id === selectedOrder.id);
          setSelectedOrder(updated || null);
        }
      } else {
        toast.error(res.message || 'Failed to fetch scheduled deliveries');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error loading scheduled deliveries');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const toggleItemCheck = (productId: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const handleUpdateStatus = async (orderId: string, status: string, reason = '') => {
    setActionLoading(prev => ({ ...prev, [orderId]: true }));
    try {
      const res = await routeService.updateScheduledDeliveryStatus(orderId, status, reason);
      if (res.success) {
        toast.success(`Order marked as ${status.toLowerCase()}`);
        setSelectedOrder(null);
        fetchDeliveries();
      } else {
        toast.error(res.message || 'Failed to update order status');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error updating order status');
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const completedStatuses = ['DELIVERED', 'CANCELLED', 'FAILED', 'RETURNED'];

  const currentAssignment = selectedAssignmentId !== 'all' 
    ? data.assignments?.find((a: any) => a.id === selectedAssignmentId) 
    : null;

  const currentDeliveries = selectedAssignmentId === 'all'
    ? data.deliveries
    : data.deliveries.filter((o: any) => o.routeId === currentAssignment?.route.id);

  const activeDeliveries = currentDeliveries.filter((order: any) => 
    !completedStatuses.includes(order.status)
  );

  const historyDeliveries = currentDeliveries.filter((order: any) => 
    completedStatuses.includes(order.status)
  );

  const getInventoryToLoad = (): ProductSummary[] => {
    const summaryMap: Record<string, ProductSummary> = {};
    activeDeliveries.forEach((order: any) => {
      order.items?.forEach((item: any) => {
        const prodId = item.productId;
        const prodName = item.productName || item.product?.name || 'Unknown Product';
        const img = item.productImage || item.product?.images?.[0] || '';
        
        if (summaryMap[prodId]) {
          summaryMap[prodId].quantity += item.quantity;
        } else {
          summaryMap[prodId] = {
            productId: prodId,
            productName: prodName,
            quantity: item.quantity,
            image: img
          };
        }
      });
    });
    return Object.values(summaryMap);
  };

  const filterList = (list: any[]) => {
    return list.filter((order: any) => {
      const custName = (order.customer?.name || order.consumer?.name || '').toLowerCase();
      const addressStr = `${order.address?.line1 || ''} ${order.address?.line2 || ''} ${order.address?.city || ''} ${order.address?.mandal || ''}`.toLowerCase();
      const orderNum = (order.orderNumber || '').toLowerCase();
      const query = searchTerm.toLowerCase();
      
      return custName.includes(query) || addressStr.includes(query) || orderNum.includes(query);
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
        <p className="text-sm font-semibold tracking-wide">Loading deliveries...</p>
      </div>
    );
  }

  const itemsToLoad = getInventoryToLoad();
  const filteredActive = filterList(activeDeliveries);
  const filteredHistory = filterList(historyDeliveries);

  if (selectedOrder) {
    const order = selectedOrder;
    const custName = order.customer?.name || order.consumer?.name || 'Customer';
    const custPhone = order.customer?.mobile || order.customer?.phone || order.consumer?.phone || 'N/A';
    const isHistoryItem = completedStatuses.includes(order.status);
    const isUpdating = !!actionLoading[order.id];

    const isCOD = order.paymentMethod?.toUpperCase() === 'COD' || order.paymentMode?.toUpperCase() === 'COD' || order.paymentMode === 'CASH';
    const isPrepaid = order.paymentStatus?.toUpperCase() === 'PAID' || !isCOD;

    return (
      <div className="max-w-md mx-auto bg-slate-50 min-h-screen pb-10">
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white p-4 flex items-center gap-3 rounded-b-2xl shadow-sm">
          <button 
            onClick={() => setSelectedOrder(null)}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-extrabold tracking-wide uppercase text-emerald-300">
              Delivery Details
            </h1>
            <p className="font-mono text-base font-black mt-0.5">
              {order.orderNumber}
            </p>
          </div>
        </div>

        {/* Detail Body */}
        <div className="px-4 mt-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-black rounded-md border border-emerald-100 uppercase tracking-wider">
                {order.status}
              </span>
              <h2 className="text-lg font-black text-slate-800 mt-2 flex items-center gap-1.5">
                <User className="w-5 h-5 text-slate-400" />
                {custName}
              </h2>
            </div>

            <div className="flex flex-col gap-2 pt-1 border-t border-slate-100 text-xs font-bold text-slate-600">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Slot: <span className="text-slate-900 font-black">{order.deliverySlot}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>Mandal/Village: <span className="text-slate-900 font-black">{order.address?.city} ({order.address?.mandal || 'N/A'})</span></span>
              </div>
            </div>
          </div>

          {!isHistoryItem && (
            <div className={`p-4 rounded-2xl border flex items-center gap-3 shadow-sm ${
              isPrepaid 
                ? 'bg-blue-50/50 border-blue-200 text-blue-900' 
                : 'bg-amber-50/50 border-amber-250 text-amber-900'
            }`}>
              <Wallet className="w-5 h-5 flex-shrink-0 text-slate-500" />
              <div className="text-xs">
                <p className="font-extrabold uppercase tracking-wider text-[10px]">Payment Requirement</p>
                {isPrepaid ? (
                  <p className="font-bold mt-0.5">Prepaid Order (Payment Successful). Do not collect cash.</p>
                ) : (
                  <p className="font-extrabold mt-0.5 text-amber-950">
                    COD Order: Collect <span className="text-base font-black text-amber-600 underline underline-offset-2">₹{order.totalAmount}</span> in Cash/UPI.
                  </p>
                )}
              </div>
            </div>
          )}

          {!isHistoryItem && (
            <a
              href={`tel:${custPhone}`}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-800 active:bg-slate-900 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-md transition-all"
            >
              <Phone className="w-4.5 h-4.5" />
              Call Customer ({custPhone})
            </a>
          )}

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm text-xs space-y-2">
            <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Full Delivery Address</p>
            <p className="text-slate-850 font-bold leading-relaxed text-sm">
              {order.address?.line1}
              {order.address?.line2 && `, ${order.address?.line2}`}
              <br />
              {order.address?.city}, {order.address?.state} - {order.address?.pincode}
              {order.address?.mandal && ` (Mandal: ${order.address.mandal})`}
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Items to Deliver</h4>
            <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-sm">
              {order.items?.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-3.5">
                  <span className="text-xs font-bold text-slate-800 truncate pr-4">
                    {item.productName || item.product?.name || 'Unknown Product'}
                  </span>
                  <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                    Qty: {item.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {!isHistoryItem && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}
                disabled={isUpdating}
                className="flex items-center justify-center gap-1.5 py-4 bg-emerald-600 active:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all disabled:opacity-50"
              >
                {isUpdating ? 'Saving...' : 'Complete Delivery'}
              </button>
              <button
                onClick={() => {
                  const reason = prompt("Enter failure/cancellation reason:") || '';
                  if (reason) handleUpdateStatus(order.id, 'FAILED', reason);
                }}
                disabled={isUpdating}
                className="flex items-center justify-center gap-1.5 py-4 bg-white border-2 border-red-600 text-red-650 active:bg-red-50 font-black text-xs uppercase tracking-wider rounded-2xl shadow-sm transition-all disabled:opacity-50"
              >
                Mark Failed
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-slate-50 min-h-screen pb-10">
      {/* Driver Header Summary */}
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white p-5 rounded-b-[2rem] shadow-md relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-32 h-32 rounded-full bg-emerald-700/20 blur-xl pointer-events-none" />
        <div className="flex justify-between items-start z-10 relative">
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-1.5">
              <ShoppingBag className="w-5 h-5 text-emerald-400" />
              Scheduled Orders
            </h1>
            {data.route && (
              <p className="text-emerald-200 text-xs font-bold mt-1 tracking-wider uppercase">
                Route: {data.route.routeName} {data.vehicle && `| ${data.vehicle.vehicleNumber}`}
              </p>
            )}
            {data.isAdmin && (
              <p className="text-emerald-300 text-xs font-bold mt-1 tracking-wider uppercase bg-white/10 px-2 py-0.5 rounded inline-block">
                Admin Mode
              </p>
            )}
          </div>
          <button
            onClick={() => fetchDeliveries(true)}
            disabled={refreshing}
            className="p-2 bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Admin Selector Dropdown */}
        {data.isAdmin && (
          <div className="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide">
              Assigned Route / Agent filter
            </label>
            <select
              value={selectedAssignmentId}
              onChange={(e) => {
                setSelectedAssignmentId(e.target.value);
                setSelectedOrder(null);
              }}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-bold text-slate-800"
            >
              <option value="all">All Routes & Agents ({data.deliveries.length} orders)</option>
              {data.assignments?.map((a: any) => {
                const orderCount = data.deliveries.filter((o: any) => o.routeId === a.route.id).length;
                return (
                  <option key={a.id} value={a.id}>
                    {a.route.routeName} — {a.agent?.name || 'No Agent'} ({orderCount} orders)
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {data.deliveries.length === 0 ? (
          <div className="px-6 py-12 text-center bg-white border border-slate-200 rounded-2xl">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Scheduled Deliveries</h3>
            <p className="text-slate-500 text-xs mt-1">
              There are no scheduled deliveries assigned to any active route today.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Tab Switches - Three Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-slate-200/60 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('load')}
                className={`py-2 text-[10px] font-black tracking-wider uppercase rounded-lg transition-all text-center ${
                  activeTab === 'load'
                    ? 'bg-white text-emerald-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-850'
                }`}
              >
                1. Load ({itemsToLoad.length})
              </button>
              <button
                onClick={() => setActiveTab('deliver')}
                className={`py-2 text-[10px] font-black tracking-wider uppercase rounded-lg transition-all text-center ${
                  activeTab === 'deliver'
                    ? 'bg-white text-emerald-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-850'
                }`}
              >
                2. Active ({activeDeliveries.length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-2 text-[10px] font-black tracking-wider uppercase rounded-lg transition-all text-center ${
                  activeTab === 'history'
                    ? 'bg-white text-emerald-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-850'
                }`}
              >
                3. History ({historyDeliveries.length})
              </button>
            </div>

            {/* TAB 1: Products Checklist to Load */}
            {activeTab === 'load' && (
              <div className="bg-white border border-slate-150 rounded-2xl shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h2 className="text-xs font-black text-slate-850 uppercase tracking-wider">Vehicle Stock Checklist</h2>
                  <span className="text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-md">
                    Check as you load
                  </span>
                </div>
                {itemsToLoad.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No active stock to load. All deliveries are complete!
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {itemsToLoad.map((item) => {
                      const isChecked = !!checkedItems[item.productId];
                      return (
                        <div 
                          key={item.productId}
                          onClick={() => toggleItemCheck(item.productId)}
                          className={`flex items-center gap-3 py-3 cursor-pointer transition-all ${
                            isChecked ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="flex-shrink-0">
                            {isChecked ? (
                              <CheckSquare className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-bold text-slate-800 truncate ${isChecked ? 'line-through' : ''}`}>
                              {item.productName}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 font-extrabold text-[11px] rounded-md">
                              QTY: {item.quantity}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2 & 3: Deliveries and History */}
            {(activeTab === 'deliver' || activeTab === 'history') && (
              <div className="space-y-2.5">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search customer, route..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                  />
                </div>

                {/* Delivery Cards */}
                <div className="space-y-2">
                  {(activeTab === 'deliver' ? filteredActive : filteredHistory).length === 0 ? (
                    <div className="py-12 bg-white rounded-2xl border border-slate-200 text-center px-4">
                      <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-500">
                        {activeTab === 'deliver' ? 'No active deliveries matching search.' : 'No delivery history found.'}
                      </p>
                    </div>
                  ) : (
                    (activeTab === 'deliver' ? filteredActive : filteredHistory).map((order: any, idx: number) => {
                      const custName = order.customer?.name || order.consumer?.name || 'Customer';
                      const isHistoryItem = completedStatuses.includes(order.status);
                      
                      const isCOD = order.paymentMethod?.toUpperCase() === 'COD' || order.paymentMode?.toUpperCase() === 'COD' || order.paymentMode === 'CASH';
                      const isPrepaid = order.paymentStatus?.toUpperCase() === 'PAID' || !isCOD;

                      return (
                        <div 
                          key={order.id} 
                          onClick={() => setSelectedOrder(order)}
                          className="bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 active:bg-slate-50/50 transition-all overflow-hidden cursor-pointer"
                        >
                          <div className="py-2.5 px-3 flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-black text-slate-400">Stop #{idx + 1}</span>
                                <span className="font-mono text-[11px] font-extrabold text-slate-600">{order.orderNumber}</span>
                                {!isHistoryItem && (
                                  <>
                                    <span className="text-slate-300 text-[10px]">•</span>
                                    {isPrepaid ? (
                                      <span className="px-1.5 py-0.2 bg-blue-50 text-blue-755 text-[9px] font-black rounded uppercase tracking-wider">
                                        Prepaid
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.2 bg-amber-50 text-amber-800 text-[9px] font-black rounded uppercase tracking-wider">
                                        Collect ₹{order.totalAmount}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                              <h3 className="font-extrabold text-slate-800 text-xs truncate">{custName}</h3>
                              <p className="text-[9px] text-slate-500 font-bold flex items-center gap-0.5 truncate">
                                <MapPin className="w-2.5 h-2.5 text-emerald-600 flex-shrink-0" />
                                {order.address?.line1 || 'No address line'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className={`px-1.5 py-0.5 text-[9px] font-black rounded border uppercase tracking-wide ${
                                order.status === 'DELIVERED' 
                                  ? 'bg-green-50 text-green-700 border-green-150' 
                                  : order.status === 'CANCELLED' || order.status === 'FAILED'
                                  ? 'bg-red-50 text-red-700 border-red-150'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-100'
                              }`}>
                                {order.status === 'READY_FOR_PICKUP' ? 'READY' : order.status}
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
