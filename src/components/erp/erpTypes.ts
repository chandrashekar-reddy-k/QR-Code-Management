/**
 * ERP Types
 * All TypeScript interfaces for the Shopkeeper ERP portal.
 */

export type OrderStatus =
  | 'new'
  | 'accepted'
  | 'picking'
  | 'packing'
  | 'ready'
  | 'dispatched'
  | 'delivered'
  | 'cancelled';

export interface ERPOrderItem {
  id: number;
  productName: string;
  variantName?: string;
  quantity: number;
  unit?: string;
  price: number;
  isPicked: boolean;
  isRejected: boolean;
  sku?: string;
  image?: string;
}

export interface ERPOrder {
  id: string | number;
  order_number: string;
  status: OrderStatus;
  order_type: 'Home Delivery' | 'Self Pickup';
  payment_method: string;
  total_value: number;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  sla_minutes: number;
  sla_breach: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  tray_number?: string;
  item_count: number;
  picked_count: number;
  items?: ERPOrderItem[];
  shopkeeper_name?: string;
  rider_name?: string;
  rider_phone?: string;
  created_at?: string;
  createdAt?: string;
  shopkeeper_accepted_at?: string;
  picking_completed_at?: string;
  pickingCompletedAt?: string;
  packing_completed_at?: string;
  packingCompletedAt?: string;
  dispatched_at?: string;
  dispatchedAt?: string;
  notes?: string;
}

export interface ERPDashboardStats {
  totalOrders: number;
  pendingOrders: number;
  pickingOrders: number;
  packingOrders: number;
  readyOrders: number;
  dispatchedOrders: number;
  cancelledOrders: number;
  slaBreached: number;
  completionRate: number;
  avgPickTime?: number;
  avgPackTime?: number;
  todayRevenue?: number;
}

export type ERPScreen =
  | 'dashboard'
  | 'inbox'
  | 'order-detail'
  | 'history'
  | 'picking'
  | 'packing'
  | 'settings';
