import { useState, useEffect } from "react";
import { ArrowLeft, Clock, Package, Play, AlertCircle, CheckCircle2, ChevronRight } from "lucide-react";
import api from "../../api/axios";
import { useSocket } from "../../hooks/useSocket";

interface PickingQueueProps {
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

function PriorityBadge({ priority }: { priority: string }) {
  const config = {
    HIGH: { bg: "#FFEBEE", color: "#D32F2F" },
    MEDIUM: { bg: "#FFF3E0", color: "#EF5A06" },
    LOW: { bg: "#E8F5E9", color: "#00891D" },
  }[priority] || { bg: "#F5F5F5", color: "#757575" };

  return (
    <span className="rounded-full px-2 py-0.5" style={{ backgroundColor: config.bg, color: config.color, fontWeight: 600, fontSize: "10px" }}>
      {priority}
    </span>
  );
}

export function PickingQueueMobile({ onNavigate, onBack }: PickingQueueProps) {
  const [pickingOrders, setPickingOrders] = useState<any[]>([]);
  const socket = useSocket(1);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders');
      // Filter for accepted or picking statuses
      const orders = res.data.filter((o: any) => {
        const s = o.status?.toLowerCase();
        return s === 'accepted' || s === 'picking' || s === 'confirmed';
      });
      
      // Calculate mock items data if backend doesn't return full details in this endpoint yet
      const processedOrders = orders.map((o: any) => ({
        ...o,
        items: o.item_count || 0,
        picked: o.picked_count || 0
      }));
      setPickingOrders(processedOrders);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrders();
    if (socket.current) {
      socket.current.on('order:status', fetchOrders);
    }
    return () => {
      if (socket.current) socket.current.off('order:status');
    };
  }, [socket.current]);

  const stats = {
    pending: pickingOrders.filter(o => o.picked === 0).length,
    inProgress: pickingOrders.filter(o => o.picked > 0 && o.picked < o.items).length,
    completed: pickingOrders.filter(o => o.picked === o.items).length
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F7FA] dark:bg-gray-900">
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #00891D 0%, #006614 100%)" }} className="px-4 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/20 dark:bg-gray-800/20 flex items-center justify-center">
            <ArrowLeft size={20} color="white" />
          </button>
          <div className="flex-1">
            <h1 className="text-white" style={{ fontWeight: 700, fontSize: "18px" }}>Picking Queue</h1>
            <p className="text-white/70" style={{ fontSize: "12px" }}>{pickingOrders.length} orders to pick</p>
          </div>
          <div className="bg-white/20 dark:bg-gray-800/20 rounded-full px-3 py-1">
            <span className="text-white" style={{ fontWeight: 600, fontSize: "13px" }}>{pickingOrders.reduce((sum, o) => sum + (o.items || 0), 0)} items total</span>
          </div>
        </div>

        {/* Summary Row */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[
            { label: "Pending", value: stats.pending, color: "white" },
            { label: "In Progress", value: stats.inProgress, color: "#EF5A06" },
            { label: "Completed", value: stats.completed, color: "#00891D" },
          ].map(s => (
            <div key={s.label} className="bg-white/20 dark:bg-gray-800/10 rounded-xl p-2 text-center">
              <p style={{ color: s.color, fontWeight: 700, fontSize: "18px" }}>{s.value}</p>
              <p className="text-white/70" style={{ fontSize: "10px" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="flex flex-col gap-3 p-4">
        {pickingOrders.map((order) => {
          const progress = (order.picked / order.items) * 100;
          const isCompleted = order.picked === order.items;
          const isInProgress = order.picked > 0 && !isCompleted;
          const isUrgent = order.sla_minutes <= 10;
          // Compute SLA remaining from shopkeeper_accepted_at
          const acceptedAt = order.shopkeeper_accepted_at
            ? new Date(order.shopkeeper_accepted_at).getTime()
            : null;
          const elapsedMin = acceptedAt
            ? Math.floor((Date.now() - acceptedAt) / 60000)
            : 0;
          const remainingMin = order.sla_minutes - elapsedMin;
          const slaBreached = acceptedAt !== null && remainingMin < 0;
          const slaLabel = acceptedAt
            ? slaBreached
              ? `Overdue ${Math.abs(remainingMin)}m`
              : `${remainingMin}m left`
            : `${order.sla_minutes}m`;
          const slaColor = slaBreached ? "#D32F2F" : isUrgent ? "#EF5A06" : "#EF5A06";
          const slaBg = slaBreached ? "#FFEBEE" : isUrgent ? "#FFEBEE" : "#FFF3E0";

          return (
            <div key={order.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
              {/* SLA Alert Banner */}
              {(slaBreached || isUrgent) && !isCompleted && (
                <div className="bg-red-50 border-b border-red-100 px-4 py-1.5 flex items-center gap-1.5">
                  <AlertCircle size={12} color="#D32F2F" />
                  <span style={{ color: "#D32F2F", fontWeight: 600, fontSize: "11px" }}>
                    {slaBreached ? "SLA BREACHED — Pick immediately!" : "SLA CRITICAL — Pick immediately!"}
                  </span>
                </div>
              )}
              {isCompleted && (
                <div className="bg-green-50 border-b border-green-100 px-4 py-1.5 flex items-center gap-1.5">
                  <CheckCircle2 size={12} color="#00891D" />
                  <span style={{ color: "#00891D", fontWeight: 600, fontSize: "11px" }}>Picking Complete — Move to Packing</span>
                </div>
              )}

              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-900 dark:text-gray-100" style={{ fontWeight: 700, fontSize: "16px" }}>{order.order_number}</span>
                      <PriorityBadge priority={order.priority} />
                    </div>
                    <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500" style={{ fontSize: "12px" }}>{order.order_type}</span>
                  </div>
                  <div className="flex items-center gap-1 rounded-full px-2.5 py-1" style={{ backgroundColor: slaBg }}>
                    <Clock size={11} color={slaColor} />
                    <span style={{ color: slaColor, fontWeight: 700, fontSize: "11px" }}>{slaLabel}</span>
                  </div>
                </div>

                {/* Pick Progress */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Package size={13} color="#9E9E9E" />
                      <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500" style={{ fontSize: "12px" }}>{order.picked}/{order.items} items picked</span>
                    </div>
                    <span style={{ color: isCompleted ? "#00891D" : "#EF5A06", fontWeight: 600, fontSize: "12px" }}>
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${progress}%`, backgroundColor: isCompleted ? "#00891D" : "#EF5A06" }}
                    />
                  </div>
                </div>

                {/* Action Button */}
                {isCompleted ? (
                  <button
                    onClick={() => onNavigate("packing-queue")}
                    className="w-full flex items-center justify-center gap-2 rounded-xl py-3"
                    style={{ backgroundColor: "#00891D" }}
                  >
                    <ChevronRight size={16} color="white" />
                    <span className="text-white" style={{ fontWeight: 600, fontSize: "14px" }}>Move to Packing</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onNavigate("picking-screen", order)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl py-3"
                    style={{ backgroundColor: isInProgress ? "#EF5A06" : "#00891D" }}
                  >
                    <Play size={16} color="white" />
                    <span className="text-white" style={{ fontWeight: 600, fontSize: "14px" }}>
                      {isInProgress ? "Continue Picking" : "Start Picking"}
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
