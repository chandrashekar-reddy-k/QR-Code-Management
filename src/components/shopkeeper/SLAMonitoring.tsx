import { useState, useEffect } from "react";
import { ArrowLeft, AlertTriangle, Clock, CheckCircle, Loader2, Package, TrendingUp, Filter, RotateCcw, ChevronDown, ExternalLink } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, Tooltip } from "recharts";
import api from "../../api/axios";
import Breadcrumbs from "../common/Breadcrumbs";
import { SelectInput, SearchInput } from "../ui";

import { useSocket } from "../../hooks/useSocket";

interface SLAMonitoringProps {
  onBack: () => void;
  onNavigate?: (screen: string, data?: any) => void;
}

const GREEN = "#00891D";
const ORANGE = "#EF5A06";
const GREEN_LIGHT = "#E8F5E9";
const ORANGE_LIGHT = "#FFF3E0";

export function SLAMonitoring({ onBack, onNavigate }: SLAMonitoringProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [slaData, setSlaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  
  // Filter states
  const [slaFilter, setSlaFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("today");
  const [searchQuery, setSearchQuery] = useState("");
  
  const socket = useSocket(1);

  const fetchData = () => {
    Promise.all([
      api.get('/orders?all=true'),
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
      setOrders(allOrders);
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

  // Helper to check if order status is not dispatched or cancelled
  const isNotDispatchedOrCancelled = (o: any) => {
    const s = o.status?.toLowerCase();
    return s && !['dispatched', 'delivered', 'completed', 'cancelled', 'rejected', 'out_for_delivery'].includes(s);
  };

  const formatTime = (totalMinutes: number, isOverdue = false) => {
    if (!totalMinutes || totalMinutes <= 0) return isOverdue ? "Overdue by 0m" : "0m";
    const d = Math.floor(totalMinutes / 1440);
    const h = Math.floor((totalMinutes % 1440) / 60);
    const m = Math.floor(totalMinutes % 60);
    
    let timeStr = "";
    if (d > 0) {
      timeStr = `${d}d ${h}h`;
    } else if (h > 0) {
      timeStr = `${h}h ${m}m`;
    } else {
      timeStr = `${m}m`;
    }
    
    return isOverdue ? `Overdue by ${timeStr}` : timeStr;
  };

  // 1. Summary counts
  let onTrackCount = 0;
  let atRiskCount = 0;
  let breachedCount = 0;
  const breachesList: any[] = [];

  orders.forEach((o) => {
    const acceptedAtStr = o.shopkeeper_accepted_at || o.shopkeeperAcceptedAt || o.acceptedByShopkeeperAt;
    if (!acceptedAtStr || !isNotDispatchedOrCancelled(o)) {
      return;
    }

    const acceptedAt = new Date(acceptedAtStr).getTime();
    const elapsed = (now.getTime() - acceptedAt) / 60000;
    const slaMinutes = o.sla_minutes || o.slaMinutes || 30;
    const remaining = slaMinutes - elapsed;

    if (elapsed > slaMinutes) {
      breachedCount++;
      breachesList.push({
        order_number: o.order_number || o.orderNumber,
        customer_name: o.customer_name || o.consumer?.name || "Customer",
        customer_phone: o.customer_phone || o.consumer?.phone || "",
        order_type: o.order_type || (o.fulfillmentType === 'STORE_PICKUP' ? 'Self Pickup' : 'Home Delivery'),
        status: o.status,
        sla_minutes: slaMinutes,
        delay_minutes: Math.max(0, Math.floor(elapsed - slaMinutes))
      });
    } else if (remaining < 15) {
      atRiskCount++;
    } else {
      onTrackCount++;
    }
  });

  const activeOrdersCount = onTrackCount + atRiskCount + breachedCount;

  // 2. SLA Compliance Rate
  let complianceRate = 100;
  if (activeOrdersCount > 0) {
    complianceRate = (onTrackCount / activeOrdersCount) * 100;
  }
  const atRiskPct = activeOrdersCount > 0 ? (atRiskCount / activeOrdersCount) * 100 : 0;
  const breachedPct = activeOrdersCount > 0 ? (breachedCount / activeOrdersCount) * 100 : 0;

  // 3. Breach Alerts List
  const breaches = breachesList;

  // 4. SLA data properties
  const hourlyData = slaData?.hourlyData || [];
  const processingTimes = slaData?.processingTimes || [];

  const summary = {
    active_orders: activeOrdersCount,
    at_risk: atRiskCount,
    active_breaches: breachedCount,
    avg_fulfillment: slaData?.summary?.avg_fulfillment || 0
  };

  const onTimeCount = onTrackCount;
  const noChartData = hourlyData.length === 0;

  const filteredOrders = orders.filter((o) => {
    if (!isNotDispatchedOrCancelled(o)) return false;

    const acceptedAtStr = o.shopkeeper_accepted_at || o.shopkeeperAcceptedAt || o.acceptedByShopkeeperAt;
    if (!acceptedAtStr) return false;

    const acceptedAt = new Date(acceptedAtStr).getTime();
    const elapsed = (now.getTime() - acceptedAt) / 60000;
    const slaMinutes = o.sla_minutes || o.slaMinutes || 30;
    const remaining = slaMinutes - elapsed;
    
    const isBreached = remaining < 0;
    const isAtRisk = remaining >= 0 && remaining <= 10;
    const currentSlaStatus = isBreached ? "breached" : isAtRisk ? "at_risk" : "on_track";

    if (slaFilter && currentSlaStatus !== slaFilter) return false;
    if (stageFilter && (o.status || "").toLowerCase() !== stageFilter.toLowerCase()) return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!o.order_number?.toLowerCase().includes(q) && !o.customer_name?.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6] dark:bg-gray-900 p-[32px] pb-10">
      {/* Breadcrumbs */}
      <div className="mb-6">
        <Breadcrumbs items={[
          { label: "Home", href: "/shopkeeper" },
          { label: "SLA Monitoring" },
        ]} />
      </div>

      {/* Page Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-[32px] font-bold text-[#111827] dark:text-gray-100 leading-none">SLA Monitoring</h1>
            <div className="bg-green-100 dark:bg-green-900/30 rounded-full px-2.5 py-1 flex items-center gap-1.5 border border-green-200 dark:border-green-800">
              <div className="w-2 h-2 rounded-full animate-pulse bg-green-500" />
              <span className="text-green-700 dark:text-green-400 font-semibold text-xs">Live</span>
            </div>
          </div>
          <p className="text-[14px] text-[#9EA3AE] dark:text-gray-400">Operations Command Center · Today</p>
        </div>
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: "Active Orders", value: summary.active_orders, icon: <Package size={20} className="text-blue-600" />, bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-gray-900 dark:text-white" },
          { label: "On Track",      value: onTimeCount,           icon: <CheckCircle size={20} className="text-green-600" />, bg: "bg-green-50 dark:bg-green-950/30", text: "text-gray-900 dark:text-white" },
          { label: "At Risk",       value: summary.at_risk,       icon: <Clock size={20} className="text-yellow-600" />, bg: "bg-yellow-50 dark:bg-yellow-950/30", text: "text-gray-900 dark:text-white" },
          { label: "Breached",      value: summary.active_breaches, icon: <AlertTriangle size={20} className="text-orange-600" />, bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-gray-900 dark:text-white" },
          { label: "SLA Success Rate", value: `${complianceRate.toFixed(1)}%`, icon: <TrendingUp size={20} className="text-emerald-600" />, bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-gray-900 dark:text-white" },
        ].map(card => (
          <div key={card.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${card.bg}`}>
              {card.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{card.label}</p>
              <h3 className={`text-2xl font-bold ${card.text}`}>{card.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-stretch divide-y sm:divide-y-0 sm:divide-x divide-gray-300 dark:divide-gray-600 w-full sm:w-auto overflow-x-auto">
          <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center flex-shrink-0">
            <Filter size={18} className="text-gray-700 dark:text-gray-300" />
          </div>

          <div className="px-3 sm:px-4 py-3 sm:py-4 w-[185px] sm:w-[195px] relative flex-shrink-0">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-8 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={slaFilter}
                onChange={(e) => setSlaFilter(e.target.value)}
                options={[
                  { value: "", label: "SLA Status: All" },
                  { value: "on_track", label: "On Track" },
                  { value: "at_risk", label: "At Risk" },
                  { value: "breached", label: "Breached" },
                ]}
              />
            </div>
            <ChevronDown size={16} className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400" />
          </div>

          <div className="px-3 sm:px-4 py-3 sm:py-4 w-[185px] sm:w-[195px] relative flex-shrink-0">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-8 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                options={[
                  { value: "", label: "Order Stage: All" },
                  { value: "picking", label: "Picking" },
                  { value: "packing", label: "Packing" },
                  { value: "ready", label: "Ready" },
                ]}
              />
            </div>
            <ChevronDown size={16} className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400" />
          </div>

          <div className="px-3 sm:px-4 py-3 sm:py-4 w-[140px] sm:w-[150px] relative flex-shrink-0">
            <div className="[&_select]:border-0 [&_select]:bg-transparent [&_select]:dark:bg-transparent [&_select]:shadow-none [&_select]:focus:ring-0 [&_select]:focus:border-0 [&_select]:focus:outline-none [&_select]:text-xs sm:text-sm [&_select]:font-bold [&_select]:text-gray-900 dark:[&_select]:text-gray-100 [&_select]:pr-6 [&_select]:px-0 [&_select]:py-0 [&_select]:w-full">
              <SelectInput
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                options={[
                  { value: "all", label: "All Time" },
                  { value: "today", label: "Today" },
                  { value: "week", label: "This Week" },
                  { value: "month", label: "This Month" },
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
            }}
            className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
          >
            <RotateCcw size={16} />
            <span className="text-xs sm:text-sm font-bold">Reset</span>
          </button>
        </div>

        <div className="w-full lg:w-[320px]">
          <SearchInput
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end mb-4">
        {/* Compact Compliance bar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 w-full lg:w-[400px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-700 dark:text-gray-300" style={{ fontWeight: 600, fontSize: "13px" }}>SLA Compliance Rate</h3>
            <span style={{ fontWeight: 700, fontSize: "14px", color: complianceRate >= 80 ? GREEN : ORANGE }}>
              {complianceRate.toFixed(1)}%
            </span>
          </div>
          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
            <div className="h-full flex">
              <div style={{ width: `${complianceRate}%`, backgroundColor: GREEN, transition: "width 0.6s ease" }} />
              <div style={{ width: `${atRiskPct}%`,   backgroundColor: ORANGE, opacity: 0.6 }} />
              <div style={{ width: `${breachedPct}%`, backgroundColor: ORANGE }} />
            </div>
          </div>
          <div className="flex gap-5">
            {[
              { label: "On Track", color: GREEN },
              { label: "At Risk",  color: ORANGE, opacity: 0.6 },
              { label: "Breached", color: ORANGE },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: l.color, opacity: l.opacity ?? 1 }} />
                <span className="text-gray-400 dark:text-gray-500" style={{ fontSize: "10px" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-8">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse table-auto text-left text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 h-10">
                <th className="px-4 py-2 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Order Number</th>
                <th className="px-4 py-2 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Assigned Staff</th>
                <th className="px-4 py-2 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Current Stage</th>
                <th className="px-4 py-2 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs text-center">SLA Remaining</th>
                <th className="px-4 py-2 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs text-center">SLA Status</th>
                <th className="px-4 py-2 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs text-center">Priority</th>
                <th className="px-4 py-2 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 dark:divide-gray-700">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                      No orders found matching filters
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const acceptedAtStr = o.shopkeeper_accepted_at || o.shopkeeperAcceptedAt || o.acceptedByShopkeeperAt;
                  const acceptedAt = acceptedAtStr ? new Date(acceptedAtStr).getTime() : now.getTime();
                  const elapsed = (now.getTime() - acceptedAt) / 60000;
                  const slaMinutes = o.sla_minutes || o.slaMinutes || 30;
                  const remainingRaw = slaMinutes - elapsed;
                  const isBreached = remainingRaw < 0;
                  const isAtRisk = remainingRaw >= 0 && remainingRaw <= 10;
                  
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

                  return (
                    <tr key={o.id || o.order_number} className={`transition-colors h-14 ${rowClass}`}>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className="font-bold text-gray-900 dark:text-gray-100">{o.order_number}</span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-400 flex-shrink-0">
                            {(o.assigned_staff_name || o.assignedShopkeeperId || "U").charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                            {o.assigned_staff_name || o.assignedShopkeeperId || "Unassigned"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className="text-gray-700 dark:text-gray-300 font-medium capitalize">{o.status?.replace(/_/g, ' ') || 'Unknown'}</span>
                      </td>
                      <td className="px-4 py-2 text-center whitespace-nowrap font-bold text-gray-900 dark:text-gray-100">
                        {isBreached ? <span className="text-red-600 dark:text-red-400">{formatTime(Math.abs(remainingRaw), true)}</span> : formatTime(remainingRaw)}
                      </td>
                      <td className="px-4 py-2 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeBg}`}>
                          {badgeText}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700">
                          {o.priority || "Normal"}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onNavigate && onNavigate("order-details", o)}
                            className="flex items-center gap-1 text-[11px] font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors px-2.5 py-1.5 rounded-lg shadow-sm whitespace-nowrap"
                          >
                            <span className="hidden lg:inline">View</span>
                            <span className="lg:hidden">👁</span>
                          </button>
                          <button
                            onClick={() => window.open(`/shopkeeper?tab=new-orders`, '_self')}
                            className="flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors px-2.5 py-1.5 rounded-lg shadow-sm whitespace-nowrap"
                          >
                            <ExternalLink size={12} />
                            <span className="hidden lg:inline">Open Order</span>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Operations Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-gray-900 dark:text-gray-100 font-bold mb-5">Operations Summary</h3>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
                  <Clock size={16} />
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Avg Fulfillment Time</span>
              </div>
              <span className="text-gray-900 dark:text-gray-100 font-bold text-lg">{formatTime(summary.avg_fulfillment || 0)}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                  <TrendingUp size={16} />
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">SLA Success Rate</span>
              </div>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">{complianceRate.toFixed(1)}%</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600">
                  <AlertTriangle size={16} />
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Active Alerts</span>
              </div>
              <span className="text-red-600 dark:text-red-400 font-bold text-lg">{breaches.length}</span>
            </div>
          </div>
        </div>

        {/* Hourly order volume bar chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <h3 className="text-gray-700 dark:text-gray-300 mb-3" style={{ fontWeight: 600, fontSize: "13px" }}>Hourly Order Volume</h3>
          {noChartData ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Package size={32} color="#BDBDBD" />
              <p className="text-gray-400 dark:text-gray-500" style={{ fontSize: "12px" }}>No orders in the last 6 hours</p>
            </div>
          ) : (
            <>
              <div style={{ height: 150 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData} barSize={18}>
                    <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#9E9E9E" }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }} />
                    <Bar dataKey="onTime"   stackId="a" fill={GREEN}  radius={[0, 0, 2, 2]} name="On Time" />
                    <Bar dataKey="breached" stackId="a" fill={ORANGE} radius={[2, 2, 0, 0]} name="Breached" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 mt-2">
                {[{ label: "On Time", color: GREEN }, { label: "Breached", color: ORANGE }].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: l.color }} />
                    <span className="text-gray-400 dark:text-gray-500" style={{ fontSize: "10px" }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
