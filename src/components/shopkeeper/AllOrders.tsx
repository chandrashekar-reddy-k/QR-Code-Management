import { useState, useMemo, useRef, useEffect } from "react";
import { ArrowLeft, ShoppingBag, Filter, RotateCcw, ChevronDown } from "lucide-react";
import Breadcrumbs from "../common/Breadcrumbs";
import { SelectInput, SearchInput, ViewIconButton, Pagination } from "../ui";

interface AllOrdersProps {
  onBack: () => void;
  onNavigate?: (screen: string, data?: any) => void;
  initialStatus?: string;
  isAdmin?: boolean;
}

const getLatestActivityTime = (order: any): number => {
  const fields = [
    order.dispatchedAt, order.dispatched_at,
    order.deliveredAt, order.delivered_at,
    order.readyAt, order.ready_at,
    order.packedAt, order.packed_at,
    order.pickedAt, order.picked_at,
    order.updatedAt, order.updated_at,
    order.createdAt, order.created_at
  ];
  let latest = 0;
  for (const val of fields) {
    if (val) {
      const ms = new Date(val).getTime();
      if (!isNaN(ms) && ms > latest) {
        latest = ms;
      }
    }
  }
  return latest;
};

const tabMap: Record<string, string> = {
  NEW: "New",
  PICKING: "Picking",
  PACKING: "Packing",
  READY: "Ready",
  DISPATCHED: "Dispatched",
  REJECTED: "Rejected",
  RETURNS: "Returns",
};

import { useSharedOrders } from "./SharedOrdersContext";

import { AllOrders as MobileAllOrders } from "./AllOrdersMobile";

export function AllOrders({ onBack, onNavigate, initialStatus, isAdmin = false }: AllOrdersProps) {
  if (!isAdmin) {
    return <MobileAllOrders onBack={onBack} onNavigate={onNavigate} initialStatus={initialStatus} />;
  }

  const { orders: sharedOrders, loading: sharedLoading } = useSharedOrders();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    if (initialStatus) {
      return tabMap[initialStatus.toUpperCase()] ?? "All";
    }
    return "All";
  });
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState("");
  const [dateRangeType, setDateRangeType] = useState("");
  const [customDate, setCustomDate] = useState("");
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("All");
    setDeliveryTypeFilter("");
    setDateRangeType("");
    setCustomDate("");
    setCurrentPage(1);
  };



  const orders = useMemo(() => {
    const cachedWh = localStorage.getItem("warehouseId");
    const storedU = localStorage.getItem("user");
    let userWarehouseId = "";
    if (cachedWh && cachedWh !== "undefined") {
      userWarehouseId = cachedWh;
    } else if (storedU) {
      try {
        const u = JSON.parse(storedU);
        userWarehouseId = u.warehouseId || u.warehouse_id || u.partnerWarehouseId || "";
      } catch (e) {}
    }

    let allOrders = [...sharedOrders];

    // Filter to valid orders: must have a warehouse and must match user's warehouseId if set
    allOrders = allOrders.filter((o: any) => {
      const oWh = o.warehouseId || o.warehouse_id;
      if (!oWh) return false;
      if (userWarehouseId && oWh !== userWarehouseId) return false;
      return true;
    });

    // Filter to completed/finalized operational records only (including dispatched)
    allOrders = allOrders.filter((o: any) => {
      const s = o.status?.toLowerCase();
      return ['delivered', 'completed', 'cancelled', 'rejected', 'return', 'returned', 'dispatched'].includes(s);
    });

    // Staff view client-side shopkeeper filter
    if (!isAdmin) {
      const storedUser = localStorage.getItem("user");
      const user = storedUser ? JSON.parse(storedUser) : null;
      const skId = user?.shopkeeper_id || user?.shopkeeperId || user?.id;
      const skPhone = user?.phone;
      if (skId || skPhone) {
        allOrders = allOrders.filter((o: any) => {
          const matchesId = skId && (o.assignedShopkeeperId === skId || o.assigned_shopkeeper_id === skId);
          const matchesPhone = skPhone && (o.assignedShopkeeper?.phone === skPhone || o.assigned_shopkeeper_phone === skPhone || o.shopkeeper_phone === skPhone);
          return matchesId || matchesPhone;
        });
      }
    }
    return allOrders;
  }, [sharedOrders, isAdmin]);

  const filteredOrders = useMemo(() => {
    let result = orders;

    if (statusFilter !== "All") {
      result = orders.filter((o: any) => {
        const s = o.status?.toLowerCase();
        if (statusFilter === "Picking") return s === "picking" || s === "accepted" || s === "confirmed";
        if (statusFilter === "Packing") return s === "packing" || s === "processing";
        if (statusFilter === "Ready") return s === "ready";
        if (statusFilter === "Dispatched") return s === "dispatched";
        if (statusFilter === "Delivered") return s === "delivered" || s === "completed";
        if (statusFilter === "Cancelled") return s === "cancelled" || s === "rejected";
        if (statusFilter === "Returned") return s === "return" || s === "returned";
        return true;
      });
    }

    if (deliveryTypeFilter) {
      result = result.filter((o: any) => {
        const type = (o.order_type || o.deliveryType || "").toLowerCase();
        if (deliveryTypeFilter.toLowerCase() === "home delivery") {
          return type.includes("home") || type.includes("quick") || type.includes("e-commerce") || type.includes("whatsapp") || type.includes("call");
        } else if (deliveryTypeFilter.toLowerCase() === "self pickup") {
          return type.includes("pickup") || type.includes("self") || type.includes("store");
        }
        return type === deliveryTypeFilter.toLowerCase();
      });
    }

    if (dateRangeType) {
      result = result.filter((o: any) => {
        const orderDateStr = o.createdAt || o.created_at;
        if (!orderDateStr) return false;
        const orderDate = new Date(orderDateStr);
        const orderDateStart = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate()).getTime();
        
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        
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
            const selectedCustomStart = new Date(customDate);
            const customStartTime = new Date(selectedCustomStart.getFullYear(), selectedCustomStart.getMonth(), selectedCustomStart.getDate()).getTime();
            return orderDateStart === customStartTime;
          }
          return false;
        }
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((o: any) => {
        const orderNum = String(o.order_number || o.orderNumber || "").toLowerCase();
        const orderId = String(o.id || "").toLowerCase();
        const custName = String(o.customer_name || o.user || "").toLowerCase();
        const phone = String(o.customer_phone || o.phone || "").toLowerCase();
        return orderNum.includes(q) || orderId.includes(q) || custName.includes(q) || phone.includes(q);
      });
    }

    return [...result].sort((a, b) => getLatestActivityTime(b) - getLatestActivityTime(a));
  }, [orders, statusFilter, deliveryTypeFilter, dateRangeType, customDate, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, deliveryTypeFilter, dateRangeType, customDate]);

  // Pagination logic
  const totalItems = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredOrders.slice(start, start + rowsPerPage);
  }, [filteredOrders, currentPage, rowsPerPage]);

  const paginationObj = {
    page: currentPage,
    limit: rowsPerPage,
    total: totalItems,
    totalPages,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
  };

  const getStatusChipStyles = (status: string) => {
    const s = (status || "").toLowerCase();
    const styleMap: Record<string, { bg: string; text: string }> = {
      new: { bg: "#E3F2FD", text: "#1D4ED8" },
      placed: { bg: "#E3F2FD", text: "#1D4ED8" },
      pending: { bg: "#F3E5F5", text: "#7C3AED" },
      picking: { bg: "#FFF3E0", text: "#D97706" },
      accepted: { bg: "#FFF3E0", text: "#D97706" },
      confirmed: { bg: "#FFF3E0", text: "#D97706" },
      packing: { bg: "#E0F2F1", text: "#0F766E" },
      processing: { bg: "#E0F2F1", text: "#0F766E" },
      ready: { bg: "#E8F5E9", text: "#15803D" },
      dispatched: { bg: "#E8F5E9", text: "#1B5E20" },
      delivered: { bg: "#C8E6C9", text: "#1B5E20" },
      cancelled: { bg: "#FFEBEE", text: "#D32F2F" },
      rejected: { bg: "#FFEBEE", text: "#D32F2F" },
      returns: { bg: "#FFEBEE", text: "#D32F2F" },
      returned: { bg: "#FFEBEE", text: "#D32F2F" },
    };
    return styleMap[s] || { bg: "#F5F5F5", text: "#757575" };
  };

  const getDisplayStatus = (status: string) => {
    const statusUpper = (status || "").toUpperCase();
    const statusMap: Record<string, string> = {
      PENDING: "Pending",
      CONFIRMED: "Confirmed",
      PROCESSING: "Processing",
      READY_FOR_PICKUP: "Ready for Pickup",
      OUT_FOR_DELIVERY: "Out for Delivery",
      ASSIGNED_TO_AGENT: "Out for Delivery",
      PICKED_UP: "Picked Up",
      IN_TRANSIT: "In Transit",
      DELIVERED: "Delivered",
      CANCELLED: "Cancelled",
      FAILED: "Failed",
      RETURNED: "Returned",
      NEW: "Placed",
      ACCEPTED: "Accepted",
      PICKING: "Picking",
      PACKING: "Packing",
      READY: "Ready",
      DISPATCHED: "Dispatched",
      COMPLETED: "Completed",
      REJECTED: "Rejected",
    };
    return statusMap[statusUpper] || status;
  };

  const formatOrderDateTime = (order: any): string => {
    const ts = getLatestActivityTime(order);
    if (!ts) return "—";
    const date = new Date(ts);
    if (isNaN(date.getTime())) return "—";
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    
    return `${day}-${month}-${year}, ${hours}:${minutes} ${ampm}`;
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-gray-900 p-[32px] pb-10">
      {/* Breadcrumbs */}
      <div className="mb-6">
        <Breadcrumbs />
      </div>

      {/* Page Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-[32px] font-bold text-[#111827] dark:text-gray-100 leading-none mb-2">Order History</h1>
          <p className="text-[14px] text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500">View and track all processed orders</p>
        </div>
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:text-gray-100 transition-colors">
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>

      {/* Filters + Search */}
      <div className="mt-2 mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-stretch divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full sm:w-auto overflow-x-auto">
          {/* Filter icon */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700 dark:text-gray-300" />
          </div>

          {/* Status Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 w-[140px] sm:w-[150px] relative flex-shrink-0">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:text-gray-100 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: "All", label: "Status" },
                  { value: "Dispatched", label: "Dispatched" },
                  { value: "Delivered", label: "Delivered" },
                  { value: "Cancelled", label: "Cancelled" },
                  { value: "Returned", label: "Returned" },
                ]}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400 dark:text-gray-500"
            />
          </div>

          {/* Delivery Type Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 w-[150px] sm:w-[160px] relative flex-shrink-0">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:text-gray-100 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
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
            <ChevronDown
              size={16}
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400 dark:text-gray-500"
            />
          </div>

          {/* Date Filter */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 w-[140px] sm:w-[150px] relative flex-shrink-0">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:text-gray-100 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
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
            <ChevronDown
              size={16}
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400 dark:text-gray-500"
            />
            <input
              ref={dateInputRef}
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
            />
          </div>

          {/* Reset button */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex-shrink-0 flex items-center !border-l-0">
            <div className="hidden sm:block h-6 w-[1px] bg-gray-300 dark:bg-gray-600 mr-4"></div>
            <button
              onClick={handleResetFilters}
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
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-[16px] overflow-hidden" style={{ boxShadow: "0px 0px 12px rgba(0,0,0,0.05)" }}>
        {sharedLoading && filteredOrders.length === 0 ? (
          <div className="py-20 text-center text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm">Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center mb-4">
              <ShoppingBag size={32} className="text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">No order history available</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">Processed orders will appear here once orders move through the workflow.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700" style={{ height: "64px" }}>
                  <th className="text-left px-[24px] py-[16px] text-[12px] font-medium text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="text-left px-[24px] py-[16px] text-[12px] font-medium text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-[24px] py-[16px] text-[12px] font-medium text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Delivery Type</th>
                  <th className="text-left px-[24px] py-[16px] text-[12px] font-medium text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-[24px] py-[16px] text-[12px] font-medium text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Shopkeeper</th>
                  <th className="text-left px-[24px] py-[16px] text-[12px] font-medium text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-[24px] py-[16px] text-[12px] font-medium text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Completed At</th>
                  <th className="text-center px-[24px] py-[16px] text-[12px] font-medium text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedOrders.map((order) => {
                  const chipStyle = getStatusChipStyles(order.status);
                  const displayStatus = getDisplayStatus(order.status);
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-[#F9FAFB] dark:bg-gray-900 dark:hover:bg-gray-750 transition-colors"
                      style={{ height: "72px" }}
                    >
                      <td className="px-[24px] py-[16px] text-[14px] font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {order.order_number || order.orderNumber}
                      </td>
                      <td className="px-[24px] py-[16px] text-[14px] text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        <div className="font-bold text-gray-900 dark:text-gray-100">
                          {order.customer_name || order.user || "—"}
                        </div>
                        <div className="text-[12px] text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">
                          {order.customer_phone || order.phone || "—"}
                        </div>
                      </td>
                      <td className="px-[24px] py-[16px] text-[14px] text-gray-600 dark:text-gray-400 dark:text-gray-500 whitespace-nowrap font-medium">
                        {order.order_type || order.deliveryType || "Home Delivery"}
                      </td>
                      <td className="px-[24px] py-[16px] text-[14px] text-gray-900 dark:text-gray-100 whitespace-nowrap font-bold">
                        ₹{order.total_price || order.total_value || order.totalAmount || 0}
                      </td>
                      <td className="px-[24px] py-[16px] text-[14px] whitespace-nowrap">
                        {order.shopkeeper_name ? (
                          <span className="text-gray-700 dark:text-gray-300 font-semibold">{order.shopkeeper_name}</span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">Unassigned</span>
                        )}
                      </td>
                      <td className="px-[24px] py-[16px] text-[14px] whitespace-nowrap">
                        <span
                          className="px-[10px] py-[4px] text-[12px] font-bold rounded-full inline-block text-center"
                          style={{ backgroundColor: chipStyle.bg, color: chipStyle.text }}
                        >
                          {displayStatus}
                        </span>
                      </td>
                      <td className="px-[24px] py-[16px] text-[14px] text-gray-600 dark:text-gray-400 dark:text-gray-500 whitespace-nowrap font-medium">
                        {formatOrderDateTime(order)}
                      </td>
                      <td className="px-[24px] py-[16px] text-[14px] whitespace-nowrap">
                        <div className="flex justify-center">
                          <ViewIconButton
                            onClick={() => onNavigate && onNavigate("order-details", order)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {/* Pagination Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-gray-800">
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">
                <span>Rows per page:</span>
                <div className="[&_select]:text-orange-600 dark:[&_select]:text-orange-500 [&_select]:font-semibold">
                  <select
                    value={rowsPerPage.toString()}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="w-16 h-8 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
                <span className="ml-2 font-medium">
                  Showing {totalItems === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, totalItems)} of {totalItems}
                </span>
              </div>
              <Pagination
                currentPage={currentPage}
                pagination={paginationObj}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
