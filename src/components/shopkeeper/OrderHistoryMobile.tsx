import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, Clock, Search, ShoppingBag, X } from "lucide-react";

interface OrderHistoryMobileProps {
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



const tabMap: Record<string, string> = {
  NEW: "New",
  PICKING: "Picking",
  PACKING: "Packing",
  READY: "Ready",
  DISPATCHED: "Dispatched",
  REJECTED: "Rejected",
  IGNORED: "Ignored Orders",
  RETURNS: "Returns",
};

import { useSharedOrders } from "./SharedOrdersContext";
import api from "../../api/axios";

export function OrderHistoryMobile({ onBack, onNavigate, initialStatus, isAdmin = false }: OrderHistoryMobileProps) {
  const { orders: sharedOrders, loading: sharedLoading } = useSharedOrders();
  const [searchQuery, setSearchQuery] = useState("");
  const [ignoredOrdersList, setIgnoredOrdersList] = useState<any[]>([]);

  const isShopkeeper = window.location.pathname.startsWith('/shopkeeper') && !window.location.pathname.startsWith('/shopkeeper-erp');
  const storedUser = isShopkeeper ? sessionStorage.getItem("staffUser") : localStorage.getItem("partnerUser");
  const userObj = storedUser ? JSON.parse(storedUser) : null;
  const userRole = userObj?.role;
  const shouldShowShopkeeper = ["PARTNER", "STORE_MANAGER", "ADMIN"].includes(userRole);
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (initialStatus) {
      if (!isAdmin && initialStatus.toUpperCase() === "DISPATCHED") return "Handed Over";
      return tabMap[initialStatus.toUpperCase()] ?? "All";
    }
    return "All";
  });

  useEffect(() => {
    if (!isAdmin) {
      const fetchIgnored = async () => {
        try {
          const res = await api.get('/orders?view=shopkeeper_ignored&limit=100');
          if (res.data?.orders) {
            setIgnoredOrdersList(res.data.orders);
          }
        } catch (e) {
          console.error("Failed to fetch ignored orders", e);
        }
      };
      fetchIgnored();
    }
  }, [isAdmin, sharedOrders]);

  const handedOverIds = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('handedOverIds') || '[]');
    } catch {
      return [];
    }
  }, []);

  const dynamicTabs = useMemo(() => {
    if (!isAdmin) {
      return ["All", "New", "Picking", "Packing", "Ready", "Handed Over", "Ignored Orders", "Returns"];
    }
    return ["All", "New", "Picking", "Packing", "Ready", "Dispatched", "Rejected", "Returns"];
  }, [isAdmin]);

  const orders = useMemo(() => {
    const cachedWh = !isAdmin ? sessionStorage.getItem("staffWarehouseId") : localStorage.getItem("partnerWarehouseId");
    const storedU = !isAdmin ? sessionStorage.getItem("staffUser") : localStorage.getItem("partnerUser");
    let userWarehouseId: any = "";
    if (cachedWh && cachedWh !== "undefined") {
      userWarehouseId = cachedWh;
    } else if (storedU) {
      try {
        const u = JSON.parse(storedU);
        userWarehouseId = u.warehouseId || u.warehouse_id || u.partnerWarehouseId || "";
      } catch (e) { }
    }
    if (userWarehouseId && typeof userWarehouseId === 'object' && userWarehouseId.id) {
      userWarehouseId = userWarehouseId.id;
    }

    let allOrders = [...sharedOrders];

    // Filter to valid orders: must have a warehouse and must match user's warehouseId if set
    allOrders = allOrders.filter((o: any) => {
      const oWh = o.warehouseId?.id || o.warehouseId || o.warehouse_id?.id || o.warehouse_id;
      if (!oWh) return false;
      if (isAdmin && userWarehouseId && String(oWh) !== String(userWarehouseId)) return false;
      return true;
    });

    if (!isAdmin) {
      const storedUser = !isAdmin ? sessionStorage.getItem("staffUser") : localStorage.getItem("partnerUser");
      const user = storedUser ? JSON.parse(storedUser) : null;
      let rawSkId = user?.shopkeeper_id || user?.shopkeeperId || user?.id;
      if (rawSkId && typeof rawSkId === 'object' && rawSkId.id) rawSkId = rawSkId.id;
      const skId = rawSkId;
      const skPhone = user?.phone;
      if (skId || skPhone) {
        allOrders = allOrders.filter((o: any) => {
          let oAssignedId = o.assignedShopkeeperId || o.assigned_shopkeeper_id || o.shopkeeper_id;
          if (oAssignedId && typeof oAssignedId === 'object' && oAssignedId.id) oAssignedId = oAssignedId.id;
          const matchesId = skId && String(oAssignedId) === String(skId);
          const matchesPhone = skPhone && (o.assignedShopkeeper?.phone === skPhone || o.assigned_shopkeeper_phone === skPhone || o.shopkeeper_phone === skPhone);
          const matchesHandedOver = handedOverIds.map(String).includes(String(o.id || o.order_number));
          return matchesId || matchesPhone || matchesHandedOver;
        });
      }
    }
    return allOrders;
  }, [sharedOrders, isAdmin, handedOverIds]);

  const filteredOrders = useMemo(() => {
    let result = orders;

    if (activeTab === "Ignored Orders") {
      result = ignoredOrdersList;
    } else if (activeTab !== "All") {
      result = orders.filter((o: any) => {
        const s = o.status?.toLowerCase();
        if (activeTab === "New") return s === "new" || s === "placed" || s === "assigned";
        if (activeTab === "Picking") return s === "picking" || s === "accepted" || s === "confirmed";
        if (activeTab === "Packing") return s === "packing" || s === "processing";
        if (activeTab === "Ready") return s === "ready" && (!isAdmin ? !handedOverIds.map(String).includes(String(o.id || o.order_number)) : true);
        if (activeTab === "Dispatched") return s === "dispatched";
        if (activeTab === "Handed Over") return s === "dispatched" || (s === "ready" && handedOverIds.map(String).includes(String(o.id || o.order_number)));
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
  }, [orders, activeTab, searchQuery, isAdmin, handedOverIds]);

  const statusStyles: Record<string, { color: string; bg: string }> = {
    new: { color: "#1D4ED8", bg: "#EFF6FF" },
    placed: { color: "#1D4ED8", bg: "#EFF6FF" },
    assigned: { color: "#4B5563", bg: "#F3F4F6" },
    accepted: { color: "#1D4ED8", bg: "#EFF6FF" },
    picking: { color: "#7C3AED", bg: "#F5F3FF" },
    packing: { color: "#EA580C", bg: "#FFF7ED" },
    ready: { color: "#0D9488", bg: "#F0FDFA" },
    ready_for_dispatch: { color: "#0D9488", bg: "#F0FDFA" },
    dispatched: { color: "#16A34A", bg: "#F0FDF4" },
    completed: { color: "#16A34A", bg: "#F0FDF4" },
    delivered: { color: "#16A34A", bg: "#F0FDF4" },
    cancelled: { color: "#DC2626", bg: "#FEF2F2" },
    rejected: { color: "#DC2626", bg: "#FEF2F2" },
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
          <p className="text-white/80 text-xs">{filteredOrders.length} filtered / {orders.length} orders / {sharedOrders.length} shared</p>
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
        {dynamicTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${activeTab === tab
                ? "bg-[#00891D] border-[#00891D] text-white shadow-sm"
                : "bg-white border-gray-100 text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
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
            const lowerStatus = (order.status || "").toLowerCase();
            const isHandedOverLocally = !isAdmin && lowerStatus === 'ready' && handedOverIds.map(String).includes(String(order.id));
            const effectiveStatus = isHandedOverLocally ? 'dispatched' : lowerStatus;

            const statusColor = statusStyles[effectiveStatus]?.color || "#757575";
            const statusBg = statusStyles[effectiveStatus]?.bg || "#F5F5F5";

            const formatStatusDisplay = (status: string) => {
              if (isHandedOverLocally) return "Handed Over";
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
                ASSIGNED: "Assigned",
                ACCEPTED: "Accepted",
                PICKING: "Picking",
                PACKING: "Packing",
                READY: "Ready",
                DISPATCHED: !isAdmin ? "Handed Over" : "Dispatched",
                COMPLETED: "Completed",
                REJECTED: "Rejected",
              };
              return statusMap[statusUpper] || status;
            };
            return (
              <div
                key={order.id}
                onClick={() => onNavigate && onNavigate("order-details", order)}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left flex items-start gap-3 cursor-pointer hover:border-green-300 transition-colors dark:bg-gray-800 dark:border-gray-700"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: activeTab === "Ignored Orders" ? "#FEF2F2" : statusBg }}>
                  <ShoppingBag size={18} style={{ color: activeTab === "Ignored Orders" ? "#DC2626" : statusColor }} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-gray-900 truncate pr-2 text-[15px] dark:text-white">
                      {order.order_number || order.orderNumber || order.id}
                    </span>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide whitespace-nowrap uppercase"
                      style={{
                        backgroundColor: activeTab === "Ignored Orders" ? "#FEF2F2" : statusBg,
                        color: activeTab === "Ignored Orders" ? "#DC2626" : statusColor,
                      }}
                    >
                      {activeTab === "Ignored Orders" ? "Ignored" : formatStatusDisplay(order.status)}
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
                  {!(isShopkeeper && ['dispatched', 'delivered', 'completed', 'out_for_delivery'].includes((order.status || '').toLowerCase())) && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <Clock size={10} className="text-gray-400" />
                      <span className="text-gray-400 text-[10px]">SLA: {order.sla_minutes || 30} min</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
