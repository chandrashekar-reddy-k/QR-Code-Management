export interface ReturnRequest {
  id: number;
  userId: number;
  name: string;
  productName: string;
  quantity: number;
  total: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  reason: string;
  date: string;
}

