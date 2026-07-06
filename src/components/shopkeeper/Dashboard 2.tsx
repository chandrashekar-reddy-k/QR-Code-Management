import { useState, useEffect } from "react";
import {
  ShoppingBag,
  Package,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  Bell,
  ChevronRight,
} from "lucide-react";
import api from "../../api/axios";
import { useSocket } from "../../hooks/useSocket";

interface DashboardProps {
  onNavigate: (screen: string, data?: any) => void;
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

export function Dashboard({ onNavigate }: DashboardProps) {
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
      breached: 0
    }
  });

  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  // Using store ID 1 as defined in our DB schema
  const socket = useSocket(1);

  const fetchDashboardData = async () => {
    try {
      // In a real app we would have an endpoint specifically for this,
      // Since we only have /orders right now, let's derive it or fetch /orders and aggregate locally for demo
      const res = await api.get('/orders');
      const allOrders = res.data;

      const newOrders = allOrders.filter((o: any) => {
        const s = o.status?.toLowerCase();
        return s === 'new' || s === 'placed';
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
      const completed = allOrders.filter((o: any) => o.status === 'dispatched' || o.status === 'delivered').length;
      const breached = allOrders.filter((o: any) => isSLABreached(o)).length;

      setStats({
        newOrders,
        picking,
        packing,
        ready,
        slaAlerts: breached,
        todaySummary: {
          total: allOrders.length,
          completed: completed,
          inProgress: picking + packing + ready,
          breached: breached
        }
      });

      setRecentOrders(allOrders.slice(0, 5));
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const slaTimer = setInterval(fetchDashboardData, 30000);

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
  }, [socket.current]);

  const kpiCards = [
    { label: "New Orders", value: stats.newOrders, icon: ShoppingBag, color: "#1565C0", bg: "#E3F2FD", screen: "new-orders" },
    { label: "Picking", value: stats.picking, icon: Package, color: "#6A1B9A", bg: "#F3E5F5", screen: "picking-queue" },
    { label: "Packing", value: stats.packing, icon: Package, color: "#E65100", bg: "#FFF3E0", screen: "packing-queue" },
    { label: "Ready", value: stats.ready, icon: CheckCircle, color: "#2E7D32", bg: "#E8F5E9", screen: "ready-orders" },
    { label: "SLA Alerts", value: stats.slaAlerts, icon: AlertTriangle, color: "#D32F2F", bg: "#FFEBEE", screen: "sla-monitoring" },
  ];

  const quickActions = [
    { label: "New Orders", icon: ShoppingBag, color: "#1565C0", bg: "#E3F2FD", screen: "new-orders", badge: stats.newOrders },
    { label: "Picking Queue", icon: Package, color: "#6A1B9A", bg: "#F3E5F5", screen: "picking-queue", badge: stats.picking },
    { label: "Packing Queue", icon: Package, color: "#E65100", bg: "#FFF3E0", screen: "packing-queue", badge: stats.packing },
    { label: "Ready Orders", icon: CheckCircle, color: "#2E7D32", bg: "#E8F5E9", screen: "ready-orders", badge: stats.ready },
    { label: "Returns", icon: ArrowRight, color: "#EF5A06", bg: "#E8F5E9", screen: "returns", badge: 0 },
    { label: "SLA Monitor", icon: TrendingUp, color: "#D32F2F", bg: "#FFEBEE", screen: "sla-monitoring", badge: stats.slaAlerts },
  ];

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
            <p className="text-white/70 text-sm">{getGreeting()} 👋</p>
            <h1 className="text-white text-xl" style={{ fontWeight: 700 }}>Hyderabad Store 01</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onNavigate("new-orders")}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center relative hover:bg-white/30 transition-colors">
              <Bell size={20} color="white" />
              {stats.newOrders > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center" style={{ fontSize: "10px", fontWeight: 700 }}>
                  {stats.newOrders}
                </span>
              )}
            </button>
            <div onClick={() => onNavigate("profile")}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-white font-semibold">RS</span>
            </div>
          </div>
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
            <button
              key={kpi.label}
              onClick={() => onNavigate(kpi.screen)}
              className="rounded-2xl p-2.5 flex flex-col items-center gap-1 shadow-sm hover:scale-105 active:scale-95 transition-transform"
              style={{ background: "white" }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: kpi.bg }}>
                <kpi.icon size={18} color={kpi.color} />
              </div>
              <span className="text-gray-900" style={{ fontWeight: 700, fontSize: "15px", lineHeight: 1 }}>{kpi.value}</span>
              <span className="text-gray-500 text-center leading-tight" style={{ fontSize: "9px" }}>{kpi.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Order Status Summary */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-800" style={{ fontWeight: 600, fontSize: "14px" }}>Today's Summary</h3>
            <span className="text-[#00891D] text-xs font-medium cursor-pointer"></span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total", value: stats.todaySummary.total, color: "#1565C0" },
              { label: "Completed", value: stats.todaySummary.completed, color: "#00891D" },
              { label: "In Progress", value: stats.todaySummary.inProgress, color: "#EF5A06" },
              { label: "Breached", value: stats.todaySummary.breached, color: "#D32F2F" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center">
                <span style={{ color: s.color, fontWeight: 700, fontSize: "20px" }}>{s.value}</span>
                <span className="text-gray-500 text-center" style={{ fontSize: "10px" }}>{s.label}</span>
              </div>
            ))}
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full flex">
              <div style={{ width: `${(stats.todaySummary.completed / (stats.todaySummary.total || 1)) * 100}%`, backgroundColor: "#00891D" }}></div>
              <div style={{ width: `${(stats.todaySummary.inProgress / (stats.todaySummary.total || 1)) * 100}%`, backgroundColor: "#EF5A06" }}></div>
              <div style={{ width: `${(stats.todaySummary.breached / (stats.todaySummary.total || 1)) * 100}%`, backgroundColor: "#D32F2F" }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mt-4">
        <h3 className="text-gray-700 mb-3" style={{ fontWeight: 600, fontSize: "14px" }}>Quick Actions</h3>
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => onNavigate(action.screen)}
              className="bg-white rounded-2xl p-3 flex flex-col items-center gap-2 shadow-sm hover:shadow-md active:scale-95 transition-all relative"
            >
              {action.badge > 0 && (
                <span className="absolute top-2 right-2 min-w-[18px] h-[18px] bg-red-500 rounded-full text-white flex items-center justify-center px-1" style={{ fontSize: "10px", fontWeight: 700 }}>
                  {action.badge}
                </span>
              )}
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: action.bg }}>
                <action.icon size={22} color={action.color} />
              </div>
              <span className="text-gray-700 text-center" style={{ fontSize: "11px", fontWeight: 600, lineHeight: 1.2 }}>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="px-4 mt-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-gray-700" style={{ fontWeight: 600, fontSize: "14px" }}>Recent Orders</h3>
          <button onClick={() => onNavigate("new-orders")} className="flex items-center gap-1 text-[#00891D] hover:underline" style={{ fontSize: "12px", fontWeight: 500 }}>
            View All <ChevronRight size={14} />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {recentOrders.map((order) => {
            const statusStyles: Record<string, { color: string; bg: string }> = {
              new: { color: "#1565C0", bg: "#E3F2FD" },
              picking: { color: "#6A1B9A", bg: "#F3E5F5" },
              packing: { color: "#EF6C00", bg: "#FFF3E0" },
              ready: { color: "#2E7D32", bg: "#E8F5E9" },
              dispatched: { color: "#00897B", bg: "#E0F2F1" },
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
                        const statusTimeMap: Record<string, { label: string; field: string }> = {
                          new: { label: "Placed", field: "created_at" },
                          accepted: { label: "Accepted", field: "accepted_at" },
                          picking: { label: "Picking", field: "picking_started_at" },
                          packing: { label: "Packing", field: "packing_started_at" },
                          ready: { label: "Ready", field: "packing_completed_at" },
                          dispatched: { label: "Dispatched", field: "dispatched_at" },
                          delivered: { label: "Delivered", field: "dispatched_at" },
                          cancelled: { label: "Cancelled", field: "updated_at" },
                        };
                        const entry = statusTimeMap[order.status?.toLowerCase()];
                        const ts = entry ? order[entry.field] : order.created_at;
                        const label = entry?.label ?? "Placed";
                        const time = ts
                          ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
