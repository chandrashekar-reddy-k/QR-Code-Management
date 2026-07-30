import { useState } from "react";
import { ArrowLeft, Clock, MapPin, Zap, ShoppingCart, Phone, AlertCircle, CheckCircle, XCircle, ChevronRight, Loader2, User } from "lucide-react";
import api from "../../api/axios";
import { ShopkeeperModal } from "./ShopkeeperModal";
import { useSharedOrders } from "./SharedOrdersContext";

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
  const [selectedShopkeeper, setSelectedShopkeeper] = useState<{ id: number; assignedAt: string; timeoutMinutes: number } | null>(null);

  // User & role info for staff UI filtering
  const isShopkeeper = window.location.pathname.startsWith('/shopkeeper') && !window.location.pathname.startsWith('/shopkeeper-erp');
  const storedU = isShopkeeper ? sessionStorage.getItem("staffUser") : localStorage.getItem("partnerUser");
  let userRole: string | null = null;
  if (storedU) {
    try {
      const u = JSON.parse(storedU);
      userRole = u.role;
    } catch (e) { }
  }
  const isStaff = isShopkeeper || (userRole && !["PARTNER", "STORE_MANAGER", "ADMIN"].includes(userRole.toUpperCase()));

  const { orders: sharedOrders, refreshOrders, loading } = useSharedOrders();
  const orders = sharedOrders
    .filter((o: any) => o.status?.toLowerCase() === 'new' || o.status?.toLowerCase() === 'assigned' || o.status?.toLowerCase() === 'confirmed' || o.status?.toLowerCase() === 'placed' || o.status?.toLowerCase() === 'pending')
    .sort((a: any, b: any) => {
      const timeA = new Date(a.created_at || a.createdAt || a.orderDate || 0).getTime();
      const timeB = new Date(b.created_at || b.createdAt || b.orderDate || 0).getTime();
      if (timeA !== timeB) return timeB - timeA;
      return String(b.id || b.order_number || "").localeCompare(String(a.id || a.order_number || ""));
    });

  const handleAccept = async (orderId: number) => {
    try {
      await api.put(`/orders/${orderId}/accept`);
      await refreshOrders();
      onNavigate("picking-queue");
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (orderId: number) => {
    try {
      await api.put(`/orders/${orderId}/reject`);
      await refreshOrders();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F5F7FA] items-center justify-center dark:bg-gray-900">
        <Loader2 className="animate-spin text-[#00891D]" size={40} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F7FA] dark:bg-gray-900">
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

      {/* Order Cards */}
      <div className="flex flex-col gap-3 p-4">
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-3 shadow-sm dark:bg-gray-800">
            <CheckCircle size={48} color="#00891D" />
            <p className="text-gray-700 font-semibold dark:text-gray-300">All orders processed!</p>
          </div>
        ) : (
          orders.map((order) => {
            const config = getTypeConfig(order.order_type);

            return (
              <div key={order.id} className="bg-white rounded-2xl shadow-sm overflow-hidden dark:bg-gray-800">
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
                        <span className="text-gray-900 dark:text-gray-100" style={{ fontWeight: 700, fontSize: "16px" }}>{order.order_number}</span>
                        <span className="rounded-full px-2 py-0.5" style={{ backgroundColor: config.bg, color: config.color, fontSize: "10px", fontWeight: 600 }}>
                          {order.order_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-600 dark:text-gray-400" style={{ fontSize: "13px" }}>₹{order.total_value}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <CountdownTimer minutes={order.sla_minutes} />
                      {/* AllocationCountdown removed */}
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="flex items-center gap-2 mb-3 bg-gray-50 rounded-xl p-2.5 dark:bg-gray-900">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E8F5E9' }}>
                      <span style={{ color: '#00891D', fontWeight: 700, fontSize: "12px" }}>
                        {order.customer_name?.split(" ").map((n: string) => n[0]).join("") || 'C'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-800 dark:text-gray-200" style={{ fontWeight: 600, fontSize: "12px" }}>{order.customer_name}</p>
                      <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "11px" }}>{order.customer_phone}</p>
                    </div>
                    <span className="rounded-full px-2 py-0.5 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" style={{ fontSize: "10px" }}>{order.payment_method}</span>
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-2 mb-3">
                    <MapPin size={14} color="#9E9E9E" className="mt-0.5 flex-shrink-0" />
                    <span className="text-gray-500 dark:text-gray-400" style={{ fontSize: "12px" }}>{order.customer_address || "No address provided"}</span>
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
