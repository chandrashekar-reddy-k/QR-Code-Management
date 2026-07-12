import React, { useState, useEffect, useRef, useMemo } from "react";
import { ArrowLeft, QrCode, CheckCircle, Package, Loader2, ShoppingBag, AlertCircle, Timer, Filter, RotateCcw, ChevronDown, Eye } from "lucide-react";
import { SelectInput, SearchInput } from "../ui";
import api from "../../api/axios";

interface SelfPickupProps {
  onBack: () => void;
  onNavigate?: (screen: string, data?: any) => void;
}

const GREEN = "#00891D";
const ORANGE = "#EF5A06";

export function SelfPickup({ onBack, onNavigate }: SelfPickupProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifiedIds, setVerifiedIds] = useState<string[]>([]);
  const [activeOrder, setActiveOrder] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [counterFilter, setCounterFilter] = useState("");
  const [dateRangeType, setDateRangeType] = useState("");
  const [customDate, setCustomDate] = useState("");
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setCounterFilter("");
    setDateRangeType("");
    setCustomDate("");
  };

  const fetchOrders = () => {
    api.get('/orders?status=ready').then(res => {
      setOrders(res.data.filter((o: any) => o.order_type === 'Self Pickup'));
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  useEffect(() => { fetchOrders(); }, []);


  const handleCollect = async (id: string) => {
    try {
      await api.put(`/orders/${id}/status`, { status: 'dispatched' });
      setOrders(prev => prev.filter(o => o.id !== id));
      setVerifiedIds(prev => prev.filter(vid => vid !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o =>
        (o.order_number && o.order_number.toLowerCase().includes(q)) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
        (o.user && o.user.toLowerCase().includes(q))
      );
    }

    if (statusFilter) {
      result = result.filter(o => {
        if (statusFilter === "awaiting") return !verifiedIds.includes(o.id);
        if (statusFilter === "verified") return verifiedIds.includes(o.id);
        if (statusFilter === "overdue") return (o.elapsed_minutes ?? 0) > 15;
        return true;
      });
    }

    if (counterFilter) {
      result = result.filter(o => {
        const counterAssigned = `C0${(parseInt(o.order_number.slice(-1)) % 3) + 1}`;
        return counterAssigned === counterFilter;
      });
    }

    if (dateRangeType) {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      result = result.filter(o => {
        const dateStr = o.created_at || o.createdAt;
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
  }, [orders, searchQuery, statusFilter, counterFilter, dateRangeType, customDate, verifiedIds]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F3F4F6] dark:bg-gray-900 items-center justify-center">
        <Loader2 size={40} style={{ color: ORANGE }} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-gray-900 p-[32px] pb-10 flex flex-col">
      {/* Breadcrumbs */}
      <nav className="text-xs text-gray-500 flex items-center gap-1 mb-6">
        <button onClick={onBack} className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Home</button>
        <span className="mx-1">&gt;</span>
        <span className="font-medium text-orange-600 dark:text-orange-500">Self Pickup</span>
      </nav>

      {/* Page Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-[32px] font-bold text-[#111827] dark:text-gray-100 leading-none mb-2">Self Pickup</h1>
          <p className="text-[14px] text-[#9EA3AE] dark:text-gray-400">{orders.length} orders awaiting customer pickup</p>
        </div>
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Awaiting Pickup",
            value: orders.filter(o => !verifiedIds.includes(o.id)).length,
            icon: <ShoppingBag size={20} className="text-blue-600" />,
            bg: "bg-blue-50 dark:bg-blue-950/30",
            text: "text-gray-900 dark:text-white",
          },
          {
            label: "Ready for Pickup",
            value: verifiedIds.length,
            icon: <CheckCircle size={20} className="text-green-600" />,
            bg: "bg-green-50 dark:bg-green-950/30",
            text: "text-gray-900 dark:text-white",
          },
          {
            label: "Overdue",
            value: orders.filter(o => (o.elapsed_minutes ?? 0) > 15).length,
            icon: <AlertCircle size={20} className="text-red-600" />,
            bg: "bg-red-50 dark:bg-red-950/30",
            text: "text-gray-900 dark:text-white",
          },
          {
            label: "Avg Wait Time",
            value: orders.length
              ? `${Math.round(orders.reduce((sum, o) => sum + (o.elapsed_minutes ?? 0), 0) / orders.length)}m`
              : "—",
            icon: <Timer size={20} className="text-orange-600" />,
            bg: "bg-orange-50 dark:bg-orange-950/30",
            text: "text-gray-900 dark:text-white",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm flex items-center gap-4"
          >
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
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-stretch divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full sm:w-auto overflow-x-auto">
          {/* Filter icon */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700 dark:text-gray-300" />
          </div>

          {/* Pickup Status Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 w-[185px] sm:w-[195px] relative flex-shrink-0">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-8 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: "", label: "Pickup Status: All" },
                  { value: "awaiting", label: "Awaiting QR Scan" },
                  { value: "verified", label: "QR Verified" },
                  { value: "overdue", label: "Overdue (>15m)" },
                ]}
              />
            </div>
            <ChevronDown size={16} className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400" />
          </div>

          {/* Counter Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 w-[150px] sm:w-[160px] relative flex-shrink-0">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={counterFilter}
                onChange={(e) => setCounterFilter(e.target.value)}
                options={[
                  { value: "", label: "Counter" },
                  { value: "C01", label: "C01" },
                  { value: "C02", label: "C02" },
                  { value: "C03", label: "C03" },
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

      {filteredOrders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-4">
          <CheckCircle size={64} color={GREEN} className="mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">All Caught Up!</h2>
          <p className="text-gray-500 dark:text-gray-400 text-center">No self pickup orders waiting.</p>
        </div>
      ) : (
        <>
          {/* Orders Table - Desktop style */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-6">
            <div className="w-full overflow-x-hidden">
              <table className="w-full border-collapse table-auto text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 h-10">
                    <th className="px-4 py-2 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Order Number</th>
                    <th className="px-4 py-2 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Customer</th>
                    <th className="px-4 py-2 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs text-center">Counter</th>
                    <th className="px-4 py-2 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Ready Since</th>
                    <th className="px-4 py-2 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Waiting Time</th>
                    <th className="px-4 py-2 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs text-center">SLA Status</th>
                    <th className="px-4 py-2 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 dark:divide-gray-700">
                  {filteredOrders.map((order) => {
                    const elapsed = order.elapsed_minutes || 0;
                    const isOverdue = elapsed > 15;
                    const isActive = activeOrder === order.id;
                    const isVerified = verifiedIds.includes(order.id);
                    const counterAssigned = `C0${(parseInt(order.order_number.slice(-1)) % 3) + 1}`;

                    return (
                      <React.Fragment key={order.id}>
                        <tr
                          className={`group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors h-12 ${isActive && !isVerified ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''}`}
                        >
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span className="font-bold text-gray-900 dark:text-gray-100">{order.order_number}</span>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-400">
                                {order.customer_name?.charAt(0) || "C"}
                              </div>
                              <span className="font-medium text-gray-900 dark:text-gray-100">{order.customer_name || order.user}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-center whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-xs border border-gray-200 dark:border-gray-700">
                              {counterAssigned}
                            </span>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {order.ready_at ? new Date(order.ready_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                            {elapsed} mins
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
                                onClick={() => onNavigate && onNavigate("order-details", order)}
                                className="flex items-center gap-1 text-[11px] font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors px-2.5 py-1 rounded-lg shadow-sm whitespace-nowrap"
                              >
                                <Eye size={12} />
                                <span>View</span>
                              </button>
                              
                              {!isVerified ? (
                                <button
                                  onClick={() => setActiveOrder(isActive ? null : order.id)}
                                  className="flex items-center gap-1 text-[11px] font-bold text-white bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors px-2.5 py-1 rounded-lg shadow-sm whitespace-nowrap"
                                >
                                  <QrCode size={12} />
                                  <span>{isActive ? "Cancel" : "Verify"}</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleCollect(order.id)}
                                  className="flex items-center gap-1 text-[11px] font-bold text-white bg-[#00891D] hover:bg-[#007018] transition-colors px-2.5 py-1 rounded-lg shadow-sm whitespace-nowrap"
                                >
                                  <Package size={12} />
                                  <span>Complete Pickup</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isActive && !isVerified && (
                          <tr>
                            <td colSpan={7} className="px-0 py-0 border-b border-gray-200 dark:border-gray-700">
                              <div className="bg-[#1a1a1a] p-6 flex flex-col items-center justify-center">
                                <div className="relative w-32 h-32 flex items-center justify-center mb-2">
                                  <QrCode size={80} color="white" strokeWidth={1} />
                                  <div className="absolute inset-0 border-2 rounded-xl animate-pulse" style={{ borderColor: ORANGE }} />
                                </div>
                                <p className="text-white/70 text-center" style={{ fontSize: "11px" }}>Scan customer's pickup QR code</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Counter Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mt-6">
            <h3 className="text-[#111827] dark:text-gray-100 mb-4 font-bold text-[16px]">Counter Overview</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse table-auto text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 h-10">
                    <th className="px-4 py-2 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Counter</th>
                    <th className="px-4 py-2 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Assigned Staff</th>
                    <th className="px-4 py-2 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Status</th>
                    <th className="px-4 py-2 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Active Orders</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 dark:divide-gray-700">
                  {(() => {
                    const counters = ["C01", "C02", "C03"];
                    return counters.map((counter) => {
                      const activeOrders = orders.filter(o => o.counter === counter && o.status === "ready");
                      const isActive = activeOrders.length > 0;
                      return (
                        <tr key={counter} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 h-12">
                          <td className="px-4 py-2 font-bold text-gray-900 dark:text-gray-100">{counter}</td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-400 font-semibold">—</td>
                          <td className="px-4 py-2">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                isActive
                                  ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800"
                                  : "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                              }`}
                            >
                              {isActive ? "Active" : "Available"}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-400 font-semibold">
                            {activeOrders.length}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
