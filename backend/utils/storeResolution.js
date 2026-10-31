/**
 * Utility to resolve the effective store ID for a request.
 * Handles global roles (TENANT_OWNER, SUPER_ADMIN, ADMIN) vs restricted roles.
 * Priority: req.query.storeId (for global) > req.user.storeId
 */
export const getEffectiveStoreId = (req) => {
    if (!req.user) return null;

    const queryStoreId = req.query?.storeId;
    const bodyStoreId = req.body?.storeId;
    const user = req.user;

    const userStoreId = user.warehouseId || user.storeId || null;

    // Normalize input storeId ('all', 'undefined', 'null', '' -> null)
    const targetStoreId = (queryStoreId && queryStoreId !== 'undefined' && queryStoreId !== 'null' && queryStoreId !== 'all' && queryStoreId !== '') 
        ? queryStoreId 
        : ((bodyStoreId && bodyStoreId !== 'undefined' && bodyStoreId !== 'null' && bodyStoreId !== 'all' && bodyStoreId !== '') ? bodyStoreId : null);

    const isSuperGlobal = 
        user.role === 'TENANT_OWNER' || 
        user.role === 'SUPER_ADMIN' || 
        user.role === 'ADMIN' ||
        user.role === 'PARTNER' ||
        user.role === 'OWNER' ||
        user.role === 'DIRECTOR' ||
        user.role === 'REGIONAL_ADMIN' ||
        user.role === 'OPERATIONAL_ADMIN' ||
        user.portalType === 'ADMIN' ||
        !user.customRoleId;

    if (isSuperGlobal) {
        return targetStoreId || null;
    }

    // For store-restricted accounts: prioritize assigned warehouseId (userStoreId)
    return targetStoreId || userStoreId || null;
};
