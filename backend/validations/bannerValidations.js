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

    logger.warn("[BANNER] Validation failed", {
      url: req.originalUrl,
      method: req.method,
      errors: formattedErrors,
    });

    return errorResponse(res, 400, formattedErrors, "Validation failed");
  };
};

export const createBannerValidation = validate([
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 255 })
    .withMessage("Title must not exceed 255 characters"),

  body("bannerType")
    .optional({ nullable: true })
    .isString()
    .withMessage("bannerType must be a string"),

  body("subtitle")
    .optional({ nullable: true })
    .isString()
    .withMessage("subtitle must be a string"),

  body("imageUrl")
    .trim()
    .notEmpty()
    .withMessage("imageUrl is required"),

  body("redirectUrl")
    .optional({ nullable: true, checkFalsy: true })
    .isURL()
    .withMessage("redirectUrl must be a valid URL"),

  body("position")
    .optional()
    .isInt({ min: 1 })
    .withMessage("position must be a positive integer"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),

  body("status")
    .optional()
    .isIn(["ACTIVE", "INACTIVE"])
    .withMessage("status must be either ACTIVE or INACTIVE"),

  body("startAt")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("startAt must be a valid date"),

  body("endAt")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("endAt must be a valid date"),
]);

export const updateBannerValidation = validate([
  param("bannerId")
    .isUUID()
    .withMessage("bannerId must be a valid UUID"),

  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty")
    .isLength({ max: 255 })
    .withMessage("Title must not exceed 255 characters"),

  body("bannerType")
    .optional({ nullable: true })
    .isString()
    .withMessage("bannerType must be a string"),

  body("subtitle")
    .optional({ nullable: true })
    .isString()
    .withMessage("subtitle must be a string"),

  body("imageUrl")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("imageUrl cannot be empty"),

  body("redirectUrl")
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (value === null || value === "") return true;
      try {
        new URL(value);
        return true;
      } catch {
        throw new Error("redirectUrl must be a valid URL");
      }
    }),

  body("position")
    .optional()
    .isInt({ min: 1 })
    .withMessage("position must be a positive integer"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),

  body("status")
    .optional()
    .isIn(["ACTIVE", "INACTIVE"])
    .withMessage("status must be either ACTIVE or INACTIVE"),

  body("startAt")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("startAt must be a valid date"),

  body("endAt")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("endAt must be a valid date"),
]);

export const getBannerByIdValidation = validate([
  param("bannerId")
    .isUUID()
    .withMessage("bannerId must be a valid UUID"),
]);

export const deleteBannerValidation = validate([
  param("bannerId")
    .isUUID()
    .withMessage("bannerId must be a valid UUID"),
]);

export const toggleBannerValidation = validate([
  param("bannerId")
    .isUUID()
    .withMessage("bannerId must be a valid UUID"),
]);

export const getBannerListValidation = validate([
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

  query("bannerType")
    .optional()
    .isString()
    .withMessage("bannerType must be a string"),
]);