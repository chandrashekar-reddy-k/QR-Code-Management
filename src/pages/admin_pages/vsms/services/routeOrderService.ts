// @ts-nocheck
import api from './api';

export interface RouteAppOrderQuery {
  tab?: 'app_orders' | 'processed';
  status?: string;
  search?: string;
  date?: string;
  page?: number;
  limit?: number;
}

export const getAgentAppOrders = async (params: RouteAppOrderQuery = {}) => {
  const response = await api.get('/agent/route-orders/app-orders', { params });
  return response.data;
};

export const updateAgentOrderStatus = async (orderId: string, nextStatus: string, reason?: string) => {
  const response = await api.put(`/agent/route-orders/${orderId}/status`, { nextStatus, reason });
  return response.data;
};
