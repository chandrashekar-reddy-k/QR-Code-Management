import api from '../../../../api/axios';

export interface AuditMetrics {
  totalAudits: number;
  draftCount: number;
  pendingReviewCount: number;
  approvedCount: number;
  closedCount: number;
  itemsWithVariance: number;
  totalVarianceValue: number;
  totalVarianceQuantity: number;
  sectionCounts?: {
    RAW_INVENTORY: number;
    REPACKING: number;
    READY_INVENTORY: number;
    VEHICLE: number;
    POS_CHANNEL: number;
    ONLINE_CHANNEL: number;
    HUB_CONSOLIDATED: number;
    HUB_STOCK_VALUE: number;
  };
  sectionAuditStats?: Record<string, {
    lastAuditDate: string | null;
    varianceCount: number;
  }>;
}

export interface InventoryAuditItem {
  id: string;
  auditNumber: string;
  scope: string;
  status: string;
  countingMethod: string;
  cutoffTime: string;
  createdAt: string;
  totalExpectedQty: number;
  totalCountedQty: number;
  totalVarianceQty: number;
  totalVarianceVal: number;
  auditor?: { id: string; name: string; phone?: string };
  reviewer?: { id: string; name: string };
  vehicle?: { id: string; vehicleNumber: string; vehicleName?: string };
  store?: { id: string; name: string };
  _count?: { items: number };
}

export const auditService = {
  // 1. Dashboard summary
  getDashboard: (storeId?: string) => {
    return api.get('/inventorymanagement/audits/dashboard', {
      params: { storeId: storeId && storeId !== 'ALL' ? storeId : undefined }
    });
  },

  // 2. List Audits
  listAudits: (params: { storeId?: string; scope?: string; status?: string; search?: string; page?: number; limit?: number }) => {
    return api.get('/inventorymanagement/audits', { params });
  },

  // 3. Get Single Audit with line items
  getAuditById: (id: string) => {
    return api.get(`/inventorymanagement/audits/${id}`);
  },

  // 4. Initiate New Audit with frozen ledger cutoff
  initiateAudit: (data: {
    storeId?: string;
    scope: string;
    vehicleId?: string;
    countingMethod?: 'SYSTEM_ASSISTED' | 'BLIND';
    categoryId?: string;
  }) => {
    return api.post('/inventorymanagement/audits/initiate', data);
  },

  // 5. Record Physical Count
  recordPhysicalCount: (id: string, entries: Array<{ lineId?: string; productId: string; countedQuantity: number; remarks?: string; reasonCode?: string }>) => {
    return api.post(`/inventorymanagement/audits/${id}/count`, { entries });
  },

  // 6. Submit Count for Review
  submitCount: (id: string) => {
    return api.post(`/inventorymanagement/audits/${id}/submit`);
  },

  // 7. Approve & Post Reconciliation to authoritative stock ledger
  approveAudit: (id: string, data: { reviewNotes?: string; reviewerId?: string }) => {
    return api.post(`/inventorymanagement/audits/${id}/approve`, data);
  }
};
