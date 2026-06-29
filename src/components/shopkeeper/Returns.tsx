import { useState, useEffect } from "react";
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, Clock, CreditCard, Loader2, Package } from "lucide-react";
import api from "../../api/axios";

interface ReturnsProps {
  onBack: () => void;
}

type ReturnStatus = "pending" | "approved" | "rejected";

// Maps reason strings (from DB) to display metadata
function getReasonMeta(reason: string) {
  const lower = (reason || "").toLowerCase();
  if (lower.includes("damage"))  return { icon: "💔", label: reason };
  if (lower.includes("wrong") || lower.includes("incorrect")) return { icon: "❌", label: reason };
  if (lower.includes("expir"))   return { icon: "⏰", label: reason };
  if (lower.includes("missing")) return { icon: "📦", label: reason };
  if (lower.includes("quality")) return { icon: "⚠️", label: reason };
  return { icon: "↩️", label: reason };
}

function formatDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function Returns({ onBack }: ReturnsProps) {
  const [returnRequests, setReturnRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"all" | ReturnStatus>("all");

  const fetchReturns = () => {
    setLoading(true);
    api.get('/returns').then(res => {
      setReturnRequests(res.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const approve = async (id: number) => {
    try {
      await api.put(`/returns/${id}/approve`);
      fetchReturns();
    } catch (err) {
      console.error(err);
    }
  };

  const reject = async (id: number) => {
    try {
      await api.put(`/returns/${id}/reject`);
      fetchReturns();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F5F7FA] items-center justify-center">
        <Loader2 className="animate-spin text-[#EF5A06]" size={40} />
      </div>
    );
  }

  const filtered = returnRequests.filter(r =>
    activeFilter === "all" ? true : r.status === activeFilter
  );

  const counts = {
    pending:  returnRequests.filter(r => r.status === "pending").length,
    approved: returnRequests.filter(r => r.status === "approved").length,
    rejected: returnRequests.filter(r => r.status === "rejected").length,
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F7FA]">
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #EF5A06 0%, #C84100 100%)" }} className="px-4 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowLeft size={20} color="white" />
          </button>
          <div className="flex-1">
            <h1 className="text-white" style={{ fontWeight: 700, fontSize: "18px" }}>Returns Management</h1>
            <p className="text-white/70" style={{ fontSize: "12px" }}>
              {counts.pending > 0 ? `${counts.pending} pending review` : "No pending returns"}
            </p>
          </div>
          {counts.pending > 0 && (
            <div className="bg-white rounded-full px-2.5 py-1">
              <span className="text-[#EF5A06]" style={{ fontWeight: 700, fontSize: "12px" }}>{counts.pending}</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[
            { label: "Pending",  value: counts.pending  },
            { label: "Approved", value: counts.approved },
            { label: "Rejected", value: counts.rejected },
          ].map(s => (
            <div key={s.label} className="bg-white/10 rounded-xl p-2 text-center">
              <p style={{ color: "white", fontWeight: 700, fontSize: "18px" }}>{s.value}</p>
              <p className="text-white/70" style={{ fontSize: "10px" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Pills */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["all", "pending", "approved", "rejected"] as const).map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="rounded-full px-3 py-1.5 whitespace-nowrap flex-shrink-0"
              style={{
                backgroundColor: activeFilter === f ? "#EF5A06" : "white",
                color: activeFilter === f ? "white" : "#757575",
                fontWeight: activeFilter === f ? 600 : 400,
                fontSize: "12px",
                border: "1px solid",
                borderColor: activeFilter === f ? "#EF5A06" : "#E0E0E0",
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}{f !== "all" && ` (${counts[f as ReturnStatus]})`}
            </button>
          ))}
        </div>
      </div>

      {/* Return Cards */}
      <div className="flex flex-col gap-3 p-4">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col items-center gap-3">
            <span style={{ fontSize: "40px" }}>✅</span>
            <p className="text-gray-500" style={{ fontSize: "14px", fontWeight: 500 }}>
              No {activeFilter === "all" ? "" : activeFilter} returns found
            </p>
          </div>
        ) : (
          filtered.map((ret) => {
            const status = ret.status as ReturnStatus;
            const reasonMeta = getReasonMeta(ret.reason);
            const items: any[] = ret.items || [];
            const firstItem = items[0];

            // Status badge config
            const statusConfig = {
              approved: { bg: "#00891D1A", color: "#00891D", icon: <CheckCircle size={12} color="#00891D" />, label: "Return Approved" },
              rejected: { bg: "#EF5A061A", color: "#EF5A06", icon: <XCircle size={12} color="#EF5A06" />, label: "Return Rejected" },
              pending:  { bg: "#FFF8E1",   color: "#F57F17", icon: <AlertTriangle size={12} color="#F57F17" />, label: "Pending Review" },
            }[status] ?? { bg: "#F5F5F5", color: "#757575", icon: null, label: status };

            return (
              <div key={ret.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Status banner */}
                <div className="px-4 py-1.5 flex items-center gap-1.5" style={{ backgroundColor: statusConfig.bg }}>
                  {statusConfig.icon}
                  <span style={{ color: statusConfig.color, fontWeight: 600, fontSize: "11px" }}>
                    {statusConfig.label}
                  </span>
                  <span className="ml-auto text-gray-400" style={{ fontSize: "10px" }}>
                    {formatDate(ret.created_at)}
                  </span>
                </div>

                <div className="p-4">
                  {/* Order & Customer */}
                  <div className="flex items-start gap-3 mb-3">
                    {/* Product image from first item or fallback icon */}
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-100">
                      {firstItem?.image_url ? (
                        <img src={firstItem.image_url} alt={firstItem.name} className="w-full h-full object-contain p-1" />
                      ) : (
                        <Package size={28} color="#9E9E9E" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 mb-0.5" style={{ fontWeight: 700, fontSize: "14px" }}>
                        Order #{ret.order_number}
                      </p>
                      <p className="text-gray-500" style={{ fontSize: "11px" }}>
                        {ret.order_type} · {ret.payment_method}
                      </p>
                      <p className="text-gray-400" style={{ fontSize: "11px" }}>
                        Customer: {ret.customer_name}
                      </p>
                      {ret.customer_phone && (
                        <p className="text-gray-400" style={{ fontSize: "11px" }}>{ret.customer_phone}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p style={{ color: "#EF5A06", fontWeight: 700, fontSize: "14px" }}>
                        ₹{Number(ret.refund_amount).toFixed(2)}
                      </p>
                      <p className="text-gray-400" style={{ fontSize: "10px" }}>Refund</p>
                    </div>
                  </div>

                  {/* Items list */}
                  {items.length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-2.5 mb-3">
                      <p className="text-gray-500 mb-2" style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        {items.length} Item{items.length > 1 ? "s" : ""}
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="w-full h-full object-contain p-0.5" />
                              ) : (
                                <Package size={14} color="#9E9E9E" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p style={{ fontSize: "11px", fontWeight: 500, color: "#212121" }}>{item.name}</p>
                              <p style={{ fontSize: "10px", color: "#757575" }}>
                                Qty: {item.quantity} · ₹{Number(item.price).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reason */}
                  <div className="flex items-center gap-2 rounded-xl p-2.5 mb-3" style={{ backgroundColor: "#FFF3E0" }}>
                    <span style={{ fontSize: "16px" }}>{reasonMeta.icon}</span>
                    <div>
                      <p style={{ color: "#EF5A06", fontWeight: 600, fontSize: "12px" }}>Return Reason</p>
                      <p style={{ color: "#EF5A06", fontSize: "11px", opacity: 0.8 }}>{reasonMeta.label}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1 text-gray-400">
                      <Clock size={10} />
                      <span style={{ fontSize: "10px" }}>{formatDate(ret.updated_at || ret.created_at)}</span>
                    </div>
                  </div>

                  {/* Payment info */}
                  <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-2 mb-3">
                    <CreditCard size={12} color="#9E9E9E" />
                    <span className="text-gray-500" style={{ fontSize: "11px" }}>
                      Order Total: ₹{Number(ret.total_value || 0).toFixed(2)} · {ret.payment_method}
                    </span>
                  </div>

                  {/* Action buttons — only for pending */}
                  {status === "pending" && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => reject(ret.id)}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 border border-[#EF5A06]/30 bg-[#EF5A06]/10"
                      >
                        <XCircle size={15} color="#EF5A06" />
                        <span style={{ color: "#EF5A06", fontWeight: 600, fontSize: "13px" }}>Reject</span>
                      </button>
                      <button
                        onClick={() => approve(ret.id)}
                        className="flex-[2] flex items-center justify-center gap-2 rounded-xl py-3"
                        style={{ backgroundColor: "#00891D" }}
                      >
                        <CheckCircle size={15} color="white" />
                        <span className="text-white" style={{ fontWeight: 600, fontSize: "13px" }}>Approve Return</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
