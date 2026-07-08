import { useState, useEffect } from "react";
import { useSharedOrders } from "./SharedOrdersContext";

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

const getRecentOrderTime = (order: any): number => {
  const fields = [
    order.dispatched_at,
    order.dispatchedAt,
    order.packing_completed_at,
    order.packingCompletedAt,
    order.picking_started_at,
    order.pickingStartedAt,
    order.updated_at,
    order.updatedAt,
    order.created_at,
    order.createdAt
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
  return latest;
};

interface KPICardProps {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  bg: string;
  onClick?: () => void;
  variant?: "blue" | "green" | "yellow" | "red" | "purple" | "gray";
  isAdmin?: boolean;
}

function KPICard({ label, value, icon: Icon, color, bg, onClick, isAdmin = false }: KPICardProps) {
  if (isAdmin) {
    const card = (
      <div
        className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
        style={{
          boxShadow: "0px 0px 12px rgba(0,0,0,0.05)",
          minHeight: "134px"
        }}
      >
        <div className="flex justify-between items-start w-full">
          <div className="flex-1 min-w-0 pr-2">
            <p className="text-[12px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">{label}</p>
            <h3 className="text-[24px] font-bold text-slate-800 dark:text-slate-100 mt-2 leading-none">
              {value}
            </h3>
          </div>
          <div
            className="w-[56px] h-[56px] rounded-[16px] flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: bg }}
          >
            <Icon size={24} color={color} />
          </div>
        </div>
      </div>
    );

    if (onClick) {
      return (
        <button
          onClick={onClick}
          className="w-full text-left transition-all duration-200 hover:scale-[1.02] active:scale-98"
        >
          {card}
        </button>
      );
    }

    return card;
  }

  // Original staff login card layout
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

  const storedUser = localStorage.getItem("user");
  const userObj = storedUser ? JSON.parse(storedUser) : null;
  const userRole = userObj?.role;
  const shouldShowShopkeeper = ["PARTNER", "STORE_MANAGER", "ADMIN"].includes(userRole);

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

  const { orders: sharedOrders } = useSharedOrders();

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

  const calculateStats = () => {
    let allOrders = [...sharedOrders];

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

    const sortedOrders = [...allOrders].sort((a, b) => getRecentOrderTime(b) - getRecentOrderTime(a));
    setRecentOrders(sortedOrders.slice(0, 5));
  };

  useEffect(() => {
    calculateStats();
  }, [sharedOrders]);

  useEffect(() => {
    if (isAdmin) {
      fetchShopkeepers();
      const interval = setInterval(fetchShopkeepers, 30000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

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


  const rejectedToday = todayOrders.filter((o: any) => {
    const s = o.status?.toLowerCase();
    return s === 'rejected' || s === 'cancelled';
  }).length;

  const returnsToday = todayOrders.filter((o: any) => {
    const s = o.status?.toLowerCase();
    return s === 'return' || s === 'returned';
  }).length;

  const allDispatchedOrders = orders.filter((o: any) => o.status?.toLowerCase() === 'dispatched');

  useEffect(() => {
    if (allDispatchedOrders.length > 0) {
      console.log("Dispatched orders amount check:", allDispatchedOrders.map((o: any) => ({
        id: o.id,
        order_number: o.order_number,
        total_value: o.total_value,
        totalAmount: o.totalAmount,
        total_amount: o.total_amount
      })));
    }
  }, [orders]);

  const todayRevenue = allDispatchedOrders.reduce((sum: number, o: any) => sum + (Number(o.total_value) || Number(o.totalAmount) || Number(o.total_amount) || 0), 0);

  const totalDispatched = allDispatchedOrders.length;

  const kpiCards = [
    { label: "Total Orders", value: orders.length, icon: ClipboardList, color: "#4F46E5", bg: "#EEF2FF", screen: "all-orders", variant: "purple" as const },
    { label: "New Orders", value: stats.newOrders, icon: ShoppingBag, color: "#1565C0", bg: "#E3F2FD", screen: "new-orders", variant: "blue" as const },
    { label: "Picking", value: stats.picking, icon: Package, color: "#6A1B9A", bg: "#F3E5F5", screen: "picking-queue", variant: "purple" as const },
    { label: "Packing", value: stats.packing, icon: Package, color: "#E65100", bg: "#FFF3E0", screen: "packing-queue", variant: "yellow" as const },
    { label: "Ready", value: stats.ready, icon: CheckCircle, color: "#14B8A6", bg: "#E8F5E9", screen: "ready-orders", variant: "green" as const },
  ];

  const secondRowKpis = [
    { label: "Dispatched", value: totalDispatched, icon: Truck, color: "#2E7D32", bg: "#E8F5E9", screen: "all-orders", statusFilter: "DISPATCHED", variant: "green" as const },
    { label: "Rejected", value: rejectedToday, icon: XCircle, color: "#EF4444", bg: "#FFEBEE", screen: "all-orders", statusFilter: "REJECTED", variant: "red" as const },
    { label: "SLA Alerts", value: stats.slaAlerts, icon: AlertTriangle, color: "#D32F2F", bg: "#FFEBEE", screen: "sla-monitoring", variant: "red" as const },
    { label: "Returns", value: returnsToday, icon: RotateCcw, color: "#607D8B", bg: "#ECEFF1", screen: "returns", variant: "gray" as const },
    { label: "Revenue", value: `₹${todayRevenue}`, icon: IndianRupee, color: "#F59E0B", bg: "#FEF3C7", variant: "yellow" as const },
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

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] p-[32px] flex justify-center">
        <div className="w-full max-w-[1440px] flex flex-col gap-[24px]" style={{ fontFamily: "Segoe UI, Inter, sans-serif" }}>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-[#9EA3AE] font-normal">
            <span>Home</span>
            <span>→</span>
            <span>Shopkeeper ERP</span>
            <span>→</span>
            <span className="text-[#111827]">Dashboard</span>
          </div>

          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[#111827] font-bold text-[32px] leading-tight">
                Shopkeeper Dashboard
              </h1>
              <p className="text-[#9EA3AE] text-[14px] mt-1 font-normal">
                Real-time store operations overview
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Active / Store status badge */}
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-gray-100 shadow-sm text-xs font-semibold text-gray-700">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>
                  {shopkeepers.filter((s: any) => s.status?.toLowerCase() !== 'offline').length} Shopkeepers Active
                </span>
              </div>
            </div>
          </div>

          {/* Row 1 of KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-[24px]">
            {kpiCards.map((kpi) => (
              <KPICard
                key={kpi.label}
                label={kpi.label}
                value={kpi.value}
                icon={kpi.icon}
                color={kpi.color}
                bg={kpi.bg}
                onClick={() => onNavigate(kpi.screen)}
                variant={kpi.variant}
                isAdmin={true}
              />
            ))}
          </div>

          {/* Row 2 of KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-[24px]">
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
                variant={kpi.variant}
                isAdmin={true}
              />
            ))}
          </div>

          {/* Active Shopkeepers and Weekly Performance Chart Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[24px] items-stretch">
            {/* Active Shopkeepers Status */}
            <div className="bg-white rounded-[16px] p-[24px] flex flex-col justify-between h-full" style={{ boxShadow: "0px 0px 12px rgba(0,0,0,0.05)" }}>
              <div>
                <h3 className="text-[#111827] text-[16px] font-semibold mb-4">Active Shopkeepers Status</h3>
                <div className="overflow-x-hidden rounded-[16px] border border-gray-100">
                  <table className="w-full border-collapse table-fixed">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100" style={{ height: "64px" }}>
                        <th className="text-left pl-[12px] pr-[4px] py-[16px] text-[12px] font-medium text-[#9EA3AE] uppercase tracking-wider w-[10%]">Avatar</th>
                        <th className="text-left pl-[32px] pr-[12px] py-[16px] text-[12px] font-medium text-[#9EA3AE] uppercase tracking-wider w-[30%]">Name</th>
                        <th className="text-left px-[12px] py-[16px] text-[12px] font-medium text-[#9EA3AE] uppercase tracking-wider w-[25%]">Phone</th>
                        <th className="text-left px-[12px] py-[16px] text-[12px] font-medium text-[#9EA3AE] uppercase tracking-wider w-[15%]">Active</th>
                        <th className="text-left px-[12px] py-[16px] text-[12px] font-medium text-[#9EA3AE] uppercase tracking-wider w-[20%]">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {shopkeepers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-gray-500 text-center text-xs py-8">No active shopkeepers found.</td>
                        </tr>
                      ) : (
                        shopkeepers.map((sk) => {
                          const initials = sk.name
                            ? sk.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                            : "SK";
                          const isBusy = (sk.activeOrderCount || 0) > 0;

                          return (
                            <tr key={sk.id} className="hover:bg-[#F9FAFB] transition-colors" style={{ height: "72px" }}>
                              <td className="px-[12px] py-[16px] whitespace-nowrap">
                                <div className="w-[40px] h-[40px] rounded-full bg-green-50 text-[#00891D] flex items-center justify-center font-bold text-sm border border-green-100">
                                  {initials}
                                </div>
                              </td>
                              <td className="py-[16px] whitespace-nowrap pl-[32px] pr-[12px]">
                                <div className="text-sm font-semibold text-gray-900 truncate max-w-full">{sk.name}</div>
                                <div className="text-[10px] text-[#9EA3AE]">ID: {sk.employeeId || "N/A"}</div>
                              </td>
                              <td className="px-[12px] py-[16px] whitespace-nowrap text-sm text-gray-600">
                                {sk.phone}
                              </td>
                              <td className="px-[12px] py-[16px] whitespace-nowrap text-sm text-gray-900 font-medium">
                                {sk.activeOrderCount || 0}
                              </td>
                              <td className="px-[12px] py-[16px] whitespace-nowrap">
                                <span
                                  className="inline-flex items-center justify-center px-2 py-1 rounded-full text-[11px] font-semibold w-full text-center"
                                  style={{
                                    backgroundColor: isBusy ? "#FFEACC" : "#E8F5E9",
                                    color: isBusy ? "#EA580C" : "#00891D"
                                  }}
                                >
                                  {isBusy ? "Busy" : "Available"}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Weekly Performance Chart */}
            <div className="bg-white rounded-[16px] p-[24px] flex flex-col justify-between h-full" style={{ boxShadow: "0px 0px 12px rgba(0,0,0,0.05)" }}>
              <div>
                <div className="mb-4">
                  <h3 className="text-[#111827] text-[16px] font-semibold">Weekly Performance</h3>
                  <p className="text-[#9EA3AE] text-[12px] mt-0.5">This Week · Mon–Sun</p>
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
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-[16px] p-[24px] flex flex-col" style={{ boxShadow: "0px 0px 12px rgba(0,0,0,0.05)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#111827] text-[16px] font-semibold">Recent Orders</h3>
              <button onClick={() => onNavigate("all-orders")} className="text-[#00891D] hover:underline text-sm font-semibold flex items-center gap-1">
                View All <ChevronRight size={16} />
              </button>
            </div>
            <div className="overflow-x-auto rounded-[16px] border border-gray-100">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100" style={{ height: "64px" }}>
                    <th className="text-left px-[24px] py-[16px] text-[12px] font-medium text-[#9EA3AE] uppercase tracking-wider">Order Number</th>
                    <th className="text-left px-[24px] py-[16px] text-[12px] font-medium text-[#9EA3AE] uppercase tracking-wider">Customer</th>
                    <th className="text-left px-[24px] py-[16px] text-[12px] font-medium text-[#9EA3AE] uppercase tracking-wider">Shopkeeper</th>
                    <th className="text-left px-[24px] py-[16px] text-[12px] font-medium text-[#9EA3AE] uppercase tracking-wider">Status</th>
                    <th className="text-left px-[24px] py-[16px] text-[12px] font-medium text-[#9EA3AE] uppercase tracking-wider">Amount</th>
                    <th className="text-left px-[24px] py-[16px] text-[12px] font-medium text-[#9EA3AE] uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentOrders.map((order) => {
                    const statusStyles: Record<string, { color: string; bg: string }> = {
                      new: { color: "#1D4ED8", bg: "#DBEAFE" },
                      picking: { color: "#7C3AED", bg: "#EDE9FE" },
                      packing: { color: "#D97706", bg: "#FEF3C7" },
                      ready: { color: "#0F766E", bg: "#CCFBF1" },
                      dispatched: { color: "#15803D", bg: "#DCFCE7" },
                      delivered: { color: "#1B5E20", bg: "#C8E6C9" },
                      cancelled: { color: "#D32F2F", bg: "#FFEBEE" },
                    };
                    const statusColor = statusStyles[order.status?.toLowerCase()]?.color || "#757575";
                    const statusBg = statusStyles[order.status?.toLowerCase()]?.bg || "#F5F5F5";

                    // Calculate time text
                    const timeText = (() => {
                      const statusTimeMap: Record<string, { label: string; fields: string[] }> = {
                        new: { label: "Placed", fields: ["createdAt", "created_at"] },
                        accepted: { label: "Accepted", fields: ["acceptedByShopkeeperAt", "shopkeeperAcceptedAt", "confirmedAt", "acceptedAt", "accepted_at", "confirmed_at"] },
                        confirmed: { label: "Accepted", fields: ["acceptedByShopkeeperAt", "shopkeeperAcceptedAt", "confirmedAt", "acceptedAt", "accepted_at", "confirmed_at"] },
                        picking: { label: "Picking", fields: ["pickedAt", "picking_started_at", "pickingStartedAt"] },
                        packing: { label: "Packing", fields: ["packedAt", "picking_started_at", "packingStartedAt"] },
                        ready: { label: "Ready", fields: ["packedAt", "packing_completed_at", "packingCompletedAt"] },
                        dispatched: { label: "Dispatched", fields: ["dispatchedAt", "dispatched_at", "deliveredAt", "delivered_at"] },
                        delivered: { label: "Delivered", fields: ["dispatchedAt", "dispatched_at", "deliveredAt", "delivered_at"] },
                        cancelled: { label: "Cancelled", fields: ["updatedAt", "updated_at"] },
                      };
                      const entry = statusTimeMap[order.status?.toLowerCase()];
                      const fields = entry ? entry.fields : ["createdAt", "created_at"];

                      let ts = null;
                      for (const f of fields) {
                        if (order[f] !== undefined && order[f] !== null) {
                          ts = order[f];
                          break;
                        }
                      }

                      if (!ts) return "—";
                      const date = new Date(ts);
                      if (isNaN(date.getTime())) return "—";
                      return date.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true });
                    })();

                    return (
                      <tr
                        key={order.id}
                        onClick={() => onNavigate("order-details", order)}
                        className="hover:bg-[#F9FAFB] cursor-pointer transition-colors"
                        style={{ height: "72px" }}
                      >
                        <td className="px-[24px] py-[16px] whitespace-nowrap text-sm font-semibold text-gray-900">
                          {order.order_number}
                        </td>
                        <td className="px-[24px] py-[16px] whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">{order.customer_name || order.user}</div>
                          <div className="text-xs text-[#9EA3AE]">{order.phone}</div>
                        </td>
                        <td className="px-[24px] py-[16px] whitespace-nowrap text-sm text-gray-700">
                          {order.shopkeeper_name ? (
                            order.shopkeeper_name
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[12px] font-semibold bg-[#FEF3C7] text-[#D97706]">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="px-[24px] py-[16px] whitespace-nowrap">
                          <span
                            className="px-2.5 py-1 rounded-full text-[12px] font-semibold uppercase tracking-wider inline-flex items-center justify-center"
                            style={{ backgroundColor: statusBg, color: statusColor }}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="px-[24px] py-[16px] whitespace-nowrap text-sm font-bold text-gray-900">
                          ₹{order.total_value}
                        </td>
                        <td className="px-[24px] py-[16px] whitespace-nowrap text-xs text-[#9EA3AE]">
                          {timeText}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // Original Staff Mobile Dashboard View
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
          <span className="text-white/80 text-xs">
            Store Open · Avg Processing 18 min
          </span>
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
              isAdmin={false}
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
              isAdmin={false}
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
                    <div className="flex flex-col items-end">
                      <span className="rounded-full px-2 py-0.5 uppercase" style={{ backgroundColor: statusBg, color: statusColor, fontSize: "10px", fontWeight: 600 }}>
                        {order.status}
                      </span>
                      {shouldShowShopkeeper && (
                        <span className="text-[10px] text-gray-400 mt-0.5">
                          {order.shopkeeper_name || "Unassigned"}
                        </span>
                      )}
                    </div>
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
                          packing: { label: "Packing", fields: ["packedAt", "picking_started_at", "packingStartedAt"] },
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
