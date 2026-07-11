import { useState } from "react";
import { useWarehouseStats, useEscalatedOrders } from "../../../hooks/oms";
import { 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  ChevronRight,
  Activity,
  Layers,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import Breadcrumbs from "../../../components/common/Breadcrumbs";

export default function WarehouseDashboard() {
  const { data: statsData, isLoading: statsLoading } = useWarehouseStats();
  const { data: escalatedData, isLoading: escalatedLoading } = useEscalatedOrders();

  const stats = statsData?.data || {
    todayOrders: 0,
    pending: 0,
    packing: 0,
    ready: 0,
    slaSuccessRate: 100
  };

  const escalations = escalatedData?.data || [];

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 mt-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            Warehouse Ops Control Center
            <Activity className="text-indigo-500 animate-pulse" size={24} />
          </h1>
          <Breadcrumbs />
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {/* Today's Orders */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Today's Orders</p>
              <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-2">
                {statsLoading ? "..." : stats.todayOrders}
              </h3>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg">
              <ShoppingCart className="text-indigo-650 dark:text-indigo-400" size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
            <TrendingUp size={12} />
            <span>Updated live</span>
          </div>
        </div>

        {/* Pending Acceptance */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Pending Accept</p>
              <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-2">
                {statsLoading ? "..." : stats.pending}
              </h3>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
              <Clock className="text-amber-500" size={20} />
            </div>
          </div>
          <div className="mt-3">
            <Link to="/orders" className="text-[10px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-0.5">
              View backlog <ChevronRight size={10} />
            </Link>
          </div>
        </div>

        {/* Packing / Processing */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">In Packing</p>
              <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-2">
                {statsLoading ? "..." : stats.packing}
              </h3>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <Package className="text-blue-500" size={20} />
            </div>
          </div>
          <div className="mt-3 text-[10px] text-slate-400 dark:text-slate-500">
            Preparation phase
          </div>
        </div>

        {/* Ready for Pickup */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Ready for Handover</p>
              <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-2">
                {statsLoading ? "..." : stats.ready}
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
              <Layers className="text-emerald-500" size={20} />
            </div>
          </div>
          <div className="mt-3 text-[10px] text-slate-400 dark:text-slate-500">
            Awaiting agent pickup
          </div>
        </div>

        {/* SLA Success Rate */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">SLA Success Rate</p>
              <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-2">
                {statsLoading ? "..." : `${stats.slaSuccessRate.toFixed(1)}%`}
              </h3>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-lg">
              <ShieldCheck className="text-rose-500" size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-600 h-full transition-all duration-500"
                style={{ width: `${stats.slaSuccessRate}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Escalation Monitor & Alerts */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={20} />
              Active SLA Warnings & Escalations
            </h3>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400">
              {escalations.length} Flagged
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[350px] space-y-3 pr-2">
            {escalatedLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-650"></div>
              </div>
            ) : escalations.length === 0 ? (
              <div className="text-center py-16 text-slate-400 dark:text-slate-500 border border-dashed border-slate-150 dark:border-slate-800 rounded-lg">
                <ShieldCheck className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-xs font-medium">All active fulfillments are within healthy SLA limits.</p>
              </div>
            ) : (
              escalations.map((esc: any) => (
                <div 
                  key={esc.id} 
                  className="flex items-center justify-between p-4 border border-rose-100 dark:border-rose-950/30 bg-rose-50/20 dark:bg-rose-950/5 rounded-xl hover:bg-rose-50/40 dark:hover:bg-rose-950/10 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        #{esc.fulfillmentOrder?.fulfillmentOrderNo || esc.fulfillmentOrderId.slice(0, 8)}
                      </span>
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        esc.alertLevel === "CRITICAL" 
                          ? "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400 animate-pulse" 
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400"
                      }`}>
                        {esc.alertLevel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Target Escalation Level: <span className="font-bold text-slate-600 dark:text-slate-300">{esc.targetRole.replace(/_/g, " ")}</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-350">
                      {esc.elapsedMinutes} / {esc.slaLimitMinutes} mins
                    </span>
                    <span className="text-[10px] text-rose-500 font-bold">
                      {((esc.ratio) * 100).toFixed(0)}% limit reached
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Operations Links */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">Operations Navigation</h3>
          <div className="space-y-3">
            <Link 
              to="/inventory/atp" 
              className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">ATP Stock Visibility</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Check promiseable inventory balances</p>
              </div>
              <ArrowRight className="text-indigo-500" size={16} />
            </Link>

            <Link 
              to="/escalations" 
              className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">Escalation Center</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Warehouse-scoped SLA escalations list</p>
              </div>
              <ArrowRight className="text-indigo-500" size={16} />
            </Link>

            <Link 
              to="/orders" 
              className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">Order Handover</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Manage pick, pack, and transition lists</p>
              </div>
              <ArrowRight className="text-indigo-500" size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
