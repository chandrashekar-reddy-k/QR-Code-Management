import { useState, useEffect } from "react";
import { ArrowLeft, MapPin, CheckCircle, Scan, Package, Loader2, XCircle } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRejectReason, setSelectedRejectReason] = useState<string>("");
  const [rejectRemarks, setRejectRemarks] = useState<string>("");
  const [rejectingItem, setRejectingItem] = useState<any>(null);
  const [validationError, setValidationError] = useState<string>("");

  useEffect(() => {
    if (!order?.id) return;
    api.get(`/orders/${order.id}`).then(async res => {
      setItems(res.data.items || []);

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
      // Local state update immediately
      const newItems = items.map(item =>
        item.id === itemId ? { ...item, is_picked: true, picked_qty: item.quantity } : item
      );
      setItems(newItems);

      const allCompleted = newItems.every(i => i.is_picked || i.is_rejected);
      if (allCompleted) {
        setTimeout(async () => {
          try {
            const updatedOrderRes = await api.get(`/orders/${order.id}`);
            onNavigate("picking-complete", { ...updatedOrderRes.data, items: newItems });
          } catch (e) {
            // fallback
            onNavigate("picking-complete", { ...order, items: newItems, picking_completed_at: new Date().toISOString() });
          }
        }, 300);
      }

      await api.put(`/orders/${order.id}/items/${itemId}/pick`);
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
      // Local state update immediately
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

      const allCompleted = newItems.every(i => i.is_picked || i.is_rejected);
      if (allCompleted) {
        setTimeout(async () => {
          try {
            const updatedOrderRes = await api.get(`/orders/${order.id}`);
            onNavigate("picking-complete", { ...updatedOrderRes.data, items: newItems });
          } catch (e) {
            onNavigate("picking-complete", { ...order, items: newItems, picking_completed_at: new Date().toISOString() });
          }
        }, 300);
      }

      // API integration call
      await api.put(`/orders/${order.id}/items/${rejectingItem.id}/reject`, {
        reason: selectedRejectReason,
        remarks: rejectRemarks
      });
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
      <div className="flex flex-col min-h-screen bg-[#F5F7FA] items-center justify-center">
        <Loader2 className="animate-spin text-[#00891D]" size={40} />
      </div>
    );
  }

  const completedItems = items.filter(i => i.is_picked || i.is_rejected);
  const totalCompleted = completedItems.length;
  const currentIdx = items.findIndex(item => !item.is_picked && !item.is_rejected);
  const currentItem = currentIdx >= 0 ? items[currentIdx] : null;
  const percentCompleted = items.length ? Math.round((totalCompleted / items.length) * 100) : 0;

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F7FA]">
      <div style={{ background: "linear-gradient(135deg, #00891D 0%, #006614 100%)" }} className="px-4 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowLeft size={20} color="white" />
          </button>
          <div className="flex-1">
            <h1 className="text-white" style={{ fontWeight: 700, fontSize: "18px" }}>Picking — #{order?.order_number}</h1>
            <p className="text-white/70" style={{ fontSize: "12px" }}>{order?.order_type} · SLA: {order?.sla_minutes}m</p>
          </div>
        </div>

        <div className="bg-white/10 rounded-2xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white" style={{ fontWeight: 600, fontSize: "14px" }}>Processed: {totalCompleted} / {items.length}</span>
            <span className="text-white/70" style={{ fontSize: "12px" }}>{percentCompleted}%</span>
          </div>
          <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${percentCompleted}%`, backgroundColor: "#4CAF50" }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {currentItem && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border-2 border-green-300">
            <div className="bg-green-600 px-4 py-2 flex items-center gap-2">
              <span className="text-white" style={{ fontWeight: 600, fontSize: "12px" }}>CURRENT ITEM — Pick this next</span>
            </div>
            <div className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center overflow-hidden">
                  {currentItem.image_url ? (
                    <img src={currentItem.image_url} alt={currentItem.name} className="w-full h-full object-cover" />
                  ) : (
                    <span style={{ fontSize: "40px" }}>📦</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-gray-900 mb-1" style={{ fontWeight: 700, fontSize: "16px" }}>{currentItem.name}</p>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Package size={13} color="#00891D" />
                    <span className="text-green-700" style={{ fontWeight: 600, fontSize: "13px" }}>Qty: {currentItem.quantity}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin size={13} color="#9E9E9E" />
                    <LocationBadge location={currentItem.aisle_location} />
                  </div>
                </div>
              </div>

              <div className="mt-3 bg-gray-50 rounded-xl p-2.5 flex items-center justify-between">
                <span className="text-gray-400" style={{ fontSize: "11px", fontFamily: "monospace" }}>Barcode: {currentItem.barcode}</span>

              </div>

              <div className="flex gap-2.5 mt-3">
                <button
                  onClick={() => onNavigate("barcode-verification", { ...order, currentItem })}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-3 border-2 border-green-200 hover:bg-green-50 transition-colors"
                >
                  <Scan size={15} color="#00891D" />
                  <span style={{ color: "#00891D", fontWeight: 600, fontSize: "13px" }}>Verify</span>
                </button>
                <button
                  onClick={() => {
                    setRejectingItem(currentItem);
                    setShowRejectModal(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-3 bg-[#D32F2F] hover:bg-red-700 transition-colors"
                >
                  <XCircle size={15} color="white" />
                  <span className="text-white" style={{ fontWeight: 600, fontSize: "13px" }}>Reject</span>
                </button>
                <button
                  onClick={() => handlePick(currentItem.id)}
                  className="flex-[1.5] flex items-center justify-center gap-1.5 rounded-xl py-3 bg-[#00891D] hover:bg-[#006614] transition-colors"
                >
                  <CheckCircle size={15} color="white" />
                  <span className="text-white" style={{ fontWeight: 600, fontSize: "13px" }}>
                    Mark Picked
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="text-gray-700 mb-3" style={{ fontWeight: 600, fontSize: "13px" }}>All Items</h3>
          <div className="flex flex-col gap-2">
            {items.map((item) => {
              const isPicked = item.is_picked;
              const isRejected = item.is_rejected;
              const isCurrent = item.id === currentItem?.id;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-xl border border-gray-100"
                  style={{
                    backgroundColor: isRejected
                      ? "#FFEBEE"
                      : isPicked
                      ? "#E8F5E9"
                      : isCurrent
                      ? "#EDE7F6"
                      : "#FFFFFF"
                  }}
                >
                  <div className="w-10 h-10 rounded bg-white flex items-center justify-center text-xl overflow-hidden shadow-sm">
                    {item.image_url ? <img src={item.image_url} alt="" /> : '📦'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p
                        style={{
                          fontWeight: 600,
                          fontSize: "14px",
                          color: isRejected
                            ? "#C62828"
                            : isPicked
                            ? "#2E7D32"
                            : "#212121"
                        }}
                      >
                        {item.name}
                      </p>
                    </div>
                    <p style={{ fontSize: "13px", color: "#757575", fontWeight: 500, marginTop: "2px" }}>
                      Qty: {item.quantity} · Location: <span style={{ color: "#D32F2F", fontWeight: 700 }}>{item.aisle_location}</span>
                    </p>
                    {isRejected && (
                      <p style={{ fontSize: "12px", color: "#C62828", fontWeight: 600, marginTop: "4px" }}>
                        Rejected: {item.reject_reason}
                      </p>
                    )}
                  </div>
                  {isPicked ? (
                    <span style={{ color: "#2E7D32", fontWeight: 800, fontSize: "18px" }}>✓</span>
                  ) : isRejected ? (
                    <span style={{ color: "#C62828", fontWeight: 800, fontSize: "16px" }}>✕</span>
                  ) : isCurrent ? (
                    <span className="bg-[#673AB7] text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                      Current
                    </span>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showRejectModal && rejectingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-gray-900 font-bold text-lg mb-1">Reject Item</h2>
            <p className="text-gray-500 text-sm mb-4">
              Item: <span className="font-semibold text-gray-800">{rejectingItem.name}</span>
            </p>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-semibold mb-2">
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
                    <span className="text-gray-700 text-xs font-semibold">{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            {validationError && (
              <p className="text-red-600 text-xs font-semibold mb-3">{validationError}</p>
            )}

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-semibold mb-2">
                Additional Remarks (Optional)
              </label>
              <textarea
                value={rejectRemarks}
                onChange={(e) => setRejectRemarks(e.target.value)}
                placeholder="e.g. Shelf is empty"
                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 min-h-[80px] resize-none"
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
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50 transition-colors"
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
