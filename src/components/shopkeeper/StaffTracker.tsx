import { useState, useEffect, useMemo } from "react";
import { Users, Search, RefreshCw, AlertCircle, ArrowLeft, Clock, Filter, Eye, UserMinus, ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
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
  const [historyPage, setHistoryPage] = useState(1);

  const { orders: sharedOrders, loading: sharedOrdersLoading } = useSharedOrders();

  const computedStaff = useMemo(() => {
    return staff.map(s => {
      // Find orders in sharedOrders assigned to this staff member
      const skOrders = sharedOrders.filter(o => {
        const assignedId = o.assigned_shopkeeper_id || o.assignedShopkeeperId || o.shopkeeper_id || o.assignedShopkeeper;
        const assignedPhone = o.shopkeeper_phone || o.assigned_shopkeeper_phone;
        return (assignedId && assignedId === s.id) || (assignedPhone && assignedPhone === s.phone);
      });

      // Find all relevant orders for display
      const displayableOrders = skOrders.filter(o => {
        const status = o.status?.toLowerCase() || '';
        const allocationStatus = o.allocationStatus || o.allocation_status;
        return ['new', 'assigned', 'accepted', 'confirmed', 'picking', 'picked', 'packing', 'packed', 'processing', 'ready', 'handed_over'].includes(status) || allocationStatus === 'HandedOver';
      });

      // True active orders (excluding HandedOver) determining Busy state
      const trueActiveOrders = displayableOrders.filter(o => {
        const allocationStatus = o.allocationStatus || o.allocation_status;
        if (allocationStatus === 'HandedOver' || (o.status && o.status.toLowerCase() === 'handed_over')) return false;
        return true;
      });

      const isBusy = trueActiveOrders.length > 0;
      let activeOrder = null;

      // Prefer true active order, don't show handed over orders in main view
      const oToDisplay = isBusy ? trueActiveOrders[0] : null;

      if (oToDisplay) {
        const o = oToDisplay;
        activeOrder = {
          orderId: o.id || o._id,
          orderNumber: o.order_number || o.orderNumber,
          fulfillmentType: o.order_type || o.deliveryType || "HOME_DELIVERY",
          status: o.allocationStatus === 'HandedOver' || o.allocation_status === 'HandedOver' ? 'handed_over' : (o.status || "Unknown"),
          pickingCompletedAt: o.picking_completed_at || null,
          trayNumber: o.tray_number || o.trayNumber || null,
          customerName: o.customer_name || o.user || o.userName || "Unknown",
          itemCount: o.item_count || o.items || 0,
          pickedCount: o.picked_count || o.picked || 0,
          slaMinutes: o.sla_minutes || 30,
          shopkeeperAcceptedAt: o.shopkeeper_accepted_at || o.shopkeeperAcceptedAt || o.acceptedByShopkeeperAt || null,
          createdAt: o.created_at || o.createdAt || null,
          updatedAt: o.updated_at || o.updatedAt || null,
          activeOrdersCount: trueActiveOrders.length
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
        const allocStatus = liveOrder.allocationStatus || liveOrder.allocation_status;
        return {
          ...do_,
          status: allocStatus === 'HandedOver' ? 'handed_over' : liveOrder.status,
          pickedCount: liveOrder.picked_count || liveOrder.picked || do_.pickedCount,
          itemCount: liveOrder.item_count || liveOrder.items || do_.itemCount,
          trayNumber: liveOrder.tray_number || liveOrder.trayNumber || do_.trayNumber
        };
      }
      return do_;
    });

    const hasActive = mergedOrders.some(o => {
      const liveOrder = sharedOrders.find(so => so.id === o.id || so.order_number === o.orderNumber || so._id === o.id);
      const allocationStatus = liveOrder?.allocationStatus || liveOrder?.allocation_status || (o as any).allocationStatus;
      if (allocationStatus === 'HandedOver') return false;

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
      <div className="w-full flex flex-col gap-4" style={{ fontFamily: "'Roboto', system-ui, sans-serif" }}>

        {/* Detail View Header */}
        <div className="flex flex-col gap-1 mb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSelectedStaffId(null); setHistoryPage(1); }}
              className="text-gray-600 hover:text-gray-900 transition-colors flex items-center justify-center p-1"
            >
              <ArrowLeft size={24} strokeWidth={2} />
            </button>
            <h2 className="text-2xl font-bold text-[#111827]">{detailedStaff.name}</h2>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-gray-500 ml-10">
            <span>Employee ID: <span className="text-gray-700 font-semibold">{detailedStaff.employeeId || "N/A"}</span></span>
            <span>Phone: <span className="text-gray-700 font-semibold">{detailedStaff.phone || "N/A"}</span></span>
          </div>
        </div>

        {/* Detailed Orders Table Container */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Container Header */}
          <div className="px-6 py-4 flex items-center justify-between bg-white border-b border-gray-100">
            <h3 className="font-bold text-gray-900 text-[15px]">
              Assigned Order History
            </h3>
            <div className="px-3 py-1 bg-[#E8F5E9] text-[#00891D] text-xs font-bold rounded-full">
              {detailedStaff.orders.length} orders
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] sm:text-xs uppercase tracking-wide text-gray-700 dark:text-gray-300 font-bold bg-[#F9FAFB]/50">
                  <th className="px-6 py-4 font-bold">ORDER ID</th>
                  <th className="px-6 py-4 font-bold">ORDER DATE & TIME</th>
                  <th className="px-6 py-4 font-bold">CUSTOMER</th>
                  <th className="px-6 py-4 font-bold">DELIVERY TYPE</th>
                  <th className="px-6 py-4 font-bold">TRAY</th>
                  <th className="px-6 py-4 font-bold">STATUS</th>
                  <th className="px-6 py-4 font-bold">ITEMS PICKED</th>
                  <th className="px-6 py-4 font-bold">LAST ACTIVITY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loadingDetails ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <RefreshCw className="animate-spin text-[#00891D] mb-3" size={24} />
                        <p className="text-gray-500 text-sm">Loading staff history...</p>
                      </div>
                    </td>
                  </tr>
                ) : detailedStaff.orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-400 text-sm">
                        No orders have been assigned to this staff member yet.
                      </div>
                    </td>
                  </tr>
                ) : (
                  (() => {
                    const limit = 10;
                    const startIndex = (historyPage - 1) * limit;
                    const paginatedOrders = detailedStaff.orders.slice(startIndex, startIndex + limit);
                    return paginatedOrders.map((order) => {
                      const statusUpper = (order.status || "").toUpperCase();

                      let statusBg = "bg-gray-100 text-gray-600";
                      if (['DELIVERED', 'OUT_FOR_DELIVERY', 'DISPATCHED', 'COMPLETED', 'ACCEPTED'].includes(statusUpper)) {
                        statusBg = "bg-[#E8F5E9] text-[#00891D]";
                      } else if (['NEW', 'PLACED', 'ASSIGNED'].includes(statusUpper)) {
                        statusBg = "bg-gray-100 text-gray-600";
                      } else if (['CANCELLED', 'REJECTED', 'FAILED'].includes(statusUpper)) {
                        statusBg = "bg-red-50 text-red-600";
                      } else if (['READY'].includes(statusUpper)) {
                        statusBg = "bg-[#FFF4ED] text-[#EF5A06]";
                      } else {
                        statusBg = "bg-blue-50 text-blue-600";
                      }

                      const displayStatus = ['NEW', 'PLACED'].includes(statusUpper) ? 'Assigned' : order.status;

                      // Parse Date
                      const orderDate = new Date(order.createdAt);
                      const dateStr = orderDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                      const timeStr = orderDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

                      // Time Since Last Activity (falling back to createdAt if no updatedAt is present)
                      const diffMin = Math.floor((Date.now() - orderDate.getTime()) / 60000);
                      let activityTimeStr = '';
                      if (diffMin <= 0) activityTimeStr = 'Just now';
                      else if (diffMin < 60) activityTimeStr = `${diffMin} min ago`;
                      else if (diffMin < 1440) activityTimeStr = `${Math.floor(diffMin / 60)} hours ago`;
                      else activityTimeStr = `${Math.floor(diffMin / 1440)} days ago`;

                      // To match the screenshot strictly, single 'hour' or 'day' should drop 's'
                      if (activityTimeStr === '1 hours ago') activityTimeStr = '1 hour ago';
                      if (activityTimeStr === '1 days ago') activityTimeStr = '1 day ago';

                      return (
                        <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="text-[13px] font-bold text-[#00891D]">#{order.orderNumber}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[13px] text-gray-600 font-medium">
                              {dateStr}, {timeStr}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[13px] font-semibold text-gray-900">
                              {order.customerName || "N/A"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[13px] text-gray-600">
                              {order.fulfillmentType === "STORE_PICKUP" ? "Self Pickup" : "Home Delivery"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[13px] text-gray-600">
                              {order.trayNumber ? `P${order.trayNumber.padStart(2, '0')}` : "-"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${statusBg}`}>
                              {displayStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[13px] font-semibold text-gray-700">
                              {order.pickedCount} / {order.itemCount}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[13px] text-gray-600">
                              {activityTimeStr}
                            </span>
                          </td>
                        </tr>
                      );
                    });
                  })()
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
            <span className="text-[13px] text-gray-500">
              Showing <span className="font-semibold text-gray-900">
                {detailedStaff.orders.length > 0 ? (historyPage - 1) * 10 + 1 : 0}
              </span> to <span className="font-semibold text-gray-900">
                {Math.min(historyPage * 10, detailedStaff.orders.length)}
              </span> of <span className="font-semibold text-gray-900">{detailedStaff.orders.length}</span> orders
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                disabled={historyPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded bg-[#00891D] text-white font-medium text-sm">
                {historyPage}
              </button>
              <button
                onClick={() => setHistoryPage(p => Math.min(Math.ceil(detailedStaff.orders.length / 10), p + 1))}
                disabled={historyPage >= Math.ceil(detailedStaff.orders.length / 10)}
                className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6" style={{ fontFamily: "'Roboto', system-ui, sans-serif" }}>
      {/* Header section with Stats */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Staff Status Tracker
          </h2>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-xs font-semibold mb-1">Total Staff</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <Users className="text-[#00891D]" size={20} />
            </div>
          </div>

          <div className="flex-1 bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-xs font-semibold mb-1">Busy</p>
              <p className="text-2xl font-bold text-gray-900">{stats.busy}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center">
              <Clock className="text-yellow-600" size={20} />
            </div>
          </div>

          <div className="flex-1 bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-xs font-semibold mb-1">Idle</p>
              <p className="text-2xl font-bold text-gray-900">{stats.idle}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
              <UserMinus className="text-orange-500" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
        <div className="flex items-center bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden h-[42px]">
          <div className="flex items-center justify-center px-4 border-r border-gray-200 text-gray-900 h-full">
            <Filter size={18} strokeWidth={2.5} />
          </div>

          <div className="relative border-r border-gray-200 h-full">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "All" | "Busy" | "Idle")}
              className="appearance-none bg-none pl-5 pr-10 py-2.5 text-sm font-bold text-gray-900 bg-transparent hover:bg-gray-50 focus:outline-none cursor-pointer border-0 h-full w-[120px]"
            >
              <option value="All">Status</option>
              <option value="Busy">Busy</option>
              <option value="Idle">Idle</option>
            </select>
            <ChevronDown size={18} strokeWidth={2.5} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-900 pointer-events-none" />
          </div>

          <button
            onClick={() => {
              setStatusFilter("All");
              fetchStaffData();
            }}
            className="flex items-center gap-2 px-5 py-2.5 text-[#EF5A06] font-medium text-sm hover:bg-orange-50 transition-colors h-full"
          >
            <RotateCcw size={16} strokeWidth={2} />
            Reset Filter
          </button>
        </div>

        <div className="relative w-[300px]">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search ...."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-full border border-gray-200 focus:outline-none focus:border-[#00891D] text-sm text-gray-700"
          />
        </div>
      </div>

      {/* Error View */}
      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Table Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] sm:text-xs uppercase tracking-wide text-gray-700 dark:text-gray-300 font-bold bg-white">
                <th className="px-3 py-3 font-bold">STAFF MEMBER</th>
                <th className="px-3 py-3 font-bold">STAFF ID / PHONE</th>
                <th className="px-3 py-3 font-bold">ACTIVE ORDERS</th>
                <th className="px-3 py-3 font-bold">CURRENT ORDER</th>
                <th className="px-3 py-3 font-bold">STATUS</th>
                <th className="px-3 py-3 font-bold">WORK TIME</th>
                <th className="px-3 py-3 font-bold">TIME REMAINING</th>
                <th className="px-3 py-3 font-bold">LAST ACTIVITY</th>
                <th className="px-3 py-3 font-bold">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading || sharedOrdersLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <RefreshCw className="animate-spin text-[#00891D] mb-3" size={24} />
                      <p className="text-gray-500 text-sm">Loading staff status data...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="text-gray-300 mb-3" size={32} />
                      <p className="text-gray-500 text-sm">No staff members found matching criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => {
                  const initials = member.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                  const isBusy = member.status === "Busy";
                  const avatarBg = isBusy ? "bg-orange-50 text-orange-600" : "bg-green-50 text-[#00891D]";
                  const statusBg = isBusy ? "bg-[#FFF4ED] text-[#EF5A06]" : "bg-[#E8F5E9] text-[#00891D]";

                  // Time Calculation logic
                  let workingLabel = '-';
                  let slaInfo = null;
                  let activityStr = '-';
                  let activityTimeStr = '';

                  if (member.activeOrder) {
                    const acceptedAt = member.activeOrder.shopkeeperAcceptedAt
                      ? new Date(member.activeOrder.shopkeeperAcceptedAt).getTime()
                      : null;
                    const elapsedMin = acceptedAt
                      ? Math.floor((Date.now() - acceptedAt) / 60000)
                      : 0;

                    if (acceptedAt) {
                      workingLabel = elapsedMin >= 60 ? `${Math.floor(elapsedMin / 60)}H ${elapsedMin % 60}M` : `${elapsedMin}M`;
                    }

                    slaInfo = getSLAInfo({
                      shopkeeper_accepted_at: member.activeOrder.shopkeeperAcceptedAt,
                      sla_minutes: member.activeOrder.slaMinutes,
                      status: member.activeOrder.status
                    });

                    if (member.activeOrder.updatedAt) {
                      const updatedTime = new Date(member.activeOrder.updatedAt).getTime();
                      const diffMin = Math.floor((Date.now() - updatedTime) / 60000);
                      activityTimeStr = diffMin <= 0 ? 'Just now' : diffMin >= 60 ? `${Math.floor(diffMin / 60)}h ${diffMin % 60}m ago` : `${diffMin}m ago`;

                      const s = member.activeOrder.status.toLowerCase();
                      if (s === 'picking') activityStr = 'Started Picking';
                      else if (s === 'packing') activityStr = 'Started Packing';
                      else if (s === 'picked') activityStr = 'Finished Picking';
                      else if (s === 'packed' || s === 'ready' || s === 'ready_for_dispatch') activityStr = 'Ready for Dispatch';
                      else if (s === 'handed_over' || s === 'handedover') activityStr = 'Handed Over';
                      else if (s === 'accepted') activityStr = 'Accepted';
                      else if (s === 'assigned') activityStr = 'Assigned';
                      else activityStr = member.activeOrder.status;
                    }
                  }

                  return (
                    <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Staff Member */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full ${avatarBg} flex items-center justify-center font-bold text-sm shrink-0`}>
                            {initials}
                          </div>
                          <div className="flex flex-col items-start gap-1">
                            <span className="font-bold text-gray-900 text-sm ">{member.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase ${statusBg}`}>
                              {member.status}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Staff ID / Phone */}
                      <td className="px-3 py-3">
                        <div className="flex flex-col">
                          <span className="text-[13px] text-gray-600">{member.employeeId || "N/A"}</span>
                          <span className="text-[13px] text-gray-400">{member.phone || "No phone"}</span>
                        </div>
                      </td>

                      {/* Active Orders */}
                      <td className="px-3 py-3">
                        <span className="text-[13px] font-medium text-gray-700">
                          {isBusy && member.activeOrder?.activeOrdersCount ? `${member.activeOrder.activeOrdersCount} Active Orders` : "-"}
                        </span>
                      </td>

                      {/* Current Order */}
                      <td className="px-3 py-3">
                        {member.activeOrder ? (
                          <div className="flex flex-col items-start gap-0.5">
                            <span className="text-[13px] font-semibold text-gray-900 ">Order #{member.activeOrder.orderNumber}</span>
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide">{member.activeOrder.fulfillmentType === "STORE_PICKUP" ? "Self Pickup" : "Home Delivery"}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3">
                        {member.activeOrder ? (
                          <span className={`whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-bold uppercase ${['DELIVERED', 'OUT_FOR_DELIVERY', 'DISPATCHED', 'delivered', 'out_for_delivery', 'dispatched'].includes(member.activeOrder.status)
                              ? "bg-green-50 text-green-600"
                              : ['PICKING', 'picking'].includes(member.activeOrder.status)
                                ? "bg-purple-50 text-purple-600"
                                : ['PACKING', 'packing'].includes(member.activeOrder.status)
                                  ? "bg-orange-50 text-orange-600"
                                  : ['READY', 'ready', 'READY_FOR_DISPATCH', 'ready_for_dispatch', 'HANDOVER', 'handover'].includes(member.activeOrder.status)
                                    ? "bg-teal-50 text-teal-600"
                                    : ['CANCELLED', 'cancelled', 'REJECTED', 'rejected'].includes(member.activeOrder.status)
                                      ? "bg-red-50 text-red-600"
                                      : ['ACCEPTED', 'accepted'].includes(member.activeOrder.status)
                                        ? "bg-[#E8F0FE] text-[#1A73E8]"
                                        : ['ASSIGNED', 'assigned', 'NEW', 'placed', 'new', 'PLACED'].includes(member.activeOrder.status)
                                          ? "bg-gray-100 text-gray-600"
                                          : "bg-blue-50 text-blue-600"
                            }`}>
                            {['new', 'placed', 'NEW', 'PLACED'].includes(member.activeOrder.status)
                              ? 'Assigned'
                              : member.activeOrder.status === 'ready' || member.activeOrder.status === 'READY'
                                ? 'Ready for Dispatch'
                                : member.activeOrder.status === 'handed_over' || member.activeOrder.status === 'HANDED_OVER'
                                  ? 'HANDED OVER'
                                  : member.activeOrder.status}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Work Time */}
                      <td className="px-3 py-3">
                        <span className="text-[13px] font-medium text-gray-700">{workingLabel}</span>
                      </td>

                      {/* Time Remaining */}
                      <td className="px-3 py-3">
                        {slaInfo ? (
                          <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide ${slaInfo.status === 'breached' ? 'text-[#D32F2F]' : slaInfo.status === 'at_risk' ? 'text-[#EF5A06]' : 'text-[#00891D]'}`}>
                            {(slaInfo.status === 'breached' || slaInfo.status === 'at_risk') && <AlertCircle size={12} />}
                            {slaInfo.displayText.replace('Time left: ', '')}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Last Activity */}
                      <td className="px-3 py-3">
                        {member.activeOrder ? (
                          <div className="flex flex-col">
                            <span className="text-[12px] text-gray-900 font-medium">{activityStr}</span>
                            <span className="text-[11px] text-gray-400">{activityTimeStr}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-3 py-3">
                        <button
                          onClick={() => setSelectedStaffId(member.id)}
                          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-3 py-3 border-t border-gray-100 bg-white">
          <span className="text-[13px] text-gray-500">
            Showing 1 to {filteredStaff.length} of {filteredStaff.length} staff
          </span>
          <div className="flex items-center gap-1">
            <button className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-50">
              <ChevronLeft size={16} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded bg-[#EF5A06] text-white font-medium text-sm">
              1
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-50">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}