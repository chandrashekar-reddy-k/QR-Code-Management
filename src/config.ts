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
export const URL = (import.meta.env.VITE_URL as string | undefined)?.trim().replace(/\/+$/, '') || '';

/** 
 * Admin API base URL 
 */
export const URL_ADMIN = (import.meta.env.VITE_URL_ADMIN as string | undefined)?.trim().replace(/\/+$/, '') || '';

/** 
 * Agent API base URL 
 */
export const URL_AGENT = (import.meta.env.VITE_URL_AGENT as string | undefined)?.trim().replace(/\/+$/, '') || '';

export const GOOGLE_MAP_API_KEY =
  import.meta.env.VITE_GOOGLE_MAP_API_KEY;