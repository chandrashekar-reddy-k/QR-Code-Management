import { ERPOrder, OrderStatus } from './erpTypes';

/** Return a human-readable label for a status code */
export function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    new: 'New',
    accepted: 'Accepted',
    picking: 'Picking',
    packing: 'Packing',
    ready: 'Ready',
    dispatched: 'Dispatched',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };
  return labels[status] ?? status;
}

/** Return Tailwind-equivalent inline style classes for status chips */
export function getStatusStyle(status: OrderStatus): { bg: string; color: string; border: string } {
  const map: Record<OrderStatus, { bg: string; color: string; border: string }> = {
    new:       { bg: '#EBF5FF', color: '#1565C0', border: '#90CAF9' },
    accepted:  { bg: '#E8F5E9', color: '#2E7D32', border: '#A5D6A7' },
    picking:   { bg: '#FFF8E1', color: '#F57F17', border: '#FFE082' },
    packing:   { bg: '#FFF3E0', color: '#E65100', border: '#FFCC80' },
    ready:     { bg: '#F3E5F5', color: '#6A1B9A', border: '#CE93D8' },
    dispatched:{ bg: '#E0F2F1', color: '#00695C', border: '#80CBC4' },
    delivered: { bg: '#E8F5E9', color: '#1B5E20', border: '#A5D6A7' },
    cancelled: { bg: '#FFEBEE', color: '#B71C1C', border: '#EF9A9A' },
  };
  return map[status] ?? { bg: '#F5F5F5', color: '#616161', border: '#BDBDBD' };
}

/** Return priority style */
export function getPriorityStyle(priority: string): { bg: string; color: string } {
  switch (priority) {
    case 'URGENT': return { bg: '#FFEBEE', color: '#C62828' };
    case 'HIGH':   return { bg: '#FFF3E0', color: '#E65100' };
    case 'MEDIUM': return { bg: '#E3F2FD', color: '#1565C0' };
    default:       return { bg: '#F5F5F5', color: '#616161' };
  }
}

/** Format a date to readable string */
export function formatDate(date?: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Format currency in INR */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(amount);
}

/** Get the creation date from either field name */
export function getCreatedAt(order: ERPOrder): string {
  return order.created_at ?? order.createdAt ?? '';
}

/** Compute elapsed minutes since a date string */
export function minutesSince(dateStr?: string): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
}

/** Return SLA urgency given elapsed minutes vs SLA limit */
export function getSLAUrgency(elapsedMinutes: number, slaMinutes: number): 'ok' | 'warn' | 'danger' {
  const ratio = elapsedMinutes / slaMinutes;
  if (ratio >= 1) return 'danger';
  if (ratio >= 0.7) return 'warn';
  return 'ok';
}

/** Get user info from localStorage */
export function getStoredUser(): { name?: string; email?: string; role?: string } {
  try {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : {};
  } catch {
    return {};
  }
}
