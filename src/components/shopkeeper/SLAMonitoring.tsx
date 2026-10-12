import { useState, useEffect } from "react";
import { AlertTriangle, Clock, CheckCircle, Loader2, Package, TrendingUp, Filter, RotateCcw, ChevronDown, ChevronRight, ChevronLeft, ExternalLink, Eye } from "lucide-react";
import { getSLAInfo } from "../../utils/slaHelper";
import api from "../../api/axios";
import { SelectInput, SearchInput } from "../ui";

import { useSocket } from "../../hooks/useSocket";

interface SLAMonitoringProps {
  orders?: any[];
  onNavigate?: (screen: string, data?: any) => void;
  onBack?: () => void;
  canConfigureSla?: boolean;
}

const ORANGE = "#EF5A06";

export function SLAMonitoring({ orders: propOrders, onNavigate, canConfigureSla = false }: SLAMonitoringProps) {
  const [orders, setOrders] = useState<any[]>(propOrders || []);
  const [slaData, setSlaData] = useState<any>(null);
  const [loading, setLoading] = useState(!propOrders);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (propOrders) {
      setOrders(propOrders);
      setLoading(false);
    }
  }, [propOrders]);

  // Filter states
  const [slaFilter, setSlaFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Configure SLA modal state
  const [showSlaConfig, setShowSlaConfig] = useState(false);
  const [slaHours, setSlaHours] = useState("00");
  const [slaMinutes, setSlaMinutes] = useState("00");
  const [savingConfig, setSavingConfig] = useState(false);
  const [configError, setConfigError] = useState("");
  const [configSuccess, setConfigSuccess] = useState(false);

  // Load current SLA config when modal opens
  const openSlaConfig = async () => {
    setConfigError("");
    setConfigSuccess(false);
    try {
      const res = await api.get('/sla-config');
      const data = res.data as { hours?: number; minutes?: number };
      setSlaHours(String(data.hours ?? 0).padStart(2, '0'));
      setSlaMinutes(String(data.minutes ?? 0).padStart(2, '0'));
    } catch {
      // Default to 00:30 if fetch fails
      setSlaHours("00");
      setSlaMinutes("30");
    }
    setShowSlaConfig(true);
  };

  const handleSaveConfig = async () => {
    setConfigError("");
    const h = parseInt(slaHours || '0', 10);
    const m = parseInt(slaMinutes || '0', 10);
    if (h === 0 && m === 0) {
      setConfigError("Total SLA duration must be greater than zero.");
      return;
    }
    setSavingConfig(true);
    try {
      await api.put('/sla-config', { hours: h, minutes: m });
      setConfigSuccess(true);
      setTimeout(() => {
        setShowSlaConfig(false);
        setConfigSuccess(false);
      }, 900);
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to save SLA configuration.";
      setConfigError(msg);
    } finally {
      setSavingConfig(false);
    }
  };

  const socket = useSocket(1);

  const fetchData = () => {
    if (propOrders) return;
    const cachedWh = localStorage.getItem("partnerWarehouseId");
    const storedU = localStorage.getItem("partnerUser");
    let userWarehouseId = "";
    if (cachedWh && cachedWh !== "undefined") {
      userWarehouseId = cachedWh;
    } else if (storedU) {
      try {
        const u = JSON.parse(storedU);
        userWarehouseId =
          u.warehouseId || u.warehouse_id || u.partnerWarehouseId || "";
      } catch {
        /* silent */
      }
    }

    const endpoint = userWarehouseId
      ? `/orders?store_id=${userWarehouseId}&view=shopkeeper&limit=100`
      : "/orders?view=shopkeeper&limit=100";

    Promise.all([
      api.get(endpoint),
      api.get('/sla')
    ]).then(([ordersRes, slaRes]) => {
      const resData = ordersRes.data;
      let allOrders: any[] = [];
      if (Array.isArray(resData)) {
        allOrders = resData;
      } else if (resData && Array.isArray(resData.data)) {
        allOrders = resData.data;
      } else if (resData && resData.data && Array.isArray(resData.data.orders)) {
        allOrders = resData.data.orders;
      } else if (resData && Array.isArray(resData.orders)) {
        allOrders = resData.orders;
      }

      // Deduplicate and filter out mismatching warehouses
      const seenIds = new Set();
      const filteredOrdersList: any[] = [];
      for (const o of allOrders) {
        const id = o.id || o.order_number;
        if (id && !seenIds.has(id)) {
          const oWh = o.warehouseId || o.warehouse_id;
          if (userWarehouseId && oWh && oWh !== userWarehouseId) continue;
          seenIds.add(id);
          filteredOrdersList.push(o);
        }
      }

      setOrders(filteredOrdersList);
      setSlaData(slaRes.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchData();
    const fetchTimer = setInterval(fetchData, 60000);
    const nowTimer = setInterval(() => {
      setNow(new Date());
    }, 60000);

    if (socket.current) {
      socket.current.on('order:new', fetchData);
      socket.current.on('order:status', fetchData);
    }

    return () => {
      clearInterval(fetchTimer);
      clearInterval(nowTimer);
      if (socket.current) {
        socket.current.off('order:new', fetchData);
        socket.current.off('order:status', fetchData);
      }
    };
  }, [socket.current]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F5F7FA] dark:bg-gray-900 items-center justify-center">
        <Loader2 className="animate-spin" size={40} style={{ color: ORANGE }} />
      </div>
    );
  }

  // Helper to check if order is active in store fulfillment pipeline (matching OrderProcessing definition)
  const isActiveOrder = (o: any) => {
    const s = (o.status || '').toUpperCase();
    return ['CONFIRMED', 'ALLOCATED', 'ACCEPTED', 'PICKING', 'PACKING', 'PACKED', 'PROCESSING', 'READY', 'READY_FOR_PICKUP', 'PENDING'].includes(s);
  };

  const isCompletedOrClosed = (o: any) => {
    const s = (o.status || '').toUpperCase();
    return ['DISPATCHED', 'DELIVERED', 'COMPLETED', 'OUT_FOR_DELIVERY', 'DELIVERED_TO_STORE', 'RECEIVED_AT_STORE', 'SHIPPED', 'CANCELLED', 'REJECTED', 'RETURNED', 'FAILED'].includes(s);
  };

  const isCancelledOrRejected = (o: any) => {
    const s = (o.status || '').toLowerCase();
    return ['cancelled', 'rejected'].includes(s);
  };

  // Helper to check if order date matches the dateFilter
  const matchesDateFilter = (o: any) => {
    if (!dateFilter || dateFilter === 'all') return true;
    const orderDate = new Date(o.createdAt || o.created_at || o.acceptedAt || o.shopkeeper_accepted_at || o.shopkeeperAcceptedAt);
    if (isNaN(orderDate.getTime())) return true;

    const nowTime = now.getTime();
    if (dateFilter === 'today') {
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      return orderDate >= today;
    }
    if (dateFilter === 'week') {
      const oneWeekAgo = new Date(nowTime - 7 * 24 * 60 * 60 * 1000);
      return orderDate >= oneWeekAgo;
    }
    if (dateFilter === 'month') {
      const oneMonthAgo = new Date(nowTime - 30 * 24 * 60 * 60 * 1000);
      return orderDate >= oneMonthAgo;
    }
    return true;
  };

  // 1. Summary counts
  let onTrackCount = 0;
  let atRiskCount = 0;
  let activeBreachedCount = 0;
  let dispatchedBreachedCount = 0;
  const breachesList: any[] = [];

  orders.forEach((o) => {
    const s = (o.status || '').toLowerCase();
    if (!s || isCancelledOrRejected(o)) {
      return;
    }

    if (stageFilter && s !== stageFilter.toLowerCase()) return;

    // Apply Search Query to counts
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const orderNo = (o.order_number || o.orderNumber || "").toLowerCase();
      const custName = (o.customer_name || o.consumer?.name || "").toLowerCase();
      if (!orderNo.includes(q) && !custName.includes(q)) return;
    }

    const slaInfo = getSLAInfo(o, now);
    const acceptedAtStr = o.shopkeeper_accepted_at ||
      o.shopkeeperAcceptedAt ||
      o.acceptedByShopkeeperAt ||
      o.accepted_at ||
      o.allocation_started_at ||
      o.allocationStartedAt ||
      o.created_at ||
      o.createdAt;
    const acceptedAt = acceptedAtStr ? new Date(acceptedAtStr).getTime() : now.getTime();

    // Freeze calculation if order is completed/dispatched
    const isCompleted = isCompletedOrClosed(o);
    const endVal = isCompleted ? (o.dispatched_at || o.dispatchedAt || o.deliveredAt || o.delivered_at) : null;
    const evaluationTime = endVal ? new Date(endVal) : now;
    const elapsed = (evaluationTime.getTime() - acceptedAt) / 60000;
    const slaMinutes = o.sla_minutes || o.slaMinutes || 30;

    if (isCompleted) {
      if (slaInfo.status === 'breached') {
        dispatchedBreachedCount++;
        if (matchesDateFilter(o)) {
          breachesList.push({
            order_number: o.order_number || o.orderNumber,
            customer_name: o.customer_name || o.consumer?.name || "Customer",
            customer_phone: o.customer_phone || o.consumer?.phone || "",
            order_type: o.order_type || (o.fulfillmentType === 'STORE_PICKUP' ? 'Self Pickup' : 'Home Delivery'),
            status: o.status,
            sla_minutes: slaMinutes,
            delay_minutes: Math.max(0, Math.floor(elapsed - slaMinutes))
          });
        }
      }
    } else if (isActiveOrder(o)) {
      if (slaInfo.status === 'breached') {
        activeBreachedCount++;
        breachesList.push({
          order_number: o.order_number || o.orderNumber,
          customer_name: o.customer_name || o.consumer?.name || "Customer",
          customer_phone: o.customer_phone || o.consumer?.phone || "",
          order_type: o.order_type || (o.fulfillmentType === 'STORE_PICKUP' ? 'Self Pickup' : 'Home Delivery'),
          status: o.status,
          sla_minutes: slaMinutes,
          delay_minutes: Math.max(0, Math.floor(elapsed - slaMinutes))
        });
      } else if (slaInfo.status === 'at_risk') {
        atRiskCount++;
      } else {
        onTrackCount++;
      }
    }
  });

  const activeOrdersCount = onTrackCount + atRiskCount + activeBreachedCount;

  // 2. SLA Compliance Rate
  let complianceRate = 100;
  if (activeOrdersCount > 0) {
    complianceRate = (onTrackCount / activeOrdersCount) * 100;
  }


  // Calculate dynamic average fulfillment time
  let totalFulfillmentMinutes = 0;
  let completedCount = 0;
  orders.forEach((o) => {
    if (!isCompletedOrClosed(o)) {
      return;
    }

    if (!matchesDateFilter(o)) return;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const orderNo = (o.order_number || o.orderNumber || "").toLowerCase();
      const custName = (o.customer_name || o.consumer?.name || "").toLowerCase();
      if (!orderNo.includes(q) && !custName.includes(q)) return;
    }

    const acceptedAtStr = o.shopkeeper_accepted_at || o.shopkeeperAcceptedAt || o.acceptedByShopkeeperAt || o.createdAt || o.created_at;
    const completedAtStr = o.dispatched_at || o.dispatchedAt || o.delivered_at || o.deliveredAt || o.completed_at || o.completedAt || o.updatedAt || o.updated_at;

    if (acceptedAtStr && completedAtStr) {
      const start = new Date(acceptedAtStr).getTime();
      const end = new Date(completedAtStr).getTime();
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        totalFulfillmentMinutes += (end - start) / 60000;
        completedCount++;
      }
    }
  });

  const dynamicAvgFulfillment = completedCount > 0
    ? Math.round(totalFulfillmentMinutes / completedCount)
    : (slaData?.summary?.avg_fulfillment || 15);

  const summary = {
    active_orders: activeOrdersCount,
    at_risk: atRiskCount,
    active_breaches: activeBreachedCount,
    avg_fulfillment: dynamicAvgFulfillment
  };

  const onTimeCount = onTrackCount;

  const filteredOrders = orders.filter((o) => {
    if (!isActiveOrder(o)) return false;

    const slaInfo = getSLAInfo(o, now);
    const currentSlaStatus = slaInfo.status;

    // Do not display 'on_track' orders in the monitoring table unless filtered explicitly
    if (!slaFilter && currentSlaStatus === 'on_track') return false;

    if (slaFilter && currentSlaStatus !== slaFilter) return false;
    if (stageFilter && (o.status || "").toLowerCase() !== stageFilter.toLowerCase()) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const orderNo = (o.order_number || o.orderNumber || "").toLowerCase();
      const custName = (o.customer_name || o.consumer?.name || "").toLowerCase();
      if (!orderNo.includes(q) && !custName.includes(q)) return false;
    }
    return true;
  });

  // Pagination logic
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6] dark:bg-gray-900 p-[32px] pb-10">


      {/* Page Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-none">SLA Monitoring</h1>
            <div className="bg-green-100 dark:bg-green-900/30 rounded-full px-2.5 py-1 flex items-center gap-1.5 border border-green-200 dark:border-green-800">
              <div className="w-2 h-2 rounded-full animate-pulse bg-green-500" />
              <span className="text-green-700 dark:text-green-400 font-semibold text-xs">Live</span>
            </div>
          </div>
        </div>
        {canConfigureSla && (
          <button
            onClick={openSlaConfig}
            className="bg-[#00891D] hover:bg-[#006614] text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            Configure SLA
          </button>
        )}
      </div>

      {/* Configure SLA Modal */}
      {showSlaConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setShowSlaConfig(false)}
          />
          {/* Modal */}
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8">
            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-7">
              <button
                onClick={() => setShowSlaConfig(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
              >
                <ChevronRight size={18} className="rotate-180" />
              </button>
              <h2 className="text-[18px] font-bold text-gray-900 dark:text-white">Configure SLA</h2>
            </div>

            {/* Fields Row */}
            <div className="grid grid-cols-2 gap-5 mb-8">
              {/* Hours */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Hours <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={slaHours}
                    onChange={e => setSlaHours(e.target.value.padStart(2, '0').slice(-2))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#00891D] focus:border-[#00891D] appearance-none"
                    placeholder="00"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => setSlaHours(h => String(Math.min(99, parseInt(h || '0') + 1)).padStart(2, '0'))}
                      className="w-5 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
                    >
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 5L5 1L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlaHours(h => String(Math.max(0, parseInt(h || '0') - 1)).padStart(2, '0'))}
                      className="w-5 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
                    >
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Minutes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Minutes <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={slaMinutes}
                    onChange={e => setSlaMinutes(e.target.value.padStart(2, '0').slice(-2))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#00891D] focus:border-[#00891D] appearance-none"
                    placeholder="00"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => setSlaMinutes(m => String(Math.min(59, parseInt(m || '0') + 1)).padStart(2, '0'))}
                      className="w-5 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
                    >
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 5L5 1L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlaMinutes(m => String(Math.max(0, parseInt(m || '0') - 1)).padStart(2, '0'))}
                      className="w-5 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
                    >
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Error / Success feedback */}
            {configError && (
              <p className="text-center text-sm text-red-500 mb-4">{configError}</p>
            )}
            {configSuccess && (
              <p className="text-center text-sm text-green-600 font-semibold mb-4">✓ SLA configuration saved!</p>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setShowSlaConfig(false)}
                className="px-8 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={savingConfig || configSuccess}
                className="px-8 py-2.5 rounded-xl bg-[#00891D] hover:bg-[#006614] text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {savingConfig ? 'Saving...' : configSuccess ? 'Saved!' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: "Active Orders", value: summary.active_orders, icon: <Package size={20} className="text-blue-600" />, bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-gray-900 dark:text-white" },
          { label: "On Track", value: onTimeCount, icon: <CheckCircle size={20} className="text-green-600" />, bg: "bg-green-50 dark:bg-green-950/30", text: "text-gray-900 dark:text-white" },
          { label: "At Risk", value: summary.at_risk, icon: <Clock size={20} className="text-yellow-600" />, bg: "bg-yellow-50 dark:bg-yellow-950/30", text: "text-gray-900 dark:text-white" },
          { label: "Breached", value: summary.active_breaches, icon: <AlertTriangle size={20} className="text-orange-600" />, bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-gray-900 dark:text-white" },
          { label: "SLA Success Rate", value: `${complianceRate.toFixed(1)}%`, icon: <TrendingUp size={20} className="text-emerald-600" />, bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-gray-900 dark:text-white" },
        ].map(card => (
          <div key={card.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{card.label}</p>
              <h3 className={`text-2xl font-bold ${card.text}`}>{card.value}</h3>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${card.bg}`}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-stretch divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full sm:w-auto overflow-x-auto">
          <div className="px-3 sm:px-4 py-2 flex items-center justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700 dark:text-gray-300" />
          </div>

          <div className="px-3 sm:px-4 py-2 w-[185px] sm:w-[195px] relative flex-shrink-0">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-sm sm:[&_select]:text-base [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-8 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={slaFilter}
                onChange={(e) => setSlaFilter(e.target.value)}
                options={[
                  { value: "", label: "Status" },
                  { value: "at_risk", label: "At Risk" },
                  { value: "breached", label: "Breached" },
                ]}
              />
            </div>
            <ChevronDown size={16} className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400" />
          </div>

          <div className="px-3 sm:px-4 py-2 w-[185px] sm:w-[195px] relative flex-shrink-0">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-sm sm:[&_select]:text-base [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-8 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                options={[
                  { value: "", label: "Current Stage" },
                  { value: "picking", label: "Picking" },
                  { value: "packing", label: "Packing" },
                  { value: "ready", label: "Ready" },
                ]}
              />
            </div>
            <ChevronDown size={16} className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400" />
          </div>



          <button
            onClick={() => {
              setSlaFilter("");
              setStageFilter("");
              setDateFilter("today");
              setSearchQuery("");
              setCurrentPage(1);
            }}
            className="px-3 sm:px-4 py-2 flex items-center justify-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
          >
            <RotateCcw size={16} />
            <span className="text-sm sm:text-base font-bold">Reset Filter</span>
          </button>
        </div>

        <div className="w-full lg:w-[320px]">
          <SearchInput
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>



      {/* Active Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-8">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse table-auto text-left text-sm">
            <thead>
              <tr className="bg-transparent border-b border-gray-300 dark:border-gray-600 h-10 text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                <th className="px-4 py-2 text-left">Order Number</th>
                <th className="px-4 py-2 text-left">Assigned Staff</th>
                <th className="px-4 py-2 text-left">Current Stage</th>
                <th className="px-4 py-2 text-center">SLA Remaining</th>
                <th className="px-4 py-2 text-center">SLA Status</th>
                <th className="px-4 py-2 text-center">Priority</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 dark:divide-gray-700">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
                    <h3 className="text-gray-900 dark:text-white text-lg font-semibold">
                      All Orders On Track
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                      No SLA alerts detected.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((o) => {
                  const slaInfo = getSLAInfo(o, now);
                  const isBreached = slaInfo.status === 'breached';
                  const isAtRisk = slaInfo.status === 'at_risk';

                  let badgeBg = "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800";
                  let badgeText = "On Track";
                  if (isBreached) {
                    badgeBg = "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";
                    badgeText = "Breached";
                  } else if (isAtRisk) {
                    badgeBg = "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
                    badgeText = "At Risk";
                  }

                  const rowClass = isBreached ? "bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20" : isAtRisk ? "bg-yellow-50/50 dark:bg-yellow-900/10 hover:bg-yellow-50 dark:hover:bg-yellow-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-700/50";

                  // Dynamic priority derived from SLA state
                  let dynamicPriority: string;
                  let priorityBadgeCls: string;
                  if (isBreached) {
                    dynamicPriority = "Critical";
                    priorityBadgeCls = "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";
                  } else if (isAtRisk) {
                    dynamicPriority = "High";
                    priorityBadgeCls = "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800";
                  } else if (slaInfo.remainingMinutes <= 20) {
                    dynamicPriority = "Medium";
                    priorityBadgeCls = "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
                  } else {
                    dynamicPriority = "Low";
                    priorityBadgeCls = "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800";
                  }

                  return (
                    <tr key={o.id || o.order_number} className={`transition-colors h-14 ${rowClass}`}>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{o.order_number}</span>
                      </td>
                      <td className="px-4 py-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          {o.assigned_staff_name || o.shopkeeper_name || o.assignedShopkeeper?.name || "Unassigned"}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className="text-gray-700 dark:text-gray-300 font-medium capitalize">{o.status?.replace(/_/g, ' ') || 'Unknown'}</span>
                      </td>
                      <td className="px-4 py-2 text-center whitespace-nowrap font-bold text-gray-900 dark:text-gray-100">
                        {isBreached ? <span className="text-red-600 dark:text-red-400">{slaInfo.displayText}</span> : slaInfo.displayText}
                      </td>
                      <td className="px-4 py-2 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeBg}`}>
                          {badgeText}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${priorityBadgeCls}`}>
                          {dynamicPriority}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onNavigate && onNavigate("order-details", o)}
                            className="flex items-center gap-1 text-[11px] font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors px-2 py-1.5 rounded-lg shadow-sm"
                            title="View"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (!onNavigate) return;
                              const s = (o.status || '').toLowerCase();
                              if (s === 'dispatched' || s === 'delivered' || s === 'rejected' || s === 'cancelled') {
                                onNavigate('order-details', o);
                              } else if (s === 'packing' || s === 'packing_started') {
                                onNavigate('packing-screen', o);
                              } else if (s === 'packed' || s === 'ready' || s === 'ready_for_dispatch') {
                                onNavigate('ready-orders');
                              } else if (s === 'picking' || s === 'picking_started') {
                                onNavigate('picking-screen', o);
                              } else if (s === 'picked' || s === 'picking_completed') {
                                onNavigate('packing-queue');
                              } else if (s === 'self_pickup' || s === 'self-pickup') {
                                onNavigate('self-pickup');
                              } else {
                                // assigned / accepted → picking queue
                                onNavigate('picking-queue');
                              }
                            }}
                            className="flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors px-2 py-1.5 rounded-lg shadow-sm"
                            title="Open Order"
                          >
                            <ExternalLink size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing <span className="font-medium text-gray-900 dark:text-gray-100">{startIndex + 1}</span> to <span className="font-medium text-gray-900 dark:text-gray-100">{Math.min(startIndex + itemsPerPage, filteredOrders.length)}</span> of <span className="font-medium text-gray-900 dark:text-gray-100">{filteredOrders.length}</span> orders
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-md text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-md text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
