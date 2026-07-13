import { useState, useMemo } from "react";
import { ArrowLeft, Clock, Search, ShoppingBag, X } from "lucide-react";

interface AllOrdersProps {
  onBack: () => void;
  onNavigate?: (screen: string, data?: any) => void;
  initialStatus?: string;
  isAdmin?: boolean;
}

const getLatestActivityTime = (order: any): number => {
  const fields = [
    order.dispatchedAt, order.dispatched_at,
    order.deliveredAt, order.delivered_at,
    order.readyAt, order.ready_at,
    order.packedAt, order.packed_at,
    order.pickedAt, order.picked_at,
    order.updatedAt, order.updated_at,
    order.createdAt, order.created_at
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

const tabs = ["All", "New", "Picking", "Packing", "Ready", "Dispatched", "Rejected", "Returns"];

const tabMap: Record<string, string> = {
  NEW: "New",
  PICKING: "Picking",
  PACKING: "Packing",
  READY: "Ready",
  DISPATCHED: "Dispatched",
  REJECTED: "Rejected",
  RETURNS: "Returns",
};

import { useSharedOrders } from "./SharedOrdersContext";

export function AllOrders({ onBack, onNavigate, initialStatus, isAdmin = false }: AllOrdersProps) {
  const { orders: sharedOrders, loading: sharedLoading } = useSharedOrders();
  const [searchQuery, setSearchQuery] = useState("");

  const storedUser = localStorage.getItem("user");
  const userObj = storedUser ? JSON.parse(storedUser) : null;
  const userRole = userObj?.role;
  const shouldShowShopkeeper = ["PARTNER", "STORE_MANAGER", "ADMIN"].includes(userRole);
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (initialStatus) {
      return tabMap[initialStatus.toUpperCase()] ?? "All";
    }
    return "All";
  });

  const orders = useMemo(() => {
    const cachedWh = localStorage.getItem("warehouseId");
    const storedU = localStorage.getItem("user");
    let userWarehouseId = "";
    if (cachedWh && cachedWh !== "undefined") {
      userWarehouseId = cachedWh;
    } else if (storedU) {
      try {
        const u = JSON.parse(storedU);
        userWarehouseId = u.warehouseId || u.warehouse_id || u.partnerWarehouseId || u.id || "";
      } catch (e) { }
    }

    let allOrders = [...sharedOrders];

    // Filter to valid orders: must have a warehouse and must match user's warehouseId if set
    allOrders = allOrders.filter((o: any) => {
      const oWh = o.warehouseId || o.warehouse_id;
      if (!oWh) return false;
      if (userWarehouseId && oWh !== userWarehouseId) return false;
      return true;
    });

    // Staff view client-side shopkeeper filter
    if (!isAdmin) {
      const storedUser = localStorage.getItem("user");
      const user = storedUser ? JSON.parse(storedUser) : null;
      const skId = user?.shopkeeper_id || user?.shopkeeperId || user?.id;
      const skPhone = user?.phone;
      if (skId || skPhone) {
        allOrders = allOrders.filter((o: any) => {
          const matchesId = skId && (o.assignedShopkeeperId === skId || o.assigned_shopkeeper_id === skId);
          const matchesPhone = skPhone && (o.assignedShopkeeper?.phone === skPhone || o.assigned_shopkeeper_phone === skPhone || o.shopkeeper_phone === skPhone);
          return matchesId || matchesPhone;
        });
      }
    }
    return allOrders;
  }, [sharedOrders, isAdmin]);

  const filteredOrders = useMemo(() => {
    let result = orders;

    if (activeTab !== "All") {
      result = orders.filter((o: any) => {
        const s = o.status?.toLowerCase();
        if (activeTab === "New") return s === "new" || s === "placed";
        if (activeTab === "Picking") return s === "picking" || s === "accepted" || s === "confirmed";
        if (activeTab === "Packing") return s === "packing" || s === "processing";
        if (activeTab === "Ready") return s === "ready";
        if (activeTab === "Dispatched") return s === "dispatched";
        if (activeTab === "Rejected") return s === "rejected" || s === "cancelled";
        if (activeTab === "Returns") return s === "return" || s === "returned";
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((o: any) => {
        const orderNum = String(o.order_number || o.orderNumber || "").toLowerCase();
        const orderId = String(o.id || "").toLowerCase();
        return orderNum.includes(q) || orderId.includes(q);
      });
    }

    return [...result].sort((a, b) => getLatestActivityTime(b) - getLatestActivityTime(a));
  }, [orders, activeTab, searchQuery]);

  const statusStyles: Record<string, { color: string; bg: string }> = {
    new: { color: "#1565C0", bg: "#E3F2FD" },
    picking: { color: "#6A1B9A", bg: "#F3E5F5" },
    packing: { color: "#E65100", bg: "#FFF3E0" },
    ready: { color: "#14B8A6", bg: "#E8F5E9" },
    dispatched: { color: "#2E7D32", bg: "#E0F2F1" },
    delivered: { color: "#1B5E20", bg: "#C8E6C9" },
    cancelled: { color: "#D32F2F", bg: "#FFEBEE" },
    rejected: { color: "#D32F2F", bg: "#FFEBEE" },
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F7FA] pb-10 dark:bg-gray-900">
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #00891D 0%, #006614 100%)" }} className="px-4 pt-12 pb-6 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
        >
          <ArrowLeft size={20} color="white" />
        </button>
        <div>
          <h1 className="text-white text-xl font-bold">Order History</h1>
          <p className="text-white/80 text-xs">{filteredOrders.length} orders total</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 mt-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by Order ID / Number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 rounded-2xl border border-gray-100 shadow-sm focus:outline-none focus:border-green-500 bg-white text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mt-4 overflow-x-auto scrollbar-none flex gap-2 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${activeTab === tab
                ? "bg-[#00891D] border-[#00891D] text-white shadow-sm"
                : "bg-white border-gray-100 text-gray-600 hover:bg-gray-50"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="px-4 mt-4 flex flex-col gap-3">
        {sharedLoading && filteredOrders.length === 0 ? (
          <div className="py-10 text-center text-gray-500 text-sm dark:text-gray-400">Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-3 shadow-sm border border-gray-100 text-center dark:bg-gray-800 dark:border-gray-700">
            <ShoppingBag size={48} className="text-gray-300" />
            <p className="text-gray-700 font-semibold text-sm dark:text-gray-300">No orders found</p>
            <p className="text-gray-400 text-xs">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const statusColor = statusStyles[order.status?.toLowerCase()]?.color || "#757575";
            const statusBg = statusStyles[order.status?.toLowerCase()]?.bg || "#F5F5F5";

            return (
              <div
                key={order.id}
                onClick={() => onNavigate && onNavigate("order-details", order)}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left flex items-start gap-3 cursor-pointer hover:border-green-300 transition-colors dark:bg-gray-800 dark:border-gray-700"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: statusBg }}>
                  <ShoppingBag size={18} color={statusColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-800 font-bold text-sm dark:text-gray-200">{order.order_number || order.orderNumber}</span>
                    <span className="rounded-full px-2 py-0.5 uppercase text-[10px] font-bold" style={{ backgroundColor: statusBg, color: statusColor }}>
                      {order.status}
                    </span>
                  </div>
                  {shouldShowShopkeeper && (
                    <div className="mt-0.5">
                      <span className="text-gray-400 text-xs">Shopkeeper: </span>
                      <span className={order.shopkeeper_name ? "text-gray-600 text-xs font-medium" : "text-gray-400 text-xs"}>
                        {order.shopkeeper_name || "Unassigned"}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-1 text-xs">
                    <span className="text-gray-500 dark:text-gray-400">{order.order_type || "Home Delivery"} · ₹{order.total_value || order.totalAmount}</span>
                    <span className="text-gray-400">
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
                          rejected: { label: "Rejected", fields: ["updatedAt", "updated_at"] },
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

                        if (!ts) return `${label}: ΓÇö`;
                        const date = new Date(ts);
                        if (isNaN(date.getTime())) return `${label}: ΓÇö`;
                        return `${label}: ${date.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true })}`;
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1.5">
                    <Clock size={10} className="text-gray-400" />
                    <span className="text-gray-400 text-[10px]">SLA: {order.sla_minutes || 30} min</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
