import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Package, CheckCircle, QrCode, AlertCircle, User, Search } from "lucide-react";
import api from "../../api/axios";
import { useSharedOrders } from "./SharedOrdersContext";
import toast from "react-hot-toast";
import { getSLAInfo } from "../../utils/slaHelper";
import { Modal, SearchInput } from "../ui";

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
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedOrderForRider, setSelectedOrderForRider] = useState<any | null>(null);
  const [agentSearchTerm, setAgentSearchTerm] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const fetchAgents = () => {
    api.get('/delivery-agents')
      .then(res => setAgents(res.data))
      .catch(err => console.error("Failed to load riders", err));
  };

  useEffect(() => {
    fetchAgents();
    const handleAssigned = () => { fetchAgents(); refreshOrders(); };
    window.addEventListener('agentStatusUpdated', fetchAgents);
    window.addEventListener('deliveryAgentAssigned', handleAssigned);
    return () => {
      window.removeEventListener('agentStatusUpdated', fetchAgents);
      window.removeEventListener('deliveryAgentAssigned', handleAssigned);
    };
  }, []);

  const handleAssignRider = async (orderId: string, agentId: string) => {
    if (!agentId) return;
    setAssigningId(orderId);
    try {
      await api.post(`/orders/${orderId}/assign-rider`, { agentId });
      if (refreshOrders) refreshOrders();
      setSelectedOrderForRider(null);
      toast.success("Rider assigned successfully");
    } catch (err) {
      console.error("Failed to assign rider", err);
      toast.error("Failed to assign rider");
    } finally {
      setAssigningId(null);
    }
  };

  const orders = useMemo(() => {
    const handedOverIds = JSON.parse(localStorage.getItem('handedOverIds') || '[]');
    return sharedOrders.filter((o: any) => {
      if (o.status?.toLowerCase() !== 'ready' || o.order_type === 'Self Pickup') return false;
      const isHandedOverDb = o.allocationStatus === 'HandedOver' || o.allocation_status === 'HandedOver';
      if (isHandedOverDb) return false;
      if (handedOverIds.includes(String(o.id || o.order_number))) return false;
      return true;
    });
  }, [sharedOrders]);

  const overdueCount = orders.filter(o => getSLAInfo(o).isBreached).length;

  const handedOverCount = useMemo(() => {
    return sharedOrders.filter((o: any) => {
      return o.status?.toLowerCase() === 'dispatched';
    }).length;
  }, [sharedOrders]);

  // ──────────────────────────────────────────────
  // Skeleton loader
  // ──────────────────────────────────────────────
  function SkeletonBox({ className }: { className?: string }) {
    return (
      <div className={`rounded-lg bg-gray-200 dark:bg-gray-700 overflow-hidden relative ${className}`}>
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

  if (sharedLoading && orders.length === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F5F7FA] dark:bg-gray-900">
        <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>

        {/* Header skeleton */}
        <div style={{ background: "linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%)" }} className="px-4 pt-12 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-white/20" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="h-5 w-40 rounded-lg bg-white/30" />
              <div className="h-3 w-28 rounded-lg bg-white/20" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white/10 rounded-xl p-2 text-center">
                <div className="h-5 w-6 mx-auto rounded-md bg-white/30 mb-1" />
                <div className="h-2 w-14 mx-auto rounded-md bg-white/20" />
              </div>
            ))}
          </div>
        </div>

        {/* Card skeletons */}
        <div className="flex flex-col gap-3 p-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <SkeletonBox className="h-5 w-24" />
                    <SkeletonBox className="h-4 w-14 rounded-full" />
                  </div>
                  <SkeletonBox className="h-3 w-32" />
                </div>
                <SkeletonBox className="h-7 w-20 rounded-full" />
              </div>
              {/* Status row */}
              <SkeletonBox className="h-9 w-full rounded-xl mb-2" />
              {/* Rider row */}
              <SkeletonBox className="h-9 w-full rounded-xl mb-3" />
              {/* Button */}
              <SkeletonBox className="h-11 w-full rounded-xl" />
            </div>
          ))}
        </div>
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
            { label: "Ready", value: orders.length, color: "white" },
            { label: "Dispatched", value: handedOverCount, color: "#4CAF50" },
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
          const hasRider = !!order.agentId;
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
                  {hasRider && (
                    <div className="flex items-center gap-2 p-2.5 bg-green-50 rounded-lg border border-green-100 mt-2">
                      <User size={16} className="text-[#2E7D32]" />
                      <span className="text-[#2E7D32]" style={{ fontSize: "13px", fontWeight: 600 }}>
                        Rider Assigned: {agents.find(a => a.id === order.agentId)?.name || 'Unknown'}
                      </span>
                    </div>
                  )}
                </div>

                {hasRider ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedOrderForRider(order)}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 border border-[#00891D] bg-white text-[#00891D]"
                    >
                      <span style={{ fontWeight: 600, fontSize: "14px" }}>Change Rider</span>
                    </button>
                    <button
                      onClick={() => {
                        const agentName = order.agent?.name || agents.find(a => a.id === order.agentId)?.name || "N/A";
                        onNavigate("handover-verification", {
                          ...order,
                          riderName: agentName
                        });
                      }}
                      className="flex-[2] flex items-center justify-center gap-2 rounded-xl py-3 bg-[#2E7D32]"
                    >
                      <QrCode size={16} color="white" />
                      <span className="text-white" style={{ fontWeight: 600, fontSize: "14px" }}>Handover to Rider</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedOrderForRider(order)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl py-3 transition-opacity bg-blue-600"
                  >
                    <User size={16} color="white" />
                    <span className="text-white" style={{ fontWeight: 600, fontSize: "14px" }}>Assign Rider</span>
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

      {/* Assign Rider Modal */}
      <Modal
        isOpen={!!selectedOrderForRider}
        onClose={() => {
          setSelectedOrderForRider(null);
          setSelectedAgentId(null);
          setAgentSearchTerm("");
        }}
        title="Assign Delivery Agent"
        size="sm"
        showCloseButton={true}
      >
        <div className="space-y-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <SearchInput
              placeholder="Search"
              value={agentSearchTerm}
              onChange={(e) => setAgentSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {agents
              .filter(a => (a.name || '').toLowerCase().includes(agentSearchTerm.toLowerCase()) || (a.phone || a.mobileNumber || '').includes(agentSearchTerm))
              .map((agent) => {
                const phone = agent.phone || agent.mobileNumber || agent.mobile || "";
                const profilePic = agent.profilePic || agent.profilePicUrl || agent.profileImage;

                return (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedAgentId(agent.id)}
                    className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors ${selectedAgentId === agent.id
                        ? 'border-[#00891D] bg-green-50/50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-[#00891D] hover:bg-green-50/30'
                      }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700">
                      {profilePic ? (
                        <img src={profilePic} alt={agent.name} className="w-full h-full object-cover" />
                      ) : (
                        <User size={20} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate">{agent.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{phone}</div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${selectedAgentId === agent.id
                        ? 'border-[#00891D] bg-[#00891D]'
                        : 'border-gray-300 dark:border-gray-600'
                      }`}>
                      {selectedAgentId === agent.id && <CheckCircle size={14} className="text-white" />}
                    </div>
                  </div>
                );
              })}
            {agents.length === 0 && (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
                No delivery agents found
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
            <button
              onClick={() => {
                setSelectedOrderForRider(null);
                setSelectedAgentId(null);
              }}
              className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={!selectedAgentId || assigningId === selectedOrderForRider?.id}
              onClick={() => {
                if (selectedAgentId && selectedOrderForRider) {
                  handleAssignRider(selectedOrderForRider.id || selectedOrderForRider.order_number, selectedAgentId);
                }
              }}
              className="px-4 py-2 text-sm font-bold text-white bg-[#00891D] hover:bg-[#006614] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {assigningId === selectedOrderForRider?.id ? "Assigning..." : "Assign Rider"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
