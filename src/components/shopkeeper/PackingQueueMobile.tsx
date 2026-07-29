import { useState, useEffect } from "react";
import { ArrowLeft, Clock, Package, Play, AlertCircle } from "lucide-react";
import { useSharedOrders } from "./SharedOrdersContext";
import { getSLAInfo } from "../../utils/slaHelper";

interface PackingQueueMobileProps {
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

// Skeleton shimmer box
function SkeletonBox({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-lg bg-gray-200 dark:bg-gray-700 overflow-hidden relative ${className}`}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)",
          animation: "shimmer 1.6s ease-in-out infinite",
        }}
      />
    </div>
  );
}

function PackingQueueSkeleton() {
  return (
    <div className="flex flex-col min-h-screen bg-[#F5F7FA] dark:bg-gray-900">
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      {/* Header skeleton */}
      <div style={{ background: "linear-gradient(135deg, #EF5A06 0%, #D84315 100%)" }} className="px-4 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-white/20" />
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="h-5 w-36 rounded-lg bg-white/30" />
            <div className="h-3 w-24 rounded-lg bg-white/20" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/10 rounded-xl p-2 text-center">
              <div className="h-5 w-6 mx-auto rounded-md bg-white/30 mb-1" />
              <div className="h-2 w-12 mx-auto rounded-md bg-white/20" />
            </div>
          ))}
        </div>
      </div>

      {/* Packing trays skeleton */}
      <div className="px-4 mt-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <SkeletonBox className="h-4 w-28 mb-3" />
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex flex-col items-center gap-1">
                <SkeletonBox className="w-12 h-12 rounded-xl" />
                <SkeletonBox className="h-2.5 w-8" />
                <SkeletonBox className="h-2 w-10" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Card skeletons */}
      <div className="flex flex-col gap-3 p-4">
        {[1, 2].map(i => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <SkeletonBox className="h-5 w-24" />
                  <SkeletonBox className="h-4 w-16 rounded-full" />
                </div>
                <SkeletonBox className="h-3 w-20" />
              </div>
              <SkeletonBox className="h-6 w-16 rounded-full" />
            </div>
            <SkeletonBox className="h-10 w-full rounded-xl mb-3" />
            <SkeletonBox className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PackingQueueMobile({ onNavigate, onBack }: PackingQueueMobileProps) {
  const [packingOrders, setPackingOrders] = useState<any[]>([]);
  const { orders: sharedOrders, loading } = useSharedOrders();

  useEffect(() => {
    const orders = sharedOrders.filter((o: any) => {
      const s = o.status?.toLowerCase();
      return s === 'packing' || s === 'packed' || s === 'processing';
    });

    const processedOrders: any[] = [];
    for (const o of orders) {
      const tray = o.tray_number || 'N/A';
      // Use picked_count from the DB — rejected items don't need to be packed
      const pickedCount = o.picked_count ?? o.item_count ?? 0;
      // Compute urgency based on shopkeeper_accepted_at if available, else fall back to sla_minutes < 15
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

    setPackingOrders(processedOrders);
  }, [sharedOrders]);

  // Show skeleton while loading initial data
  if (loading && sharedOrders.length === 0) {
    return <PackingQueueSkeleton />;
  }

  const stats = {
    awaiting: packingOrders.length,
    urgent: packingOrders.filter(o => o.urgent).length
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F7FA] dark:bg-gray-900">
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
            { label: "Urgent", value: stats.urgent, color: "white" },
            { label: "Avg SLA", value: "13m", color: "white" },
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
        <div className="bg-white rounded-2xl p-4 shadow-sm dark:bg-gray-800">
          <h3 className="text-gray-700 mb-3 dark:text-gray-300" style={{ fontWeight: 600, fontSize: "13px" }}>Packing Trays</h3>
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
        {packingOrders.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 flex flex-col items-center justify-center text-center shadow-sm">
            <Package size={48} color="#EF5A06" className="mb-3 opacity-40" />
            <h3 className="text-gray-900 dark:text-gray-100 font-bold mb-1">No Orders to Pack</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Waiting for picking to complete.</p>
          </div>
        ) : (
          packingOrders.map((order) => {
            const slaInfo = getSLAInfo(order);
            const slaBreached = slaInfo.status === 'breached';
            const isUrgent = slaInfo.status === 'at_risk';
            const slaColor = slaBreached ? "#D32F2F" : isUrgent ? "#EF5A06" : "#00891D";
            const slaBg = slaBreached ? "#FFEBEE" : isUrgent ? "#FFEBEE" : "#E8F5E9";

            return (
              <div key={order.id} className="bg-white rounded-2xl shadow-sm overflow-hidden dark:bg-gray-800">
                {(slaBreached || isUrgent) && (
                  <div className="bg-orange-50 border-b border-orange-100 px-4 py-1.5 flex items-center gap-1.5">
                    <AlertCircle size={12} color={slaColor} />
                    <span style={{ color: slaColor, fontWeight: 600, fontSize: "11px" }}>
                      {slaBreached ? "URGENT — SLA Breached!" : "URGENT — SLA Critical!"}
                    </span>
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-gray-900 dark:text-gray-100" style={{ fontWeight: 700, fontSize: "15px" }}>{order.order_number}</span>
                        <span className="rounded-full px-2 py-0.5" style={{ fontSize: "10px", fontWeight: 600, backgroundColor: "#FFF3E0", color: "#EF5A06" }}>
                          Tray {order.tray}
                        </span>
                      </div>
                      <span className="text-gray-500 dark:text-gray-400" style={{ fontSize: "12px" }}>{order.order_type}</span>
                    </div>
                    <div className="flex items-center gap-1 rounded-full px-2.5 py-1" style={{ backgroundColor: slaBg }}>
                      <Clock size={11} color={slaColor} />
                      <span style={{ color: slaColor, fontWeight: 700, fontSize: "11px" }}>
                        {slaInfo.displayText}
                      </span>
                    </div>
                  </div>

                <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5 mb-3 dark:bg-gray-900">
                  <Package size={14} color="#EF5A06" />
                  <span className="text-gray-600 dark:text-gray-400" style={{ fontSize: "12px" }}>{order.items} items to pack</span>
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
          );
        })
        )}
      </div>
    </div>
  );
}
