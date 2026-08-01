import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useNewOrderAlert } from "../../contexts/NewOrderAlertContext";
import { Bell, ShoppingBag, X, Volume2, VolumeX, CheckCircle2, Settings } from "lucide-react";
import { NotificationSettingsModal } from "./NotificationSettingsModal";

export function OmsNewOrderAlertOverlay() {
  const { activeOrder, countdown, isBuzzing, queueLength, todayStats, dismissAlert, audioEnabled, toggleAudio, acceptOrder } = useNewOrderAlert();
  const navigate = useNavigate();
  const location = useLocation();
  const [isExiting, setIsExiting] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [soundBannerDismissed, setSoundBannerDismissed] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Long press timer ref for disabling sound
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  const startPress = () => {
    // Prevent default context popup or text selection on long press
    isLongPressRef.current = false;
    setIsHolding(true);
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setIsHolding(false);
      toggleAudio();
    }, 450); // 450ms for responsive long press
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
      }
    } else {
      setCurrentOrderId(null);
      setIsExiting(false);
    }
  }, [activeOrder, currentOrderId]);

  // Handle countdown hitting 0
  useEffect(() => {
    if (countdown === 0 && activeOrder && !isExiting) {
      handleClose();
    }
  }, [countdown, activeOrder, isExiting]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      dismissAlert();
      setIsExiting(false);
    }, 250);
  };

  if (location.pathname.startsWith('/shopkeeper')) {
    return null;
  }

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
    status: "PLACED"
  };

  const handleViewOrder = () => {
    handleClose();
    const type = orderToShow.fulfillmentType?.toUpperCase() || "";
    if (type.includes("PICKUP") || type.includes("SELF")) {
      navigate(`/self-pickup-orders`);
    } else {
      navigate(`/home-delivery-orders`);
    }
  };

  const handleAcceptOrder = async () => {
    if (!activeOrder || isAccepting) return;
    setIsAccepting(true);
    try {
      await acceptOrder(activeOrder.orderId);
      setTimeout(() => {
        handleClose();
        setIsAccepting(false);
      }, 350);
    } catch (err) {
      setIsAccepting(false);
    }
  };

  const formattedTimer = `00:${String(countdown).padStart(2, "0")}`;
  const isConfirmed = orderToShow.status === "CONFIRMED";

  return (
    <>
      {/* Dark backdrop overlay over background page */}
      <div 
        className={`fixed inset-0 z-40 pointer-events-auto transition-opacity duration-300 ${
          isExiting ? "order-alert-backdrop-out" : "order-alert-backdrop"
        }`} 
        onClick={handleClose} 
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
          onClick={handleClose}
          className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* 2. CENTER MAIN ALERT MODAL (Fixed Centered) */}
      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none z-50">
        <div 
          className={`pointer-events-auto w-full max-w-[440px] bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border-2 border-orange-500/80 p-6 relative ${
            isExiting ? "new-order-modal-out" : "new-order-modal"
          }`}
          style={!isExiting ? { animationDelay: "100ms", opacity: 0, animationFillMode: "forwards" } : undefined}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
          >
            <X size={20} />
          </button>

          {/* Header Icon with Soundwave Arcs */}
          <div className="flex flex-col items-center justify-center text-center mb-4">
            <div className="relative mb-2 flex items-center justify-center gap-4">
              {/* Left Soundwave Arcs (SVG) */}
              <svg width="24" height="40" viewBox="0 0 24 40" fill="none" className="text-orange-400/80 order-alert-wave">
                <path d="M18 12C19.5 14.5 19.5 17.5 18 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M12 8C14.5 12 14.5 20 12 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M6 4C9.5 10 9.5 22 6 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>

              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-orange-400/20 animate-ping" />
                <div className="w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/40 relative z-10">
                  <Bell size={28} className="order-alert-bell" />
                </div>
              </div>

              {/* Right Soundwave Arcs (SVG) */}
              <svg width="24" height="40" viewBox="0 0 24 40" fill="none" className="text-orange-400/80 order-alert-wave">
                <path d="M6 12C4.5 14.5 4.5 17.5 6 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M12 8C9.5 12 9.5 20 12 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M18 4C14.5 10 14.5 22 18 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="text-xl font-black tracking-wide uppercase">
              <span className="text-emerald-600 dark:text-emerald-400">NEW ORDER</span>{" "}
              <span className="text-gray-900 dark:text-gray-100">RECEIVED!</span>
            </h2>
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

          {/* Soft Notice Box */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3 mb-4 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300 font-semibold">
            <Volume2 size={18} className="flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              {isConfirmed
                ? "This order is confirmed and will be prepared."
                : `Order will automatically confirm in ${formattedTimer}`}
            </span>
          </div>

          {/* Action Buttons & Timer */}
          <div className="flex flex-col gap-3 pt-1">
            <div className="flex items-stretch gap-3">
              <button
                onClick={handleAcceptOrder}
                disabled={isAccepting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-75 text-white font-black text-sm py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                <CheckCircle2 size={18} /> {isAccepting ? "CONFIRMING..." : "ACCEPT ORDER"}
              </button>
              <div className="bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/50 rounded-xl px-4 py-1.5 text-center flex-shrink-0 min-w-[100px] flex flex-col justify-center">
                <span className="text-xl font-black text-orange-600 dark:text-orange-400 leading-none block">{formattedTimer}</span>
                <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 block mt-0.5 whitespace-nowrap">Auto close in</span>
              </div>
            </div>
            <button
              onClick={handleViewOrder}
              className="w-full bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-white font-extrabold text-xs py-3 px-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors flex items-center justify-center uppercase tracking-wide"
            >
              VIEW ORDER DETAILS
            </button>
          </div>

          {/* Queue Counter if Multiple Orders */}
          {queueLength > 0 && (
            <div className="mt-3 text-center text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-100/50 dark:bg-orange-950/40 py-1.5 rounded-lg">
              + {queueLength} more new order{queueLength > 1 ? "s" : ""} waiting
            </div>
          )}
        </div>
      </div>

      {/* 3. BOTTOM FLOATING WIDGETS (Fixed at Corners) */}
      {/* Bottom-Left Audio Waveform Widget */}
      <div 
        className={`fixed bottom-4 left-4 pointer-events-auto bg-gray-900/95 backdrop-blur border border-gray-700 rounded-2xl shadow-2xl p-3.5 text-white flex flex-col gap-2 min-w-[280px] z-50 ${
          isExiting ? "new-order-card-left-out" : "new-order-card-left"
        }`}
        style={!isExiting ? { animationDelay: "300ms", opacity: 0, animationFillMode: "forwards" } : undefined}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-md">
              <Bell size={16} className={isBuzzing ? "order-alert-bell" : ""} />
            </div>
            <div>
              <h5 className="text-xs font-black text-orange-400 uppercase tracking-wider">NEW ORDER!</h5>
              <p className="text-[11px] text-gray-300">
                ID: <span className="font-bold">{orderToShow.orderNumber}</span> • ₹{orderToShow.totalAmount}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-white p-1">
            <X size={16} />
          </button>
        </div>

        {/* Dynamic Equalizer Bar Animation */}
        <div className="flex items-end justify-center gap-1 h-5 pt-1 px-2">
          {[40, 75, 100, 60, 90, 45, 80, 100, 65, 30, 85, 95, 50, 70, 40].map((h, i) => (
            <span
              key={i}
              className={`w-1 bg-orange-500 rounded-full ${isBuzzing ? "equalizer-bar" : ""}`}
              style={{
                height: `${h}%`,
                animationDelay: `${i * 30}ms`
              }}
            />
          ))}
        </div>
      </div>

      {/* Bottom-Right Live Stats Widget */}
      <div 
        className={`fixed bottom-4 right-4 pointer-events-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-4 min-w-[300px] z-50 ${
          isExiting ? "new-order-card-right-out" : "new-order-card-right"
        }`}
        style={!isExiting ? { animationDelay: "350ms", opacity: 0, animationFillMode: "forwards" } : undefined}
      >
        <div className="flex items-center justify-between mb-3 border-b border-gray-100 dark:border-gray-700 pb-2">
          <h5 className="text-xs font-bold text-gray-900 dark:text-gray-100">Today's Orders</h5>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Live
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div>
            <span className="text-[10px] text-gray-400 font-medium block">New</span>
            <span className="font-black text-orange-600 dark:text-orange-400 text-base">{todayStats?.newCount ?? 0}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-medium block">Pending</span>
            <span className="font-black text-gray-600 dark:text-gray-400 text-base">{todayStats?.pendingCount ?? 0}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-medium block">Confirmed</span>
            <span className="font-black text-blue-600 dark:text-blue-400 text-base">{todayStats?.confirmedCount ?? 0}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-medium block">Completed</span>
            <span className="font-black text-emerald-600 dark:text-emerald-400 text-base">{todayStats?.completedCount ?? 0}</span>
          </div>
        </div>
      </div>
    </>
  );
}
