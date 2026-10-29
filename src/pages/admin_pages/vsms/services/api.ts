// @ts-nocheck
import axios from 'axios';
import { URL as configURL } from '../../../../config';
import { useUserStore } from '../store/userStore';

const baseAPI = configURL || '';
console.log('VSMS API Base URL:', baseAPI);


const api = axios.create({
  baseURL: baseAPI,
});

// Attach JWT token and rewrite endpoints for VSMS
api.interceptors.request.use((config) => {
  let url = config.url || '';
  if (url.startsWith('/admin')) {
    url = url.replace('/admin', '/vsms');
  } else if (
    !url.startsWith('/vsms') && 
    !url.startsWith('vsms') && 
    !url.startsWith('/agent/') &&
    url !== '/agent' &&
    !url.startsWith('agent/') &&
    url !== 'agent' &&
    !url.startsWith('/agent-routes') &&
    !url.startsWith('agent-routes') &&
    !url.startsWith('/agent-transfers') &&
    !url.startsWith('agent-transfers') &&
    !url.startsWith('/procurement') && 
    !url.startsWith('/staff') &&
    !url.startsWith('/inventorymanagement') &&
    !url.startsWith('/unit') &&
    !url.startsWith('/category') &&
    !url.startsWith('/subCategory') &&
    !url.startsWith('/productmanagement') &&
    !url.startsWith('productmanagement')
  ) {
    url = '/vsms' + (url.startsWith('/') ? '' : '/') + url;
  }
  config.url = url;

  const token = sessionStorage.getItem('staffToken') || localStorage.getItem('staffToken') || localStorage.getItem('partnerToken') || localStorage.getItem('token') || localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 (token expired/invalid) — attempt silent token refresh before logging out
let vsmsIsRefreshing = false;
let vsmsRefreshPromise: Promise<string> | null = null;

const vsmsRefreshAccessToken = async (): Promise<string> => {
  const identityBaseUrl = (import.meta.env?.VITE_IDENTITY_SERVICE_URL || 'https://identity.villagkart.com').replace(/\/+$/, '');

  const refreshToken =
    sessionStorage.getItem('staffRefreshToken') ||
    localStorage.getItem('partnerRefreshToken') ||
    localStorage.getItem('refreshToken');

  if (!refreshToken) throw new Error('[VSMS] No refresh token available');

  const res = await fetch(`${identityBaseUrl}/api/v1/auth/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) throw new Error(`[VSMS] Refresh failed with status ${res.status}`);

  const data = await res.json();
  const newToken = data?.data?.accessToken;
  if (!newToken) throw new Error('[VSMS] Refresh response missing accessToken');

  // Persist new access token to all active storage keys (preserving which keys were set)
  if (sessionStorage.getItem('staffToken') !== null) sessionStorage.setItem('staffToken', newToken);
  if (localStorage.getItem('partnerToken') !== null) localStorage.setItem('partnerToken', newToken);
  if (localStorage.getItem('token') !== null) localStorage.setItem('token', newToken);
  if (localStorage.getItem('authToken') !== null) localStorage.setItem('authToken', newToken);
  if (data?.data?.refreshToken) {
    if (sessionStorage.getItem('staffRefreshToken') !== null) sessionStorage.setItem('staffRefreshToken', data.data.refreshToken);
    if (localStorage.getItem('partnerRefreshToken') !== null) localStorage.setItem('partnerRefreshToken', data.data.refreshToken);
    if (localStorage.getItem('refreshToken') !== null) localStorage.setItem('refreshToken', data.data.refreshToken);
  }

  return newToken;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // 503 Service Unavailable or 500 Internal Server Error (usually DB connection issues)
    // DO NOT LOGOUT the user for these. Just let the component handle the error toast.
    if (error.response?.status === 503 || (error.response?.status === 500 && error.response?.data?.message?.includes('connection'))) {
      console.warn('[API Interceptor] Server/DB busy. Skipping automatic logout.', error.response?.status);
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      if (window.location.pathname.includes('/success')) {
        console.warn('[API Interceptor] 401 Error on Success page. Skipping logout to preserve order view.');
        return Promise.reject(error);
      }
      
      if (window.location.pathname.includes('/login')) {
        console.warn('[API Interceptor] 401 Error during login attempt. Relaying error to component.');
        return Promise.reject(error);
      }

      const originalRequest = error.config;
      // Prevent infinite retry loop
      if (originalRequest?._vsmsRetry) {
        console.error('[API Interceptor] Retry after token refresh also got 401 — logging out');
        useUserStore.getState().clearUser();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // Attempt silent token refresh, queuing concurrent requests behind a single refresh call
      try {
        let newToken: string;
        if (vsmsIsRefreshing && vsmsRefreshPromise) {
          newToken = await vsmsRefreshPromise;
        } else {
          vsmsIsRefreshing = true;
          vsmsRefreshPromise = vsmsRefreshAccessToken().finally(() => {
            vsmsIsRefreshing = false;
            vsmsRefreshPromise = null;
          });
          newToken = await vsmsRefreshPromise;
        }

        // Retry the original request with the refreshed token
        originalRequest._vsmsRetry = true;
        originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${newToken}` };
        console.log('[API Interceptor] Token refreshed — retrying original request');
        return api(originalRequest);
      } catch (refreshErr) {
        console.error('[API Interceptor] Token refresh failed — logging out:', refreshErr);
        useUserStore.getState().clearUser();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
  updateBusinessProfile: (data) => api.put('/auth/business', data),
  updatePassword: (data) => api.put('/auth/password', data),
  uploadMyDocument: (formData) => api.post('/auth/me/documents', formData),
};

export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getVehicleInventory: (id) => api.get(`/products/vehicle-inventory/${id}`),
  getVehicleStock: (id = 'me') => api.get(`/products/vehicle-inventory/${id}`),
  getAuditHistory: (vehicleId, params) => api.get(`/products/audit-history/${vehicleId || 'me'}`, { params: { _t: Date.now(), ...(params || {}) } }),
  requestRefill: (data) => api.post('/products/refill', data),
  requestReturn: (data) => api.post('/products/return', data),
  getMyRefills: () => api.get('/inventory/my-refills'),
};

export const cartAPI = {
  get: () => api.get('/cart'),
  add: (data) => api.post('/cart/add', data),
  update: (data) => api.post('/cart/update', data),
  remove: (data) => api.post('/cart/remove', data),
  clear: () => api.post('/cart/clear'),
};

export const ordersAPI = {
  createFromCart: (data) => api.post('/orders/create-from-cart', data),
  completePayment: (data) => api.post('/orders/complete-payment', data),
  getById: (id) => api.get(`/orders/${id}`),
  getMyHistory: (params) => api.get('/orders/my-history', { params }),
  editItem: (orderId, itemId, data) => api.put(`/orders/${orderId}/items/${itemId}`, data),
  removeItem: (orderId, itemId) => api.delete(`/orders/${orderId}/items/${itemId}`),
  returnItems: (orderId, data) => api.post(`/orders/${orderId}/return`, data),
  cancelOrder: (orderId, data) => api.post(`/orders/${orderId}/cancel`, data),
  getSessionSales: (params) => api.get('/orders/session-sales', { params }),
  getReturnReport: (params) => api.get('/orders/return-report', { params }),
  getItemWiseReport: (params) => api.get('/orders/item-wise-report', { params }),
  freezeSession: (data) => api.post('/orders/freeze-session', data),
  payCreditOrder: (orderId, data) => api.post(`/orders/${orderId}/pay-credit`, data),
};

export const reportsAPI = {
  today: (params) => api.get('/reports/today', { params }),
  byDate: (params) => api.get('/reports/date', { params }),
};

export const vgeAPI = {
  getMyPerformance: (params) => api.get('/vge/my-performance', { params }),
  getMyHistory: (params) => api.get('/vge/my-history', { params }),
  getMyMonthlySummary: (params) => api.get('/vge/my-monthly', { params }),
  getLeaderboard: (params) => api.get('/vge/leaderboard', { params }),
};

export const assetAPI = {
  getMyAssets: () => api.get('/assets/my-assets'),
  reportIssue: (data) => api.post('/assets/report-issue', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  createRequest: (data) => api.post('/assets/requests', data),
  getMyRequests: () => api.get('/assets/requests'),
  getCatalog: () => api.get('/assets/catalog'),
};

export const attendanceAPI = {
  punchIn: (data) => api.post('/attendance/punch-in', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  punchOut: (data) => api.post('/attendance/punch-out', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getToday: () => api.get('/attendance/today'),
  getMyHistory: (params) => api.get('/attendance/my-history', { params }),
  getAll: (params) => api.get('/attendance/all', { params }),
};

export const storeAPI = {
  create: (data) => api.post('/tenant/stores', data),
  getMyStores: () => api.get('/tenant/stores'),
};

export const agentTransferAPI = {
  getActiveAgents: () => api.get('/agent-transfers/active-agents'),
  createTransfer: (data: any) => api.post('/agent-transfers', data),
  getTransfers: (params?: any) => api.get('/agent-transfers', { params }),
  getTransferById: (id: string) => api.get(`/agent-transfers/${id}`),
};

export const getCashStatus = async () => {
  const response = await api.get('/cash/status');
  return response.data;
};

export default api;

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
