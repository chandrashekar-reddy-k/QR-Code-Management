import axios from 'axios';

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_URL) return (import.meta.env.VITE_URL as string).replace(/\/+$/, '');
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:3004/api/v1';
  }
  return 'https://apierppartner.villagkart.com/api/v1';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
});

api.interceptors.request.use((config) => {
  const isShopkeeper = window.location.pathname.startsWith('/shopkeeper') && !window.location.pathname.startsWith('/shopkeeper-erp');
  const partnerTok = localStorage.getItem('partnerToken');
  const genericTok = localStorage.getItem('token');
  const staffTok = sessionStorage.getItem('staffToken');
  const token = isShopkeeper
    ? (staffTok || genericTok)
    : (partnerTok || genericTok || staffTok);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const isShopkeeper = window.location.pathname.startsWith('/shopkeeper') && !window.location.pathname.startsWith('/shopkeeper-erp');
      const refreshToken = isShopkeeper ? sessionStorage.getItem('staffRefreshToken') : localStorage.getItem('partnerRefreshToken');
      
      if (refreshToken) {
        try {
          const identityBaseUrl = import.meta.env.VITE_IDENTITY_SERVICE_URL || 'http://localhost:4000';
          const res = await axios.post(`${identityBaseUrl}/api/v1/auth/refresh-token`, {
            refreshToken
          });
          if (res.data?.data?.accessToken) {
            const newToken = res.data.data.accessToken;
            if (isShopkeeper) {
              sessionStorage.setItem('staffToken', newToken);
              if (res.data.data.refreshToken) {
                sessionStorage.setItem('staffRefreshToken', res.data.data.refreshToken);
              }
            } else {
              localStorage.setItem('partnerToken', newToken);
              if (res.data.data.refreshToken) {
                localStorage.setItem('partnerRefreshToken', res.data.data.refreshToken);
              }
            }
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          console.error('Token refresh failed', refreshError);
        }
      }
      
      // If we don't have a refresh token or refreshing fails, clear storage and redirect
      if (!window.location.pathname.includes('/login')) {
        if (isShopkeeper) {
          sessionStorage.removeItem('staffToken');
          sessionStorage.removeItem('staffRefreshToken');
          sessionStorage.removeItem('staffUser');
          sessionStorage.removeItem('staffRole');
          sessionStorage.removeItem('staffWarehouseId');
          sessionStorage.removeItem('staffActiveOrder');
        } else {
          localStorage.removeItem('partnerToken');
          localStorage.removeItem('partnerRefreshToken');
          localStorage.removeItem('partnerUser');
          localStorage.removeItem('partnerRole');
          localStorage.removeItem('partnerWarehouseId');
          localStorage.removeItem('partnerIsAuthenticated');
        }
        sessionStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
