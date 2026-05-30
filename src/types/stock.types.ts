export interface StockItem {
  id: number;
  image: string;
  name: string;
  variant: string;
  type: string;
  stock: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
}
