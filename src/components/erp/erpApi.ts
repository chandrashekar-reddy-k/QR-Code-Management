/**
 * ERP API Client
 * A standalone axios instance for the Shopkeeper ERP portal.
 * This is completely independent of the main partner axios instance.
 */
import axios from 'axios';

const erpApi = axios.create({
  baseURL: import.meta.env.VITE_URL || 'http://localhost:3004/api/v1',
});

erpApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export default erpApi;
