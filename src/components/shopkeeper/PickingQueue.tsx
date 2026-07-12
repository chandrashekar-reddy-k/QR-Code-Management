import { PickingQueueMobile } from "./PickingQueueMobile";
import { useState, useMemo, useRef } from "react";
import { ArrowLeft, Package, Play, CheckCircle2, ChevronRight, ShoppingBag, Filter, RotateCcw, ChevronDown, Eye } from "lucide-react";
import { useSharedOrders } from "./SharedOrdersContext";
import Breadcrumbs from "../common/Breadcrumbs";
import { SelectInput, SearchInput } from "../ui";

function formatSlaDuration(minutes: number, isBreached: boolean): string {
  const absMin = Math.abs(minutes);
  let durationStr = "";

  if (absMin < 60) {
    durationStr = `${absMin}m`;
  } else {
    const hours = Math.floor(absMin / 60);
    const mins = absMin % 60;
    if (hours < 24) {
      durationStr = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      durationStr = remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
      if (isBreached) {
        return `Overdue by ${durationStr}`;
      }
    }
  }

  return isBreached ? `${durationStr} overdue` : `${durationStr} remaining`;
}

interface PickingQueueProps {
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
  isAdmin?: boolean;
}

function PriorityBadge({ priority }: { priority: string }) {
  const config = {
    HIGH: { bg: "#FFEBEE", color: "#D32F2F" },
    MEDIUM: { bg: "#FFF3E0", color: "#EF5A06" },
    LOW: { bg: "#E8F5E9", color: "#00891D" },
  }[priority] || { bg: "#F5F5F5", color: "#757575" };

  return (
    <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold inline-block text-center" style={{ backgroundColor: config.bg, color: config.color }}>
      {priority}
    </span>
  );
}

export function PickingQueue({ onNavigate, onBack, isAdmin = false }: PickingQueueProps) {
  if (!isAdmin) {
    return <PickingQueueMobile onNavigate={onNavigate} onBack={onBack} />;
  }
  const { orders: sharedOrders } = useSharedOrders();

  const storedUser = localStorage.getItem("user");
  const userObj = storedUser ? JSON.parse(storedUser) : null;
  const userRole = userObj?.role;


  const [searchQuery, setSearchQuery] = useState("");
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState("");
  const [pickingStatusFilter, setPickingStatusFilter] = useState("All");
  const [dateRangeType, setDateRangeType] = useState("");
  const [customDate, setCustomDate] = useState("");
  const dateInputRef = useRef<HTMLInputElement>(null);

  const dateOptions = useMemo(() => {
    return [
      { value: "", label: "Date" },
      { value: "today", label: "Today" },
      { value: "yesterday", label: "Yesterday" },
      { value: "last7", label: "Last 7 Days" },
      { value: "week", label: "This Week" },
      { value: "month", label: "This Month" },
      { value: "custom", label: customDate ? `Custom: ${customDate}` : "Custom Range" },
    ];
  }, [customDate]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setDeliveryTypeFilter("");
    setPickingStatusFilter("All");
    setDateRangeType("");
    setCustomDate("");
  };

  const pickingOrders = useMemo(() => {
    const filtered = sharedOrders.filter((o: any) => {
      const s = o.status?.toLowerCase();
      return s === 'accepted' || s === 'picking' || s === 'confirmed';
    });
    return filtered.map((o: any) => ({
      ...o,
      items: o.item_count || 0,
      picked: o.picked_count || 0
    }));
  }, [sharedOrders]);

  const stats = {
    pending: pickingOrders.filter(o => o.picked === 0).length,
    inProgress: pickingOrders.filter(o => o.picked > 0 && o.picked < o.items).length,
    completed: pickingOrders.filter(o => o.picked === o.items).length
  };

  const totalItems = pickingOrders.reduce((sum, o) => sum + (o.items || 0), 0);

  // Filtered picking orders for desktop
  const filteredOrders = useMemo(() => {
    let result = [...pickingOrders];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(o =>
        String(o.order_number || "").toLowerCase().includes(q) ||
        String(o.customer_name || "").toLowerCase().includes(q)
      );
    }

    if (deliveryTypeFilter) {
      result = result.filter(o => {
        const type = (o.order_type || o.deliveryType || "").toLowerCase();
        if (deliveryTypeFilter.toLowerCase() === "home delivery") {
          return type.includes("home") || type.includes("quick") || type.includes("e-commerce") || type.includes("whatsapp") || type.includes("call");
        } else if (deliveryTypeFilter.toLowerCase() === "self pickup") {
          return type.includes("pickup") || type.includes("self") || type.includes("store");
        }
        return type === deliveryTypeFilter.toLowerCase();
      });
    }

    if (pickingStatusFilter !== "All") {
      result = result.filter(o => {
        const isCompleted = o.picked === o.items;
        const isInProgress = o.picked > 0 && !isCompleted;
        const isPending = o.picked === 0;
        if (pickingStatusFilter === "Pending") return isPending;
        if (pickingStatusFilter === "In Progress") return isInProgress;
        if (pickingStatusFilter === "Completed") return isCompleted;
        return true;
      });
    }

    if (dateRangeType) {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      result = result.filter(o => {
        const dateStr = o.created_at || o.createdAt;
        if (!dateStr) return false;
        const orderTime = new Date(dateStr).getTime();
        const orderDateStart = new Date(new Date(dateStr).getFullYear(), new Date(dateStr).getMonth(), new Date(dateStr).getDate()).getTime();

        if (dateRangeType === "today") {
          return orderDateStart === todayStart;
        } else if (dateRangeType === "yesterday") {
          const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
          return orderDateStart === yesterdayStart;
        } else if (dateRangeType === "last7") {
          const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000;
          return orderTime >= sevenDaysAgo;
        } else if (dateRangeType === "week") {
          const dayOfWeek = now.getDay();
          const weekStart = todayStart - dayOfWeek * 24 * 60 * 60 * 1000;
          return orderTime >= weekStart;
        } else if (dateRangeType === "month") {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
          return orderTime >= monthStart;
        } else if (dateRangeType === "custom") {
          if (customDate) {
            const selectedCustomStart = new Date(customDate);
            const customStartTime = new Date(selectedCustomStart.getFullYear(), selectedCustomStart.getMonth(), selectedCustomStart.getDate()).getTime();
            return orderDateStart === customStartTime;
          }
          return true;
        }
        return true;
      });
    }

    return result;
  }, [pickingOrders, searchQuery, deliveryTypeFilter, pickingStatusFilter, dateRangeType, customDate]);

  // ─── Mobile / Staff View  // ─── Desktop / Admin View
  // ─── Desktop / Partner Portal View ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-gray-900 p-[32px] pb-10">
      {/* Breadcrumbs */}
      <div className="mb-6">
        <Breadcrumbs />
      </div>

      {/* Page Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-[32px] font-bold text-[#111827] dark:text-gray-100 leading-none mb-2">Picking Queue</h1>
          <p className="text-[14px] text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500">Orders assigned for picking</p>
        </div>
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:text-gray-100 transition-colors">
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Total Orders",
            value: pickingOrders.length,
            icon: <ShoppingBag size={20} className="text-blue-600" />,
            bg: "bg-blue-50 dark:bg-blue-950/30",
            text: "text-gray-900 dark:text-white",
          },
          {
            label: "Total Items",
            value: totalItems,
            icon: <Package size={20} className="text-purple-600" />,
            bg: "bg-purple-50 dark:bg-purple-950/30",
            text: "text-gray-900 dark:text-white",
          },
          {
            label: "In Progress",
            value: stats.inProgress,
            icon: <Play size={20} className="text-orange-600" />,
            bg: "bg-orange-50 dark:bg-orange-950/30",
            text: "text-gray-900 dark:text-white",
          },
          {
            label: "Completed",
            value: stats.completed,
            icon: <CheckCircle2 size={20} className="text-green-600" />,
            bg: "bg-green-550/10 dark:bg-green-950/30",
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
              <p className="text-[12px] font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="mb-6 flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch divide-y sm:divide-y-0 sm:divide-x divide-gray-200 dark:divide-gray-700 w-full sm:w-auto overflow-x-auto">
          {/* Filter Icon */}
          <div className="px-4 py-3 flex items-center justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500" />
          </div>

          {/* Delivery Type Dropdown */}
          <div className="px-4 py-3 w-[190px] relative flex-shrink-0">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-8 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={deliveryTypeFilter}
                onChange={(e) => setDeliveryTypeFilter(e.target.value)}
                options={[
                  { value: "", label: "Delivery Type: All" },
                  { value: "Home Delivery", label: "Home Delivery" },
                  { value: "Self Pickup", label: "Self Pickup" },
                ]}
              />
            </div>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500" />
          </div>

          {/* Picking Status Dropdown */}
          <div className="px-4 py-3 w-[160px] relative flex-shrink-0">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:text-gray-100 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={pickingStatusFilter}
                onChange={(e) => setPickingStatusFilter(e.target.value)}
                options={[
                  { value: "All", label: "Picking Status" },
                  { value: "Pending", label: "Pending" },
                  { value: "In Progress", label: "In Progress" },
                  { value: "Completed", label: "Completed" },
                ]}
              />
            </div>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500" />
          </div>

          {/* Date Picker Input / Quick-Select */}
          <div className="px-4 py-3 w-[160px] relative flex-shrink-0">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:text-gray-100 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={dateRangeType}
                onChange={(e) => {
                  const val = e.target.value;
                  setDateRangeType(val);
                  if (val === "custom") {
                    setTimeout(() => {
                      try {
                        dateInputRef.current?.showPicker();
                      } catch (err) {
                        dateInputRef.current?.focus();
                        dateInputRef.current?.click();
                      }
                    }, 50);
                  } else {
                    setCustomDate("");
                  }
                }}
                options={dateOptions}
              />
            </div>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500" />
            <input
              type="date"
              ref={dateInputRef}
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
            />
          </div>

          {/* Reset Action */}
          {(searchQuery || deliveryTypeFilter || pickingStatusFilter !== "All" || dateRangeType || customDate) && (
            <button
              onClick={handleResetFilters}
              className="px-4 py-3 flex items-center justify-center gap-2 text-sm font-bold text-red-600 hover:text-red-700 transition-colors"
            >
              <RotateCcw size={15} />
              Reset Filters
            </button>
          )}
        </div>

        {/* Search Field */}
        <div className="w-full xl:w-[320px] flex-shrink-0">
          <SearchInput
            placeholder="Search by Order # or Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <Package size={48} className="text-gray-300 mb-4" />
            <p className="text-lg font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">No matching orders found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <div className="w-full overflow-x-hidden">
            <table className="w-full border-collapse table-auto text-[14px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 h-[56px] whitespace-nowrap">
                  <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[15%]">Order Number</th>
                  <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[15%]">Delivery Type</th>
                  <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[15%]">Assigned Shopkeeper</th>
                  <th className="text-center px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[10%]">Total Items</th>
                  <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[20%]">Pick Progress</th>
                  <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[15%]">SLA Status</th>
                  <th style={{ width: "220px", minWidth: "220px" }} className="text-center px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredOrders.map((order) => {
                  const progress = (order.picked / order.items) * 100;
                  const isCompleted = order.picked === order.items;
                  const isInProgress = order.picked > 0 && !isCompleted;
                  const isUrgent = order.sla_minutes <= 10;

                  const acceptedAt = order.shopkeeper_accepted_at
                    ? new Date(order.shopkeeper_accepted_at).getTime()
                    : null;
                  const elapsedMin = acceptedAt
                    ? Math.floor((Date.now() - acceptedAt) / 60000)
                    : 0;
                  const remainingMin = order.sla_minutes - elapsedMin;
                  const slaBreached = acceptedAt !== null && remainingMin < 0;

                  // Determine SLA status text and badge styles
                  let slaStatusText = "";
                  let slaBadgeClass = "";
                  if (acceptedAt === null) {
                    slaStatusText = formatSlaDuration(order.sla_minutes, false);
                    slaBadgeClass = "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800";
                  } else if (slaBreached) {
                    slaStatusText = formatSlaDuration(remainingMin, true);
                    slaBadgeClass = "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800";
                  } else if (isUrgent || remainingMin <= 10) {
                    slaStatusText = formatSlaDuration(remainingMin, false);
                    slaBadgeClass = "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800";
                  } else {
                    slaStatusText = formatSlaDuration(remainingMin, false);
                    slaBadgeClass = "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800";
                  }

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 dark:bg-gray-700/50 dark:hover:bg-gray-700/50 dark:bg-gray-700/50 dark:hover:bg-gray-750 transition-colors h-[64px]"
                    >
                      <td className="px-4 py-4 font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {order.order_number}
                      </td>
                      <td className="px-4 py-4 text-gray-600 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 whitespace-nowrap font-semibold">
                        {order.order_type || "Home Delivery"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {order.shopkeeper_name ? (
                          <span className="text-gray-700 dark:text-gray-300 font-semibold">{order.shopkeeper_name}</span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-gray-900 dark:text-gray-100 whitespace-nowrap text-center font-bold">
                        {order.items}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <span className="text-[13px] font-bold text-gray-800 dark:text-gray-200 w-10 flex-shrink-0">
                            {order.picked}/{order.items}
                          </span>
                          <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden min-w-[60px]">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${progress}%`,
                                backgroundColor: isCompleted ? "#00891D" : "#EF5A06",
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${slaBadgeClass}`}>
                          {slaStatusText}
                        </span>
                      </td>
                      <td style={{ width: "220px", minWidth: "220px" }} className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2 flex-nowrap whitespace-nowrap">
                          <button
                            onClick={() => onNavigate("order-details", order)}
                            className="flex items-center gap-1 text-xs font-bold text-gray-600 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:hover:text-gray-200 transition-colors px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 dark:bg-gray-700/50 dark:hover:bg-gray-700/50 dark:bg-gray-700/50 dark:hover:bg-gray-700"
                            title="View Details"
                          >
                            <Eye size={14} />
                            <span>View</span>
                          </button>
                          {isCompleted ? (
                            <button
                              onClick={() => onNavigate("packing-queue")}
                              className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#00891D] hover:bg-[#006614] transition-colors px-3 py-1.5 rounded-lg shadow-sm"
                            >
                              <span>Pack</span>
                              <ChevronRight size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={() => onNavigate("picking-screen", order)}
                              className={`flex items-center gap-1.5 text-xs font-bold text-white transition-colors px-3 py-1.5 rounded-lg shadow-sm ${isInProgress
                                ? "bg-[#EF5A06] hover:bg-[#D44F05]"
                                : "bg-[#00891D] hover:bg-[#006614]"
                                }`}
                            >
                              <Play size={12} fill="white" />
                              <span>{isInProgress ? "Resume" : "Start"}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
