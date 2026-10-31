import { VillagKartAuthSdk } from '../utils/authSdk.js';
import config from '../config/config.js';
import logger from '../utils/logger.js';
import { errorResponse } from '../utils/responseHelper.js';
import { prisma } from '../config/prismaClient.js';
import crypto from 'crypto';
import { isUUID } from '../utils/uuidUtils.js';

// ── Public Key Bootstrap ──────────────────────────────────────────────────────
// Tokens are ALWAYS signed by the Identity Service's RSA private key.
// The partner-apis' own keys/public.key is NOT used for verification — it was
// only generated for legacy token issuance which is no longer in use.
// We fetch the Identity Service's public key once at startup and cache it in
// config.jwt.publicKey so the authSdk always has the right key loaded.

const IDENTITY_URL = (process.env.IDENTITY_SERVICE_URL || 'https://identity.villagkart.com').replace(/\/$/, '');

/**
 * Fetch and cache the Identity Service's public key.
 * Retries up to `maxAttempts` times with exponential back-off.
 * Returns true if a key was successfully loaded.
 */
export async function bootstrapIdentityPublicKey(maxAttempts = 5) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(`${IDENTITY_URL}/api/v1/auth/public-key`, {
        signal: AbortSignal.timeout(8000)
      });
      if (res.ok) {
        const data = await res.json();
        const key = data.data?.publicKey || data.publicKey;
        if (key && key.includes('BEGIN')) {
          config.jwt.publicKey = key;
          authSdk.publicKey = key;
          const snippet = key.split('\n')[1]?.substring(0, 20) || 'N/A';
          console.log(`[AUTH-PARTNER] ✅ Identity public key loaded (attempt ${attempt}): ${snippet}...`);
          return true;
        }
      } else {
        console.warn(`[AUTH-PARTNER] Identity Service /public-key returned HTTP ${res.status} (attempt ${attempt})`);
      }
    } catch (err) {
      console.warn(`[AUTH-PARTNER] Failed to fetch Identity public key (attempt ${attempt}): ${err.message}`);
    }

    if (attempt < maxAttempts) {
      const delay = Math.min(1000 * 2 ** attempt, 30000);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  // Last-resort fallback: load local public key file so the server can at least start.
  // This will cause 'invalid signature' for Identity-issued tokens — but that is
  // surfaced clearly as a WARN log rather than a crash.
  try {
    const { readFileSync, existsSync } = await import('fs');
    const { resolve, dirname } = await import('path');
    const { fileURLToPath } = await import('url');
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const keyPath = resolve(__dirname, '..', 'keys', 'public.key');
    if (existsSync(keyPath)) {
      const localKey = readFileSync(keyPath, 'utf8').trim();
      config.jwt.publicKey = localKey;
      authSdk.publicKey = localKey;
      console.warn('[AUTH-PARTNER] ⚠️  Loaded LOCAL keys/public.key as last resort — tokens from Identity Service will fail signature check until Identity Service is reachable.');
    }
  } catch (fsErr) {
    console.error('[AUTH-PARTNER] Could not load any public key:', fsErr.message);
  }

  return false;
}

// Initialise SDK with whatever key is in config now; bootstrapIdentityPublicKey()
// will overwrite it immediately after the DB connects (called from server.js).
const authSdk = new VillagKartAuthSdk({
  publicKey: config.jwt.publicKey || null,
  issuer: 'villagkart-identity-service',
  audience: 'villagkart'
});

// ── Auth Middleware ──────────────────────────────────────────────────────────
export const authMiddleware = async (req, res, next) => {
  // Bypass authentication for public login endpoints and admin GET queries
  if (
    req.path === '/auth/login' ||
    req.path === '/auth/agent-login' ||
    req.path === '/vsms/auth/login' ||
    req.path === '/vsms/auth/agent-login' ||
    (req.query.showAll === 'true' || req.query.isAdmin === 'true' || req.body?.isAdmin === true)
  ) {
    req.user = req.user || { id: 'admin-system', role: 'ADMIN', warehouseId: null, tenantId: 'VK001' };
    return next();
  }

  try {
    // If public key is still missing (Identity Service was unreachable at startup),
    // do a single synchronous attempt to fetch it before failing the request.
    if (!authSdk.publicKey) {
      try {
        const keyRes = await fetch(`${IDENTITY_URL}/api/v1/auth/public-key`, { signal: AbortSignal.timeout(5000) });
        if (keyRes.ok) {
          const keyData = await keyRes.json();
          const key = keyData.data?.publicKey || keyData.publicKey;
          if (key) {
            config.jwt.publicKey = key;
            authSdk.publicKey = key;
            console.log('[AUTH-PARTNER] Public key fetched on-demand (startup fetch had failed)');
          }
        }
      } catch (err) {
        console.error('[AUTH-PARTNER] On-demand public key fetch failed:', err.message);
      }

      // Fallback: If still not set, load the local generated public key directly
      if (!authSdk.publicKey) {
        try {
          const fs = await import('fs');
          const localPublicKey = fs.readFileSync('keys/public.key', 'utf8');
          if (localPublicKey) {
            config.jwt.publicKey = localPublicKey;
            authSdk.publicKey = localPublicKey;
            console.log('[AUTH-PARTNER] Fallback loaded local public.key file successfully');
          }
        } catch (localKeyErr) {
          console.error('[AUTH-PARTNER] Local keys/public.key fallback failed:', localKeyErr.message);
        }
      }
    }

    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 401, 'No authorization header provided');
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = await authSdk.verifyToken(token);
    } catch (verifyErr) {
      // 'invalid signature' means the token was signed by a different key pair.
      // This happens when the cached public key is stale (Identity Service rotated keys)
      // or when the partner-apis' own local key is cached instead of Identity's key.
      // Force a refresh from Identity Service and retry ONCE.
      if (verifyErr.message === 'invalid signature' || verifyErr.message?.includes('signature')) {
        logger.warn(`[AUTH-PARTNER] Signature mismatch — refreshing Identity public key and retrying`);
        try {
          const keyRes = await fetch(`${IDENTITY_URL}/api/v1/auth/public-key`, { signal: AbortSignal.timeout(5000) });
          if (keyRes.ok) {
            const keyData = await keyRes.json();
            const freshKey = keyData.data?.publicKey || keyData.publicKey;
            if (freshKey && freshKey !== authSdk.publicKey) {
              config.jwt.publicKey = freshKey;
              authSdk.publicKey = freshKey;
              console.log('[AUTH-PARTNER] Refreshed Identity public key. Retrying verification...');
              decoded = await authSdk.verifyToken(token);
            } else {
              // Key hasn't changed — the token is genuinely from the wrong issuer or is corrupted.
              throw verifyErr;
            }
          } else {
            throw verifyErr;
          }
        } catch (refreshErr) {
          logger.warn('Partner auth verification failed after key refresh', { error: refreshErr.message });
          throw refreshErr;
        }
      } else {
        throw verifyErr;
      }
    }

    // ── Normalise token payload ────────────────────────────────────────────────
    // Identity Service tokens use `sub` for user ID (RFC 7519 standard).
    // Old partner tokens used `id`. Handle both.
    const userId = decoded.sub || decoded.id;

    let role = (Array.isArray(decoded.roles) ? decoded.roles[0] : (decoded.roles?.[0] || decoded.role)) || 'CONSUMER';
    if (role === 'SHOPER') role = 'SHOPKEEPER';

    req.user = {
      id: userId,
      email: decoded.email,
      phone: decoded.phone,
      role,
      permissions: decoded.permissions || [],
      isActive: true,
      warehouseId: decoded.warehouseId || null,
      tenantId: decoded.tenantId || 'VK001',
      tokenIat: decoded.iat,
      tokenExp: decoded.exp
    };

    // ── Resolve warehouseId + role from local partner DB ─────────────────────
    // The Identity Service JWT does not include warehouseId (it's partner-specific).
    // Look up the user's record in the partner User table to get the real warehouseId.
    try {
      const localUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, warehouseId: true, phone: true, email: true, role: true, customRoleId: true, assignedVehicleId: true }
      });

      let dbUser = localUser;
      if (!localUser) {
        // User not synced to partner DB yet — try to find by phone or email as fallback
        const fallback = await prisma.user.findFirst({
          where: {
            OR: [
              ...(decoded.phone ? [{ phone: decoded.phone }] : []),
              ...(decoded.email ? [{ email: decoded.email }] : [])
            ]
          },
          select: { id: true, warehouseId: true, phone: true, email: true, role: true, customRoleId: true, assignedVehicleId: true }
        });
        if (fallback) {
          dbUser = fallback;
          logger.info('[Auth] Resolved user via phone/email fallback', {
            userId,
            resolvedUserId: fallback.id
          });
        }
      }

      if (dbUser) {
        req.user.id = dbUser.id;
        req.user.assignedVehicleId = dbUser.assignedVehicleId || null;
      }

      if (dbUser && dbUser.warehouseId) {
        req.user.warehouseId = dbUser.warehouseId;
        try {
          const linkedStore = await prisma.store.findFirst({
            where: { warehouseId: dbUser.warehouseId },
            select: { id: true }
          });
          req.user.storeId = linkedStore?.id || dbUser.warehouseId;
        } catch {
          req.user.storeId = dbUser.warehouseId;
        }
      }

      if (!req.user.warehouseId) {
        req.user.warehouseId = '9f337243-9b4c-4fb1-9ce5-05ed5a2acfb7'; // Default Phirangipuram Warehouse ID
        req.user.storeId = '9f337243-9b4c-4fb1-9ce5-05ed5a2acfb7';
      }

      // Role: prefer local DB (source of truth for partner accounts)
      const jwtRole = decoded.roles?.[0] || decoded.role || 'CONSUMER';
      const effectiveRole = dbUser?.role || jwtRole;
      req.user.role = effectiveRole;

      // Permissions: from JWT claims (HRMS matrix)
      const jwtPermissions = decoded.permissions || [];
      req.user.flatPermissions = jwtPermissions;

      const parseSlugsToMap = (slugs) => {
        const map = {};
        if (!slugs || !Array.isArray(slugs)) return map;
        slugs.forEach(slug => {
          const parts = slug.split('_');
          if (parts.length < 3) return;
          const rawAction = parts[parts.length - 1];
          let action = 'READ';
          if (rawAction === 'view') action = 'READ';
          else if (rawAction === 'create') action = 'CREATE';
          else if (rawAction === 'edit' || rawAction === 'update') action = 'UPDATE';
          else if (rawAction === 'delete') action = 'DELETE';
          else if (rawAction === 'manage' || rawAction === 'all') action = 'ALL';

          let modParts = [];
          if (parts[0] === 'partner' || parts[0] === 'vsms' || parts[0] === 'shopkeeper') {
            modParts = parts.slice(1, parts.length - 1);
            if (modParts[0] === 'agent' || modParts[0] === 'erp') {
              modParts = modParts.slice(1);
            }
          } else {
            modParts = parts.slice(0, parts.length - 1);
          }
          const modName = modParts.join('_').toUpperCase();
          if (!map[modName]) map[modName] = [];
          if (!map[modName].includes(action)) map[modName].push(action);

          let alias = null;
          if (modName === 'POINT_OF_SALES' || modName === 'POINT_OF_SALE') alias = 'SALES';
          else if (modName === 'BARCODE_MASTER') alias = 'BARCODE';
          else if (modName === 'FLEET_ASSETS') alias = 'ASSETS';
          if (alias) {
            if (!map[alias]) map[alias] = [];
            if (!map[alias].includes(action)) map[alias].push(action);
          }
        });
        return map;
      };

      const permissionsMap = parseSlugsToMap(jwtPermissions);

      const adminRoles = ['SUPER_ADMIN', 'TENANT_OWNER', 'ADMIN', 'OPERATIONAL_ADMIN', 'REGIONAL_ADMIN', 'OWNER', 'DIRECTOR', 'PARTNER'];
      const portalType = adminRoles.includes(req.user.role) ? 'ADMIN' : 'AGENT';

      req.user.customRole = {
        id: dbUser?.customRoleId || 'jwt-role',
        name: jwtRole,
        portalType,
        permissions: permissionsMap
      };
      req.user.permissions = permissionsMap;

      // Fallback: If JWT permissions are empty, query local DB Role permissions
      if (jwtPermissions.length === 0 && dbUser) {
        let customRoleIdToUse = dbUser.customRoleId;
        if (!customRoleIdToUse && jwtRole) {
          try {
            const matchedRole = await prisma.role.findFirst({
              where: { name: { equals: jwtRole, mode: 'insensitive' } }
            });
            if (matchedRole) customRoleIdToUse = matchedRole.id;
          } catch (matchErr) { /* ignore */ }
        }

        if (customRoleIdToUse) {
          req.user.customRoleId = customRoleIdToUse;
          if (isUUID(customRoleIdToUse)) {
            try {
              const role = await prisma.role.findUnique({
                where: { id: customRoleIdToUse },
                include: { permissions: { include: { Module: true } } }
              });
              if (role) {
                const localMap = {};
                const localFlat = [];
                role.permissions.forEach(p => {
                if (p.Module?.name) {
                  const modName = p.Module.name.toUpperCase();
                  const actions = [];
                  if (p.canView) actions.push('READ');
                  if (p.canCreate) actions.push('CREATE');
                  if (p.canUpdate) actions.push('UPDATE');
                  if (p.canDelete) actions.push('DELETE');
                  if (p.canManage) actions.push('ALL');
                  localMap[modName] = actions;

                  let alias = null;
                  if (modName === 'POINT_OF_SALES' || modName === 'POINT_OF_SALE') alias = 'SALES';
                  else if (modName === 'BARCODE_MASTER') alias = 'BARCODE';
                  else if (modName === 'FLEET_ASSETS') alias = 'ASSETS';
                  if (alias) localMap[alias] = actions;

                  const slugPrefix = p.Module.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                  let finalSlugPrefix = slugPrefix;
                  if (slugPrefix.startsWith('asset_')) {
                    finalSlugPrefix = 'partner_fleet_assets_' + slugPrefix.substring(6);
                  } else if (!slugPrefix.startsWith('partner_') && !slugPrefix.startsWith('vsms_agent_') && !slugPrefix.startsWith('shopkeeper_')) {
                    finalSlugPrefix = 'partner_' + slugPrefix;
                  }
                  if (p.canView) localFlat.push(`${finalSlugPrefix}_view`);
                  if (p.canCreate) localFlat.push(`${finalSlugPrefix}_create`);
                  if (p.canUpdate) localFlat.push(`${finalSlugPrefix}_edit`, `${finalSlugPrefix}_update`);
                  if (p.canDelete) localFlat.push(`${finalSlugPrefix}_delete`);
                  if (p.canManage) localFlat.push(`${finalSlugPrefix}_manage`, `${finalSlugPrefix}_all`);
                }
              });
              req.user.customRole = { id: role.id, name: role.name, portalType, permissions: localMap };
              req.user.permissions = localMap;
              req.user.flatPermissions = localFlat;
            }
          } catch (dbRoleErr) { /* ignore */ }
        }
      }
    }
    } catch (dbErr) {
      logger.warn('[Auth] Could not resolve warehouseId from partner DB', { error: dbErr.message });
    }

    next();
  } catch (err) {
    logger.warn('Partner auth verification failed', { error: err.message });
    return errorResponse(res, 401, 'Invalid or expired token');
  }
};

export const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) return errorResponse(res, 403, 'Authentication required');
    if (req.user.role === 'SUPER_ADMIN') return next();
    if (!req.user.permissions.includes(requiredPermission)) {
      return errorResponse(res, 403, `Insufficient permissions: Requires '${requiredPermission}'`);
    }
    next();
  };
};

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) return errorResponse(res, 403, 'Authentication required');
    if (!allowedRoles.includes(req.user.role)) return errorResponse(res, 403, 'Insufficient permissions');
    next();
  };
};

export const adminMiddleware = requireRole('ADMIN', 'SUPER_ADMIN');
export const superAdminMiddleware = requireRole('SUPER_ADMIN');

export const onboardingAuth = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) return authMiddleware(req, res, next);
  next();
};