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
  if (isShopkeeper) {
    localStorage.removeItem('staffToken');
    localStorage.removeItem('staffRefreshToken');
    localStorage.removeItem('staffUser');
    localStorage.removeItem('staffRole');
    localStorage.removeItem('staffWarehouseId');
    localStorage.removeItem('staffActiveOrder');
  } else {
    localStorage.removeItem('partnerToken');
    localStorage.removeItem('partnerRefreshToken');
    localStorage.removeItem('partnerUser');
    localStorage.removeItem('partnerRole');
    localStorage.removeItem('partnerWarehouseId');
    localStorage.removeItem('partnerIsAuthenticated');
  }
  sessionStorage.clear();
  const path = window.location.pathname || "";
  if (isRedirectingToLogin || path === "/login" || path.startsWith("/login/")) {
    return;
  }
  isRedirectingToLogin = true;
  // Use SPA navigation to avoid full page reload loops.
  window.history.replaceState({}, "", "/login");
  window.dispatchEvent(new PopStateEvent("popstate"));
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
  const refreshToken = localStorage.getItem(isShopkeeper ? "staffRefreshToken" : "partnerRefreshToken");

  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const baseUrl = URL;
  if (!baseUrl) {
    throw new Error("Base URL not configured");
  }

  const fullUrl = `${baseUrl.replace(/\/$/, "")}/partner/auth/refresh-token`;

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    // Refresh token failed - clear auth and redirect
    clearAuthAndRedirect();
    throw new Error("Refresh token failed");
  }

  const data: RefreshTokenResponse = await response.json();

  if (data?.data?.accessToken) {
    // Update access token
    localStorage.setItem(isShopkeeper ? "staffToken" : "partnerToken", data.data.accessToken);

    // Update refresh token if provided
    if (data.data.refreshToken) {
      localStorage.setItem(isShopkeeper ? "staffRefreshToken" : "partnerRefreshToken", data.data.refreshToken);
    }

    return data.data.accessToken;
  }

  throw new Error("Invalid refresh token response");
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

    // Add Authorization header if token exists and endpoint requires it
    // Skip token for login and other auth endpoints that don't need token
    if (!isAuthEndpointWithoutToken) {
      const isShopkeeper = window.location.pathname.startsWith('/shopkeeper') && !window.location.pathname.startsWith('/shopkeeper-erp');
      const token = localStorage.getItem(isShopkeeper ? "staffToken" : "partnerToken");
      if (!token) {
        // Don't fire the request tokenless — wait for refresh if one is in progress
        if (isRefreshing && refreshPromise) {
          const newToken = await refreshPromise;
          options.headers = { ...options.headers, Authorization: `Bearer ${newToken}` };
        } else {
          // No token, no refresh in progress — redirect to login
          clearAuthAndRedirect();
          throw { status: 401, message: "No auth token. Please login again." } as FetchError;
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
      // Check if we have a refresh token
      const refreshToken = localStorage.getItem("refreshToken");

      if (refreshToken) {
        try {
          // Wait for token refresh (handles queuing automatically)
          const newToken = await handleTokenRefresh();

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
            clearAuthAndRedirect();
            const retryDataTyped = retryData as { response?: string } | null;
            const error = {
              status: retryResponse.status,
              message: retryDataTyped?.response || "Authentication failed",
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
                "Request failed",
              data: retryData,
            } as FetchError;
            throw error;
          }

          return retryData as T;
        } catch {
          // Refresh token failed - already handled in handleTokenRefresh
          // Clear auth and redirect
          clearAuthAndRedirect();
          const error = {
            status: 401,
            message: "Session expired. Please login again.",
            data: null,
          } as FetchError;
          throw error;
        }
      } else {
        // No refresh token available - clear auth and redirect
        clearAuthAndRedirect();
        const error = {
          status: 401,
          message: "Authentication required. Please login again.",
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
