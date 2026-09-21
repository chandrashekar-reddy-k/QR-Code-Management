/** Consumer-api Socket.IO origin (no path), e.g. https://consumer-api.example.com */
export const CONSUMER_SOCKET_ORIGIN =
  (import.meta.env.VITE_CONSUMER_SOCKET_ORIGIN as string | undefined)?.trim().replace(/\/+$/, '') || ''

const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const isDev = typeof window !== 'undefined' && (
  window.location.hostname.includes('dev') ||
  window.location.hostname.includes('dpartner') ||
  window.location.hostname.includes('uat') ||
  window.location.hostname.includes('dadmin') ||
  window.location.hostname.includes('stage')
);

/** 
 * Partner API base URL 
 * DEV: https://apierppartner.villagkart.com/api/v1
 * PROD: https://hubapi.villagkart.com/api/v1
 */
export const URL = (() => {
  if (isLocal) {
    return (import.meta.env.VITE_URL as string | undefined)?.trim().replace(/\/+$/, '') || 'http://localhost:3004/api/v1';
  }
  if (isDev) {
    return 'https://apierppartner.villagkart.com/api/v1';
  }
  return (import.meta.env.VITE_URL as string | undefined)?.trim() && !(import.meta.env.VITE_URL as string).includes('localhost')
    ? (import.meta.env.VITE_URL as string).trim().replace(/\/+$/, '')
    : 'https://hubapi.villagkart.com/api/v1';
})();

/** 
 * Admin API base URL 
 * DEV: https://apierpadmin.villagkart.com/api/v1
 * PROD: https://hubapi.villagkart.com/api/v1
 */
export const URL_ADMIN = (() => {
  if (isLocal) {
    return (import.meta.env.VITE_URL_ADMIN as string | undefined)?.trim().replace(/\/+$/, '') || 'http://localhost:3001/api/v1';
  }
  if (isDev) {
    return 'https://apierpadmin.villagkart.com/api/v1';
  }
  return (import.meta.env.VITE_URL_ADMIN as string | undefined)?.trim() && !(import.meta.env.VITE_URL_ADMIN as string).includes('localhost')
    ? (import.meta.env.VITE_URL_ADMIN as string).trim().replace(/\/+$/, '')
    : 'https://hubapi.villagkart.com/api/v1';
})();

/** 
 * Agent API base URL 
 * DEV: https://apierppartner.villagkart.com/api/v1/agent
 * PROD: https://hubapi.villagkart.com/api/v1/agent
 */
export const URL_AGENT = (() => {
  if (isLocal) {
    return (import.meta.env.VITE_URL_AGENT as string | undefined)?.trim().replace(/\/+$/, '') || 'http://localhost:3004/api/v1/agent';
  }
  if (isDev) {
    return 'https://apierppartner.villagkart.com/api/v1/agent';
  }
  return (import.meta.env.VITE_URL_AGENT as string | undefined)?.trim() && !(import.meta.env.VITE_URL_AGENT as string).includes('localhost')
    ? (import.meta.env.VITE_URL_AGENT as string).trim().replace(/\/+$/, '')
    : 'https://hubapi.villagkart.com/api/v1/agent';
})();

export const GOOGLE_MAP_API_KEY =
  import.meta.env.VITE_GOOGLE_MAP_API_KEY;