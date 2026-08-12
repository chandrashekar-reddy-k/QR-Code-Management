/** Consumer-api Socket.IO origin (no path), e.g. https://consumer-api.example.com */
export const CONSUMER_SOCKET_ORIGIN =
  (import.meta.env.VITE_CONSUMER_SOCKET_ORIGIN as string | undefined)?.trim().replace(/\/+$/, '') || ''

/** Partner API base URL */
export const URL =
  window.location.hostname === 'localhost' 
    ? 'http://localhost:3004/api/v1' 
    : (import.meta.env.VITE_URL || "https://devpartnerapi.villagkart.com/api/v1/").replace(/\/+$/, '');

/** Admin API base URL */
export const URL_ADMIN =
  window.location.hostname === 'localhost' 
    ? 'http://localhost:3004/api/v1' 
    : (import.meta.env.VITE_URL_ADMIN || "https://superadminapi.villagkart.com/api/v1/").replace(/\/+$/, '');

/** Agent API base URL (served by main partner-apis, merged from vsms-agent-apis) */
export const URL_AGENT =
  import.meta.env.VITE_URL_AGENT || "http://localhost:3004/api/v1/agent";

export const GOOGLE_MAP_API_KEY =
  import.meta.env.VITE_GOOGLE_MAP_API_KEY;