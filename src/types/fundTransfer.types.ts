export interface FundTransfer {
  id: number;
  deliveryBoyId: number;
  name: string;
  mobile: string;
  address: string;
  openingBalance: number;
  closingBalance: number;
  amount: number;
  type: 'Credit' | 'Debit';
  message: string;
  status: 'Active' | 'Inactive' | 'Pending';
  date: string;
}

export interface FundTransferFormData {
  deliveryBoyId: string;
  amount: string;
  message: string;
}

