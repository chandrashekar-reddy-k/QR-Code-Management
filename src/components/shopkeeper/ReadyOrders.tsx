import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Package, QrCode, AlertCircle, Loader2, Filter, RotateCcw, ChevronDown, Clock } from "lucide-react";
import api from "../../api/axios";
import { useSharedOrders } from "./SharedOrdersContext";
import { ReadyOrdersMobile } from "./ReadyOrdersMobile";
import Breadcrumbs from "../common/Breadcrumbs";
import { SelectInput, SearchInput } from "../ui";

interface ReadyOrdersProps {
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

export function ReadyOrders({ onNavigate, onBack }: ReadyOrdersProps) {
  const storedUser = localStorage.getItem("user");
  const userObj = storedUser ? JSON.parse(storedUser) : null;
  const userRole = userObj?.role;

  // Staff login (SHOPKEEPER / STORE_STAFF) uses the original green mobile ready orders screen UI
  const isStaffLogin = !userRole || userRole === "SHOPKEEPER" || userRole === "STORE_STAFF";

  if (isStaffLogin) {
    return <ReadyOrdersMobile onNavigate={onNavigate} onBack={onBack} />;
  }

  const { orders: sharedOrders, refreshOrders, loading: sharedLoading } = useSharedOrders();
  const shouldShowShopkeeper = ["PARTNER", "STORE_MANAGER", "ADMIN"].includes(userRole);

  const [agents, setAgents] = useState<any[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedOrderForRider, setSelectedOrderForRider] = useState<any | null>(null);

  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState("");
  const [slaStatusFilter, setSlaStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    api.get('/delivery-agents')
      .then(res => setAgents(res.data))
      .catch(err => console.error("Failed to load riders", err));
  }, []);

  const handleAssignRider = async (orderId: string, agentId: string) => {
    if (!agentId) return;
    setAssigningId(orderId);
    try {
      await api.post(`/orders/${orderId}/assign-rider`, { agentId });
      await refreshOrders();
    } catch (err) {
      console.error("Failed to assign rider", err);
    } finally {
      setAssigningId(null);
    }
  };

  const orders = useMemo(() => {
    return sharedOrders.filter((o: any) => o.status?.toLowerCase() === 'ready' && o.order_type !== 'Self Pickup');
  }, [sharedOrders]);

  const filteredOrders = useMemo(() => {
    let result = orders;

    // 0. Search Query Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((o: any) => {
        const orderNum = (o.order_number || "").toLowerCase();
        const trayNum = (o.tray_number || o.tray || "").toLowerCase();
        const riderName = agents.find(a => a.id === o.agentId)?.name?.toLowerCase() || "";
        return orderNum.includes(q) || trayNum.includes(q) || riderName.includes(q);
      });
    }

    // 1. Delivery Type Filter
    if (deliveryTypeFilter) {
      result = result.filter((o: any) => {
        const type = (o.order_type || "").toLowerCase();
        if (deliveryTypeFilter === "Home Delivery" && type !== "home delivery") return false;
        if (deliveryTypeFilter === "Self Pickup" && type !== "self pickup") return false;
        if (deliveryTypeFilter === "Quick Commerce" && type !== "quick commerce") return false;
        return true;
      });
    }

    // 2. SLA Status Filter
    if (slaStatusFilter) {
      result = result.filter((o: any) => {
        if (!o.shopkeeper_accepted_at) {
          return slaStatusFilter !== "overdue";
        }
        const elapsed = (Date.now() - new Date(o.shopkeeper_accepted_at).getTime()) / 60000;
        const isOverdue = elapsed > o.sla_minutes;
        if (slaStatusFilter === "overdue" && !isOverdue) return false;
        if (slaStatusFilter === "ontrack" && isOverdue) return false;
        return true;
      });
    }

    // 3. Date Filter
    if (dateFilter) {
      result = result.filter((o: any) => {
        const orderDateStr = o.createdAt || o.created_at;
        if (!orderDateStr) return false;
        const orderDate = new Date(orderDateStr);
        const orderDateStart = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate()).getTime();

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        if (dateFilter === "today") {
          return orderDateStart === todayStart;
        } else if (dateFilter === "yesterday") {
          const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
          return orderDateStart === yesterdayStart;
        } else if (dateFilter === "last7") {
          const sevenDaysAgoStart = todayStart - 7 * 24 * 60 * 60 * 1000;
          return orderDateStart >= sevenDaysAgoStart && orderDateStart <= todayStart;
        }
        return true;
      });
    }

    return result;
  }, [orders, deliveryTypeFilter, slaStatusFilter, dateFilter, searchQuery, agents]);

  if (sharedLoading && orders.length === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F3F4F6] items-center justify-center">
        <Loader2 className="animate-spin text-[#00891D]" size={40} />
      </div>
    );
  }

  // Count SLA-breached orders: elapsed from shopkeeper_accepted_at > sla_minutes
  const overdueCount = orders.filter(o => {
    if (!o.shopkeeper_accepted_at) return false;
    const elapsed = (Date.now() - new Date(o.shopkeeper_accepted_at).getTime()) / 60000;
    return elapsed > o.sla_minutes;
  }).length;
  const waitingForRiderCount = orders.filter(o => !o.agentId).length;

  return (
    <div className="min-h-screen bg-[#F3F4F6] p-[32px] pb-10 flex flex-col">
      {/* Breadcrumbs */}
      <div className="mb-6">
        <Breadcrumbs />
      </div>

      {/* Page Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-[32px] font-bold text-[#111827] leading-none mb-2">Ready for Dispatch</h1>
          <p className="text-[14px] text-[#9EA3AE]">Orders packed, assigned, and ready for rider handover</p>
        </div>
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          {
            label: "Ready Orders",
            value: orders.length,
            icon: <Package size={20} className="text-green-600" />,
            bg: "bg-green-50 dark:bg-green-950/30",
            text: "text-gray-900 dark:text-white",
          },
          {
            label: "Waiting for Rider",
            value: waitingForRiderCount,
            icon: <Clock size={20} className="text-blue-600" />,
            bg: "bg-blue-50 dark:bg-blue-950/30",
            text: "text-gray-900 dark:text-white",
          },
          {
            label: "SLA Alerts",
            value: overdueCount,
            icon: <AlertCircle size={20} className="text-orange-600" />,
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
              <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">{card.label}</p>
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

          {/* Delivery Type Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 w-[150px] sm:w-[160px] relative flex-shrink-0">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={deliveryTypeFilter}
                onChange={(e) => setDeliveryTypeFilter(e.target.value)}
                options={[
                  { value: "", label: "Delivery Type: All" },
                  { value: "Home Delivery", label: "Home Delivery" },
                  { value: "Self Pickup", label: "Self Pickup" },
                  { value: "Quick Commerce", label: "Quick Commerce" },
                ]}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
            />
          </div>

          {/* SLA Status Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 w-[150px] sm:w-[160px] relative flex-shrink-0">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={slaStatusFilter}
                onChange={(e) => setSlaStatusFilter(e.target.value)}
                options={[
                  { value: "", label: "SLA Status: All" },
                  { value: "ontrack", label: "On Track" },
                  { value: "overdue", label: "Overdue" },
                ]}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
            />
          </div>

          {/* Date Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 w-[140px] sm:w-[150px] relative flex-shrink-0">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                options={[
                  { value: "", label: "Date" },
                  { value: "today", label: "Today" },
                  { value: "yesterday", label: "Yesterday" },
                  { value: "last7", label: "Last 7 Days" },
                ]}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400"
            />
          </div>

          {/* Reset button */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-shrink-0 flex items-center !border-l-0">
            <div className="hidden sm:block h-6 w-[1px] bg-gray-300 dark:bg-gray-600 mr-4"></div>
            <button
              onClick={() => {
                setDeliveryTypeFilter("");
                setSlaStatusFilter("");
                setDateFilter("");
                setSearchQuery("");
              }}
              className="flex items-center gap-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap hover:opacity-80 text-orange-600 dark:text-orange-400 w-full sm:w-auto justify-center"
            >
              <RotateCcw
                size={14}
                className="sm:w-4 sm:h-4 text-orange-600 dark:text-orange-400"
              />
              <span>Reset Filter</span>
            </button>
          </div>
        </div>

        {/* Search beside filters */}
        <div className="w-full lg:w-auto lg:min-w-[200px] lg:flex-shrink-0">
          <SearchInput
            placeholder="Search Order, Tray, Rider..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Orders Table - Desktop style */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-6">
        {filteredOrders.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <Package size={48} className="text-gray-300 mb-4" />
            <p className="text-lg font-semibold text-gray-500">No orders ready for dispatch</p>
          </div>
        ) : (
          <div className="w-full overflow-x-hidden">
            <table className="w-full border-collapse table-auto text-[14px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 h-[56px] whitespace-nowrap">
                  <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order Number</th>
                  {shouldShowShopkeeper && <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Shopkeeper</th>}
                  <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Delivery Type</th>
                  <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tray</th>
                  <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rider</th>
                  <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ready Since</th>
                  <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">SLA Status</th>
                  <th style={{ width: "200px", minWidth: "200px" }} className="text-center px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredOrders.map((order) => {
                  const { isOverdue, timeString } = (() => {
                    const formatDuration = (totalMinutes: number) => {
                      const mins = Math.round(Math.abs(totalMinutes));
                      if (mins < 1) return '<1m';
                      if (mins < 60) return `${mins}m`;
                      if (mins < 1440) {
                        const h = Math.floor(mins / 60);
                        const m = mins % 60;
                        return m > 0 ? `${h}h ${m}m` : `${h}h`;
                      }
                      const d = Math.floor(mins / 1440);
                      const h = Math.floor((mins % 1440) / 60);
                      return h > 0 ? `${d}d ${h}h` : `${d}d`;
                    };
                    if (!order.shopkeeper_accepted_at) {
                      return { isOverdue: false, timeString: `${formatDuration(order.sla_minutes)} Remaining` };
                    }
                    const elapsed = (Date.now() - new Date(order.shopkeeper_accepted_at).getTime()) / 60000;
                    const diff = order.sla_minutes - elapsed;
                    if (diff < 0) {
                      return { isOverdue: true, timeString: `Overdue • ${formatDuration(diff)}` };
                    } else {
                      return { isOverdue: false, timeString: `${formatDuration(diff)} Remaining` };
                    }
                  })();

                  return (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-gray-900">
                        <div>
                          <span>#{order.order_number}</span>
                        </div>
                      </td>
                      {shouldShowShopkeeper && (
                        <td className="px-4 py-3 text-gray-700 font-semibold text-xs whitespace-nowrap">
                          {order.shopkeeper_name || "Unassigned"}
                        </td>
                      )}
                      <td className="px-4 py-3 text-gray-500 font-semibold text-xs whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-100 inline-block whitespace-nowrap">
                          {order.order_type || "Quick Commerce"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">
                        {order.tray_number || order.tray || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-700 whitespace-nowrap">
                        {(() => {
                          const rider = agents.find(a => a.id === order.agentId);
                          return rider ? (
                            <span title={`Phone: ${rider.phone}`} className="cursor-help border-b border-dotted border-gray-400">
                              {rider.name}
                            </span>
                          ) : (
                            <span className="text-gray-400 font-normal">Not Assigned</span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {(() => {
                          const readyAt = order.packing_completed_at || order.packedAt || order.packingCompletedAt || order.updated_at || order.updatedAt;
                          if (!readyAt) return <span className="text-gray-400">—</span>;
                          const mins = Math.round((Date.now() - new Date(readyAt).getTime()) / 60000);
                          if (mins < 1) return <span className="font-semibold text-gray-600">Just now</span>;
                          if (mins < 60) return <span className="font-semibold text-gray-600">{mins} min ago</span>;
                          const h = Math.floor(mins / 60);
                          const m = mins % 60;
                          if (h < 24) return <span className="font-semibold text-orange-600">{h}h {m > 0 ? `${m}m` : ''} ago</span>;
                          const d = Math.floor(h / 24);
                          const rh = h % 24;
                          return <span className="font-semibold text-red-600">{d}d {rh > 0 ? `${rh}h` : ''} ago</span>;
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1 text-red-650 text-xs font-bold bg-red-50 px-2 py-0.5 rounded-full border border-red-100 whitespace-nowrap">
                            <AlertCircle size={12} />
                            {timeString}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-2 py-0.5 rounded-full border border-green-100 whitespace-nowrap">
                            {timeString}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onNavigate("order-details", order)}
                            className="flex items-center gap-1 rounded-lg px-2 py-1.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors"
                          >
                            <Package size={12} className="text-gray-600" />
                            <span className="text-gray-600 font-bold text-xs">View</span>
                          </button>

                          {(() => {
                            const isHandedOver = order.status?.toLowerCase() === 'dispatched' || order.status?.toLowerCase() === 'completed';
                            if (isHandedOver) return null;

                            const hasRider = !!order.agentId;
                            if (hasRider) {
                              return (
                                <>
                                  <button
                                    onClick={() => setSelectedOrderForRider(order)}
                                    className="flex items-center gap-1 rounded-lg px-2 py-1.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 transition-colors font-bold text-xs"
                                  >
                                    Change Rider
                                  </button>
                                  <button
                                    onClick={() => {
                                      const agent = agents.find(a => a.id === order.agentId);
                                      onNavigate("handover-verification", {
                                        ...order,
                                        riderName: agent ? agent.name : "N/A"
                                      });
                                    }}
                                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 bg-[#00891D] hover:bg-[#006614] transition-colors text-white font-bold text-xs shadow-sm"
                                  >
                                    <QrCode size={12} color="white" />
                                    <span>Handover</span>
                                  </button>
                                </>
                              );
                            } else {
                              return (
                                <button
                                  onClick={() => setSelectedOrderForRider(order)}
                                  className="flex items-center gap-1 rounded-lg px-2 py-1.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 transition-colors font-bold text-xs"
                                >
                                  Assign Rider
                                </button>
                              );
                            }
                          })()}
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

      {/* Assign Rider Modal */}
      {selectedOrderForRider && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-gray-900 font-bold text-lg mb-2">Assign Rider</h3>
            <p className="text-gray-500 text-xs mb-4">Select a delivery partner for Order #{selectedOrderForRider.order_number}</p>

            <select
              value={selectedOrderForRider.agentId || ""}
              onChange={(e) => {
                handleAssignRider(selectedOrderForRider.id, e.target.value);
                setSelectedOrderForRider(null);
              }}
              className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm text-gray-955 focus:border-[#00891D] focus:outline-none mb-4"
            >
              <option value="">Select Rider...</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.phone})
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelectedOrderForRider(null)}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
