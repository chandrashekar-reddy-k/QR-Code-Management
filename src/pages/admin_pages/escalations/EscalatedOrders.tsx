import { useEscalatedOrders } from "../../../hooks/oms";
import { EscalationBadge } from "../../../components/oms/EscalationBadge";
import { SlaBadge } from "../../../components/oms/SlaBadge";
import { AlertOctagon, Clock, ShieldCheck } from "lucide-react";
import Breadcrumbs from "../../../components/common/Breadcrumbs";

export default function EscalatedOrders() {
  const { data: escalatedData, isLoading } = useEscalatedOrders();
  const items = escalatedData?.data || [];

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 mt-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            Warehouse Escalated Orders
            <AlertOctagon className="text-rose-500 animate-bounce" size={24} />
          </h1>
          <Breadcrumbs />
        </div>
      </div>

      {/* Main Table / List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Active SLA Breach Escalations</h3>
          <span className="text-xs text-rose-500 font-bold bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded-full">
            {items.length} Escalations Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase bg-gray-100 dark:bg-gray-900">
                <th className="p-4">Fulfillment Order No</th>
                <th className="p-4">Allocated At</th>
                <th className="p-4">Elapsed Time</th>
                <th className="p-4">Limit (Minutes)</th>
                <th className="p-4">Escalation Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-650 mx-auto"></div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <ShieldCheck className="text-emerald-500 mb-2" size={32} />
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-350">No Escalations Found</p>
                      <p className="text-xs text-slate-400 mt-0.5">Your warehouse is fully compliant with all order SLAs.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((esc: any) => (
                  <tr key={esc.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <td className="p-4 font-mono text-sm text-gray-900 dark:text-gray-100">
                      {esc.fulfillmentOrder?.fulfillmentOrderNo || esc.fulfillmentOrderId}
                    </td>
                    <td className="p-4 text-xs text-gray-600 dark:text-gray-400">
                      {new Date(esc.allocatedAt).toLocaleString()}
                    </td>
                    <td className="p-4 text-sm font-semibold text-rose-500 font-mono">
                      {esc.elapsedMinutes} mins
                    </td>
                    <td className="p-4 text-sm text-slate-800 dark:text-slate-200">
                      {esc.slaLimitMinutes} mins
                    </td>
                    <td className="p-4">
                      <EscalationBadge
                        alertLevel={esc.alertLevel}
                        targetRole={esc.targetRole}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
