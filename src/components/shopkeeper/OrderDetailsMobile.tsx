import { useState, useEffect } from "react";
import { ArrowLeft, Clock, MapPin, CreditCard, Package, CheckCircle, XCircle, Phone, Zap, Loader2, User } from "lucide-react";
import api from "../../api/axios";

interface OrderDetailsProps {
  onBack: () => void;
  onNavigate: (screen: string, data?: any) => void;
  order?: any;
  socket?: any;
}

export function OrderDetails({ onBack, onNavigate, order, socket }: OrderDetailsProps) {
  const [fullOrder, setFullOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Tick every minute so SLA elapsed/remaining updates automatically
  const [now, setNow] = useState(new Date());

  // Listen for socket events to update status in real-time
  useEffect(() => {
    if (!socket?.current || !fullOrder?.id) return;

    const handleStatusUpdate = (data: any) => {
      if (data.orderId === fullOrder.id) {
        console.log("Real-time Mobile Order Status Update:", data);
        setFullOrder((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: data.status,
            confirmedAt: data.status === 'CONFIRMED' ? new Date().toISOString() : prev.confirmedAt
          };
        });
      }
    };

    socket.current.on('order:status', handleStatusUpdate);
    return () => {
      socket.current?.off('order:status', handleStatusUpdate);
    };
  }, [socket?.current, fullOrder?.id]);

  const isShopkeeper = window.location.pathname.startsWith('/shopkeeper') && !window.location.pathname.startsWith('/shopkeeper-erp');
  const storedUser = isShopkeeper ? sessionStorage.getItem("staffUser") : localStorage.getItem("partnerUser");
  const userObj = storedUser ? JSON.parse(storedUser) : null;
  const userRole = userObj?.role;
  const shouldShowShopkeeper = ["PARTNER", "STORE_MANAGER", "ADMIN"].includes(userRole);

  // Log fetched order for debugging
  useEffect(() => {
    console.log('Fetched full order:', fullOrder);
  }, [fullOrder]);

  useEffect(() => {
    if (order?.id) {
      setLoading(true);
      setError(null);
      api.get(`/orders/${order.id}`).then(res => {
        setFullOrder(res.data);
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setError("Failed to load order details. Please try again.");
        setLoading(false);
      });
    } else {
      setError("No order selected or invalid order ID.");
      setLoading(false);
    }
  }, [order?.id]);

  // Tick every 60 s so elapsed/remaining refresh automatically
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAccept = async () => {
    if (!fullOrder?.id) return;
    try {
      await api.put(`/orders/${fullOrder.id}/accept`);
      onNavigate("picking-queue");
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async () => {
    if (!fullOrder?.id) return;
    try {
      await api.put(`/orders/${fullOrder.id}/reject`);
      onBack();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !fullOrder) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F5F7FA] items-center justify-center dark:bg-gray-900">
        <Loader2 className="animate-spin text-[#00891D]" size={40} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F5F7FA] items-center justify-center p-4 dark:bg-gray-900">
        <XCircle className="text-red-500 mb-3" size={48} />
        <p className="text-gray-800 text-center font-medium mb-4 dark:text-gray-200">{error}</p>
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-colors dark:text-gray-200"
          >
            Go Back
          </button>
          <button
            onClick={() => {
              if (order?.id) {
                setLoading(true);
                setError(null);
                api.get(`/orders/${order.id}`).then(res => {
                  setFullOrder(res.data);
                  setLoading(false);
                }).catch(err => {
                  console.error(err);
                  setError("Failed to load order details. Please try again.");
                  setLoading(false);
                });
              }
            }}
            className="px-4 py-2 bg-[#00891D] text-white rounded-xl font-semibold hover:bg-[#006614] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isUrgent = fullOrder.sla_minutes <= 15;
  const mergedItems = fullOrder?.items ?? order?.items ?? [];

  // ΓöÇΓöÇ SLA Tracking ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  // Target SLA: fixed value from backend, never modified
  const slaMinutes: number = fullOrder.sla_minutes || 30;

  // Format seconds helper
  const formatSeconds = (totalSecs: number) => {
    const absSecs = Math.abs(totalSecs);
    const mins = Math.floor(absSecs / 60);
    const secs = absSecs % 60;
    return `${mins}m ${secs}s`;
  };

  // Determine which SLA state we are in
  let slaState: "waiting" | "inprogress" | "completed" = "waiting";
  let slaElapsedSeconds = 0;
  let slaRemainingSeconds = 0;
  let slaActualSeconds = 0;
  let slaIsBreached = false;
  let slaStatusLabel = "";

  const acceptedAtStr = fullOrder.shopkeeperAcceptedAt || fullOrder.shopkeeper_accepted_at || fullOrder.acceptedByShopkeeperAt;
  let orderStatus = fullOrder.status;
  try {
    const handedOverIds = JSON.parse(localStorage.getItem('handedOverIds') || '[]');
    if (handedOverIds.map(String).includes(String(fullOrder.id || fullOrder.order_number))) {
      orderStatus = 'dispatched';
    }
  } catch {}

  const completedAtStr = fullOrder.deliveredAt || fullOrder.delivered_at || fullOrder.dispatched_at || fullOrder.dispatchedAt || (orderStatus === "dispatched" ? (fullOrder.updatedAt || new Date()) : null);

  if (!acceptedAtStr) {
    // Shopkeeper has not accepted yet ΓåÆ SLA hasn't started
    slaState = "waiting";
    slaStatusLabel = "Waiting for Acceptance";
  } else if (orderStatus === "dispatched" || completedAtStr) {
    // Order has been dispatched ΓåÆ SLA is done
    slaState = "completed";
    const acceptedAt = new Date(acceptedAtStr).getTime();
    const dispatchedAt = new Date(completedAtStr || new Date()).getTime();
    slaActualSeconds = Math.floor((dispatchedAt - acceptedAt) / 1000);
    slaIsBreached = slaActualSeconds > (slaMinutes * 60);
    slaStatusLabel = slaIsBreached ? "SLA Breached" : "Within SLA";
  } else {
    // Order accepted but not yet dispatched ΓåÆ SLA is counting
    slaState = "inprogress";
    const acceptedAt = new Date(acceptedAtStr).getTime();
    slaElapsedSeconds = Math.floor((now.getTime() - acceptedAt) / 1000);
    slaRemainingSeconds = (slaMinutes * 60) - slaElapsedSeconds;
    slaIsBreached = slaRemainingSeconds < 0;
    slaStatusLabel = slaIsBreached ? "SLA Breached" : "Within SLA";
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F7FA] dark:bg-gray-900">
      <div style={{ background: "linear-gradient(135deg, #00891D 0%, #006614 100%)" }} className="px-4 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowLeft size={20} color="white" />
          </button>
          <div className="flex-1">
            <h1 className="text-white" style={{ fontWeight: 700, fontSize: "18px" }}>Order #{fullOrder.order_number}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Zap size={12} color="white" opacity={0.7} />
              <span className="text-white/70" style={{ fontSize: "12px" }}>{fullOrder.order_type}</span>
            </div>
          </div>
          {!(slaState === "completed" && isShopkeeper) && (
            <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ backgroundColor: isUrgent ? "#FFCDD2" : "#C8E6C9" }}>
              <Clock size={12} color={isUrgent ? "#D32F2F" : "#2E7D32"} />
              <span style={{ color: isUrgent ? "#D32F2F" : "#2E7D32", fontWeight: 700, fontSize: "12px" }}>{fullOrder.sla_minutes}m SLA</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4 pb-6">
        {/* Customer Information */}
        <div className="bg-white rounded-2xl p-4 shadow-sm dark:bg-gray-800">
          <h3 className="text-gray-700 mb-3 dark:text-gray-300" style={{ fontWeight: 600, fontSize: "13px" }}>Customer Information</h3>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <User size={22} color="#00891D" />
            </div>
            <div>
              <p className="text-gray-900 dark:text-gray-100" style={{ fontWeight: 600, fontSize: "15px" }}>{fullOrder.customer_name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Phone size={11} color="#9E9E9E" />
                <span className="text-gray-500 dark:text-gray-400" style={{ fontSize: "12px" }}>{fullOrder.customer_phone}</span>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-gray-50 rounded-xl p-2.5 dark:bg-gray-900">
            <MapPin size={14} color="#00891D" className="mt-0.5 flex-shrink-0" />
            <span className="text-gray-600 dark:text-gray-400" style={{ fontSize: "12px" }}>{fullOrder.customer_address || "No address provided"}</span>
          </div>
          {shouldShowShopkeeper && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400" style={{ fontSize: "12px" }}>Processed By:</span>
              <span className="text-gray-800 font-semibold dark:text-gray-200" style={{ fontSize: "12px" }}>
                {fullOrder.shopkeeper_name
                  ? `${fullOrder.shopkeeper_name}${fullOrder.assignedShopkeeper?.phone ? ` (${fullOrder.assignedShopkeeper.phone})` : ''}`
                  : 'Unassigned'}
              </span>
            </div>
          )}
        </div>

        {/* SLA Tracking Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm dark:bg-gray-800">
          <div className="flex items-center gap-2 mb-3">
            <Clock
              size={16}
              color={
                slaIsBreached
                  ? "#D32F2F"
                  : slaState === "waiting"
                    ? "#F59E0B"
                    : slaState === "completed"
                      ? "#2E7D32"
                      : "#00891D"
              }
            />
            <h3 className="text-gray-700 dark:text-gray-300" style={{ fontWeight: 600, fontSize: "13px" }}>SLA Tracking</h3>
          </div>

          <div className="flex flex-col gap-2.5">
            {/* Target SLA — always visible */}
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-gray-400" style={{ fontSize: "13px" }}>Target SLA:</span>
              <span
                className="rounded-full px-2.5 py-0.5"
                style={{ backgroundColor: "#FFF3E0", color: "#EF5A06", fontWeight: 700, fontSize: "13px" }}
              >
                {slaMinutes} min
              </span>
            </div>

            {/* Waiting state */}
            {slaState === "waiting" && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400" style={{ fontSize: "13px" }}>Status:</span>
                <span className="text-orange-500" style={{ fontWeight: 600, fontSize: "13px" }}>
                  {slaStatusLabel}
                </span>
              </div>
            )}

            {/* In-progress state */}
            {slaState === "inprogress" && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400" style={{ fontSize: "13px" }}>Status:</span>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: "13px",
                      color: slaIsBreached ? "#D32F2F" : "#2E7D32",
                    }}
                  >
                    {slaStatusLabel}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400" style={{ fontSize: "13px" }}>Elapsed:</span>
                  <span className="text-gray-800 dark:text-gray-200" style={{ fontWeight: 600, fontSize: "13px" }}>
                    {formatSeconds(slaElapsedSeconds)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400" style={{ fontSize: "13px" }}>Remaining:</span>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: "13px",
                      color: slaIsBreached ? "#D32F2F" : (slaRemainingSeconds <= 300) ? "#EF5A06" : "#2E7D32",
                    }}
                  >
                    {slaIsBreached ? `Overdue by ${formatSeconds(slaRemainingSeconds)}` : formatSeconds(slaRemainingSeconds)}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min((slaElapsedSeconds / (slaMinutes * 60)) * 100, 100)}%`,
                      backgroundColor: slaIsBreached ? "#D32F2F" : (slaRemainingSeconds <= 300) ? "#EF5A06" : "#00891D",
                    }}
                  />
                </div>
              </>
            )}

            {/* Completed state */}
            {slaState === "completed" && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400" style={{ fontSize: "13px" }}>Actual SLA:</span>
                  <span className="text-gray-800 dark:text-gray-200" style={{ fontWeight: 600, fontSize: "13px" }}>
                    {formatSeconds(slaActualSeconds)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400" style={{ fontSize: "13px" }}>Status:</span>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: "13px",
                      color: slaIsBreached ? "#D32F2F" : "#2E7D32",
                    }}
                  >
                    {slaStatusLabel}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400" style={{ fontSize: "13px" }}>Handover Time:</span>
                  <span className="text-gray-800 dark:text-gray-200" style={{ fontWeight: 600, fontSize: "13px" }}>
                    {new Date(completedAtStr || new Date()).toLocaleString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-2xl p-4 shadow-sm dark:bg-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-700 dark:text-gray-300" style={{ fontWeight: 600, fontSize: "13px" }}>Order Summary</h3>
            <span className="text-gray-500 dark:text-gray-400" style={{ fontSize: "12px" }}>{mergedItems.length} items</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="bg-green-50 rounded-xl p-2.5 text-center">
              <p className="text-green-700" style={{ fontWeight: 700, fontSize: "16px" }}>{mergedItems.length}</p>
              <p className="text-green-500" style={{ fontSize: "10px" }}>Items</p>
            </div>
            <div className="bg-green-50 rounded-xl p-2.5 text-center">
              <p className="text-green-700" style={{ fontWeight: 700, fontSize: "14px" }}>₹{fullOrder.total_value}</p>
              <p className="text-green-500" style={{ fontSize: "10px" }}>Total Value</p>
            </div>

            {/* SLA box — dynamic */}
            {slaState === "waiting" && (
              <div className="bg-orange-50 rounded-xl p-2.5 text-center">
                <p className="text-orange-700" style={{ fontWeight: 700, fontSize: "16px" }}>{slaMinutes}m</p>
                <p className="text-orange-500" style={{ fontSize: "10px" }}>Target SLA</p>
              </div>
            )}
            {slaState === "inprogress" && (
              <div className="rounded-xl p-2.5 text-center"
                style={{ backgroundColor: slaIsBreached ? "#FFEBEE" : (slaRemainingSeconds <= 300) ? "#FFF3E0" : "#E8F5E9" }}>
                <p style={{ fontWeight: 700, fontSize: "13px", color: slaIsBreached ? "#D32F2F" : (slaRemainingSeconds <= 300) ? "#E65100" : "#2E7D32" }}>
                  {slaIsBreached ? `+${formatSeconds(slaRemainingSeconds)}` : formatSeconds(slaRemainingSeconds)}
                </p>
                <p style={{ fontSize: "10px", color: slaIsBreached ? "#D32F2F" : (slaRemainingSeconds <= 300) ? "#E65100" : "#2E7D32" }}>
                  {slaStatusLabel}
                </p>
              </div>
            )}
            {slaState === "completed" && (
              <div className="rounded-xl p-2.5 text-center"
                style={{ backgroundColor: slaIsBreached ? "#FFEBEE" : "#E8F5E9" }}>
                <p style={{ fontWeight: 700, fontSize: "13px", color: slaIsBreached ? "#D32F2F" : "#2E7D32" }}>
                  {formatSeconds(slaActualSeconds)}
                </p>
                <p style={{ fontSize: "10px", color: slaIsBreached ? "#D32F2F" : "#2E7D32" }}>
                  {slaStatusLabel}
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5 dark:bg-gray-900">
            <CreditCard size={14} color="#9E9E9E" />
            <span className="text-gray-600 dark:text-gray-400" style={{ fontSize: "12px" }}>Payment: {fullOrder.payment_method}</span>
          </div>
        </div>

        {/* Item List */}
        <div className="bg-white rounded-2xl p-4 shadow-sm dark:bg-gray-800">
          <div className="flex items-center gap-2 mb-3">
            <Package size={16} color="#00891D" />
            <h3 className="text-gray-700 dark:text-gray-300" style={{ fontWeight: 600, fontSize: "13px" }}>Item List ({mergedItems.length})</h3>
          </div>
          <div className="flex flex-col gap-2">
            {mergedItems.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "12px" }}>No items found for this order.</p>
            ) : (
              mergedItems.map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="w-10 h-10 rounded bg-white flex items-center justify-center text-xl overflow-hidden shadow-sm dark:bg-gray-800">
                    {item.image_url ? <img src={item.image_url} alt="" /> : '📦'}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-800 dark:text-gray-200" style={{ fontWeight: 600, fontSize: "14px" }}>{item.name || item.product?.name}</p>
                    <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "13px", fontWeight: 500, marginTop: "2px" }}>Qty: {item.quantity} · Location: <span style={{ color: "#D32F2F", fontWeight: 700 }}>{(item.aisle_location || item.product?.aisle_location) ?? ''}</span></p>
                  </div>
                  <span className="text-gray-700 dark:text-gray-300" style={{ fontWeight: 600, fontSize: "13px" }}>₹{item.price ?? item.product?.price}</span>
                </div>
              ))
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400" style={{ fontSize: "13px" }}>Subtotal</span>
              <span className="text-gray-700 dark:text-gray-300" style={{ fontWeight: 500, fontSize: "13.5px" }}>
                ₹{Number(
                  (fullOrder.total_value || fullOrder.totalAmount || 0) -
                  (fullOrder.delivery_charge || fullOrder.deliveryCharge || 0) -
                  (fullOrder.additional_charges || fullOrder.additionalCharges || 0)
                ).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400" style={{ fontSize: "13px" }}>Delivery Charges</span>
              <span className="text-gray-700 dark:text-gray-300" style={{ fontWeight: 500, fontSize: "13.5px" }}>
                ₹{Number(fullOrder.delivery_charge || fullOrder.deliveryCharge || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400" style={{ fontSize: "13px" }}>Additional Charges</span>
              <span className="text-gray-700 dark:text-gray-300" style={{ fontWeight: 500, fontSize: "13.5px" }}>
                ₹{Number(fullOrder.additional_charges || fullOrder.additionalCharges || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-50 pt-2">
              <span className="text-gray-900 dark:text-gray-100" style={{ fontWeight: 600, fontSize: "13.5px" }}>Total</span>
              <span className="text-gray-900 dark:text-gray-100" style={{ fontWeight: 700, fontSize: "16px" }}>
                ₹{Number(fullOrder.total_value || fullOrder.totalAmount || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {(fullOrder.status === 'new' || fullOrder.status === 'assigned') && (
        <div className="bg-white border-t border-gray-100 p-4 flex gap-3 mt-auto dark:bg-gray-800 dark:border-gray-700">
          <button
            onClick={handleReject}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
          >
            <XCircle size={16} color="#D32F2F" />
            <span style={{ color: "#D32F2F", fontWeight: 600, fontSize: "14px" }}>Reject</span>
          </button>
          <button
            onClick={handleAccept}
            className="flex-[2] flex items-center justify-center gap-2 rounded-xl py-2.5 hover:bg-[#007016] transition-colors"
            style={{ backgroundColor: "#00891D" }}
          >
            <CheckCircle size={16} color="white" />
            <span className="text-white" style={{ fontWeight: 600, fontSize: "14px" }}>Accept Order</span>
          </button>
        </div>
      )}
    </div>
  );
}
