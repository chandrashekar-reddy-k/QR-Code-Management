import { useState, useEffect, useRef } from "react";
import { useShopkeeperNewOrderAlert } from "../../contexts/ShopkeeperNewOrderAlertContext";
import { Bell, ShoppingBag, X, Volume2, VolumeX, CheckCircle2, Check, XCircle, Settings } from "lucide-react";
import { NotificationSettingsModal } from "../common/NotificationSettingsModal";
import api from "../../api/axios";
import { toast } from "react-hot-toast";

export function ShopkeeperNewOrderPopup() {
  const { activeOrder, isBuzzing, queueLength, dismissAlert, audioEnabled, toggleAudio } = useShopkeeperNewOrderAlert();
  const [isExiting, setIsExiting] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [soundBannerDismissed, setSoundBannerDismissed] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isHolding, setIsHolding] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Long press timer ref for disabling sound
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  const startPress = () => {
    isLongPressRef.current = false;
    setIsHolding(true);
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setIsHolding(false);
      toggleAudio();
    }, 450);
  };

  const cancelPress = () => {
    setIsHolding(false);
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleBannerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }
  };

  // Sync state with context activeOrder
  useEffect(() => {
    if (activeOrder) {
      if (activeOrder.orderId !== currentOrderId) {
        setIsExiting(false);
        setCurrentOrderId(activeOrder.orderId);
        setTimeLeft(30);
      }
    } else {
      setCurrentOrderId(null);
      setIsExiting(false);
      setTimeLeft(30);
    }
  }, [activeOrder, currentOrderId]);

  // Timer logic
  useEffect(() => {
    if (!activeOrder || isExiting || isAccepting) return;

    if (timeLeft <= 0) {
      // Auto-accept the order when timer reaches 0
      handleAccept();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [activeOrder, isExiting, isAccepting, timeLeft]);

  const handleClose = (rejected = false) => {
    if (!activeOrder) return;
    setIsExiting(true);
    setTimeout(() => {
      dismissAlert(activeOrder.orderId, rejected);
      setIsExiting(false);
    }, 250);
  };

  const handleAccept = async () => {
    if (!activeOrder) return;
    setIsAccepting(true);
    try {
      await api.put(`/orders/${activeOrder.orderId}/accept`);
      toast.success("Order accepted successfully");
      // Once accepted, we dismiss it (not rejected, but handled)
      handleClose(false);
      // Let the socket event trigger fetchOrders in the background
    } catch (error: any) {
      if (error.response?.status === 409) {
        toast.error("Order accepted by another shopkeeper");
        handleClose(false);
      } else {
        toast.error("Failed to accept order");
      }
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!activeOrder) return;
    try {
      await api.put(`/orders/${activeOrder.orderId}/reject`);
    } catch (e) {
      console.error('Failed to ignore order on backend', e);
    }
    handleClose(true); // marked as rejected locally
  };

  if (!activeOrder && !isExiting) {
    if (!soundBannerDismissed) {
      return (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-gray-900 dark:bg-gray-800 text-white px-4 py-3 rounded-2xl shadow-2xl border cursor-pointer select-none transition-all ${
            isHolding ? "scale-95 border-amber-400" : audioEnabled ? "border-emerald-500/60 hover:bg-gray-800" : "border-orange-500/60 hover:bg-gray-800"
          }`}
          onClick={handleBannerClick}
          onPointerDown={startPress}
          onPointerUp={cancelPress}
          onPointerLeave={cancelPress}
          onPointerCancel={cancelPress}
          title={audioEnabled ? "Long press (hold) to disable sound alerts" : "Long press (hold) to enable sound"}
        >
          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse ${
            audioEnabled ? "bg-emerald-500 text-white" : "bg-orange-500 text-white"
          }`}>
            {audioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">
              {audioEnabled ? "Order Alert Sound Enabled" : "Enable Order Alerts Sound"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {audioEnabled
                ? (isHolding ? "Hold to disable..." : "Long press (hold) to disable sound")
                : (isHolding ? "Hold to enable..." : "Long press (hold) to enable sound")}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="sound-banner-close-btn text-gray-400 hover:text-white p-1 rounded-full transition-colors z-10"
              onMouseDown={(e) => { e.stopPropagation(); cancelPress(); }}
              onMouseUp={(e) => e.stopPropagation()}
              onTouchStart={(e) => { e.stopPropagation(); cancelPress(); }}
              onTouchEnd={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setIsSettingsOpen(true);
              }}
              title="Notification Setup & Sound Settings"
            >
              <Settings size={16} />
            </button>
            <button
              type="button"
              className="sound-banner-close-btn text-gray-400 hover:text-white p-1 rounded-full transition-colors z-10"
              onMouseDown={(e) => { e.stopPropagation(); cancelPress(); }}
              onMouseUp={(e) => e.stopPropagation()}
              onTouchStart={(e) => { e.stopPropagation(); cancelPress(); }}
              onTouchEnd={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setSoundBannerDismissed(true);
              }}
              title="Close Banner"
            >
              <X size={16} />
            </button>
          </div>
          <NotificationSettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            audioEnabled={audioEnabled}
            toggleAudio={toggleAudio}
          />
        </div>
      );
    }
    return (
      <NotificationSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        audioEnabled={audioEnabled}
        toggleAudio={toggleAudio}
      />
    );
  }

  // Fallback to last shown order data while exiting to avoid layout flashes
  const orderToShow = activeOrder || {
    orderNumber: "7f1a2b3c",
    totalAmount: 850,
    itemCount: 6,
    customerName: "Shiva",
    customerPhone: "7993947127",
    paymentMethod: "RAZORPAY_UPI",
    deliveryAddress: "24 Vittal Mallya Road, Bengaluru, Karnataka, 500084",
    fulfillmentType: "HOME_DELIVERY",
    status: "CONFIRMED"
  };

  const isConfirmed = orderToShow.status === "CONFIRMED";

  return (
    <>
      {/* Dark backdrop overlay over background page */}
      <div 
        className={`fixed inset-0 z-40 pointer-events-auto transition-opacity duration-300 ${
          isExiting ? "order-alert-backdrop-out" : "order-alert-backdrop"
        }`} 
        onClick={() => handleClose(false)} 
      />

      {/* 1. TOP TOAST BANNER NOTIFICATION (Fixed at Top Center) */}
      <div 
        className={`fixed top-4 left-1/2 -translate-x-1/2 pointer-events-auto shadow-2xl rounded-2xl bg-white dark:bg-gray-800 border border-emerald-100 dark:border-emerald-900/40 px-5 py-3 flex items-center gap-3 z-50 ${
          isExiting ? "new-order-toast-out" : "new-order-toast"
        }`}
        style={!isExiting ? { animationDelay: "200ms", opacity: 0, animationFillMode: "forwards" } : undefined}
      >
        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
          <Bell size={20} className="animate-pulse" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">New Order Received!</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 whitespace-nowrap">
            Order ID: <span className="font-semibold text-gray-700 dark:text-gray-300">{orderToShow.orderNumber}</span> • <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹{orderToShow.totalAmount}</span> • {orderToShow.itemCount} items
          </p>
        </div>
        <button
          onClick={() => handleClose(false)}
          className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* 2. CENTER MAIN ALERT MODAL (Fixed Centered) */}
      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none z-50">
        <div 
          className={`pointer-events-auto w-full max-w-[440px] bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border-2 border-emerald-500/80 p-6 relative ${
            isExiting ? "new-order-modal-out" : "new-order-modal"
          }`}
          style={!isExiting ? { animationDelay: "100ms", opacity: 0, animationFillMode: "forwards" } : undefined}
        >
          {/* Close Button */}
          <button
            onClick={() => handleClose(false)}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
          >
            <X size={20} />
          </button>

          {/* Header Icon with Soundwave Arcs */}
          <div className="flex flex-col items-center justify-center text-center mb-4">
            <div className="relative mb-2 flex items-center justify-center gap-4">
              {/* Left Soundwave Arcs (SVG) */}
              <svg width="24" height="40" viewBox="0 0 24 40" fill="none" className="text-emerald-400/80 order-alert-wave">
                <path d="M18 12C19.5 14.5 19.5 17.5 18 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M12 8C14.5 12 14.5 20 12 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M6 4C9.5 10 9.5 22 6 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>

              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
                <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/40 relative z-10">
                  <Bell size={28} className={isBuzzing ? "order-alert-bell" : ""} />
                </div>
              </div>

              {/* Right Soundwave Arcs (SVG) */}
              <svg width="24" height="40" viewBox="0 0 24 40" fill="none" className="text-emerald-400/80 order-alert-wave">
                <path d="M6 12C4.5 14.5 4.5 17.5 6 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M12 8C9.5 12 9.5 20 12 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M18 4C14.5 10 14.5 22 18 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="text-xl font-black tracking-wide uppercase">
              <span className="text-emerald-600 dark:text-emerald-400">NEW ORDER</span>{" "}
              <span className="text-gray-900 dark:text-gray-100">RECEIVED!</span>
            </h2>
            <p className="text-xs font-bold text-red-500 mt-1">Disappearing in {timeLeft}s...</p>
          </div>

          {/* Order Highlight Box */}
          <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 rounded-2xl p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <ShoppingBag size={24} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Order ID</span>
                <p className="text-xl font-black text-gray-900 dark:text-gray-100 leading-tight">{orderToShow.orderNumber}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">₹{orderToShow.totalAmount}</p>
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mt-1 block">{orderToShow.itemCount} items</span>
            </div>
          </div>

          {/* Customer & Details List */}
          <div className="space-y-3 mb-4 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700/50">
              <span className="text-gray-500 dark:text-gray-400 font-medium">👤 Customer</span>
              <div className="text-right">
                <span className="font-bold text-gray-800 dark:text-gray-200 mr-2">{orderToShow.customerName}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{orderToShow.customerPhone}</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700/50">
              <span className="text-gray-500 dark:text-gray-400 font-medium">💳 Payment Method</span>
              <span className="font-extrabold text-gray-950 dark:text-gray-50 uppercase tracking-wide">{orderToShow.paymentMethod}</span>
            </div>

            <div className="flex items-start justify-between py-1.5">
              <span className="text-gray-500 dark:text-gray-400 font-medium flex-shrink-0 mr-2">📍 Delivery Address</span>
              <span className="font-medium text-gray-700 dark:text-gray-300 text-right line-clamp-2">{orderToShow.deliveryAddress}</span>
            </div>
          </div>

          {/* Status Row */}
          <div className="pt-2 border-t border-dashed border-gray-200 dark:border-gray-700 mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Status</span>
            {isConfirmed ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 text-xs font-extrabold border border-emerald-200">
                <CheckCircle2 size={14} /> CONFIRMED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 text-xs font-extrabold border border-orange-200">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" /> CONFIRMING
              </span>
            )}
          </div>

          {/* Action Buttons (Accept / Reject) */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              onClick={handleAccept}
              disabled={isAccepting}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <Check size={18} /> {isAccepting ? "Accepting..." : "Accept Order"}
            </button>
            <button
              onClick={handleReject}
              disabled={isAccepting}
              className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-600 dark:hover:text-red-400 text-gray-700 dark:text-gray-200 font-bold text-sm py-3 px-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 hover:border-red-200 dark:hover:border-red-800 transition-colors flex items-center justify-center gap-2 relative overflow-hidden"
            >
              <div className="absolute bottom-0 left-0 h-1 bg-red-500/20 w-full" />
              <div 
                className="absolute bottom-0 left-0 h-1 bg-red-500 transition-all duration-1000 ease-linear" 
                style={{ width: `${(timeLeft / 30) * 100}%` }}
              />
              <span className="relative z-10 flex items-center gap-2"><XCircle size={18} /> Ignore ({timeLeft}s)</span>
            </button>
          </div>

          {/* Queue Counter if Multiple Orders */}
          {queueLength > 0 && (
            <div className="mt-3 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-950/40 py-1.5 rounded-lg">
              + {queueLength} more new order{queueLength > 1 ? "s" : ""} waiting
            </div>
          )}
        </div>
      </div>
    </>
  );
}
