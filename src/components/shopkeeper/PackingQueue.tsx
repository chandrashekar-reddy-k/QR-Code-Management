import { useEffect, useMemo } from "react";
import { ArrowLeft, Clock, Package, Play, AlertCircle } from "lucide-react";
import api from "../../api/axios";
import { useSharedOrders } from "./SharedOrdersContext";

interface PackingQueueProps {
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

export function PackingQueue({ onNavigate, onBack }: PackingQueueProps) {
  const { orders: sharedOrders, refreshOrders } = useSharedOrders();

  const storedUser = localStorage.getItem("user");
  const userObj = storedUser ? JSON.parse(storedUser) : null;
  const userRole = userObj?.role;
  const shouldShowShopkeeper = ["PARTNER", "STORE_MANAGER", "ADMIN"].includes(userRole);

  const packingOrders = useMemo(() => {
    const orders = sharedOrders.filter((o: any) => {
      const s = o.status?.toLowerCase();
      return s === 'packing' || s === 'packed' || s === 'processing';
    });

    const allTrays = ["P01", "P02", "P03", "P04", "P05"];
    const assignedTrays = new Set<string>(
      orders.filter((o: any) => o.tray_number).map((o: any) => o.tray_number as string)
    );

    const processedOrders: any[] = [];
    for (const o of orders) {
      let tray = o.tray_number;
      if (!tray) {
        const nextFreeTray = allTrays.find(t => !assignedTrays.has(t));
        tray = nextFreeTray || 'P??';
        if (nextFreeTray) {
          assignedTrays.add(tray);
        }
      }
      const pickedCount = o.picked_count ?? o.item_count ?? 0;
      const acceptedMs = o.shopkeeper_accepted_at
        ? new Date(o.shopkeeper_accepted_at).getTime()
        : null;
      const pkElapsed = acceptedMs ? (Date.now() - acceptedMs) / 60000 : 0;
      const pkRemaining = o.sla_minutes - pkElapsed;
      processedOrders.push({
        ...o,
        items: pickedCount,
        tray,
        urgent: acceptedMs ? pkRemaining <= 10 : o.sla_minutes < 15
      });
    }
    return processedOrders;
  }, [sharedOrders]);

  useEffect(() => {
    const ordersToAssign = sharedOrders.filter((o: any) => {
      const s = o.status?.toLowerCase();
      return (s === 'packing' || s === 'packed' || s === 'processing') && !o.tray_number;
    });

    if (ordersToAssign.length > 0) {
      const assignTrays = async () => {
        const allTrays = ["P01", "P02", "P03", "P04", "P05"];
        const assignedTrays = new Set<string>(
          sharedOrders.filter((o: any) => o.tray_number).map((o: any) => o.tray_number as string)
        );

        for (const o of ordersToAssign) {
          const nextFreeTray = allTrays.find(t => !assignedTrays.has(t));
          const tray = nextFreeTray || 'P??';
          if (nextFreeTray) {
            assignedTrays.add(tray);
            try {
              await api.put(`/orders/${o.id}/status`, { status: 'packing', tray_number: tray });
            } catch (e) {
              console.warn('Failed to persist tray assignment', e);
            }
          }
        }
        await refreshOrders();
      };
      assignTrays();
    }
  }, [sharedOrders]);

  const stats = {
    awaiting: packingOrders.length,
    urgent: packingOrders.filter(o => o.urgent).length
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F7FA]">
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #EF5A06 0%, #D84315 100%)" }} className="px-4 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowLeft size={20} color="white" />
          </button>
          <div className="flex-1">
            <h1 className="text-white" style={{ fontWeight: 700, fontSize: "18px" }}>Packing Queue</h1>
            <p className="text-white/70" style={{ fontSize: "12px" }}>{packingOrders.length} orders ready to pack</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          {[
            { label: "Awaiting", value: stats.awaiting, color: "white" },
            { label: "Urgent", value: stats.urgent, color: "#FFF3E0" },
            { label: "Avg SLA", value: "13m", color: "#E8F5E9" },
          ].map(s => (
            <div key={s.label} className="bg-white/10 rounded-xl p-2 text-center">
              <p style={{ color: s.color, fontWeight: 700, fontSize: "18px" }}>{s.value}</p>
              <p className="text-white/70" style={{ fontSize: "10px" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Packing Tray Overview */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-gray-700 mb-3" style={{ fontWeight: 600, fontSize: "13px" }}>Packing Trays</h3>
          <div className="grid grid-cols-5 gap-2">
            {(() => {
              // Collect all trays currently in use by real orders
              const activeTraySet = new Set(packingOrders.map(o => o.tray).filter(Boolean));
              // Build a display list: active trays first, then fill remaining slots up to 5 with free trays
              const allSlots = ["P01", "P02", "P03", "P04", "P05"];
              // Keep original order but mark each slot correctly
              return allSlots.map((tray) => {
                const isActive = activeTraySet.has(tray);
                const matchedOrder = packingOrders.find(o => o.tray === tray);
                return (
                  <div key={tray} className="flex flex-col items-center">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-1"
                      style={{
                        backgroundColor: isActive ? "#FFF3E0" : "#E8F5E9",
                        border: isActive ? "2px solid #EF5A0633" : "2px solid transparent"
                      }}
                    >
                      <Package size={20} color={isActive ? "#EF5A06" : "#00891D"} />
                    </div>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: isActive ? "#EF5A06" : "#00891D" }}>{tray}</span>
                    <span style={{ fontSize: "9px", color: isActive ? "#EF5A06" : "#2b7724ff", fontWeight: isActive ? 600 : 400 }}>
                      {isActive ? (matchedOrder?.order_number || "Active") : "Free"}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Orders */}
      <div className="flex flex-col gap-3 p-4">
        {packingOrders.map((order) => (
          <div key={order.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {order.urgent && (
              <div className="bg-orange-50 border-b border-orange-100 px-4 py-1.5 flex items-center gap-1.5">
                <AlertCircle size={12} color="#EF5A06" />
                <span style={{ color: "#EF5A06", fontWeight: 600, fontSize: "11px" }}>URGENT — SLA Critical!</span>
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-gray-900" style={{ fontWeight: 700, fontSize: "15px" }}>{order.order_number}</span>
                    <span className="rounded-full px-2 py-0.5" style={{ fontSize: "10px", fontWeight: 600, backgroundColor: "#FFF3E0", color: "#EF5A06" }}>
                      Tray {order.tray}
                    </span>
                  </div>
                  {shouldShowShopkeeper && (
                    <p className="text-gray-500 text-xs mb-1">
                      {order.shopkeeper_name || "Unassigned"}
                    </p>
                  )}
                  <span className="text-gray-500" style={{ fontSize: "12px" }}>{order.order_type}</span>
                </div>
                <div className="flex items-center gap-1 rounded-full px-2.5 py-1" style={{ backgroundColor: order.urgent ? "#FFEBEE" : "#FFF3E0" }}>
                  <Clock size={11} color={order.urgent ? "#D32F2F" : "#EF5A06"} />
                  <span style={{ color: order.urgent ? "#D32F2F" : "#EF5A06", fontWeight: 700, fontSize: "11px" }}>
                    {order.shopkeeper_accepted_at
                      ? (() => {
                          const rem = order.sla_minutes - Math.floor((Date.now() - new Date(order.shopkeeper_accepted_at).getTime()) / 60000);
                          return rem < 0 ? `Overdue ${Math.abs(rem)}m` : `${rem}m left`;
                        })()
                      : `${order.sla_minutes}m`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5 mb-3">
                <Package size={14} color="#EF5A06" />
                <span className="text-gray-600" style={{ fontSize: "12px" }}>{order.items} items to pack</span>
                <span className="ml-auto text-gray-400" style={{ fontSize: "11px" }}>Tray: {order.tray}</span>
              </div>

              <button
                onClick={() => onNavigate("packing-screen", order)}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3"
                style={{ backgroundColor: "#EF5A06" }}
              >
                <Play size={16} color="white" />
                <span className="text-white" style={{ fontWeight: 600, fontSize: "14px" }}>Start Packing — Tray {order.tray}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
