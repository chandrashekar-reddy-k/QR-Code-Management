import { useState, useEffect, useRef, useMemo } from "react";
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, Clock, CreditCard, Loader2, Package, Timer, Filter, RotateCcw, ChevronDown, Eye } from "lucide-react";
import Breadcrumbs from "../common/Breadcrumbs";
import { SelectInput, SearchInput } from "../ui";
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

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [dateRangeType, setDateRangeType] = useState("");
  const [customDate, setCustomDate] = useState("");
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setReasonFilter("");
    setDateRangeType("");
    setCustomDate("");
  };

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



  const filtered = useMemo(() => {
    let result = [...returnRequests];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        (r.order_number && r.order_number.toLowerCase().includes(q)) ||
        (r.customer_name && r.customer_name.toLowerCase().includes(q)) ||
        (r.customer_phone && r.customer_phone.toLowerCase().includes(q))
      );
    }

    if (statusFilter) {
      result = result.filter(r => r.status === statusFilter);
    }

    if (reasonFilter) {
      result = result.filter(r => {
        return (r.reason || "").toLowerCase().includes(reasonFilter.toLowerCase());
      });
    }

    if (dateRangeType) {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      result = result.filter(r => {
        const dateStr = r.created_at;
        if (!dateStr) return false;
        const orderDateStart = new Date(new Date(dateStr).getFullYear(), new Date(dateStr).getMonth(), new Date(dateStr).getDate()).getTime();

        if (dateRangeType === "today") {
          return orderDateStart === todayStart;
        } else if (dateRangeType === "yesterday") {
          const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
          return orderDateStart === yesterdayStart;
        } else if (dateRangeType === "last7") {
          const sevenDaysAgoStart = todayStart - 7 * 24 * 60 * 60 * 1000;
          return orderDateStart >= sevenDaysAgoStart && orderDateStart <= todayStart;
        } else if (dateRangeType === "week") {
          const dayOfWeek = now.getDay();
          const weekStart = todayStart - dayOfWeek * 24 * 60 * 60 * 1000;
          return orderDateStart >= weekStart;
        } else if (dateRangeType === "month") {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
          return orderDateStart >= monthStart;
        } else if (dateRangeType === "custom") {
          if (customDate) {
            const customStartTime = new Date(new Date(customDate).getFullYear(), new Date(customDate).getMonth(), new Date(customDate).getDate()).getTime();
            return orderDateStart === customStartTime;
          }
        }
        return true;
      });
    }

    return result;
  }, [returnRequests, searchQuery, statusFilter, reasonFilter, dateRangeType, customDate]);

  const counts = {
    pending:  returnRequests.filter(r => r.status === "pending").length,
    approved: returnRequests.filter(r => r.status === "approved").length,
    rejected: returnRequests.filter(r => r.status === "rejected").length,
  };

  const resolvedReturns = returnRequests.filter(r => r.status !== "pending" && r.created_at && r.updated_at);
  const avgResolutionMs = resolvedReturns.length 
    ? resolvedReturns.reduce((sum, r) => sum + (new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()), 0) / resolvedReturns.length
    : 0;
  const avgMinutes = Math.round(avgResolutionMs / (1000 * 60));
  const avgDisplay = resolvedReturns.length 
    ? (avgMinutes > 60 ? `${Math.floor(avgMinutes/60)}h ${avgMinutes%60}m` : `${avgMinutes}m`) 
    : "—";

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F3F4F6] dark:bg-gray-900 items-center justify-center">
        <Loader2 className="animate-spin text-[#EF5A06]" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-gray-900 p-[32px] pb-10 flex flex-col">
      {/* Breadcrumbs */}
      <div className="mb-6">
        <Breadcrumbs items={[
          { label: "Home", href: "/shopkeeper" },
          { label: "Returns" },
        ]} />
      </div>

      {/* Page Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-[32px] font-bold text-[#111827] dark:text-gray-100 leading-none mb-2">Returns Management</h1>
          <p className="text-[14px] text-[#9EA3AE] dark:text-gray-400">
            {counts.pending > 0 ? `${counts.pending} pending review` : "No pending returns"}
          </p>
        </div>
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Pending Returns",  value: counts.pending,  icon: <AlertTriangle size={20} className="text-orange-600" />, bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-gray-900 dark:text-white" },
          { label: "Approved Returns", value: counts.approved, icon: <CheckCircle size={20} className="text-green-600" />, bg: "bg-green-50 dark:bg-green-950/30", text: "text-gray-900 dark:text-white" },
          { label: "Rejected Returns", value: counts.rejected, icon: <XCircle size={20} className="text-red-600" />, bg: "bg-red-50 dark:bg-red-950/30", text: "text-gray-900 dark:text-white" },
          { label: "Avg Resolution", value: avgDisplay, icon: <Timer size={20} className="text-blue-600" />, bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-gray-900 dark:text-white" },
        ].map(card => (
          <div key={card.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${card.bg}`}>
              {card.icon}
            </div>
            <div>
              <p className={`text-2xl font-black leading-none mb-0.5 ${card.text}`}>{card.value}</p>
              <p className="text-[12px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-stretch divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full sm:w-auto overflow-x-auto">
          {/* Filter icon */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700 dark:text-gray-300" />
          </div>

          {/* Status Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 w-[185px] sm:w-[195px] relative flex-shrink-0">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-8 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: "", label: "Return Status: All" },
                  { value: "pending", label: "Pending Review" },
                  { value: "approved", label: "Approved" },
                  { value: "rejected", label: "Rejected" },
                ]}
              />
            </div>
            <ChevronDown size={16} className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400" />
          </div>

          {/* Reason Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 w-[185px] sm:w-[195px] relative flex-shrink-0">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-8 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={reasonFilter}
                onChange={(e) => setReasonFilter(e.target.value)}
                options={[
                  { value: "", label: "Reason: All" },
                  { value: "damage", label: "Damaged" },
                  { value: "wrong", label: "Wrong Item" },
                  { value: "expir", label: "Expired" },
                  { value: "missing", label: "Missing Item" },
                  { value: "quality", label: "Quality Issue" },
                ]}
              />
            </div>
            <ChevronDown size={16} className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400" />
          </div>

          {/* Date Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 w-[140px] sm:w-[150px] relative flex-shrink-0">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={dateRangeType}
                onChange={(e) => {
                  const val = e.target.value;
                  setDateRangeType(val);
                  if (val === "custom") {
                    setTimeout(() => { try { dateInputRef.current?.showPicker(); } catch { dateInputRef.current?.focus(); } }, 50);
                  } else {
                    setCustomDate("");
                  }
                }}
                options={[
                  { value: "", label: "Date" },
                  { value: "today", label: "Today" },
                  { value: "yesterday", label: "Yesterday" },
                  { value: "last7", label: "Last 7 Days" },
                  { value: "week", label: "This Week" },
                  { value: "month", label: "This Month" },
                  { value: "custom", label: customDate ? new Date(customDate).toLocaleDateString('en-GB').replace(/\//g, '-') : "Custom Range" },
                ]}
              />
            </div>
            <ChevronDown size={16} className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400" />
            <input ref={dateInputRef} type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="absolute inset-0 opacity-0 pointer-events-none w-full h-full" />
          </div>

          {/* Reset button */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-shrink-0 flex items-center !border-l-0">
            <div className="hidden sm:block h-6 w-[1px] bg-gray-300 dark:bg-gray-600 mr-4"></div>
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap hover:opacity-80 text-orange-600 dark:text-orange-400 w-full sm:w-auto justify-center"
            >
              <RotateCcw size={14} className="sm:w-4 sm:h-4 text-orange-600 dark:text-orange-400" />
              <span>Reset Filter</span>
            </button>
          </div>
        </div>

        {/* Search beside filters */}
        <div className="w-full lg:w-auto lg:min-w-[200px] lg:flex-shrink-0">
          <SearchInput
            placeholder="Search order or customer"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Returns Table */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-4">
          <CheckCircle size={64} className="text-green-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">All Caught Up!</h2>
          <p className="text-gray-500 dark:text-gray-400 text-center">No returns found matching filters.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-6">
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse table-auto text-left text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 h-10">
                  <th className="px-4 py-2 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Return ID</th>
                  <th className="px-4 py-2 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Order Number</th>
                  <th className="px-4 py-2 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Customer</th>
                  <th className="px-4 py-2 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Reason</th>
                  <th className="px-4 py-2 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Requested At</th>
                  <th className="px-4 py-2 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs text-center">Status</th>
                  <th className="px-4 py-2 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs text-center">SLA Status</th>
                  <th className="px-4 py-2 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-gray-700">
                {filtered.map((ret) => {
                  const status = ret.status as ReturnStatus;
                  const reasonMeta = getReasonMeta(ret.reason);
                  
                  // SLA calculation
                  const elapsedMs = new Date().getTime() - new Date(ret.created_at).getTime();
                  const isOverdue = status === "pending" && elapsedMs > 24 * 60 * 60 * 1000;

                  // Status badge config
                  const statusConfig = {
                    approved: { bg: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800", label: "Approved" },
                    rejected: { bg: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800", label: "Rejected" },
                    pending:  { bg: "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800", label: "Pending" },
                  }[status] ?? { bg: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700", label: status };

                  return (
                    <tr key={ret.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors h-14">
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className="font-bold text-gray-900 dark:text-gray-100">#RET-{ret.id}</span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{ret.order_number}</span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-400 flex-shrink-0">
                            {ret.customer_name?.charAt(0) || "C"}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{ret.customer_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{reasonMeta.icon}</span>
                          <span className="text-gray-700 dark:text-gray-300">{reasonMeta.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(ret.created_at)}
                      </td>
                      <td className="px-4 py-2 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusConfig.bg}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            isOverdue
                              ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                              : "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                          }`}
                        >
                          {isOverdue ? "Overdue" : "On Time"}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="flex items-center gap-1 text-[11px] font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors px-2.5 py-1.5 rounded-lg shadow-sm whitespace-nowrap"
                          >
                            <Eye size={12} />
                            <span>View</span>
                          </button>
                          {status === "pending" ? (
                            <>
                              <button
                                onClick={() => reject(ret.id)}
                                className="flex items-center gap-1 text-[11px] font-bold text-[#EF5A06] bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors px-2.5 py-1.5 rounded-lg shadow-sm whitespace-nowrap"
                              >
                                <XCircle size={12} />
                                <span>Reject</span>
                              </button>
                              <button
                                onClick={() => approve(ret.id)}
                                className="flex items-center gap-1 text-[11px] font-bold text-white bg-[#00891D] hover:bg-[#007018] transition-colors px-2.5 py-1.5 rounded-lg shadow-sm whitespace-nowrap"
                              >
                                <CheckCircle size={12} />
                                <span>Approve</span>
                              </button>
                            </>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 text-[11px] font-medium ml-1">Processed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
