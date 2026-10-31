import { body, param, query, validationResult } from "express-validator";
import logger from "../utils/logger.js";
import { errorResponse } from "../utils/responseHelper.js";

export const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);

    if (errors.isEmpty()) {
      return next();
    }

    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    logger.warn("[CAMPAIGN] Validation failed", {
      url: req.originalUrl,
      method: req.method,
      errors: formattedErrors,
    });

    return errorResponse(res, 400, formattedErrors, "Validation failed");
  };
};

export const createCampaignValidation = validate([
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Campaign name is required")
    .isLength({ max: 255 })
    .withMessage("Campaign name must not exceed 255 characters"),

  body("promoCodeId")
    .optional({ nullable: true, checkFalsy: true })
    .isUUID()
    .withMessage("promoCodeId must be a valid UUID"),

  body("bannerId")
    .optional({ nullable: true, checkFalsy: true })
    .isUUID()
    .withMessage("bannerId must be a valid UUID"),

  body("startDate")
    .notEmpty()
    .withMessage("startDate is required")
    .isISO8601()
    .withMessage("startDate must be a valid date"),

  body("endDate")
    .notEmpty()
    .withMessage("endDate is required")
    .isISO8601()
    .withMessage("endDate must be a valid date"),

  body("status")
    .optional()
    .isIn(["ACTIVE", "INACTIVE"])
    .withMessage("status must be either ACTIVE or INACTIVE"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
]);

export const updateCampaignValidation = validate([
  param("campaignId")
    .isUUID()
    .withMessage("campaignId must be a valid UUID"),

  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Campaign name cannot be empty")
    .isLength({ max: 255 })
    .withMessage("Campaign name must not exceed 255 characters"),

  body("promoCodeId")
    .optional({ nullable: true, checkFalsy: false })
    .custom((value) => {
      if (value === null || value === "") return true;
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new Error("promoCodeId must be a valid UUID");
      }
      return true;
    }),

  body("bannerId")
    .optional({ nullable: true, checkFalsy: false })
    .custom((value) => {
      if (value === null || value === "") return true;
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new Error("bannerId must be a valid UUID");
      }
      return true;
    }),

  body("startDate")
    .optional()
    .isISO8601()
    .withMessage("startDate must be a valid date"),

  body("endDate")
    .optional()
    .isISO8601()
    .withMessage("endDate must be a valid date"),

  body("status")
    .optional()
    .isIn(["ACTIVE", "INACTIVE"])
    .withMessage("status must be either ACTIVE or INACTIVE"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
]);

export const getCampaignByIdValidation = validate([
  param("campaignId")
    .isUUID()
    .withMessage("campaignId must be a valid UUID"),
]);

export const deleteCampaignValidation = validate([
  param("campaignId")
    .isUUID()
    .withMessage("campaignId must be a valid UUID"),
]);

export const toggleCampaignValidation = validate([
  param("campaignId")
    .isUUID()
    .withMessage("campaignId must be a valid UUID"),
]);

export const getCampaignListValidation = validate([
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100"),

  query("search").optional().trim(),

  query("status")
    .optional()
    .isIn(["ACTIVE", "INACTIVE"])
    .withMessage("status must be either ACTIVE or INACTIVE"),

  query("isActive")
    .optional()
    .isIn(["true", "false"])
    .withMessage("isActive must be true or false"),

  query("promoCodeId")
    .optional()
    .isUUID()
    .withMessage("promoCodeId must be a valid UUID"),

  query("bannerId")
    .optional()
    .isUUID()
    .withMessage("bannerId must be a valid UUID"),
]);