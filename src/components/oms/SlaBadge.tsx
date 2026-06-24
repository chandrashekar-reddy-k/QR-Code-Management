import React from "react";

interface SlaBadgeProps {
  isBreached: boolean;
  warningSent: boolean;
  elapsedMinutes?: number;
  limitMinutes?: number;
}

export const SlaBadge: React.FC<SlaBadgeProps> = ({
  isBreached,
  warningSent,
  elapsedMinutes,
  limitMinutes,
}) => {
  let badgeStyle = "bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-400 border-green-200 dark:border-green-900";
  let label = "SLA OK";

  if (isBreached) {
    badgeStyle = "bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400 border-red-200 dark:border-red-900 animate-pulse";
    label = "SLA BREACHED";
  } else if (warningSent) {
    badgeStyle = "bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200 dark:border-amber-900";
    label = "SLA WARNING";
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeStyle}`}>
      {label}
      {elapsedMinutes !== undefined && limitMinutes !== undefined && (
        <span className="text-[10px] opacity-75 font-normal ml-0.5">
          ({elapsedMinutes}/{limitMinutes}m)
        </span>
      )}
    </span>
  );
};
