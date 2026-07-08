import { useState, useEffect } from "react";
import { ArrowLeft, Package, CheckCircle, QrCode, AlertCircle, Loader2, User } from "lucide-react";
import api from "../../api/axios";

interface ReadyOrdersProps {
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

import { useMemo } from "react";
import { useSharedOrders } from "./SharedOrdersContext";

export function ReadyOrders({ onNavigate, onBack }: ReadyOrdersProps) {
  const { orders: sharedOrders, refreshOrders, loading: sharedLoading } = useSharedOrders();

  const storedUser = localStorage.getItem("user");
  const userObj = storedUser ? JSON.parse(storedUser) : null;
  const userRole = userObj?.role;
  const shouldShowShopkeeper = ["PARTNER", "STORE_MANAGER", "ADMIN"].includes(userRole);

  const [agents, setAgents] = useState<any[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    api.get('/delivery-agents')
      .then(res => setAgents(res.data))
      .catch(err => console.error("Failed to load riders", err));
  }, []);

  const handleAssignRider = async (orderId: string, agentId: string) => {
    if (!agentId) return;
    setAssigningId(orderId);
    try {
      await api.post(`/orders/${orderId}/assign-rider`, { agentId });
      await refreshOrders();
    } catch (err) {
      console.error("Failed to assign rider", err);
    } finally {
      setAssigningId(null);
    }
  };

  const orders = useMemo(() => {
    return sharedOrders.filter((o: any) => o.status?.toLowerCase() === 'ready' && o.order_type !== 'Self Pickup');
  }, [sharedOrders]);

  if (sharedLoading && orders.length === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F5F7FA] items-center justify-center">
        <Loader2 className="animate-spin text-[#2E7D32]" size={40} />
      </div>
    );
  }

  // Count SLA-breached orders: elapsed from shopkeeper_accepted_at > sla_minutes
  const overdueCount = orders.filter(o => {
    if (!o.shopkeeper_accepted_at) return false;
    const elapsed = (Date.now() - new Date(o.shopkeeper_accepted_at).getTime()) / 60000;
    return elapsed > o.sla_minutes;
  }).length;
  const riderAssignedCount = orders.filter(o => !!o.agentId).length;

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F7FA]">
      <div style={{ background: "linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%)" }} className="px-4 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowLeft size={20} color="white" />
          </button>
          <div className="flex-1">
            <h1 className="text-white" style={{ fontWeight: 700, fontSize: "18px" }}>Ready for Dispatch</h1>
            <p className="text-white/70" style={{ fontSize: "12px" }}>{orders.length} orders packed & ready</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          {[
            { label: "Ready", value: orders.length, color: "white" },
            { label: "Rider Assigned", value: riderAssignedCount, color: "#4CAF50" },
            { label: "Overdue", value: overdueCount, color: "#FF5252" },
          ].map(s => (
            <div key={s.label} className="bg-white/10 rounded-xl p-2 text-center">
              <p style={{ color: s.color, fontWeight: 700, fontSize: "18px" }}>{s.value}</p>
              <p className="text-white/70" style={{ fontSize: "10px" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {orders.map((order) => {
          const isOverdue = (() => {
            if (!order.shopkeeper_accepted_at) return false;
            const elapsed = (Date.now() - new Date(order.shopkeeper_accepted_at).getTime()) / 60000;
            return elapsed > order.sla_minutes;
          })();
          return (
            <div key={order.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {isOverdue && (
                <div className="bg-red-50 border-b border-red-100 px-4 py-1.5 flex items-center gap-1.5">
                  <AlertCircle size={12} color="#D32F2F" />
                  <span style={{ color: "#D32F2F", fontWeight: 600, fontSize: "11px" }}>SLA BREACHED — Dispatch immediately!</span>
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-900" style={{ fontWeight: 700, fontSize: "15px" }}>#{order.order_number}</span>
                      <span className="bg-green-100 text-green-700 rounded-full px-2 py-0.5" style={{ fontSize: "10px", fontWeight: 600 }}>READY</span>
                    </div>
                    {shouldShowShopkeeper && (
                      <p className="text-gray-500 text-xs mb-1">
                        {order.shopkeeper_name || "Unassigned"}
                      </p>
                    )}
                    <span className="text-gray-500" style={{ fontSize: "12px" }}>{order.order_type} · Tray: {order.tray_number || 'N/A'}</span>
                  </div>
                  <button 
                    onClick={() => onNavigate("order-details", order)}
                    className="flex items-center gap-1 rounded-full px-3 py-1 bg-gray-100 border border-gray-200"
                  >
                    <Package size={11} color="#616161" />
                    <span style={{ color: "#616161", fontWeight: 700, fontSize: "11px" }}>View Items</span>
                  </button>
                </div>

                {shouldShowShopkeeper && order.shopkeeper_name && (
                  <div className="flex items-center gap-2 mb-2 bg-blue-50 p-2 rounded-xl border border-blue-100">
                    <User size={14} color="#1976D2" />
                    <span className="text-blue-800" style={{ fontSize: "12px", fontWeight: 600 }}>
                      Processed by: {order.shopkeeper_name}
                    </span>
                  </div>
                )}

                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Assign Rider
                  </label>
                  <select
                    value={order.agentId || ""}
                    onChange={(e) => handleAssignRider(order.id, e.target.value)}
                    disabled={assigningId === order.id}
                    className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-xs text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select Rider...</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => {
                    const agent = agents.find(a => a.id === order.agentId);
                    onNavigate("handover-verification", {
                      ...order,
                      riderName: agent ? agent.name : "N/A"
                    });
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-3"
                  style={{ backgroundColor: "#2E7D32" }}
                >
                  <QrCode size={16} color="white" />
                  <span className="text-white" style={{ fontWeight: 600, fontSize: "14px" }}>Handover to Rider</span>
                </button>
              </div>
            </div>
          );
        })}
        {orders.length === 0 && (
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
            <CheckCircle size={48} color="#4CAF50" className="mb-3" />
            <h3 className="text-gray-900 font-bold mb-1">No Orders Ready</h3>
            <p className="text-gray-500 text-sm">All packed orders have been dispatched.</p>
          </div>
        )}
      </div>
    </div>
  );
}
