import React from "react";
import { Check, Clock, AlertTriangle } from "lucide-react";
import { useGetOrderTimeline } from "../../hooks/order";

interface OmsStepperProps {
  orderId: string;
  currentStatus: string;
}

interface Milestone {
  key: string;
  label: string;
  statuses: string[];
  description: string;
}

const MILESTONES: Milestone[] = [
  {
    key: "PLACED",
    label: "Placed",
    statuses: ["PLACED", "CONFIRMED"],
    description: "Order received and confirmed",
  },
  {
    key: "ACCEPTED",
    label: "Accepted",
    statuses: ["ACCEPTED"],
    description: "Warehouse accepted order",
  },
  {
    key: "PROCESSING",
    label: "Processing",
    statuses: ["PROCESSING"],
    description: "Picking and packing items",
  },
  {
    key: "READY",
    label: "Ready for Pickup",
    statuses: ["READY_FOR_PICKUP"],
    description: "Packed and ready at bay",
  },
  {
    key: "DISPATCHED",
    label: "Dispatched",
    statuses: ["OUT_FOR_DELIVERY", "PICKED_UP", "IN_TRANSIT", "ASSIGNED_TO_AGENT"],
    description: "In transit with agent",
  },
  {
    key: "DELIVERED",
    label: "Delivered",
    statuses: ["DELIVERED"],
    description: "Handed over to customer",
  },
];

export const OmsStepper: React.FC<OmsStepperProps> = ({ orderId, currentStatus }) => {
  const { data: timelineData, isLoading, error } = useGetOrderTimeline(orderId);

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
        Failed to load order lifecycle stepper.
      </div>
    );
  }

  const milestonesHistory = timelineData?.data || [];

  // Find when each milestone was first hit
  const getMilestoneTime = (milestone: Milestone) => {
    const matched = milestonesHistory.find((h: any) =>
      milestone.statuses.includes(h.status.toUpperCase())
    );
    if (!matched) return null;
    return new Date(matched.at).toLocaleString("en-IN", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  // Find index of current status in MILESTONES
  const isCancelled = currentStatus.toUpperCase() === "CANCELLED" || currentStatus.toUpperCase() === "FAILED";
  const isReturned = currentStatus.toUpperCase() === "RETURNED" || currentStatus.toUpperCase() === "RETURN_INITIATED";

  let activeIndex = -1;
  for (let i = 0; i < MILESTONES.length; i++) {
    const isMatched = MILESTONES[i].statuses.includes(currentStatus.toUpperCase()) || getMilestoneTime(MILESTONES[i]) !== null;
    if (isMatched) {
      activeIndex = i;
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-6 shadow-sm mb-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-500" />
          Fulfillment Journey
        </h3>
        {isCancelled && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            Cancelled / Failed
          </span>
        )}
        {isReturned && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            Reverse Logistics
          </span>
        )}
      </div>

      <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-4">
        {MILESTONES.map((milestone, idx) => {
          const timestamp = getMilestoneTime(milestone);
          const isCompleted = timestamp !== null || idx <= activeIndex;
          const isCurrent = idx === activeIndex && !isCancelled;

          return (
            <div key={milestone.key} className="flex flex-row md:flex-col items-center md:text-center flex-1 w-full relative group">
              {/* Connector line for mobile */}
              {idx < MILESTONES.length - 1 && (
                <div
                  className={`absolute left-4 top-8 w-0.5 h-full md:hidden transition-all duration-300 ${
                    timestamp && getMilestoneTime(MILESTONES[idx + 1])
                      ? "bg-indigo-500"
                      : "bg-slate-200 dark:bg-slate-700"
                  }`}
                  style={{ height: "calc(100% + 24px)" }}
                />
              )}

              {/* Connector line for desktop */}
              {idx < MILESTONES.length - 1 && (
                <div
                  className={`absolute top-4 left-[calc(50%+16px)] w-[calc(100%-32px)] h-0.5 hidden md:block transition-all duration-300 ${
                    timestamp && getMilestoneTime(MILESTONES[idx + 1])
                      ? "bg-indigo-500"
                      : "bg-slate-200 dark:bg-slate-700"
                  }`}
                />
              )}

              {/* Stepper Dot */}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center relative z-10 transition-all duration-300 border-2 ${
                  isCurrent
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-150 ring-4 ring-indigo-50"
                    : isCompleted
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
                }`}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5 stroke-[3]" />
                ) : (
                  <span className="text-xs font-bold">{idx + 1}</span>
                )}
              </div>

              {/* Stepper Info */}
              <div className="ml-4 md:ml-0 md:mt-3 text-left md:text-center">
                <p
                  className={`text-sm font-semibold transition-colors duration-250 ${
                    isCurrent
                      ? "text-indigo-600 dark:text-indigo-400"
                      : isCompleted
                      ? "text-slate-850 dark:text-slate-200"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {milestone.label}
                </p>
                {timestamp ? (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                    {timestamp}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-350 dark:text-slate-600 font-normal mt-0.5 md:max-w-[120px] md:mx-auto">
                    {milestone.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
