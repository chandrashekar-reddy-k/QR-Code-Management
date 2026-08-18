import api from './axios';
import type { ApprovalRequest } from '../../types/packing/approvals';

export const approvalService = {
  getApprovals: async (filters: { status?: string; type?: string; searchTerm?: string } = {}): Promise<ApprovalRequest[]> => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.type) params.append('type', filters.type);
    if (filters.searchTerm) params.append('searchTerm', filters.searchTerm);

    const response = await api.get(`/approvals?${params.toString()}`);
    return response.data.data;
  },

  processApproval: async (id: string, action: 'APPROVE' | 'REJECT', comments?: string): Promise<ApprovalRequest> => {
    const response = await api.post(`/approvals/${id}/action`, { action, comments });
    return response.data.data;
  }
};
