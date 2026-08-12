import axios from 'axios';

// Get base URL from environment variables, fallback to local backend for development
const baseURL = import.meta.env.VITE_PACKER_API_URL || 'http://localhost:5000/api/v1';

if (import.meta.env.DEV) {
  console.log(`[packerApiClient] Resolved Base URL: ${baseURL}`);
}

export const packerApiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token from session or local storage
packerApiClient.interceptors.request.use(
  (config) => {
    const token =
      sessionStorage.getItem('staffToken') ||
      localStorage.getItem('partnerToken') ||
      localStorage.getItem('token_admin') ||
      localStorage.getItem('token');

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (import.meta.env.DEV) {
      console.log(`[packerApiClient Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    }

    return config;
  },
  (error) => {
    if (import.meta.env.DEV) {
      console.error('[packerApiClient Request Error]', error);
    }
    return Promise.reject(error);
  }
);

// Response Interceptor: Log details & errors
packerApiClient.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(
        `[packerApiClient Response] ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`,
        response.data
      );
    }
    return response;
  },
  (error) => {
    if (import.meta.env.DEV) {
      console.error(
        `[packerApiClient Error] ${error.config?.method?.toUpperCase()} ${error.config?.url} - Status: ${error.response?.status || 'NETWORK_ERROR'}`,
        error.response?.data || error.message
      );
    }
    return Promise.reject(error);
  }
);

export default packerApiClient;

