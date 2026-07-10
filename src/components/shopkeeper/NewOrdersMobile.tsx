import { useState, useEffect } from "react";
import { ArrowLeft, Clock, MapPin, Zap, ShoppingCart, Phone, AlertCircle, CheckCircle, XCircle, ChevronRight, Loader2, User } from "lucide-react";
import api from "../../api/axios";
import { useSocket } from "../../hooks/useSocket";
import { ShopkeeperModal } from "./ShopkeeperModal";

interface NewOrdersProps {
  onNavigate: (screen: string, data?: unknown) => void;
  onBack: () => void;
}

// Map the order types to icons and brand colors
const getTypeConfig = (type: string) => {
  switch (type) {
    case 'Quick Commerce': return { icon: Zap, color: '#00891D', bg: '#E8F5E9' }; // Brand Green
    case 'E-Commerce': return { icon: ShoppingCart, color: '#EF5A06', bg: '#FFF3E0' }; // Brand Orange
    case 'WhatsApp': return { icon: Phone, color: '#00891D', bg: '#E8F5E9' };
    case 'Call Center': return { icon: Phone, color: '#EF5A06', bg: '#FFF3E0' };
    default: return { icon: ShoppingCart, color: '#00891D', bg: '#E8F5E9' };
  }
};

function CountdownTimer({ minutes }: { minutes: number }) {
  const isUrgent = minutes <= 10;
  const isWarning = minutes <= 20;
  return (
    <div className="flex items-center gap-1 rounded-full px-2 py-0.5" style={{ backgroundColor: isUrgent ? "#FFEBEE" : isWarning ? "#FFF3E0" : "#E8F5E9" }}>
      <Clock size={10} color={isUrgent ? "#D32F2F" : isWarning ? "#EF5A06" : "#00891D"} />
      <span style={{ color: isUrgent ? "#D32F2F" : isWarning ? "#EF5A06" : "#00891D", fontWeight: 700, fontSize: "11px" }}>
        {minutes}m left
      </span>
    </div>
  );
}

export function NewOrders({ onNavigate, onBack }: NewOrdersProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShopkeeper, setSelectedShopkeeper] = useState<{ id: number; assignedAt: string; timeoutMinutes: number } | null>(null);

  // User & role info for staff UI filtering
  const storedU = localStorage.getItem("user");
  let userRole: string | null = null;
  if (storedU) {
    try {
      const u = JSON.parse(storedU);
      userRole = u.role;
    } catch (e) {}
  }
  const isStaff = userRole && !["PARTNER", "STORE_MANAGER", "ADMIN"].includes(userRole.toUpperCase());

  // Real-time integration using storeId 1 as per dummy data
  const socket = useSocket(1);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders?status=new');
      setOrders(res.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch new orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    if (socket.current) {
      socket.current.on('order:new', () => {
        fetchOrders();
      });
      socket.current.on('order:assigned', () => {
        fetchOrders();
      });
      socket.current.on('order:status', ({ orderId, status }: any) => {
        if (status !== 'new') {
          setOrders(prev => prev.filter(o => o.id !== Number(orderId)));
        }
      });
    }

    return () => {
      if (socket.current) {
        socket.current.off('order:new');
        socket.current.off('order:assigned');
        socket.current.off('order:status');
      }
    };
  }, [socket.current]);

  const handleAccept = async (orderId: number) => {
    try {
      await api.put(`/orders/${orderId}/accept`);
      setOrders(prev => prev.filter(o => o.id !== orderId));
      onNavigate("picking-queue");
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (orderId: number) => {
    try {
      await api.put(`/orders/${orderId}/reject`);
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F5F7FA] items-center justify-center">
        <Loader2 className="animate-spin text-[#00891D]" size={40} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F7FA]">
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #00891D 0%, #006614 100%)" }} className="px-4 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowLeft size={20} color="white" />
          </button>
          <div className="flex-1">
            <h1 className="text-white" style={{ fontWeight: 700, fontSize: "18px" }}>New Orders</h1>
            <p className="text-white/70" style={{ fontSize: "12px" }}>{orders.length} orders awaiting acceptance</p>
          </div>
          {orders.length > 0 && (
            <div className="bg-red-500 rounded-full px-3 py-1 flex items-center gap-1">
              <AlertCircle size={12} color="white" />
              <span className="text-white" style={{ fontWeight: 700, fontSize: "12px" }}>{orders.length}</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 m-4 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {/* Order Cards */}
      <div className="flex flex-col gap-3 p-4">
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-3 shadow-sm">
            <CheckCircle size={48} color="#00891D" />
            <p className="text-gray-700 font-semibold">All orders processed!</p>
          </div>
        ) : (
          orders.map((order) => {
            const config = getTypeConfig(order.order_type);

            return (
              <div key={order.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Priority Banner */}
                {order.priority === "HIGH" && (
                  <div className="bg-red-50 border-b border-red-100 px-4 py-1.5 flex items-center gap-1.5">
                    <AlertCircle size={12} color="#D32F2F" />
                    <span style={{ color: "#D32F2F", fontWeight: 600, fontSize: "11px" }}>HIGH PRIORITY ORDER</span>
                  </div>
                )}

                <div className="p-4">
                  {/* Order Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-gray-900" style={{ fontWeight: 700, fontSize: "16px" }}>{order.order_number}</span>
                        <span className="rounded-full px-2 py-0.5" style={{ backgroundColor: config.bg, color: config.color, fontSize: "10px", fontWeight: 600 }}>
                          {order.order_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-600" style={{ fontSize: "13px" }}>₹{order.total_value}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <CountdownTimer minutes={order.sla_minutes} />
                      {/* AllocationCountdown removed */}
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="flex items-center gap-2 mb-3 bg-gray-50 rounded-xl p-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E8F5E9' }}>
                      <span style={{ color: '#00891D', fontWeight: 700, fontSize: "12px" }}>
                        {order.customer_name?.split(" ").map((n: string) => n[0]).join("") || 'C'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-800" style={{ fontWeight: 600, fontSize: "12px" }}>{order.customer_name}</p>
                      <p className="text-gray-500" style={{ fontSize: "11px" }}>{order.customer_phone}</p>
                    </div>
                    <span className="rounded-full px-2 py-0.5 bg-gray-100 text-gray-600" style={{ fontSize: "10px" }}>{order.payment_method}</span>
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-2 mb-3">
                    <MapPin size={14} color="#9E9E9E" className="mt-0.5 flex-shrink-0" />
                    <span className="text-gray-500" style={{ fontSize: "12px" }}>{order.customer_address || "No address provided"}</span>
                  </div>

                  {/* Assignment Info - Hidden for Staff */}
                  {!isStaff && (
                    <button
                      onClick={() => {
                        if (order.assigned_shopkeeper_id) {
                          setSelectedShopkeeper({
                            id: order.assigned_shopkeeper_id,
                            assignedAt: order.allocation_started_at,
                            timeoutMinutes: order.allocation_timeout_minutes
                          });
                        }
                      }}
                      disabled={!order.assigned_shopkeeper_id}
                      className="flex items-start gap-2 mb-3 bg-blue-50 p-2.5 rounded-xl border border-blue-100 w-full text-left transition-colors hover:bg-blue-100"
                    >
                      <User size={14} color="#1976D2" className="mt-0.5 flex-shrink-0" />
                      <span className="text-blue-800" style={{ fontSize: "12px", fontWeight: 600 }}>
                        Assigned to: {order.shopkeeper_name || "Unassigned"}
                      </span>
                    </button>
                  )}

                  {/* View Details */}
                  <button
                    onClick={() => onNavigate("order-details", order)}
                    className="w-full flex items-center justify-center gap-1 mb-3 rounded-xl py-2"
                    style={{ fontSize: "13px", fontWeight: 500, color: '#00891D', border: '1px solid #00891D' }}
                  >
                    View Full Details <ChevronRight size={14} />
                  </button>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleReject(order.id)}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 border border-red-200 bg-red-50"
                    >
                      <XCircle size={16} color="#D32F2F" />
                      <span style={{ color: "#D32F2F", fontWeight: 600, fontSize: "14px" }}>Reject</span>
                    </button>
                    <button
                      onClick={() => handleAccept(order.id)}
                      className="flex-[2] flex items-center justify-center gap-2 rounded-xl py-3"
                      style={{ backgroundColor: "#00891D" }}
                    >
                      <CheckCircle size={16} color="white" />
                      <span className="text-white" style={{ fontWeight: 600, fontSize: "14px" }}>Accept Order</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedShopkeeper && (
        <ShopkeeperModal
          shopkeeperId={selectedShopkeeper.id}
          assignedAt={selectedShopkeeper.assignedAt}
          timeLeft={Math.floor(Math.max(0, new Date(selectedShopkeeper.assignedAt).getTime() + (selectedShopkeeper.timeoutMinutes || 5) * 60 * 1000 - new Date().getTime()) / 1000)}
          onClose={() => setSelectedShopkeeper(null)}
        />
      )}
    </div>
  );
}
