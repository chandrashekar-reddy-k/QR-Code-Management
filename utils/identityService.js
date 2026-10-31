/**
 * identityService.js
 * Utility for Admin/Partner APIs to create users in the Identity Service
 * as the single source of truth. The returned identityUserId is then used
 * as the primary key in the local DB.
 */

function getIdentityConfig() {
  const url = (process.env.IDENTITY_SERVICE_URL || 'http://localhost:4000').replace(/\/+$/, '');
  const secret = process.env.IDENTITY_SERVICE_INTERNAL_SECRET || 'hrms-identity-internal-secret-2024';
  return { url, secret };
}

/**
 * Creates a user in the Identity Service and returns the user object with { id, email, phone, name }.
 * If the user already exists (409), the existing identity id is returned so local DB can reuse it.
 * Throws an error if the call fails for any other reason.
 *
 * @param {{ name?: string, email?: string, phone?: string, password: string, role?: string }} userData
 * @returns {Promise<{ id: string, email: string|null, phone: string|null, name: string|null }>}
 */
export async function createIdentityUser({ name, email, phone, password, role, customRoleId }) {
  const { url: baseUrl, secret } = getIdentityConfig();
  let url = `${baseUrl}/api/v1/internal/users`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': secret,
      },
      body: JSON.stringify({ name, email, phone, password, role, customRoleId }),
    });
  } catch (err) {
    if (!baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
      console.warn(`[Identity] Failed to connect to ${baseUrl}, falling back to localhost:4000`);
      url = `http://localhost:4000/api/v1/internal/users`;
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': secret,
        },
        body: JSON.stringify({ name, email, phone, password, role, customRoleId }),
      });
    } else {
      throw err;
    }
  }

  // If response is 404 (Not Found) and we haven't tried localhost yet, try local service
  if (response.status === 404 && !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
    console.warn(`[Identity] Configured URL returned 404, falling back to localhost:4000`);
    url = `http://localhost:4000/api/v1/internal/users`;
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': secret,
      },
      body: JSON.stringify({ name, email, phone, password, role, customRoleId }),
    });
  }

  const body = await response.json();

  // 409 = already exists in Identity Service - reuse the existing identity id
  if (response.status === 409 && body.id) {
    return { id: body.id, email: email || null, phone: phone || null, name: name || null, _reused: true };
  }

  if (!response.ok) {
    throw new Error(`Identity Service user creation failed: ${body.error || response.statusText}`);
  }

  return {
    id: body.data.id,
    email: body.data.email,
    phone: body.data.phone,
    name: body.data.name,
    roleId: body.data.roleId || null
  };
}

/**
 * Updates a user in the Identity Service by id.
 *
 * @param {string} identityUserId
 * @param {{ name?: string, email?: string, phone?: string, password?: string }} updateData
 * @returns {Promise<any>}
 */
export async function updateIdentityUser(identityUserId, { name, email, phone, password, passwordChangeCompleted }) {
  const { url: baseUrl, secret } = getIdentityConfig();
  let url = `${baseUrl}/api/v1/internal/users/${identityUserId}`;

  const payload = { name, email, phone, password, ...(passwordChangeCompleted !== undefined ? { passwordChangeCompleted } : {}) };

  let response;
  try {
    response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': secret,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    if (!baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
      console.warn(`[Identity] Failed to connect to ${baseUrl}, falling back to localhost:4000`);
      url = `http://localhost:4000/api/v1/internal/users/${identityUserId}`;
      response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': secret,
        },
        body: JSON.stringify(payload),
      });
    } else {
      throw err;
    }
  }

  if (response.status === 404 && !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
    console.warn(`[Identity] Configured URL returned 404, falling back to localhost:4000`);
    url = `http://localhost:4000/api/v1/internal/users/${identityUserId}`;
    response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': secret,
      },
      body: JSON.stringify(payload),
    });
  }

  const body = await response.json();

  if (!response.ok) {
    throw new Error(`Identity Service user update failed: ${body.error || response.statusText}`);
  }

  return body;
}

/**
 * Deletes a user in the Identity Service by id.
 *
 * @param {string} identityUserId
 * @returns {Promise<any>}
 */
export async function deleteIdentityUser(identityUserId) {
  const { url: baseUrl, secret } = getIdentityConfig();
  let url = `${baseUrl}/api/v1/internal/users/${identityUserId}`;

  let response;
  try {
    response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'x-internal-secret': secret,
      },
    });
  } catch (err) {
    if (!baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
      console.warn(`[Identity] Failed to connect to ${baseUrl}, falling back to localhost:4000`);
      url = `http://localhost:4000/api/v1/internal/users/${identityUserId}`;
      response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'x-internal-secret': secret,
        },
      });
    } else {
      throw err;
    }
  }

  if (response.status === 404 && !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
    console.warn(`[Identity] Configured URL returned 404, falling back to localhost:4000`);
    url = `http://localhost:4000/api/v1/internal/users/${identityUserId}`;
    response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'x-internal-secret': secret,
      },
    });
  }

  const body = await response.json();

  if (!response.ok) {
    throw new Error(`Identity Service user deletion failed: ${body.error || response.statusText}`);
  }

  return body;
}

/**
 * Updates a user's role in the Identity Service by id.
 *
 * @param {string} identityUserId
 * @param {string} roleName
 * @param {string} [email]
 * @returns {Promise<any>}
 */
export async function updateIdentityUserRole(identityUserId, roleName, email = null) {
  const { url: baseUrl, secret } = getIdentityConfig();
  let url = `${baseUrl}/api/v1/internal/users/${identityUserId}/role`;

  let response;
  try {
    response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': secret,
      },
      body: JSON.stringify({ roleName, email }),
    });
  } catch (err) {
    if (!baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
      console.warn(`[Identity] Failed to connect to ${baseUrl}, falling back to localhost:4000`);
      url = `http://localhost:4000/api/v1/internal/users/${identityUserId}/role`;
      response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': secret,
        },
        body: JSON.stringify({ roleName, email }),
      });
    } else {
      throw err;
    }
  }

  if (response.status === 404 && !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
    console.warn(`[Identity] Configured URL returned 404, falling back to localhost:4000`);
    url = `http://localhost:4000/api/v1/internal/users/${identityUserId}/role`;
    response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': secret,
      },
      body: JSON.stringify({ roleName, email }),
    });
  }

  const body = await response.json();

  if (!response.ok) {
    throw new Error(`Identity Service user role update failed: ${body.error || response.statusText}`);
  }

  return body;
}

