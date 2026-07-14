import { useState, useEffect, useMemo } from "react";
import { Users, Search, RefreshCw, AlertCircle, ShoppingBag, CheckCircle, ArrowLeft, Calendar, Clock } from "lucide-react";
import api from "../../api/axios";
import { useSharedOrders } from "./SharedOrdersContext";
import { getSLAInfo } from "../../utils/slaHelper";

interface ActiveOrder {
  orderId: string;
  orderNumber: string;
  fulfillmentType: string;
  status: string;
  pickingCompletedAt: string | null;
  trayNumber: string | null;
  customerName: string;
  itemCount: number;
  pickedCount: number;
}

interface StaffMember {
  id: string;
  name: string;
  employeeId: string | null;
  phone: string | null;
  status: "Busy" | "Idle";
  activeOrder: ActiveOrder | null;
}

interface DetailedOrder {
  id: string;
  orderNumber: string;
  fulfillmentType: string;
  status: string;
  trayNumber: string | null;
  customerName: string;
  itemCount: number;
  pickedCount: number;
  createdAt: string;
}

interface DetailedStaff {
  id: string;
  name: string;
  employeeId: string | null;
  phone: string | null;
  status: string;
  activeOrderCount: number;
  orders: DetailedOrder[];
}

export function StaffTracker() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Busy" | "Idle">("All");

  // Detailed Modal View State
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [detailedStaff, setDetailedStaff] = useState<DetailedStaff | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const { orders: sharedOrders } = useSharedOrders();

  const computedStaff = useMemo(() => {
    return staff.map(s => {
      // Find orders in sharedOrders assigned to this staff member
      const skOrders = sharedOrders.filter(o => {
        const assignedId = o.assigned_shopkeeper_id || o.assignedShopkeeperId || o.shopkeeper_id || o.assignedShopkeeper;
        const assignedPhone = o.shopkeeper_phone || o.assigned_shopkeeper_phone;
        return (assignedId && assignedId === s.id) || (assignedPhone && assignedPhone === s.phone);
      });

      // Find the active orders
      const activeOrders = skOrders.filter(o => {
        const status = o.status?.toLowerCase() || '';
        return ['new', 'assigned', 'accepted', 'confirmed', 'picking', 'picked', 'packing', 'packed', 'processing', 'ready'].includes(status);
      });

      const isBusy = activeOrders.length > 0;
      let activeOrder = null;
      if (isBusy) {
        // Sort to find the latest created order, or just take first
        const o = activeOrders[0];
        activeOrder = {
          orderId: o.id || o._id,
          orderNumber: o.order_number || o.orderNumber,
          fulfillmentType: o.order_type || o.deliveryType || "HOME_DELIVERY",
          status: o.status || "Unknown",
          pickingCompletedAt: o.picking_completed_at || null,
          trayNumber: o.tray_number || o.trayNumber || null,
          customerName: o.customer_name || o.user || o.userName || "Unknown",
          itemCount: o.item_count || o.items || 0,
          pickedCount: o.picked_count || o.picked || 0,
          slaMinutes: o.sla_minutes || 30,
          shopkeeperAcceptedAt: o.shopkeeper_accepted_at || o.shopkeeperAcceptedAt || o.acceptedByShopkeeperAt || null,
          createdAt: o.created_at || o.createdAt || null,
          updatedAt: o.updated_at || o.updatedAt || null,
          activeOrdersCount: activeOrders.length
        };
      }
      return {
        ...s,
        status: isBusy ? "Busy" : "Idle",
        activeOrder: activeOrder
      };
    });
  }, [staff, sharedOrders]);

  const computedDetailedStaff = useMemo(() => {
    if (!detailedStaff) return null;

    const mergedOrders = detailedStaff.orders.map(do_ => {
      const liveOrder = sharedOrders.find(so => so.id === do_.id || so.order_number === do_.orderNumber || so._id === do_.id);
      if (liveOrder) {
        return {
          ...do_,
          status: liveOrder.status,
          pickedCount: liveOrder.picked_count || liveOrder.picked || do_.pickedCount,
          itemCount: liveOrder.item_count || liveOrder.items || do_.itemCount,
          trayNumber: liveOrder.tray_number || liveOrder.trayNumber || do_.trayNumber
        };
      }
      return do_;
    });

    const hasActive = mergedOrders.some(o => {
      const s = o.status?.toLowerCase() || '';
      return ['new', 'assigned', 'accepted', 'confirmed', 'picking', 'picked', 'packing', 'packed', 'processing', 'ready'].includes(s);
    });

    return {
      ...detailedStaff,
      status: hasActive ? "Busy" : "Idle",
      orders: mergedOrders
    };
  }, [detailedStaff, sharedOrders]);

  const fetchStaffData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/shopkeepers/tracker");
      setStaff(res.data);
    } catch (err: any) {
      console.error("Failed to fetch staff tracker data:", err);
      setError(err?.response?.data?.message || "Failed to load staff statuses.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffDetails = async (id: string) => {
    try {
      setLoadingDetails(true);
      const res = await api.get(`/shopkeepers/${id}`);
      setDetailedStaff(res.data);
    } catch (err) {
      console.error("Failed to fetch staff details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, []);

  useEffect(() => {
    if (selectedStaffId) {
      fetchStaffDetails(selectedStaffId);
    } else {
      setDetailedStaff(null);
    }
  }, [selectedStaffId]);

  const filteredStaff = computedStaff.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.employeeId && s.employeeId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.phone && s.phone.includes(searchQuery));

    const matchesStatus = statusFilter === "All" || s.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: computedStaff.length,
    busy: computedStaff.filter((s) => s.status === "Busy").length,
    idle: computedStaff.filter((s) => s.status === "Idle").length,
  };

  if (computedDetailedStaff) {
    const detailedStaff = computedDetailedStaff;
    return (
      <div className="w-full flex flex-col gap-6" style={{ fontFamily: "'Roboto', system-ui, sans-serif" }}>
        {/* Detail View Header */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedStaffId(null)}
              className="p-2.5 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 dark:text-gray-500 rounded-xl transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">{detailedStaff.name}</h2>
              <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm mt-0.5">
                Employee ID: {detailedStaff.employeeId || "N/A"} • Phone: {detailedStaff.phone || "N/A"}
              </p>
            </div>
          </div>
          <span className={`self-start sm:self-center px-3 py-1 rounded-full text-xs font-bold ${detailedStaff.status === "Busy"
              ? "bg-red-50 text-red-600 border border-red-100"
              : "bg-green-50 text-green-600 border border-green-100"
            }`}>
            {detailedStaff.status === "Busy" ? "Busy" : "Idle"}
          </span>
        </div>

        {/* Detailed Orders Section */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-4">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <ShoppingBag className="text-[#00891D]" size={20} />
            Assigned Order History
          </h3>

          {loadingDetails ? (
            <div className="flex items-center justify-center p-12">
              <RefreshCw className="animate-spin text-[#00891D]" size={24} />
            </div>
          ) : detailedStaff.orders.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
              No orders have been assigned to this staff member yet.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {detailedStaff.orders.map((order) => (
                <div key={order.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 dark:bg-gray-700/50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">Order #{order.orderNumber}</span>
                      <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 dark:text-gray-500 font-bold px-2 py-0.5 rounded uppercase">
                        {order.fulfillmentType === "STORE_PICKUP" ? "Self Pickup" : "Home Delivery"}
                      </span>
                      {order.trayNumber && (
                        <span className="text-[10px] bg-orange-50 text-orange-600 font-bold px-2 py-0.5 rounded border border-orange-100">
                          Tray {order.trayNumber}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">Customer: {order.customerName}</span>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-1">
                      <Calendar size={12} />
                      {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex flex-col items-start sm:items-end gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                      ['DELIVERED', 'OUT_FOR_DELIVERY', 'DISPATCHED', 'COMPLETED'].includes((order.status || "").toUpperCase())
                        ? "bg-green-50 text-green-600"
                        : ['NEW', 'PLACED', 'ASSIGNED'].includes((order.status || "").toUpperCase())
                          ? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                          : ['ACCEPTED'].includes((order.status || "").toUpperCase())
                            ? "bg-indigo-50 text-indigo-600"
                            : ['CANCELLED', 'REJECTED', 'FAILED'].includes((order.status || "").toUpperCase())
                              ? "bg-red-50 text-red-600"
                              : "bg-orange-50 text-orange-600"
                    }`}>
                      {((order.status || "").toUpperCase() === 'NEW' || (order.status || "").toUpperCase() === 'PLACED') ? 'Assigned' : order.status}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">
                      Items Picked: {order.pickedCount} / {order.itemCount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6" style={{ fontFamily: "'Roboto', system-ui, sans-serif" }}>
      {/* Header section with Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Users className="text-[#00891D]" size={24} />
            Staff Status Tracker
          </h2>
          <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm mt-1">Real-time status tracking of all shopkeeper staff members</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-700 text-center min-w-[80px]">
            <p className="text-gray-800 dark:text-gray-200 font-bold text-lg">{stats.total}</p>
            <p className="text-gray-400 dark:text-gray-500 text-[10px] font-semibold uppercase">Total Staff</p>
          </div>
          <div className="bg-red-50 px-4 py-2.5 rounded-xl border border-red-100 text-center min-w-[80px]">
            <p className="text-red-600 font-bold text-lg">{stats.busy}</p>
            <p className="text-red-500 text-[10px] font-semibold uppercase">Busy</p>
          </div>
          <div className="bg-green-50 px-4 py-2.5 rounded-xl border border-green-100 text-center min-w-[80px]">
            <p className="text-green-600 font-bold text-lg">{stats.idle}</p>
            <p className="text-green-500 text-[10px] font-semibold uppercase">Idle</p>
          </div>
          <button
            onClick={fetchStaffData}
            disabled={loading}
            className="p-3 bg-[#00891D]/10 hover:bg-[#00891D]/20 text-[#00891D] rounded-xl transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search by staff name, ID or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-150 focus:outline-none focus:border-[#00891D] text-sm text-gray-700 dark:text-gray-300"
          />
        </div>
        <div className="flex gap-2">
          {(["All", "Busy", "Idle"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${statusFilter === filter
                  ? "bg-[#00891D] text-white"
                  : "bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:bg-gray-700"
                }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Error View */}
      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Staff Grid/List - Updated to Row Layout */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm min-h-[300px]">
          <RefreshCw className="animate-spin text-[#00891D] mb-3" size={32} />
          <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm">Loading staff status data...</p>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm min-h-[300px]">
          <Users className="text-gray-300 mb-3" size={48} />
          <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm">No staff members found matching criteria.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredStaff.map((member) => (
            <div
              key={member.id}
              onClick={() => setSelectedStaffId(member.id)}
              className={`bg-white dark:bg-gray-800 rounded-2xl border transition-all p-5 shadow-sm hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer ${member.status === "Busy" ? "border-red-100 hover:border-red-200" : "border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:border-gray-700"
                }`}
            >
              {/* Staff Personal Info */}
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-gray-800 dark:text-gray-200 text-base">{member.name}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${member.status === "Busy"
                      ? "bg-red-50 text-red-600 border border-red-100"
                      : "bg-green-50 text-green-600 border border-green-100"
                    }`}>
                    {member.status}
                  </span>
                  {member.status === "Busy" && member.activeOrder && member.activeOrder.activeOrdersCount !== undefined && member.activeOrder.activeOrdersCount > 1 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 whitespace-nowrap">
                      {member.activeOrder.activeOrdersCount} Active Orders
                    </span>
                  )}
                </div>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                  ID: {member.employeeId || "N/A"} • Phone: {member.phone || "No phone"}
                </p>
              </div>

              {/* Active Order Details */}
              <div className="flex-[2] min-w-[300px]">
                {member.status === "Busy" && member.activeOrder ? (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3.5 border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between gap-4">

                    {/* Left: Order Info & Progress */}
                    <div className="flex flex-col gap-2.5 flex-1">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-gray-200">
                          <ShoppingBag size={14} className="text-[#00891D]" />
                          Order #{member.activeOrder.orderNumber}
                          <span className="text-[9px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 font-bold px-1.5 py-0.5 rounded uppercase">
                            {member.activeOrder.fulfillmentType === "STORE_PICKUP" ? "Self Pickup" : "Home Delivery"}
                          </span>
                          {member.activeOrder.trayNumber && (
                            <span className="bg-orange-50 text-orange-600 font-bold px-1.5 py-0.5 rounded text-[9px] border border-orange-100 uppercase">
                              Tray {member.activeOrder.trayNumber}
                            </span>
                          )}
                        </div>

                      </div>

                      {/* Mini Progress bar */}
                      <div className="w-full max-w-[220px] flex flex-col gap-1.5 mt-0.5 ml-6">
                        <div className="flex justify-between text-[9px] text-gray-500 dark:text-gray-400 font-bold tracking-wide">
                          <span>PROGRESS</span>
                          <span>
                            {member.activeOrder.pickedCount}/{member.activeOrder.itemCount} • {member.activeOrder.itemCount > 0 ? Math.round((member.activeOrder.pickedCount / member.activeOrder.itemCount) * 100) : 0}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#00891D] h-full rounded-full transition-all duration-500"
                            style={{ width: `${member.activeOrder.itemCount > 0 ? (member.activeOrder.pickedCount / member.activeOrder.itemCount) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right: Status, Timers & Activity */}
                    <div className="flex flex-col sm:items-end gap-2.5 flex-1 justify-center">
                      <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          ['DELIVERED', 'OUT_FOR_DELIVERY', 'DISPATCHED', 'delivered', 'out_for_delivery', 'dispatched'].includes(member.activeOrder.status)
                            ? "bg-green-50 text-green-600 border border-green-100"
                            : ['PICKING', 'picking'].includes(member.activeOrder.status)
                              ? "bg-purple-50 text-purple-600 border border-purple-100"
                              : ['PACKING', 'packing'].includes(member.activeOrder.status)
                                ? "bg-orange-50 text-orange-600 border border-orange-100"
                                : ['READY', 'ready', 'READY_FOR_DISPATCH', 'ready_for_dispatch', 'HANDOVER', 'handover'].includes(member.activeOrder.status)
                                  ? "bg-teal-50 text-teal-600 border border-teal-100"
                                  : ['CANCELLED', 'cancelled', 'REJECTED', 'rejected'].includes(member.activeOrder.status)
                                    ? "bg-red-50 text-red-600 border border-red-100"
                                    : ['ACCEPTED', 'accepted'].includes(member.activeOrder.status)
                                      ? "bg-indigo-50 text-indigo-600 border border-indigo-100"
                                      : ['ASSIGNED', 'assigned', 'NEW', 'placed', 'new', 'PLACED'].includes(member.activeOrder.status)
                                        ? "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                                        : "bg-blue-50 text-blue-600 border border-blue-100"
                          }`}>
                          {['new', 'placed', 'NEW', 'PLACED'].includes(member.activeOrder.status)
                            ? 'Assigned'
                            : member.activeOrder.status === 'ready' || member.activeOrder.status === 'READY'
                              ? 'Ready for Dispatch'
                              : member.activeOrder.status}
                        </span>

                        {(() => {
                          const acceptedAt = member.activeOrder.shopkeeperAcceptedAt
                            ? new Date(member.activeOrder.shopkeeperAcceptedAt).getTime()
                            : null;
                          const elapsedMin = acceptedAt
                            ? Math.floor((Date.now() - acceptedAt) / 60000)
                            : 0;

                          let workingLabel = 'Not started';
                          if (acceptedAt) {
                            workingLabel = elapsedMin >= 60 ? `Work: ${Math.floor(elapsedMin / 60)}h ${elapsedMin % 60}m` : `Work: ${elapsedMin}m`;
                          }

                          const slaInfo = getSLAInfo({
                            shopkeeper_accepted_at: member.activeOrder.shopkeeperAcceptedAt,
                            sla_minutes: member.activeOrder.slaMinutes,
                            status: member.activeOrder.status
                          });

                          const isUrgent = slaInfo.status === 'at_risk';
                          const slaBreached = slaInfo.status === 'breached';
                          const slaColor = slaBreached ? "#D32F2F" : isUrgent ? "#EF5A06" : "#00891D";
                          const slaBg = slaBreached ? "#FFEBEE" : isUrgent ? "#FFEBEE" : "#E8F5E9";
                          const slaBorder = slaBreached ? "#FFCDD2" : isUrgent ? "#FFCDD2" : "#C8E6C9";

                          return (
                            <>
                              <div className="flex items-center gap-1 rounded-md px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                                <span className="text-gray-600 dark:text-gray-300 font-bold text-[9px] uppercase tracking-wider">{workingLabel}</span>
                              </div>
                              <div className="flex items-center gap-1 rounded-md px-1.5 py-0.5 border" style={{ backgroundColor: slaBg, borderColor: slaBorder }}>
                                <Clock size={10} color={slaColor} />
                                <span style={{ color: slaColor, fontWeight: 700, fontSize: "9px", textTransform: 'uppercase', letterSpacing: '0.05em' }}>{slaInfo.displayText}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* Latest Activity */}
                      {(() => {
                        if (!member.activeOrder.updatedAt) return null;
                        const updatedTime = new Date(member.activeOrder.updatedAt).getTime();
                        const diffMin = Math.floor((Date.now() - updatedTime) / 60000);
                        const timeStr = diffMin <= 0 ? 'Just now' : diffMin >= 60 ? `${Math.floor(diffMin / 60)}h ${diffMin % 60}m ago` : `${diffMin}m ago`;

                        const s = member.activeOrder.status.toLowerCase();
                        let activityStr = '';
                        if (s === 'picking') activityStr = 'Started Picking';
                        else if (s === 'packing') activityStr = 'Started Packing';
                        else if (s === 'picked') activityStr = 'Finished Picking';
                        else if (s === 'packed' || s === 'ready' || s === 'ready_for_dispatch') activityStr = 'Ready for Dispatch';
                        else if (s === 'accepted') activityStr = 'Accepted';
                        else if (s === 'assigned') activityStr = 'Assigned';
                        else activityStr = member.activeOrder.status;

                        return (
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                            <span className="text-gray-400">Latest:</span> <span className="text-gray-700 dark:text-gray-300">{activityStr}</span> • {timeStr}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-xs py-2">
                    <CheckCircle size={14} className="text-green-500" />
                    <span>Idle • Ready for assignment</span>
                  </div>
                )}
              </div>

              {/* Action or indicator */}
              <div className="text-right text-xs text-gray-400 dark:text-gray-500 border-t md:border-t-0 pt-3 md:pt-0">
                <span className="bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-700 text-[#00891D] font-bold">
                  View History
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
