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

// Handle 401 (token expired/invalid)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // 503 Service Unavailable or 500 Internal Server Error (usually DB connection issues)
    // DO NOT LOGOUT the user for these. Just let the component handle the error toast.
    if (error.response?.status === 503 || (error.response?.status === 500 && error.response?.data?.message?.includes('connection'))) {
      console.warn('[API Interceptor] Server/DB busy. Skipping automatic logout.', error.response?.status);
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !error.config?._retry) {
      error.config._retry = true;
      const refreshToken = sessionStorage.getItem('staffRefreshToken') || localStorage.getItem('staffRefreshToken') || localStorage.getItem('partnerRefreshToken') || localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const identityBaseUrl = (import.meta.env.VITE_IDENTITY_SERVICE_URL || 'http://localhost:4000').replace(/\/+$/, '');
          const res = await axios.post(`${identityBaseUrl}/api/v1/auth/refresh-token`, { refreshToken });
          if (res.data?.data?.accessToken) {
            const newToken = res.data.data.accessToken;
            sessionStorage.setItem('staffToken', newToken);
            localStorage.setItem('staffToken', newToken);
            localStorage.setItem('partnerToken', newToken);
            localStorage.setItem('token', newToken);
            if (res.data.data.refreshToken) {
              sessionStorage.setItem('staffRefreshToken', res.data.data.refreshToken);
              localStorage.setItem('staffRefreshToken', res.data.data.refreshToken);
              localStorage.setItem('partnerRefreshToken', res.data.data.refreshToken);
              localStorage.setItem('refreshToken', res.data.data.refreshToken);
            }
            error.config.headers = error.config.headers || {};
            error.config.headers.Authorization = `Bearer ${newToken}`;
            return api(error.config);
          }
        } catch (refreshErr) {
          console.error('[API Interceptor] Token refresh failed:', refreshErr);
        }
      }

      if (window.location.pathname.includes('/success')) {
        console.warn('[API Interceptor] 401 Error on Success page. Skipping logout to preserve order view.');
        return Promise.reject(error);
      }
      
      if (window.location.pathname.includes('/login')) {
        console.warn('[API Interceptor] 401 Error during login attempt. Relaying error to component.');
        return Promise.reject(error);
      }

      useUserStore.getState().clearUser();
      window.location.href = '/login';
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
