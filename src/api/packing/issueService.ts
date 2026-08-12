import apiClient from './axios';

export interface ReportIssuePayload {
  type: string;
  description: string;
  photoUrls?: string[];
  priority?: string;
  woId?: string | null;
  reportedById: string;
}

export const issueService = {
  reportIssue: (data: ReportIssuePayload) => {
    return apiClient.post('/issues', data);
  }
};
