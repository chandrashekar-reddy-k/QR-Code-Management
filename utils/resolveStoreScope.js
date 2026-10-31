/**
 * resolveStoreScope.js
 *
 * Shared utility for resolving a storeId / warehouseId from a request into
 * a Prisma-compatible `storeId` filter object.
 *
 * Problem solved:
 *   The frontend sends the warehouse UUID as `storeId` (because the user
 *   object only has `warehouseId`, not a `storeId`). Multiple stores can be
 *   linked to a single warehouse. Previously, `findFirst` was used to resolve
 *   the storeId which returned an arbitrary store — often the wrong one.
 *
 * Solution:
 *   When the incoming ID matches a Warehouse, return `{ in: [all store IDs
 *   for that warehouse] }` so queries return data from ALL stores under that
 *   warehouse, or narrow to one store if a direct Store ID is provided.
 */

import prisma from './prisma.js';

/**
 * Resolves a raw ID (store or warehouse) to a Prisma where-clause fragment.
 *
 * @param {string|null} rawId  - The raw ID from query/body/user
 * @returns {Promise<{storeId: string|{in: string[]}|undefined}>}
 *   An object with a `storeId` key suitable for spreading into a Prisma where.
 *   Returns `{}` (no filter) when the ID cannot be resolved.
 */
export async function resolveStoreScopeFilter(rawId) {
  if (!rawId || rawId === 'undefined' || rawId === 'null' || rawId === '') {
    return {};
  }

  // 1. Try as a direct Store ID first
  const directStore = await prisma.store.findUnique({
    where: { id: rawId },
    select: { id: true, warehouseId: true },
  });
  if (directStore) {
    if (directStore.warehouseId) {
      const warehouseStores = await prisma.store.findMany({
        where: { warehouseId: directStore.warehouseId },
        select: { id: true },
      });
      if (warehouseStores.length > 0) {
        const ids = warehouseStores.map((s) => s.id);
        return ids.length === 1 ? { storeId: ids[0] } : { storeId: { in: ids } };
      }
    }
    return { storeId: rawId };
  }

  // 2. Try as a Warehouse ID — return ALL store IDs under that warehouse
  const warehouseStores = await prisma.store.findMany({
    where: { warehouseId: rawId },
    select: { id: true },
  });
  if (warehouseStores.length > 0) {
    const ids = warehouseStores.map((s) => s.id);
    return ids.length === 1 ? { storeId: ids[0] } : { storeId: { in: ids } };
  }

  // 3. Fallback: treat the rawId as a storeId literally
  //    (covers edge cases like migrated CUIDs)
  return { storeId: rawId };
}

/**
 * Resolves the best single storeId for WRITE operations (create/update).
 * Prefers the oldest store (by createdAt asc) when a warehouseId is given,
 * which tends to be the primary/main store for that warehouse.
 *
 * @param {string|null} rawId
 * @returns {Promise<string|null>}
 */
export async function resolveWriteStoreId(rawId) {
  if (!rawId || rawId === 'undefined' || rawId === 'null' || rawId === '') {
    return null;
  }

  // 1. Direct Store ID
  const directStore = await prisma.store.findUnique({
    where: { id: rawId },
    select: { id: true },
  });
  if (directStore) return directStore.id;

  // 2. Warehouse ID — pick the oldest (primary) store
  const primaryStore = await prisma.store.findFirst({
    where: { warehouseId: rawId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  return primaryStore?.id ?? null;
}

/**
 * Convenience: extract raw ID from req (query > body > user.storeId > user.warehouseId)
 * and return the scope filter.
 *
 * @param {object} req  - Express request
 * @returns {Promise<{storeId?: string|{in: string[]}}>}
 */
export async function resolveStoreScopeFromReq(req) {
  const rawId =
    req.query?.storeId ||
    req.body?.storeId ||
    req.user?.storeId ||
    req.user?.warehouseId ||
    null;
  return resolveStoreScopeFilter(rawId);
}
