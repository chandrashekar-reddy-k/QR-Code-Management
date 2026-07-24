import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Package, CheckCircle, QrCode, AlertCircle, Loader2, User, Clock } from "lucide-react";
import api from "../../api/axios";
import { useSharedOrders } from "./SharedOrdersContext";
import toast from "react-hot-toast";
import { getSLAInfo } from "../../utils/slaHelper";

interface ReadyOrdersMobileProps {
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

export function ReadyOrdersMobile({ onNavigate, onBack }: ReadyOrdersMobileProps) {
  const { orders: sharedOrders, loading: sharedLoading, refreshOrders } = useSharedOrders();

  const isShopkeeper = window.location.pathname.startsWith('/shopkeeper') && !window.location.pathname.startsWith('/shopkeeper-erp');
  const storedUser = isShopkeeper ? sessionStorage.getItem("staffUser") : localStorage.getItem("partnerUser");
  const userObj = storedUser ? JSON.parse(storedUser) : null;
  const userRole = userObj?.role;
  const shouldShowShopkeeper = ["PARTNER", "STORE_MANAGER", "ADMIN"].includes(userRole);

  const [agents, setAgents] = useState<any[]>([]);

  useEffect(() => {
    api.get('/delivery-agents')
      .then(res => setAgents(res.data))
      .catch(err => console.error("Failed to load riders", err));
  }, []);

  const [handedOverIds, setHandedOverIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('handedOverIds') || '[]');
    } catch {
      return [];
    }
  });

  const orders = useMemo(() => {
    return sharedOrders.filter((o: any) => {
      if (o.status?.toLowerCase() !== 'ready' || o.order_type === 'Self Pickup') return false;
      if (o.allocationStatus === 'HandedOver' || o.allocation_status === 'HandedOver') return false;
      const orderId = String(o.id || o.order_number);
      if (handedOverIds.map(String).includes(orderId)) return false;
      return true;
    });
  }, [sharedOrders, handedOverIds]);

  const overdueCount = orders.filter(o => getSLAInfo(o).isBreached).length;

  const handedOverCount = useMemo(() => {
    return sharedOrders.filter((o: any) => {
      const s = o.status?.toLowerCase();
      return s === 'dispatched' || handedOverIds.map(String).includes(String(o.id));
    }).length;
  }, [sharedOrders, handedOverIds]);

  if (sharedLoading && orders.length === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F5F7FA] items-center justify-center dark:bg-gray-900">
        <Loader2 className="animate-spin text-[#2E7D32]" size={40} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F7FA] dark:bg-gray-900">
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
            { label: "Ready", value: orders.filter(o => !handedOverIds.map(String).includes(String(o.id))).length, color: "white" },
            { label: "Handed Over", value: handedOverCount, color: "#4CAF50" },
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
          const isOverdue = getSLAInfo(order).isBreached;
          const isHandedOver = handedOverIds.map(String).includes(String(order.id));
          return (
            <div key={order.id} className="bg-white rounded-2xl shadow-sm overflow-hidden dark:bg-gray-800">
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
                      <span className="text-gray-900 dark:text-gray-100" style={{ fontWeight: 700, fontSize: "15px" }}>#{order.order_number}</span>
                      <span className="bg-green-100 text-green-700 rounded-full px-2 py-0.5" style={{ fontSize: "10px", fontWeight: 600 }}>READY</span>
                    </div>
                    {shouldShowShopkeeper && (
                      <p className="text-gray-500 text-xs mb-1 dark:text-gray-400">
                        {order.shopkeeper_name || "Unassigned"}
                      </p>
                    )}
                    <span className="text-gray-500 dark:text-gray-400" style={{ fontSize: "12px" }}>{order.order_type} · Tray: {order.tray_number || 'N/A'}</span>
                  </div>
                  <button
                    onClick={() => onNavigate("order-details", order)}
                    className="flex items-center gap-1 rounded-full px-3 py-1 bg-gray-100 border border-gray-200 dark:bg-gray-800 dark:border-gray-700"
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
                  <div className="mb-2">
                    {isHandedOver ? (
                      <div className="flex items-center gap-2 p-2.5 bg-green-50 rounded-lg border border-green-100">
                        <CheckCircle size={16} className="text-[#2E7D32]" />
                        <span className="text-[#2E7D32]" style={{ fontSize: "13px", fontWeight: 600 }}>
                          Handover Status: Handed Over
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-700 dark:border-gray-600">
                        <Clock size={16} className="text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-300" style={{ fontSize: "13px", fontWeight: 600 }}>
                          Handover Status: Pending Handover
                        </span>
                      </div>
                    )}
                  </div>

                  {order.agentId && (
                    <div className="flex items-center gap-2 p-2.5 bg-green-50 rounded-lg border border-green-100 mt-2">
                      <User size={16} className="text-[#2E7D32]" />
                      <span className="text-[#2E7D32]" style={{ fontSize: "13px", fontWeight: 600 }}>
                        Rider Assigned: {agents.find(a => a.id === order.agentId)?.name || 'Unknown'}
                      </span>
                    </div>
                  )}
                </div>

                {!isHandedOver && (
                  <button
                    onClick={async () => {
                      try {
                        const orderIdToSave = order.id || order.order_number;
                        const newIds = [...handedOverIds, String(orderIdToSave)];
                        setHandedOverIds(newIds);
                        localStorage.setItem('handedOverIds', JSON.stringify(newIds));
                        
                        // Call backend to update status
                        await api.put(`/orders/${orderIdToSave}/handover`);
                        
                        if (refreshOrders) {
                          refreshOrders();
                        }
                        
                        toast.success("Order handed over to Store Manager!");
                      } catch (err) {
                        toast.error("Failed to handover order");
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl py-3 transition-opacity bg-[#2E7D32]"
                  >
                    <QrCode size={16} color="white" />
                    <span className="text-white" style={{ fontWeight: 600, fontSize: "14px" }}>Handover to Store Manager</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {orders.length === 0 && (
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm dark:bg-gray-800">
            <CheckCircle size={48} color="#4CAF50" className="mb-3" />
            <h3 className="text-gray-900 font-bold mb-1 dark:text-gray-100">No Orders Ready</h3>
            <p className="text-gray-500 text-sm dark:text-gray-400">All packed orders have been dispatched.</p>
          </div>
        )}
      </div>
    </div>
  );
}
