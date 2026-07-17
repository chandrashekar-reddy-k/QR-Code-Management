import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_URL || 'http://localhost:3004/api/v1',
});

api.interceptors.request.use((config) => {
  const isShopkeeper = window.location.pathname.startsWith('/shopkeeper') && !window.location.pathname.startsWith('/shopkeeper-erp') && !!sessionStorage.getItem('staffToken');
  const token = isShopkeeper ? sessionStorage.getItem('staffToken') : localStorage.getItem('partnerToken');
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
      const isShopkeeper = window.location.pathname.startsWith('/shopkeeper') && !window.location.pathname.startsWith('/shopkeeper-erp') && !!sessionStorage.getItem('staffToken');
      const refreshToken = isShopkeeper ? sessionStorage.getItem('staffRefreshToken') : localStorage.getItem('partnerRefreshToken');
      
      if (refreshToken) {
        try {
          const res = await axios.post(`${api.defaults.baseURL}/partner/auth/refresh-token`, {
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
