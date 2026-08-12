import apiClient from './axios';

export interface FinishedGoodsRecord {
  id: string;
  fgNumber: string;
  woId: string;
  productId: string;
  batchNumber: string;
  postedQty: number;
  destination: string;
  costPayload?: {
    uom?: string;
    mrp?: number;
    manufacturingDate?: string;
    expiryDate?: string;
    storageLocation?: string;
    remarks?: string;
    inventorySyncStatus?: 'PENDING' | 'SYNCHRONIZED';
    postedBy?: string;
    postedAt?: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
  product?: { id: string; name: string; sku?: string; uom?: string; mrp?: number };
  workOrder?: {
    id: string;
    woNumber: string;
    batchNumber?: string;
    status: string;
    actualProduced?: number;
    requiredQty: number;
    product?: { id: string; name: string; sku?: string };
  };
}

export interface FGListResponse {
  data: FinishedGoodsRecord[];
  total: number;
  page: number;
}

export const finishedGoodsService = {
  /** Fetch posted Finished Goods records from backend */
  async getFinishedGoods(params?: Record<string, any>): Promise<FGListResponse> {
    const res = await apiClient.get<any>('/workflows/finished-goods', { params: { limit: 500, ...params } });
    const result = res.data.data;
    if (result && Array.isArray(result.data)) return result as FGListResponse;
    if (Array.isArray(result)) return { data: result, total: result.length, page: 1 };
    return { data: [], total: 0, page: 1 };
  },

  /** Post batch to Finished Goods in backend */
  async postFinishedGoods(data: {
    woId: string;
    batchNumber: string;
    postedQty: number;
    destination: string;
    costPayload?: any;
  }): Promise<any> {
    const res = await apiClient.post<any>('/workflows/finished-goods', data);
    return res.data.data;
  },
};
