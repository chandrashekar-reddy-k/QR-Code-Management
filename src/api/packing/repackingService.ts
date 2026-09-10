import apiClient from './axios';

export interface RepackingLog {
  id: string;
  rpNumber: string;
  sourceWoId: string;
  repackType: string;
  recoverableQty: number;
  wasteQty: number;
  newBatchNumber?: string;
  targetRecipeId?: string;
  loggedById: string;
  status: string;
  remarks?: string;
  requiresRelabeling: boolean;
  operatorId?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  sourceWorkOrder?: {
    id: string;
    woNumber: string;
    batchNumber?: string;
    requiredQty: number;
    actualProduced?: number;
    actualRejected?: number;
    priority: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    product?: { id: string; name: string; sku?: string };
    supervisor?: { id: string; name: string };
    operator?: { id: string; name: string };
  };
  loggedBy?: { id: string; name: string; email: string };
}

export interface PendingRepackWorkOrder {
  id: string;
  woNumber: string;
  batchNumber?: string;
  requiredQty: number;
  actualProduced?: number;
  actualRejected?: number;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  product?: { id: string; name: string; sku?: string };
  supervisor?: { id: string; name: string };
  operator?: { id: string; name: string };
  inspector?: { id: string; name: string };
  qualityChecks?: Array<{
    id: string;
    result: string;
    failureReason?: string;
    remarks?: string;
    checksPayload?: any;
    checkedQty: number;
  }>;
}

export interface RPListResponse {
  data: RepackingLog[];
  total: number;
  page: number;
}

export const repackingService = {
  /** Fetch completed Repacking records from backend */
  async getRepackingLogs(params?: Record<string, any>): Promise<RPListResponse> {
    try {
      const res = await apiClient.get<any>('/workflows/repacking', { params: { limit: 500, ...params } });
      const result = res.data.data;
      if (result && Array.isArray(result.data)) return result as RPListResponse;
      if (Array.isArray(result)) return { data: result, total: result.length, page: 1 };
      return { data: [], total: 0, page: 1 };
    } catch (e) {
      console.warn('Failed to fetch repacking logs:', e);
      return { data: [], total: 0, page: 1 };
    }
  },

  /** Fetch Work Orders eligible for repacking (QC_FAILED + active repacking statuses) */
  async getPendingRepackWorkOrders(): Promise<PendingRepackWorkOrder[]> {
    try {
      const woRes = await apiClient.get<any>('/work-orders', {
        params: { limit: 500, include: 'qualityChecks' }
      });
      const woResult = woRes.data.data;
      let orders: PendingRepackWorkOrder[] = [];
      if (woResult && Array.isArray(woResult.data)) orders = woResult.data;
      else if (Array.isArray(woResult)) orders = woResult;

      // Filter strictly to QC_FAILED and active repacking stages
      const REPACKING_ELIGIBLE = ['QC_FAILED', 'REPACKING_PENDING', 'REPACKING_IN_PROGRESS', 'REPACKING_COMPLETED'];
      return orders.filter((wo) => REPACKING_ELIGIBLE.includes(wo.status));
    } catch (e) {
      console.error('Failed to fetch pending repack work orders', e);
      return [];
    }
  },

  /** Fetch all team members/operators for assignment */
  async getOperators(): Promise<{ id: string; name: string; email: string }[]> {
    try {
      const res = await apiClient.get<any>('/auth/users');
      const result = res.data.data;
      if (Array.isArray(result)) return result;
      return [];
    } catch {
      return [];
    }
  },

  /** Get all quality checks (to get failure reasons etc.) */
  async getQualityCheckForWo(woId: string): Promise<any | null> {
    try {
      const res = await apiClient.get<any>('/workflows/quality-checks', { params: { woId, limit: 10 } });
      const result = res.data.data;
      let list: any[] = [];
      if (result && Array.isArray(result.data)) list = result.data;
      else if (Array.isArray(result)) list = result;
      const found = list.find((q: any) => q.woId === woId);
      return found || null;
    } catch {
      return null;
    }
  },

  /** Start Repacking for a QC_FAILED WO (creates or resumes RepackingLog) */
  async startRepacking(data: { sourceWoId: string; operatorId?: string; remarks?: string }): Promise<any> {
    const res = await apiClient.post<any>('/workflows/repacking/start', data);
    return res.data.data;
  },

  /** Update repacking progress (partial save or complete) */
  async updateRepacking(rpId: string, data: {
    recoverableQty?: number;
    wasteQty?: number;
    remarks?: string;
    requiresRelabeling?: boolean;
    status?: string;
  }): Promise<any> {
    const res = await apiClient.patch<any>(`/workflows/repacking/${rpId}`, data);
    return res.data.data;
  },

  /** Complete Repacking: transitions WO → QC_PENDING (or label route if relabeling required) */
  async completeRepacking(rpId: string, data: {
    recoverableQty: number;
    wasteQty: number;
    remarks?: string;
    requiresRelabeling: boolean;
  }): Promise<any> {
    return this.updateRepacking(rpId, { ...data, status: 'REPACKING_COMPLETED' });
  },

  /** Submit initial Repacking Log record (for cases not yet started) */
  async logRepacking(data: {
    sourceWoId: string;
    repackType: string;
    recoverableQty: number;
    wasteQty: number;
    targetRecipeId?: string;
    remarks?: string;
    requiresRelabeling?: boolean;
    operatorId?: string;
  }): Promise<any> {
    const res = await apiClient.post<any>('/workflows/repacking', data);
    return res.data.data;
  },
};
