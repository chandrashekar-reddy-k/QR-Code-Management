export interface ReturnRequest {
  id: string | number;
  userId: string | number;
  name: string;
  productName: string;
  quantity: number;
  total: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  reason: string;
  date: string;
}


