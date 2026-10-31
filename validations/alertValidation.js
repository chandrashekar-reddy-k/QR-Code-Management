import { query, param } from "express-validator";

/**
 * GET /api/inventory/alerts
 */
export const getAlertsValidation = [
  query("type")
    .optional()
    .isIn(["LOW_STOCK", "OUT_OF_STOCK", "NEGATIVE_STOCK", "all"])
    .withMessage("Invalid alert type"),

  query("warehouseId")
    .optional()
    .isUUID()
    .withMessage("Invalid warehouseId"),

  query("search")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage("Search must be a valid string"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be >= 1"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100")
];

/**
 * GET /api/inventory/alerts/:productId
 */
export const getAlertByProductValidation = [
  param("productId")
    .isUUID()
    .withMessage("Invalid productId")
];

/**
 * GET /api/inventory/alerts/summary
 */
export const getAlertSummaryValidation = [];
