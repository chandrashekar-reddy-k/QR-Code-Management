export interface ReturnRequestItem {
  id: string;
  orderItemId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: string;
  qcStatus?: string;
  qcNotes?: string;
}

export interface ReturnRequest {
  id: string | number;
  userId: string | number;
  name: string;
  productName: string;
  quantity: number;
  total: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | string;
  reason: string;
  date: string;
  orderNumber?: string;
  orderId?: string | number;
  returnType?: string;
  items?: ReturnRequestItem[];
}
