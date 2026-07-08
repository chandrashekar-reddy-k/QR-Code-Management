import { useState, useEffect } from "react";
import { ArrowLeft, LayoutDashboard, ShoppingBag, Package, PackageCheck, User, Settings as SettingsIcon, History } from "lucide-react";
import { Dashboard } from "../components/shopkeeper/Dashboard";
import { NewOrders } from "../components/shopkeeper/NewOrders";
import { OrderDetails } from "../components/shopkeeper/OrderDetails";
import { PickingQueue } from "../components/shopkeeper/PickingQueue";
import { PickingScreen } from "../components/shopkeeper/PickingScreen";
import { BarcodeVerification } from "../components/shopkeeper/BarcodeVerification";
import { PickingComplete } from "../components/shopkeeper/PickingComplete";
import { PackingQueue } from "../components/shopkeeper/PackingQueue";
import { PackingScreen } from "../components/shopkeeper/PackingScreen";
import { ReadyOrders } from "../components/shopkeeper/ReadyOrders";
import { HandoverVerification } from "../components/shopkeeper/HandoverVerification";
import { SelfPickup } from "../components/shopkeeper/SelfPickup";
import { Returns } from "../components/shopkeeper/Returns";
import { SLAMonitoring } from "../components/shopkeeper/SLAMonitoring";
import { Settings } from "../components/shopkeeper/Settings";
import { AllOrders } from "../components/shopkeeper/AllOrders";
import axios from "axios";
import { useLocation, useNavigate as useReactNavigate } from "react-router-dom";
import { useSocket } from "../hooks/useSocket";

import { SharedOrdersContext } from "../components/shopkeeper/SharedOrdersContext";

// Local API Client instance
const api = axios.create({
  baseURL: import.meta.env.VITE_URL || "http://localhost:3004/api/v1",
});

// Set Authorization header interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
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
  | "all-orders"
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
  | "profile"
  | "settings";

function ProfileScreen({ onNavigate, onBack }: { onNavigate: (screen: string) => void; onBack: () => void }) {
  const [stats, setStats] = useState({ orders: 0, completed: 0, sla: 100, selfPickup: 0 });
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error("Failed to parse user from localStorage", err);
    }
  }, []);

  const name = user?.name || "Shopkeeper";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/orders');
        const allOrders = res.data;
        
        const storedUser = localStorage.getItem("user");
        const userObj = storedUser ? JSON.parse(storedUser) : null;
        const skId = userObj?.shopkeeper_id || userObj?.shopkeeperId || userObj?.id;

        const shopkeeperOrders = skId
          ? allOrders.filter((o: any) => o.assignedShopkeeperId === skId || o.assigned_shopkeeper_id === skId)
          : [];

        const total = shopkeeperOrders.length;
        const completed = shopkeeperOrders.filter((o: any) => o.status?.toLowerCase() === 'dispatched').length;
        const breached = shopkeeperOrders.filter((o: any) => o.sla_breach).length;
        const slaPercent = total > 0 ? Math.round(((total - breached) / total) * 100) : 100;
        const selfPickup = shopkeeperOrders.filter((o: any) => o.order_type === 'Self Pickup' && o.status === 'ready').length;

        setStats({ orders: total, completed, sla: slaPercent, selfPickup });
      } catch (err) {
        console.error("Failed to load profile stats", err);
      }
    };
    fetchStats();
  }, []);

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
        { label: "Hyderabad Store 01", icon: "🏬", desc: `Store Manager: ${name}` },
        { label: "Operating Hours", icon: "🕐", desc: "6:00 AM – 11:00 PM" },
        { label: "Store Performance", icon: "⭐", desc: "4.8 / 5.0 Rating" },
      ],
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F7FA]">
      <div style={{ background: "linear-gradient(135deg, #00891D 0%, #006614 100%)" }} className="px-4 pt-12 pb-8 flex flex-col items-center relative">
        <div className="absolute top-12 left-4">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <ArrowLeft size={20} color="white" />
          </button>
        </div>
        <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-3">
          <span className="text-white font-bold text-2xl">{initials}</span>
        </div>
        <h1 className="text-white font-bold text-xl">{name}</h1>
        <p className="text-white/70 text-xs">Store Manager · Hyderabad Store 01</p>
        <div className="flex gap-3 mt-3">
          {[
            { label: "Orders", value: stats.orders.toString() },
            { label: "Completed", value: stats.completed.toString() },
            { label: "SLA %", value: `${stats.sla}%` },
          ].map(s => (
            <div key={s.label} className="bg-white/10 rounded-xl px-4 py-2 text-center">
              <p className="text-white font-bold text-base">{s.value}</p>
              <p className="text-white/60 text-[10px]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4 max-w-3xl mx-auto w-full">
        {profileSections.map((section) => (
          <div key={section.title} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
              <span className="text-gray-500 font-semibold text-[11px] uppercase tracking-wider">
                {section.title}
              </span>
            </div>
            {section.items.map((item) => (
              <button
                key={item.label}
                onClick={() => "screen" in item ? onNavigate((item as { screen: string }).screen) : undefined}
                className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-xl">{item.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-gray-800 font-medium text-sm">{item.label}</p>
                    {("badge" in item && (item as any).badge > 0) && (
                      <span className="bg-[#EF5A06] text-white rounded-full px-2 py-0.5 text-[10px] font-bold">
                        {(item as any).badge}
                      </span>
                    )}
                  </div>
                  {"desc" in item && <p className="text-gray-400 mt-0.5 text-[11px]">{(item as { desc: string }).desc}</p>}
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
            localStorage.clear();
            window.location.href = "/login";
          }}
          className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-center gap-2 border border-red-100 hover:bg-red-50 transition-colors w-full"
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
      const saved = localStorage.getItem("sk_active_order");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [allOrdersStatus, setAllOrdersStatus] = useState<string | undefined>(undefined);
  const [history, setHistory] = useState<Screen[]>([]);
  const location = useLocation();
  const reactNavigate = useReactNavigate();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const socket = useSocket(1);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders');
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
      setOrders(allOrders);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch orders in parent:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    if (socket.current) {
      socket.current.on('order:status', fetchOrders);
      socket.current.on('order:new', fetchOrders);
    }
    return () => {
      clearInterval(interval);
      if (socket.current) {
        socket.current.off('order:status', fetchOrders);
        socket.current.off('order:new', fetchOrders);
      }
    };
  }, [socket.current]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get("tab") || "dashboard";

    const isSubScreenOfTab = (currentScreen: string, targetTab: string) => {
      if (targetTab === "new-orders" && currentScreen === "order-details") return true;
      if (targetTab === "picking-queue" && ["picking-screen", "barcode-verification", "picking-complete"].includes(currentScreen)) return true;
      if (targetTab === "packing-queue" && ["packing-screen", "ready-orders", "handover-verification"].includes(currentScreen)) return true;
      return false;
    };

    if (screen !== tab && !isSubScreenOfTab(screen, tab)) {
      setScreen(tab as Screen);
    }
  }, [location.search]);

  const navigate = (dest: string, data?: unknown) => {
    setHistory(prev => [...prev, screen]);

    // Handle all-orders with optional status filter
    if (dest === "all-orders") {
      setAllOrdersStatus(typeof data === 'string' ? data : undefined);
      setScreen("all-orders");
      reactNavigate(`/shopkeeper?tab=all-orders`);
      return;
    }

    // Check if the destination is a primary tab in the sidebar
    const isTab = ["dashboard", "new-orders", "picking-queue", "packing-queue", "profile", "settings", "all-orders"].includes(dest);
    if (isTab) {
      reactNavigate(`/shopkeeper?tab=${dest}`);
    } else {
      setScreen(dest as Screen);
    }

    if (data !== undefined) {
      setOrderData(data);
      if (data) {
        localStorage.setItem("sk_active_order", JSON.stringify(data));
      } else {
        localStorage.removeItem("sk_active_order");
      }
    }
  };

  const goBack = () => {
    const prev = history[history.length - 1];
    if (prev) {
      setHistory(h => h.slice(0, -1));
      const isTab = ["dashboard", "new-orders", "picking-queue", "packing-queue", "profile", "settings", "all-orders"].includes(prev);
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
          <SLAMonitoring onBack={goBack} />
        </div>
        <div style={{ display: screen === "profile" ? "block" : "none" }}>
          <ProfileScreen onNavigate={navigate} onBack={goBack} />
        </div>
        <div style={{ display: screen === "settings" ? "block" : "none" }}>
          <Settings />
        </div>

        {/* Dynamic Screens (re-mounted on navigation) */}
        {screen === "all-orders" && <AllOrders onBack={goBack} onNavigate={navigate} initialStatus={allOrdersStatus} />}
        {screen === "order-details" && <OrderDetails onBack={goBack} onNavigate={navigate} order={orderData as any} />}
        {screen === "picking-screen" && <PickingScreen onNavigate={navigate} onBack={goBack} order={orderData as any} />}
        {screen === "barcode-verification" && <BarcodeVerification onBack={goBack} onNavigate={navigate} data={orderData as any} />}
        {screen === "picking-complete" && <PickingComplete onNavigate={navigate} data={orderData as any} />}
        {screen === "packing-screen" && <PackingScreen onNavigate={navigate} onBack={goBack} order={orderData as any} />}
        {screen === "handover-verification" && <HandoverVerification onBack={goBack} onNavigate={navigate} data={orderData as any} />}
      </div>
    );
  };

  return (
    <SharedOrdersContext.Provider value={{ orders, loading, refreshOrders: fetchOrders }}>
      <div className="min-h-screen bg-[#F5F7FA] flex" style={{ fontFamily: "'Roboto', system-ui, sans-serif" }}>
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 flex-shrink-0 h-screen sticky top-0">
          {/* Logo or Brand */}
          <div className="p-6 border-b border-gray-50 flex items-center gap-3 justify-center">
            <img
              src="/villagkart_logo_name_new.svg"
              alt="VillagKart"
              className="h-10 w-auto object-contain"
            />
          </div>
          
          {/* Navigation Items */}
          <nav className="flex-1 p-4 space-y-1">
            {[
              { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
              { id: "new-orders", label: "Inbox Orders", icon: <ShoppingBag size={18} /> },
              { id: "all-orders", label: "Order History", icon: <History size={18} /> },
              { id: "picking-queue", label: "Picking Queue", icon: <Package size={18} /> },
              { id: "packing-queue", label: "Packing Queue", icon: <PackageCheck size={18} /> },
              { id: "profile", label: "Profile", icon: <User size={18} /> },
              { id: "settings", label: "Settings", icon: <SettingsIcon size={18} /> },
            ].map((item) => {
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
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-[#00891D]/10 text-[#00891D]"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          
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
          <header className="md:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
            <img
              src="/villagkart_logo_name_new.svg"
              alt="VillagKart"
              className="h-8 w-auto object-contain"
            />
            <button
              onClick={() => navigate("all-orders")}
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
          <nav className="md:hidden bg-white border-t border-gray-100 flex justify-around py-2 sticky bottom-0 z-30">
            {[
              { id: "dashboard", label: "Home", icon: <LayoutDashboard size={18} /> },
              { id: "new-orders", label: "Inbox", icon: <ShoppingBag size={18} /> },
              { id: "picking-queue", label: "Picking", icon: <Package size={18} /> },
              { id: "packing-queue", label: "Packing", icon: <PackageCheck size={18} /> },
              { id: "profile", label: "Profile", icon: <User size={18} /> },
            ].map((item) => {
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
                  className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition-all ${
                    isActive ? "text-[#00891D]" : "text-gray-400"
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
    </SharedOrdersContext.Provider>
  );
}
