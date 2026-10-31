// validations/deliverySettingsValidation.js
import { body, param } from "express-validator";

// HH:mm 24-hour format, 00:00–23:59
const HH_MM_REGEX = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
function isValidTimeFormat(val) {
  return typeof val === "string" && HH_MM_REGEX.test(val.trim());
}

export const updateDeliverySettingsValidator = [
  body("servicePincodes")
    .optional()
    .isArray()
    .withMessage("servicePincodes must be an array"),
  body("servicePincodes.*")
    .optional()
    .isString()
    .withMessage("Each pincode must be a string"),
  body("opensAt")
    .optional()
    .isString()
    .trim()
    .custom((val) => !val || isValidTimeFormat(val))
    .withMessage("opensAt must be HH:mm 24-hour format (e.g. 09:00, 23:59)"),
  body("closesAt")
    .optional()
    .isString()
    .trim()
    .custom((val) => !val || isValidTimeFormat(val))
    .withMessage("closesAt must be HH:mm 24-hour format (e.g. 09:00, 23:59)"),
  body()
    .custom((_, { req }) => {
      const opensAt = req.body?.opensAt != null ? String(req.body.opensAt).trim() : "";
      const closesAt = req.body?.closesAt != null ? String(req.body.closesAt).trim() : "";
      if (!opensAt || !closesAt) return true;
      return opensAt < closesAt;
    })
    .withMessage("opensAt must be before closesAt"),
  body("pickupTimeSlots")
    .optional()
    .custom((val) => val === null || Array.isArray(val))
    .withMessage("pickupTimeSlots must be an array or null"),
  body("isPickupStore")
    .optional()
    .isBoolean()
    .withMessage("isPickupStore must be a boolean"),
  body("selfPickupMode")
    .optional()
    .isBoolean()
    .withMessage("selfPickupMode must be a boolean"),
];

const DELIVERY_TYPE_LABELS = ["Express Settings", "Scheduled Delivery", "Self Pickup"];

export const updateDeliveryTypesValidator = [
  body("deliverySettings")
    .isArray()
    .withMessage("deliverySettings must be an array")
    .custom((items) => {
      if (!Array.isArray(items) || items.length === 0) return false;
      for (const item of items) {
        if (typeof item?.isEnabled !== "boolean") return false;
        const label = item.label != null ? String(item.label).trim() : "";
        if (label && !DELIVERY_TYPE_LABELS.includes(label)) return false;
        const charge = item.deliveryCharge ?? item.defaultDeliveryCharge;
        if (charge !== undefined && charge !== null && charge !== "") {
          const num = Number(charge);
          if (Number.isNaN(num) || !Number.isFinite(num) || num < 0 || num > 100000) return false;
        }
        const threshold = item.freeDeliveryThreshold ?? item.freeDeliveryMinimumOrderValue;
        if (threshold !== undefined && threshold !== null && threshold !== "") {
          const num = Number(threshold);
          if (Number.isNaN(num) || !Number.isFinite(num) || num < 0 || num > 10000000) return false;
        }
      }
      return true;
    })
    .withMessage(
      "deliverySettings must be a non-empty array of { isEnabled (boolean), label (optional: Express Settings | Scheduled Delivery | Self Pickup), deliveryCharge or defaultDeliveryCharge (non-negative number), freeDeliveryThreshold (optional non-negative number) }",
    ),
];

export const createRouteMapValidator = [
  body("area")
    .trim()
    .notEmpty()
    .withMessage("Route/Area is required")
    .isLength({ max: 255 })
    .withMessage("Area must be at most 255 characters"),
];

export const updateRouteMapValidator = [
  param("id").isUUID().withMessage("Invalid route map id"),
  body("area")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Route/Area cannot be empty")
    .isLength({ max: 255 })
    .withMessage("Area must be at most 255 characters"),
];

export const routeMapIdParamValidator = [
  param("id").isUUID().withMessage("Invalid route map id"),
];

const repeatTypeValues = ["ONCE", "DAILY", "WEEKLY", "MON_FRI", "SUN", "CUSTOM"];

export const createScheduledSlotValidator = [
  body("slotDate")
    .notEmpty()
    .withMessage("Select Date is required")
    .isISO8601()
    .withMessage("Invalid date format (use YYYY-MM-DD)")
    .custom((val) => {
      const [y, m, d] = String(val).split("-").map(Number);
      if (!y || !m || !d) return false;
      const slot = new Date(Date.UTC(y, m - 1, d));
      const today = new Date();
      const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      return slot >= todayUTC;
    })
    .withMessage("slotDate must be today or a future date"),
  body("startTime")
    .trim()
    .notEmpty()
    .withMessage("Start Time is required")
    .custom((val) => isValidTimeFormat(val))
    .withMessage("Start Time must be HH:mm 24-hour format (e.g. 09:00)"),
  body("endTime")
    .trim()
    .notEmpty()
    .withMessage("End Time is required")
    .custom((val) => isValidTimeFormat(val))
    .withMessage("End Time must be HH:mm 24-hour format (e.g. 18:00)"),
  body()
    .custom((_, { req }) => {
      const start = req.body?.startTime != null ? String(req.body.startTime).trim() : "";
      const end = req.body?.endTime != null ? String(req.body.endTime).trim() : "";
      if (!start || !end) return true;
      return start < end;
    })
    .withMessage("startTime must be before endTime"),
  body("routeMapId")
    .notEmpty()
    .withMessage("Route/Area is required")
    .isUUID()
    .withMessage("Invalid route/area selection"),
  body("ordersPerSlot")
    .notEmpty()
    .withMessage("Order Per Slot is required")
    .isInt({ min: 1 })
    .withMessage("Order Per Slot must be at least 1"),
  body("isRepeat").optional().isBoolean().withMessage("isRepeat must be a boolean"),
  body("repeatType")
    .optional()
    .isIn(repeatTypeValues)
    .withMessage(`repeatType must be one of: ${repeatTypeValues.join(", ")}`),
  body("customDays")
    .optional()
    .isArray()
    .withMessage("customDays must be an array"),
  body("customDays.*")
    .optional()
    .isString()
    .withMessage("Each custom day must be a string"),
];

export const updateScheduledSlotValidator = [
  param("id").isUUID().withMessage("Invalid slot id"),
  body("slotDate")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format (use YYYY-MM-DD)")
    .custom((val) => {
      if (!val) return true;
      const [y, m, d] = String(val).split("-").map(Number);
      if (!y || !m || !d) return false;
      const slot = new Date(Date.UTC(y, m - 1, d));
      const today = new Date();
      const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      return slot >= todayUTC;
    })
    .withMessage("slotDate must be today or a future date"),
  body("startTime")
    .optional()
    .custom((val) => {
      if (val === undefined || val === null) return true;
      const s = String(val).trim();
      if (!s) return false;
      return isValidTimeFormat(s);
    })
    .withMessage("When provided, Start Time must be non-empty and HH:mm 24-hour format (e.g. 09:00)"),
  body("endTime")
    .optional()
    .custom((val) => {
      if (val === undefined || val === null) return true;
      const s = String(val).trim();
      if (!s) return false;
      return isValidTimeFormat(s);
    })
    .withMessage("When provided, End Time must be non-empty and HH:mm 24-hour format (e.g. 18:00)"),
  body()
    .custom((_, { req }) => {
      const start = req.body?.startTime != null ? String(req.body.startTime).trim() : "";
      const end = req.body?.endTime != null ? String(req.body.endTime).trim() : "";
      if (!start || !end) return true;
      return start < end;
    })
    .withMessage("startTime must be before endTime"),
  body("routeMapId").optional().isUUID().withMessage("Invalid route/area selection"),
  body("ordersPerSlot")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Order Per Slot must be at least 1"),
  body("isRepeat").optional().isBoolean().withMessage("isRepeat must be a boolean"),
  body("repeatType")
    .optional()
    .isIn(repeatTypeValues)
    .withMessage(`repeatType must be one of: ${repeatTypeValues.join(", ")}`),
  body("customDays")
    .optional()
    .isArray()
    .withMessage("customDays must be an array"),
];

export const scheduledSlotIdParamValidator = [
  param("id").isUUID().withMessage("Invalid slot id"),
];

// ---------------------------------------------------------------------------
// Route Pincode Management
// ---------------------------------------------------------------------------
export const createRoutePincodesValidator = [
  body("routeMapId")
    .notEmpty()
    .withMessage("routeMapId is required")
    .isUUID()
    .withMessage("Invalid routeMapId"),
  body("pincodes")
    .isArray()
    .withMessage("pincodes must be an array")
    .custom((arr) => arr.length > 0 && arr.length <= 500)
    .withMessage("pincodes must have 1–500 items"),
  body("pincodes.*")
    .trim()
    .notEmpty()
    .withMessage("Each pincode must be a non-empty string")
    .isLength({ min: 1, max: 20 })
    .withMessage("Each pincode must be 1–20 characters"),
];

export const routePincodeIdParamValidator = [
  param("id").isUUID().withMessage("Invalid route pincode id"),
];

// ---------------------------------------------------------------------------
// Pickup Slot Management (Partner)
// ---------------------------------------------------------------------------
const PICKUP_REPEAT_TYPES = ["ONCE", "DAILY", "WEEKLY", "MON_FRI", "SUN", "CUSTOM"];

export const createPickupSlotValidator = [
  body("date")
    .notEmpty()
    .withMessage("date is required")
    .isISO8601()
    .withMessage("date must be YYYY-MM-DD"),
  body("startTime")
    .trim()
    .notEmpty()
    .withMessage("startTime is required")
    .custom((val) => isValidTimeFormat(val))
    .withMessage("startTime must be HH:mm (e.g. 09:00)"),
  body("endTime")
    .trim()
    .notEmpty()
    .withMessage("endTime is required")
    .custom((val) => isValidTimeFormat(val))
    .withMessage("endTime must be HH:mm (e.g. 18:00)"),
  body()
    .custom((_, { req }) => {
      const start = req.body?.startTime != null ? String(req.body.startTime).trim() : "";
      const end = req.body?.endTime != null ? String(req.body.endTime).trim() : "";
      if (!start || !end) return true;
      return start < end;
    })
    .withMessage("startTime must be before endTime"),
  body("slot")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("slot label must be at most 100 characters"),
  body("capacity")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("capacity must be 1–1000"),
  body("repeat").optional().isBoolean().withMessage("repeat must be a boolean"),
  body("repeatType")
    .optional()
    .isIn(PICKUP_REPEAT_TYPES)
    .withMessage(`repeatType must be one of: ${PICKUP_REPEAT_TYPES.join(", ")}`),
  body("customDays")
    .optional()
    .isArray()
    .withMessage("customDays must be an array"),
  body("customDays.*").optional().isString().withMessage("Each custom day must be a string"),
];

export const updatePickupSlotValidator = [
  param("id").isUUID().withMessage("Invalid pickup slot id"),
  body("date")
    .optional()
    .isISO8601()
    .withMessage("date must be YYYY-MM-DD"),
  body("startTime")
    .optional()
    .custom((val) => val == null || val === "" || isValidTimeFormat(String(val).trim()))
    .withMessage("startTime must be HH:mm"),
  body("endTime")
    .optional()
    .custom((val) => val == null || val === "" || isValidTimeFormat(String(val).trim()))
    .withMessage("endTime must be HH:mm"),
  body()
    .custom((_, { req }) => {
      const start = req.body?.startTime != null ? String(req.body.startTime).trim() : "";
      const end = req.body?.endTime != null ? String(req.body.endTime).trim() : "";
      if (!start || !end) return true;
      return start < end;
    })
    .withMessage("startTime must be before endTime"),
  body("slot").optional().trim().isLength({ max: 100 }).withMessage("slot label at most 100 characters"),
  body("capacity").optional().isInt({ min: 1, max: 1000 }).withMessage("capacity must be 1–1000"),
  body("repeat").optional().isBoolean().withMessage("repeat must be a boolean"),
  body("repeatType").optional().isIn(PICKUP_REPEAT_TYPES).withMessage("Invalid repeatType"),
  body("customDays").optional().isArray().withMessage("customDays must be an array"),
  body("isActive").optional().isBoolean().withMessage("isActive must be a boolean"),
];

export const pickupSlotIdParamValidator = [
  param("id").isUUID().withMessage("Invalid pickup slot id"),
];

// ---------------------------------------------------------------------------
// Warehouse Blackout Management
// ---------------------------------------------------------------------------
export const createWarehouseBlackoutValidator = [
  body("date")
    .notEmpty()
    .withMessage("date is required")
    .isISO8601()
    .withMessage("date must be YYYY-MM-DD"),
  body("reason")
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("reason must be at most 255 characters"),
];

export const warehouseBlackoutIdParamValidator = [
  param("id").isUUID().withMessage("Invalid warehouse blackout id"),
];
