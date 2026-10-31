// controllers/deliverySettingsController.js
// Partner delivery settings: warehouse config, delivery types, route maps, scheduled slots, route pincodes, pickup slots, blackouts
import { prisma } from "../config/prismaClient.js";
import logger from "../utils/logger.js";
import {
  errorResponse,
  successResponse,
  paginatedResponse,
} from "../utils/responseHelper.js";
import * as routePincodeService from "../services/routePincodeService.js";
import * as pickupSlotPartnerService from "../services/pickupSlotPartnerService.js";
import * as warehouseBlackoutService from "../services/warehouseBlackoutService.js";

/**
 * Soft-deactivate DeliverySlot row(s) that correspond to a ScheduledDeliverySlot.
 * Used when partner deletes a scheduled slot so consumer no longer sees or books it.
 * Existing orders keep valid deliverySlotId; release still finds row by (warehouseId, date, slot).
 *
 * @param {object} prismaClient - Prisma client
 * @param {{ slot: { slotDate: Date, startTime: string, endTime: string }, warehouseId: string }} params
 * @returns {Promise<{ count: number }>} updateMany result
 */
/**
 * Soft-deactivate DeliverySlot row(s) for this scheduled slot. When routeMapId is set, only that route's row is deactivated.
 */
export async function deactivateDeliverySlotsForScheduledSlot(prismaClient, { slot, warehouseId }) {
  const slotKey = `${String(slot.startTime).trim()}-${String(slot.endTime).trim()}`;
  const dateNormalized = new Date(
    Date.UTC(slot.slotDate.getUTCFullYear(), slot.slotDate.getUTCMonth(), slot.slotDate.getUTCDate())
  );
  const where = {
    warehouseId,
    date: dateNormalized,
    slot: slotKey,
  };
  if (slot.routeMapId) {
    where.routeMapId = slot.routeMapId;
  }
  return prismaClient.deliverySlot.updateMany({
    where,
    data: { isActive: false },
  });
}

/**
 * Parse YYYY-MM-DD as date-only in UTC to avoid timezone shift (store correct calendar day).
 * Returns Date instance suitable for Prisma @db.Date.
 */
function parseDateOnlyUTC(dateStr) {
  const s = String(dateStr || "").trim();
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

const REPEAT_EXPANSION_WINDOW_DAYS = 30;

/**
 * Get UTC date-only for a given day (midnight UTC).
 */
function toUTCDateOnly(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Expand repeat pattern into concrete dates (UTC) for the next windowDays from today.
 * Used to create DeliverySlot rows for each date when isRepeat is true.
 *
 * @param {Date} slotDate - First slot date (UTC date-only)
 * @param {string} repeatType - ONCE | DAILY | WEEKLY | MON_FRI | SUN | CUSTOM
 * @param {string[]} customDays - For CUSTOM: e.g. ["MON", "TUE"]
 * @param {number} windowDays - Number of days to expand (e.g. 30)
 * @returns {Date[]} Array of UTC date-only Date objects
 */
function getExpandedDates(slotDate, repeatType, customDays, windowDays = REPEAT_EXPANSION_WINDOW_DAYS) {
  if (!repeatType || repeatType === "ONCE") {
    return [toUTCDateOnly(slotDate)];
  }
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + windowDays);
  const slotDay = toUTCDateOnly(slotDate);
  if (slotDay < start) return [];

  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const customDayNumbers = Array.isArray(customDays) && customDays.length > 0
    ? customDays.map((d) => dayNames.indexOf(String(d).toUpperCase())).filter((n) => n >= 0)
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
 * Bridge: ensure a DeliverySlot row exists for Consumer booking when Partner creates/updates ScheduledDeliverySlot.
 * Uses (warehouseId, date, slot, routeMapId) for per-route capacity. Idempotent: findFirst then create or update.
 *
 * @param {object} prismaClient - Prisma client
 * @param {{ warehouseId: string, slotDate: Date, startTime: string, endTime: string, ordersPerSlot: number, routeMapId: string }} params
 */
async function syncScheduledSlotToDeliverySlot(prismaClient, {
  warehouseId,
  slotDate,
  startTime,
  endTime,
  ordersPerSlot,
  routeMapId,
}) {
  if (!warehouseId || !slotDate || !startTime || !endTime) return;
  const slotKey = `${String(startTime).trim()}-${String(endTime).trim()}`;
  const requestedCapacity = Math.max(1, parseInt(ordersPerSlot, 10) || 10);
  const dateNormalized = slotDate instanceof Date
    ? toUTCDateOnly(slotDate)
    : parseDateOnlyUTC(slotDate);
  if (!dateNormalized) return;
  const routeId = routeMapId || null;
  try {
    const existing = await prismaClient.deliverySlot.findFirst({
      where: {
        warehouseId,
        date: dateNormalized,
        slot: slotKey,
        routeMapId: routeId,
      },
      select: { id: true, booked: true },
    });
    const booked = existing?.booked ?? 0;
    const capacity = Math.max(requestedCapacity, booked);
    if (capacity > requestedCapacity) {
      logger.warn("[DeliverySettings] DeliverySlot capacity capped to current booked", {
        warehouseId,
        slot: slotKey,
        routeMapId: routeId,
        date: dateNormalized,
        requestedCapacity,
        booked,
        capacity,
      });
    }
    if (existing) {
      await prismaClient.deliverySlot.update({
        where: { id: existing.id },
        data: { capacity },
      });
    } else {
      await prismaClient.deliverySlot.create({
        data: {
          warehouseId,
          date: dateNormalized,
          slot: slotKey,
          routeMapId: routeId,
          capacity,
          booked: 0,
          isActive: true,
        },
      });
    }
  } catch (err) {
    logger.warn("[DeliverySettings] Sync ScheduledDeliverySlot -> DeliverySlot failed", {
      warehouseId,
      slotDate: dateNormalized,
      slot: slotKey,
      routeMapId: routeId,
      error: err.message,
    });
  }
}


/**
 * Get partner's warehouse ID
 */
const getPartnerWarehouseId = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { warehouseId: true },
    });
    if (user?.warehouseId && user.warehouseId !== "00000000-0000-0000-0000-000000000000") {
      return user.warehouseId;
    }
  } catch (err) {
    logger.warn("getPartnerWarehouseId query failed in deliverySettingsController", err);
  }

  return null;
};

/**
 * GET /api/v1/partner/delivery-settings
 * Get partner's delivery settings (warehouse config, charges, slots, self-pickup)
 */
export const getDeliverySettings = async (req, res) => {
  try {
    const userId = req.user.id;

    const warehouseId = await getPartnerWarehouseId(userId);
    if (!warehouseId) {
      return errorResponse(
        res,
        403,
        "Warehouse not configured for your account. Please complete onboarding.",
      );
    }

    const [
      warehouse,
      deliveryChargeRules,
      deliverySlots,
      scheduledDeliverySlotsCount,
      vendorSetting,
      warehouseDeliverySetting,
      masterDeliverySettings,
    ] = await Promise.all([
      prisma.warehouse.findUnique({
        where: { id: warehouseId },
        select: {
          id: true,
          name: true,
          servicePincodes: true,
          opensAt: true,
          closesAt: true,
          pickupTimeSlots: true,
          isPickupStore: true,
        },
      }),
      prisma.deliveryChargeRule.findMany({
        where: { warehouseId, isActive: true },
        select: {
          id: true,
          pincode: true,
          minOrderValue: true,
          maxOrderValue: true,
          charge: true,
          freeAbove: true,
        },
      }),
      prisma.deliverySlot.findMany({
        where: { warehouseId, isActive: true },
        take: 30,
        orderBy: [{ date: "asc" }, { slot: "asc" }],
        select: {
          id: true,
          date: true,
          slot: true,
          capacity: true,
          booked: true,
        },
      }),
      prisma.scheduledDeliverySlot.count({ where: { warehouseId } }),
      prisma.vendorSetting.findUnique({
        where: { userId },
        select: {
          selfPickupMode: true,
          requireProductApproval: true,
        },
      }),
      prisma.warehouseDeliverySetting.findUnique({
        where: { warehouseId },
        select: {
          expressSettingsEnabled: true,
          selfPickupEnabled: true,
          scheduledDeliveryEnabled: true,
          defaultDeliveryCharge: true,
          expressDeliveryCharge: true,
          scheduledDeliveryCharge: true,
          expressFreeDeliveryThreshold: true,
          scheduledFreeDeliveryThreshold: true,
          freeDeliveryThreshold: true,
        },
      }),
      prisma.masterDeliverySetting.findMany({
        orderBy: { displayOrder: "asc" },
        select: { type: true, isEnabledByDefault: true, defaultCharge: true, freeDeliveryThreshold: true },
      }),
    ]);

    if (!warehouse) {
      return errorResponse(res, 404, "Warehouse not found");
    }

    const settings = {
      warehouse: {
        id: warehouse.id,
        name: warehouse.name,
        servicePincodes: warehouse.servicePincodes,
        opensAt: warehouse.opensAt,
        closesAt: warehouse.closesAt,
        pickupTimeSlots: warehouse.pickupTimeSlots,
        isPickupStore: warehouse.isPickupStore,
      },
      deliveryChargeRules,
      deliverySlots,
      scheduledDeliverySlotsCount,
      vendor: vendorSetting || {
        selfPickupMode: false,
        requireProductApproval: false,
      },
      deliveryTypes: (() => {
        const w = warehouseDeliverySetting;
        const masters = masterDeliverySettings || [];
        const expressMaster = masters.find((m) => m.type === "FAST");
        const scheduledMaster = masters.find((m) => m.type === "SCHEDULED");
        const selfPickupMaster = masters.find((m) => m.type === "PICKUP_STORE");
        const expressThreshold =
          w?.expressFreeDeliveryThreshold != null
            ? Number(w.expressFreeDeliveryThreshold)
            : w?.freeDeliveryThreshold != null
              ? Number(w.freeDeliveryThreshold)
              : expressMaster?.freeDeliveryThreshold != null
                ? Number(expressMaster.freeDeliveryThreshold)
                : null;
        const scheduledThreshold =
          w?.scheduledFreeDeliveryThreshold != null
            ? Number(w.scheduledFreeDeliveryThreshold)
            : scheduledMaster?.freeDeliveryThreshold != null
              ? Number(scheduledMaster.freeDeliveryThreshold)
              : null;
        return {
          expressSettingsEnabled:
            w?.expressSettingsEnabled ?? expressMaster?.isEnabledByDefault ?? false,
          selfPickupEnabled:
            w?.selfPickupEnabled ?? selfPickupMaster?.isEnabledByDefault ?? false,
          scheduledDeliveryEnabled:
            w?.scheduledDeliveryEnabled ?? scheduledMaster?.isEnabledByDefault ?? false,
          defaultDeliveryCharge:
            w?.expressDeliveryCharge != null
              ? Number(w.expressDeliveryCharge)
              : w?.defaultDeliveryCharge != null
                ? Number(w.defaultDeliveryCharge)
                : expressMaster?.defaultCharge != null
                  ? Number(expressMaster.defaultCharge)
                  : null,
          scheduledDeliveryCharge:
            w?.scheduledDeliveryCharge != null
              ? Number(w.scheduledDeliveryCharge)
              : w?.defaultDeliveryCharge != null
                ? Number(w.defaultDeliveryCharge)
                : scheduledMaster?.defaultCharge != null
                  ? Number(scheduledMaster.defaultCharge)
                  : null,
          expressFreeDeliveryThreshold: expressThreshold,
          scheduledFreeDeliveryThreshold: scheduledThreshold,
          freeDeliveryThreshold: expressThreshold,
        };
      })(),
    };

    return successResponse(
      res,
      200,
      settings,
      "Delivery settings fetched successfully",
    );
  } catch (error) {
    logger.error("[DeliverySettings] Error fetching settings", {
      error: error.message,
      userId: req.user?.id,
    });
    return errorResponse(res, 500, "Failed to fetch delivery settings");
  }
};

/**
 * PUT /api/v1/partner/delivery-settings
 * Update partner's delivery settings
 * Body: { servicePincodes?, opensAt?, closesAt?, pickupTimeSlots?, isPickupStore?, selfPickupMode? }
 */
export const updateDeliverySettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      servicePincodes,
      opensAt,
      closesAt,
      pickupTimeSlots,
      isPickupStore,
      selfPickupMode,
    } = req.body;

    const warehouseId = await getPartnerWarehouseId(userId);
    if (!warehouseId) {
      return errorResponse(
        res,
        403,
        "Warehouse not configured for your account. Please complete onboarding.",
      );
    }

    const warehouseUpdate = {};
    if (servicePincodes !== undefined) {
      if (!Array.isArray(servicePincodes)) {
        return errorResponse(
          res,
          400,
          "servicePincodes must be an array of pincodes",
        );
      }
      warehouseUpdate.servicePincodes = servicePincodes;
    }
    if (opensAt !== undefined) {
      const trimmed = String(opensAt).trim();
      if (closesAt !== undefined && String(closesAt).trim() && trimmed >= String(closesAt).trim()) {
        return errorResponse(res, 400, "opensAt must be before closesAt");
      }
      warehouseUpdate.opensAt = trimmed;
    }
    if (closesAt !== undefined) {
      const trimmed = String(closesAt).trim();
      if (opensAt !== undefined && String(opensAt).trim() && String(opensAt).trim() >= trimmed) {
        return errorResponse(res, 400, "opensAt must be before closesAt");
      }
      warehouseUpdate.closesAt = trimmed;
    }
    if (pickupTimeSlots !== undefined)
      warehouseUpdate.pickupTimeSlots = pickupTimeSlots;
    if (typeof isPickupStore === "boolean")
      warehouseUpdate.isPickupStore = isPickupStore;

    const updates = [];

    if (Object.keys(warehouseUpdate).length > 0) {
      updates.push(
        prisma.warehouse.update({
          where: { id: warehouseId },
          data: warehouseUpdate,
        }),
      );
    }

    if (typeof selfPickupMode === "boolean") {
      updates.push(
        prisma.vendorSetting.upsert({
          where: { userId },
          create: { userId, selfPickupMode },
          update: { selfPickupMode },
        }),
      );
    }

    if (updates.length === 0) {
      return errorResponse(res, 400, "No valid fields to update");
    }

    await Promise.all(updates);

    logger.info("[DeliverySettings] Settings updated", { userId, warehouseId });

    return successResponse(
      res,
      200,
      null,
      "Delivery settings updated successfully",
    );
  } catch (error) {
    logger.error("[DeliverySettings] Error updating settings", {
      error: error.message,
      userId: req.user?.id,
    });
    return errorResponse(res, 500, "Failed to update delivery settings");
  }
};

// ---------------------------------------------------------------------------
// Delivery Types (Express, Self Pickup, Scheduled Delivery)
// ---------------------------------------------------------------------------

const DEFAULT_DELIVERY_CHARGE = 30;

/**
 * GET /api/v1/partner/delivery-settings/types
 * Get partner's delivery type toggles (Express, Scheduled, Self Pickup).
 * Defaults come from MasterDeliverySetting; warehouse overrides from WarehouseDeliverySetting.
 * Returns deliverySettings array with isEnabled, label, deliveryCharge per type.
 */
export const getDeliveryTypes = async (req, res) => {
  try {
    const userId = req.user.id;
    let warehouseId = await getPartnerWarehouseId(userId);
    if (!warehouseId && ["SUPER_ADMIN", "REGIONAL_ADMIN", "OPERATIONAL_ADMIN", "ADMIN"].includes(req.user?.role)) {
      warehouseId = req.query?.warehouseId || req.headers?.["x-warehouse-id"] || null;
      if (!warehouseId) {
        const firstWh = await prisma.warehouse.findFirst({
          where: { isActive: true },
          select: { id: true },
          orderBy: { name: "asc" },
        });
        warehouseId = firstWh?.id || null;
      }
    }
    if (!warehouseId) {
      return errorResponse(
        res,
        403,
        "Warehouse not configured for your account. Please complete onboarding.",
      );
    }
    const [masterSettings, warehouseSetting] = await Promise.all([
      prisma.masterDeliverySetting.findMany({
        orderBy: { displayOrder: "asc" },
        select: {
          type: true,
          label: true,
          isEnabledByDefault: true,
          defaultCharge: true,
          freeDeliveryThreshold: true,
        },
      }),
      prisma.warehouseDeliverySetting.findUnique({
        where: { warehouseId },
        select: {
          expressSettingsEnabled: true,
          selfPickupEnabled: true,
          scheduledDeliveryEnabled: true,
          defaultDeliveryCharge: true,
          expressDeliveryCharge: true,
          scheduledDeliveryCharge: true,
          expressFreeDeliveryThreshold: true,
          scheduledFreeDeliveryThreshold: true,
          freeDeliveryThreshold: true,
        },
      }),
    ]);

    const w = warehouseSetting;
    const byType = (master) => {
      const charge = Number(master.defaultCharge ?? 0);
      if (master.type === "FAST") {
        const expressCharge =
          w?.expressDeliveryCharge != null
            ? Number(w.expressDeliveryCharge)
            : w?.defaultDeliveryCharge != null
              ? Number(w.defaultDeliveryCharge)
              : charge;
        const expressThreshold =
          w?.expressFreeDeliveryThreshold != null
            ? Number(w.expressFreeDeliveryThreshold)
            : w?.freeDeliveryThreshold != null
              ? Number(w.freeDeliveryThreshold)
              : master.freeDeliveryThreshold != null
                ? Number(master.freeDeliveryThreshold)
                : null;
        return {
          isEnabled: w?.expressSettingsEnabled ?? master.isEnabledByDefault,
          label: master.label,
          deliveryCharge: expressCharge,
          freeDeliveryThreshold: expressThreshold,
        };
      }
      if (master.type === "SCHEDULED") {
        const scheduledCharge =
          w?.scheduledDeliveryCharge != null
            ? Number(w.scheduledDeliveryCharge)
            : w?.defaultDeliveryCharge != null
              ? Number(w.defaultDeliveryCharge)
              : charge;
        const scheduledThreshold =
          w?.scheduledFreeDeliveryThreshold != null
            ? Number(w.scheduledFreeDeliveryThreshold)
            : master.freeDeliveryThreshold != null
              ? Number(master.freeDeliveryThreshold)
              : null;
        return {
          isEnabled: w?.scheduledDeliveryEnabled ?? master.isEnabledByDefault,
          label: master.label,
          deliveryCharge: scheduledCharge,
          freeDeliveryThreshold: scheduledThreshold,
        };
      }
      if (master.type === "PICKUP_STORE") {
        return {
          isEnabled: w?.selfPickupEnabled ?? master.isEnabledByDefault,
          label: master.label,
          deliveryCharge: 0,
          freeDeliveryThreshold: null,
        };
      }
      return {
        isEnabled: master.isEnabledByDefault,
        label: master.label,
        deliveryCharge: charge,
        freeDeliveryThreshold:
          master.freeDeliveryThreshold != null
            ? Number(master.freeDeliveryThreshold)
            : null,
      };
    };

    const deliverySettings =
      masterSettings.length > 0
        ? masterSettings.map(byType)
        : [
          {
            isEnabled: w?.expressSettingsEnabled ?? true,
            label: "Express Settings",
            deliveryCharge:
              w?.expressDeliveryCharge != null
                ? Number(w.expressDeliveryCharge)
                : w?.defaultDeliveryCharge != null
                  ? Number(w.defaultDeliveryCharge)
                  : 60,
            freeDeliveryThreshold:
              w?.expressFreeDeliveryThreshold != null
                ? Number(w.expressFreeDeliveryThreshold)
                : w?.freeDeliveryThreshold != null
                  ? Number(w.freeDeliveryThreshold)
                  : null,
          },
          {
            isEnabled: w?.scheduledDeliveryEnabled ?? true,
            label: "Scheduled Delivery",
            deliveryCharge:
              w?.scheduledDeliveryCharge != null
                ? Number(w.scheduledDeliveryCharge)
                : w?.defaultDeliveryCharge != null
                  ? Number(w.defaultDeliveryCharge)
                  : 30,
            freeDeliveryThreshold:
              w?.scheduledFreeDeliveryThreshold != null
                ? Number(w.scheduledFreeDeliveryThreshold)
                : null,
          },
          {
            isEnabled: w?.selfPickupEnabled ?? false,
            label: "Self Pickup",
            deliveryCharge: 0,
            freeDeliveryThreshold: null,
          },
        ];

    const defaultDeliveryCharge =
      deliverySettings[0]?.deliveryCharge != null
        ? deliverySettings[0].deliveryCharge
        : w?.defaultDeliveryCharge != null
          ? Number(w.defaultDeliveryCharge)
          : DEFAULT_DELIVERY_CHARGE;

    const data = {
      deliverySettings,
      defaultDeliveryCharge,
    };
    return successResponse(
      res,
      200,
      data,
      "Delivery types fetched successfully",
    );
  } catch (error) {
    logger.error("[DeliveryTypes] Error fetching", {
      error: error.message,
      userId: req.user?.id,
    });
    return errorResponse(res, 500, "Failed to fetch delivery types");
  }
};

/**
 * Map deliverySettings array (from request) to WarehouseDeliverySetting fields.
 * Matches by label (trimmed) first; if no match, falls back to order: [0]=Express, [1]=Scheduled, [2]=Self Pickup.
 * defaultDeliveryCharge in DB is taken from Express Settings' deliveryCharge (or defaultDeliveryCharge).
 */
const LABEL_EXPRESS = "Express Settings";
const LABEL_SCHEDULED = "Scheduled Delivery";
const LABEL_SELF_PICKUP = "Self Pickup";

const mapDeliverySettingsToData = (deliverySettings) => {
  const data = {};
  if (!Array.isArray(deliverySettings) || deliverySettings.length === 0)
    return data;

  const parseNum = (val) => {
    if (val === undefined || val === null || val === "") return null;
    const num = Number(val);
    return Number.isFinite(num) && num >= 0 ? num : null;
  };

  const byLabel = (item) => {
    const label = typeof item.label === "string" ? item.label.trim() : "";
    const charge =
      item.deliveryCharge ?? item.defaultDeliveryCharge ?? undefined;
    const chargeNum = parseNum(charge);
    const threshold =
      item.freeDeliveryThreshold ?? item.freeDeliveryMinimumOrderValue;
    const thresholdNum = parseNum(threshold);
    const enabled = item.isEnabled === true;

    if (label === LABEL_EXPRESS) {
      data.expressSettingsEnabled = enabled;
      data.defaultDeliveryCharge =
        chargeNum !== null ? chargeNum : DEFAULT_DELIVERY_CHARGE;
      data.expressDeliveryCharge =
        chargeNum !== null ? chargeNum : DEFAULT_DELIVERY_CHARGE;
      data.expressFreeDeliveryThreshold = thresholdNum;
      data.freeDeliveryThreshold = thresholdNum;
    } else if (label === LABEL_SCHEDULED) {
      data.scheduledDeliveryEnabled = enabled;
      data.scheduledDeliveryCharge =
        chargeNum !== null ? chargeNum : DEFAULT_DELIVERY_CHARGE;
      data.scheduledFreeDeliveryThreshold = thresholdNum;
    } else if (label === LABEL_SELF_PICKUP) {
      data.selfPickupEnabled = enabled;
    }
  };

  const byIndex = (item, index) => {
    const charge =
      item.deliveryCharge ?? item.defaultDeliveryCharge ?? undefined;
    const chargeNum = parseNum(charge);
    const threshold =
      item.freeDeliveryThreshold ?? item.freeDeliveryMinimumOrderValue;
    const thresholdNum = parseNum(threshold);
    const enabled = item.isEnabled === true;
    if (index === 0) {
      data.expressSettingsEnabled = enabled;
      data.defaultDeliveryCharge =
        chargeNum !== null ? chargeNum : DEFAULT_DELIVERY_CHARGE;
      data.expressDeliveryCharge =
        chargeNum !== null ? chargeNum : DEFAULT_DELIVERY_CHARGE;
      data.expressFreeDeliveryThreshold = thresholdNum;
      data.freeDeliveryThreshold = thresholdNum;
    } else if (index === 1) {
      data.scheduledDeliveryEnabled = enabled;
      data.scheduledDeliveryCharge =
        chargeNum !== null ? chargeNum : DEFAULT_DELIVERY_CHARGE;
      data.scheduledFreeDeliveryThreshold = thresholdNum;
    } else if (index === 2) {
      data.selfPickupEnabled = enabled;
    }
  };

  deliverySettings.forEach((item) => byLabel(item));
  if (Object.keys(data).length === 0 && deliverySettings.length >= 1) {
    data.expressSettingsEnabled = false;
    data.scheduledDeliveryEnabled = false;
    data.selfPickupEnabled = false;
    data.defaultDeliveryCharge = DEFAULT_DELIVERY_CHARGE;
    data.expressDeliveryCharge = DEFAULT_DELIVERY_CHARGE;
    data.expressFreeDeliveryThreshold = null;
    data.freeDeliveryThreshold = null;
    data.scheduledFreeDeliveryThreshold = null;
    deliverySettings.forEach((item, index) => byIndex(item, index));
  }
  return data;
};

/**
 * PUT /api/v1/partner/delivery-settings/types
 * Request body: { deliverySettings: [{ isEnabled, label, deliveryCharge? | defaultDeliveryCharge? }] }
 * Updates WarehouseDeliverySetting by warehouseId (partner's warehouse).
 */
export const updateDeliveryTypes = async (req, res) => {
  try {
    const userId = req.user.id;
    let warehouseId = await getPartnerWarehouseId(userId);
    if (!warehouseId && ["SUPER_ADMIN", "REGIONAL_ADMIN", "OPERATIONAL_ADMIN", "ADMIN"].includes(req.user?.role)) {
      warehouseId = req.query?.warehouseId || req.body?.warehouseId || req.headers?.["x-warehouse-id"] || null;
      if (!warehouseId) {
        const firstWh = await prisma.warehouse.findFirst({
          where: { isActive: true },
          select: { id: true },
          orderBy: { name: "asc" },
        });
        warehouseId = firstWh?.id || null;
      }
    }
    if (!warehouseId) {
      return errorResponse(
        res,
        403,
        "Warehouse not configured for your account. Please complete onboarding.",
      );
    }
    const deliverySettings = req.body?.deliverySettings;
    if (!Array.isArray(deliverySettings) || deliverySettings.length === 0) {
      return errorResponse(
        res,
        400,
        "deliverySettings is required and must be a non-empty array",
      );
    }
    const data = mapDeliverySettingsToData(deliverySettings);
    if (Object.keys(data).length === 0) {
      return errorResponse(
        res,
        400,
        "No valid delivery type fields to update. Ensure each item has label one of: Express Settings, Scheduled Delivery, Self Pickup.",
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.warehouseDeliverySetting.upsert({
        where: { warehouseId },
        create: { warehouseId, ...data },
        update: data,
      });

      // Keep Warehouse flag aligned with delivery type toggle so consumer pickup availability
      // does not get out of sync with partner's "Self Pickup" configuration.
      if (typeof data.selfPickupEnabled === "boolean") {
        await tx.warehouse.update({
          where: { id: warehouseId },
          data: { isPickupStore: data.selfPickupEnabled },
        });
      }
    });
    return successResponse(
      res,
      200,
      null,
      "Delivery types updated successfully",
    );
  } catch (error) {
    logger.error("[DeliveryTypes] Error updating", {
      error: error.message,
      userId: req.user?.id,
    });
    return errorResponse(res, 500, "Failed to update delivery types");
  }
};

// ---------------------------------------------------------------------------
// Route Maps (Scheduled Delivery areas)
// ---------------------------------------------------------------------------

/**
 * GET /api/v1/partner/delivery-settings/route-maps
 * List route maps with pagination, search, sort
 */
export const listRouteMaps = async (req, res) => {
  try {
    const userId = req.user.id;
    const warehouseId = await getPartnerWarehouseId(userId);
    if (!warehouseId) {
      return errorResponse(
        res,
        403,
        "Warehouse not configured for your account. Please complete onboarding.",
      );
    }
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const search = (req.query.search || "").trim();
    const sortBy = req.query.sortBy === "createdAt" ? "createdAt" : "area";
    const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

    const where = { warehouseId };
    if (search) {
      where.area = { contains: search, mode: "insensitive" };
    }

    const [items, total] = await Promise.all([
      prisma.routeMap.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          area: true,
          createdAt: true,
        },
      }),
      prisma.routeMap.count({ where }),
    ]);

    return paginatedResponse(
      res,
      200,
      items,
      { page, limit, total },
      "Route maps fetched successfully",
    );
  } catch (error) {
    logger.error("[RouteMaps] Error listing", {
      error: error.message,
      userId: req.user?.id,
    });
    return errorResponse(res, 500, "Failed to fetch route maps");
  }
};

/**
 * GET /api/v1/partner/delivery-settings/route-maps/list
 * Minimal list for dropdowns (no pagination)
 */
export const listRouteMapsOptions = async (req, res) => {
  try {
    const userId = req.user.id;
    const warehouseId = await getPartnerWarehouseId(userId);
    if (!warehouseId) {
      return errorResponse(
        res,
        403,
        "Warehouse not configured for your account. Please complete onboarding.",
      );
    }
    const items = await prisma.routeMap.findMany({
      where: { warehouseId },
      orderBy: { area: "asc" },
      select: { id: true, area: true },
    });
    return successResponse(
      res,
      200,
      items,
      "Route map options fetched successfully",
    );
  } catch (error) {
    logger.error("[RouteMaps] Error listing options", {
      error: error.message,
      userId: req.user?.id,
    });
    return errorResponse(res, 500, "Failed to fetch route map options");
  }
};

/**
 * GET /api/v1/partner/delivery-settings/route-maps/:id
 */
export const getRouteMap = async (req, res) => {
  try {
    const userId = req.user.id;
    const warehouseId = await getPartnerWarehouseId(userId);
    if (!warehouseId) {
      return errorResponse(
        res,
        403,
        "Warehouse not configured for your account. Please complete onboarding.",
      );
    }
    const routeMap = await prisma.routeMap.findFirst({
      where: { id: req.params.id, warehouseId },
      select: { id: true, area: true, createdAt: true, updatedAt: true },
    });
    if (!routeMap) {
      return errorResponse(res, 404, "Route map not found");
    }
    return successResponse(
      res,
      200,
      routeMap,
      "Route map fetched successfully",
    );
  } catch (error) {
    logger.error("[RouteMaps] Error get", { error: error.message });
    return errorResponse(res, 500, "Failed to fetch route map");
  }
};

/**
 * POST /api/v1/partner/delivery-settings/route-maps
 */
export const createRouteMap = async (req, res) => {
  try {
    const userId = req.user.id;
    const warehouseId = await getPartnerWarehouseId(userId);
    if (!warehouseId) {
      return errorResponse(
        res,
        403,
        "Warehouse not configured for your account. Please complete onboarding.",
      );
    }
    const areaRaw = (req.body?.area || "").trim();
    const area = areaRaw.toLowerCase();
    if (!area) {
      return errorResponse(res, 400, "Route/Area is required");
    }
    const existing = await prisma.routeMap.findMany({
      where: { warehouseId },
      select: { id: true, area: true },
    });
    const duplicate = existing.some(
      (r) => (r.area || "").toLowerCase() === area
    );
    if (duplicate) {
      return errorResponse(res, 409, "A route map with this area already exists");
    }
    const routeMap = await prisma.routeMap.create({
      data: { warehouseId, area },
      select: { id: true, area: true, createdAt: true },
    });
    return successResponse(
      res,
      201,
      routeMap,
      "Route map created successfully",
    );
  } catch (error) {
    if (error.code === "P2002") {
      return errorResponse(res, 409, "A route map with this area already exists");
    }
    logger.error("[RouteMaps] Error create", { error: error.message });
    return errorResponse(res, 500, "Failed to create route map");
  }
};

/**
 * PUT /api/v1/partner/delivery-settings/route-maps/:id
 */
export const updateRouteMap = async (req, res) => {
  try {
    const userId = req.user.id;
    const warehouseId = await getPartnerWarehouseId(userId);
    if (!warehouseId) {
      return errorResponse(
        res,
        403,
        "Warehouse not configured for your account. Please complete onboarding.",
      );
    }
    const { area } = req.body;
    const routeMap = await prisma.routeMap.findFirst({
      where: { id: req.params.id, warehouseId },
    });
    if (!routeMap) {
      return errorResponse(res, 404, "Route map not found");
    }
    if (area !== undefined) {
      const areaNormalized = (area || "").trim().toLowerCase();
      if (!areaNormalized) {
        return errorResponse(res, 400, "Route/Area cannot be empty");
      }
      const existing = await prisma.routeMap.findMany({
        where: { warehouseId, id: { not: req.params.id } },
        select: { area: true },
      });
      const duplicate = existing.some(
        (r) => (r.area || "").toLowerCase() === areaNormalized
      );
      if (duplicate) {
        return errorResponse(res, 409, "A route map with this area already exists");
      }
    }
    const updated = await prisma.routeMap.update({
      where: { id: req.params.id },
      data: area !== undefined ? { area: (area || "").trim().toLowerCase() } : {},
      select: { id: true, area: true, createdAt: true, updatedAt: true },
    });
    return successResponse(
      res,
      200,
      updated,
      "Route map updated successfully",
    );
  } catch (error) {
    if (error.code === "P2002") {
      return errorResponse(res, 409, "A route map with this area already exists");
    }
    logger.error("[RouteMaps] Error update", { error: error.message });
    return errorResponse(res, 500, "Failed to update route map");
  }
};

/**
 * DELETE /api/v1/partner/delivery-settings/route-maps/:id
 */
export const deleteRouteMap = async (req, res) => {
  try {
    const userId = req.user.id;
    const warehouseId = await getPartnerWarehouseId(userId);
    if (!warehouseId) {
      return errorResponse(
        res,
        403,
        "Warehouse not configured for your account. Please complete onboarding.",
      );
    }
    const routeMap = await prisma.routeMap.findFirst({
      where: { id: req.params.id, warehouseId },
    });
    if (!routeMap) {
      return errorResponse(res, 404, "Route map not found");
    }
    const linkedSlotsCount = await prisma.scheduledDeliverySlot.count({
      where: { routeMapId: req.params.id },
    });
    if (linkedSlotsCount > 0) {
      return errorResponse(
        res,
        409,
        `Cannot delete: ${linkedSlotsCount} scheduled slot(s) use this route. Remove or reassign them first.`,
      );
    }

    // BUG-004: Before deleting RouteMap, handle DeliverySlot rows that reference it (FK ON DELETE SET NULL would leave multiple rows with routeMapId null, violating legacy partial unique).
    const deliverySlotsWithRoute = await prisma.deliverySlot.findMany({
      where: { routeMapId: req.params.id },
      select: { id: true, booked: true },
    });
    if (deliverySlotsWithRoute.length > 0) {
      const withBooked = deliverySlotsWithRoute.filter((s) => s.booked > 0);
      if (withBooked.length > 0) {
        return errorResponse(
          res,
          409,
          `Cannot delete: ${withBooked.length} delivery slot(s) for this route still have bookings. Wait for slots to be empty or contact support.`,
        );
      }
      await prisma.deliverySlot.updateMany({
        where: { routeMapId: req.params.id },
        data: { isActive: false },
      });
      logger.info("[RouteMaps] Deactivated DeliverySlot rows before route delete", {
        routeMapId: req.params.id,
        count: deliverySlotsWithRoute.length,
      });
    }

    await prisma.routeMap.delete({ where: { id: req.params.id } });
    return successResponse(
      res,
      200,
      null,
      "Route map deleted successfully",
    );
  } catch (error) {
    logger.error("[RouteMaps] Error delete", { error: error.message });
    return errorResponse(res, 500, "Failed to delete route map");
  }
};

// ---------------------------------------------------------------------------
// Scheduled Delivery Slots
// ---------------------------------------------------------------------------

const SCHEDULED_SLOT_SORT_FIELDS = [
  "slotDate",
  "createdAt",
  "ordersPerSlot",
  "startTime",
];

/**
 * GET /api/v1/partner/delivery-settings/slots
 * List scheduled delivery slots with pagination, search, sort
 */
export const listScheduledSlots = async (req, res) => {
  try {
    const userId = req.user.id;
    const warehouseId = await getPartnerWarehouseId(userId);
    if (!warehouseId) {
      return errorResponse(
        res,
        403,
        "Warehouse not configured for your account. Please complete onboarding.",
      );
    }
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const search = (req.query.search || "").trim();
    const sortBy = SCHEDULED_SLOT_SORT_FIELDS.includes(req.query.sortBy)
      ? req.query.sortBy
      : "slotDate";
    const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

    const where = { warehouseId };
    if (search) {
      where.OR = [
        { routeMap: { area: { contains: search, mode: "insensitive" } } },
        { startTime: { contains: search, mode: "insensitive" } },
        { endTime: { contains: search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.scheduledDeliverySlot.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          routeMap: { select: { id: true, area: true } },
        },
      }),
      prisma.scheduledDeliverySlot.count({ where }),
    ]);

    const data = items.map((slot) => ({
      id: slot.id,
      slotDate: slot.slotDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      routeArea: slot.routeMap?.area,
      routeMapId: slot.routeMapId,
      ordersPerSlot: slot.ordersPerSlot,
      isRepeat: slot.isRepeat,
      repeatType: slot.repeatType,
      customDays: slot.customDays,
      repeatLabel: formatRepeatLabel(slot),
      createdAt: slot.createdAt,
    }));

    return paginatedResponse(
      res,
      200,
      data,
      { page, limit, total },
      "Delivery slots fetched successfully",
    );
  } catch (error) {
    logger.error("[ScheduledSlots] Error listing", {
      error: error.message,
      userId: req.user?.id,
    });
    return errorResponse(res, 500, "Failed to fetch delivery slots");
  }
};

function formatRepeatLabel(slot) {
  if (!slot.isRepeat || slot.repeatType === "ONCE") return "Once";
  if (slot.repeatType === "DAILY") return "Daily";
  if (slot.repeatType === "WEEKLY") return "Weekly";
  if (slot.repeatType === "MON_FRI") return "Mon - Fri";
  if (slot.repeatType === "SUN") return "Sun";
  if (slot.repeatType === "CUSTOM" && slot.customDays?.length) {
    return slot.customDays.join(", ");
  }
  return "Once";
}

/**
 * GET /api/v1/partner/delivery-settings/slots/:id
 */
export const getScheduledSlot = async (req, res) => {
  try {
    const userId = req.user.id;
    const warehouseId = await getPartnerWarehouseId(userId);
    if (!warehouseId) {
      return errorResponse(
        res,
        403,
        "Warehouse not configured for your account. Please complete onboarding.",
      );
    }
    const slot = await prisma.scheduledDeliverySlot.findFirst({
      where: { id: req.params.id, warehouseId },
      include: { routeMap: { select: { id: true, area: true } } },
    });
    if (!slot) {
      return errorResponse(res, 404, "Delivery slot not found");
    }
    const data = {
      ...slot,
      routeArea: slot.routeMap?.area,
      repeatLabel: formatRepeatLabel(slot),
    };
    return successResponse(
      res,
      200,
      data,
      "Delivery slot fetched successfully",
    );
  } catch (error) {
    logger.error("[ScheduledSlots] Error get", { error: error.message });
    return errorResponse(res, 500, "Failed to fetch delivery slot");
  }
};

/**
 * POST /api/v1/partner/delivery-settings/slots
 */
export const createScheduledSlot = async (req, res) => {
  try {
    const userId = req.user.id;
    const warehouseId = await getPartnerWarehouseId(userId);
    if (!warehouseId) {
      return errorResponse(
        res,
        403,
        "Warehouse not configured for your account. Please complete onboarding.",
      );
    }
    const {
      slotDate,
      startTime,
      endTime,
      routeMapId,
      ordersPerSlot,
      isRepeat,
      repeatType,
      customDays,
    } = req.body;

    const [routeMap, warehouse] = await Promise.all([
      prisma.routeMap.findFirst({ where: { id: routeMapId, warehouseId } }),
      prisma.warehouse.findUnique({
        where: { id: warehouseId },
        select: { opensAt: true, closesAt: true },
      }),
    ]);
    if (!routeMap) {
      return errorResponse(res, 400, "Invalid route/area. Select a valid area.");
    }
    const startTimeStr = String(startTime || "").trim();
    const endTimeStr = String(endTime || "").trim();
    if (warehouse?.opensAt && warehouse?.closesAt) {
      const opens = warehouse.opensAt.trim();
      const closes = warehouse.closesAt.trim();
      if (startTimeStr < opens || endTimeStr > closes) {
        return errorResponse(
          res,
          400,
          `Slot time must be within warehouse hours (${opens}–${closes})`
        );
      }
    }

    const slotDateParsed = parseDateOnlyUTC(slotDate);
    if (!slotDateParsed) {
      return errorResponse(res, 400, "Invalid slotDate format (use YYYY-MM-DD)");
    }
    const today = new Date();
    const todayUTC = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    );
    if (slotDateParsed < todayUTC) {
      return errorResponse(res, 400, "slotDate must be today or a future date");
    }

    const ordersPerSlotNum = Math.max(1, parseInt(ordersPerSlot, 10) || 10);
    const isRepeatSlot = Boolean(isRepeat);
    const repeatTypeVal = repeatType || "ONCE";

    const slot = await prisma.$transaction(async (tx) => {
      const created = await tx.scheduledDeliverySlot.create({
        data: {
          warehouseId,
          routeMapId,
          slotDate: slotDateParsed,
          startTime: String(startTime || "").trim(),
          endTime: String(endTime || "").trim(),
          ordersPerSlot: ordersPerSlotNum,
          isRepeat: isRepeatSlot,
          repeatType: repeatTypeVal,
          customDays: Array.isArray(customDays) ? customDays : [],
        },
        include: { routeMap: { select: { id: true, area: true } } },
      });

      const datesToSync = getExpandedDates(
        slotDateParsed,
        repeatTypeVal,
        Array.isArray(customDays) ? customDays : [],
        REPEAT_EXPANSION_WINDOW_DAYS
      );
      for (const d of datesToSync) {
        await syncScheduledSlotToDeliverySlot(tx, {
          warehouseId,
          slotDate: d,
          startTime: created.startTime,
          endTime: created.endTime,
          ordersPerSlot: created.ordersPerSlot,
          routeMapId: created.routeMapId,
        });
      }
      return created;
    });
    const data = {
      id: slot.id,
      slotDate: slot.slotDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      routeArea: slot.routeMap?.area,
      routeMapId: slot.routeMapId,
      ordersPerSlot: slot.ordersPerSlot,
      isRepeat: slot.isRepeat,
      repeatType: slot.repeatType,
      customDays: slot.customDays,
      createdAt: slot.createdAt,
    };
    return successResponse(
      res,
      201,
      data,
      "Delivery slot created successfully",
    );
  } catch (error) {
    logger.error("[ScheduledSlots] Error create", { error: error.message });
    return errorResponse(res, 500, "Failed to create delivery slot");
  }
};

/**
 * PUT /api/v1/partner/delivery-settings/slots/:id
 */
export const updateScheduledSlot = async (req, res) => {
  try {
    const userId = req.user.id;
    const warehouseId = await getPartnerWarehouseId(userId);
    if (!warehouseId) {
      return errorResponse(
        res,
        403,
        "Warehouse not configured for your account. Please complete onboarding.",
      );
    }
    const existing = await prisma.scheduledDeliverySlot.findFirst({
      where: { id: req.params.id, warehouseId },
    });
    if (!existing) {
      return errorResponse(res, 404, "Delivery slot not found");
    }

    const {
      slotDate,
      startTime,
      endTime,
      routeMapId,
      ordersPerSlot,
      isRepeat,
      repeatType,
      customDays,
    } = req.body;

    const updateData = {};
    if (slotDate !== undefined) {
      const slotDateParsed = parseDateOnlyUTC(slotDate);
      if (!slotDateParsed) {
        return errorResponse(res, 400, "Invalid slotDate format (use YYYY-MM-DD)");
      }
      const today = new Date();
      const todayUTC = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
      );
      if (slotDateParsed < todayUTC) {
        return errorResponse(res, 400, "slotDate must be today or a future date");
      }
      updateData.slotDate = slotDateParsed;
    }
    if (startTime !== undefined) updateData.startTime = String(startTime).trim();
    if (endTime !== undefined) updateData.endTime = String(endTime).trim();
    if (ordersPerSlot !== undefined)
      updateData.ordersPerSlot = Math.max(1, parseInt(ordersPerSlot, 10) || 10);
    if (typeof isRepeat === "boolean") updateData.isRepeat = isRepeat;
    if (repeatType !== undefined) updateData.repeatType = repeatType;
    if (Array.isArray(customDays)) updateData.customDays = customDays;

    if (routeMapId !== undefined) {
      const routeMap = await prisma.routeMap.findFirst({
        where: { id: routeMapId, warehouseId },
      });
      if (!routeMap) {
        return errorResponse(res, 400, "Invalid route/area. Select a valid area.");
      }
      updateData.routeMapId = routeMapId;
    }
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
      select: { opensAt: true, closesAt: true },
    });
    const startTimeStr = (updateData.startTime ?? existing.startTime ?? "").toString().trim();
    const endTimeStr = (updateData.endTime ?? existing.endTime ?? "").toString().trim();
    if (warehouse?.opensAt && warehouse?.closesAt && startTimeStr && endTimeStr) {
      const opens = warehouse.opensAt.trim();
      const closes = warehouse.closesAt.trim();
      if (startTimeStr < opens || endTimeStr > closes) {
        return errorResponse(
          res,
          400,
          `Slot time must be within warehouse hours (${opens}–${closes})`
        );
      }
    }

    const slot = await prisma.scheduledDeliverySlot.update({
      where: { id: req.params.id },
      data: updateData,
      include: { routeMap: { select: { id: true, area: true } } },
    });

    const datesToSync = getExpandedDates(
      slot.slotDate,
      slot.repeatType || "ONCE",
      slot.customDays || [],
      REPEAT_EXPANSION_WINDOW_DAYS
    );
    await prisma.$transaction(async (tx) => {
      for (const d of datesToSync) {
        await syncScheduledSlotToDeliverySlot(tx, {
          warehouseId,
          slotDate: d,
          startTime: slot.startTime,
          endTime: slot.endTime,
          ordersPerSlot: slot.ordersPerSlot,
          routeMapId: slot.routeMapId,
        });
      }
    });

    const data = {
      id: slot.id,
      slotDate: slot.slotDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      routeArea: slot.routeMap?.area,
      routeMapId: slot.routeMapId,
      ordersPerSlot: slot.ordersPerSlot,
      isRepeat: slot.isRepeat,
      repeatType: slot.repeatType,
      customDays: slot.customDays,
      updatedAt: slot.updatedAt,
    };
    return successResponse(
      res,
      200,
      data,
      "Delivery slot updated successfully",
    );
  } catch (error) {
    logger.error("[ScheduledSlots] Error update", { error: error.message });
    return errorResponse(res, 500, "Failed to update delivery slot");
  }
};

/**
 * DELETE /api/v1/partner/delivery-settings/slots/:id
 */
export const deleteScheduledSlot = async (req, res) => {
  try {
    const userId = req.user.id;
    const warehouseId = await getPartnerWarehouseId(userId);
    if (!warehouseId) {
      return errorResponse(
        res,
        403,
        "Warehouse not configured for your account. Please complete onboarding.",
      );
    }
    const slot = await prisma.scheduledDeliverySlot.findFirst({
      where: { id: req.params.id, warehouseId },
    });
    if (!slot) {
      return errorResponse(res, 404, "Delivery slot not found");
    }
    const slotKey = `${slot.startTime}-${slot.endTime}`;
    const slotDayStart = new Date(slot.slotDate);
    slotDayStart.setUTCHours(0, 0, 0, 0);
    const slotDayEnd = new Date(slotDayStart);
    slotDayEnd.setUTCDate(slotDayEnd.getUTCDate() + 1);
    const ordersUsingSlot = await prisma.order.count({
      where: {
        warehouseId,
        deliverySlot: slotKey,
        deliveryDate: { gte: slotDayStart, lt: slotDayEnd },
        status: { notIn: ["CANCELLED", "FAILED"] },
      },
    });
    if (ordersUsingSlot > 0) {
      return errorResponse(
        res,
        409,
        `Cannot delete: ${ordersUsingSlot} order(s) use this slot. Complete or cancel them first.`
      );
    }

    // Step 1 – Delete alignment: soft-deactivate matching DeliverySlot so consumer no longer sees or books it.
    const deactivated = await deactivateDeliverySlotsForScheduledSlot(prisma, { slot, warehouseId });
    if (deactivated.count > 0) {
      logger.info("[ScheduledSlots] Deactivated consumer DeliverySlot(s) for deleted scheduled slot", {
        scheduledSlotId: req.params.id,
        warehouseId,
        slotDate: slot.slotDate,
        slot: slotKey,
        rowsUpdated: deactivated.count,
      });
    }

    await prisma.scheduledDeliverySlot.delete({ where: { id: req.params.id } });
    return successResponse(
      res,
      200,
      null,
      "Delivery slot deleted successfully",
    );
  } catch (error) {
    logger.error("[ScheduledSlots] Error delete", { error: error.message });
    return errorResponse(res, 500, "Failed to delete delivery slot");
  }
};

// ---------------------------------------------------------------------------
// Route Pincode Management
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/partner/delivery-settings/route-pincodes
 * Bulk create pincodes for a route. Route must belong to partner's warehouse.
 */
export const createRoutePincodes = async (req, res) => {
  try {
    const userId = req.user.id;
    const warehouseId = await getPartnerWarehouseId(userId);
    if (!warehouseId) {
      return errorResponse(res, 403, "Warehouse not configured for your account. Please complete onboarding.");
    }
    const { routeMapId, pincodes } = req.body;
    const result = await routePincodeService.createRoutePincodes(routeMapId, warehouseId, pincodes);
    if (result === null) {
      return errorResponse(res, 404, "Route map not found or does not belong to your warehouse");
    }
    return successResponse(res, 201, result, "Route pincodes created successfully");
  } catch (error) {
    if (error.code === "P2002") {
      return errorResponse(res, 409, "One or more pincodes already exist for this route");
    }
    logger.error("[RoutePincode] Error create", { error: error.message });
    return errorResponse(res, 500, "Failed to create route pincodes");
  }
};

/**
 * GET /api/v1/partner/delivery-settings/route-pincodes?routeId=
 * List route pincodes, optionally filtered by routeId.
 */
export const listRoutePincodes = async (req, res) => {
  try {
    const userId = req.user.id;
    const warehouseId = await getPartnerWarehouseId(userId);
    if (!warehouseId) {
      return errorResponse(res, 403, "Warehouse not configured for your account. Please complete onboarding.");
    }
    const routeId = req.query.routeId?.trim() || undefined;
    const rows = await routePincodeService.listRoutePincodes(warehouseId, { routeId });
    return successResponse(res, 200, rows, "Route pincodes fetched successfully");
  } catch (error) {
    logger.error("[RoutePincode] Error list", { error: error.message });
    return errorResponse(res, 500, "Failed to fetch route pincodes");
  }
};

/**
 * DELETE /api/v1/partner/delivery-settings/route-pincodes/:id
 */
export const deleteRoutePincode = async (req, res) => {
  try {
    const userId = req.user.id;
    const warehouseId = await getPartnerWarehouseId(userId);
    if (!warehouseId) {
      return errorResponse(res, 403, "Warehouse not configured for your account. Please complete onboarding.");
    }
    const deleted = await routePincodeService.deleteRoutePincode(req.params.id, warehouseId);
    if (!deleted) {
      return errorResponse(res, 404, "Route pincode not found");
    }
    return successResponse(res, 200, null, "Route pincode deleted successfully");
  } catch (error) {
    logger.error("[RoutePincode] Error delete", { error: error.message });
    return errorResponse(res, 500, "Failed to delete route pincode");
  }
};

// ---------------------------------------------------------------------------
// Pickup Slot Management (Partner)
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/partner/delivery-settings/pickup-slots
 */
export const createPickupSlot = async (req, res) => {
  try {
    const userId = req.user.id;
    const warehouseId = await getPartnerWarehouseId(userId);
    if (!warehouseId) {
      return errorResponse(res, 403, "Warehouse not configured for your account. Please complete onboarding.");
    }
    const result = await pickupSlotPartnerService.createPickupSlots(prisma, warehouseId, req.body);
    if (result.error) {
      return errorResponse(res, 400, result.error);
    }
    return successResponse(res, 201, result, "Pickup slot(s) created successfully");
  } catch (error) {
    if (error.code === "P2002") {
      return errorResponse(res, 409, "A pickup slot with this date and time already exists");
    }
    logger.error("[PickupSlot] Error create", { error: error.message });
    return errorResponse(res, 500, "Failed to create pickup slot");
  }
};

/**
 * GET /api/v1/partner/delivery-settings/pickup-slots?page=1&limit=10
 * Pagination: page, limit (optional: fromDate, toDate for date-range filter).
 */
export const listPickupSlots = async (req, res) => {
  try {
    const userId = req.user.id;
    const warehouseId = await getPartnerWarehouseId(userId);
    if (!warehouseId) {
      return errorResponse(res, 403, "Warehouse not configured for your account. Please complete onboarding.");
    }
    const { page, limit, fromDate: fromDateStr, toDate: toDateStr } = req.query;
    const fromDate = fromDateStr ? new Date(fromDateStr) : undefined;
    const toDate = toDateStr ? new Date(toDateStr) : undefined;
    const result = await pickupSlotPartnerService.listPickupSlots(warehouseId, {
      page,
      limit,
      fromDate,
      toDate,
    });
    return paginatedResponse(
      res,
      200,
      result.rows,
      { total: result.total, page: result.page, limit: result.limit },
      "Pickup slots fetched successfully",
    );
  } catch (error) {
    logger.error("[PickupSlot] Error list", { error: error.message });
    return errorResponse(res, 500, "Failed to fetch pickup slots");
  }
};

/**
 * GET /api/v1/partner/delivery-settings/pickup-slots/:id
 */
export const getPickupSlot = async (req, res) => {
  try {
    const userId = req.user.id;
    const warehouseId = await getPartnerWarehouseId(userId);
    if (!warehouseId) {
      return errorResponse(res, 403, "Warehouse not configured for your account. Please complete onboarding.");
    }
    const row = await pickupSlotPartnerService.getPickupSlotById(req.params.id, warehouseId);
    if (!row) {
      return errorResponse(res, 404, "Pickup slot not found");
    }
    return successResponse(res, 200, row, "Pickup slot fetched successfully");
  } catch (error) {
    logger.error("[PickupSlot] Error get", { error: error.message });
    return errorResponse(res, 500, "Failed to fetch pickup slot");
  }
};

/**
 * PUT /api/v1/partner/delivery-settings/pickup-slots/:id
 */
export const updatePickupSlot = async (req, res) => {
  try {
    const userId = req.user.id;
    const warehouseId = await getPartnerWarehouseId(userId);
    if (!warehouseId) {
      return errorResponse(res, 403, "Warehouse not configured for your account. Please complete onboarding.");
    }
    const result = await pickupSlotPartnerService.updatePickupSlot(prisma, req.params.id, warehouseId, req.body);
    if (result === null) {
      return errorResponse(res, 404, "Pickup slot not found");
    }
    if (result.error) {
      return errorResponse(res, 400, result.error);
    }
    return successResponse(res, 200, result.data, "Pickup slot updated successfully");
  } catch (error) {
    if (error.code === "P2002") {
      return errorResponse(res, 409, "Updated slot would conflict with an existing slot");
    }
    logger.error("[PickupSlot] Error update", { error: error.message });
    return errorResponse(res, 500, "Failed to update pickup slot");
  }
};

/**
 * DELETE /api/v1/partner/delivery-settings/pickup-slots/:id
 */
export const deletePickupSlot = async (req, res) => {
  try {
    const userId = req.user.id;
    const warehouseId = await getPartnerWarehouseId(userId);
    if (!warehouseId) {
      return errorResponse(res, 403, "Warehouse not configured for your account. Please complete onboarding.");
    }
    const deleted = await pickupSlotPartnerService.deletePickupSlot(prisma, req.params.id, warehouseId);
    if (!deleted) {
      return errorResponse(res, 404, "Pickup slot not found");
    }
    return successResponse(res, 200, null, "Pickup slot deleted successfully");
  } catch (error) {
    logger.error("[PickupSlot] Error delete", { error: error.message });
    return errorResponse(res, 500, "Failed to delete pickup slot");
  }
};

// ---------------------------------------------------------------------------
// Warehouse Blackout Management
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/partner/delivery-settings/warehouse-blackouts
 */
export const createWarehouseBlackout = async (req, res) => {
  try {
    const userId = req.user.id;
    const warehouseId = await getPartnerWarehouseId(userId);
    if (!warehouseId) {
      return errorResponse(res, 403, "Warehouse not configured for your account. Please complete onboarding.");
    }
    const result = await warehouseBlackoutService.createWarehouseBlackout(warehouseId, req.body);
    if (result.error) {
      return errorResponse(res, 400, result.error);
    }
    if (result.data && result.data.id) {
      return successResponse(res, 201, result.data, "Blackout date created successfully");
    }
    return errorResponse(res, 500, "Failed to create blackout");
  } catch (error) {
    if (error.code === "P2002") {
      return errorResponse(res, 409, "Blackout already exists for this date");
    }
    logger.error("[WarehouseBlackout] Error create", { error: error.message });
    return errorResponse(res, 500, "Failed to create blackout");
  }
};

/**
 * GET /api/v1/partner/delivery-settings/warehouse-blackouts?fromDate=&toDate=
 */
export const listWarehouseBlackouts = async (req, res) => {
  try {
    const userId = req.user.id;
    const warehouseId = await getPartnerWarehouseId(userId);
    if (!warehouseId) {
      return errorResponse(res, 403, "Warehouse not configured for your account. Please complete onboarding.");
    }
    const fromDate = req.query.fromDate ? new Date(req.query.fromDate) : undefined;
    const toDate = req.query.toDate ? new Date(req.query.toDate) : undefined;
    const rows = await warehouseBlackoutService.listWarehouseBlackouts(warehouseId, { fromDate, toDate });
    return successResponse(res, 200, rows, "Blackout dates fetched successfully");
  } catch (error) {
    logger.error("[WarehouseBlackout] Error list", { error: error.message });
    return errorResponse(res, 500, "Failed to fetch blackout dates");
  }
};

/**
 * DELETE /api/v1/partner/delivery-settings/warehouse-blackouts/:id
 */
export const deleteWarehouseBlackout = async (req, res) => {
  try {
    const userId = req.user.id;
    const warehouseId = await getPartnerWarehouseId(userId);
    if (!warehouseId) {
      return errorResponse(res, 403, "Warehouse not configured for your account. Please complete onboarding.");
    }
    const deleted = await warehouseBlackoutService.deleteWarehouseBlackout(req.params.id, warehouseId);
    if (!deleted) {
      return errorResponse(res, 404, "Blackout not found");
    }
    return successResponse(res, 200, null, "Blackout deleted successfully");
  } catch (error) {
    logger.error("[WarehouseBlackout] Error delete", { error: error.message });
    return errorResponse(res, 500, "Failed to delete blackout");
  }
};
