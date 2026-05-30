export interface Product {
  id: number;
  productId: string;
  sellerName: string;
  name: string;
  image: string;
  price: number;
  discountedPrice: number;
  status: 'active' | 'inactive' | 'pending' | 'approved' | 'rejected';
  measurement?: string;
  stock?: number;
  availability?: string;
}

