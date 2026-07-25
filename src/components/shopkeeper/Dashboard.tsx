import { DashboardMobile } from "./DashboardMobile";
import { useState, useEffect } from "react";
import { useSharedOrders } from "./SharedOrdersContext";
import { getSLAInfo } from "../../utils/slaHelper";

import {
  ShoppingBag,
  Package,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Truck,
  XCircle,
  RotateCcw,
  IndianRupee,
  ClipboardList,
} from "lucide-react";
import axios from "axios";
import api from "../../api/axios";
import { ViewIconButton } from "../ui";

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
  return getSLAInfo(order).isBreached;
};



const getOrderTime = (order: any): number => {
  const val = order.updatedAt || order.updated_at || order.createdAt || order.created_at || order.placedAt || order.placed_at;
  if (!val) return 0;
  const ms = new Date(val).getTime();
  return isNaN(ms) ? 0 : ms;
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
        className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
        style={{
          boxShadow: "0px 0px 12px rgba(0,0,0,0.05)",
          minHeight: "134px"
        }}
      >
        <div className="flex justify-between items-start w-full">
          <div className="flex-1 min-w-0 pr-2">
            <p className="text-[12px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider truncate">{label}</p>
            <h3 className="text-[24px] font-bold text-slate-800 dark:text-slate-100 mt-2 leading-none">
              {value}
            </h3>
          </div>
          <div
            className="w-[56px] h-[56px] rounded-[16px] flex items-center justify-center flex-shrink-0 dark:opacity-80"
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
      className={`rounded-2xl p-2.5 flex flex-col items-center gap-1 shadow-sm border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 w-full ${onClick ? 'hover:scale-105 active:scale-95 transition-transform' : 'cursor-default'}`}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: bg }}>
        <Icon size={18} color={color} />
      </div>
      <span className="text-gray-900 dark:text-gray-100" style={{ fontWeight: 700, fontSize: "15px", lineHeight: 1 }}>{value}</span>
      <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 text-center leading-tight" style={{ fontSize: "9px" }}>{label}</span>
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
    activeOrders: 0,
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
  const { orders: sharedOrders } = useSharedOrders();

  const calculateStats = () => {
    const seenIds = new Set();
    const distinctOrders = [];
    for (const o of sharedOrders) {
      const id = o.id || o.order_number;
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        distinctOrders.push(o);
      }
    }

    // Retrieve current user's warehouseId to scope dashboard orders to this store only (skip for admin)
    const cachedWh = localStorage.getItem(isAdmin ? "partnerWarehouseId" : "staffWarehouseId");
    const storedU = localStorage.getItem(isAdmin ? "partnerUser" : "staffUser");
    let userWarehouseId: string | null = null;
<<<<<<< HEAD
    if (!isAdmin) {
      if (cachedWh && cachedWh !== "undefined") {
        userWarehouseId = cachedWh;
      } else if (storedU) {
        try {
          const u = JSON.parse(storedU);
          userWarehouseId = u.warehouseId || u.warehouse_id || u.partnerWarehouseId || u.id;
        } catch (e) { }
      }
    }

    // Filter to valid orders: must have a warehouse, must match user's warehouseId if set, must not be pre-payment PENDING status
    let allOrders = distinctOrders.filter((o: any) => {
      const oWh = o.warehouseId || o.warehouse_id;
      if (!oWh) return false;

      if (userWarehouseId && oWh !== userWarehouseId) {
        return false;
      }

      const status = (o.status || "").toUpperCase();
      if (status === 'PENDING') {
        return false;
      }

      if (!isAdmin) {
        const isAssigned = o.shopkeeper_name || o.assignedShopkeeper || o.assigned_shopkeeper || o.shopkeeper_phone || o.assignedShopkeeperId;
        if (!isAssigned) {
          return false;
        }
      }

      return true;
    });

    // Staff Login shopkeeper dashboard remains unchanged (only shows assigned orders)
    if (!isAdmin) {
      const storedUser = localStorage.getItem("staffUser");
=======
    if (cachedWh && cachedWh !== "undefined") {
      userWarehouseId = cachedWh;
    } else if (storedU) {
      try {
        const u = JSON.parse(storedU);
        userWarehouseId = u.warehouseId || u.warehouse_id || u.partnerWarehouseId || null;
      } catch (e) { }
    }

    // Filter to valid orders: must have a warehouse, must match user's warehouseId if set, must not be pre-payment PENDING status, and must be assigned to a shopkeeper
    // Filter logic
    let allOrders = distinctOrders;

    if (isAdmin) {
      allOrders = distinctOrders.filter((o: any) => {
        const oWh = o.warehouseId || o.warehouse_id;
        if (!oWh) return false;
        if (userWarehouseId && oWh !== userWarehouseId) return false;
        const status = (o.status || "").toUpperCase();
        if (status === 'PENDING') return false;
        return true;
      });
    } else {
      const storedUser = sessionStorage.getItem("staffUser") || localStorage.getItem("staffUser");
>>>>>>> erp/shopweb
      const user = storedUser ? JSON.parse(storedUser) : null;
      const skId = user?.shopkeeper_id || user?.shopkeeperId || user?.id;
      if (skId) {
        allOrders = allOrders.filter(
          (o: any) =>
            o.assignedShopkeeperId === skId ||
            o.assigned_shopkeeper_id === skId
        );
      }
    }

    setOrders(allOrders);

    const newOrders = allOrders.filter((o: any) => {
      const s = o.status?.toLowerCase();
      return s === 'new' || s === 'assigned' || s === 'placed' || s === 'pending';
    }).length;

    const activeOrdersCount = allOrders.filter((o: any) => {
      const isAssigned = o.shopkeeper_phone || o.assignedShopkeeper || o.assigned_shopkeeper || o.shopkeeper_name || o.assignedShopkeeperId || o.assigned_shopkeeper_id;
      if (!isAssigned) return false;
      const s = o.status?.toLowerCase();
      return ['new', 'assigned', 'accepted', 'confirmed', 'picking', 'packing', 'processing', 'ready'].includes(s);
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
      const isHandedOver = o.allocationStatus === 'HandedOver' || o.allocation_status === 'HandedOver';
      if (isAdmin) {
        return s === 'ready' && isHandedOver;
      } else {
        return s === 'ready' && !isHandedOver;
      }
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
      const s = o.status?.toLowerCase();
      if (s === 'dispatched' || s === 'delivered' || s === 'completed' || s === 'cancelled' || s === 'rejected') {
        return false;
      }
      return getSLAInfo(o).remainingMinutes < 15;
    }).length;

    setStats({
      newOrders,
      activeOrders: activeOrdersCount,
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

    const sortedOrders = [...allOrders].sort((a, b) => getOrderTime(b) - getOrderTime(a));
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
          const s = o.status?.toLowerCase();
          if (s === 'dispatched' || s === 'delivered' || s === 'completed' || s === 'cancelled' || s === 'rejected') {
            return false;
          }
          return getSLAInfo(o).remainingMinutes < 15;
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


  const desktopKpiCards = [
    { label: "Active Orders", value: stats.activeOrders, icon: ShoppingBag, color: "#1565C0", bg: "#E3F2FD", variant: "blue" as const },
    { label: "Picking", value: stats.picking, icon: Package, color: "#6A1B9A", bg: "#F3E5F5", variant: "purple" as const },
    { label: "Packing", value: stats.packing, icon: Package, color: "#E65100", bg: "#FFF3E0", variant: "yellow" as const },
    { label: "Ready for Dispatch", value: stats.ready, icon: CheckCircle, color: "#14B8A6", bg: "#E8F5E9", variant: "green" as const },
    { label: "Dispatched", value: totalDispatched, icon: Truck, color: "#2E7D32", bg: "#E8F5E9", variant: "green" as const },
  ];

  const desktopSecondRowKpis = [
    { label: "Rejected", value: stats.todaySummary?.rejected || 0, icon: XCircle, color: "#EF4444", bg: "#FFEBEE", variant: "red" as const },
    { label: "SLA Alerts", value: stats.slaAlerts, icon: AlertTriangle, color: "#D32F2F", bg: "#FFEBEE", variant: "red" as const },
    { label: "Returns", value: returnsToday, icon: RotateCcw, color: "#607D8B", bg: "#ECEFF1", variant: "gray" as const },
    { label: "Revenue", value: `₹${todayRevenue}`, icon: IndianRupee, color: "#F59E0B", bg: "#FEF3C7", variant: "yellow" as const },
    { label: "Total Orders", value: orders.length, icon: ClipboardList, color: "#4F46E5", bg: "#EEF2FF", variant: "purple" as const },
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

  const WeeklyTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          className="bg-white dark:bg-gray-800 p-3 shadow-sm text-left flex flex-col gap-1 border-0"
          style={{
            borderRadius: "10px",
            border: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            fontSize: "12px"
          }}
        >
          <p className="font-semibold text-gray-800 dark:text-gray-200">{data.name}</p>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{data.total} orders</p>
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


  if (isAdmin) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] dark:bg-gray-900 p-[32px] flex justify-center">
        <div className="w-full max-w-[1440px] flex flex-col gap-[24px]" style={{ fontFamily: "Segoe UI, Inter, sans-serif" }}>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500 font-normal">
            <span>Home</span>
            <ChevronRight size={14} className="text-gray-400" />
            <span>Shopkeeper ERP</span>
            <ChevronRight size={14} className="text-gray-400" />
            <span className="text-[#111827] dark:text-gray-100">Dashboard</span>
          </div>

          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[#111827] dark:text-gray-100 font-bold text-[32px] leading-tight">
                Shopkeeper Dashboard
              </h1>
              <p className="text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500 text-[14px] mt-1 font-normal">
                Real-time store operations overview
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Active / Store status badge */}
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm text-xs font-semibold text-gray-700 dark:text-gray-300">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>
                  {shopkeepers.filter((s: any) => s.status?.toLowerCase() !== 'offline').length} Shopkeepers Active
                </span>
              </div>
            </div>
          </div>

          {/* Row 1 of KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-[24px]">
            {desktopKpiCards.map((kpi) => (
              <KPICard
                key={kpi.label}
                label={kpi.label}
                value={kpi.value}
                icon={kpi.icon}
                color={kpi.color}
                bg={kpi.bg}
                onClick={
                  (kpi as any).screen
                    ? () => onNavigate((kpi as any).screen, (kpi as any).statusFilter)
                    : undefined
                }
                variant={kpi.variant}
                isAdmin={true}
              />
            ))}
          </div>

          {/* Row 2 of KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-[24px]">
            {desktopSecondRowKpis.map((kpi) => (
              <KPICard
                key={kpi.label}
                label={kpi.label}
                value={kpi.value}
                icon={kpi.icon}
                color={kpi.color}
                bg={kpi.bg}
                onClick={
                  (kpi as any).screen
                    ? () => onNavigate((kpi as any).screen, (kpi as any).statusFilter)
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
            <div className="bg-white dark:bg-gray-800 rounded-[16px] p-[24px] flex flex-col justify-between h-full" style={{ boxShadow: "0px 0px 12px rgba(0,0,0,0.05)" }}>
              <div>
                <h3 className="text-[#111827] dark:text-gray-100 text-[16px] font-semibold mb-4">Active Shopkeepers Status</h3>
                <div className="overflow-x-hidden rounded-[16px] border border-gray-100 dark:border-gray-700">
                  <table className="w-full border-collapse table-fixed">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700" style={{ height: "64px" }}>
                        <th className="text-left pl-[12px] pr-[4px] py-[16px] text-[12px] font-medium text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[10%]">Avatar</th>
                        <th className="text-left pl-[32px] pr-[12px] py-[16px] text-[12px] font-medium text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[30%]">Name</th>
                        <th className="text-left px-[12px] py-[16px] text-[12px] font-medium text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[25%]">Phone</th>
                        <th className="text-left px-[12px] py-[16px] text-[12px] font-medium text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[15%]">Active</th>
                        <th className="text-left px-[12px] py-[16px] text-[12px] font-medium text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[20%]">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {shopkeepers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 text-center text-xs py-8">No active shopkeepers found.</td>
                        </tr>
                      ) : (
                        shopkeepers.map((sk) => {
                          const initials = sk.name
                            ? sk.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                            : "SK";

                          // Calculate active order count dynamically based on current orders state
                          const activeOrdersForSk = orders.filter((o: any) => {
                            const isAssigned =
                              o.shopkeeper_phone === sk.phone ||
                              o.assignedShopkeeper?.phone === sk.phone ||
                              o.assigned_shopkeeper?.phone === sk.phone ||
                              (o.shopkeeper_name && o.shopkeeper_name.toLowerCase() === sk.name?.toLowerCase());

                            if (!isAssigned) return false;

                            const isHandedOver = o.allocationStatus === 'HandedOver' || o.allocation_status === 'HandedOver';
                            if (isHandedOver) return false;

                            const s = o.status?.toLowerCase();
                            return s !== 'delivered' && s !== 'completed' && s !== 'cancelled' && s !== 'rejected' && s !== 'dispatched' && s !== 'returned' && s !== 'return' && s !== 'handed_over';
                          });

                          const activeOrderCount = activeOrdersForSk.length;
                          const isOffline = sk.status?.toLowerCase() === 'offline';
                          const isBusy = !isOffline && activeOrderCount > 0;

                          let badgeText = "Available";
                          let badgeStyle = { backgroundColor: "#E8F5E9", color: "#00891D" };
                          if (isOffline) {
                            badgeText = "Offline";
                            badgeStyle = { backgroundColor: "#F3F4F6", color: "#6B7280" };
                          } else if (isBusy) {
                            badgeText = "Busy";
                            badgeStyle = { backgroundColor: "#FFEACC", color: "#EA580C" };
                          }

                          return (
                            <tr key={sk.id} className="hover:bg-[#F9FAFB] dark:hover:bg-gray-700/50 dark:bg-gray-800 transition-colors" style={{ height: "72px" }}>
                              <td className="px-[12px] py-[16px] whitespace-nowrap">
                                <div className="w-[40px] h-[40px] rounded-full bg-green-50 text-[#00891D] flex items-center justify-center font-bold text-sm border border-green-100">
                                  {initials}
                                </div>
                              </td>
                              <td className="py-[16px] whitespace-nowrap pl-[32px] pr-[12px]">
                                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate max-w-full">{sk.name}</div>
                                <div className="text-[10px] text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500">ID: {sk.employeeId || "N/A"}</div>
                              </td>
                              <td className="px-[12px] py-[16px] whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">
                                {sk.phone}
                              </td>
                              <td className="px-[12px] py-[16px] whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-medium">
                                {activeOrderCount}
                              </td>
                              <td className="px-[12px] py-[16px] whitespace-nowrap">
                                <span
                                  className="inline-flex items-center justify-center px-2 py-1 rounded-full text-[11px] font-semibold w-full text-center"
                                  style={badgeStyle}
                                >
                                  {badgeText}
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
            <div className="bg-white dark:bg-gray-800 rounded-[16px] p-[24px] flex flex-col justify-between h-full" style={{ boxShadow: "0px 0px 12px rgba(0,0,0,0.05)" }}>
              <div>
                <div className="mb-4">
                  <h3 className="text-[#111827] dark:text-gray-100 text-[16px] font-semibold">Weekly Performance</h3>
                  <p className="text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500 text-[12px] mt-0.5">This Week · Mon–Sun</p>
                </div>
                <div className="w-full outline-none focus:outline-none" style={{ outline: 'none' }}>
                  <ResponsiveContainer width="100%" height={260} minWidth={0}>
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
          <div className="bg-white dark:bg-gray-800 rounded-[16px] p-[24px] flex flex-col" style={{ boxShadow: "0px 0px 12px rgba(0,0,0,0.05)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#111827] dark:text-gray-100 text-[16px] font-semibold">Recent Orders</h3>
              <button onClick={() => onNavigate("orderhistory")} className="text-[#00891D] hover:underline text-sm font-semibold flex items-center gap-1">
                View All <ChevronRight size={16} />
              </button>
            </div>
            <div className="overflow-x-auto rounded-[16px] border border-gray-100 dark:border-gray-700">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-2 sm:px-4 py-3 sm:py-4 text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Order Number</th>
                    <th className="text-left px-2 sm:px-4 py-3 sm:py-4 text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Customer</th>
                    <th className="text-left px-2 sm:px-4 py-3 sm:py-4 text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Shopkeeper</th>
                    <th className="text-left px-2 sm:px-4 py-3 sm:py-4 text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Status</th>
                    <th className="text-left px-2 sm:px-4 py-3 sm:py-4 text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Amount</th>
                    <th className="text-left px-2 sm:px-4 py-3 sm:py-4 text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Date & Time</th>
                    <th className="text-center px-2 sm:px-4 py-3 sm:py-4 text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {recentOrders.map((order) => {
                    const statusStyles: Record<string, { color: string; bg: string }> = {
                      new: { color: "#1D4ED8", bg: "#EFF6FF" }, // Default Placed/Pending (Unassigned) is blue
                      placed: { color: "#1D4ED8", bg: "#EFF6FF" },
                      pending: { color: "#1D4ED8", bg: "#EFF6FF" },
                      assigned: { color: "#4B5563", bg: "#F3F4F6" },
                      accepted: { color: "#1D4ED8", bg: "#EFF6FF" },
                      picking: { color: "#7C3AED", bg: "#F5F3FF" },
                      confirmed: { color: "#7C3AED", bg: "#F5F3FF" },
                      packing: { color: "#EA580C", bg: "#FFF7ED" },
                      processing: { color: "#EA580C", bg: "#FFF7ED" },
                      ready: { color: "#0D9488", bg: "#F0FDFA" },
                      ready_for_pickup: { color: "#0D9488", bg: "#F0FDFA" },
                      ready_for_dispatch: { color: "#0D9488", bg: "#F0FDFA" },
                      dispatched: { color: "#16A34A", bg: "#F0FDF4" },
                      out_for_delivery: { color: "#16A34A", bg: "#F0FDF4" },
                      in_transit: { color: "#16A34A", bg: "#F0FDF4" },
                      delivered: { color: "#16A34A", bg: "#F0FDF4" },
                      completed: { color: "#16A34A", bg: "#F0FDF4" },
                      cancelled: { color: "#DC2626", bg: "#FEF2F2" },
                      rejected: { color: "#DC2626", bg: "#FEF2F2" },
                    };
                    const lowerStatus = (order.status || "").toLowerCase();
                    const isAssigned = (lowerStatus === 'new' || lowerStatus === 'placed' || lowerStatus === 'assigned') && (
                      order.shopkeeper_name ||
                      order.assignedShopkeeper ||
                      order.assigned_shopkeeper ||
                      order.assignedShopkeeperId ||
                      order.assigned_shopkeeper_id ||
                      order.shopkeeper_phone
                    );
                    const statusColor = isAssigned ? "#4B5563" : (statusStyles[lowerStatus]?.color || "#757575");
                    const statusBg = isAssigned ? "#F3F4F6" : (statusStyles[lowerStatus]?.bg || "#F5F5F5");

                    const formatStatusDisplay = (status: string) => {
                      if (isAssigned) return "Assigned";
                      const statusUpper = (status || "").toUpperCase();
                      const statusMap: Record<string, string> = {
                        PENDING: "Pending",
                        CONFIRMED: "Confirmed",
                        PROCESSING: "Processing",
                        READY_FOR_PICKUP: "Ready for Pickup",
                        OUT_FOR_DELIVERY: "Out for Delivery",
                        ASSIGNED_TO_AGENT: "Out for Delivery",
                        PICKED_UP: "Picked Up",
                        IN_TRANSIT: "In Transit",
                        DELIVERED: "Delivered",
                        CANCELLED: "Cancelled",
                        FAILED: "Failed",
                        RETURNED: "Returned",
                        NEW: "Placed",
                        ACCEPTED: "Accepted",
                        PICKING: "Picking",
                        PACKING: "Packing",
                        READY: "Ready",
                        DISPATCHED: "Dispatched",
                        COMPLETED: "Completed",
                        REJECTED: "Rejected",
                      };
                      return statusMap[statusUpper] || status;
                    };

                    // Calculate time text
                    const timeText = (() => {
                      const ts = order.updatedAt || order.updated_at || order.createdAt || order.created_at || order.placedAt || order.placed_at;
                      if (!ts) return "—";
                      const date = new Date(ts);
                      if (isNaN(date.getTime())) return "—";

                      const day = String(date.getDate()).padStart(2, '0');
                      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                      const month = months[date.getMonth()];
                      const year = date.getFullYear();

                      let hours = date.getHours();
                      const minutes = String(date.getMinutes()).padStart(2, '0');
                      const ampm = hours >= 12 ? 'PM' : 'AM';
                      hours = hours % 12;
                      hours = hours ? hours : 12;

                      return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
                    })();

                    return (
                      <tr
                        key={order.id}
                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 dark:bg-gray-700/50 dark:hover:bg-gray-700/50 dark:bg-gray-700/50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200">
                          {order.order_number}
                        </td>
                        <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200">{order.customer_name || order.user}</div>
                          <div className="text-[10px] sm:text-xs text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500">{order.phone}</div>
                        </td>
                        <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-800 dark:text-gray-200">
                          {order.shopkeeper_name ? (
                            order.shopkeeper_name
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
                          <span
                            className="px-2 py-0.5 text-[10px] sm:text-xs rounded-full font-medium inline-flex items-center justify-center uppercase tracking-wider"
                            style={{ backgroundColor: statusBg, color: statusColor }}
                          >
                            {formatStatusDisplay(order.status)}
                          </span>
                        </td>
                        <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200">
                          ₹{order.total_value}
                        </td>
                        <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-800 dark:text-gray-200">
                          {timeText}
                        </td>
                        <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-center">
                          <ViewIconButton
                            onClick={() => onNavigate("order-details", order)}
                            size={14}
                            className="text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                          />
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
    <DashboardMobile
      onNavigate={onNavigate}
      isAdmin={isAdmin}
    />
  );

}
