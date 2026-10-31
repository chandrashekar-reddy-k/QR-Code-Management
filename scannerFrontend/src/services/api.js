// src/services/api.js
// Centralized API client for VillagKart QR Studio & Partner Web

const getBaseUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
    if (import.meta.env.VITE_PARTNER_API_URL) return import.meta.env.VITE_PARTNER_API_URL.replace(/\/+$/, '');
  }
  return 'http://localhost:3004/api/v1';
};

export const API_BASE_URL = getBaseUrl();

/**
 * Retrieve auth token with identical fallback precedence as VillagKart Partner Web.
 */
export const getAuthToken = () => {
  if (typeof window === 'undefined') return '';
  const isShopkeeper = window.location.pathname.startsWith('/shopkeeper') && !window.location.pathname.startsWith('/shopkeeper-erp');
  const partnerTok = localStorage.getItem('partnerToken');
  const genericTok = localStorage.getItem('token');
  const staffTok = sessionStorage.getItem('staffToken') || localStorage.getItem('staffToken');
  return isShopkeeper
    ? (staffTok || genericTok || partnerTok || '')
    : (partnerTok || genericTok || staffTok || '');
};

/**
 * Robust fetch wrapper handling auth headers, JSON payloads, and clear error surfacing.
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `API request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.message || errorData.error || errorMsg;
    } catch {
      // Keep default error message if not json
    }
    const err = new Error(errorMsg);
    err.status = response.status;
    throw err;
  }

  // Handle 204 No Content
  if (response.status === 204) return null;

  return await response.json();
}

/**
 * API methods for QR codes, hubs, analytics, and scan events
 */
export const qrApi = {
  // Hubs
  getHubs: () => apiRequest('/hubs'),

  // QR Codes
  getQRCodes: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/qr${query ? `?${query}` : ''}`);
  },
  getQRCodeById: (id) => apiRequest(`/qr/${id}`),
  createQRCode: (data) =>
    apiRequest('/qr', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateQRCode: (id, data) =>
    apiRequest(`/qr/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteQRCode: (id) =>
    apiRequest(`/qr/${id}`, {
      method: 'DELETE',
    }),

  // Scan Events & Analytics
  getScanEvents: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/qr/scans${query ? `?${query}` : ''}`);
  },
  recordScan: (data) =>
    apiRequest('/qr/scans', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

