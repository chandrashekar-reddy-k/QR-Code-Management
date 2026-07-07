import { useState, useEffect } from "react";

import {
  ShoppingBag,
  Package,
  CheckCircle,
  AlertTriangle,
  Clock,
  Bell,
  ChevronRight,
  Truck,
  XCircle,
  RotateCcw,
  IndianRupee,
  ClipboardList,
} from "lucide-react";
import axios from "axios";
import api from "../../api/axios";

const adminApi = axios.create({
  baseURL: import.meta.env.VITE_ADMIN_URL || "http://localhost:3001/api/v1",
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

import { useSocket } from "../../hooks/useSocket";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface DashboardProps {
  onNavigate: (screen: string, data?: unknown) => void;
  isAdmin?: boolean;
}

const isSLABreached = (order: any): boolean => {
  if (!order.shopkeeper_accepted_at) return false;
  if (order.status === 'dispatched' || order.status === 'delivered') {
    if (!order.dispatched_at) return false;
    const elapsed = (new Date(order.dispatched_at).getTime() - new Date(order.shopkeeper_accepted_at).getTime()) / 60000;
    return elapsed > (order.sla_minutes ?? 30);
  }
  const elapsed = (Date.now() - new Date(order.shopkeeper_accepted_at).getTime()) / 60000;
  return elapsed > (order.sla_minutes ?? 30);
};

const getLatestActivityTime = (order: any): number => {
  const fields = [
    order.dispatchedAt,
    order.dispatched_at,
    order.packedAt,
    order.packing_completed_at,
    order.pickedAt,
    order.picking_completed_at,
    order.readyAt,
    order.updatedAt,
    order.updated_at
  ];
  let latest = 0;
  for (const val of fields) {
    if (val) {
      const ms = new Date(val).getTime();
      if (!isNaN(ms) && ms > latest) {
        latest = ms;
      }
    }
  }
  if (latest === 0) {
    const fallbackVal = order.createdAt || order.created_at;
    if (fallbackVal) {
      const ms = new Date(fallbackVal).getTime();
      if (!isNaN(ms)) {
        latest = ms;
      }
    }
  }
  return latest;
};

interface KPICardProps {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  bg: string;
  onClick?: () => void;
}

function KPICard({ label, value, icon: Icon, color, bg, onClick }: KPICardProps) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`rounded-2xl p-2.5 flex flex-col items-center gap-1 shadow-sm border border-gray-100 bg-white w-full ${onClick ? 'hover:scale-105 active:scale-95 transition-transform' : 'cursor-default'}`}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: bg }}>
        <Icon size={18} color={color} />
      </div>
      <span className="text-gray-900" style={{ fontWeight: 700, fontSize: "15px", lineHeight: 1 }}>{value}</span>
      <span className="text-gray-500 text-center leading-tight" style={{ fontSize: "9px" }}>{label}</span>
    </button>
  );
}

export function Dashboard({ onNavigate, isAdmin = false }: DashboardProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [shopkeepers, setShopkeepers] = useState<any[]>([]);

  const fetchShopkeepers = async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get('/shopkeepers');
      setShopkeepers(res.data || []);
    } catch (err) {
      console.error("Failed to load active shopkeepers", err);
    }
  };
  const [stats, setStats] = useState<any>({
    newOrders: 0,
    picking: 0,
    packing: 0,
    ready: 0,
    slaAlerts: 0,
    todaySummary: {
      total: 0,
      completed: 0,
      inProgress: 0,
      dispatched: 0,
      rejected: 0,
      breached: 0
    }
  });

  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [userName, setUserName] = useState("Shopkeeper");

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed?.name) {
          setUserName(parsed.name);
        }
      }
    } catch (err) {
      console.error("Failed to load user name in Dashboard", err);
    }
  }, []);
  // Using store ID 1 as defined in our DB schema
  const socket = useSocket(1);

  const fetchDashboardData = async () => {
    try {
      // In a real app we would have an endpoint specifically for this,
      // Since we only have /orders right now, let's derive it or fetch /orders and aggregate locally for demo
      const res = await adminApi.get('/orders');
      const resData = res.data;
      let allOrders: any[] = [];
      if (Array.isArray(resData)) {
        allOrders = resData;
      } else if (resData && Array.isArray(resData.data)) {
        allOrders = resData.data;
      } else if (resData && resData.data && Array.isArray(resData.data.orders)) {
        allOrders = resData.data.orders;
      } else if (resData && Array.isArray(resData.orders)) {
        allOrders = resData.orders;
      }

      // Staff Login shopkeeper dashboard remains unchanged (only shows assigned orders)
      if (!isAdmin) {
        const storedUser = localStorage.getItem("user");
        const user = storedUser ? JSON.parse(storedUser) : null;
        const userPhone = user?.phone;
        if (userPhone) {
          allOrders = allOrders.filter(
            (o: any) =>
              o.assignedShopkeeper?.phone === userPhone ||
              o.assigned_shopkeeper?.phone === userPhone ||
              o.shopkeeper_phone === userPhone
          );
        }
      }

      setOrders(allOrders);

      const newOrders = allOrders.filter((o: any) => {
        const s = o.status?.toLowerCase();
        return s === 'new';
      }).length;
      const picking = allOrders.filter((o: any) => {
        const s = o.status?.toLowerCase();
        return s === 'accepted' || s === 'picking' || s === 'confirmed';
      }).length;
      const packing = allOrders.filter((o: any) => {
        const s = o.status?.toLowerCase();
        return s === 'packing' || s === 'processing';
      }).length;
      const ready = allOrders.filter((o: any) => {
        const s = o.status?.toLowerCase();
        return s === 'ready';
      }).length;

      const completed = allOrders.filter((o: any) => {
        const s = o.status?.toLowerCase();
        return s === 'delivered' || s === 'completed';
      }).length;

      const inProgress = allOrders.filter((o: any) => {
        const s = o.status?.toLowerCase();
        return s === 'picking' || s === 'packing';
      }).length;

      const dispatched = allOrders.filter((o: any) => {
        const s = o.status?.toLowerCase();
        return s === 'dispatched';
      }).length;

      const rejected = allOrders.filter((o: any) => {
        const s = o.status?.toLowerCase();
        return s === 'rejected' || s === 'cancelled';
      }).length;

      const breached = allOrders.filter((o: any) => {
        const acceptedAtStr = o.shopkeeperAcceptedAt || o.shopkeeper_accepted_at || o.acceptedByShopkeeperAt;
        if (!acceptedAtStr) return false;

        const s = o.status?.toLowerCase();
        if (s === 'dispatched' || s === 'delivered' || s === 'completed' || s === 'cancelled' || s === 'rejected') {
          return false;
        }

        const acceptedAt = new Date(acceptedAtStr).getTime();
        const elapsedMinutes = (Date.now() - acceptedAt) / 60000;
        const slaMinutes = o.sla_minutes ?? 30;
        const remaining = slaMinutes - elapsedMinutes;

        return remaining < 15;
      }).length;

      setStats({
        newOrders,
        picking,
        packing,
        ready,
        slaAlerts: breached,
        todaySummary: {
          total: allOrders.length,
          completed: completed,
          inProgress: inProgress,
          dispatched: dispatched,
          rejected: rejected,
          breached: breached
        }
      });

      const sortedOrders = [...allOrders].sort((a, b) => getLatestActivityTime(b) - getLatestActivityTime(a));
      setRecentOrders(sortedOrders.slice(0, 5));
      if (isAdmin) {
        fetchShopkeepers();
      }
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    if (isAdmin) {
      fetchShopkeepers();
    }

    const slaTimer = setInterval(() => {
      fetchDashboardData();
      if (isAdmin) {
        fetchShopkeepers();
      }
    }, 30000);

    if (socket.current) {
      socket.current.on('order:new', fetchDashboardData);
      socket.current.on('order:status', fetchDashboardData);
    }
    return () => {

      clearInterval(slaTimer);

      if (socket.current) {
        socket.current.off('order:new');
        socket.current.off('order:status');
      }
    };
  }, [socket.current, isAdmin]);

  useEffect(() => {
    const localSlaTimer = setInterval(() => {
      if (orders.length === 0) return;
      setStats((prev: any) => {
        const breached = orders.filter((o: any) => {
          const acceptedAtStr = o.shopkeeperAcceptedAt || o.shopkeeper_accepted_at || o.acceptedByShopkeeperAt;
          if (!acceptedAtStr) return false;

          const s = o.status?.toLowerCase();
          if (s === 'dispatched' || s === 'delivered' || s === 'completed' || s === 'cancelled' || s === 'rejected') {
            return false;
          }

          const acceptedAt = new Date(acceptedAtStr).getTime();
          const elapsedMinutes = (Date.now() - acceptedAt) / 60000;
          const slaMinutes = o.sla_minutes ?? 30;
          const remaining = slaMinutes - elapsedMinutes;

          return remaining < 15;
        }).length;

        if (prev.slaAlerts === breached) return prev;
        return {
          ...prev,
          slaAlerts: breached,
          todaySummary: {
            ...prev.todaySummary,
            breached: breached
          }
        };
      });
    }, 60000);

    return () => clearInterval(localSlaTimer);
  }, [orders]);

  const isToday = (dateVal: string | Date | undefined) => {
    if (!dateVal) return false;
    const d = new Date(dateVal);
    const today = new Date();
    return d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
  };

  const todayOrders = orders.filter((o: any) => isToday(o.createdAt || o.created_at));

  const dispatchedTodayOrders = orders.filter((o: any) => {
    const isDispatched = o.status?.toLowerCase() === 'dispatched';
    const dispatchTime = o.deliveredAt || o.delivered_at || o.dispatchedAt || o.dispatched_at || o.createdAt || o.created_at;
    return isDispatched && isToday(dispatchTime);
  });

  const rejectedToday = todayOrders.filter((o: any) => {
    const s = o.status?.toLowerCase();
    return s === 'rejected' || s === 'cancelled';
  }).length;

  const returnsToday = todayOrders.filter((o: any) => {
    const s = o.status?.toLowerCase();
    return s === 'return' || s === 'returned';
  }).length;

  const todayRevenue = dispatchedTodayOrders.reduce((sum: number, o: any) => sum + (Number(o.total_value) || Number(o.totalAmount) || Number(o.total_amount) || 0), 0);

  const totalDispatched = orders.filter((o: any) => o.status?.toLowerCase() === 'dispatched').length;

  const kpiCards = [
    { label: "Total Orders", value: orders.length, icon: ClipboardList, color: "#4F46E5", bg: "#EEF2FF", screen: "all-orders" },
    { label: "New Orders", value: stats.newOrders, icon: ShoppingBag, color: "#1565C0", bg: "#E3F2FD", screen: "new-orders" },
    { label: "Picking", value: stats.picking, icon: Package, color: "#6A1B9A", bg: "#F3E5F5", screen: "picking-queue" },
    { label: "Packing", value: stats.packing, icon: Package, color: "#E65100", bg: "#FFF3E0", screen: "packing-queue" },
    { label: "Ready", value: stats.ready, icon: CheckCircle, color: "#14B8A6", bg: "#E8F5E9", screen: "ready-orders" },
  ];

  const secondRowKpis = [
    { label: "Dispatched", value: totalDispatched, icon: Truck, color: "#2E7D32", bg: "#E8F5E9", screen: "all-orders", statusFilter: "DISPATCHED" },
    { label: "Rejected", value: rejectedToday, icon: XCircle, color: "#EF4444", bg: "#FFEBEE", screen: "all-orders", statusFilter: "REJECTED" },
    { label: "SLA Alerts", value: stats.slaAlerts, icon: AlertTriangle, color: "#D32F2F", bg: "#FFEBEE", screen: "sla-monitoring" },
    { label: "Returns", value: returnsToday, icon: RotateCcw, color: "#607D8B", bg: "#ECEFF1", screen: "returns" },
    { label: "Revenue", value: `₹${todayRevenue}`, icon: IndianRupee, color: "#F59E0B", bg: "#FEF3C7" },
  ];

  const getWeeklyPerformanceData = () => {
    const daysShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const orderedDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    const now = new Date();
    const todayDayIndex = now.getDay();
    const todayShort = daysShort[todayDayIndex];

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();

    const daysToSubtract = todayDayIndex === 0 ? 6 : todayDayIndex - 1;
    const monday = new Date(currentYear, currentMonth, currentDate - daysToSubtract);

    return orderedDays.map((dayName, idx) => {
      const targetDate = new Date(monday.getTime() + idx * 24 * 60 * 60 * 1000);
      const targetDayStr = targetDate.toDateString();

      const dayOrders = orders.filter((o: any) => {
        const oDateVal = o.createdAt || o.created_at;
        if (!oDateVal) return false;
        const oDate = new Date(oDateVal);
        return oDate.toDateString() === targetDayStr;
      });

      const total = dayOrders.length;
      const completed = dayOrders.filter((o: any) => {
        const s = o.status?.toLowerCase();
        return s === 'delivered' || s === 'completed';
      }).length;

      const breached = dayOrders.filter((o: any) => {
        const isCompleted = o.status?.toLowerCase() === 'delivered' || o.status?.toLowerCase() === 'completed';
        return isSLABreached(o) && !isCompleted;
      }).length;

      const isToday = dayName === (todayShort === "Sun" ? "Sun" : todayShort);

      return {
        name: dayName,
        total,
        completed,
        breached,
        isToday,
      };
    });
  };

  const weeklyData = getWeeklyPerformanceData();
  const totalOrdersThisWeek = weeklyData.reduce((sum: number, item: any) => sum + item.total, 0);

  const WeeklyTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          className="bg-white p-3 shadow-sm text-left flex flex-col gap-1 border-0"
          style={{
            borderRadius: "10px",
            border: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            fontSize: "12px"
          }}
        >
          <p className="font-semibold text-gray-800">{data.name}</p>
          <p className="text-gray-600">{data.total} orders</p>
        </div>
      );
    }
    return null;
  };

  const CustomXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const dayName = payload.value;
    const isToday = weeklyData.find((d: any) => d.name === dayName)?.isToday;
    return (
      <text
        x={x}
        y={y + 16}
        textAnchor="middle"
        fill={isToday ? "#2E7D32" : "#9E9E9E"}
        fontSize={11}
        fontWeight={isToday ? 700 : undefined}
      >
        {dayName}
      </text>
    );
  };

  const renderBarLabel = (props: any) => {
    const { x, y, width, value, index } = props;
    if (value <= 0) return null;

    const entry = weeklyData[index];
    const isToday = entry?.isToday;
    const color = isToday ? "#22c55e" : "#2E7D32";

    return (
      <text
        x={x + width / 2}
        y={y - 8}
        fill={color}
        fontSize={11}
        fontWeight={600}
        textAnchor="middle"
      >
        {value}
      </text>
    );
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F7FA]">
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #00891D 0%, #006614 100%)" }} className="px-4 pt-12 pb-6">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-white/70 text-sm">{getGreeting()}, {userName} 👋</p>
            <h1 className="text-white text-xl" style={{ fontWeight: 700 }}>Hyderabad Store 01</h1>
          </div>
          <button onClick={() => onNavigate("new-orders")}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center relative hover:bg-white/30 transition-colors">
            <Bell size={20} color="white" />
            {stats.newOrders > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center" style={{ fontSize: "10px", fontWeight: 700 }}>
                {stats.newOrders}
              </span>
            )}
          </button>
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <div className="w-2 h-2 rounded-full bg-green-400"></div>
          <span className="text-white/80 text-xs">Store Open · Avg Processing 18 min</span>
        </div>
      </div>

      {/* KPI Cards - horizontal scroll */}
      <div className="px-4 -mt-3">
        <div className="grid grid-cols-5 gap-2">
          {kpiCards.map((kpi) => (
            <KPICard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              icon={kpi.icon}
              color={kpi.color}
              bg={kpi.bg}
              onClick={() => onNavigate(kpi.screen)}
            />
          ))}
        </div>
      </div>

      {/* KPI Cards Row 2 */}
      <div className="px-4 mt-2">
        <div className="grid grid-cols-5 gap-2">
          {secondRowKpis.map((kpi) => (
            <KPICard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              icon={kpi.icon}
              color={kpi.color}
              bg={kpi.bg}
              onClick={
                kpi.screen
                  ? () => onNavigate(kpi.screen, (kpi as any).statusFilter)
                  : undefined
              }
            />
          ))}
        </div>
      </div>

      {/* Weekly Performance Chart */}
      <div className="px-4 mt-4">
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-5 shadow-sm border border-gray-100 border-l-4 border-l-[#2E7D32]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-800 text-sm">Weekly Performance</h3>
              <p className="text-xs text-gray-400 mt-0.5">This Week · Mon–Sun</p>
            </div>
            <span className="bg-green-50 text-green-700 text-xs font-semibold rounded-full px-2.5 py-0.5">
              {totalOrdersThisWeek} orders this week
            </span>
          </div>
          <div className="w-full outline-none focus:outline-none" style={{ outline: 'none' }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={weeklyData}
                margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                style={{ outline: 'none' }}
              >
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#F5F5F5" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={<CustomXAxisTick />}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#BDBDBD', fontSize: 11 }}
                />
                <Tooltip content={<WeeklyTooltip />} cursor={{ fill: '#F9FAFB', opacity: 0.4 }} />
                <Bar
                  dataKey="total"
                  isAnimationActive={true}
                  radius={[6, 6, 0, 0]}
                  barSize={44}
                  label={renderBarLabel}
                >
                  {weeklyData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.isToday ? "#22c55e" : "#2E7D32"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Active Shopkeepers Status (Only for Admin/Partner) */}
      {isAdmin && (
        <div className="px-4 mt-4">
          <div className="rounded-2xl shadow-sm border border-gray-100 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-800 text-sm">Active Shopkeepers Status</h3>
                <p className="text-xs text-gray-400 mt-0.5">Real-time status and active order allocation</p>
              </div>
              <span className="bg-[#00891D]/10 text-[#00891D] text-xs font-semibold rounded-full px-2.5 py-0.5">
                {shopkeepers.length} Active
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {shopkeepers.length === 0 ? (
                <p className="text-gray-500 text-center text-xs py-4">No active shopkeepers found.</p>
              ) : (
                shopkeepers.map((sk) => {
                  const initials = sk.name
                    ? sk.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                    : "SK";
                  const isBusy = (sk.activeOrderCount || 0) > 0;

                  return (
                    <div key={sk.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-50 bg-gray-50/30">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-[#00891D] font-bold text-sm">
                          {initials}
                        </div>
                        <div>
                          <p className="text-gray-800 font-semibold text-sm">{sk.name}</p>
                          <p className="text-gray-400 text-xs mt-0.5">
                            ID: {sk.employeeId || "N/A"} · {sk.phone}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs font-medium text-gray-600">
                            {isBusy ? "Processing Orders" : "Awaiting Allocation"}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {sk.activeOrderCount || 0} active orders
                          </p>
                        </div>
                        <span
                          className="px-2.5 py-1 rounded-full text-[11px] font-bold text-center min-w-[75px]"
                          style={{
                            backgroundColor: isBusy ? "#FFF3E0" : "#E8F5E9",
                            color: isBusy ? "#EF5A06" : "#00891D"
                          }}
                        >
                          {isBusy ? "Busy" : "Available"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="px-4 mt-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-gray-700" style={{ fontWeight: 600, fontSize: "14px" }}>Recent Orders</h3>
          <button onClick={() => onNavigate("all-orders")} className="flex items-center gap-1 text-[#00891D] hover:underline" style={{ fontSize: "12px", fontWeight: 500 }}>
            View All <ChevronRight size={14} />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {recentOrders.map((order) => {
            const statusStyles: Record<string, { color: string; bg: string }> = {
              new: { color: "#1565C0", bg: "#E3F2FD" },
              picking: { color: "#6A1B9A", bg: "#F3E5F5" },
              packing: { color: "#E65100", bg: "#FFF3E0" },
              ready: { color: "#14B8A6", bg: "#E8F5E9" },
              dispatched: { color: "#2E7D32", bg: "#E0F2F1" },
              delivered: { color: "#1B5E20", bg: "#C8E6C9" },
              cancelled: { color: "#D32F2F", bg: "#FFEBEE" },
            };

            const statusColor =
              statusStyles[order.status?.toLowerCase()]?.color || "#757575";

            const statusBg =
              statusStyles[order.status?.toLowerCase()]?.bg || "#F5F5F5";

            return (
              <button
                key={order.id}
                onClick={() => onNavigate("order-details", order)}
                className="bg-white rounded-2xl p-3.5 shadow-sm text-left flex items-center gap-3 hover:bg-gray-50 active:scale-98 transition-transform"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: statusBg }}>
                  <ShoppingBag size={18} color={statusColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-800" style={{ fontWeight: 600, fontSize: "13px" }}>{order.order_number}</span>
                    <span className="rounded-full px-2 py-0.5 uppercase" style={{ backgroundColor: statusBg, color: statusColor, fontSize: "10px", fontWeight: 600 }}>
                      {order.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-gray-500" style={{ fontSize: "11px" }}>{order.order_type} · ₹{order.total_value}</span>
                    <span className="text-gray-400" style={{ fontSize: "10px" }}>
                      {(() => {
                        const statusTimeMap: Record<string, { label: string; fields: string[] }> = {
                          new: { label: "Placed", fields: ["createdAt", "created_at"] },
                          accepted: { label: "Accepted", fields: ["acceptedByShopkeeperAt", "shopkeeperAcceptedAt", "confirmedAt", "acceptedAt", "accepted_at", "confirmed_at"] },
                          confirmed: { label: "Accepted", fields: ["acceptedByShopkeeperAt", "shopkeeperAcceptedAt", "confirmedAt", "acceptedAt", "accepted_at", "confirmed_at"] },
                          picking: { label: "Picking", fields: ["pickedAt", "picking_started_at", "pickingStartedAt"] },
                          packing: { label: "Packing", fields: ["packedAt", "packing_started_at", "packingStartedAt"] },
                          ready: { label: "Ready", fields: ["packedAt", "packing_completed_at", "packingCompletedAt"] },
                          dispatched: { label: "Dispatched", fields: ["dispatchedAt", "dispatched_at", "deliveredAt", "delivered_at"] },
                          delivered: { label: "Delivered", fields: ["dispatchedAt", "dispatched_at", "deliveredAt", "delivered_at"] },
                          cancelled: { label: "Cancelled", fields: ["updatedAt", "updated_at"] },
                        };
                        const entry = statusTimeMap[order.status?.toLowerCase()];
                        const fields = entry ? entry.fields : ["createdAt", "created_at"];
                        const label = entry?.label ?? "Placed";

                        let ts = null;
                        for (const f of fields) {
                          if (order[f] !== undefined && order[f] !== null) {
                            ts = order[f];
                            break;
                          }
                        }

                        if (!ts) {
                          return `${label}: —`;
                        }
                        const date = new Date(ts);
                        if (isNaN(date.getTime())) {
                          return `${label}: —`;
                        }

                        const time = date.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true });
                        return `${label}: ${time}`;
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock size={10} color="#9E9E9E" />
                    <span className="text-gray-400" style={{ fontSize: "10px" }}>SLA: {order.sla_minutes} min</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  );
}
