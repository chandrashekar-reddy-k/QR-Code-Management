/**
 * hrmsSSO.ts
 *
 * Utility to open the HRMS portal with an SSO ticket.
 * Handles the case where the access token may have expired (e.g. long idle session)
 * by attempting a silent token refresh before generating the SSO ticket.
 */

const IDENTITY_BASE = () =>
  (import.meta.env.VITE_IDENTITY_SERVICE_URL || 'https://identity.villagkart.com').replace(/\/+$/, '');

const PARTNER_API_BASE = () =>
  (import.meta.env.VITE_URL || 'http://localhost:3004/api/v1').replace(/\/+$/, '');

const HRMS_URL = () => import.meta.env.VITE_HRMS_URL || 'http://localhost:8088';

/** Reads the best available access token from localStorage */
function getStoredToken(): string | null {
  return (
    localStorage.getItem('partnerToken') ||
    localStorage.getItem('token') ||
    localStorage.getItem('authToken') ||
    null
  );
}

/** Reads the best available refresh token from localStorage */
function getStoredRefreshToken(): string | null {
  return (
    localStorage.getItem('partnerRefreshToken') ||
    localStorage.getItem('refreshToken') ||
    null
  );
}

/** Persists a freshly issued access token to all localStorage keys in use */
function persistNewToken(newToken: string) {
  if (localStorage.getItem('partnerToken') !== null) localStorage.setItem('partnerToken', newToken);
  if (localStorage.getItem('token') !== null) localStorage.setItem('token', newToken);
}

/**
 * Attempts a silent token refresh using the stored refresh token.
 * Returns the new access token, or null if refresh fails.
 */
async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  try {
    const identityUrl = import.meta.env.VITE_IDENTITY_SERVICE_URL || 'http://localhost:4000';
    const res = await fetch(`${identityUrl}/api/v1/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const newToken = data?.data?.accessToken || data?.accessToken || null;
    if (newToken) {
      persistNewToken(newToken);
      // Also update refresh token if a new one is returned
      const newRefresh = data?.data?.refreshToken || data?.refreshToken;
      if (newRefresh) {
        if (localStorage.getItem('partnerRefreshToken') !== null)
          localStorage.setItem('partnerRefreshToken', newRefresh);
        if (localStorage.getItem('refreshToken') !== null)
          localStorage.setItem('refreshToken', newRefresh);
      }
    }
    return newToken;
  } catch {
    return null;
  }
}

/**
 * Generates an SSO ticket from the Identity Service using the given access token.
 * Returns the ticket string, or null on failure.
 */
async function generateSSOTicket(token: string): Promise<string | null> {
  try {
    const res = await fetch(`${IDENTITY_BASE()}/api/v1/auth/sso/ticket`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body?.data?.ticket || null;
  } catch {
    return null;
  }
}

/**
 * Opens the HRMS portal.
 * 1. Gets the stored access token.
 * 2. Tries to get an SSO ticket. If that fails with a likely-expired token,
 *    silently refreshes and retries once.
 * 3. Opens HRMS with the SSO ticket for automatic login.
 *    Falls back to plain HRMS URL if all attempts fail.
 */
export async function openHRMSPortal(): Promise<void> {
  const hrmsUrl = HRMS_URL();
  let token = getStoredToken();

  if (!token) {
    window.open(`${hrmsUrl}/`, '_blank');
    return;
  }

  // First attempt
  let ticket = await generateSSOTicket(token);

  // If ticket generation failed, the token may have expired → try refresh
  if (!ticket) {
    console.info('[HRMS SSO] Ticket generation failed, attempting silent token refresh…');
    const refreshedToken = await tryRefreshToken();
    if (refreshedToken) {
      ticket = await generateSSOTicket(refreshedToken);
    }
  }

  if (ticket) {
    window.open(`${hrmsUrl}/?sso_ticket=${ticket}`, '_blank');
  } else {
    // Fallback: open HRMS without SSO — user will see the login page
    console.warn('[HRMS SSO] Could not generate SSO ticket after refresh. Opening HRMS without SSO.');
    window.open(`${hrmsUrl}/`, '_blank');
  }
}
