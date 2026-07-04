import { useState, useEffect } from "react";
import { LayoutDashboard, ShoppingBag, Package, PackageCheck, Settings as SettingsIcon, History, Users, Store, RotateCcw, BarChart3 } from "lucide-react";
import { Dashboard } from "../../../components/shopkeeper/Dashboard";
import { NewOrders } from "../../../components/shopkeeper/NewOrders";
import { OrderDetails } from "../../../components/shopkeeper/OrderDetails";
import { PickingQueue } from "../../../components/shopkeeper/PickingQueue";
import { PickingScreen } from "../../../components/shopkeeper/PickingScreen";
import { BarcodeVerification } from "../../../components/shopkeeper/BarcodeVerification";
import { PickingComplete } from "../../../components/shopkeeper/PickingComplete";
import { PackingQueue } from "../../../components/shopkeeper/PackingQueue";
import { PackingScreen } from "../../../components/shopkeeper/PackingScreen";
import { ReadyOrders } from "../../../components/shopkeeper/ReadyOrders";
import { HandoverVerification } from "../../../components/shopkeeper/HandoverVerification";
import { SelfPickup } from "../../../components/shopkeeper/SelfPickup";
import { Returns } from "../../../components/shopkeeper/Returns";
import { SLAMonitoring } from "../../../components/shopkeeper/SLAMonitoring";
import { Settings } from "../../../components/shopkeeper/Settings";
import { AllOrders } from "../../../components/shopkeeper/AllOrders";
import { StaffTracker } from "../../../components/shopkeeper/StaffTracker";
import { useLocation, useNavigate as useReactNavigate } from "react-router-dom";

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
  | "staff-tracker"
  | "settings";

export default function ShopkeeperAdminERP() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [orderData, setOrderData] = useState<unknown>(null);
  const [allOrdersStatus, setAllOrdersStatus] = useState<string | undefined>(undefined);
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

    if (dest === "all-orders") {
      setAllOrdersStatus(typeof data === 'string' ? data : undefined);
      setScreen("all-orders");
      reactNavigate(`/shopkeeper-erp?tab=all-orders`);
      return;
    }

    const isTab = ["dashboard", "new-orders", "picking-queue", "packing-queue", "settings", "all-orders", "staff-tracker", "self-pickup", "returns", "sla-monitoring"].includes(dest);
    if (isTab) {
      reactNavigate(`/shopkeeper-erp?tab=${dest}`);
    } else {
      setScreen(dest as Screen);
    }

    if (data !== undefined) setOrderData(data);
  };

  const goBack = () => {
    const prev = history[history.length - 1];
    if (prev) {
      setHistory(h => h.slice(0, -1));
      const isTab = ["dashboard", "new-orders", "picking-queue", "packing-queue", "settings", "all-orders", "staff-tracker", "self-pickup", "returns", "sla-monitoring"].includes(prev);
      if (isTab) {
        reactNavigate(`/shopkeeper-erp?tab=${prev}`);
        setScreen(prev as Screen);
      } else {
        setScreen(prev);
      }
    } else {
      reactNavigate("/shopkeeper-erp?tab=dashboard");
      setScreen("dashboard");
    }
  };

  const renderScreen = () => {
    return (
      <div className="w-full">
        {screen === "dashboard" && <Dashboard onNavigate={navigate} />}
        {screen === "new-orders" && <NewOrders onNavigate={navigate} onBack={goBack} />}
        {screen === "all-orders" && <AllOrders onBack={goBack} onNavigate={navigate} initialStatus={allOrdersStatus} />}
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
        {screen === "staff-tracker" && <StaffTracker />}
        {screen === "settings" && <Settings />}
      </div>
    );
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
    { id: "new-orders", label: "Inbox Orders", icon: <ShoppingBag size={16} /> },
    { id: "picking-queue", label: "Picking Queue", icon: <Package size={16} /> },
    { id: "packing-queue", label: "Packing Queue", icon: <PackageCheck size={16} /> },
    { id: "self-pickup", label: "Self Pickup", icon: <Store size={16} /> },
    { id: "returns", label: "Returns", icon: <RotateCcw size={16} /> },
    { id: "sla-monitoring", label: "SLA Monitoring", icon: <BarChart3 size={16} /> },
    { id: "all-orders", label: "Order History", icon: <History size={16} /> },
    { id: "staff-tracker", label: "Staff Tracker", icon: <Users size={16} /> },
    { id: "settings", label: "Settings", icon: <SettingsIcon size={16} /> },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex-1 w-full">
        {renderScreen()}
      </div>
    </div>
  );
}
