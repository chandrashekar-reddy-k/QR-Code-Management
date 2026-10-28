// Trigger re-evaluation comment
import { useState, useEffect } from "react";
import { ArrowLeft, LayoutDashboard, ShoppingBag, Package, PackageCheck, User, History, CheckCircle } from "lucide-react";
import { DashboardMobile as Dashboard } from "../components/shopkeeper/DashboardMobile";
import { NewOrders } from "../components/shopkeeper/NewOrdersMobile";
import { OrderDetails } from "../components/shopkeeper/OrderDetailsMobile";
import { PickingQueueMobile as PickingQueue } from "../components/shopkeeper/PickingQueueMobile";
import { PickingScreenMobile as PickingScreen } from "../components/shopkeeper/PickingScreenMobile";
import { BarcodeVerificationMobile as BarcodeVerification } from "../components/shopkeeper/BarcodeVerificationMobile";
import { PickingCompleteMobile as PickingComplete } from "../components/shopkeeper/PickingCompleteMobile";
import { PackingQueueMobile as PackingQueue } from "../components/shopkeeper/PackingQueueMobile";
import { PackingScreenMobile as PackingScreen } from "../components/shopkeeper/PackingScreenMobile";
import { ReadyOrdersMobile as ReadyOrders } from "../components/shopkeeper/ReadyOrdersMobile";
import { HandoverVerificationMobile as HandoverVerification } from "../components/shopkeeper/HandoverVerificationMobile";
import { SelfPickup } from "../components/shopkeeper/SelfPickupMobile";
import { Returns } from "../components/shopkeeper/ReturnsMobile";
import { SLAMonitoring } from "../components/shopkeeper/SLAMonitoringMobile";
import { OrderHistoryMobile as AllOrders } from "../components/shopkeeper/OrderHistoryMobile";
import axios from "axios";
import { useLocation, useNavigate as useReactNavigate } from "react-router-dom";
import { useSocket } from "../hooks/useSocket";
import { getSLAInfo } from "../utils/slaHelper";
import { SharedOrdersContext, useSharedOrders } from "../components/shopkeeper/SharedOrdersContext";
import { openHRMSPortal } from "../utils/hrmsSSO";
import { ShopkeeperNewOrderAlertProvider } from "../contexts/ShopkeeperNewOrderAlertContext";
import { ShopkeeperNewOrderPopup } from "../components/shopkeeper/ShopkeeperNewOrderPopup";
const hrmsWindowRef: Window | null = null;
// Local API Client instance
const api = axios.create({
  baseURL: import.meta.env.VITE_URL || "http://localhost:3004/api/v1",
});

// Set Authorization header interceptor
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("staffToken") || localStorage.getItem("staffToken") || localStorage.getItem("partnerToken") || localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

type Screen =
  | "dashboard"
  | "new-orders"
  | "orderhistory"
  | "order-details"
  | "picking-queue"
  | "picking-screen"
  | "barcode-verification"
  | "picking-complete"
  | "packing-queue"
  | "packing-screen"
  | "ready-orders"
  | "handover-verification"
  | "self-pickup"
  | "returns"
  | "sla-monitoring"
  | "profile";

function ProfileScreen({ onNavigate, onBack }: { onNavigate: (screen: string) => void; onBack: () => void }) {
  const [stats, setStats] = useState({ orders: 0, completed: 0, sla: 100, selfPickup: 0 });
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);

  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem("staffUser") || localStorage.getItem("staffUser") || localStorage.getItem("partnerUser") || localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error("Failed to parse user from sessionStorage/localStorage", err);
    }
  }, []);

  const name = user?.name || "Shopkeeper";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const { orders: sharedOrders } = useSharedOrders();

  useEffect(() => {
    const computeStats = () => {
      try {
        const allOrders = sharedOrders || [];

        const storedUser = sessionStorage.getItem("staffUser") || localStorage.getItem("staffUser") || localStorage.getItem("partnerUser") || localStorage.getItem("user");
        const userObj = storedUser ? JSON.parse(storedUser) : null;
        let skId = userObj?.shopkeeper_id || userObj?.shopkeeperId || userObj?.id;
        if (skId && typeof skId === 'object' && skId.id) skId = skId.id;

        const shopkeeperOrders = skId
          ? allOrders.filter((o: Record<string, unknown>) => {
            let oAssignedId = o.assignedShopkeeperId || o.assigned_shopkeeper_id || o.shopkeeper_id;
            if (oAssignedId && typeof oAssignedId === 'object' && 'id' in oAssignedId) {
              oAssignedId = (oAssignedId as { id: string }).id;
            }
            return String(oAssignedId) === String(skId);
          })
          : [];

        const total = shopkeeperOrders.length;
        const completed = shopkeeperOrders.filter((o: Record<string, unknown>) => {
          const s = (o.status as string)?.toLowerCase();
          const alloc = ((o.allocationStatus || o.allocation_status) as string)?.toLowerCase();
          return s === 'dispatched' || s === 'out_for_delivery' || s === 'delivered' || alloc === 'handedover';
        }).length;
        const breached = shopkeeperOrders.filter((o: Record<string, unknown>) => getSLAInfo(o).isBreached).length;
        const slaPercent = total > 0 ? Math.round(((total - breached) / total) * 100) : 100;
        const selfPickup = shopkeeperOrders.filter((o: Record<string, unknown>) => o.order_type === 'Self Pickup' && o.status === 'ready').length;

        setStats({ orders: total, completed, sla: slaPercent, selfPickup });
      } catch (err) {
        console.error("Failed to compute profile stats", err);
      }
    };
    computeStats();

    // Add interval to dynamically update SLA
    const interval = setInterval(computeStats, 60000);
    return () => clearInterval(interval);
  }, [sharedOrders]);

  const profileSections = [
    {
      title: "Store Operations",
      items: [
        { label: "Self Pickup Orders", icon: "🏪", screen: "self-pickup", desc: stats.selfPickup > 0 ? `${stats.selfPickup} orders awaiting pickup` : "No pending pickups", badge: stats.selfPickup },
        { label: "Returns Management", icon: "↩️", screen: "returns" },
        { label: "SLA Monitoring", icon: "📊", screen: "sla-monitoring" },
      ],
    },
    {
      title: "Store Info",
      items: [
        { label: "Hyderabad Store 01", icon: "🏬", desc: `Shopkeeper: ${name}` },
        { label: "Operating Hours", icon: "🕐", desc: "6:00 AM – 11:00 PM" },
        { label: "Store Performance", icon: "⭐", desc: "4.8 / 5.0 Rating" },
      ],
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F7FA] dark:bg-gray-900">
      <div style={{ background: "linear-gradient(135deg, #00891D 0%, #006614 100%)" }} className="px-4 pt-12 pb-8 flex flex-col items-center relative">
        <div className="absolute top-12 left-4">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-white/20 dark:bg-gray-800/20 flex items-center justify-center hover:bg-white/30 dark:hover:bg-gray-800/30 transition-colors"
          >
            <ArrowLeft size={20} color="white" />
          </button>
        </div>
        <div className="w-20 h-20 rounded-full bg-white/20 dark:bg-gray-800/20 flex items-center justify-center mb-3">
          <span className="text-white font-bold text-2xl">{initials}</span>
        </div>
        <h1 className="text-white font-bold text-xl">{name}</h1>
        <p className="text-white/70 text-xs">Shopkeeper · Hyderabad Store 01</p>
        <div className="flex gap-3 mt-3">
          {[
            { label: "Orders", value: stats.orders.toString() },
            { label: "Completed", value: stats.completed.toString() },
            { label: "SLA %", value: `${stats.sla}%` },
          ].map(s => (
            <div key={s.label} className="bg-white/20 dark:bg-gray-800/10 rounded-xl px-4 py-2 text-center">
              <p className="text-white font-bold text-base">{s.value}</p>
              <p className="text-white/60 text-[10px]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4 max-w-3xl mx-auto w-full">
        {profileSections.map((section) => (
          <div key={section.title} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold text-[11px] uppercase tracking-wider">
                {section.title}
              </span>
            </div>
            {section.items.map((item) => (
              <button
                key={item.label}
                onClick={() => "screen" in item ? onNavigate((item as { screen: string }).screen) : undefined}
                className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 dark:bg-gray-700/50 dark:hover:bg-gray-700/50 dark:bg-gray-700/50 transition-colors"
              >
                <span className="text-xl">{item.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-gray-800 dark:text-gray-200 font-medium text-sm">{item.label}</p>
                    {("badge" in item && (item as { badge?: number }).badge !== undefined && ((item as { badge?: number }).badge || 0) > 0) && (
                      <span className="bg-[#EF5A06] text-white rounded-full px-2 py-0.5 text-[10px] font-bold">
                        {(item as { badge?: number }).badge}
                      </span>
                    )}
                  </div>
                  {"desc" in item && <p className="text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5 text-[11px]">{(item as { desc: string }).desc}</p>}
                </div>
                {"screen" in item && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#BDBDBD" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        ))}
        <button
          onClick={() => {
            sessionStorage.removeItem("staffToken");
            sessionStorage.removeItem("staffRefreshToken");
            sessionStorage.removeItem("staffUser");
            sessionStorage.removeItem("staffRole");
            sessionStorage.removeItem("staffWarehouseId");
            sessionStorage.removeItem("staffActiveOrder");
            window.location.href = "/login";
          }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 flex items-center justify-center gap-2 border border-red-100 hover:bg-red-50 transition-colors w-full"
        >
          <span className="text-red-600 font-semibold text-sm">Sign Out</span>
        </button>
      </div>
    </div>
  );
}

export default function ShopkeeperERP() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [orderData, setOrderData] = useState<unknown>(() => {
    try {
      const saved = sessionStorage.getItem("staffActiveOrder") || localStorage.getItem("partnerActiveOrder");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [allOrdersStatus, setAllOrdersStatus] = useState<string | undefined>(undefined);
  const [history, setHistory] = useState<Screen[]>([]);
  const location = useLocation();
  const reactNavigate = useReactNavigate();

  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const socket = useSocket(1);

  const fetchOrders = async () => {
    try {
      const endpoint = `/orders?view=shopkeeper&limit=100&_t=${Date.now()}`;
      const res = await api.get(endpoint);
      const resData = res.data as { data?: { orders?: Record<string, unknown>[] } | Record<string, unknown>[]; orders?: Record<string, unknown>[] };
      let rawOrders: Record<string, unknown>[] = [];
      if (Array.isArray(resData)) {
        rawOrders = resData;
      } else if (resData && Array.isArray((resData as { data?: Record<string, unknown>[] }).data)) {
        rawOrders = (resData as { data?: Record<string, unknown>[] }).data || [];
      } else if (resData && resData.data && Array.isArray((resData.data as { orders?: Record<string, unknown>[] }).orders)) {
        rawOrders = (resData.data as { orders?: Record<string, unknown>[] }).orders || [];
      } else if (resData && Array.isArray(resData.orders)) {
        rawOrders = resData.orders;
      }

      // Deduplicate and filter out any orders with missing or mismatching warehouseId
      const seenIds = new Set();
      const filteredOrders = [];
      for (const o of rawOrders) {
        const id = o.id || o.order_number;
        if (id && !seenIds.has(id)) {
          const oWh = o.warehouseId || o.warehouse_id;
          if (!oWh) continue; // Exclude orders with no warehouse (like test orders)
          // if (userWarehouseId && oWh !== userWarehouseId) continue; // Exclude mismatching warehouses

          seenIds.add(id);
          filteredOrders.push(o);
        }
      }

      // Sort filteredOrders latest first (descending order by date/createdAt)
      filteredOrders.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const timeA = new Date((a.created_at || a.createdAt || a.orderDate || 0) as string).getTime();
        const timeB = new Date((b.created_at || b.createdAt || b.orderDate || 0) as string).getTime();
        if (timeA !== timeB) return timeB - timeA;
        return String(b.id || b.order_number || "").localeCompare(String(a.id || a.order_number || ""));
      });

      setOrders(filteredOrders);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch orders in parent:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    const currentSocket = socket.current;
    if (currentSocket) {
      currentSocket.on('order:status', fetchOrders);
      currentSocket.on('order:new', fetchOrders);
    }
    return () => {
      clearInterval(interval);
      if (currentSocket) {
        currentSocket.off('order:status', fetchOrders);
        currentSocket.off('order:new', fetchOrders);
      }
    };
  }, [socket]);

  const handleLogout = () => {
    sessionStorage.removeItem("staffToken");
    sessionStorage.removeItem("staffRefreshToken");
    sessionStorage.removeItem("staffUser");
    sessionStorage.removeItem("staffRole");
    sessionStorage.removeItem("staffWarehouseId");
    sessionStorage.removeItem("staffActiveOrder");
    localStorage.removeItem("partnerToken");
    localStorage.removeItem("partnerUser");
    localStorage.removeItem("partnerWarehouseId");
    localStorage.removeItem("partnerActiveOrder");
    if (hrmsWindowRef && !hrmsWindowRef.closed) {
      try {
        hrmsWindowRef.close();
      } catch (err) {
        console.error('Failed to close HRMS window:', err);
      }
    }
    localStorage.clear();
    window.location.href = "/login";
  };

  useEffect(() => {
    const handleUnload = () => {
      if (hrmsWindowRef && !hrmsWindowRef.closed) {
        try {
          hrmsWindowRef.close();
        } catch (err) {
          console.warn("HRMS window cleanup error:", err);
        }
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get("tab") || "dashboard";

    setScreen(tab as Screen);
  }, [location]);

  useEffect(() => {
    const handleNav = (e: any) => {
      const dest = e.detail?.screen;
      if (dest) {
        const data =
          e.detail?.data ||
          e.detail?.order ||
          (e.detail?.orderId ? { id: e.detail.orderId, orderNumber: e.detail.orderNumber } : undefined);
        navigate(dest, data);
      }
    };
    window.addEventListener("shopkeeperNavigateScreen", handleNav);
    return () => window.removeEventListener("shopkeeperNavigateScreen", handleNav);
  }, [screen]);

  const navigate = (dest: string, data?: unknown) => {
    setHistory(prev => [...prev, screen]);

    // Handle orderhistory with optional status filter
    if (dest === "orderhistory") {
      setAllOrdersStatus(typeof data === 'string' ? data : undefined);
      setScreen("orderhistory");
      reactNavigate(`/shopkeeper?tab=orderhistory`);
      return;
    }

    // Check if the destination is a primary tab in the sidebar
    const isTab = ["dashboard", "new-orders", "picking-queue", "ready-orders", "packing-queue", "profile", "orderhistory"].includes(dest);
    if (isTab) {
      reactNavigate(`/shopkeeper?tab=${dest}`);
      setScreen(dest as Screen);
    } else {
      setScreen(dest as Screen);
    }

    if (data !== undefined) {
      setOrderData(data);
      if (data) {
        sessionStorage.setItem("staffActiveOrder", JSON.stringify(data));
      } else {
        sessionStorage.removeItem("staffActiveOrder");
      }
    }
  };

  const goBack = () => {
    const prev = history[history.length - 1];
    if (prev) {
      setHistory(h => h.slice(0, -1));
      const isTab = ["dashboard", "new-orders", "picking-queue", "ready-orders", "packing-queue", "profile", "orderhistory"].includes(prev);
      if (isTab) {
        reactNavigate(`/shopkeeper?tab=${prev}`);
        setScreen(prev as Screen);
      } else {
        setScreen(prev);
      }
    } else {
      reactNavigate("/shopkeeper?tab=dashboard");
      setScreen("dashboard");
    }
  };

  const renderScreen = () => {
    return (
      <div className="w-full">
        {/* Persistent Screens */}
        <div style={{ display: screen === "dashboard" ? "block" : "none" }}>
          <Dashboard onNavigate={navigate} />
        </div>
        <div style={{ display: screen === "new-orders" ? "block" : "none" }}>
          <NewOrders onNavigate={navigate} onBack={goBack} />
        </div>
        <div style={{ display: screen === "picking-queue" ? "block" : "none" }}>
          <PickingQueue onNavigate={navigate} onBack={goBack} />
        </div>
        <div style={{ display: screen === "packing-queue" ? "block" : "none" }}>
          <PackingQueue onNavigate={navigate} onBack={goBack} />
        </div>
        <div style={{ display: screen === "ready-orders" ? "block" : "none" }}>
          <ReadyOrders onNavigate={navigate} onBack={goBack} />
        </div>
        <div style={{ display: screen === "self-pickup" ? "block" : "none" }}>
          <SelfPickup onBack={goBack} />
        </div>
        <div style={{ display: screen === "returns" ? "block" : "none" }}>
          <Returns onBack={goBack} />
        </div>
        <div style={{ display: screen === "sla-monitoring" ? "block" : "none" }}>
          <SLAMonitoring orders={orders} onBack={goBack} />
        </div>
        <div style={{ display: screen === "profile" ? "block" : "none" }}>
          <ProfileScreen onNavigate={navigate} onBack={goBack} />
        </div>

        {/* Dynamic Screens (re-mounted on navigation) */}
        {screen === "orderhistory" && <AllOrders onBack={goBack} onNavigate={navigate} initialStatus={allOrdersStatus} />}
        {screen === "order-details" && <OrderDetails onBack={goBack} onNavigate={navigate} order={orderData as Record<string, unknown>} socket={socket} />}
        {screen === "picking-screen" && <PickingScreen onNavigate={navigate} onBack={goBack} order={orderData as Record<string, unknown>} />}
        {screen === "barcode-verification" && <BarcodeVerification onBack={goBack} onNavigate={navigate} data={orderData as Record<string, unknown>} />}
        {screen === "picking-complete" && <PickingComplete onNavigate={navigate} data={orderData as Record<string, unknown>} />}
        {screen === "packing-screen" && <PackingScreen onNavigate={navigate} onBack={goBack} order={orderData as Record<string, unknown>} />}
        {screen === "handover-verification" && <HandoverVerification onBack={goBack} onNavigate={navigate} data={orderData as Record<string, unknown>} />}
      </div>
    );
  };

  const hasShopkeeperPermission = (tabId: string) => {
    let permissions: string[] = [];
    try {
      permissions = JSON.parse(localStorage.getItem("permissions") || "[]");
    } catch (err) {
      console.warn("Failed to parse permissions", err);
    }

    const slugMap: Record<string, string> = {
      "dashboard": "shopkeeper_dashboard_view",
      "new-orders": "shopkeeper_inbox_orders_view",
      "all-orders": "shopkeeper_order_history_view",
      "picking-queue": "shopkeeper_picking_queue_view",
      "packing-queue": "shopkeeper_packing_queue_view",
      "profile": "shopkeeper_profile_view",
    };

    const slug = slugMap[tabId];
    if (!slug) return true;
    return permissions.includes(slug);
  };

  return (
    <SharedOrdersContext.Provider value={{ orders, loading, refreshOrders: fetchOrders }}>
      <ShopkeeperNewOrderAlertProvider>
          <div className="min-h-screen bg-[#F5F7FA] dark:bg-gray-900 flex" style={{ fontFamily: "'Roboto', system-ui, sans-serif" }}>
          {/* Desktop Sidebar */}
          <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 flex-shrink-0 h-screen sticky top-0">
            {/* Logo or Brand */}
            <div className="py-4 pl-5 pr-3 flex-shrink-0 border-b border-gray-50 dark:border-gray-700">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0 h-12 flex items-center justify-center overflow-hidden">
                  <img
                    src="/villagekart_svg_icon-2.svg"
                    alt="VillagKart"
                    className="max-w-[260px] w-full h-full object-contain object-center"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent) {
                        const icon = document.createElement("div");
                        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
                        parent.appendChild(icon);
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 p-4 space-y-1">
              {[
                { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
                { id: "new-orders", label: "Inbox Orders", icon: <ShoppingBag size={18} /> },
                { id: "orderhistory", label: "Order History", icon: <History size={18} /> },
                { id: "picking-queue", label: "Picking Queue", icon: <Package size={18} /> },
                { id: "packing-queue", label: "Packing Queue", icon: <PackageCheck size={18} /> },
                { id: "ready-orders", label: "Ready", icon: <CheckCircle size={18} /> },
                { id: "profile", label: "Profile", icon: <User size={18} /> },
              ].filter(item => hasShopkeeperPermission(item.id)).map((item) => {
                const isActive = screen === item.id || (
                  item.id === "new-orders" && screen === "order-details"
                ) || (
                    item.id === "picking-queue" && ["picking-screen", "barcode-verification", "picking-complete"].includes(screen)
                  ) || (
                    item.id === "ready-orders" && ["handover-verification"].includes(screen)
                  ) || (
                    item.id === "packing-queue" && ["packing-screen"].includes(screen)
                  );
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive
                      ? "bg-[#00891D]/10 text-[#00891D]"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-800 dark:text-gray-200"
                      }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            {/* HRMS SSO Link */}
            <div className="px-4 py-2">
              <button
                onClick={() => openHRMSPortal()}
                className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 hover:bg-green-100 text-[#00891D] rounded-xl text-sm font-semibold transition-all border border-green-200"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>HRMS Portal</span>
              </button>
            </div>

            {/* Sign Out Button */}
            <div className="p-4 border-t border-gray-50">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-all"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Mobile Header / Navigation */}
            <header className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
              <img
                src="/villagekart_svg_icon-2.svg"
                alt="VillagKart"
                className="h-8 w-auto object-contain object-left max-w-[200px]"
              />
              <button
                onClick={() => navigate("orderhistory")}
                className="flex items-center gap-1.5 text-[#00891D] font-semibold text-xs bg-[#00891D]/10 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
              >
                <History size={14} />
                <span>History</span>
              </button>
            </header>

            {/* Content Body */}
            <main className="flex-1 p-4 md:p-6 overflow-y-auto w-full">
              {renderScreen()}
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex justify-around py-2 sticky bottom-0 z-30">
              {[
                { id: "dashboard", label: "Home", icon: <LayoutDashboard size={18} /> },
                { id: "new-orders", label: "Inbox", icon: <ShoppingBag size={18} /> },
                { id: "picking-queue", label: "Picking", icon: <Package size={18} /> },
                { id: "packing-queue", label: "Packing", icon: <PackageCheck size={18} /> },
                { id: "profile", label: "Profile", icon: <User size={18} /> },
              ].filter(item => hasShopkeeperPermission(item.id)).map((item) => {
                const isActive = screen === item.id || (
                  item.id === "new-orders" && screen === "order-details"
                ) || (
                    item.id === "picking-queue" && ["picking-screen", "barcode-verification", "picking-complete"].includes(screen)
                  ) || (
                    item.id === "packing-queue" && ["packing-screen", "ready-orders", "handover-verification"].includes(screen)
                  );
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition-all ${isActive ? "text-[#00891D]" : "text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500"
                      }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
        <ShopkeeperNewOrderPopup />
      </ShopkeeperNewOrderAlertProvider>
    </SharedOrdersContext.Provider>
  );
}
