import { useState, useEffect } from "react";
import { ArrowLeft, Clock, MapPin, Package, CheckCircle, XCircle, Phone, Loader2, Copy, Check } from "lucide-react";
import api from "../../api/axios";
import Breadcrumbs from "../common/Breadcrumbs";
import { OrderDetails as MobileOrderDetails } from "./OrderDetailsMobile";

interface OrderDetailsProps {
  onBack: () => void;
  onNavigate: (screen: string, data?: any) => void;
  order?: any;
  isAdmin?: boolean;
}

export function OrderDetails({ onBack, onNavigate, order, isAdmin = false }: OrderDetailsProps) {
  if (!isAdmin) {
    return <MobileOrderDetails onBack={onBack} onNavigate={onNavigate} order={order} />;
  }
  const [fullOrder, setFullOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Tick every minute so SLA elapsed/remaining updates automatically
  const [now, setNow] = useState(new Date());
  const [copiedOrderNumber, setCopiedOrderNumber] = useState(false);

  const handleCopyOrderNumber = () => {
    if (!fullOrder?.order_number) return;
    navigator.clipboard.writeText(String(fullOrder.order_number)).then(() => {
      setCopiedOrderNumber(true);
      setTimeout(() => setCopiedOrderNumber(false), 2000);
    });
  };

  const storedUser = localStorage.getItem("user");
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
      <div className="flex flex-col min-h-screen bg-[#F5F7FA] dark:bg-gray-900 items-center justify-center">
        <Loader2 className="animate-spin text-[#00891D]" size={40} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F5F7FA] dark:bg-gray-900 items-center justify-center p-4">
        <XCircle className="text-red-500 mb-3" size={48} />
        <p className="text-gray-800 dark:text-gray-200 text-center font-medium mb-4">{error}</p>
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-200 text-gray-800 dark:text-gray-200 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
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

  // ── SLA Tracking ──────────────────────────────────────────────
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
  const completedAtStr = fullOrder.deliveredAt || fullOrder.delivered_at || fullOrder.dispatched_at || fullOrder.dispatchedAt || (fullOrder.status === "dispatched" ? fullOrder.updatedAt : null);

  if (!acceptedAtStr) {
    // Shopkeeper has not accepted yet → SLA hasn't started
    slaState = "waiting";
    slaStatusLabel = "Waiting for Acceptance";
  } else if (fullOrder.status === "dispatched" || completedAtStr) {
    // Order has been dispatched → SLA is done
    slaState = "completed";
    const acceptedAt = new Date(acceptedAtStr).getTime();
    const dispatchedAt = new Date(completedAtStr || new Date()).getTime();
    slaActualSeconds = Math.floor((dispatchedAt - acceptedAt) / 1000);
    slaIsBreached = slaActualSeconds > (slaMinutes * 60);
    slaStatusLabel = slaIsBreached ? "SLA Breached" : "Within SLA";
  } else {
    // Order accepted but not yet dispatched → SLA is counting
    slaState = "inprogress";
    const acceptedAt = new Date(acceptedAtStr).getTime();
    slaElapsedSeconds = Math.floor((now.getTime() - acceptedAt) / 1000);
    slaRemainingSeconds = (slaMinutes * 60) - slaElapsedSeconds;
    slaIsBreached = slaRemainingSeconds < 0;
    slaStatusLabel = slaIsBreached ? "SLA Breached" : "Within SLA";
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-gray-900 p-[32px] pb-10 flex flex-col">
      {/* Breadcrumbs */}
      <div className="mb-6">
        <Breadcrumbs />
      </div>

      {/* Page Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-[32px] font-bold text-[#111827] dark:text-gray-100 leading-none">Order #{fullOrder.order_number}</h1>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 uppercase tracking-wider">
              {fullOrder.order_type || "Home Delivery"}
            </span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${isUrgent
                ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                : "bg-green-550/10 text-green-700 dark:bg-green-950/30 dark:text-green-400"
              }`}>
              <Clock size={12} />
              <span>{fullOrder.sla_minutes}m SLA</span>
            </span>
          </div>
          <p className="text-[14px] text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500">Order ID: {fullOrder.id}</p>
        </div>
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:text-gray-100 transition-colors">
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      <div className="flex flex-col gap-6">
        {/* Row 1: Order Information & Customer Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Information */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h3 className="text-gray-950 dark:text-gray-550 font-bold text-lg border-b border-gray-100 dark:border-gray-700 pb-3 mb-4">Order Information</h3>

            <div className="flex flex-col gap-4">
              {/* Order Number */}
              <div className="flex items-center gap-3">
                <span className="w-[180px] text-[12px] font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider flex-shrink-0">Order Number</span>
                <span className="text-[14px] font-bold text-gray-900 dark:text-gray-100">{fullOrder.order_number || "—"}</span>
                {fullOrder.order_number && (
                  <button
                    onClick={handleCopyOrderNumber}
                    title={copiedOrderNumber ? "Copied!" : "Copy order number"}
                    className="relative ml-1 p-1 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-700 transition-all"
                  >
                    {copiedOrderNumber ? (
                      <Check size={14} className="text-green-600 dark:text-green-400" />
                    ) : (
                      <Copy size={14} />
                    )}
                    {copiedOrderNumber && (
                      <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-900 dark:bg-gray-700 text-white text-[11px] font-semibold px-2 py-0.5 rounded-md shadow-lg pointer-events-none">
                        Copied!
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* Order ID */}
              <div className="flex items-center">
                <span className="w-[180px] text-[12px] font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider flex-shrink-0">Order ID</span>
                <span className="text-[14px] font-semibold text-gray-800 dark:text-gray-200">{fullOrder.id || "—"}</span>
              </div>

              {/* Order Date */}
              <div className="flex items-center">
                <span className="w-[180px] text-[12px] font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider flex-shrink-0">Order Date</span>
                <span className="text-[14px] font-semibold text-gray-800 dark:text-gray-200">
                  {fullOrder.created_at || fullOrder.createdAt ? new Date(fullOrder.created_at || fullOrder.createdAt).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true
                  }) : "—"}
                </span>
              </div>

              {/* Delivery Date & Time */}
              <div className="flex items-center">
                <span className="w-[180px] text-[12px] font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider flex-shrink-0">Delivery Date & Time</span>
                <span className="text-[14px] font-semibold text-gray-800 dark:text-gray-200">
                  {fullOrder.delivered_at || fullOrder.deliveredAt ? new Date(fullOrder.delivered_at || fullOrder.deliveredAt).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true
                  }) : "—"}
                </span>
              </div>

              {/* Processed By */}
              {shouldShowShopkeeper && (
                <div className="flex items-center">
                  <span className="w-[180px] text-[12px] font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider flex-shrink-0">Processed By</span>
                  <span className="text-[14px] font-semibold text-gray-800 dark:text-gray-200">
                    {fullOrder.shopkeeper_name
                      ? `${fullOrder.shopkeeper_name}${fullOrder.assignedShopkeeper?.phone ? ` (${fullOrder.assignedShopkeeper.phone})` : ''}`
                      : 'Unassigned'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-gray-950 dark:text-gray-550 font-bold text-lg">Customer Information</h3>
              <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400 dark:text-gray-500">
                <Phone size={18} className="cursor-pointer hover:text-gray-900 dark:text-gray-100 dark:hover:text-white" />
                <MapPin size={18} className="cursor-pointer hover:text-gray-900 dark:text-gray-100 dark:hover:text-white" />
              </div>
            </div>
            <div className="flex flex-col gap-4">
              {/* Name */}
              <div className="flex items-start">
                <span className="w-[180px] text-[12px] font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider flex-shrink-0">Name</span>
                <span className="text-[14px] font-semibold text-gray-800 dark:text-gray-200">{fullOrder.customer_name || "—"}</span>
              </div>

              {/* Mobile Number */}
              <div className="flex items-start">
                <span className="w-[180px] text-[12px] font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider flex-shrink-0">Mobile Number</span>
                <span className="text-[14px] font-semibold text-gray-800 dark:text-gray-200">{fullOrder.customer_phone || "—"}</span>
              </div>

              {/* Delivery Type */}
              <div className="flex items-start">
                <span className="w-[180px] text-[12px] font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider flex-shrink-0">Delivery Type</span>
                <span className="text-[14px] font-semibold text-gray-800 dark:text-gray-200">{fullOrder.order_type || "—"}</span>
              </div>

              {/* Address */}
              <div className="flex items-start">
                <span className="w-[180px] text-[12px] font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider flex-shrink-0">Address</span>
                <span className="text-[14px] font-semibold text-gray-800 dark:text-gray-200 break-words flex-1">
                  {fullOrder.customer_address || "No address provided"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Ordered Products Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Package size={20} className="text-[#00891D]" />
            <h3 className="text-gray-900 dark:text-gray-100 font-bold text-lg">Ordered Products</h3>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
              {mergedItems.length} items
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="pb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Product Name</th>
                  <th className="pb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider text-center">Quantity</th>
                  <th className="pb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">Unit Price</th>
                  <th className="pb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">Total Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {mergedItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                      No items found for this order.
                    </td>
                  </tr>
                ) : (
                  mergedItems.map((item: any) => {
                    const name = item.name || item.product?.name || "Unknown Product";
                    const qty = item.quantity || 1;
                    const price = Number(item.price ?? item.product?.price ?? 0);
                    const total = price * qty;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 dark:bg-gray-700/50/50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="py-3.5 flex items-center gap-3">
                          <div className="w-10 h-10 rounded border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center text-xl overflow-hidden shadow-sm flex-shrink-0">
                            {item.image_url ? <img src={item.image_url} alt={name} className="w-full h-full object-cover" /> : '📦'}
                          </div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{name}</span>
                        </td>
                        <td className="py-3.5 text-sm font-bold text-gray-800 dark:text-gray-200 text-center">{qty}</td>
                        <td className="py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-300 text-right">₹{price.toFixed(2)}</td>
                        <td className="py-3.5 text-sm font-bold text-gray-900 dark:text-gray-100 text-right">₹{total.toFixed(2)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Row 3: SLA Tracking & Payment Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SLA Tracking Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h3 className="text-gray-950 dark:text-gray-550 font-bold text-lg border-b border-gray-100 dark:border-gray-700 pb-3 mb-4">SLA Tracking</h3>

            <div className="flex flex-col gap-4">
              {/* Target SLA */}
              <div className="flex items-center">
                <span className="w-[180px] text-[12px] font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider flex-shrink-0">Target SLA</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFF3E0] text-[#EF5A06]">
                  {slaMinutes} min
                </span>
              </div>

              {/* Waiting state */}
              {slaState === "waiting" && (
                <div className="flex items-center">
                  <span className="w-[180px] text-[12px] font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider flex-shrink-0">Status</span>
                  <span className="text-xs font-bold text-yellow-600 dark:text-yellow-450 bg-yellow-50 dark:bg-yellow-950/30 px-2.5 py-1 rounded-full">
                    {slaStatusLabel}
                  </span>
                </div>
              )}

              {/* In-progress state */}
              {slaState === "inprogress" && (
                <>
                  <div className="flex items-center">
                    <span className="w-[180px] text-[12px] font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider flex-shrink-0">Status</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${slaIsBreached
                        ? "bg-red-550/10 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                        : "bg-green-550/10 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                      }`}>
                      {slaStatusLabel}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-[180px] text-[12px] font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider flex-shrink-0">Elapsed Time</span>
                    <span className="text-[14px] font-semibold text-gray-800 dark:text-gray-200">
                      {formatSeconds(slaElapsedSeconds)}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-[180px] text-[12px] font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider flex-shrink-0">Remaining Time</span>
                    <span className={`text-[14px] font-bold ${slaIsBreached
                        ? "text-red-600 dark:text-red-400"
                        : (slaRemainingSeconds <= 300)
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-green-600 dark:text-green-400"
                      }`}>
                      {slaIsBreached ? `Overdue by ${formatSeconds(slaRemainingSeconds)}` : formatSeconds(slaRemainingSeconds)}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="flex items-center">
                    <span className="w-[180px] text-[12px] font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider flex-shrink-0">SLA Progress</span>
                    <div className="flex-1 max-w-[240px] h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min((slaElapsedSeconds / (slaMinutes * 60)) * 100, 100)}%`,
                          backgroundColor: slaIsBreached ? "#D32F2F" : (slaRemainingSeconds <= 300) ? "#EF5A06" : "#00891D",
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Completed state */}
              {slaState === "completed" && (
                <>
                  <div className="flex items-center">
                    <span className="w-[180px] text-[12px] font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider flex-shrink-0">Actual Processing Time</span>
                    <span className="text-[14px] font-semibold text-gray-800 dark:text-gray-200">
                      {formatSeconds(slaActualSeconds)}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-[180px] text-[12px] font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider flex-shrink-0">Status</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${slaIsBreached
                        ? "bg-red-550/10 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                        : "bg-green-550/10 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                      }`}>
                      {slaStatusLabel}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h3 className="text-gray-950 dark:text-gray-550 font-bold text-lg border-b border-gray-100 dark:border-gray-700 pb-3 mb-4">Payment Summary</h3>

            <div className="flex flex-col gap-4">
              {/* Total Items */}
              <div className="flex items-center">
                <span className="w-[180px] text-[12px] font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider flex-shrink-0">Total Items</span>
                <span className="text-[14px] font-bold text-gray-800 dark:text-gray-200">{mergedItems.length}</span>
              </div>

              {/* Subtotal */}
              <div className="flex items-center">
                <span className="w-[180px] text-[12px] font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider flex-shrink-0">Subtotal</span>
                <span className="text-[14px] font-semibold text-gray-800 dark:text-gray-200">
                  ₹{Number(
                    (fullOrder.total_value || fullOrder.totalAmount || 0) -
                    (fullOrder.delivery_charge || fullOrder.deliveryCharge || 0) -
                    (fullOrder.additional_charges || fullOrder.additionalCharges || 0)
                  ).toFixed(2)}
                </span>
              </div>

              {/* Delivery Charges */}
              <div className="flex items-center">
                <span className="w-[180px] text-[12px] font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider flex-shrink-0">Delivery Charges</span>
                <span className="text-[14px] font-semibold text-gray-800 dark:text-gray-200">
                  ₹{Number(fullOrder.delivery_charge || fullOrder.deliveryCharge || 0).toFixed(2)}
                </span>
              </div>

              {/* Additional Charges */}
              {(fullOrder.additional_charges || fullOrder.additionalCharges) ? (
                <div className="flex items-center">
                  <span className="w-[180px] text-[12px] font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider flex-shrink-0">Additional Charges</span>
                  <span className="text-[14px] font-semibold text-gray-800 dark:text-gray-200">
                    ₹{Number(fullOrder.additional_charges || fullOrder.additionalCharges || 0).toFixed(2)}
                  </span>
                </div>
              ) : null}

              {/* Payment Method */}
              <div className="flex items-center">
                <span className="w-[180px] text-[12px] font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider flex-shrink-0">Payment Method</span>
                <span className="text-[14px] font-bold text-blue-700 dark:text-blue-400 uppercase">
                  {fullOrder.payment_method || "COD"}
                </span>
              </div>

              {/* Payment Status */}
              <div className="flex items-center">
                <span className="w-[180px] text-[12px] font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider flex-shrink-0">Payment Status</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${fullOrder.payment_status?.toLowerCase() === "paid" || fullOrder.payment_status?.toLowerCase() === "completed"
                    ? "bg-green-550/10 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                    : "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400"
                  }`}>
                  {fullOrder.payment_status || "Pending"}
                </span>
              </div>

              {/* Total Amount */}
              <div className="flex items-center border-t border-gray-100 dark:border-gray-700 pt-4">
                <span className="w-[180px] text-[12px] font-bold text-gray-900 dark:text-white uppercase tracking-wider flex-shrink-0">Total Amount</span>
                <span className="text-xl font-black text-gray-950 dark:text-white">
                  ₹{Number(fullOrder.total_value || fullOrder.totalAmount || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {fullOrder.status === 'new' && (
        <div className="bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 p-4 flex gap-3 mt-auto">
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
