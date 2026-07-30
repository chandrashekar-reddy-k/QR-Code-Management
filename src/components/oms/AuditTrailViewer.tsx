import React from "react";
import { History, ArrowRight, User, FileText, CheckCircle2 } from "lucide-react";
import { useGetOrderAuditHistory } from "../../hooks/order";

interface AuditTrailViewerProps {
  orderId: string;
}

export const AuditTrailViewer: React.FC<AuditTrailViewerProps> = ({ orderId }) => {
  const { data: auditData, isLoading, error } = useGetOrderAuditHistory(orderId);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 py-4 text-center text-sm">
        Failed to load audit trail.
      </div>
    );
  }

  const logs = auditData?.data || [];

  if (logs.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-6 text-center text-slate-400 text-sm">
        No audit log transitions recorded yet.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-6 shadow-sm">
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-3">
        <History className="w-5 h-5 text-indigo-500" />
        Order Audit Trail
      </h3>

      <div className="relative pl-6 border-l-2 border-slate-100 dark:border-slate-800 space-y-6 ml-2">
        {logs.map((log: any, idx: number) => {
          const toStatusStr = String(log.status || log.toStatus || "").toUpperCase();
          const fromStatusStr = String(log.previousStatus || log.fromStatus || "START").toUpperCase();
          const isCancelled = toStatusStr === "CANCELLED" || toStatusStr === "FAILED";
          const isCompleted = toStatusStr === "DELIVERED";
          
          return (
            <div key={log.id || idx} className="relative group">
              {/* Vertical Timeline Node Marker */}
              <div
                className={`absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full border-2 bg-white dark:bg-slate-900 flex items-center justify-center transition-all ${
                  isCancelled
                    ? "border-red-500 shadow-sm shadow-red-100"
                    : isCompleted
                    ? "border-emerald-500 shadow-sm shadow-emerald-100"
                    : "border-indigo-500 shadow-sm shadow-indigo-100"
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    isCancelled
                      ? "bg-red-500"
                      : isCompleted
                      ? "bg-emerald-500"
                      : "bg-indigo-500"
                  }`}
                />
              </div>

              {/* Timestamp */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded">
                  {new Date(log.at || log.createdAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {(() => {
                    const actorRaw = String(log.actor || log.changedBy || "System");
                    return actorRaw === "SYSTEM_AUTO_CONFIRM" ? "System" : actorRaw;
                  })()}
                </span>
              </div>

              {/* Audit Detail Card */}
              <div className="bg-slate-50 dark:bg-slate-850/50 rounded-lg p-3 border border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-1.5 flex-wrap text-sm font-semibold text-slate-700 dark:text-slate-350">
                  <span className="text-xs font-normal text-slate-400 dark:text-slate-500">Transition:</span>
                  <span className="px-1.5 py-0.5 rounded text-xs bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase font-mono">
                    {fromStatusStr}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs uppercase font-mono ${
                      isCancelled
                        ? "bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400"
                        : isCompleted
                        ? "bg-emerald-100 text-emerald-750 dark:bg-emerald-950/20 dark:text-emerald-400"
                        : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400"
                    }`}
                  >
                    {toStatusStr}
                  </span>
                </div>

                {(log.reason || log.notes) && (
                  <div className="mt-2 text-xs border-t border-slate-200/40 dark:border-slate-800/40 pt-2 text-slate-500 dark:text-slate-450 space-y-1">
                    {log.reason && (
                      <p className="flex items-start gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
                        <span>
                          <strong className="text-slate-600 dark:text-slate-400 font-medium">Reason:</strong>{" "}
                          {String(log.reason).replace(/auto-confirmed after 30 seconds/gi, "Confirmed").replace(/auto-confirmation/gi, "Confirmation")}
                        </span>
                      </p>
                    )}
                    {log.notes && (
                      <p className="flex items-start gap-1">
                        <FileText className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
                        <span>
                          <strong className="text-slate-600 dark:text-slate-400 font-medium">Notes:</strong>{" "}
                          {String(log.notes).replace(/auto-confirmed after 30 seconds/gi, "Confirmed").replace(/auto-confirmation/gi, "Confirmation")}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
