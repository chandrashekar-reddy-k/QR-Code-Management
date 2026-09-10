import apiClient from './axios';

export interface QCRecord {
  id: string;
  qcNumber: string;
  woId: string;
  inspectorId: string;
  checkedQty: number;
  result: 'PASS' | 'PARTIAL_PASS' | 'REJECT' | 'REWORK' | 'DISCARD' | 'HOLD';
  severity?: 'MINOR' | 'MAJOR' | 'CRITICAL';
  failureReason?: string;
  remarks?: string;
  checksPayload: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
  workOrder?: {
    id: string;
    woNumber: string;
    batchNumber?: string;
    requiredQty: number;
    actualProduced?: number;
    priority: string;
    createdAt: string;
    updatedAt: string;
    product?: { id: string; name: string; sku?: string };
    supervisor?: { id: string; name: string };
    operator?: { id: string; name: string };
  };
  inspector?: { id: string; name: string; email: string };
}

export interface PendingQCWorkOrder {
  id: string;
  woNumber: string;
  batchNumber?: string;
  requiredQty: number;
  actualProduced?: number;
  priority: string;
  status: string;
  startedAt?: string;
  createdAt: string;
  updatedAt: string;
  product?: { id: string; name: string; sku?: string };
  supervisor?: { id: string; name: string };
  operator?: { id: string; name: string };
  inspector?: { id: string; name: string };
}

export interface QCUser {
  id: string;
  name: string;
  email: string;
}

export interface QCListResponse {
  data: QCRecord[];
  total: number;
  page: number;
}

export interface PendingWOListResponse {
  data: PendingQCWorkOrder[];
  total: number;
  page: number;
}

const QC_STATUSES = [
  'LABELS_APPLIED',
  'QC_PENDING',
  'QC_STARTED',
  'QC_IN_PROGRESS',
  'QC_HOLD',
];

export const qualityCheckService = {
  /** Fetch completed QC records from backend */
  async getQualityChecks(params?: Record<string, any>): Promise<QCListResponse> {
    const res = await apiClient.get<any>('/workflows/quality-checks', { params: { limit: 500, ...params } });
    const result = res.data.data;
    if (result && Array.isArray(result.data)) return result as QCListResponse;
    if (Array.isArray(result)) return { data: result, total: result.length, page: 1 };
    return { data: [], total: 0, page: 1 };
  },

  /** Fetch pending Work Orders for QC */
  async getPendingQCWorkOrders(params?: Record<string, any>): Promise<PendingQCWorkOrder[]> {
    const res = await apiClient.get<any>('/work-orders', { params: { limit: 500, ...params } });
    const result = res.data.data;
    let orders: PendingQCWorkOrder[] = [];
    if (result && Array.isArray(result.data)) orders = result.data;
    else if (Array.isArray(result)) orders = result;
    return orders.filter((wo: PendingQCWorkOrder) => QC_STATUSES.includes(wo.status));
  },

  /** Fetch QC inspectors (QC_INSPECTOR / ADMIN / MANAGER roles) from backend */
  async getUsers(): Promise<QCUser[]> {
    try {
      const res = await apiClient.get<any>('/auth/qc-inspectors');
      const result = res.data.data;
      if (Array.isArray(result)) return result;
      return [];
    } catch {
      return [];
    }
  },

  /** Fetch a Quality Check record by Work Order ID from backend */
  async getQualityCheckByWoId(woId: string): Promise<QCRecord | null> {
    try {
      const res = await apiClient.get<any>('/workflows/quality-checks', { params: { woId, limit: 10 } });
      const result = res.data.data;
      let list: QCRecord[] = [];
      if (result && Array.isArray(result.data)) list = result.data;
      else if (Array.isArray(result)) list = result;
      const found = list.find((q) => q.woId === woId);
      return found || null;
    } catch (err) {
      console.error('Failed to fetch QC record by woId:', err);
      return null;
    }
  },

  /** Submit or save progress for a QC inspection */
  async submitQualityCheck(data: {
    woId: string;
    checkedQty: number;
    result: string;
    severity?: string;
    failureReason?: string;
    remarks?: string;
    checksPayload: any;
    targetWoStatus?: string;
  }): Promise<any> {
    const res = await apiClient.post<any>('/workflows/quality-checks', data);
    return res.data.data;
  },
};
