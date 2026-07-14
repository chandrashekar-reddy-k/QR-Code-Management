import { useState, useEffect } from "react";

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
import { OrderHistory } from "../../../components/shopkeeper/OrderHistory";
import { StaffTracker } from "../../../components/shopkeeper/StaffTracker";
import { useLocation, useNavigate as useReactNavigate } from "react-router-dom";
import { SharedOrdersContext } from "../../../components/shopkeeper/SharedOrdersContext";
import { useSocket } from "../../../hooks/useSocket";
import api from "../../../api/axios";

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
  | "staff-tracker"
  | "settings";

export default function ShopkeeperAdminERP() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [orderData, setOrderData] = useState<unknown>(null);
  const [allOrdersStatus, setAllOrdersStatus] = useState<string | undefined>(undefined);
  const [history, setHistory] = useState<Screen[]>([]);
  const location = useLocation();
  const reactNavigate = useReactNavigate();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const socket = useSocket(1);

  const fetchOrders = async () => {
    try {
      const cachedWh = localStorage.getItem("partnerWarehouseId");
      const storedU = localStorage.getItem("partnerUser");
      let userWarehouseId = "";
      if (cachedWh && cachedWh !== "undefined") {
        userWarehouseId = cachedWh;
      } else if (storedU) {
        try {
          const u = JSON.parse(storedU);
          userWarehouseId = u.warehouseId || u.warehouse_id || u.partnerWarehouseId || "";
        } catch (e) {}
      }

      const endpoint = userWarehouseId ? `/orders?store_id=${userWarehouseId}` : '/orders';
      const res = await api.get(endpoint);
      const resData = res.data;
      let rawOrders: any[] = [];
      if (Array.isArray(resData)) {
        rawOrders = resData;
      } else if (resData && Array.isArray(resData.data)) {
        rawOrders = resData.data;
      } else if (resData && resData.data && Array.isArray(resData.data.orders)) {
        rawOrders = resData.data.orders;
      } else if (resData && Array.isArray(resData.orders)) {
        rawOrders = resData.orders;
      }

      // Deduplicate and filter out orders with missing or mismatching warehouseId
      const seenIds = new Set();
      const filteredOrders: any[] = [];
      for (const o of rawOrders) {
        const id = o.id || o.order_number;
        if (id && !seenIds.has(id)) {
          const oWh = o.warehouseId || o.warehouse_id;
          if (!oWh) continue; // Exclude orders with no warehouse
          if (userWarehouseId && oWh !== userWarehouseId) continue; // Exclude mismatching warehouses

          seenIds.add(id);
          filteredOrders.push(o);
        }
      }

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

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get("tab") || "dashboard";

    setScreen(tab as Screen);
  }, [location]);

  const navigate = (dest: string, data?: unknown) => {
    setHistory(prev => [...prev, screen]);

    if (dest === "orderhistory") {
      setAllOrdersStatus(typeof data === 'string' ? data : undefined);
      setScreen("orderhistory");
      reactNavigate(`/shopkeeper-erp?tab=orderhistory`);
      return;
    }

    const isTab = ["dashboard", "new-orders", "picking-queue", "packing-queue", "settings", "orderhistory", "staff-tracker", "self-pickup", "returns", "sla-monitoring"].includes(dest);
    if (isTab) {
      reactNavigate(`/shopkeeper-erp?tab=${dest}`);
      setScreen(dest as Screen);
    } else {
      setScreen(dest as Screen);
    }

    if (data !== undefined) setOrderData(data);
  };

  const goBack = () => {
    const prev = history[history.length - 1];
    if (prev) {
      setHistory(h => h.slice(0, -1));
      const isTab = ["dashboard", "new-orders", "picking-queue", "packing-queue", "settings", "orderhistory", "staff-tracker", "self-pickup", "returns", "sla-monitoring"].includes(prev);
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
        {screen === "dashboard" && <Dashboard onNavigate={navigate} isAdmin={true} />}
        {screen === "new-orders" && <NewOrders onNavigate={navigate} onBack={goBack} isAdmin={true} />}
        {screen === "orderhistory" && <OrderHistory onBack={goBack} onNavigate={navigate} initialStatus={allOrdersStatus} isAdmin={true} />}
        {screen === "order-details" && <OrderDetails onBack={goBack} onNavigate={navigate} order={orderData as any} isAdmin={true} />}
        {screen === "picking-queue" && <PickingQueue onNavigate={navigate} onBack={goBack} isAdmin={true} />}
        {screen === "picking-screen" && <PickingScreen onNavigate={navigate} onBack={goBack} order={orderData as any} />}
        {screen === "barcode-verification" && <BarcodeVerification onBack={goBack} onNavigate={navigate} data={orderData as any} />}
        {screen === "picking-complete" && <PickingComplete onNavigate={navigate} data={orderData as any} />}
        {screen === "packing-queue" && <PackingQueue onNavigate={navigate} onBack={goBack} />}
        {screen === "packing-screen" && <PackingScreen onNavigate={navigate} onBack={goBack} order={orderData as any} />}
        {screen === "ready-orders" && <ReadyOrders onNavigate={navigate} onBack={goBack} />}
        {screen === "handover-verification" && <HandoverVerification onBack={goBack} onNavigate={navigate} data={orderData as any} />}
        {screen === "self-pickup" && <SelfPickup onBack={goBack} />}
        {screen === "returns" && <Returns onBack={goBack} />}
        {screen === "sla-monitoring" && <SLAMonitoring onBack={goBack} onNavigate={navigate} />}
        {screen === "staff-tracker" && <StaffTracker />}
        {screen === "settings" && <Settings />}
      </div>
    );
  };



  return (
    <SharedOrdersContext.Provider value={{ orders, loading, refreshOrders: fetchOrders }}>
      <div className="flex flex-col gap-6 w-full min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="flex-1 w-full">
          {renderScreen()}
        </div>
      </div>
    </SharedOrdersContext.Provider>
  );
}
