/**
 * Slot release utilities for partner-api (reject order flow).
 * Mirrors consumer deliverySlotUtils + pickupSlotService release logic so that
 * DeliverySlot and PickupSlot capacity is restored when partner rejects an order.
 * All functions expect to be called inside a Prisma transaction (tx).
 */
import logger from "./logger.js";

const SLOT_RELEASE_RETRIES = 2;
const SLOT_RELEASE_RETRY_MS = 80;

function toUTCDateOnly(date) {
  if (date instanceof Date) {
    if (Number.isNaN(date.getTime())) return null;
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }
  if (date == null) return null;
  const s = String(date).trim();
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

function normalizeLegacySlotKey(slotString) {
  if (!slotString || typeof slotString !== "string") return slotString;
  const s = slotString.trim();
  if (/^MORNING(-|$)/i.test(s)) return "MORNING";
  if (/^AFTERNOON(-|$)/i.test(s)) return "AFTERNOON";
  if (/^EVENING(-|$)/i.test(s)) return "EVENING";
  if (/^NIGHT(-|$)/i.test(s)) return "NIGHT";
  return s;
}

/**
 * Release one capacity from a DeliverySlot by id. Run inside transaction.
 */
export async function releaseDeliverySlotByIdWithTx(tx, deliverySlotId) {
  if (!deliverySlotId) return;
  const result = await tx.$queryRaw`
    UPDATE "DeliverySlot"
    SET "booked" = "booked" - 1
    WHERE "id" = ${deliverySlotId}
      AND "booked" > 0
    RETURNING id, "booked"
  `;
  const updated = Array.isArray(result) ? result[0] : result;
  if (!updated) {
    logger.warn("[SlotRelease] Delivery slot release by id skipped", { deliverySlotId });
    return;
  }
  logger.info("[SlotRelease] Delivery slot released (by id)", { deliverySlotId });
}

/**
 * Release one capacity from DeliverySlot by (warehouseId, date, slot, routeMapId). Run inside transaction.
 */
export async function releaseDeliverySlotWithTx(tx, warehouseId, date, slot, routeMapId = undefined) {
  const deliveryDate = toUTCDateOnly(date);
  if (!deliveryDate) return;
  const slotKey = normalizeLegacySlotKey(slot);

  let row = null;
  if (routeMapId != null && routeMapId !== "") {
    row = await tx.deliverySlot.findFirst({
      where: { warehouseId, date: deliveryDate, slot: slotKey, routeMapId },
      select: { id: true, booked: true, routeMapId: true },
    });
  }
  if (!row) {
    row = await tx.deliverySlot.findFirst({
      where: { warehouseId, date: deliveryDate, slot: slotKey, routeMapId: null },
      select: { id: true, booked: true, routeMapId: true },
    });
  }
  if (!row || row.booked <= 0) {
    const candidates = await tx.deliverySlot.findMany({
      where: { warehouseId, date: deliveryDate, slot: slotKey, booked: { gt: 0 } },
      select: { id: true, booked: true, routeMapId: true },
    });
    if (candidates.length === 0) {
      logger.warn("[SlotRelease] No DeliverySlot row with booked > 0", {
        warehouseId,
        date: deliveryDate,
        slot: slotKey,
      });
      return;
    }
    row = candidates.find((c) => c.routeMapId === null) ?? candidates[0];
  }

  const result = await tx.$queryRaw`
    UPDATE "DeliverySlot"
    SET "booked" = "booked" - 1
    WHERE "id" = ${row.id}
      AND "booked" > 0
    RETURNING id, "booked"
  `;
  const updated = Array.isArray(result) ? result[0] : result;
  if (!updated) return;
  logger.info("[SlotRelease] Delivery slot released", {
    warehouseId,
    date: deliveryDate,
    slot: slotKey,
    slotId: row.id,
  });
}

/**
 * Release delivery slot with retries. Returns { released: boolean, error?: string }.
 */
export async function releaseDeliverySlotWithTxRetry(tx, warehouseId, date, slot, routeMapId = undefined) {
  let lastErr = null;
  for (let attempt = 0; attempt <= SLOT_RELEASE_RETRIES; attempt++) {
    try {
      await releaseDeliverySlotWithTx(tx, warehouseId, date, slot, routeMapId);
      return { released: true };
    } catch (err) {
      lastErr = err;
      if (attempt < SLOT_RELEASE_RETRIES) {
        await new Promise((r) => setTimeout(r, SLOT_RELEASE_RETRY_MS));
      }
    }
  }
  return { released: false, error: lastErr?.message };
}

/**
 * Release pickup slot for an order. Run inside transaction.
 */
export async function releasePickupSlot(tx, order) {
  if (!order?.pickupSlotId) return;
  const result = await tx.$queryRaw`
    UPDATE "PickupSlot"
    SET "booked" = "booked" - 1
    WHERE "id" = ${order.pickupSlotId}
      AND "booked" > 0
    RETURNING id, "booked"
  `;
  const updated = Array.isArray(result) ? result[0] : result;
  if (!updated) {
    logger.warn("[SlotRelease] Pickup slot release skipped", { pickupSlotId: order.pickupSlotId });
    return;
  }
  logger.info("[SlotRelease] Pickup slot released", { pickupSlotId: order.pickupSlotId });
}
