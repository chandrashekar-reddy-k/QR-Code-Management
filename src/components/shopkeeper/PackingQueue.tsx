import { useEffect, useMemo, useState, useRef } from "react";
import { ArrowLeft, Clock, Package, Play, AlertCircle, Eye, Filter, RotateCcw, ChevronDown } from "lucide-react";
import api from "../../api/axios";
import { useSharedOrders } from "./SharedOrdersContext";
import Breadcrumbs from "../common/Breadcrumbs";
import { SelectInput, SearchInput } from "../ui";

import { PackingQueueMobile } from "./PackingQueueMobile";

interface PackingQueueProps {
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

export function PackingQueue({ onNavigate, onBack }: PackingQueueProps) {
  const [userRole] = useState(() => {
    const storedUser = localStorage.getItem("user");
    const userObj = storedUser ? JSON.parse(storedUser) : null;
    return userObj?.role;
  });
  
  const [isStaffLogin] = useState(() => {
    return !userRole || userRole === "SHOPKEEPER" || userRole === "STORE_STAFF";
  });

  if (isStaffLogin) {
    return <PackingQueueMobile onNavigate={onNavigate} onBack={onBack} />;
  }

  const { orders: sharedOrders, refreshOrders } = useSharedOrders();


  const packingOrders = useMemo(() => {
    const orders = sharedOrders.filter((o: any) => {
      const s = o.status?.toLowerCase();
      return s === 'packing' || s === 'packed' || s === 'processing';
    });

    const allTrays = ["P01", "P02", "P03", "P04", "P05"];
    const assignedTrays = new Set<string>(
      orders.filter((o: any) => o.tray_number).map((o: any) => o.tray_number as string)
    );

    const processedOrders: any[] = [];
    for (const o of orders) {
      let tray = o.tray_number;
      if (!tray) {
        const nextFreeTray = allTrays.find(t => !assignedTrays.has(t));
        tray = nextFreeTray || 'P??';
        if (nextFreeTray) {
          assignedTrays.add(tray);
        }
      }
      const pickedCount = o.picked_count ?? o.item_count ?? 0;
      const acceptedAtField = o.shopkeeper_accepted_at || o.shopkeeperAcceptedAt || o.acceptedByShopkeeperAt;
      const acceptedMs = acceptedAtField
        ? new Date(acceptedAtField).getTime()
        : null;
      const pkElapsed = acceptedMs ? (Date.now() - acceptedMs) / 60000 : 0;
      const pkRemaining = o.sla_minutes - pkElapsed;
      processedOrders.push({
        ...o,
        itemsList: o.items,
        items: pickedCount,
        tray,
        urgent: acceptedMs ? pkRemaining <= 10 : o.sla_minutes < 15
      });
    }
    return processedOrders;
  }, [sharedOrders]);

  useEffect(() => {
    const ordersToAssign = sharedOrders.filter((o: any) => {
      const s = o.status?.toLowerCase();
      return (s === 'packing' || s === 'packed' || s === 'processing') && !o.tray_number;
    });

    if (ordersToAssign.length > 0) {
      const assignTrays = async () => {
        const allTrays = ["P01", "P02", "P03", "P04", "P05"];
        const assignedTrays = new Set<string>(
          sharedOrders.filter((o: any) => o.tray_number).map((o: any) => o.tray_number as string)
        );

        for (const o of ordersToAssign) {
          const nextFreeTray = allTrays.find(t => !assignedTrays.has(t));
          const tray = nextFreeTray || 'P??';
          if (nextFreeTray) {
            assignedTrays.add(tray);
            try {
              await api.put(`/orders/${o.id}/status`, { status: 'packing', tray_number: tray });
            } catch (e) {
              console.warn('Failed to persist tray assignment', e);
            }
          }
        }
        await refreshOrders();
      };
      assignTrays();
    }
  }, [sharedOrders]);

  const stats = {
    awaiting: packingOrders.length,
    urgent: packingOrders.filter(o => o.urgent).length
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState("");
  const [trayFilter, setTrayFilter] = useState("");
  const [dateRangeType, setDateRangeType] = useState("");
  const [customDate, setCustomDate] = useState("");
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setDeliveryTypeFilter("");
    setTrayFilter("");
    setDateRangeType("");
    setCustomDate("");
  };

  const filteredPackingOrders = useMemo(() => {
    let result = [...packingOrders];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((o: any) => {
        const orderNum = String(o.order_number || "").toLowerCase();
        const custName = String(o.customer_name || o.user || "").toLowerCase();
        return orderNum.includes(q) || custName.includes(q);
      });
    }

    if (statusFilter) {
      result = result.filter((o: any) => {
        const s = o.status?.toLowerCase();
        return s === statusFilter.toLowerCase();
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

    if (trayFilter) {
      result = result.filter((o: any) => {
        const tray = (o.tray || "").toLowerCase();
        return tray === trayFilter.toLowerCase();
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
        }
        return true;
      });
    }

    return result;
  }, [packingOrders, searchQuery, statusFilter, deliveryTypeFilter, trayFilter, dateRangeType, customDate]);

  return (
    <div className="min-h-screen bg-[#F3F4F6] dark:bg-gray-900 p-[32px] pb-10 flex flex-col">
      {/* Breadcrumbs */}
      <div className="mb-6">
        <Breadcrumbs />
      </div>

      {/* Page Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-[32px] font-bold text-[#111827] dark:text-gray-100 leading-none mb-2">Packing Queue</h1>
          <p className="text-[14px] text-[#9EA3AE] dark:text-gray-400 dark:text-gray-500">Orders ready for packing</p>
        </div>
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:text-gray-100 transition-colors">
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          {
            label: "Awaiting",
            value: stats.awaiting,
            icon: <Package size={20} className="text-blue-600" />,
            bg: "bg-blue-50 dark:bg-blue-950/30",
            text: "text-gray-900 dark:text-white",
          },
          {
            label: "Urgent",
            value: stats.urgent,
            icon: <AlertCircle size={20} className="text-orange-600" />,
            bg: "bg-orange-50 dark:bg-orange-950/30",
            text: "text-gray-900 dark:text-white",
          },
          {
            label: "Avg SLA",
            value: "13m",
            icon: <Clock size={20} className="text-green-600" />,
            bg: "bg-green-50 dark:bg-green-950/30",
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
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500"
            />
          </div>

          {/* Packing Status Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 w-[150px] sm:w-[160px] relative flex-shrink-0">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:text-gray-100 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: "", label: "Packing Status" },
                  { value: "packing", label: "Packing" },
                  { value: "packed", label: "Packed" },
                  { value: "processing", label: "Processing" },
                ]}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500"
            />
          </div>

          {/* Tray Dropdown */}
          <div className="px-3 sm:px-4 py-3 sm:py-4 w-[130px] sm:w-[140px] relative flex-shrink-0">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:text-gray-100 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={trayFilter}
                onChange={(e) => setTrayFilter(e.target.value)}
                options={[
                  { value: "", label: "Tray" },
                  { value: "P01", label: "P01" },
                  { value: "P02", label: "P02" },
                  { value: "P03", label: "P03" },
                  { value: "P04", label: "P04" },
                  { value: "P05", label: "P05" },
                ]}
              />
            </div>
            <ChevronDown
              size={16}
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500"
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
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500"
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

      {/* Orders Table - Desktop style */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-6">
        {filteredPackingOrders.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <Package size={48} className="text-gray-300 mb-4" />
            <p className="text-lg font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">No orders in packing queue</p>
          </div>
        ) : (
          <div className="w-full overflow-x-hidden">
            <table className="w-full border-collapse table-auto text-[14px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 h-[56px] whitespace-nowrap">
                  <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[20%]">Order Number</th>
                  <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[20%]">Assigned Shopkeeper</th>
                  <th className="text-center px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[15%]">Packing Tray</th>
                  <th className="text-center px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[15%]">Total Items</th>
                  <th className="text-center px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[15%]">Packing Progress</th>
                  <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider w-[15%]">SLA Status</th>
                  <th style={{ width: "165px", minWidth: "165px" }} className="text-center px-4 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPackingOrders.map((order) => {
                  const acceptedAtField = order.shopkeeper_accepted_at || order.shopkeeperAcceptedAt || order.acceptedByShopkeeperAt;
                  const acceptedAt = acceptedAtField
                    ? new Date(acceptedAtField).getTime()
                    : null;
                  const elapsedMin = acceptedAt
                    ? Math.floor((Date.now() - acceptedAt) / 60000)
                    : 0;
                  const remainingMin = order.sla_minutes - elapsedMin;
                  const slaBreached = acceptedAt !== null && remainingMin < 0;
                  const isStarted = !!(order.packing_started_at || order.packingStartedAt);

                  // Target SLA duration display helper matching Picking Queue style
                  const formatSla = (minutes: number, isBreached: boolean): string => {
                    const absMin = Math.abs(minutes);
                    const suffix = isBreached ? " overdue" : " remaining";
                    const prefix = isBreached ? "Overdue by " : "";

                    if (absMin < 60) {
                      return isBreached ? `${prefix}${absMin}m` : `${absMin}m${suffix}`;
                    }

                    const hours = Math.floor(absMin / 60);
                    const mins = absMin % 60;

                    if (hours < 24) {
                      const timeStr = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
                      return isBreached ? `${prefix}${timeStr}` : `${timeStr}${suffix}`;
                    }

                    const days = Math.floor(hours / 24);
                    const remHours = hours % 24;
                    const timeStr = remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
                    return isBreached ? `${prefix}${timeStr}` : `${timeStr}${suffix}`;
                  };

                  let slaStatusText = "";
                  let slaBadgeClass = "";
                  if (acceptedAt === null) {
                    slaStatusText = `${order.sla_minutes}m target`;
                    slaBadgeClass = "bg-green-50 text-green-700 border-green-200";
                  } else if (slaBreached) {
                    slaStatusText = formatSla(remainingMin, true);
                    slaBadgeClass = "bg-red-50 text-red-700 border-red-200";
                  } else if (order.urgent || remainingMin <= 10) {
                    slaStatusText = formatSla(remainingMin, false);
                    slaBadgeClass = "bg-orange-50 text-orange-700 border-orange-200";
                  } else {
                    slaStatusText = formatSla(remainingMin, false);
                    slaBadgeClass = "bg-green-50 text-green-700 border-green-200";
                  }

                  const itemsList = order.itemsList || [];
                  const totalToPack = itemsList.filter((i: any) => i.is_picked).length || order.items || 0;
                  const isCompletedVal = ["packed", "ready", "dispatched"].includes((order.status || "").toLowerCase());
                  const packedCountVal = isCompletedVal ? totalToPack : (itemsList.filter((i: any) => i.is_picked && i.is_verified).length || 0);
                  const pctVal = totalToPack > 0 ? Math.round((packedCountVal / totalToPack) * 100) : 0;

                  return (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 dark:bg-gray-700/50 dark:hover:bg-gray-700/50 dark:bg-gray-700/50 dark:hover:bg-gray-750 transition-colors h-[64px]">
                      <td className="px-4 py-4 font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {order.order_number}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        {order.shopkeeper_name ? (
                          <span className="text-gray-700 dark:text-gray-300 font-semibold">{order.shopkeeper_name}</span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center font-bold text-[#EF5A06]">
                        {order.tray}
                      </td>
                      <td className="px-4 py-4 text-gray-900 dark:text-gray-100 whitespace-nowrap text-center font-bold">
                        {order.items}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex flex-col items-center justify-center">
                          <span className="font-bold text-gray-900 dark:text-gray-100 text-xs">{packedCountVal}/{totalToPack}</span>
                          <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full transition-all duration-300"
                              style={{ width: `${pctVal}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${slaBadgeClass}`}>
                          {slaStatusText}
                        </span>
                      </td>
                      <td style={{ width: "165px", minWidth: "165px" }} className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onNavigate("order-details", order)}
                            className="flex items-center gap-1 text-[11px] font-bold text-gray-600 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:hover:text-gray-255 transition-colors px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 dark:bg-gray-700/50 dark:hover:bg-gray-700/50 dark:bg-gray-700/50 dark:hover:bg-gray-700"
                            title="View Details"
                          >
                            <Eye size={12} />
                            <span>View</span>
                          </button>
                          {(() => {
                            const isFullVal = (packedCountVal === totalToPack && totalToPack > 0) || isCompletedVal;
                            const isPartialVal = packedCountVal > 0 && packedCountVal < totalToPack;

                            if (isFullVal) return null;

                            return (
                              <button
                                onClick={() => onNavigate("packing-screen", order)}
                                className="flex items-center gap-1 text-[11px] font-bold text-white bg-[#EF5A06] hover:bg-[#D44F05] transition-colors px-2.5 py-1 rounded-lg shadow-sm whitespace-nowrap"
                              >
                                <Play size={10} fill="white" />
                                <span>{isPartialVal ? "Resume Packing" : "Start Packing"}</span>
                              </button>
                            );
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

      {/* Packing Tray Overview - Desktop Table style */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <h3 className="text-[#111827] dark:text-gray-100 mb-4 font-bold text-[16px]">Packing Trays Overview</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse table-auto text-left text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 h-10">
                <th className="px-4 py-2 font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider text-xs">Tray ID</th>
                <th className="px-4 py-2 font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider text-xs">Status</th>
                <th className="px-4 py-2 font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider text-xs">Assigned Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {(() => {
                const activeTraySet = new Set(packingOrders.map(o => o.tray).filter(Boolean));
                const allSlots = ["P01", "P02", "P03", "P04", "P05"];
                return allSlots.map((tray) => {
                  const isActive = activeTraySet.has(tray);
                  const matchedOrder = packingOrders.find(o => o.tray === tray);
                  return (
                    <tr key={tray} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 dark:bg-gray-700/50 dark:hover:bg-gray-700/50 dark:bg-gray-700/50 h-12">
                      <td className="px-4 py-2 font-bold text-gray-900 dark:text-gray-100">{tray}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${isActive
                            ? "bg-orange-50 text-orange-700 border-orange-200"
                            : "bg-green-50 text-green-700 border-green-200"
                            }`}
                        >
                          {isActive ? "Occupied" : "Available"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 font-semibold">
                        {isActive && matchedOrder ? (
                          <span className="text-gray-900 dark:text-gray-100">{matchedOrder.order_number}</span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
