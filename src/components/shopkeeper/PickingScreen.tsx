import { useState, useEffect } from "react";
import { ArrowLeft, MapPin, CheckCircle, Scan, Package, Loader2, XCircle, ChevronRight } from "lucide-react";
import { PickingScreenMobile } from "./PickingScreenMobile";
import api from "../../api/axios";

interface PickingScreenProps {
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
  order?: any;
}

function LocationBadge({ location }: { location: string }) {
  if (!location) return null;
  const parts = location.split("-");
  return (
    <div className="flex items-center gap-2">
      {parts.map((part, i) => (
        <span key={i} className="bg-red-100 text-red-700 rounded px-3 py-1.5 shadow-sm" style={{ fontWeight: 800, fontSize: "18px", fontFamily: "monospace", letterSpacing: "1px" }}>
          {part}
        </span>
      ))}
    </div>
  );
}

export function PickingScreen({ onNavigate, onBack, order }: PickingScreenProps) {
  const [items, setItems] = useState<any[]>([]);
  const currentIdx = items.findIndex(item => !item.is_picked && !item.is_rejected);
  const currentItem = currentIdx >= 0 ? items[currentIdx] : null;

  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRejectReason, setSelectedRejectReason] = useState<string>("");
  const [rejectRemarks, setRejectRemarks] = useState<string>("");
  const [rejectingItem, setRejectingItem] = useState<any>(null);
  const [validationError, setValidationError] = useState<string>("");
  const [elapsedTime, setElapsedTime] = useState("");
  const [lastActivity, setLastActivity] = useState<string>("—");
  const [barcodeInput, setBarcodeInput] = useState("");

  useEffect(() => {
    setBarcodeInput("");
  }, [currentItem?.id]);

  const formatTimeOnly = (dateStr?: string) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatOrderDateTime = (dateStr?: string): string => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "—";

    const day = String(date.getDate()).padStart(2, '0');
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;

    return `${day}-${month}-${year}, ${hours}:${minutes} ${ampm}`;
  };

  useEffect(() => {
    const startVal = order?.picking_started_at || order?.pickingStartedAt || order?.accepted_at || order?.createdAt || order?.created_at;
    if (!startVal) {
      setElapsedTime("—");
      return;
    }
    const startTime = new Date(startVal).getTime();
    if (isNaN(startTime)) {
      setElapsedTime("—");
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diffMs = now - startTime;
      if (diffMs < 0) {
        setElapsedTime("0s");
        return;
      }
      const totalSecs = Math.floor(diffMs / 1000);
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      const hrs = Math.floor(mins / 60);
      
      if (hrs > 0) {
        setElapsedTime(`${hrs}h ${mins % 60}m ${secs}s`);
      } else if (mins > 0) {
        setElapsedTime(`${mins}m ${secs}s`);
      } else {
        setElapsedTime(`${secs}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [order]);

  useEffect(() => {
    if (!order?.id) return;
    api.get(`/orders/${order.id}`).then(async res => {
      setItems(res.data.items || []);

      const activityVal = res.data.updated_at || res.data.updatedAt || order?.updated_at || order?.updatedAt;
      if (activityVal) {
        setLastActivity(formatTimeOnly(activityVal));
      }

      // If the order is still "accepted", mark it as "picking" to trigger picking_started_at
      if (res.data.status === 'accepted') {
        try {
          await api.put(`/orders/${order.id}/status`, { status: 'picking' });
        } catch (e) {
          console.error('Failed to update status to picking', e);
        }
      }

      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [order?.id]);

  const handlePick = async (itemId: number) => {
    try {
      const newItems = items.map(item =>
        item.id === itemId ? { ...item, is_picked: true, picked_qty: item.quantity } : item
      );
      setItems(newItems);

      // 1. Wait for the API call to complete so backend updates the db and sets timestamps
      await api.put(`/orders/${order.id}/items/${itemId}/pick`);
      setLastActivity(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

      // 2. Check if all items are now processed
      const allCompleted = newItems.every(i => i.is_picked || i.is_rejected);
      if (allCompleted) {
        try {
          const updatedOrderRes = await api.get(`/orders/${order.id}`);
          onNavigate("picking-complete", { ...updatedOrderRes.data, items: newItems });
        } catch (e) {
          onNavigate("picking-complete", {
            ...order,
            items: newItems,
            pickingCompletedAt: new Date().toISOString(),
            picking_completed_at: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectSubmit = async () => {
    if (!selectedRejectReason) {
      setValidationError("Please select a rejection reason.");
      return;
    }

    try {
      const newItems = items.map(item =>
        item.id === rejectingItem.id
          ? {
              ...item,
              is_rejected: true,
              reject_reason: selectedRejectReason,
              reject_remarks: rejectRemarks
            }
          : item
      );
      setItems(newItems);
      setShowRejectModal(false);

      // 1. Wait for the API call to complete
      await api.put(`/orders/${order.id}/items/${rejectingItem.id}/reject`, {
        reason: selectedRejectReason,
        remarks: rejectRemarks
      });
      setLastActivity(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

      // 2. Check if all items are now processed
      const allCompleted = newItems.every(i => i.is_picked || i.is_rejected);
      if (allCompleted) {
        try {
          const updatedOrderRes = await api.get(`/orders/${order.id}`);
          onNavigate("picking-complete", { ...updatedOrderRes.data, items: newItems });
        } catch (e) {
          onNavigate("picking-complete", {
            ...order,
            items: newItems,
            pickingCompletedAt: new Date().toISOString(),
            picking_completed_at: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      console.warn("Failed to call reject API, falling back to local state:", err);
    } finally {
      setSelectedRejectReason("");
      setRejectRemarks("");
      setValidationError("");
      setRejectingItem(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F3F4F6] dark:bg-gray-900 items-center justify-center">
        <Loader2 className="animate-spin text-[#00891D]" size={40} />
      </div>
    );
  }

  const completedItems = items.filter(i => i.is_picked || i.is_rejected);
  const totalCompleted = completedItems.length;
  const percentCompleted = items.length ? Math.round((totalCompleted / items.length) * 100) : 0;
  const isVerified = currentItem && barcodeInput === currentItem.barcode;

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6] dark:bg-gray-900">
      {/* Standard Partner Portal Header */}
      <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 lg:px-8 py-6 border-b border-gray-200 dark:border-gray-700">
        {/* Inline breadcrumb nav */}
        <nav className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 flex items-center gap-1 mb-3">
          <button onClick={() => onNavigate("dashboard")} className="hover:text-green-600 transition-colors">Home</button>
          <ChevronRight size={12} />
          <button onClick={() => onNavigate("picking-queue")} className="hover:text-green-600 transition-colors">Picking Queue</button>
          <ChevronRight size={12} />
          <span className="font-medium text-orange-600">Order #{order?.order_number}</span>
        </nav>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Picking Order #{order?.order_number}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-md">
                Delivery: {order?.order_type || 'STANDARD'}
              </span>
              <span className="text-xs font-semibold bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded-md">
                SLA: {order?.sla_minutes || 30} mins
              </span>
              <span className={`text-xs font-semibold border px-2 py-0.5 rounded-md ${
                (order?.priority || 'NORMAL').toUpperCase() === 'HIGH' 
                  ? 'bg-orange-50 text-orange-700 border-orange-100' 
                  : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border-gray-100 dark:border-gray-700'
              }`}>
                Priority: {order?.priority || 'NORMAL'}
              </span>
              <span className="text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-md">
                Placed: {formatOrderDateTime(order?.created_at || order?.createdAt)}
              </span>
            </div>
          </div>
          <button onClick={onBack} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 dark:bg-gray-700/50 transition-colors flex items-center gap-2 shadow-sm">
            <ArrowLeft size={16} /> Back
          </button>
        </div>

        {/* Progress bar directly below the header */}
        <div className="mt-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4 text-gray-700 dark:text-gray-300 font-semibold text-sm">
              <span>Items Picked: <span className="text-[#00891D]">{totalCompleted} / {items.length} ({percentCompleted}%)</span></span>
              <span className="text-gray-300">|</span>
              <span>Remaining Items: <span className="text-orange-600">{items.length - totalCompleted}</span></span>
            </div>
            <span className="text-[#00891D] font-extrabold text-sm">{percentCompleted}%</span>
          </div>
          <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00891D] transition-all duration-500"
              style={{ width: `${percentCompleted}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4 sm:p-6 lg:p-8">
        {/* Order Summary Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 grid grid-cols-5 gap-4 divide-x divide-gray-100">
          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-gray-400 dark:text-gray-500 text-[10px] font-semibold uppercase tracking-wider">Shopkeeper</span>
            <span className="text-gray-900 dark:text-gray-100 font-bold text-xs sm:text-sm mt-1 truncate max-w-full">
              {order?.shopkeeper_name || order?.shopkeeper?.name || "Unassigned"}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center text-center pl-4">
            <span className="text-gray-400 dark:text-gray-500 text-[10px] font-semibold uppercase tracking-wider">Started At</span>
            <span className="text-gray-900 dark:text-gray-100 font-bold text-xs sm:text-sm mt-1">
              {formatTimeOnly(order?.picking_started_at || order?.pickingStartedAt || order?.accepted_at)}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center text-center pl-4">
            <span className="text-gray-400 dark:text-gray-500 text-[10px] font-semibold uppercase tracking-wider">Last Activity</span>
            <span className="text-gray-900 dark:text-gray-100 font-bold text-xs sm:text-sm mt-1">{lastActivity}</span>
          </div>
          <div className="flex flex-col items-center justify-center text-center pl-4">
            <span className="text-gray-400 dark:text-gray-500 text-[10px] font-semibold uppercase tracking-wider">Remaining</span>
            <span className="text-gray-900 dark:text-gray-100 font-bold text-xs sm:text-sm mt-1">
              {items.filter(i => !i.is_picked && !i.is_rejected).length}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center text-center pl-4">
            <span className="text-gray-400 dark:text-gray-500 text-[10px] font-semibold uppercase tracking-wider">Elapsed Time</span>
            <span className="text-green-600 font-bold text-xs sm:text-sm mt-1">{elapsedTime}</span>
          </div>
        </div>

        {currentItem && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-green-600 px-4 py-2 flex items-center justify-between">
              <span className="text-white font-bold text-xs tracking-wider uppercase">Current Item to Pick</span>
              {barcodeInput === currentItem.barcode ? (
                <span className="bg-white dark:bg-gray-800 text-green-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">Verified</span>
              ) : (
                <span className="bg-white/20 dark:bg-gray-800/20 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Pending Verification</span>
              )}
            </div>
            <div className="p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
              {/* Product Image & Info */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-16 h-16 rounded-xl bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-gray-700 flex-shrink-0">
                  {currentItem.image_url ? (
                    <img src={currentItem.image_url} alt={currentItem.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">📦</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-gray-900 dark:text-gray-100 font-extrabold text-base truncate">{currentItem.name}</h4>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                    {currentItem.sku && (
                      <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-400 dark:text-gray-500 font-mono text-[11px]">SKU: {currentItem.sku}</span>
                    )}
                    <span className="flex items-center gap-1 font-semibold text-green-700">
                      <Package size={12} /> Qty: {currentItem.quantity}
                    </span>
                    <div className="flex items-center gap-1">
                      <MapPin size={12} className="text-gray-400 dark:text-gray-500" />
                      <LocationBadge location={currentItem.aisle_location} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Barcode Input & Status */}
              <div className="w-full lg:w-64 flex-shrink-0">
                <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Barcode Input</label>
                <div className="relative">
                  <Scan size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Scan or Enter Barcode"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    className={`w-full pl-9 pr-8 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${
                      barcodeInput === currentItem.barcode 
                        ? "border-green-500 focus:ring-green-200 bg-green-50/30" 
                        : barcodeInput 
                          ? "border-red-300 focus:ring-red-100 bg-red-50/10" 
                          : "border-gray-300 focus:ring-green-100"
                    }`}
                  />
                  {barcodeInput && (
                    <button 
                      onClick={() => setBarcodeInput("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:text-gray-500 text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => {
                    setRejectingItem(currentItem);
                    setShowRejectModal(true);
                  }}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-[#D32F2F] rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 border border-red-200"
                >
                  <XCircle size={15} /> Reject
                </button>
                <button
                  onClick={() => onNavigate("barcode-verification", { ...order, currentItem })}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 dark:bg-gray-700/50 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Scan size={15} /> Verify
                </button>
                <button
                  onClick={() => handlePick(currentItem.id)}
                  className="px-5 py-2 bg-[#00891D] hover:bg-[#006614] text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle size={15} /> Mark Picked
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-gray-900 dark:text-gray-100 font-extrabold text-sm uppercase tracking-wider">All Items</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">{items.length} items total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3 text-center">Quantity</th>
                  <th className="px-6 py-3">Picking Location</th>
                  <th className="px-6 py-3 text-right">Picking Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => {
                  const isPicked = item.is_picked;
                  const isRejected = item.is_rejected;
                  const isCurrent = item.id === currentItem?.id;

                  let statusBadge = (
                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 dark:text-gray-500 rounded-full px-2.5 py-1 text-[11px] font-semibold">Pending</span>
                  );
                  if (isPicked) {
                    statusBadge = (
                      <span className="bg-green-100 text-green-800 rounded-full px-2.5 py-1 text-[11px] font-bold">Picked</span>
                    );
                  } else if (isRejected) {
                    statusBadge = (
                      <span className="bg-red-100 text-red-800 rounded-full px-2.5 py-1 text-[11px] font-bold">Rejected</span>
                    );
                  } else if (isCurrent) {
                    statusBadge = (
                      <span className="bg-[#00891D] text-white rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm animate-pulse">Current</span>
                    );
                  }

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isCurrent 
                          ? "bg-green-50/40 hover:bg-green-50/60 font-semibold" 
                          : isPicked 
                            ? "bg-gray-50 dark:bg-gray-700/50/20 hover:bg-gray-50 dark:hover:bg-gray-700/50 dark:bg-gray-700/50/40" 
                            : isRejected 
                              ? "bg-red-50/10 hover:bg-red-50/20" 
                              : "hover:bg-gray-50 dark:hover:bg-gray-700/50 dark:bg-gray-700/50/50"
                      }`}
                    >
                      <td className="px-6 py-3.5 flex items-center gap-3">
                        <div className="w-9 h-9 rounded bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center text-lg overflow-hidden border border-gray-100 dark:border-gray-700 flex-shrink-0">
                          {item.image_url ? <img src={item.image_url} alt="" className="w-full h-full object-cover" /> : '📦'}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-bold truncate ${isPicked ? "text-gray-400 dark:text-gray-500 line-through font-medium" : "text-gray-900 dark:text-gray-100"}`}>
                            {item.name}
                          </p>
                          {isRejected && (
                            <p className="text-red-600 text-xs font-semibold mt-0.5">Reason: {item.reject_reason}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-center text-sm font-extrabold text-gray-700 dark:text-gray-300">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-3.5">
                        <LocationBadge location={item.aisle_location} />
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        {statusBadge}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showRejectModal && rejectingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-gray-900 dark:text-gray-100 font-bold text-lg mb-1">Reject Item</h2>
            <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm mb-4">
              Item: <span className="font-semibold text-gray-800 dark:text-gray-200">{rejectingItem.name}</span>
            </p>

            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">
                Select Rejection Reason <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "Out of Stock",
                  "Damaged Product",
                  "Wrong Product",
                  "Barcode Mismatch",
                  "Location Empty",
                  "Expired Product"
                ].map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      selectedRejectReason === reason
                        ? "border-[#D32F2F] bg-red-50/50"
                        : "border-gray-200 hover:border-gray-300 bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="rejectReason"
                      value={reason}
                      checked={selectedRejectReason === reason}
                      onChange={() => {
                        setSelectedRejectReason(reason);
                        setValidationError("");
                      }}
                      className="text-red-600 focus:ring-red-500 w-4 h-4"
                    />
                    <span className="text-gray-700 dark:text-gray-300 text-xs font-semibold">{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            {validationError && (
              <p className="text-red-600 text-xs font-semibold mb-3">{validationError}</p>
            )}

            <div className="mb-6">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">
                Additional Remarks (Optional)
              </label>
              <textarea
                value={rejectRemarks}
                onChange={(e) => setRejectRemarks(e.target.value)}
                placeholder="e.g. Shelf is empty"
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 min-h-[80px] resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedRejectReason("");
                  setRejectRemarks("");
                  setValidationError("");
                  setRejectingItem(null);
                }}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 dark:text-gray-300 font-semibold rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 dark:bg-gray-700/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                className="flex-1 py-2.5 bg-[#D32F2F] text-white font-semibold rounded-xl text-sm hover:bg-red-700 transition-colors"
              >
                Submit Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
