import React from "react";

interface EscalationBadgeProps {
  alertLevel: string; // WARNING, BREACH, HIGH, CRITICAL
  targetRole: string; // WAREHOUSE_MANAGER, OPERATIONS_HEAD, REGIONAL_MANAGER, CEO
}

export const EscalationBadge: React.FC<EscalationBadgeProps> = ({ alertLevel, targetRole }) => {
  let badgeStyle = "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-400 border-slate-200 dark:border-slate-800";

  switch (alertLevel.toUpperCase()) {
    case "CRITICAL":
      badgeStyle = "bg-rose-100 text-rose-800 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200 dark:border-rose-900 animate-bounce";
      break;
    case "HIGH":
      badgeStyle = "bg-orange-100 text-orange-800 dark:bg-orange-950/20 dark:text-orange-400 border-orange-200 dark:border-orange-900";
      break;
    case "MEDIUM":
    case "BREACH":
      badgeStyle = "bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400 border-red-200 dark:border-red-900";
      break;
    case "WARNING":
      badgeStyle = "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900";
      break;
  }

  const roleLabel = targetRole.replace(/_/g, " ");

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border uppercase tracking-wider ${badgeStyle}`}>
      {alertLevel}: Escalated to {roleLabel}
    </span>
  );
};
