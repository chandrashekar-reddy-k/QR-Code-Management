import React from "react";
import { AlertTriangle, X, ArrowRight, Volume2, VolumeX, ShieldAlert } from "lucide-react";
import { useUnassignedDeliveryAlert } from "../../contexts/UnassignedDeliveryAlertContext";
import { useNavigate, useLocation } from "react-router-dom";

interface UnassignedDeliveryAlertPopupProps {
  onViewOrder?: (orderId: string, orderNumber: string) => void;
}

export function UnassignedDeliveryAlertPopup({ onViewOrder }: UnassignedDeliveryAlertPopupProps) {
  const { activeAlert, alertQueue, dismissAlert, audioEnabled, toggleAudio } = useUnassignedDeliveryAlert();
  const navigate = useNavigate();
  const location = useLocation();

  if (!activeAlert) return null;

  const handleViewOrder = () => {
    const orderId = activeAlert.orderId;
    const orderNumber = activeAlert.orderNumber;
    dismissAlert(orderId);

    if (onViewOrder) {
      onViewOrder(orderId, orderNumber);
      return;
    }

    // Context-sensitive navigation
    if (location.pathname.startsWith("/shopkeeper")) {
      // In Shopkeeper ERP: navigate to ready-orders screen or trigger custom event
      window.dispatchEvent(
        new CustomEvent("shopkeeperNavigateScreen", {
          detail: { screen: "ready-orders", orderId, orderNumber },
        })
      );
    } else {
      // In Partner OMS: navigate to orders management
      navigate(`/orders?search=${encodeURIComponent(orderNumber)}`);
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-5 right-5 z-50 max-w-md w-full sm:w-[420px] p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-amber-500/80 dark:border-amber-500/60 transform transition-all duration-300 ease-out animate-bounce-short"
      style={{
        boxShadow: "0 20px 25px -5px rgba(245, 158, 11, 0.2), 0 8px 10px -6px rgba(245, 158, 11, 0.2)",
      }}
    >
      {/* Top Bar: Icon, Title, and Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center flex-shrink-0 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">
              {activeAlert.title || "Delivery Partner Not Assigned"}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/40 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-700/40">
                #{activeAlert.orderNumber}
              </span>
              {activeAlert.totalAmount ? (
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  ₹{activeAlert.totalAmount}
                </span>
              ) : null}
              {activeAlert.deliveryType === "FAST" && (
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide">
                  ⚡ Fast Delivery
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleAudio}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            title={audioEnabled ? "Mute alert sound" : "Unmute alert sound"}
            aria-label={audioEnabled ? "Mute alert sound" : "Unmute alert sound"}
          >
            {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button
            type="button"
            onClick={() => dismissAlert(activeAlert.orderId)}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            title="Dismiss alert"
            aria-label="Dismiss alert"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Message Body */}
      <div className="mt-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed pl-1">
        {activeAlert.message}
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between gap-2">
        <div className="text-xs text-gray-400 dark:text-gray-500">
          {alertQueue.length > 0 ? (
            <span>+{alertQueue.length} more unassigned</span>
          ) : (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <ShieldAlert size={12} /> Action required
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => dismissAlert(activeAlert.orderId)}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={handleViewOrder}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 active:scale-95 rounded-xl shadow-md transition-all"
          >
            <span>View Order</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
