export interface Order {
  id: number;
  userId: number;
  userName: string;
  vendorId: number;
  vendorName: string;
  mobile: string;
  total: number;
  deliveryCharges?: number;
  additionalCharges: number;
  walletUsed: number;
  finalTotal: number;
  paymentMethod: string;
  deliveryTime?: string;
  status: string;
  orderDate: string;
  deliveryDate?: string;
}

export interface SelfPickupOrder {
  id: number;
  userId: number;
  userName: string;
  vendorId: number;
  vendorName: string;
  mobile: string;
  total: number;
  additionalCharges: number;
  walletUsed: number;
  finalTotal: number;
  paymentMethod: string;
  status: string;
  orderDate: string;
}

