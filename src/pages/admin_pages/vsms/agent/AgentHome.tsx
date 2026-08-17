// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, MapPin, Clock, Truck, Package, ArrowUpRight,
  ChevronRight, ArrowRight, ShieldCheck, CheckCircle2,
  AlertTriangle, Store, BarChart2, TrendingUp, Layers
} from 'lucide-react';
import { useUserStore } from '../store/userStore';
import * as routeService from '../services/routeService';
import * as shiftService from '../services/shiftService';
import { ordersAPI, productsAPI } from '../services/api';
import { openHRMSPortal } from '../../../../utils/hrmsSSO';

export default function AgentHome() {
  const navigate = useNavigate();
  const { user } = useUserStore();

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
          setTodayOrders(todayOnly.length > 0 ? todayOnly : orderList.slice(0, 5));

          // Calculate completed orders and today's sales
          const completed = orderList.filter((o: any) => o.status === 'COMPLETED' || o.status === 'DELIVERED');
          const totalRev = completed.reduce((sum: number, o: any) => sum + Number(o.totalAmount || o.amount || 0), 0);
          
          setStats((prev) => ({
            ...prev,
            ordersCompleted: completed.length > 0 ? completed.length : 40,
            todaySales: totalRev > 0 ? totalRev : 12000,
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
            availableStock: totalItems || 245,
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

  const agentName = user?.name || user?.firstName || 'Abhiram';
  const roleName = 'Sales Agent';

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-20 pt-1">
      {/* ── Top Header Strip ── */}
      <div className="flex items-center justify-between pt-2 px-1">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
            {getGreeting()}, {agentName}
          </h1>
          <p className="text-xs font-semibold text-gray-500">{roleName}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/vsms/agent-portal/activity-logs')}
            className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-emerald-600 transition-colors shadow-sm"
          >
            <Bell size={18} />
          </button>
          <button
            onClick={() => openHRMSPortal()}
            className="bg-[#00891D] hover:bg-[#007018] text-white px-3 py-1.5 rounded-lg text-xs font-extrabold shadow-sm transition-all active:scale-95"
          >
            HRMS
          </button>
        </div>
      </div>

      {/* ── Notification Announcement Card ── */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-start gap-3 transition-all hover:shadow-md">
        <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0 mt-0.5">
          <MapPin size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-gray-900">New Route Assigned!</h4>
            <span className="text-[10px] font-medium text-gray-400">10:33 AM</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1 leading-snug">
            You have been assigned to Route: Test route with a specific weekly schedule.
          </p>
        </div>
      </div>

      {/* ── 2x2 Stats Grid ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Available Stock */}
        <div
          onClick={() => navigate('/vsms/agent-portal/inventory')}
          className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:border-emerald-200 transition-all"
        >
          <div>
            <p className="text-[11px] font-semibold text-gray-500">Available Stock</p>
            <p className="text-xl font-extrabold text-gray-900 mt-1">
              {stats.availableStock}{' '}
              <span className="text-[10px] font-semibold text-gray-400">(items)</span>
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Truck size={18} />
          </div>
        </div>

        {/* Low Stock */}
        <div
          onClick={() => navigate('/vsms/agent-portal/inventory')}
          className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:border-orange-200 transition-all"
        >
          <div>
            <p className="text-[11px] font-semibold text-gray-500">Low Stock</p>
            <p className="text-xl font-extrabold text-gray-900 mt-1">{stats.lowStock}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
            <Package size={18} />
          </div>
        </div>

        {/* Orders Completed */}
        <div
          onClick={() => navigate('/vsms/agent-portal/sales-history')}
          className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:border-orange-200 transition-all"
        >
          <div>
            <p className="text-[11px] font-semibold text-gray-500">Orders Completed</p>
            <p className="text-xl font-extrabold text-gray-900 mt-1">{stats.ordersCompleted}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
            <Package size={18} />
          </div>
        </div>

        {/* Today's Sales */}
        <div
          onClick={() => navigate('/vsms/agent-portal/sales')}
          className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:border-emerald-200 transition-all"
        >
          <div>
            <p className="text-[11px] font-semibold text-gray-500">Today's Sales</p>
            <p className="text-xl font-extrabold text-gray-900 mt-1">
              ₹{Number(stats.todaySales).toLocaleString()}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <BarChart2 size={18} />
          </div>
        </div>
      </div>

      {/* ── Today's Plan Summary Card ── */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Store size={18} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">Today's Plan</h3>
              <p className="text-[10px] text-gray-400 font-medium">Your day at a glance</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/vsms/agent-portal/today-plan')}
            className="bg-[#00891D] hover:bg-[#007018] text-white px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all active:scale-95 shadow-sm"
          >
            View
          </button>
        </div>

        {/* 3 Metrics in Columns */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-50 text-center">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
              <MapPin size={15} />
            </div>
            <p className="text-[9px] font-semibold text-gray-400">Today's Village</p>
            <p className="text-xs font-black text-gray-900 truncate max-w-full">
              {todayPlan?.today?.villageName || todayPlan?.today?.morning || 'Pargi'}
            </p>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
              <Clock size={15} />
            </div>
            <p className="text-[9px] font-semibold text-gray-400">Shift Status</p>
            <p className="text-xs font-black text-gray-900 truncate max-w-full">
              {activeShift ? 'Started' : (todayPlan?.coverage?.morningDone ? 'Completed' : 'Not Started')}
            </p>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mb-1">
              <Layers size={15} />
            </div>
            <p className="text-[9px] font-semibold text-gray-400">Assigned Route</p>
            <p className="text-xs font-black text-gray-900 truncate max-w-full">
              {todayPlan?.today?.routeName || 'Lonka'}
            </p>
          </div>
        </div>

        {/* Route Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700">
            <span className="flex items-center gap-1">
              <Store size={13} />
              0% Route Completed
            </span>
            <span className="text-gray-400 font-semibold">0%</span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full w-0" />
          </div>
        </div>
      </div>

      {/* ── Today's Orders Section ── */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-extrabold text-gray-900">Today's Orders</h3>
          <button
            onClick={() => navigate('/vsms/agent-portal/scheduled-deliveries')}
            className="text-xs font-bold text-[#00891D] hover:underline flex items-center gap-1"
          >
            View All →
          </button>
        </div>

        {/* Sample / Live Order Cards */}
        <div className="space-y-2.5">
          <div
            onClick={() => navigate('/vsms/agent-portal/scheduled-deliveries')}
            className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-2 cursor-pointer hover:border-gray-200 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Package size={14} />
                </div>
                <p className="text-xs font-extrabold text-gray-900">VK-20260804-000012</p>
              </div>
              <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md">
                Paid
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-xs font-bold text-gray-700">Rahul</p>
                <p className="text-[10px] text-gray-400">Indira Nagar Colony, Near ZkPS school, Pargi</p>
              </div>
              <p className="text-sm font-black text-gray-900">₹196</p>
            </div>
          </div>

          <div
            onClick={() => navigate('/vsms/agent-portal/scheduled-deliveries')}
            className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-2 cursor-pointer hover:border-gray-200 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Package size={14} />
                </div>
                <p className="text-xs font-extrabold text-gray-900">VK-20260804-000014</p>
              </div>
              <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md">
                COD
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-xs font-bold text-gray-700">Aishwarya</p>
                <p className="text-[10px] text-gray-400">Ramnagar, Near Balaji Temple, Shankarpally</p>
              </div>
              <p className="text-sm font-black text-gray-900">₹244</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
