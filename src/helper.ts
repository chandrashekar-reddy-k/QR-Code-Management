import { URL, URL_ADMIN } from "./config";
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface FetchError {
  status: number;
  message: string;
  data?: unknown;
}

interface RefreshTokenResponse {
  status: boolean;
  response: string;
  data: {
    accessToken: string;
    refreshToken?: string;
  };
}

// Token refresh state management
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;
let isRedirectingToLogin = false;
const pendingRequests: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

/**
 * Clears all auth data and redirects to login
 */
const clearAuthAndRedirect = () => {
  const isShopkeeper = window.location.pathname.startsWith('/shopkeeper') && !window.location.pathname.startsWith('/shopkeeper-erp');
  console.warn('[AUTH] clearAuthAndRedirect called', {
    pathname: window.location.pathname,
    isShopkeeper,
    isRedirectingToLogin,
    stack: new Error().stack?.split('\n').slice(1, 4).join(' | ')
  });
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
  const path = window.location.pathname || '';
  if (isRedirectingToLogin || path === '/login' || path.startsWith('/login/')) {
    console.warn('[AUTH] Already on login page or redirect in progress, skipping redirect');
    return;
  }
  isRedirectingToLogin = true;
  // Use SPA navigation to avoid full page reload loops.
  window.history.replaceState({}, '', '/login');
  window.dispatchEvent(new PopStateEvent('popstate'));
  // Release lock on next tick in case user logs in again.
  setTimeout(() => {
    isRedirectingToLogin = false;
  }, 0);
};

/**
 * Calls the refresh token API
 */
const refreshAccessToken = async (): Promise<string> => {
  const isShopkeeper = window.location.pathname.startsWith('/shopkeeper') && !window.location.pathname.startsWith('/shopkeeper-erp');
  // Check all possible storage keys for refresh token
  const refreshToken = isShopkeeper
    ? (sessionStorage.getItem('staffRefreshToken') || localStorage.getItem('partnerRefreshToken') || localStorage.getItem('refreshToken'))
    : (localStorage.getItem('partnerRefreshToken') || localStorage.getItem('refreshToken') || sessionStorage.getItem('staffRefreshToken'));

  console.log('[AUTH] refreshAccessToken called', {
    isShopkeeper,
    pathname: window.location.pathname,
    hasRefreshToken: !!refreshToken,
    refreshTokenSource: sessionStorage.getItem('staffRefreshToken') ? 'staffRefreshToken(session)' : localStorage.getItem('partnerRefreshToken') ? 'partnerRefreshToken(local)' : localStorage.getItem('refreshToken') ? 'refreshToken(local)' : 'NONE'
  });

  if (!refreshToken) {
    console.error('[AUTH] refreshAccessToken: No refresh token found in any storage key');
    throw new Error('No refresh token available');
  }

  const identityBaseUrl = import.meta.env.VITE_IDENTITY_SERVICE_URL || 'http://localhost:4000';
  const fullUrl = `${identityBaseUrl.replace(/\/$/, '')}/api/v1/auth/refresh-token`;
  console.log('[AUTH] Calling refresh-token API:', fullUrl);

  const response = await fetch(fullUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  console.log('[AUTH] refresh-token API response status:', response.status);

  if (!response.ok) {
    console.error('[AUTH] refresh-token API failed — clearing auth and redirecting');
    clearAuthAndRedirect();
    throw new Error('Refresh token failed');
  }

  const data: RefreshTokenResponse = await response.json();

  if (data?.data?.accessToken) {
    console.log('[AUTH] Token refreshed successfully');
    // Update access token in all relevant storage locations
    if (isShopkeeper) {
      sessionStorage.setItem('staffToken', data.data.accessToken);
    } else {
      localStorage.setItem('partnerToken', data.data.accessToken);
      localStorage.setItem('token', data.data.accessToken);
    }

    // Update refresh token if provided
    if (data.data.refreshToken) {
      if (isShopkeeper) {
        sessionStorage.setItem('staffRefreshToken', data.data.refreshToken);
      } else {
        localStorage.setItem('partnerRefreshToken', data.data.refreshToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
      }
    }

    return data.data.accessToken;
  }

  console.error('[AUTH] refresh-token response missing accessToken:', data);
  throw new Error('Invalid refresh token response');
};

/**
 * Handles token refresh with request queuing
 * Ensures only one refresh call runs at a time
 */
const handleTokenRefresh = async (): Promise<string> => {
  // If already refreshing, wait for the existing promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  // Start new refresh
  isRefreshing = true;
  refreshPromise = refreshAccessToken()
    .then((token) => {
      // Resolve all pending requests with new token
      pendingRequests.forEach(({ resolve }) => resolve(token));
      pendingRequests.length = 0;
      return token;
    })
    .catch((error) => {
      // Reject all pending requests
      pendingRequests.forEach(({ reject }) => reject(error));
      pendingRequests.length = 0;
      throw error;
    })
    .finally(() => {
      isRefreshing = false;
      refreshPromise = null;
    });

  return refreshPromise;
};

/**
 * Makes an API request with the given options
 */
const makeRequest = async <T>(
  fullUrl: string,
  options: RequestInit,
): Promise<{ response: Response; data: T | null }> => {
  const response = await fetch(fullUrl, options);

  // Parse response
  let data: T | null = null;
  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    data = await response.json().catch(() => null);
  }

  return { response, data };
};

/**
 * Custom fetch wrapper for all API methods
 * @param endpoint - API endpoint path (e.g., '/users' or '/users/1')
 * @param method - HTTP method (GET, POST, PUT, PATCH, DELETE)
 * @param payload - Request body payload (optional)
 * @param isRetry - Whether this is a retry after token refresh
 * @returns Promise with typed response data
 */
async function fetchData<T>(
  endpoint: string,
  method: HttpMethod = "GET",
  payload?: unknown,
  signalOrIsRetry?: AbortSignal | boolean,
  isRetry: boolean = false,
  useAdmin: boolean = false,
): Promise<T> {
  let signal: AbortSignal | undefined;
  if (typeof signalOrIsRetry === "boolean") {
    isRetry = signalOrIsRetry;
  } else {
    signal = signalOrIsRetry;
  }

  try {
    // Get and validate base URL
    const baseUrl = useAdmin ? URL_ADMIN : URL;
    if (!baseUrl) {
      const error = {
        status: 500,
        message: "Base URL not configured",
      } as FetchError;
      throw error;
    }

    // Skip refresh token API from token refresh logic
    const isRefreshTokenEndpoint = endpoint.includes("refresh-token");

    // Auth endpoints that don't require token
    const authEndpointsWithoutToken = [
      "partner/auth/login",
      "partner/auth/forgot-password",
      "partner/auth/verify-otp",
      "partner/auth/verify-reset-otp",
      "partner/auth/resend-otp",
      "partner/auth/create-password",
      "partner/auth/reset-password",
    ];
    const isAuthEndpointWithoutToken = authEndpointsWithoutToken.some(
      (authEndpoint) => endpoint.includes(authEndpoint),
    );

    // Build full URL
    const normalizedEndpoint = endpoint.startsWith("/")
      ? endpoint
      : `/${endpoint}`;
    const fullUrl = `${baseUrl.replace(/\/$/, "")}${normalizedEndpoint}`;

    // Prepare fetch options
    const options: RequestInit = {
      method,
      headers: {},
      signal,
    };

    if (!isAuthEndpointWithoutToken) {
      const isShopkeeper = window.location.pathname.startsWith('/shopkeeper') && !window.location.pathname.startsWith('/shopkeeper-erp');
      // Check multiple storage keys — login hook may store token as 'partnerToken' OR 'token'
      const partnerTok = localStorage.getItem('partnerToken');
      const genericTok = localStorage.getItem('token');
      const staffTok = sessionStorage.getItem('staffToken');
      const token = isShopkeeper
        ? (staffTok || genericTok)
        : (partnerTok || genericTok || staffTok);

      console.log('[AUTH] fetchData token check', {
        endpoint,
        isShopkeeper,
        pathname: window.location.pathname,
        hasPartnerToken: !!partnerTok,
        hasGenericToken: !!genericTok,
        hasStaffToken: !!staffTok,
        resolvedToken: token ? token.substring(0, 20) + '...' : 'NONE'
      });

      if (!token) {
        // Don't fire the request tokenless — wait for refresh if one is in progress
        if (isRefreshing && refreshPromise) {
          console.log('[AUTH] No token but refresh in progress — waiting for refresh');
          const newToken = await refreshPromise;
          options.headers = { ...options.headers, Authorization: `Bearer ${newToken}` };
        } else {
          // No token and no refresh in progress — try to refresh before giving up
          const anyRefreshToken = localStorage.getItem('partnerRefreshToken') || localStorage.getItem('refreshToken') || sessionStorage.getItem('staffRefreshToken');
          console.warn('[AUTH] No access token found. Attempting refresh. Has refresh token:', !!anyRefreshToken);
          if (anyRefreshToken) {
            try {
              const newToken = await handleTokenRefresh();
              options.headers = { ...options.headers, Authorization: `Bearer ${newToken}` };
            } catch (refreshErr) {
              console.error('[AUTH] Token refresh failed in no-token path:', refreshErr);
              clearAuthAndRedirect();
              throw { status: 401, message: 'No auth token. Please login again.' } as FetchError;
            }
          } else {
            console.error('[AUTH] No access token AND no refresh token — logging out');
            clearAuthAndRedirect();
            throw { status: 401, message: 'No auth token. Please login again.' } as FetchError;
          }
        }
      } else {
        options.headers = { ...options.headers, Authorization: `Bearer ${token}` };
      }
    }

    // Add body for POST, PUT, PATCH
    if (payload && ["POST", "PUT", "PATCH"].includes(method)) {
      if (payload instanceof FormData) {
        // Don't set Content-Type for FormData - browser will set it with boundary
        options.body = payload;
      } else {
        options.headers = {
          ...options.headers,
          "Content-Type": "application/json",
        };
        options.body = JSON.stringify(payload);
      }
    } else {
      options.headers = {
        ...options.headers,
        "Content-Type": "application/json",
      };
    }

    // Make request
    const { response, data } = await makeRequest<T>(fullUrl, options);

    // Handle 401 Unauthorized - Token expired (skip for auth endpoints without token requirement)
    if (
      response.status === 401 &&
      !isRefreshTokenEndpoint &&
      !isAuthEndpointWithoutToken &&
      !isRetry
    ) {
      console.warn('[AUTH] Got 401 response for:', endpoint, '— attempting token refresh');
      // Check if we have a refresh token — stored as 'partnerRefreshToken' OR 'refreshToken'
      const refreshToken = localStorage.getItem('partnerRefreshToken') || localStorage.getItem('refreshToken') || sessionStorage.getItem('staffRefreshToken');
      console.log('[AUTH] 401 handler — has refresh token:', !!refreshToken);

      if (refreshToken) {
        try {
          // Wait for token refresh (handles queuing automatically)
          const newToken = await handleTokenRefresh();
          console.log('[AUTH] Token refresh succeeded after 401, retrying request');

          // Retry the original request with new token
          const retryOptions: RequestInit = {
            ...options,
            headers: {
              ...options.headers,
              Authorization: `Bearer ${newToken}`,
            },
            signal,
          };

          const { response: retryResponse, data: retryData } =
            await makeRequest<T>(fullUrl, retryOptions);

          // If retry also fails with 401, clear auth and redirect
          if (retryResponse.status === 401) {
            console.error('[AUTH] Retry after refresh ALSO got 401 — clearing auth');
            clearAuthAndRedirect();
            const retryDataTyped = retryData as { response?: string } | null;
            const error = {
              status: retryResponse.status,
              message: retryDataTyped?.response || 'Authentication failed',
              data: retryData,
            } as FetchError;
            throw error;
          }

          // Handle retry response
          if (!retryResponse.ok) {
            const retryDataTyped = retryData as { response?: string } | null;
            const error = {
              status: retryResponse.status,
              message:
                retryDataTyped?.response ||
                retryResponse.statusText ||
                'Request failed',
              data: retryData,
            } as FetchError;
            throw error;
          }

          return retryData as T;
        } catch (catchErr) {
          // Refresh token failed - already handled in handleTokenRefresh
          // Clear auth and redirect
          console.error('[AUTH] Token refresh FAILED in 401 handler — clearing auth. Error:', catchErr);
          clearAuthAndRedirect();
          const error = {
            status: 401,
            message: 'Session expired. Please login again.',
            data: null,
          } as FetchError;
          throw error;
        }
      } else {
        // No refresh token available - clear auth and redirect
        console.error('[AUTH] 401 received but NO refresh token — clearing auth');
        clearAuthAndRedirect();
        const error = {
          status: 401,
          message: 'Authentication required. Please login again.',
          data: null,
        } as FetchError;
        throw error;
      }
    }

    // Handle errors
    if (!response.ok) {
      const dataTyped = data as { response?: string; message?: string } | null;
      const error = {
        status: response.status,
        message:
          dataTyped?.message ||
          dataTyped?.response ||
          response.statusText ||
          "Request failed",
        data,
      } as FetchError;
      throw error;
    }
    return data as T;
  } catch (error) {
    // Network error
    if (error instanceof TypeError) {
      const networkError = {
        status: 0,
        message: "Network error. Please check your connection.",
      } as FetchError;
      throw networkError;
    }

    // Re-throw FetchError
    throw error;
  }
}

export default fetchData;
export type { FetchError };
