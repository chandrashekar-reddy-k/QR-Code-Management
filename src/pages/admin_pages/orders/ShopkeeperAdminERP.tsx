import { useState, useEffect } from "react"; // force TS re-eval

import { OrderDetails } from "../../../components/shopkeeper/OrderDetails";
import { PickingScreen } from "../../../components/shopkeeper/PickingScreen";
import { BarcodeVerification } from "../../../components/shopkeeper/BarcodeVerification";
import { PickingComplete } from "../../../components/shopkeeper/PickingComplete";
import { PackingScreen } from "../../../components/shopkeeper/PackingScreen";
import { HandoverVerification } from "../../../components/shopkeeper/HandoverVerification";
import { SelfPickup } from "../../../components/shopkeeper/SelfPickup";
import { Returns } from "../../../components/shopkeeper/Returns";
import { SLAMonitoring } from "../../../components/shopkeeper/SLAMonitoring";
import { StorageOperations } from "../../../components/shopkeeper/StorageOperations";
import { OrderProcessing } from "../../../components/shopkeeper/OrderProcessing";
import { StaffTracker } from "../../../components/shopkeeper/StaffTracker";
import { useLocation, useNavigate as useReactNavigate } from "react-router-dom";
import { SharedOrdersContext } from "../../../components/shopkeeper/SharedOrdersContext";
import { ShopkeeperNewOrderAlertProvider } from "../../../contexts/ShopkeeperNewOrderAlertContext";
import { ShopkeeperNewOrderPopup } from "../../../components/shopkeeper/ShopkeeperNewOrderPopup";
import { useSocket } from "../../../hooks/useSocket";
import api from "../../../api/axios";

type Screen =
  | "order-processing"
  | "order-details"
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
  const [screen, setScreen] = useState<Screen>("order-processing");
  const [orderData, setOrderData] = useState<unknown>(null);
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
        } catch (e) { }
      }

      const endpoint = userWarehouseId ? `/orders?store_id=${userWarehouseId}&view=shopkeeper&limit=100` : '/orders?view=shopkeeper&limit=100';
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

      // Sort filteredOrders latest first (descending order by date/createdAt)
      filteredOrders.sort((a: any, b: any) => {
        const timeA = new Date(a.created_at || a.createdAt || a.orderDate || 0).getTime();
        const timeB = new Date(b.created_at || b.createdAt || b.orderDate || 0).getTime();
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
    const tab = searchParams.get("tab") || "order-processing";
    setScreen(tab as Screen);
  }, [location]);

  const navigate = (dest: string, data?: unknown) => {
    setHistory(prev => [...prev, screen]);

    const isTab = ["order-processing", "packing-queue", "ready-orders", "settings", "staff-tracker", "self-pickup", "returns", "sla-monitoring"].includes(dest);
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
      const isTab = ["order-processing", "packing-queue", "ready-orders", "settings", "staff-tracker", "self-pickup", "returns", "sla-monitoring"].includes(prev);
      if (isTab) {
        reactNavigate(`/shopkeeper-erp?tab=${prev}`);
        setScreen(prev as Screen);
      } else {
        setScreen(prev);
      }
    } else {
      reactNavigate("/shopkeeper-erp?tab=order-processing");
      setScreen("order-processing");
    }
  };

  const renderScreen = () => {
    return (
      <div className="w-full">
        {screen === "order-processing" && <OrderProcessing orders={orders} onNavigate={navigate} />}
        {screen === "order-details" && <OrderDetails onBack={goBack} onNavigate={navigate} order={orderData as any} isAdmin={true} socket={socket} />}
        {screen === "picking-screen" && <PickingScreen onNavigate={navigate} onBack={goBack} order={orderData as any} />}
        {screen === "barcode-verification" && <BarcodeVerification onBack={goBack} onNavigate={navigate} data={orderData as any} />}
        {screen === "picking-complete" && <PickingComplete onNavigate={navigate} data={orderData as any} />}
        {screen === "packing-screen" && <PackingScreen onNavigate={navigate} onBack={goBack} order={orderData as any} />}
        {screen === "handover-verification" && <HandoverVerification onBack={goBack} onNavigate={navigate} data={orderData as any} />}
        {screen === "self-pickup" && <SelfPickup onBack={goBack} />}
        {screen === "returns" && <Returns onBack={goBack} />}
        {screen === "sla-monitoring" && <SLAMonitoring onBack={goBack} onNavigate={navigate} canConfigureSla={true} />}
        {screen === "staff-tracker" && <StaffTracker />}
        {screen === "settings" && <StorageOperations />}
      </div>
    );
  };



  return (
    <SharedOrdersContext.Provider value={{ orders, loading, refreshOrders: fetchOrders }}>
      <ShopkeeperNewOrderAlertProvider>
        <div className="flex flex-col gap-6 w-full min-h-screen bg-gray-100 dark:bg-gray-900">
          <div className="flex-1 w-full">
            {renderScreen()}
          </div>
        </div>
        <ShopkeeperNewOrderPopup />
      </ShopkeeperNewOrderAlertProvider>
    </SharedOrdersContext.Provider>
  );
}
