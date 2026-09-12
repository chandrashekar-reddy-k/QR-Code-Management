// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, MapPin, Clock, Truck, Package, ArrowUpRight,
  ChevronRight, ArrowRight, ShieldCheck, CheckCircle2,
  AlertTriangle, Store, BarChart2, TrendingUp, Layers,
  RefreshCw, RotateCcw, Gift, FileCheck, LogOut
} from 'lucide-react';
import PunchOutModal from '../components/PunchOutModal';
import { useUserStore } from '../store/userStore';
import * as routeService from '../services/routeService';
import * as shiftService from '../services/shiftService';
import { ordersAPI, productsAPI } from '../services/api';
import { openHRMSPortal } from '../../../../utils/hrmsSSO';
import * as locationService from '../services/locationService';

export default function AgentHome() {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const [showPunchOutModal, setShowPunchOutModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    availableStock: 245,
    lowStock: 5,
    ordersCompleted: 40,
    todaySales: 12000,
  });
  const [todayPlan, setTodayPlan] = useState<any>(null);
  const [todayOrders, setTodayOrders] = useState<any[]>([]);
  const [activeShift, setActiveShift] = useState<any>(null);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    setLoading(true);
    locationService.startLiveTracking();
    try {
      // 1. Fetch Today's Plan status
      try {
        const planData = await routeService.getCoverageStatus();
        setTodayPlan(planData);
      } catch (e) {
        console.error('Failed to load coverage plan', e);
      }

      // 2. Fetch shift status
      try {
        const { data } = await shiftService.getShiftStatus();
        setActiveShift(data?.activeShift || null);
      } catch (e) {
        console.error('Failed to load shift status', e);
      }

      // 3. Fetch Orders History (Today)
      try {
        const { data: orderList } = await ordersAPI.getMyHistory();
        if (Array.isArray(orderList)) {
          const todayOnly = orderList.filter((o: any) => {
            const d = new Date(o.createdAt || o.date);
            return d.toDateString() === new Date().toDateString();
          });
          setTodayOrders(todayOnly);

          // Calculate completed orders and today's sales
          const completed = orderList.filter((o: any) => o.status === 'COMPLETED' || o.status === 'DELIVERED');
          const totalRev = completed.reduce((sum: number, o: any) => sum + Number(o.totalAmount || o.amount || 0), 0);
          
          setStats((prev) => ({
            ...prev,
            ordersCompleted: completed.length > 0 ? completed.length : prev.ordersCompleted,
            todaySales: totalRev > 0 ? totalRev : prev.todaySales,
          }));
        }
      } catch (e) {
        console.error('Failed to load orders', e);
      }

      // 4. Fetch Stock summary
      try {
        const { data: inv } = await productsAPI.getVehicleInventory('me');
        if (Array.isArray(inv)) {
          const totalItems = inv.reduce((sum: number, i: any) => sum + Number(i.quantity || i.stock || 0), 0);
          const lowCount = inv.filter((i: any) => Number(i.quantity || i.stock || 0) < 5).length;
          setStats((prev) => ({
            ...prev,
            availableStock: totalItems,
            lowStock: lowCount,
          }));
        }
      } catch (e) {
        console.error('Failed to load inventory', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const agentName = user?.name || user?.firstName || user?.fullName || 'VSMS Agent User';
  const roleName = 'Sales Agent';

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-20 pt-1">
      {/* ── Top Header Strip ── */}
      <div className="flex items-center justify-between pt-2 px-1">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
            {getGreeting()}, {agentName}
          </h1>
          <p className="text-xs font-medium text-gray-400 mt-0.5">{roleName}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/vsms/agent-portal/activity-logs')}
            className="w-9 h-9 rounded-xl bg-white border border-gray-200/80 flex items-center justify-center text-gray-600 hover:text-emerald-600 transition-all shadow-sm"
          >
            <Bell size={18} />
          </button>
          <button
            onClick={() => setShowPunchOutModal(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
          >
            <LogOut size={14} />
            <span>Punch Out</span>
          </button>
          <button
            onClick={() => openHRMSPortal()}
            className="bg-[#00891D] hover:bg-[#007318] text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 tracking-wide"
          >
            HRMS
          </button>
        </div>
      </div>

      {/* ── Notification Announcement Card ── */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100/90 shadow-sm flex items-start gap-3.5 transition-all hover:shadow-md">
        <div className="w-10 h-10 rounded-2xl bg-purple-100/60 text-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <MapPin size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-extrabold text-gray-900">New Route Assigned!</h4>
            <span className="text-[11px] font-medium text-gray-400">10:33 AM</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
            You have been assigned to Route: Test route with a specific weekly schedule.
          </p>
        </div>
      </div>

      {/* ── 2x2 Stats Grid ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Available Stock */}
        <div
          onClick={() => navigate('/vsms/agent-portal/inventory')}
          className="bg-white rounded-2xl p-4 border border-gray-100/90 shadow-sm flex items-center justify-between cursor-pointer hover:border-emerald-200 transition-all"
        >
          <div>
            <p className="text-xs font-semibold text-gray-500">Available Stock</p>
            <p className="text-xl font-black text-gray-900 mt-1.5">
              {stats.availableStock}{' '}
              <span className="text-xs font-normal text-gray-400">(items)</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100/60 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <Truck size={20} />
          </div>
        </div>

        {/* Low Stock */}
        <div
          onClick={() => navigate('/vsms/agent-portal/inventory')}
          className="bg-white rounded-2xl p-4 border border-gray-100/90 shadow-sm flex items-center justify-between cursor-pointer hover:border-orange-200 transition-all"
        >
          <div>
            <p className="text-xs font-semibold text-gray-500">Low Stock</p>
            <p className="text-xl font-black text-gray-900 mt-1.5">{stats.lowStock}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-100/60 text-orange-500 flex items-center justify-center flex-shrink-0">
            <Package size={20} />
          </div>
        </div>

        {/* Orders Completed */}
        <div
          onClick={() => navigate('/vsms/agent-portal/sales-history')}
          className="bg-white rounded-2xl p-4 border border-gray-100/90 shadow-sm flex items-center justify-between cursor-pointer hover:border-orange-200 transition-all"
        >
          <div>
            <p className="text-xs font-semibold text-gray-500">Orders Completed</p>
            <p className="text-xl font-black text-gray-900 mt-1.5">{stats.ordersCompleted}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-100/60 text-orange-500 flex items-center justify-center flex-shrink-0">
            <Package size={20} />
          </div>
        </div>

        {/* Today's Sales */}
        <div
          onClick={() => navigate('/vsms/agent-portal/sales')}
          className="bg-white rounded-2xl p-4 border border-gray-100/90 shadow-sm flex items-center justify-between cursor-pointer hover:border-emerald-200 transition-all"
        >
          <div>
            <p className="text-xs font-semibold text-gray-500">Today's Sales</p>
            <p className="text-xl font-black text-gray-900 mt-1.5">
              ₹{Number(stats.todaySales).toLocaleString()}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100/60 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <BarChart2 size={20} />
          </div>
        </div>
      </div>

      {/* ── Today's Plan Summary Card ── */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100/60 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Store size={20} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">Today's Plan</h3>
              <p className="text-xs text-gray-400 font-medium mt-0.5">Your day at a glance</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/vsms/agent-portal/today-plan')}
            className="bg-[#00891D] hover:bg-[#007318] text-white px-4 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
          >
            View
          </button>
        </div>

        {/* 3 Metrics in Columns */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100/80 text-center">
          <div className="flex flex-col items-center">
            <div className="w-9 h-9 rounded-full bg-emerald-100/60 text-emerald-600 flex items-center justify-center mb-1.5">
              <MapPin size={17} />
            </div>
            <p className="text-[10px] font-semibold text-gray-400">Today's Village</p>
            <p className="text-xs font-extrabold text-gray-900 mt-0.5 truncate max-w-full">
              {todayPlan?.today?.villageName || todayPlan?.today?.morning || 'Pargi'}
            </p>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-9 h-9 rounded-full bg-blue-100/60 text-blue-600 flex items-center justify-center mb-1.5">
              <Clock size={17} />
            </div>
            <p className="text-[10px] font-semibold text-gray-400">Shift Status</p>
            <p className="text-xs font-extrabold text-gray-900 mt-0.5 truncate max-w-full">
              {activeShift ? 'Started' : (todayPlan?.coverage?.morningDone ? 'Completed' : 'Not Started')}
            </p>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-9 h-9 rounded-full bg-orange-100/60 text-orange-500 flex items-center justify-center mb-1.5">
              <Layers size={17} />
            </div>
            <p className="text-[10px] font-semibold text-gray-400">Assigned Route</p>
            <p className="text-xs font-extrabold text-gray-900 mt-0.5 truncate max-w-full">
              {todayPlan?.today?.routeName || 'Lonka'}
            </p>
          </div>
        </div>

        {/* Route Progress Bar */}
        <div className="space-y-2 pt-1 border-t border-gray-50">
          <div className="flex items-center justify-between text-xs font-bold text-[#00891D]">
            <span className="flex items-center gap-1.5">
              <MapPin size={14} className="text-[#00891D]" />
              0% Route Completed
            </span>
            <span className="text-gray-400 font-semibold">0%</span>
          </div>
          <div className="h-2 w-full bg-gray-100/90 rounded-full overflow-hidden">
            <div className="h-full bg-[#00891D] rounded-full w-0" />
          </div>
        </div>
      </div>

      {/* ── Today's Orders Section ── */}
      <div className="space-y-3.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base font-extrabold text-gray-900 tracking-tight">Today's Orders</h3>
          <button
            onClick={() => navigate('/vsms/agent-portal/scheduled-deliveries')}
            className="text-xs font-bold text-[#00891D] hover:underline flex items-center gap-1"
          >
            View All →
          </button>
        </div>

        {/* Live / Sample Order Cards */}
        <div className="space-y-3.5">
          {(todayOrders.length > 0 ? todayOrders : [
            {
              id: '1',
              orderNumber: 'VK-20260804-000013',
              deliveryType: 'Scheduled delivery',
              paymentMode: 'COD',
              timeSlot: '11:00 am',
              customerName: 'Rahul',
              phone: '9393479928',
              itemsCount: 2,
              totalAmount: 196,
              address: 'Indra Nagar Colony , Near Daffodils school , Parigi , Vikarabad , Telangana'
            },
            {
              id: '2',
              orderNumber: 'VK-20260804-000014',
              deliveryType: 'Pre Order',
              paymentMode: 'COD',
              timeSlot: 'Today',
              customerName: 'Aishwarya',
              phone: '9393479928',
              itemsCount: 5,
              totalAmount: 344,
              address: 'Ramnagar , Near Balaji Temple, Adikmet , Hyderabad , Telangana'
            },
          ]).map((order) => {
            const cName = order.customerName || order.customer?.name || 'Customer';
            const initial = cName.charAt(0).toUpperCase();
            return (
              <div
                key={order.id || order.orderNumber}
                onClick={() => navigate('/vsms/agent-portal/scheduled-deliveries')}
                className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100/90 shadow-sm space-y-3.5 cursor-pointer hover:border-emerald-200 transition-all group"
              >
                {/* Top Row Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100/60 text-[#00891D] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FileCheck size={20} strokeWidth={2} />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-extrabold text-gray-900 tracking-tight">
                        {order.orderNumber || order.orderId || 'VK-20260804-000013'}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full">
                          {order.deliveryType || 'Scheduled delivery'}
                        </span>
                        <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-2.5 py-0.5 rounded-full">
                          {order.paymentMode || 'COD'}
                        </span>
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-full">
                          {order.timeSlot || 'Today'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button className="w-9 h-9 rounded-2xl bg-[#00891D] text-white flex items-center justify-center shadow-sm group-hover:bg-[#007318] transition-all flex-shrink-0">
                    <ArrowRight size={16} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Middle Inner Grey Box */}
                <div className="bg-slate-50/70 rounded-2xl p-3.5 flex items-center justify-between">
                  {/* Customer Info */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-gray-400">Customer</p>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-100/80 text-[#00891D] flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {initial}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 leading-tight">{cName}</p>
                        <p className="text-[10px] font-medium text-gray-400">{order.phone || order.customer?.phone || '9393479928'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Amount Info */}
                  <div className="text-right space-y-0.5">
                    <p className="text-[10px] font-medium text-gray-400">Amount</p>
                    <p className="text-base font-extrabold text-gray-900 leading-tight">
                      ₹{order.totalAmount || order.amount || 0}
                    </p>
                    <p className="text-[10px] font-medium text-gray-400">
                      {order.itemsCount || order.items?.length || 1} Items
                    </p>
                  </div>
                </div>

                {/* Bottom Address Row */}
                <div className="flex items-start gap-2 pt-0.5 text-gray-500">
                  <MapPin size={15} className="text-gray-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] font-normal text-gray-500 leading-relaxed">
                    {order.address || order.shippingAddress?.addressLine1 || 'Indra Nagar Colony, Parigi'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Approved Requests Section ── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-extrabold text-gray-900">Approved Requests</h3>
          <button
            onClick={() => navigate('/vsms/agent-portal/activity-logs')}
            className="text-xs font-bold text-[#00891D] hover:underline flex items-center gap-1"
          >
            View All →
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100">
          {/* 1. Refill Approved */}
          <div className="p-4 flex items-start gap-3 hover:bg-gray-50/50 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <RefreshCw size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-gray-900">Refill Approved</h4>
                <span className="text-[10px] font-medium text-gray-400">10:30 AM</span>
              </div>
              <p className="text-[11px] font-bold text-gray-500 mt-0.5">Rice Refill Request</p>
              <p className="text-[11px] text-gray-400">120 Kg approved for Vehicle TS09 AB4521</p>
              <div className="mt-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-full">
                  • APPROVED
                </span>
              </div>
            </div>
          </div>

          {/* 2. Return Approved */}
          <div className="p-4 flex items-start gap-3 hover:bg-gray-50/50 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <RotateCcw size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-gray-900">Return Approved</h4>
                <span className="text-[10px] font-medium text-gray-400">Yesterday</span>
              </div>
              <p className="text-[11px] font-bold text-gray-500 mt-0.5">Return Request #RET-1032</p>
              <p className="text-[11px] text-gray-400">12 Items approved for return</p>
              <div className="mt-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-full">
                  • APPROVED
                </span>
              </div>
            </div>
          </div>

          {/* 3. Damage Request Rejected */}
          <div className="p-4 flex items-start gap-3 hover:bg-gray-50/50 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-gray-900">Damage Request Rejected</h4>
                <span className="text-[10px] font-medium text-gray-400">09:45 AM</span>
              </div>
              <p className="text-[11px] font-bold text-gray-500 mt-0.5">Oil Bottle Damage</p>
              <p className="text-[11px] text-gray-400">Reason: Photo not clear</p>
              <div className="mt-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-rose-50 text-rose-500 px-2.5 py-0.5 rounded-full">
                  • REJECTED
                </span>
              </div>
            </div>
          </div>

          {/* 4. Expense Approved */}
          <div className="p-4 flex items-start gap-3 hover:bg-gray-50/50 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Gift size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-gray-900">Expense Approved</h4>
                <span className="text-[10px] font-medium text-gray-400">Today</span>
              </div>
              <p className="text-[11px] font-bold text-gray-500 mt-0.5">Fuel Expense</p>
              <p className="text-[11px] text-gray-400">₹1,250 approved</p>
              <div className="mt-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-full">
                  • APPROVED
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPunchOutModal && (
        <PunchOutModal
          onClose={() => setShowPunchOutModal(false)}
          onPunchOut={() => {
            setShowPunchOutModal(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
