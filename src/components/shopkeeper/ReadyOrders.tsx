import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Package, CheckCircle, QrCode, AlertCircle, Loader2, ChevronRight, Filter, RotateCcw, Search } from "lucide-react";
import api from "../../api/axios";
import { useSharedOrders } from "./SharedOrdersContext";
import { getSLAInfo } from "../../utils/slaHelper";

interface ReadyOrdersProps {
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

export function ReadyOrders({ onNavigate, onBack }: ReadyOrdersProps) {
  const { orders: sharedOrders, refreshOrders, loading: sharedLoading } = useSharedOrders();

  const isShopkeeper = window.location.pathname.startsWith('/shopkeeper') && !window.location.pathname.startsWith('/shopkeeper-erp');
  const storedUser = isShopkeeper ? sessionStorage.getItem("staffUser") : localStorage.getItem("partnerUser");
  const userObj = storedUser ? JSON.parse(storedUser) : null;
  const userRole = userObj?.role;
  const shouldShowShopkeeper = ["PARTNER", "STORE_MANAGER", "ADMIN"].includes(userRole);

  const [agents, setAgents] = useState<any[]>([]);
  const [, setAssigningId] = useState<string | null>(null);
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
    return sharedOrders.filter((o: any) => {
      const isReady = o.status?.toLowerCase() === 'ready';
      const isNotSelfPickup = o.order_type !== 'Self Pickup';
      const isHandedOver = o.allocationStatus === 'HandedOver' || o.allocation_status === 'HandedOver';
      return isReady && isNotSelfPickup && isHandedOver;
    });
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
        const isOverdue = getSLAInfo(o).isBreached;
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
      <div className="flex flex-col min-h-screen bg-[#F3F4F6] dark:bg-gray-900 items-center justify-center">
        <Loader2 className="animate-spin text-[#00891D]" size={40} />
      </div>
    );
  }

  // Count SLA-breached orders: elapsed from shopkeeper_accepted_at > sla_minutes
  const overdueCount = orders.filter(o => getSLAInfo(o).isBreached).length;
  const waitingForRiderCount = orders.filter(o => !o.agentId).length;

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6] dark:bg-gray-900 pb-12">
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 lg:px-8 py-6 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <nav className="text-xs text-gray-500 flex items-center gap-1 mb-2">
              <button onClick={() => onNavigate("dashboard")} className="hover:text-[#00891D] transition-colors">Home</button>
              <ChevronRight size={12} />
              <span className="font-medium text-[#00891D]">Ready for Dispatch</span>
            </nav>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Ready for Dispatch</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Orders packed, assigned, and ready for rider handover</p>
          </div>
          
          <button 
            onClick={onBack}
            className="self-start md:self-auto flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <ArrowLeft size={14} />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Ready Orders", value: orders.length, icon: Package, iconColor: "text-green-600", bgColor: "bg-green-50" },
            { label: "Waiting for Rider", value: waitingForRiderCount, icon: CheckCircle, iconColor: "text-blue-600", bgColor: "bg-blue-50" },
            { label: "SLA Alerts", value: overdueCount, icon: AlertCircle, iconColor: "text-red-600", bgColor: "bg-red-50" },
          ].map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${card.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={24} className={card.iconColor} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{card.value}</p>
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mt-0.5">{card.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters + Search Bar */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mb-6 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-wrap items-center divide-x divide-gray-200 dark:divide-gray-700">
          <div className="px-4 py-3 flex items-center justify-center flex-shrink-0">
            <Filter size={16} className="text-gray-500" />
          </div>
          
          {/* Delivery Type Filter */}
          <div className="px-4 py-3 w-[180px] relative">
            <select
              value={deliveryTypeFilter}
              onChange={(e) => setDeliveryTypeFilter(e.target.value)}
              className="w-full bg-transparent border-0 shadow-none focus:ring-0 text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 focus:outline-none cursor-pointer pr-4"
            >
              <option value="">Delivery Type: All</option>
              <option value="Home Delivery">Home Delivery</option>
              <option value="Self Pickup">Self Pickup</option>
              <option value="Quick Commerce">Quick Commerce</option>
            </select>
          </div>

          {/* SLA Status Filter */}
          <div className="px-4 py-3 w-[180px] relative">
            <select
              value={slaStatusFilter}
              onChange={(e) => setSlaStatusFilter(e.target.value)}
              className="w-full bg-transparent border-0 shadow-none focus:ring-0 text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 focus:outline-none cursor-pointer pr-4"
            >
              <option value="">SLA Status: All</option>
              <option value="ontrack">On Track</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="px-4 py-3 w-[180px] relative">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full bg-transparent border-0 shadow-none focus:ring-0 text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 focus:outline-none cursor-pointer pr-4"
            >
              <option value="">Date: All</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7">Last 7 Days</option>
            </select>
          </div>

          {/* Reset Filters */}
          {(deliveryTypeFilter || slaStatusFilter || dateFilter || searchQuery) && (
            <button
              onClick={() => {
                setDeliveryTypeFilter("");
                setSlaStatusFilter("");
                setDateFilter("");
                setSearchQuery("");
              }}
              className="px-4 py-3 text-xs font-bold text-red-650 hover:text-red-800 transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
            >
              <RotateCcw size={12} />
              Reset Filters
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 py-2.5 px-4 flex items-center gap-2 flex-shrink-0">
          <Search size={16} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search Order, Tray, Rider..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-0 text-sm font-semibold text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-0 p-0"
          />
        </div>
      </div>

      {/* Orders Table view */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-12">
        {filteredOrders.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm border border-gray-200 dark:border-gray-700">
            <CheckCircle size={48} className="text-green-600 mb-3" />
            <h3 className="text-gray-900 dark:text-gray-100 font-bold mb-1">No Orders Ready</h3>
            <p className="text-gray-500 text-sm">All packed orders have been dispatched.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse table-auto text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wider h-12">
                    <th className="px-4 py-3">Order Number</th>
                    {shouldShowShopkeeper && <th className="px-4 py-3">Shopkeeper</th>}
                    <th className="px-4 py-3">Delivery Type</th>
                    <th className="px-4 py-3">Tray</th>
                    <th className="px-4 py-3">Rider</th>
                    <th className="px-4 py-3">Ready Since</th>
                    <th className="px-4 py-3">SLA Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredOrders.map((order) => {
                    const slaInfo = getSLAInfo(order);
                    const isOverdue = slaInfo.isBreached;
                    const timeString = slaInfo.displayText;

                    return (
                      <tr key={order.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100">
                          <div>
                            <span>#{order.order_number}</span>
                          </div>
                        </td>
                        {shouldShowShopkeeper && (
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-semibold text-xs whitespace-nowrap">
                            {order.shopkeeper_name || "Unassigned"}
                          </td>
                        )}
                        <td className="px-4 py-3 text-gray-500 font-semibold text-xs whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-100 dark:border-orange-800 inline-block whitespace-nowrap">
                            {order.order_type || "Quick Commerce"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100">
                          {order.tray_number || order.tray || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
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
                              className="flex items-center gap-1 rounded-lg px-2 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            >
                              <Package size={12} className="text-gray-600 dark:text-gray-400" />
                              <span className="text-gray-600 dark:text-gray-300 font-bold text-xs">View</span>
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
                                      className="flex items-center gap-1 rounded-lg px-2 py-1.5 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400 transition-colors font-bold text-xs"
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
                                    className="flex items-center gap-1 rounded-lg px-2 py-1.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 transition-colors font-bold text-xs"
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
          </div>
        )}
      </div>

      {/* Assign Rider Modal */}
      {selectedOrderForRider && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-gray-900 dark:text-gray-100 font-bold text-lg mb-2">Assign Rider</h3>
            <p className="text-gray-500 text-xs mb-4">Select a delivery partner for Order #{selectedOrderForRider.order_number}</p>
            
            <select
              value={selectedOrderForRider.agentId || ""}
              onChange={(e) => {
                handleAssignRider(selectedOrderForRider.id, e.target.value);
                setSelectedOrderForRider(null);
              }}
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 rounded-lg p-2.5 text-sm text-gray-955 focus:border-[#00891D] focus:outline-none mb-4"
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
                className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg"
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
