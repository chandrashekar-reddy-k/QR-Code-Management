/** Consumer-api Socket.IO origin (no path), e.g. https://consumer-api.example.com */
export const CONSUMER_SOCKET_ORIGIN =
  (import.meta.env.VITE_CONSUMER_SOCKET_ORIGIN as string | undefined)?.trim().replace(/\/+$/, '') || ''

/** Partner API base URL */
export const URL =
  import.meta.env.VITE_URL || "https://devpartnerapi.villagkart.com/api/v1/";

/** Admin API base URL */
export const URL_ADMIN =
  import.meta.env.VITE_URL_ADMIN || "https://dadminapi.villagkart.com/api/v1/";

export const GOOGLE_MAP_API_KEY =
  import.meta.env.VITE_GOOGLE_MAP_API_KEY;