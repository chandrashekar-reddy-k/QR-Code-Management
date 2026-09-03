import React from "react";
import { Check, Clock, AlertTriangle } from "lucide-react";
import { useGetOrderTimeline } from "../../hooks/order";

interface OmsStepperProps {
  orderId: string;
  currentStatus: string;
  returnHistory?: any[];
  refundTransactions?: any[];
  paymentMethod?: string;
}

interface Milestone {
  key: string;
  label: string;
  statuses: string[];
  description: string;
}

interface RefundState {
  isCompleted: boolean;
  isFailed: boolean;
  timestamp: string | null;
  label: string;
}

const MILESTONES: Milestone[] = [
  {
    key: "PLACED",
    label: "Placed",
    statuses: ["PLACED"],
    description: "Order received",
  },
  {
    key: "CONFIRMED",
    label: "Confirmed",
    statuses: ["CONFIRMED"],
    description: "Order confirmed",
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
    statuses: ["PROCESSING", "PICKING", "PACKING"],
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
    label: "Out for Delivery",
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

// Helper function to manage status prioritization, DTO enums mapping, and failure states
const getRefundMilestoneState = (
  milestoneKey: string,
  refundTransactions?: any[],
  defaultLabel: string = ""
): RefundState => {
  const defaultState = { isCompleted: false, isFailed: false, timestamp: null, label: defaultLabel };
  if (!refundTransactions || refundTransactions.length === 0) {
    return defaultState;
  }

  // Sort by updatedAt or createdAt descending (copy to avoid mutating React prop)
  const sorted = [...refundTransactions].sort((a, b) => {
    const dateB = new Date(b.updatedAt || b.createdAt).getTime();
    const dateA = new Date(a.updatedAt || a.createdAt).getTime();
    return dateB - dateA;
  });

  const latest = sorted[0];
  const latestStatus = (latest?.status || "").toUpperCase();
  const timestamp = new Date(latest.updatedAt || latest.createdAt).toLocaleString("en-IN", {
    dateStyle: "short",
    timeStyle: "short",
  });

  if (milestoneKey === "REFUND_FULFILLED") {
    const isSucceeded = ["SUCCEEDED", "PROCESSED"].includes(latestStatus);
    const isFailed = latestStatus === "FAILED";
    return {
      isCompleted: isSucceeded,
      isFailed,
      timestamp: (isSucceeded || isFailed) ? timestamp : null,
      label: isFailed ? "Refund Failed" : defaultLabel,
    };
  }

  return defaultState;
};

export const OmsStepper: React.FC<OmsStepperProps> = ({
  orderId,
  currentStatus,
  returnHistory,
  refundTransactions,
}) => {
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

  const activeMilestones = [...MILESTONES];

  if (returnHistory && returnHistory.length > 0) {
    activeMilestones.push(
      {
        key: "RETURN_INITIATED",
        label: "Return Created",
        statuses: ["RETURN_INITIATED", "REQUESTED", "PARTNER_APPROVAL_PENDING"],
        description: "Return request submitted",
      },
      {
        key: "PARTNER_APPROVED",
        label: "Partner Approved",
        statuses: ["APPROVED", "COMPLETED"],
        description: "Return approved by partner",
      },
      {
        key: "REFUND_FULFILLED",
        label: "Refund Completed",
        statuses: ["SUCCEEDED", "PROCESSED"],
        description: "Refund completed successfully",
      }
    );
  }

  // Find when each milestone was first hit
  const getMilestoneTime = (milestone: Milestone) => {
    if (milestone.key === "RETURN_INITIATED" && returnHistory && returnHistory.length > 0) {
      return new Date(returnHistory[0].createdAt).toLocaleString("en-IN", {
        dateStyle: "short",
        timeStyle: "short",
      });
    }

    if (milestone.key === "PARTNER_APPROVED" && returnHistory && returnHistory.length > 0) {
      const approvedReturn = returnHistory.find(r => r.toPhase === 'APPROVED' || r.toPhase === 'COMPLETED');
      if (approvedReturn) {
        return new Date(approvedReturn.createdAt).toLocaleString("en-IN", {
          dateStyle: "short",
          timeStyle: "short",
        });
      }
      return null;
    }

    if (milestone.key === "REFUND_FULFILLED") {
      const rState = getRefundMilestoneState(milestone.key, refundTransactions, milestone.label);
      return rState.timestamp;
    }

    const matched = milestonesHistory.find((h: any) =>
      h && typeof h.status === "string" && milestone.statuses.includes(h.status.toUpperCase())
    );
    if (!matched) return null;
    const ts = matched.at || matched.createdAt;
    if (!ts) return null;
    return new Date(ts).toLocaleString("en-IN", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  // Safely normalise currentStatus and derive effective status (PICKING / PACKING / ACCEPTED) from timeline history
  let rawStatus = (currentStatus ?? "").toUpperCase();
  let effectiveStatus = rawStatus;

  if (rawStatus === "PROCESSING" || rawStatus === "CONFIRMED" || rawStatus === "") {
    const hasPackingEvent = milestonesHistory.some((h: any) =>
      h && (
        (typeof h.status === "string" && h.status.toUpperCase() === "PACKING") ||
        (h.reason && String(h.reason).toLowerCase().includes("packing")) ||
        (h.notes && String(h.notes).toLowerCase().includes("packing"))
      )
    );

    const hasPickingEvent = milestonesHistory.some((h: any) =>
      h && (
        (typeof h.status === "string" && h.status.toUpperCase() === "PICKING") ||
        (h.reason && String(h.reason).toLowerCase().includes("picking")) ||
        (h.notes && String(h.notes).toLowerCase().includes("picking"))
      )
    );

    const hasAcceptedEvent = milestonesHistory.some((h: any) =>
      h && (
        (typeof h.status === "string" && h.status.toUpperCase() === "ACCEPTED") ||
        (h.reason && String(h.reason).toLowerCase().includes("accepted")) ||
        (h.notes && String(h.notes).toLowerCase().includes("accepted"))
      )
    );

    if (rawStatus === "PROCESSING" || hasPickingEvent || hasPackingEvent) {
      if (hasPackingEvent) {
        effectiveStatus = "PACKING";
      } else {
        effectiveStatus = "PICKING";
      }
    } else if (rawStatus === "CONFIRMED" && hasAcceptedEvent) {
      effectiveStatus = "ACCEPTED";
    }
  }

  const normalizedStatus = effectiveStatus;

  // Find index of current status in MILESTONES
  const isCancelled = normalizedStatus === "CANCELLED" || normalizedStatus === "FAILED";
  const isReturned = normalizedStatus === "RETURNED" || normalizedStatus === "RETURN_INITIATED";

  let activeIndex = -1;
  for (let i = 0; i < activeMilestones.length; i++) {
    const isMatched = activeMilestones[i].statuses.includes(normalizedStatus) || getMilestoneTime(activeMilestones[i]) !== null;
    if (isMatched) {
      activeIndex = i;
    }
  }

  // Determine if a milestone is completed (taking refund bypass logic into account)
  const isMilestoneCompleted = (m: Milestone, i: number) => {
    const timestamp = getMilestoneTime(m);
    if (m.key === "REFUND_FULFILLED") {
      const rState = getRefundMilestoneState(m.key, refundTransactions, m.label);
      return rState.isCompleted;
    }
    return timestamp !== null || i <= activeIndex;
  };

  if (isCancelled) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-6 shadow-sm mb-6">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-semibold text-slate-850 dark:text-slate-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-red-500" />
            Fulfillment Journey
          </h3>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            Cancelled / Failed
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-6 shadow-sm mb-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-base font-semibold text-slate-850 dark:text-slate-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-500" />
          Fulfillment Journey
        </h3>
        {isReturned && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            Reverse Logistics
          </span>
        )}
      </div>

      <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-4">
        {activeMilestones.map((milestone, idx) => {
          const timestamp = getMilestoneTime(milestone);
          
          const rState = (milestone.key === "REFUND_FULFILLED")
            ? getRefundMilestoneState(milestone.key, refundTransactions, milestone.label)
            : { isCompleted: timestamp !== null, isFailed: false, label: milestone.label };

          const isFailedRefund = rState.isFailed;
          const isCompleted = isMilestoneCompleted(milestone, idx);
          const isCurrent = idx === activeIndex && !isCancelled;

          // Connector line from this step is green if any downstream steps are completed
          const isLineGreen = activeMilestones.slice(idx + 1).some((m, offset) => {
            const nextIdx = idx + 1 + offset;
            return isMilestoneCompleted(m, nextIdx);
          });

          return (
            <div key={milestone.key} className="flex flex-row md:flex-col items-center md:text-center flex-1 w-full relative group">
              {/* Connector line for mobile */}
              {idx < activeMilestones.length - 1 && (
                <div
                  className={`absolute left-4 top-8 w-0.5 h-full md:hidden transition-all duration-300 ${
                    isLineGreen
                      ? "bg-indigo-500"
                      : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  style={{ height: "calc(100% + 24px)" }}
                />
              )}

              {/* Connector line for desktop */}
              {idx < activeMilestones.length - 1 && (
                <div
                  className={`absolute top-4 left-[calc(50%+16px)] w-[calc(100%-32px)] h-0.5 hidden md:block transition-all duration-300 ${
                    isLineGreen
                      ? "bg-indigo-500"
                      : "bg-slate-200 dark:bg-slate-700"
                    }`}
                />
              )}

              {/* Stepper Dot */}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center relative z-10 transition-all duration-300 border-2 ${
                  isFailedRefund
                    ? "bg-red-500 border-red-500 text-white"
                    : isCurrent
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-150 ring-4 ring-indigo-50"
                    : isCompleted
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
                  }`}
              >
                {isFailedRefund ? (
                  <AlertTriangle className="w-5 h-5 stroke-[3]" />
                ) : isCompleted ? (
                  <Check className="w-5 h-5 stroke-[3]" />
                ) : (
                  <span className="text-xs font-bold">{idx + 1}</span>
                )}
              </div>

              {/* Stepper Info */}
              <div className="ml-4 md:ml-0 md:mt-3 text-left md:text-center">
                <p
                  className={`text-sm font-semibold transition-colors duration-250 ${
                    isFailedRefund
                      ? "text-red-600 dark:text-red-455"
                      : isCurrent
                      ? "text-indigo-600 dark:text-indigo-400"
                      : isCompleted
                        ? "text-slate-850 dark:text-slate-200"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                >
                  {isFailedRefund
                    ? "Refund Failed"
                    : milestone.key === "PROCESSING" && normalizedStatus === "PICKING"
                    ? "Picking"
                    : milestone.key === "PROCESSING" && normalizedStatus === "PACKING"
                    ? "Packing"
                    : rState.label}
                </p>
                {timestamp ? (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                    {timestamp}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-350 dark:text-slate-600 font-normal mt-0.5 md:max-w-[120px] md:mx-auto">
                    {milestone.key === "PROCESSING" && normalizedStatus === "PICKING"
                      ? "Shopkeeper is picking items"
                      : milestone.key === "PROCESSING" && normalizedStatus === "PACKING"
                      ? "Shopkeeper is packing items"
                      : milestone.description}
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
