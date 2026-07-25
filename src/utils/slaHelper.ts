export interface SLAInfo {
  remainingMinutes: number; // Positive if remaining, negative if overdue
  isBreached: boolean;
  status: 'on_track' | 'at_risk' | 'breached';
  displayText: string;
}

export function getSLAInfo(order: any, now: Date = new Date()): SLAInfo {
  // Extract acceptance timestamp
  const acceptedAtStr = order.shopkeeper_accepted_at || order.shopkeeperAcceptedAt || order.acceptedByShopkeeperAt || order.accepted_at;
  const slaMinutes = order.sla_minutes || order.slaMinutes || 30;

  if (!acceptedAtStr) {
    return {
      remainingMinutes: slaMinutes,
      isBreached: false,
      status: 'on_track',
      displayText: `${slaMinutes}m remaining`
    };
  }

  let statusStr = (order.status || "").toLowerCase();
  try {
    if (typeof window !== 'undefined') {
      const handedOverIds = JSON.parse(localStorage.getItem('handedOverIds') || '[]');
      if (handedOverIds.map(String).includes(String(order.id || order.order_number))) {
        statusStr = 'dispatched';
      }
    }
  } catch { }

  const isCompleted = ['dispatched', 'delivered', 'completed', 'out_for_delivery'].includes(statusStr);
  const endVal = isCompleted ? (order.dispatched_at || order.dispatchedAt || order.deliveredAt || order.delivered_at || new Date()) : null;

  const evaluationTime = endVal ? new Date(endVal) : now;

  const acceptedTime = new Date(acceptedAtStr).getTime();
  const targetTime = acceptedTime + (slaMinutes * 60 * 1000);
  const diffMs = targetTime - evaluationTime.getTime();
  const diffMinutes = diffMs / (60 * 1000);

  const isBreached = diffMs < 0;
  const absDiffMs = Math.abs(diffMs);

  const days = Math.floor(absDiffMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((absDiffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((absDiffMs % (60 * 60 * 1000)) / (60 * 1000));

  let timeStr = "";
  if (days > 0) {
    timeStr = `${days}d ${hours}h`;
  } else if (hours > 0) {
    timeStr = `${hours}h ${minutes}m`;
  } else {
    timeStr = `${minutes}m`;
  }

  let displayText = "";
  if (isBreached) {
    displayText = `Overdue by ${timeStr}`;
  } else {
    displayText = `${timeStr} remaining`;
  }

  // Determine status
  let status: 'on_track' | 'at_risk' | 'breached';
  if (isBreached) {
    status = 'breached';
  } else if (diffMinutes <= 10) {
    status = 'at_risk';
  } else {
    status = 'on_track';
  }

  return {
    remainingMinutes: diffMinutes,
    isBreached,
    status,
    displayText
  };
}
