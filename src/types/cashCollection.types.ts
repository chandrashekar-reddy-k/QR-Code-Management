export interface CashCollection {
  id: number;
  deliveryBoyId: number;
  name: string;
  mobile: string;
  orderId: string | null;
  finalTotal: number;
  amount: number;
  type: 'Collection' | 'Transfer' | 'Bonus';
  bonusAmount: number;
  message: string;
  dateTime: string;
}

export interface CashCollectionFormData {
  deliveryBoyId: string;
  transferAmount: string;
  dateTime: string;
  message: string;
}

