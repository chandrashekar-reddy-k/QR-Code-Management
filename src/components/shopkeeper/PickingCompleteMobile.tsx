import { CheckCircle, Package, ArrowRight, Clock, XCircle } from "lucide-react";

interface PickingCompleteMobileProps {
  onNavigate: (screen: string) => void;
  data?: any;
}

export function PickingCompleteMobile({ onNavigate, data }: PickingCompleteMobileProps) {
  const order = data || {};
  const items: any[] = order.items || [];

  // Dynamic calculations
  const totalItems = items.length;
  const pickedItems = items.filter((i) => i.is_picked).length;
  const rejectedItems = items.filter((i) => i.is_rejected).length;
  const successRate = totalItems > 0 ? Math.round((pickedItems / totalItems) * 100) : 100;
  const allPicked = rejectedItems === 0;

  const rejectedList = items.filter((i) => i.is_rejected);

  // Time taken
  const timeTaken =
    order.picking_started_at && order.picking_completed_at
      ? Math.max(1, Math.round((new Date(order.picking_completed_at).getTime() - new Date(order.picking_started_at).getTime()) / 60000)) + "m"
      : "1m";

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F7FA] items-center justify-center px-4 py-8 dark:bg-gray-900">
      {/* Success Animation Circle */}
      <div className="relative mb-8">
        <div className="w-32 h-32 rounded-full flex items-center justify-center" style={{ backgroundColor: "#E8F5E9" }}>
          <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ backgroundColor: "#C8E6C9" }}>
            <CheckCircle size={56} color="#2E7D32" strokeWidth={2} />
          </div>
        </div>
        {/* Ripple rings */}
        <div className="absolute inset-0 rounded-full border-4 border-green-200 animate-ping opacity-30" />
      </div>

      {/* Header — dynamic based on whether any items were rejected */}
      {allPicked ? (
        <>
          <h1 className="text-gray-900 mb-2 text-center dark:text-gray-100" style={{ fontWeight: 700, fontSize: "24px" }}>
            Picking Complete!
          </h1>
          <p className="text-gray-500 mb-8 text-center dark:text-gray-400" style={{ fontSize: "14px" }}>
            All items picked successfully for order #{order.order_number || "—"}
          </p>
        </>
      ) : (
        <>
          <h1 className="text-gray-900 mb-2 text-center dark:text-gray-100" style={{ fontWeight: 700, fontSize: "24px" }}>
            Picking Completed!
          </h1>
          <div className="mb-8 text-center">
            <p className="text-gray-700 dark:text-gray-300" style={{ fontSize: "15px", fontWeight: 600 }}>
              {pickedItems} {pickedItems === 1 ? "Item" : "Items"} Picked Successfully
            </p>
            <p className="text-red-600 mt-1" style={{ fontSize: "14px", fontWeight: 600 }}>
              {rejectedItems} {rejectedItems === 1 ? "Item" : "Items"} Rejected
            </p>
          </div>
        </>
      )}

      {/* Stats Cards — 4 columns when rejected items exist, 3 otherwise */}
      <div className={`w-full max-w-sm grid gap-3 mb-6 ${rejectedItems > 0 ? "grid-cols-4" : "grid-cols-3"}`}>
        {/* Total Items */}
        <div className="bg-white rounded-2xl p-4 text-center shadow-sm dark:bg-gray-800">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mx-auto mb-2">
            <Package size={20} color="#00891D" />
          </div>
          <p className="text-gray-900 dark:text-gray-100" style={{ fontWeight: 700, fontSize: "22px" }}>
            {totalItems}
          </p>
          <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "11px" }}>
            Total Items
          </p>
        </div>

        {/* Picked */}
        <div className="bg-white rounded-2xl p-4 text-center shadow-sm dark:bg-gray-800">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mx-auto mb-2">
            <CheckCircle size={20} color="#2E7D32" />
          </div>
          <p className="text-green-700" style={{ fontWeight: 700, fontSize: "22px" }}>
            {pickedItems}
          </p>
          <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "11px" }}>
            Picked
          </p>
        </div>

        {/* Rejected — only show card when there are rejected items */}
        {rejectedItems > 0 && (
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm dark:bg-gray-800">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-2">
              <XCircle size={20} color="#D32F2F" />
            </div>
            <p className="text-red-600" style={{ fontWeight: 700, fontSize: "22px" }}>
              {rejectedItems}
            </p>
            <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "11px" }}>
              Rejected
            </p>
          </div>
        )}

        {/* Time Taken */}
        <div className="bg-white rounded-2xl p-4 text-center shadow-sm dark:bg-gray-800">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center mx-auto mb-2">
            <Clock size={20} color="#EF5A06" />
          </div>
          <p className="text-orange-600" style={{ fontWeight: 700, fontSize: "22px" }}>
            {timeTaken}
          </p>
          <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "11px" }}>
            Time Taken
          </p>
        </div>
      </div>

      {/* Order Summary Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl p-4 mb-6 shadow-sm dark:bg-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-gray-700 dark:text-gray-300" style={{ fontWeight: 600, fontSize: "14px" }}>
            Order Summary
          </h3>
          {allPicked ? (
            <span className="bg-green-100 text-green-700 rounded-full px-2 py-0.5" style={{ fontSize: "11px", fontWeight: 600 }}>
              All Picked
            </span>
          ) : (
            <span className="bg-orange-100 text-orange-700 rounded-full px-2 py-0.5" style={{ fontSize: "11px", fontWeight: 600 }}>
              Completed
            </span>
          )}
        </div>
        {[
          { label: "Order Number", value: `#${order.order_number || "—"}` },
          { label: "Order Type", value: order.order_type || "Quick Commerce" },
          {
            label: "Pick Start",
            value: (() => {
              const val = order.pickingStartedAt || order.picking_started_at;
              if (val === undefined || val === null || val === "" || String(val).toLowerCase() === "null") return "—";
              const date = new Date(val);
              if (isNaN(date.getTime())) return "—";
              return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
            })(),
          },
          {
            label: "Pick End",
            value: (() => {
              const val = order.pickingCompletedAt || order.picking_completed_at;
              if (val === undefined || val === null || val === "" || String(val).toLowerCase() === "null") return "—";
              const date = new Date(val);
              if (isNaN(date.getTime())) return "—";
              return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
            })(),
          },
          { label: "Success Rate", value: `${successRate}%` },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
            <span className="text-gray-500 dark:text-gray-400" style={{ fontSize: "13px" }}>
              {row.label}
            </span>
            <span className="text-gray-800 dark:text-gray-200" style={{ fontWeight: 600, fontSize: "13px" }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* Rejected Items Section — only shown when there are rejections */}
      {rejectedList.length > 0 && (
        <div className="w-full max-w-sm mb-6">
          <h3 className="text-gray-700 mb-3 dark:text-gray-300" style={{ fontWeight: 600, fontSize: "14px" }}>
            Rejected Items
          </h3>
          <div className="flex flex-col gap-2">
            {rejectedList.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl p-4 shadow-sm"
                style={{ backgroundColor: "#FFEBEE", border: "1px solid #FFCDD2" }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                    <XCircle size={18} color="#D32F2F" />
                  </div>
                  <div className="flex-1">
                    <p className="text-red-800" style={{ fontWeight: 700, fontSize: "14px" }}>
                      {item.name}
                    </p>
                    <p className="text-red-600 mt-0.5" style={{ fontSize: "12px", fontWeight: 500 }}>
                      Qty: {item.quantity}
                    </p>
                    {(item.reject_reason || item.reject_remarks) && (
                      <div className="mt-2 pt-2" style={{ borderTop: "1px solid #FFCDD2" }}>
                        <p className="text-red-500" style={{ fontSize: "11px", fontWeight: 600, marginBottom: "2px" }}>
                          Reason:
                        </p>
                        <p className="text-red-700" style={{ fontSize: "13px", fontWeight: 600 }}>
                          {item.reject_reason || item.reject_remarks}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA Button */}
      <div className="w-full max-w-sm">
        <button
          onClick={() => onNavigate("packing-queue")}
          className="w-full flex items-center justify-center gap-3 rounded-2xl py-4 shadow-lg"
          style={{ backgroundColor: "#00891D" }}
        >
          <Package size={20} color="white" />
          <span className="text-white" style={{ fontWeight: 700, fontSize: "16px" }}>
            Move to Packing
          </span>
          <ArrowRight size={20} color="white" />
        </button>
        <button
          onClick={() => onNavigate("picking-queue")}
          className="w-full mt-3 flex items-center justify-center gap-2 rounded-2xl py-3 border border-gray-200 dark:border-gray-700"
        >
          <span className="text-gray-600 dark:text-gray-400" style={{ fontWeight: 500, fontSize: "14px" }}>
            Back to Picking Queue
          </span>
        </button>
      </div>
    </div>
  );
}
