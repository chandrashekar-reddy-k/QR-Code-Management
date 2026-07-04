import { useState, useEffect } from "react";
import { LayoutDashboard, ShoppingBag, Package, PackageCheck, User } from "lucide-react";
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
import axios from "axios";
import { useLocation, useNavigate as useReactNavigate } from "react-router-dom";

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

function ProfileScreen({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const [stats, setStats] = useState({ orders: 0, completed: 0, sla: 100, selfPickup: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/orders');
        const allOrders = res.data;
        const total = allOrders.length;
        const completed = allOrders.filter((o: any) => o.status === 'dispatched' || o.status === 'delivered').length;
        const breached = allOrders.filter((o: any) => o.sla_breach).length;
        const slaPercent = total > 0 ? Math.round(((total - breached) / total) * 100) : 100;
        const selfPickup = allOrders.filter((o: any) => o.order_type === 'Self Pickup' && o.status === 'ready').length;

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
        { label: "Hyderabad Store 01", icon: "🏬", desc: "Store Manager: Rohit Singh" },
        { label: "Operating Hours", icon: "🕐", desc: "6:00 AM – 11:00 PM" },
        { label: "Store Performance", icon: "⭐", desc: "4.8 / 5.0 Rating" },
      ],
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F7FA]">
      <div style={{ background: "linear-gradient(135deg, #00891D 0%, #006614 100%)" }} className="px-4 pt-14 pb-8 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-3">
          <span className="text-white font-bold text-2xl">RS</span>
        </div>
        <h1 className="text-white font-bold text-xl">Rohit Singh</h1>
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
        <button className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-center gap-2 border border-red-100 hover:bg-red-50 transition-colors">
          <span className="text-red-600 font-semibold text-sm">Sign Out</span>
        </button>
      </div>
    </div>
  );
}

export default function ShopkeeperERP() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [orderData, setOrderData] = useState<unknown>(null);
  const [history, setHistory] = useState<Screen[]>([]);
  const location = useLocation();
  const reactNavigate = useReactNavigate();

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
    
    // Check if the destination is a primary tab in the sidebar
    const isTab = ["dashboard", "new-orders", "picking-queue", "packing-queue", "profile", "settings"].includes(dest);
    if (isTab) {
      reactNavigate(`/shopkeeper?tab=${dest}`);
    } else {
      setScreen(dest as Screen);
    }
    
    if (data !== undefined) setOrderData(data);
  };

  const goBack = () => {
    const prev = history[history.length - 1];
    if (prev) {
      setHistory(h => h.slice(0, -1));
      const isTab = ["dashboard", "new-orders", "picking-queue", "packing-queue", "profile", "settings"].includes(prev);
      if (isTab) {
        reactNavigate(`/shopkeeper?tab=${prev}`);
      } else {
        setScreen(prev);
      }
    } else {
      reactNavigate("/shopkeeper?tab=dashboard");
    }
  };

  const renderScreen = () => {
    return (
      <div className="w-full">
        {screen === "dashboard" && <Dashboard onNavigate={navigate} />}
        {screen === "new-orders" && <NewOrders onNavigate={navigate} onBack={goBack} />}
        {screen === "order-details" && <OrderDetails onBack={goBack} onNavigate={navigate} order={orderData as any} />}
        {screen === "picking-queue" && <PickingQueue onNavigate={navigate} onBack={goBack} />}
        {screen === "picking-screen" && <PickingScreen onNavigate={navigate} onBack={goBack} order={orderData as any} />}
        {screen === "barcode-verification" && <BarcodeVerification onBack={goBack} onNavigate={navigate} data={orderData as any} />}
        {screen === "picking-complete" && <PickingComplete onNavigate={navigate} data={orderData as any} />}
        {screen === "packing-queue" && <PackingQueue onNavigate={navigate} onBack={goBack} />}
        {screen === "packing-screen" && <PackingScreen onNavigate={navigate} onBack={goBack} order={orderData as any} />}
        {screen === "ready-orders" && <ReadyOrders onNavigate={navigate} onBack={goBack} />}
        {screen === "handover-verification" && <HandoverVerification onBack={goBack} onNavigate={navigate} data={orderData as any} />}
        {screen === "self-pickup" && <SelfPickup onBack={goBack} />}
        {screen === "returns" && <Returns onBack={goBack} />}
        {screen === "sla-monitoring" && <SLAMonitoring onBack={goBack} />}
        {screen === "profile" && <ProfileScreen onNavigate={navigate} />}
        {screen === "settings" && <Settings />}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 flex flex-col items-center" style={{ fontFamily: "'Roboto', system-ui, sans-serif" }}>
      {/* Screen container */}
      <div className="w-full max-w-4xl flex-1">
        {renderScreen()}
      </div>
    </div>
  );
}
