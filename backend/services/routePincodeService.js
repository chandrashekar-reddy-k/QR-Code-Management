/**
 * Route Pincode Service – attach pincodes to RouteMap for checkout route resolution.
 * Used by partner route-pincode APIs. Validates route belongs to warehouse.
 */

import { prisma } from "../config/prismaClient.js";
import logger from "../utils/logger.js";

/**
 * Ensure route map belongs to partner's warehouse.
 * @param {string} routeMapId
 * @param {string} warehouseId
 * @returns {Promise<{ id: string, warehouseId: string } | null>}
 */
export async function getRouteMapIfBelongsToWarehouse(routeMapId, warehouseId) {
  const route = await prisma.routeMap.findFirst({
    where: { id: routeMapId, warehouseId },
    select: { id: true, warehouseId: true },
  });
  return route;
}

/**
 * Create route pincodes (bulk). Prevents duplicates per route (unique constraint).
 * @param {string} routeMapId
 * @param {string} warehouseId
 * @param {string[]} pincodes - array of pincode strings (trimmed, non-empty)
 * @returns {Promise<{ created: number, skipped: number, createdIds: string[] }>}
 */
export async function createRoutePincodes(routeMapId, warehouseId, pincodes) {
  const route = await getRouteMapIfBelongsToWarehouse(routeMapId, warehouseId);
  if (!route) {
    return null;
  }

  const normalized = [...new Set(pincodes.map((p) => String(p).trim()).filter(Boolean))];
  if (normalized.length === 0) {
    return { created: 0, skipped: 0, createdIds: [] };
  }

  const existing = await prisma.routeMapPincode.findMany({
    where: { routeMapId, pincode: { in: normalized } },
    select: { pincode: true },
  });
  const existingSet = new Set(existing.map((r) => r.pincode));
  const toCreate = normalized.filter((p) => !existingSet.has(p));

  if (toCreate.length === 0) {
    return { created: 0, skipped: normalized.length, createdIds: [] };
  }

  const created = await prisma.routeMapPincode.createMany({
    data: toCreate.map((pincode) => ({ routeMapId, pincode })),
    skipDuplicates: true,
  });

  const createdRecords = await prisma.routeMapPincode.findMany({
    where: { routeMapId, pincode: { in: toCreate } },
    select: { id: true },
  });

  logger.info("[RoutePincode] Bulk create", {
    routeMapId,
    warehouseId,
    created: created.count,
    skipped: normalized.length - created.count,
  });

  return {
    created: created.count,
    skipped: normalized.length - created.count,
    createdIds: createdRecords.map((r) => r.id),
  };
}

/**
 * List route pincodes, optionally by routeId. Scoped to warehouse's route maps.
 * @param {string} warehouseId
 * @param {{ routeId?: string }} options
 * @returns {Promise<Array<{ id: string, routeMapId: string, pincode: string, createdAt: Date }>>}
 */
export async function listRoutePincodes(warehouseId, options = {}) {
  const where = {
    routeMap: { warehouseId },
  };
  if (options.routeId) {
    where.routeMapId = options.routeId;
  }

  const rows = await prisma.routeMapPincode.findMany({
    where,
    orderBy: [{ routeMapId: "asc" }, { pincode: "asc" }],
    select: {
      id: true,
      routeMapId: true,
      pincode: true,
      createdAt: true,
    },
  });
  return rows;
}

/**
 * Delete a route pincode by id. Ensures it belongs to a route of the warehouse.
 * @param {string} id
 * @param {string} warehouseId
 * @returns {Promise<boolean>} true if deleted
 */
export async function deleteRoutePincode(id, warehouseId) {
  const row = await prisma.routeMapPincode.findFirst({
    where: {
      id,
      routeMap: { warehouseId },
    },
    select: { id: true },
  });
  if (!row) return false;
  await prisma.routeMapPincode.delete({ where: { id } });
  logger.info("[RoutePincode] Deleted", { id, warehouseId });
  return true;
}
