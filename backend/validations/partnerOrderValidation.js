// validations/partnerOrderValidation.js
import { param, body, query } from "express-validator";

/** Delivery type filter values for order list (scheduled = SCHEDULED, express/fast = FAST) */
const DELIVERY_TYPE_QUERY_VALUES = ["scheduled", "express", "fast"];

/** Cart type filter: Single (individual) vs Group (Group/Shared Cart) */
const CART_TYPE_QUERY_VALUES = ["single", "group"];

/** Values accepted by PUT /orders/:id/status; controller enforces transitions (PICKED_UP is synced via delivery-api) */

const ORDER_STATUS_VALUES = [
  "PENDING",
  "PLACED",
  "CONFIRMED",
  "PACKED",
  "PROCESSING",
  "SHIPPED",
  "READY_FOR_PICKUP",
  "ASSIGNED_TO_AGENT",
  "PICKED_UP",
  "OUT_FOR_DELIVERY",
  "IN_TRANSIT",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
  "RETURN_INITIATED",
  "RETURNED",
  "REFUNDED"
]

export const orderIdParamValidator = [
  param("orderId")
    .notEmpty()
    .withMessage("orderId is required")
    .isUUID()
    .withMessage("orderId must be a valid UUID")
]

export const updateOrderStatusValidator = [
  param("orderId")
    .notEmpty()
    .withMessage("orderId is required")
    .isUUID()
    .withMessage("orderId must be a valid UUID"),

  body()
    .custom((value) => {
      if (!value.status && !value.nextStatus) {
        throw new Error("status or nextStatus is required")
      }

      return true
    }),

  body("status")
    .optional()
    .isString()
    .withMessage("status must be a string")
    .customSanitizer((value) =>
      typeof value === "string"
        ? value.trim().toUpperCase().replace(/\s+/g, "_")
        : value
    )
    .isIn(ORDER_STATUS_VALUES)
    .withMessage(`status must be one of: ${ORDER_STATUS_VALUES.join(", ")}`),

  body("nextStatus")
    .optional()
    .isString()
    .withMessage("nextStatus must be a string")
    .customSanitizer((value) =>
      typeof value === "string"
        ? value.trim().toUpperCase().replace(/\s+/g, "_")
        : value
    )
    .isIn(ORDER_STATUS_VALUES)
    .withMessage(
      `nextStatus must be one of: ${ORDER_STATUS_VALUES.join(", ")}`
    ),

  body("reasonCode")
    .optional()
    .isString()
    .withMessage("reasonCode must be a string"),

  body("reason")
    .optional()
    .isString()
    .withMessage("reason must be a string"),

  body("note")
    .optional()
    .isString()
    .withMessage("note must be a string"),

  body("metadata")
    .optional()
    .isObject()
    .withMessage("metadata must be an object")
]

export const rejectOrderValidator = [
  param("orderId")
    .notEmpty()
    .withMessage("orderId is required")
    .isUUID()
    .withMessage("orderId must be a valid UUID"),
  body("reason").optional().isString().withMessage("reason must be a string"),
];

export const assignAgentValidator = [
  param("orderId")
    .notEmpty()
    .withMessage("orderId is required")
    .isUUID()
    .withMessage("orderId must be a valid UUID"),
  body("agentId")
    .notEmpty()
    .withMessage("agentId is required")
    .isUUID()
    .withMessage("agentId must be a valid UUID"),
];

export const requestDeliveryOtpValidator = [
  param("orderId")
    .notEmpty()
    .withMessage("orderId is required")
    .isUUID()
    .withMessage("orderId must be a valid UUID"),
];

export const verifyDeliveryValidator = [
  param("orderId")
    .notEmpty()
    .withMessage("orderId is required")
    .isUUID()
    .withMessage("orderId must be a valid UUID"),
  body("otp")
    .notEmpty()
    .withMessage("otp is required")
    .isString()
    .withMessage("otp must be a string")
    .isLength({ min: 4, max: 8 })
    .withMessage("otp must be between 4 and 8 characters"),
];

/** Optional query validation for order list: deliveryType, routeMapId, cartType (single | group) */
export const listOrdersQueryValidator = [
  query("deliveryType")
    .optional()
    .isIn(DELIVERY_TYPE_QUERY_VALUES)
    .withMessage(`deliveryType must be one of: ${DELIVERY_TYPE_QUERY_VALUES.join(", ")}`),
  query("routeMapId")
    .optional()
    .isUUID()
    .withMessage("routeMapId must be a valid UUID"),
  query("cartType")
    .optional()
    .isIn(CART_TYPE_QUERY_VALUES)
    .withMessage(`cartType must be one of: ${CART_TYPE_QUERY_VALUES.join(", ")}`),
];

export const markItemUnavailableValidator = [
  param("orderId")
    .notEmpty()
    .withMessage("orderId is required")
    .isUUID()
    .withMessage("orderId must be a valid UUID"),
  param("itemId")
    .notEmpty()
    .withMessage("itemId is required")
    .isUUID()
    .withMessage("itemId must be a valid UUID"),
  body("reason").optional().isString().withMessage("reason must be a string"),
];

