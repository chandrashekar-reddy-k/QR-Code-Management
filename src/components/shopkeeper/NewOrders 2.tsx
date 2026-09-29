import { useState, useRef } from "react";
import { ArrowLeft, CheckCircle, Loader2, Filter, RotateCcw, ChevronDown } from "lucide-react";
import { useSharedOrders } from "./SharedOrdersContext";
import Breadcrumbs from "../common/Breadcrumbs";
import { ViewIconButton, SelectInput, SearchInput } from "../ui";

import { NewOrders as MobileNewOrders } from "./NewOrdersMobile";

interface NewOrdersProps {
  onNavigate: (screen: string, data?: unknown) => void;
  onBack: () => void;
  isAdmin?: boolean;
}

const getRecentOrderTime = (order: any): number => {
  const fields = [
    order.dispatched_at,
    order.dispatchedAt,
    order.packing_completed_at,
    order.packingCompletedAt,
    order.packing_started_at,
    order.packingStartedAt,
    order.picking_started_at,
    order.pickingStartedAt,
    order.pickedAt,
    order.acceptedByShopkeeperAt,
    order.shopkeeperAcceptedAt,
    order.confirmedAt,
    order.acceptedAt,
    order.accepted_at,
    order.confirmed_at,
    order.deliveredAt,
    order.delivered_at,
    order.cancelledAt,
    order.cancelled_at,
    order.updated_at,
    order.updatedAt,
    order.created_at,
    order.createdAt
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

export function NewOrders({ onNavigate, onBack, isAdmin = false }: NewOrdersProps) {
  if (!isAdmin) {
    return <MobileNewOrders onNavigate={onNavigate} onBack={onBack} />;
  }

  const { orders: sharedOrders, loading: sharedLoading } = useSharedOrders();

  // State for filters
  const [statusFilter, setStatusFilter] = useState("");
  const [dateRangeType, setDateRangeType] = useState("today");
  const [customDate, setCustomDate] = useState("");
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleResetFilters = () => {
    setStatusFilter("");
    setDateRangeType("today");
    setCustomDate("");
    setDeliveryTypeFilter("");
    setSearchTerm("");
  };

  // Filter orders (new, pending, placed, assigned statuses that haven't been accepted yet)
  const orders = sharedOrders.filter((o: any) => {
    const s = o.status?.toLowerCase();
    const isNewStatus = s === 'new' || s === 'pending' || s === 'placed' || s === 'assigned' || s === 'confirmed';
    const isNotAccepted = !o.shopkeeperAcceptedAt && !o.acceptedByShopkeeperAt && o.allocationStatus !== 'Accepted';
    return isNewStatus && isNotAccepted;
  });

  const filteredOrders = orders.filter((order) => {
    if (statusFilter && order.status?.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }

    // Date filter logic
    if (dateRangeType) {
      const orderDateStr = order.createdAt || order.created_at;
      if (!orderDateStr) return false;
      const orderDate = new Date(orderDateStr);
      const orderDateStart = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate()).getTime();

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      if (dateRangeType === "today") {
        if (orderDateStart !== todayStart) return false;
      } else if (dateRangeType === "yesterday") {
        const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
        if (orderDateStart !== yesterdayStart) return false;
      } else if (dateRangeType === "last7") {
        const sevenDaysAgoStart = todayStart - 7 * 24 * 60 * 60 * 1000;
        if (orderDateStart < sevenDaysAgoStart || orderDateStart > todayStart) return false;
      } else if (dateRangeType === "week") {
        const dayOfWeek = now.getDay();
        const weekStart = todayStart - dayOfWeek * 24 * 60 * 60 * 1000;
        if (orderDateStart < weekStart) return false;
      } else if (dateRangeType === "month") {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        if (orderDateStart < monthStart) return false;
      } else if (dateRangeType === "custom") {
        if (customDate) {
          const selectedCustomStart = new Date(customDate);
          const customStartTime = new Date(selectedCustomStart.getFullYear(), selectedCustomStart.getMonth(), selectedCustomStart.getDate()).getTime();
          if (orderDateStart !== customStartTime) return false;
        } else {
          return false;
        }
      }
    }

    if (deliveryTypeFilter) {
      const type = (order.order_type || order.deliveryType || "").toLowerCase();
      if (deliveryTypeFilter.toLowerCase() === "home delivery") {
        if (!type.includes("home") && !type.includes("quick") && !type.includes("e-commerce") && !type.includes("whatsapp") && !type.includes("call")) {
          return false;
        }
      } else if (deliveryTypeFilter.toLowerCase() === "self pickup") {
        if (!type.includes("pickup") && !type.includes("self") && !type.includes("store")) {
          return false;
        }
      } else if (type !== deliveryTypeFilter.toLowerCase()) {
        return false;
      }
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchNum = order.order_number?.toLowerCase().includes(term);
      const matchCustName = order.customer_name?.toLowerCase().includes(term) || order.user?.toLowerCase().includes(term);
      const matchCustPhone = order.customer_phone?.includes(term) || order.phone?.includes(term);
      const matchSkName = order.shopkeeper_name?.toLowerCase().includes(term);
      if (!matchNum && !matchCustName && !matchCustPhone && matchSkName) {
        return false;
      }
    }
    return true;
  }).sort((a, b) => getRecentOrderTime(b) - getRecentOrderTime(a));

  const formatOrderDateTime = (order: any): string => {
    const placedTimeStr = order.createdAt || order.created_at;
    if (!placedTimeStr) return "—";
    const date = new Date(placedTimeStr);
    if (isNaN(date.getTime())) return "—";

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;

    return `${day}-${month}-${year}, ${hours}:${minutes} ${ampm}`;
  };


  if (sharedLoading && orders.length === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F3F4F6] dark:bg-gray-900 items-center justify-center">
        <Loader2 className="animate-spin text-[#00891D]" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-gray-900 p-[32px]">
      {/* Breadcrumbs */}
      <div className="mb-6">
        <Breadcrumbs />
      </div>

      {/* Page Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-[32px] font-bold text-[#111827] dark:text-gray-100 leading-none mb-2">New Orders ({filteredOrders.length})</h1>
          <p className="text-[14px] text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500">Incoming orders waiting for shopkeeper assignment</p>
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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-[16px] overflow-hidden" style={{ boxShadow: "0px 0px 12px rgba(0,0,0,0.05)" }}>
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center mb-4">
              <CheckCircle size={32} className="text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">No New Orders Available</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">Incoming customer orders waiting for processing will automatically appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse table-auto text-left text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700" style={{ height: "64px" }}>
                  <th className="text-left px-[24px] py-[16px] text-[12px] font-medium text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[20%]">Order Number</th>
                  <th className="text-left px-[24px] py-[16px] text-[12px] font-medium text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[25%]">Customer</th>
                  <th className="text-center px-[24px] py-[16px] text-[12px] font-medium text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[15%]">Total Items</th>
                  <th className="text-left px-[24px] py-[16px] text-[12px] font-medium text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[20%]">Delivery Type</th>
                  <th className="text-left px-[24px] py-[16px] text-[12px] font-medium text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[20%]">Date and Time</th>
                  <th className="text-center px-[24px] py-[16px] text-[12px] font-medium text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[10%]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredOrders.map((order) => {
                  return (
                    <tr
                      key={order.id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-[#F9FAFB] dark:bg-gray-900 transition-colors"
                      style={{ height: "72px" }}
                    >
                      <td className="px-[24px] py-[16px] whitespace-nowrap text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200">
                        {order.order_number}
                      </td>
                      <td className="px-[24px] py-[16px] whitespace-nowrap">
                        <div className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200">{order.customer_name || order.user}</div>
                        <div className="text-[10px] sm:text-xs text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500">{order.customer_phone || order.phone}</div>
                      </td>
                      <td className="px-[24px] py-[16px] whitespace-nowrap text-xs sm:text-sm text-gray-800 dark:text-gray-200 text-center font-bold">
                        {order.item_count ?? order.items?.length ?? 0}
                      </td>
                      <td className="px-[24px] py-[16px] whitespace-nowrap text-xs sm:text-sm text-gray-800 dark:text-gray-200">
                        {order.order_type || order.deliveryType || "Standard"}
                      </td>
                      <td className="px-[24px] py-[16px] whitespace-nowrap text-xs sm:text-sm text-gray-800 dark:text-gray-200">
                        {formatOrderDateTime(order)}
                      </td>
                      <td className="px-[24px] py-[16px] whitespace-nowrap text-center">
                        <ViewIconButton
                          onClick={() => onNavigate("order-details", order)}
                          size={14}
                          className="text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                        />
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
