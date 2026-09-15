/** Consumer-api Socket.IO origin (no path), e.g. https://consumer-api.example.com */
export const CONSUMER_SOCKET_ORIGIN =
  (import.meta.env.VITE_CONSUMER_SOCKET_ORIGIN as string | undefined)?.trim().replace(/\/+$/, '') || ''

/** Partner API base URL */
export const URL =
  (import.meta.env.VITE_URL as string | undefined)?.trim()
    ? (import.meta.env.VITE_URL as string).trim().replace(/\/+$/, '')
    : (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
      ? 'http://localhost:3004/api/v1' 
      : "https://apierppartner.villagkart.com/api/v1";

/** Admin API base URL */
export const URL_ADMIN =
  (import.meta.env.VITE_URL_ADMIN as string | undefined)?.trim()
    ? (import.meta.env.VITE_URL_ADMIN as string).trim().replace(/\/+$/, '')
    : (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
      ? 'http://localhost:3004/api/v1' 
      : "https://apierpadmin.villagkart.com/api/v1";

/** Agent API base URL (served by main partner-apis, merged from vsms-agent-apis) */
export const URL_AGENT =
  (import.meta.env.VITE_URL_AGENT as string | undefined)?.trim()
    ? (import.meta.env.VITE_URL_AGENT as string).trim().replace(/\/+$/, '')
    : (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
      ? 'http://localhost:3004/api/v1/agent'
      : "https://apierppartner.villagkart.com/api/v1/agent";

export const GOOGLE_MAP_API_KEY =
  import.meta.env.VITE_GOOGLE_MAP_API_KEY;