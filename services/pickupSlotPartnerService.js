/**
 * Pickup Slot Partner Service – CRUD for PickupSlot (partner-managed).
 * Supports repeat rules: creates one PickupSlot row per date (expanded from repeat pattern).
 */

import { prisma } from "../config/prismaClient.js";
import logger from "../utils/logger.js";

const REPEAT_WINDOW_DAYS = 90;
const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function toUTCDateOnly(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Expand repeat pattern into concrete dates (UTC).
 * @param {Date} slotDate - first date
 * @param {string} repeatType - ONCE | DAILY | WEEKLY | MON_FRI | SUN | CUSTOM
 * @param {string[]} customDays - e.g. ["MON","TUE"]
 * @returns {Date[]}
 */
function getExpandedDates(slotDate, repeatType, customDays) {
  if (!repeatType || repeatType === "ONCE") {
    return [toUTCDateOnly(slotDate)];
  }
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + REPEAT_WINDOW_DAYS);
  const slotDay = toUTCDateOnly(slotDate);
  if (slotDay < start) return [slotDay];

  const customDayNumbers =
    Array.isArray(customDays) && customDays.length > 0
      ? customDays.map((d) => DAY_NAMES.indexOf(String(d).toUpperCase())).filter((n) => n >= 0)
      : [];

  const dates = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const d = toUTCDateOnly(cursor);
    const weekday = cursor.getUTCDay();
    let include = false;
    switch (repeatType) {
      case "DAILY":
        include = true;
        break;
      case "MON_FRI":
        include = weekday >= 1 && weekday <= 5;
        break;
      case "SUN":
        include = weekday === 0;
        break;
      case "WEEKLY":
        include = d.getUTCDay() === slotDay.getUTCDay();
        break;
      case "CUSTOM":
        include = customDayNumbers.includes(weekday);
        break;
      default:
        include = false;
    }
    if (include && d >= slotDay) dates.push(d);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates.length ? dates : [slotDay];
}

/**
 * Check if a time range overlaps any existing PickupSlot on the same warehouse and date.
 * Overlap: start1 < end2 && end1 > start2.
 */
async function hasOverlap(prismaClient, warehouseId, date, startTime, endTime, excludeId = null) {
  const where = {
    warehouseId,
    date,
    isActive: true,
    AND: [
      { startTime: { lt: endTime } },
      { endTime: { gt: startTime } },
    ],
  };
  if (excludeId) where.id = { not: excludeId };
  const count = await prismaClient.pickupSlot.count({ where });
  return count > 0;
}

/**
 * Create pickup slot(s). If repeat, creates one row per expanded date.
 * Validates slot overlap per date. Enforces capacity >= 1.
 * @param {object} prismaClient - Prisma client (or prisma)
 * @param {string} warehouseId
 * @param {{ date: string, startTime: string, endTime: string, slot?: string, capacity?: number, repeat?: boolean, repeatType?: string, customDays?: string[] }} payload
 * @returns {Promise<{ created: number, ids: string[] } | { error: string }>}
 */
export async function createPickupSlots(prismaClient, warehouseId, payload) {
  const dateStr = String(payload.date).trim();
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) {
    return { error: "Invalid date format (use YYYY-MM-DD)" };
  }
  const firstDate = new Date(Date.UTC(y, m - 1, d));
  const startTime = String(payload.startTime).trim();
  const endTime = String(payload.endTime).trim();
  const slotLabel = payload.slot != null ? String(payload.slot).trim() : `${startTime}-${endTime}`;
  const capacity = Math.max(1, Math.min(1000, Number(payload.capacity) || 10));
  const repeat = Boolean(payload.repeat);
  const repeatType = payload.repeatType || "ONCE";
  const customDays = Array.isArray(payload.customDays) ? payload.customDays : [];

  const dates = getExpandedDates(firstDate, repeat ? repeatType : "ONCE", customDays);

  for (const date of dates) {
    const overlapping = await hasOverlap(prismaClient, warehouseId, date, startTime, endTime);
    if (overlapping) {
      const dateOnly = date.toISOString().slice(0, 10);
      return { error: `Slot time ${startTime}-${endTime} overlaps an existing slot on ${dateOnly}` };
    }
  }

  const created = [];
  for (const date of dates) {
    const row = await prismaClient.pickupSlot.create({
      data: {
        warehouseId,
        date,
        startTime,
        endTime,
        slot: slotLabel,
        capacity,
        booked: 0,
        repeat,
        repeatType: repeat ? repeatType : null,
        customDays: repeat && customDays.length ? customDays : [],
        isActive: true,
      },
    });
    created.push(row);
  }

  logger.info("[PickupSlotPartner] Created", {
    warehouseId,
    count: created.length,
    startTime,
    endTime,
  });

  return { created: created.length, ids: created.map((r) => r.id) };
}

/**
 * List pickup slots for warehouse with pagination. Optional filter by date range (fromDate, toDate).
 * @param {string} warehouseId
 * @param {{ fromDate?: Date, toDate?: Date, page?: number, limit?: number }} options
 * @returns {Promise<{ rows: import('@prisma/client').PickupSlot[], total: number }>}
 */
export async function listPickupSlots(warehouseId, options = {}) {
  const where = { warehouseId };
  if (options.fromDate || options.toDate) {
    where.date = {};
    if (options.fromDate) where.date.gte = options.fromDate;
    if (options.toDate) where.date.lte = options.toDate;
  }

  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    prisma.pickupSlot.findMany({
      where,
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      skip,
      take: limit,
    }),
    prisma.pickupSlot.count({ where }),
  ]);
  return { rows, total, page, limit };
}

/**
 * Get one pickup slot by id. Returns null if not found or not in warehouse.
 */
export async function getPickupSlotById(id, warehouseId) {
  return prisma.pickupSlot.findFirst({
    where: { id, warehouseId },
  });
}

/**
 * Update pickup slot. Validates overlap if start/end time or date change.
 * Cannot set capacity below current booked count.
 */
export async function updatePickupSlot(prismaClient, id, warehouseId, payload) {
  const existing = await prismaClient.pickupSlot.findFirst({
    where: { id, warehouseId },
  });
  if (!existing) return null;

  const updates = {};
  if (payload.date !== undefined) {
    const dateStr = String(payload.date).trim();
    const [y, m, d] = dateStr.split("-").map(Number);
    if (y && m && d) updates.date = new Date(Date.UTC(y, m - 1, d));
  }
  if (payload.startTime !== undefined) updates.startTime = String(payload.startTime).trim();
  if (payload.endTime !== undefined) updates.endTime = String(payload.endTime).trim();
  if (payload.slot !== undefined) updates.slot = String(payload.slot).trim();
  if (payload.capacity !== undefined) {
    const cap = Math.max(1, Math.min(1000, Number(payload.capacity)));
    if (cap < existing.booked) return { error: `Capacity cannot be less than current booked (${existing.booked})` };
    updates.capacity = cap;
  }
  if (payload.repeat !== undefined) updates.repeat = Boolean(payload.repeat);
  if (payload.repeatType !== undefined) updates.repeatType = payload.repeatType || null;
  if (payload.customDays !== undefined) updates.customDays = Array.isArray(payload.customDays) ? payload.customDays : [];
  if (payload.isActive !== undefined) updates.isActive = Boolean(payload.isActive);

  const newDate = updates.date ?? existing.date;
  const newStart = updates.startTime ?? existing.startTime;
  const newEnd = updates.endTime ?? existing.endTime;
  const overlapping = await hasOverlap(prismaClient, warehouseId, newDate, newStart, newEnd, id);
  if (overlapping) {
    return { error: "Updated slot time would overlap an existing slot on this date" };
  }

  const updated = await prismaClient.pickupSlot.update({
    where: { id },
    data: updates,
  });
  return { data: updated };
}

/**
 * Delete (or soft-deactivate) pickup slot. If slot has bookings, prefer isActive: false.
 */
export async function deletePickupSlot(prismaClient, id, warehouseId) {
  const existing = await prismaClient.pickupSlot.findFirst({
    where: { id, warehouseId },
  });
  if (!existing) return false;
  if (existing.booked > 0) {
    await prismaClient.pickupSlot.update({
      where: { id },
      data: { isActive: false },
    });
    logger.info("[PickupSlotPartner] Deactivated (has bookings)", { id, warehouseId });
  } else {
    await prismaClient.pickupSlot.delete({ where: { id } });
    logger.info("[PickupSlotPartner] Deleted", { id, warehouseId });
  }
  return true;
}
