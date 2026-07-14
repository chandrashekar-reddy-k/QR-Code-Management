import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_URL || 'http://localhost:3004/api/v1',
});

api.interceptors.request.use((config) => {
  const isShopkeeper = window.location.pathname.startsWith('/shopkeeper') && !window.location.pathname.startsWith('/shopkeeper-erp');
  const token = localStorage.getItem(isShopkeeper ? 'staffToken' : 'partnerToken');
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
      const refreshToken = localStorage.getItem(isShopkeeper ? 'staffRefreshToken' : 'partnerRefreshToken');
      
      if (refreshToken) {
        try {
          const res = await axios.post(`${api.defaults.baseURL}/partner/auth/refresh-token`, {
            refreshToken
          });
          if (res.data?.data?.accessToken) {
            const newToken = res.data.data.accessToken;
            localStorage.setItem(isShopkeeper ? 'staffToken' : 'partnerToken', newToken);
            if (res.data.data.refreshToken) {
              localStorage.setItem(isShopkeeper ? 'staffRefreshToken' : 'partnerRefreshToken', res.data.data.refreshToken);
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
          localStorage.removeItem('staffToken');
          localStorage.removeItem('staffRefreshToken');
          localStorage.removeItem('staffUser');
          localStorage.removeItem('staffRole');
          localStorage.removeItem('staffWarehouseId');
          localStorage.removeItem('staffActiveOrder');
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
