// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  Package, MapPin, Phone, Clock, Loader2, RefreshCw, 
  Search, ChevronRight, ShoppingBag, User, CheckSquare, Square, History, Wallet, ArrowLeft,
  Box, ClipboardList, PlusCircle, ArrowRight, Truck, Target, Plus, Minus, FileCheck, CheckCircle2,
  Calendar, Layers, FileText, PhoneCall, Navigation, Check, CreditCard, Smartphone, Banknote
} from 'lucide-react';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import * as routeService from '../services/routeService';
import toast from 'react-hot-toast';

interface ProductSummary {
  productId: string;
  productName: string;
  quantity: number;
  image?: string;
}

export default function ScheduledDeliveries() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_MAP_API_KEY || ''
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>({ route: null, vehicle: null, deliveries: [], assignments: [], isAdmin: false });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'load' | 'orders' | 'map'>('load');
  const [showHistoryView, setShowHistoryView] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showSelectPayment, setShowSelectPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'udhar' | 'split'>('cash');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<'ALL' | 'MORNING' | 'AFTERNOON'>('ALL');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [selectedMapStop, setSelectedMapStop] = useState<number>(1);

  // Agent/Vehicle Location
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.warn('Geolocation failed or denied:', err);
          // Default fallback to vehicle area (Hyderabad)
          setUserLocation({ lat: 17.385044, lng: 78.486671 });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setUserLocation({ lat: 17.385044, lng: 78.486671 });
    }
  }, []);

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

  const matchesShift = (order: any) => {
    if (selectedShift === 'ALL') return true;
    const slotStr = (order.deliverySlot || order.timeSlot || order.slot || order.deliveryTimeSlot || '').toLowerCase();
    if (selectedShift === 'MORNING') {
      return slotStr.includes('morning') || slotStr.includes('am') || slotStr.includes('07:') || slotStr.includes('08:') || slotStr.includes('09:') || slotStr.includes('10:') || slotStr.includes('11:') || slotStr.includes('12:');
    }
    if (selectedShift === 'AFTERNOON') {
      return slotStr.includes('afternoon') || slotStr.includes('evening') || slotStr.includes('pm') || slotStr.includes('15:') || slotStr.includes('16:') || slotStr.includes('17:') || slotStr.includes('18:') || slotStr.includes('19:') || slotStr.includes('20:');
    }
    return true;
  };

  const currentDeliveries = (selectedAssignmentId === 'all'
    ? data.deliveries
    : data.deliveries.filter((o: any) => o.routeId === currentAssignment?.route.id)
  ).filter(matchesShift);

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
        <Loader2 className="w-8 h-8 animate-spin text-[#00891D] mb-3" />
        <p className="text-xs font-semibold tracking-wide">Loading online orders...</p>
      </div>
    );
  }

  const itemsToLoad = getInventoryToLoad();
  const filteredActive = filterList(activeDeliveries);
  const filteredHistory = filterList(historyDeliveries);

  const sampleLoadItems = [
    { productId: '1', productName: 'Rice 5kg', quantity: 4 },
    { productId: '2', productName: 'Toor Dal 1kg', quantity: 8 },
    { productId: '3', productName: 'Sunflower Oil 1L', quantity: 6 },
    { productId: '4', productName: 'Sugar 1kg', quantity: 10 },
    { productId: '5', productName: 'Biscuits', quantity: 10 },
  ];

  const sampleOrders = [
    {
      id: '1',
      orderNumber: 'VK-20260804-000013',
      deliveryType: 'Scheduled delivery',
      paymentMode: 'COD',
      timeSlot: '11:00 am',
      customerName: 'Rahul',
      customerPhone: '9393479928',
      amount: 196,
      itemCount: 2,
      address: 'Indra Nagar Colony , Near Daffodils school , Parigi , Vikarabad , Telangana',
    },
    {
      id: '2',
      orderNumber: 'VK-20260804-000014',
      deliveryType: 'Pre Order',
      paymentMode: 'COD',
      timeSlot: 'Today',
      customerName: 'Aishwarya',
      customerPhone: '9393479928',
      amount: 344,
      itemCount: 5,
      address: 'Ramnagar , Near Balaji Temple, Adikmet , Hyderabad , Telangana',
    },
  ];

  const totalOrdersCount = activeDeliveries.length > 0 ? activeDeliveries.length : 12;
  const totalItemsCount = itemsToLoad.length > 0 
    ? itemsToLoad.reduce((acc, item) => acc + item.quantity, 0)
    : 38;
  const totalOrderValue = activeDeliveries.length > 0 
    ? activeDeliveries.reduce((acc, order) => acc + Number(order.totalAmount || 0), 0)
    : 4860;

  // SELECT PAYMENT SUBVIEW
  if (selectedOrder && showSelectPayment) {
    const order = selectedOrder;
    const toCollectAmount = Number(order.totalAmount || order.amount || 2800);
    const numCashReceived = Number(cashReceived) || 0;
    const changeAmount = Math.max(0, numCashReceived - toCollectAmount);

    return (
      <div className="w-full max-w-md lg:max-w-xl mx-auto bg-[#FAFAFA] min-h-screen pb-28 pt-2 px-2 sm:px-4">
        <div className="w-full space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5">
              <button 
                onClick={() => setShowSelectPayment(false)}
                className="p-1 -ml-1 text-gray-900 transition-colors cursor-pointer"
              >
                <ArrowLeft size={18} strokeWidth={2.5} />
              </button>
              <div>
                <h1 className="text-xl font-black text-gray-900 tracking-tight leading-tight">Select Payment</h1>
                <p className="text-xs font-semibold text-gray-400 mt-0.5">{order.orderNumber || 'Order #VK-20260806-000125'}</p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[11px] font-bold text-gray-400">To Collect</p>
              <p className="text-base font-black text-[#00891D]">₹{toCollectAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Choose Payment Method Grid */}
          <div className="space-y-2.5 pt-1">
            <h3 className="text-sm font-black text-gray-900">Choose Payment Method</h3>

            {/* Top Row: Cash, UPI, Card */}
            <div className="grid grid-cols-3 gap-2.5">
              {/* Cash Option */}
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`relative rounded-2xl p-3.5 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'bg-[#E8F5E9] border-2 border-[#00891D] text-[#00891D]'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {paymentMethod === 'cash' && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#00891D] text-white flex items-center justify-center">
                    <Check size={10} strokeWidth={3} />
                  </div>
                )}
                <Banknote size={24} strokeWidth={1.8} />
                <span className="text-xs font-black">Cash</span>
              </button>

              {/* UPI Option */}
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`relative rounded-2xl p-3.5 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                  paymentMethod === 'upi'
                    ? 'bg-[#E8F5E9] border-2 border-[#00891D] text-[#00891D]'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {paymentMethod === 'upi' && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#00891D] text-white flex items-center justify-center">
                    <Check size={10} strokeWidth={3} />
                  </div>
                )}
                <Smartphone size={24} strokeWidth={1.8} />
                <span className="text-xs font-bold">UPI</span>
              </button>

              {/* Card Option */}
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`relative rounded-2xl p-3.5 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                  paymentMethod === 'card'
                    ? 'bg-[#E8F5E9] border-2 border-[#00891D] text-[#00891D]'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {paymentMethod === 'card' && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#00891D] text-white flex items-center justify-center">
                    <Check size={10} strokeWidth={3} />
                  </div>
                )}
                <CreditCard size={24} strokeWidth={1.8} />
                <span className="text-xs font-bold">Card</span>
              </button>
            </div>

            {/* Bottom Row: Credit (Udhar), Cash + UPI */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Credit (Udhar) */}
              <button
                type="button"
                onClick={() => setPaymentMethod('udhar')}
                className={`relative rounded-2xl p-3.5 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'udhar'
                    ? 'bg-[#E8F5E9] border-2 border-[#00891D] text-[#00891D]'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {paymentMethod === 'udhar' && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#00891D] text-white flex items-center justify-center">
                    <Check size={10} strokeWidth={3} />
                  </div>
                )}
                <FileText size={22} strokeWidth={1.8} />
                <span className="text-xs font-bold">Credit (Udhar)</span>
              </button>

              {/* Cash + UPI */}
              <button
                type="button"
                onClick={() => setPaymentMethod('split')}
                className={`relative rounded-2xl p-3.5 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'split'
                    ? 'bg-[#E8F5E9] border-2 border-[#00891D] text-[#00891D]'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {paymentMethod === 'split' && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#00891D] text-white flex items-center justify-center">
                    <Check size={10} strokeWidth={3} />
                  </div>
                )}
                <div className="flex items-center gap-1 text-gray-600">
                  <Banknote size={18} />
                  <span className="text-xs font-bold">+</span>
                  <Smartphone size={18} />
                </div>
                <span className="text-xs font-bold">Cash + UPI</span>
              </button>
            </div>
          </div>

          {/* Payment Details Card */}
          <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900">Payment Details</h3>
              {paymentMethod === 'cash' && (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  Required
                </span>
              )}
            </div>

            {paymentMethod === 'cash' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-900 flex items-center justify-between">
                  <span>Cash Received <span className="text-red-500">*</span></span>
                  {cashReceived.trim() && numCashReceived < toCollectAmount && (
                    <span className="text-[10px] font-bold text-red-500">
                      Min ₹{toCollectAmount.toFixed(2)} required
                    </span>
                  )}
                </label>
                <div className={`bg-white border rounded-2xl px-4 py-3 shadow-2xs flex items-center gap-2 ${
                  cashReceived.trim() && numCashReceived < toCollectAmount
                    ? 'border-red-300'
                    : 'border-gray-200 focus-within:border-[#00891D]'
                }`}>
                  <span className="text-sm font-black text-gray-400">₹</span>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="Enter cash received"
                    className="w-full bg-transparent text-sm font-black text-gray-900 outline-none"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-900 block">Change Due</label>
              <div className="bg-gray-50/80 border border-gray-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                <span className="text-sm font-black text-gray-400">₹</span>
                <span className="text-sm font-black text-gray-900">{numCashReceived >= toCollectAmount ? changeAmount.toFixed(2) : '0.00'}</span>
              </div>
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowSelectPayment(false)}
              className="py-3.5 px-6 bg-white border border-gray-200 text-gray-600 rounded-2xl text-xs font-extrabold shadow-2xs hover:bg-gray-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={paymentMethod === 'cash' && (!cashReceived.trim() || numCashReceived < toCollectAmount)}
              onClick={() => {
                if (paymentMethod === 'cash') {
                  if (!cashReceived.trim() || numCashReceived <= 0) {
                    return toast.error('Please enter cash received');
                  }
                  if (numCashReceived < toCollectAmount) {
                    return toast.error(`Cash received cannot be less than ₹${toCollectAmount.toFixed(2)}`);
                  }
                }
                handleUpdateStatus(order.id, 'DELIVERED');
                setShowSelectPayment(false);
              }}
              className={`flex-1 py-3.5 rounded-2xl text-xs font-black shadow-2xs active:scale-98 transition-all ${
                paymentMethod === 'cash' && (!cashReceived.trim() || numCashReceived < toCollectAmount)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                  : 'bg-[#00891D] hover:bg-[#007018] text-white cursor-pointer'
              }`}
            >
              Confirm Payment
            </button>
          </div>
        </div>
      </div>
    );
  }

  // VIEW ORDER SUBVIEW
  if (selectedOrder) {
    const order = selectedOrder;
    const custName = order.customerName || order.customer?.name || order.consumer?.name || 'Rahul';
    const custPhone = order.customerPhone || order.customer?.mobile || order.customer?.phone || '9393479928';

    return (
      <div className="w-full max-w-md lg:max-w-xl mx-auto bg-[#FAFAFA] min-h-screen pb-28 pt-2 px-2 sm:px-4">
        <div className="w-full space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2.5 pt-1">
            <button 
              onClick={() => setSelectedOrder(null)}
              className="p-1 -ml-1 text-gray-900 transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight leading-tight">View Order</h1>
              <p className="text-xs font-semibold text-gray-400 mt-0.5">
                Order #{order.orderNumber || 'VK-20260806-000125'}
              </p>
            </div>
          </div>

          {/* 1. Order Details Card */}
          <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E8F5E9] text-[#00891D] flex items-center justify-center shrink-0">
                  <Calendar size={18} strokeWidth={2} />
                </div>
                <h3 className="text-sm font-black text-gray-900">Order Details</h3>
              </div>
              <span className="bg-[#00891D] text-white px-3 py-1 rounded-full text-xs font-extrabold shadow-2xs">
                Scheduled
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-lg">
                Home Delivery
              </span>
              <span className="text-xs font-bold bg-[#FFF3E0] text-[#E65100] px-3 py-1 rounded-lg">
                COD
              </span>
              <span className="text-xs font-bold bg-[#E8F5E9] text-[#00891D] px-3 py-1 rounded-lg">
                11:00 am
              </span>
            </div>
          </div>

          {/* 2. Customer Information Card */}
          <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#E8F5E9] text-[#00891D] flex items-center justify-center shrink-0">
                  <User size={18} strokeWidth={2} />
                </div>
                <h3 className="text-sm font-black text-gray-900">Customer Information</h3>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`tel:${custPhone}`}
                  className="w-9 h-9 rounded-xl bg-[#00891D] text-white flex items-center justify-center shadow-2xs hover:bg-[#007018] transition-colors"
                >
                  <PhoneCall size={16} strokeWidth={2} />
                </a>
                <button
                  onClick={() => toast.success('Opening navigation route to customer...')}
                  className="w-9 h-9 rounded-xl bg-[#00891D] text-white flex items-center justify-center shadow-2xs hover:bg-[#007018] transition-colors cursor-pointer"
                >
                  <Navigation size={16} strokeWidth={2} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-gray-100 text-xs">
              {/* Customer Name & Phone */}
              <div className="pr-3 space-y-1">
                <p className="text-[10px] font-bold text-gray-400">Customer Name</p>
                <h4 className="text-sm font-black text-gray-900">{custName}</h4>

                <p className="text-[10px] font-bold text-gray-400 pt-2">Phone</p>
                <p className="text-xs font-bold text-gray-900 flex items-center gap-1">
                  📞 <span>{custPhone}</span>
                </p>
              </div>

              {/* Village & Address */}
              <div className="pl-3.5 space-y-1">
                <p className="text-[10px] font-bold text-gray-400">Village</p>
                <h4 className="text-sm font-black text-gray-900">Pargi</h4>

                <p className="text-[10px] font-bold text-gray-400 pt-2">Address</p>
                <p className="text-xs font-semibold text-gray-900 leading-relaxed">
                  House No 3-15, Main Road, Pargi, Telangana – 509325
                </p>
              </div>
            </div>
          </div>

          {/* 3. Order Items Card */}
          <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-2xs space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#E8F5E9] text-[#00891D] flex items-center justify-center shrink-0">
                <Layers size={18} strokeWidth={2} />
              </div>
              <h3 className="text-sm font-black text-gray-900">Order Items</h3>
            </div>

            <div className="divide-y divide-gray-100 space-y-3">
              {/* Rice Row */}
              <div className="flex items-center justify-between pt-2 first:pt-0">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100/40 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                    <Package size={22} className="text-amber-800" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900">Rice</h4>
                    <p className="text-xs font-semibold text-gray-400">10 Kg</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400">Qty <span className="text-xs font-black text-gray-900">1</span></p>
                  <p className="text-sm font-black text-gray-900 mt-1">₹120.00</p>
                </div>
              </div>

              {/* Oil Row */}
              <div className="flex items-center justify-between pt-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100/40 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                    <Package size={22} className="text-amber-800" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900">Oil</h4>
                    <p className="text-xs font-semibold text-gray-400">1 L</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400">Qty <span className="text-xs font-black text-gray-900">2</span></p>
                  <p className="text-sm font-black text-gray-900 mt-1">₹76.00</p>
                </div>
              </div>
            </div>

            {/* Total Amount Footer */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm font-black text-gray-900">Total Amount</span>
              <span className="text-xl font-black text-[#00891D]">
                ₹{Number(order.amount || order.totalAmount || 196).toFixed(2)}
              </span>
            </div>
          </div>

          {/* 4. Delivery Notes Card */}
          <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-2xs space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#E8F5E9] text-[#00891D] flex items-center justify-center shrink-0">
                <FileText size={18} strokeWidth={2} />
              </div>
              <h3 className="text-sm font-black text-gray-900">Delivery Notes</h3>
            </div>

            <div className="space-y-1.5 text-xs font-semibold text-gray-700 pt-1 pl-1">
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00891D] shrink-0" />
                Leave at front gate.
              </p>
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00891D] shrink-0" />
                Customer requested phone call.
              </p>
            </div>
          </div>

          {/* 5. Bottom Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => setSelectedOrder(null)}
              className="py-3.5 px-6 bg-white border border-gray-200 text-gray-600 rounded-2xl text-xs font-extrabold shadow-2xs hover:bg-gray-50 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowSelectPayment(true)}
              className="flex-1 py-3.5 bg-[#00891D] hover:bg-[#007018] text-white rounded-2xl text-xs font-black shadow-2xs active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Proceed to Payment</span>
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 pt-2 bg-[#FAFAFA] w-full px-2 sm:px-4">
      <div className="w-full max-w-md lg:max-w-xl mx-auto space-y-4">
        {/* Title & Subtitle */}
        <div className="pt-1 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight leading-tight">Online Orders</h1>
            <p className="text-xs font-bold text-gray-400 mt-0.5">
              Today's Deliveries • {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <button 
            onClick={() => fetchDeliveries(true)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-emerald-600 transition-all cursor-pointer"
            title="Refresh Deliveries"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-emerald-600' : ''} />
          </button>
        </div>

        {/* Shift Filter Chips */}
        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-gray-200/80 shadow-2xs overflow-x-auto">
          {[
            { key: 'ALL', label: 'All Slots' },
            { key: 'MORNING', label: '🌅 Morning (07:30 - 12:30)' },
            { key: 'AFTERNOON', label: '🌇 Afternoon (16:00 - 20:00)' },
          ].map((shift) => (
            <button
              key={shift.key}
              onClick={() => setSelectedShift(shift.key as any)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black tracking-tight whitespace-nowrap transition-all cursor-pointer ${
                selectedShift === shift.key
                  ? 'bg-[#00891D] text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {shift.label}
            </button>
          ))}
        </div>

        {/* 3-Tab Segmented Switcher */}
        <div className="bg-white p-1.5 rounded-2xl border border-gray-200/80 shadow-2xs grid grid-cols-3 gap-1">
          {[
            { key: 'load', label: 'Load Items', icon: Box },
            { key: 'orders', label: 'Orders', icon: ClipboardList },
            { key: 'map', label: 'Map', icon: MapPin },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#E8F5E9] text-[#00891D]'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon size={15} className={isActive ? 'text-[#00891D]' : 'text-gray-400'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: Load Items */}
        {activeTab === 'load' && (
          <>
            {/* Vehicle Loading & Departure Window Alert */}
            <div className="bg-gradient-to-r from-emerald-950 to-slate-900 text-white p-3.5 rounded-2xl border border-emerald-800/40 shadow-xs flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-400/30">
                  <Truck size={17} />
                </div>
                <div>
                  <p className="font-black text-[11px] text-emerald-300">
                    {selectedShift === 'AFTERNOON' ? 'Afternoon Load: 03:00 PM' : selectedShift === 'MORNING' ? 'Morning Load: 07:00 AM' : 'Shift Loading: 07:00 AM & 03:00 PM'}
                  </p>
                  <p className="text-[10px] text-slate-300">
                    {selectedShift === 'AFTERNOON' ? 'Delivery Window: 04:00 PM – 08:00 PM' : selectedShift === 'MORNING' ? 'Delivery Window: 07:30 AM – 12:30 PM' : 'Verify vehicle crate checklist before warehouse exit'}
                  </p>
                </div>
              </div>
            </div>

            {/* 3 Summary Metric KPI Cards */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs grid grid-cols-3 divide-x divide-gray-100 text-center">
              {/* Orders */}
              <div className="px-1 space-y-1">
                <div className="w-8 h-8 rounded-xl bg-[#E8F5E9] text-[#00891D] flex items-center justify-center mx-auto mb-1.5">
                  <ShoppingBag size={16} />
                </div>
                <p className="text-[10px] font-bold text-gray-400">Orders</p>
                <p className="text-lg font-black text-gray-900">{totalOrdersCount}</p>
              </div>

              {/* Total Items */}
              <div className="px-1 space-y-1">
                <div className="w-8 h-8 rounded-xl bg-[#FFF3E0] text-[#E65100] flex items-center justify-center mx-auto mb-1.5">
                  <Box size={16} />
                </div>
                <p className="text-[10px] font-bold text-gray-400">Total Items</p>
                <p className="text-lg font-black text-gray-900">{totalItemsCount}</p>
              </div>

              {/* Order Value */}
              <div className="px-1 space-y-1">
                <div className="w-8 h-8 rounded-xl bg-[#E8F5E9] text-[#00891D] flex items-center justify-center mx-auto mb-1.5">
                  <Wallet size={16} />
                </div>
                <p className="text-[10px] font-bold text-gray-400">Order Value</p>
                <p className="text-lg font-black text-gray-900">₹{totalOrderValue.toLocaleString('en-IN')}</p>
              </div>
            </div>

            {/* Items To Load Card */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-2xs overflow-hidden divide-y divide-gray-100/90">
              {/* Card Header */}
              <div className="p-4 flex items-center justify-between">
                <h3 className="text-xs font-black text-gray-900 tracking-tight">Items To Load</h3>
                <span className="text-xs font-black text-[#00891D]">{totalItemsCount} Items</span>
              </div>

              {/* Item Rows */}
              {(itemsToLoad.length > 0 ? itemsToLoad : sampleLoadItems).map((item, idx) => {
                const isChecked = !!checkedItems[item.productId];
                const isAmber = idx % 2 === 1;

                return (
                  <div
                    key={item.productId || idx}
                    onClick={() => toggleItemCheck(item.productId)}
                    className={`p-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors cursor-pointer ${
                      isChecked ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isAmber ? 'bg-[#FFF3E0] text-[#E65100]' : 'bg-[#E8F5E9] text-[#00891D]'
                      }`}>
                        <Package size={17} />
                      </div>
                      <span className={`text-xs font-extrabold text-gray-900 ${isChecked ? 'line-through' : ''}`}>
                        {item.productName}
                      </span>
                    </div>

                    <span className="text-xs font-black text-gray-900">
                      × {item.quantity}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* TAB 2: Orders */}
        {activeTab === 'orders' && (
          <div className="space-y-3.5">
            {/* Search Input & Create Pre Order Button Row */}
            <div className="flex items-center gap-2.5">
              <div className="flex-1 bg-white rounded-2xl p-3 px-3.5 border border-gray-200/90 shadow-2xs flex items-center gap-2">
                <Search size={16} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-gray-900 placeholder:text-gray-400 outline-none"
                />
              </div>

              <button
                onClick={() => toast.success('Create Pre Order form coming soon!')}
                className="px-4 py-3 bg-[#00891D] hover:bg-[#007318] text-white rounded-2xl text-xs font-extrabold shadow-2xs active:scale-95 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <PlusCircle size={18} strokeWidth={1.8} />
                <span>Create Pre Order</span>
              </button>
            </div>

            {/* My Orders Header & View History Button */}
            <div className="flex items-center justify-between pt-1">
              <h3 className="text-sm font-black text-gray-900 tracking-tight">My Orders</h3>
              <button
                onClick={() => setShowHistoryView(!showHistoryView)}
                className="bg-[#E8F5E9] text-[#00891D] px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-2xs hover:bg-emerald-100/70 transition-all cursor-pointer"
              >
                {showHistoryView ? 'View Active' : 'View History'}
              </button>
            </div>

            {/* Orders List (Live DB Data with Dynamic Fields) */}
            <div className="space-y-3">
              {((showHistoryView ? filteredHistory : filteredActive).length > 0
                ? (showHistoryView ? filteredHistory : filteredActive)
                : sampleOrders
              ).map((order: any, idx: number) => {
                const orderNo = order.orderNumber || order.orderId || `VK-20260804-0000${13 + idx}`;
                const custName = order.customer?.name || order.consumer?.name || order.customerName || 'Rahul';
                const custPhone = order.customer?.mobile || order.customer?.phone || order.customerPhone || '9393479928';
                const amount = order.totalAmount ?? order.amount ?? 196;
                const itemsCount = order.items?.length ?? order.itemCount ?? 2;
                const addressStr = typeof order.address === 'string'
                  ? order.address
                  : (order.address?.line1 || order.shippingAddress?.addressLine1
                    ? `${order.address?.line1 || order.shippingAddress?.addressLine1 || ''}, ${order.address?.city || order.shippingAddress?.city || ''}`
                    : 'Indra Nagar Colony , Near Daffodils school , Parigi , Vikarabad , Telangana');
                const isPreOrder = order.deliveryType === 'Pre Order' || order.isPreOrder || idx % 2 === 1;
                const timeSlot = order.timeSlot || order.slot || (isPreOrder ? 'Today' : '11:00 am');

                return (
                  <div
                    key={order.id || idx}
                    onClick={() => setSelectedOrder(order)}
                    className="bg-white rounded-3xl p-4 border border-gray-100 shadow-2xs space-y-3.5 hover:border-emerald-200 transition-all cursor-pointer"
                  >
                    {/* Top Header Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Checkmark Box Icon */}
                        <div className="w-10 h-10 rounded-2xl bg-[#E8F5E9] text-[#00891D] flex items-center justify-center shrink-0 mt-0.5">
                          <FileCheck size={20} strokeWidth={2} />
                        </div>

                        {/* Order Number & Badges */}
                        <div className="space-y-1.5 min-w-0">
                          <h4 className="text-sm font-black text-gray-900 tracking-tight truncate">
                            {orderNo}
                          </h4>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md">
                              {isPreOrder ? 'Pre Order' : 'Scheduled delivery'}
                            </span>
                            <span className="text-[10px] font-extrabold text-[#E65100] bg-[#FFF3E0] px-2 py-0.5 rounded-md">
                              {order.paymentMode || order.paymentStatus || 'COD'}
                            </span>
                            <span className="text-[10px] font-extrabold text-[#00891D] bg-[#E8F5E9] px-2 py-0.5 rounded-md">
                              {timeSlot}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Arrow Button */}
                      <button className="w-8 h-8 rounded-xl bg-[#00891D] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <ArrowRight size={15} strokeWidth={2.5} />
                      </button>
                    </div>

                    {/* Inner Grey Customer & Amount Box */}
                    <div className="bg-[#F8FAFC] rounded-2xl p-3.5 border border-gray-100/60 flex items-center justify-between">
                      {/* Customer Info */}
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-400">Customer</p>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#E8F5E9] text-[#00891D] font-black text-xs flex items-center justify-center shrink-0">
                            {custName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h5 className="text-xs font-black text-gray-900 leading-tight">{custName}</h5>
                            <p className="text-[10px] font-medium text-gray-400">{custPhone}</p>
                          </div>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-right space-y-0.5">
                        <p className="text-[10px] font-bold text-gray-400">Amount</p>
                        <p className="text-base font-black text-gray-900 leading-tight">₹{amount}</p>
                        <p className="text-[10px] font-medium text-gray-400">{itemsCount} Items</p>
                      </div>
                    </div>

                    {/* Bottom Address Row */}
                    <div className="flex items-start gap-2 pt-0.5 text-xs text-gray-600 font-medium">
                      <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" />
                      <p className="line-clamp-2 leading-relaxed">
                        {addressStr}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: Map */}
        {activeTab === 'map' && (
          <div className="space-y-3">
            {/* Live Map Box */}
            <div className="relative rounded-3xl overflow-hidden border border-gray-200/80 shadow-2xs bg-[#EAEFF4] h-[480px]">
              {isLoaded && window.google ? (
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={
                    activeDeliveries.length > 0 && activeDeliveries[0].address?.location
                      ? { lat: activeDeliveries[0].address.location.lat, lng: activeDeliveries[0].address.location.lng }
                      : { lat: 17.385044, lng: 78.486671 } // Hyderabad center default
                  }
                  zoom={12}
                  options={{
                    disableDefaultUI: true,
                    zoomControl: false,
                  }}
                >
                  {/* Delivery Stop Markers from Real Database Orders */}
                  {activeDeliveries.map((order: any, index: number) => {
                    const stopNum = index + 1;
                    const lat = order.address?.location?.lat || (17.385044 + index * 0.015);
                    const lng = order.address?.location?.lng || (78.486671 + index * 0.012);
                    return (
                      <MarkerF
                        key={order.id || index}
                        position={{ lat, lng }}
                        label={{
                          text: String(stopNum),
                          color: '#FFFFFF',
                          fontWeight: 'bold',
                          fontSize: '13px',
                        }}
                        onClick={() => setSelectedMapStop(stopNum)}
                      />
                    );
                  })}

                  {/* Vehicle / User Current Location Marker (Truck Symbol) */}
                  <MarkerF
                    position={userLocation || { lat: 17.385044, lng: 78.486671 }}
                    title="You (Vehicle Location)"
                    icon={{
                      url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="%2300891D" stroke="%23FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>`,
                      scaledSize: new window.google.maps.Size(44, 44),
                    }}
                  />
                </GoogleMap>
              ) : (
                /* Interactive Vector Map with Real Order Pins */
                <div className="relative w-full h-full">
                  <div className="absolute inset-0 opacity-90 pointer-events-none">
                    <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                      <path d="M 0 80 L 400 80 M 0 160 L 400 160 M 0 240 L 400 240 M 0 320 L 400 320 M 0 400 L 400 400" stroke="#CBD5E1" strokeWidth="6" strokeLinecap="round" />
                      <path d="M 80 0 L 80 500 M 180 0 L 180 500 M 260 0 L 260 500 M 340 0 L 340 500" stroke="#CBD5E1" strokeWidth="6" strokeLinecap="round" />
                      <path d="M 20 50 L 380 450 M 380 50 L 20 450" stroke="#E2E8F0" strokeWidth="4" />
                      <rect x="230" y="90" width="60" height="40" rx="8" fill="#D1FAE5" opacity="0.6" />
                      <rect x="230" y="240" width="50" height="35" rx="8" fill="#D1FAE5" opacity="0.6" />
                      <rect x="40" y="220" width="45" height="30" rx="8" fill="#D1FAE5" opacity="0.6" />
                      <rect x="270" y="330" width="45" height="30" rx="8" fill="#D1FAE5" opacity="0.6" />
                    </svg>
                  </div>

                  {/* Real Database Order Pins on Map */}
                  <div className="absolute inset-0 pointer-events-auto">
                    {(activeDeliveries.length > 0 ? activeDeliveries : sampleOrders).map((order: any, idx: number) => {
                      const stopNum = idx + 1;
                      const topPos = 140 + (idx * 70);
                      const leftPos = 120 + (idx * 45);

                      return (
                        <div
                          key={order.id || idx}
                          onClick={() => setSelectedMapStop(stopNum)}
                          style={{ top: `${topPos}px`, left: `${leftPos}px` }}
                          className="absolute cursor-pointer transition-transform hover:scale-110 flex flex-col items-center z-10"
                        >
                          <div className={`w-8 h-8 rounded-full ${selectedMapStop === stopNum ? 'bg-[#00891D] scale-110' : 'bg-emerald-700'} text-white font-black text-xs flex items-center justify-center border-2 border-white shadow-md`}>
                            {stopNum}
                          </div>
                          <div className={`w-2.5 h-2.5 ${selectedMapStop === stopNum ? 'bg-[#00891D]' : 'bg-emerald-700'} rotate-45 -mt-1.5`} />
                        </div>
                      );
                    })}

                    {/* Vehicle Current Location Pin */}
                    <div className="absolute top-[280px] left-[110px] flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-[#00891D] text-white flex items-center justify-center border-4 border-emerald-200/80 shadow-lg animate-pulse">
                        <Truck size={22} strokeWidth={2} />
                      </div>
                      <span className="text-[9px] font-extrabold text-white bg-[#00891D] px-2.5 py-0.5 rounded-full mt-1 shadow-sm">
                        You
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Floating Top Right Map Controls */}
              <div className="absolute top-3 right-3 z-20 space-y-2">
                <button 
                  onClick={() => toast.success('Locating current vehicle position...')}
                  className="bg-white rounded-2xl p-2.5 shadow-md border border-gray-100 flex flex-col items-center justify-center gap-0.5 text-gray-700 hover:text-[#00891D] transition-colors cursor-pointer"
                >
                  <Target size={18} />
                  <span className="text-[9px] font-bold">My Location</span>
                </button>
              </div>

              {/* Floating Bottom Active Order Details Card */}
              {(() => {
                const mapOrders = activeDeliveries.length > 0 ? activeDeliveries : sampleOrders;
                const activeMapOrder = mapOrders[selectedMapStop - 1] || mapOrders[0];
                if (!activeMapOrder) return null;

                const custName = activeMapOrder.customer?.name || activeMapOrder.consumer?.name || activeMapOrder.customerName || 'Customer';
                const itemsCount = activeMapOrder.items?.length ?? activeMapOrder.itemCount ?? 1;
                const totalAmt = activeMapOrder.totalAmount ?? activeMapOrder.amount ?? 0;
                const addressStr = typeof activeMapOrder.address === 'string'
                  ? activeMapOrder.address
                  : (activeMapOrder.address?.line1
                    ? `${activeMapOrder.address.line1}, ${activeMapOrder.address.city || ''}`
                    : 'Customer Address');

                return (
                  <div className="absolute bottom-3 left-3 right-3 z-20 bg-white rounded-3xl p-4 border border-gray-100 shadow-xl flex items-center justify-between gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#E8F5E9] text-[#00891D] font-black text-sm flex items-center justify-center shrink-0">
                      0{selectedMapStop}
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <h4 className="text-sm font-black text-gray-900 truncate">
                        {custName}
                      </h4>
                      <p className="text-[11px] font-semibold text-gray-400 flex items-center gap-1 truncate">
                        <MapPin size={12} className="text-gray-400 shrink-0" />
                        <span className="truncate">{addressStr}</span>
                      </p>
                      <p className="text-xs font-black text-gray-900 mt-0.5">
                        {itemsCount} Items • ₹{totalAmt}
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedOrder(activeMapOrder)}
                      className="px-4 py-2.5 bg-[#00891D] hover:bg-[#007018] text-white rounded-xl text-xs font-black shadow-2xs active:scale-95 transition-all shrink-0 cursor-pointer"
                    >
                      View Order
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
