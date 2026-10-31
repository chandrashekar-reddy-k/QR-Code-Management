/**
 * Warehouse Blackout Service – manage delivery blackout dates per warehouse.
 * Prevents duplicate blackout dates (unique warehouseId + date).
 */

import { prisma } from "../config/prismaClient.js";
import logger from "../utils/logger.js";

/**
 * Create a blackout date. Fails if warehouseId+date already exists.
 * @param {string} warehouseId
 * @param {{ date: string, reason?: string }} payload - date YYYY-MM-DD
 * @returns {Promise<{ data: object } | { error: string }>}
 */
export async function createWarehouseBlackout(warehouseId, payload) {
  const dateStr = String(payload.date).trim();
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) {
    return { error: "Invalid date format (use YYYY-MM-DD)" };
  }
  const dateOnly = new Date(Date.UTC(y, m - 1, d));
  const reason = payload.reason != null ? String(payload.reason).trim() : null;

  const existing = await prisma.warehouseDeliveryBlackout.findUnique({
    where: {
      warehouseId_date: { warehouseId, date: dateOnly },
    },
  });
  if (existing) {
    return { error: `Blackout already exists for ${dateStr}` };
  }

  const row = await prisma.warehouseDeliveryBlackout.create({
    data: { warehouseId, date: dateOnly, reason },
  });
  logger.info("[WarehouseBlackout] Created", { warehouseId, date: dateStr });
  return { data: row };
}

/**
 * List blackout dates for warehouse. Optional date range.
 * @param {string} warehouseId
 * @param {{ fromDate?: Date, toDate?: Date }} options
 */
export async function listWarehouseBlackouts(warehouseId, options = {}) {
  const where = { warehouseId };
  if (options.fromDate || options.toDate) {
    where.date = {};
    if (options.fromDate) where.date.gte = options.fromDate;
    if (options.toDate) where.date.lte = options.toDate;
  }

  const rows = await prisma.warehouseDeliveryBlackout.findMany({
    where,
    orderBy: [{ date: "asc" }],
  });
  return rows;
}

/**
 * Delete blackout by id. Returns false if not found or not for this warehouse.
 */
export async function deleteWarehouseBlackout(id, warehouseId) {
  const row = await prisma.warehouseDeliveryBlackout.findFirst({
    where: { id, warehouseId },
  });
  if (!row) return false;
  await prisma.warehouseDeliveryBlackout.delete({ where: { id } });
  logger.info("[WarehouseBlackout] Deleted", { id, warehouseId });
  return true;
}
