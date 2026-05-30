export interface WalletTransaction {
  id: number;
  vendorId: number;
  vendorName: string;
  orderId: number;
  orderItemId: number;
  productName: string;
  measurement: string;
  type: 'Credit' | 'Debit';
  amount: number;
  message: string;
  status: 'Active' | 'Inactive' | 'Pending';
  date: string;
}

export interface WalletTransactionFormData {
  vendorId: number;
  type: 'Credit' | 'Debit';
  amount: number;
  message: string;
}

