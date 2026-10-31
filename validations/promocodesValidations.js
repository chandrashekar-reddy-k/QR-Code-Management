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

    logger.warn("[COUPON] Validation failed", {
      url: req.originalUrl,
      method: req.method,
      errors: formattedErrors,
    });

    return errorResponse(res, 400, formattedErrors, "Validation failed");
  };
};

const optionalNullableString = (field, label) =>
  body(field)
    .optional({ nullable: true, checkFalsy: false })
    .custom((value) => {
      if (value === null || value === "") return true;
      return typeof value === "string";
    })
    .withMessage(`${label} must be a string`);

const optionalNullableNumber = (field, label, min = 0) =>
  body(field)
    .optional({ nullable: true, checkFalsy: false })
    .custom((value) => {
      if (value === null || value === "") return true;

      const numberValue = Number(value);

      if (Number.isNaN(numberValue)) {
        throw new Error(`${label} must be a valid number`);
      }

      if (numberValue < min) {
        throw new Error(`${label} must be greater than or equal to ${min}`);
      }

      return true;
    });

const optionalNullableInt = (field, label, min = 1) =>
  body(field)
    .optional({ nullable: true, checkFalsy: false })
    .custom((value) => {
      if (value === null || value === "") return true;

      const numberValue = Number(value);

      if (!Number.isInteger(numberValue)) {
        throw new Error(`${label} must be a valid integer`);
      }

      if (numberValue < min) {
        throw new Error(`${label} must be greater than or equal to ${min}`);
      }

      return true;
    });

const timeValidation = (field, label) =>
  body(field)
    .optional({ nullable: true, checkFalsy: false })
    .custom((value) => {
      if (value === null || value === "") return true;

      if (typeof value !== "string") {
        throw new Error(`${label} must be a string`);
      }

      const isValidTime = /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);

      if (!isValidTime) {
        throw new Error(`${label} must be in HH:mm format`);
      }

      return true;
    });

const codeValidation = (field, required = false) => {
  let chain = body(field);

  if (required) {
    chain = chain
      .notEmpty()
      .withMessage(`${field} is required`);
  } else {
    chain = chain.optional();
  }

  return chain
    .trim()
    .isLength({ min: required ? 1 : 0, max: 255 })
    .withMessage(`${field} must not exceed 255 characters`);
};

const discountTypeValidation = (required = false) => {
  let chain = body("discountType");

  if (required) {
    chain = chain
      .notEmpty()
      .withMessage("discountType is required");
  } else {
    chain = chain.optional();
  }

  return chain
    .isIn(["PERCENTAGE", "RUPEES", "AMOUNT", "FLAT", "FIXED"])
    .withMessage(
      "discountType must be one of PERCENTAGE, RUPEES, AMOUNT, FLAT, FIXED"
    );
};

const statusValidation = body("status")
  .optional()
  .isIn(["ACTIVE", "INACTIVE"])
  .withMessage("status must be either ACTIVE or INACTIVE");

const isActiveValidation = body("isActive")
  .optional()
  .isBoolean()
  .withMessage("isActive must be boolean");

const applicablePincodesValidation = body("applicablePincodes")
  .optional()
  .isArray()
  .withMessage("applicablePincodes must be an array");

const booleanFieldValidation = (field) =>
  body(field)
    .optional()
    .isBoolean()
    .withMessage(`${field} must be boolean`);

const couponDateRangeValidation = body().custom((_, { req }) => {
  const startDate = req.body.startDate
  const endDate = req.body.endDate || req.body.expiryDate

  if (!startDate || !endDate) return true

  const startTime = req.body.startTime || '00:00'
  const endTime = req.body.endTime || '23:59'

  const buildDateTime = (dateValue, timeValue) => {
    const dateString = String(dateValue)

    // If date is full ISO, take only YYYY-MM-DD part
    const onlyDate = dateString.includes('T')
      ? dateString.split('T')[0]
      : dateString

    return new Date(`${onlyDate}T${timeValue}:00`)
  }

  const startDateTime = buildDateTime(startDate, startTime)
  const endDateTime = buildDateTime(endDate, endTime)

  if (
    Number.isNaN(startDateTime.getTime()) ||
    Number.isNaN(endDateTime.getTime())
  ) {
    throw new Error('Invalid date/time format')
  }

  if (endDateTime < startDateTime) {
    throw new Error(
      'End date/time must be greater than or equal to start date/time'
    )
  }

  return true
})

const createDiscountValueValidation = body().custom((_, { req }) => {
  const discountType = String(req.body.discountType || '').toUpperCase()

  const isPercentage = discountType === 'PERCENTAGE'
  const isRupees = ['RUPEES', 'AMOUNT', 'FLAT', 'FIXED'].includes(discountType)

  const pickValue = (...values) => {
    for (const value of values) {
      if (value !== undefined && value !== null && value !== '') {
        return value
      }
    }

    return undefined
  }

  const rawValue = isPercentage
    ? pickValue(req.body.value, req.body.percentageOff, req.body.discount)
    : pickValue(req.body.value, req.body.discount, req.body.percentageOff)

  if (rawValue === undefined) {
    throw new Error(
      'Discount value is required. Use value, discount, or percentageOff'
    )
  }

  const value = Number(rawValue)

  if (Number.isNaN(value)) {
    throw new Error('Discount value must be a valid number')
  }

  if (value <= 0) {
    throw new Error('Discount value must be greater than 0')
  }

  if (isPercentage && value > 100) {
    throw new Error('Percentage discount cannot be greater than 100')
  }

  if (!isPercentage && !isRupees) {
    throw new Error('Invalid discountType')
  }

  return true
})
const updateDiscountValueValidation = body().custom((_, { req }) => {
  const hasDiscountInput =
    req.body.value !== undefined ||
    req.body.discount !== undefined ||
    req.body.percentageOff !== undefined ||
    req.body.discountType !== undefined

  if (!hasDiscountInput) return true

  const discountType = String(req.body.discountType || '').toUpperCase()

  if (req.body.discountType !== undefined) {
    const validTypes = ['PERCENTAGE', 'RUPEES', 'AMOUNT', 'FLAT', 'FIXED']

    if (!validTypes.includes(discountType)) {
      throw new Error(
        'discountType must be one of PERCENTAGE, RUPEES, AMOUNT, FLAT, FIXED'
      )
    }
  }

  const pickValue = (...values) => {
    for (const value of values) {
      if (value !== undefined && value !== null && value !== '') {
        return value
      }
    }

    return undefined
  }

  const rawValue = pickValue(
    req.body.value,
    req.body.percentageOff,
    req.body.discount
  )

  if (rawValue === undefined) return true

  const value = Number(rawValue)

  if (Number.isNaN(value)) {
    throw new Error('Discount value must be a valid number')
  }

  if (value <= 0) {
    throw new Error('Discount value must be greater than 0')
  }

  if (discountType === 'PERCENTAGE' && value > 100) {
    throw new Error('Percentage discount cannot be greater than 100')
  }

  return true
})

export const createPromoCodeValidation = validate([
  body("promoCode")
    .custom((value, { req }) => {
      const code = value || req.body.code;

      if (!code || String(code).trim() === "") {
        throw new Error("promoCode/code is required");
      }

      if (String(code).trim().length > 255) {
        throw new Error("promoCode/code must not exceed 255 characters");
      }

      return true;
    }),

  optionalNullableString("code", "code"),

  optionalNullableString("title", "title"),

  optionalNullableString("message", "message"),

  optionalNullableString("description", "description"),

  body("startDate")
    .notEmpty()
    .withMessage("startDate is required")
    .isISO8601()
    .withMessage("startDate must be a valid date"),

  body("endDate")
    .custom((value, { req }) => {
      const endDate = value || req.body.expiryDate;

      if (!endDate) {
        throw new Error("endDate/expiryDate is required");
      }

      const parsedDate = new Date(endDate);

      if (Number.isNaN(parsedDate.getTime())) {
        throw new Error("endDate/expiryDate must be a valid date");
      }

      return true;
    }),

  body("expiryDate")
    .optional()
    .isISO8601()
    .withMessage("expiryDate must be a valid date"),

  timeValidation("startTime", "startTime"),

  timeValidation("endTime", "endTime"),

  optionalNullableInt("noOfUsers", "noOfUsers", 1),

  optionalNullableInt("usageLimit", "usageLimit", 1),

  optionalNullableInt("maxTotalUses", "maxTotalUses", 1),

  optionalNullableInt("maxUsesPerUser", "maxUsesPerUser", 1),

  body("minimumOrderAmount")
    .notEmpty()
    .withMessage("minimumOrderAmount/minOrderValue is required")
    .custom((value, { req }) => {
      const amount =
        value !== undefined && value !== ""
          ? Number(value)
          : Number(req.body.minOrderValue);

      if (Number.isNaN(amount)) {
        throw new Error("minimumOrderAmount/minOrderValue must be a valid number");
      }

      if (amount < 0) {
        throw new Error("minimumOrderAmount/minOrderValue cannot be negative");
      }

      return true;
    }),

  optionalNullableNumber("minOrderValue", "minOrderValue", 0),

  discountTypeValidation(true),

  createDiscountValueValidation,

  optionalNullableNumber("discount", "discount", 0),

  optionalNullableNumber("value", "value", 0),

  optionalNullableNumber("maxDiscountAmount", "maxDiscountAmount", 0),

  optionalNullableNumber("maxDiscount", "maxDiscount", 0),

  body("percentageOff")
    .optional({ nullable: true, checkFalsy: false })
    .custom((value) => {
      if (value === null || value === "") return true;

      const numberValue = Number(value);

      if (Number.isNaN(numberValue)) {
        throw new Error("percentageOff must be a valid number");
      }

      if (numberValue < 0 || numberValue > 100) {
        throw new Error("percentageOff must be between 0 and 100");
      }

      return true;
    }),

  optionalNullableString("appicableOn", "appicableOn"),

  optionalNullableString("applicableOn", "applicableOn"),

  optionalNullableString("scope", "scope"),

  body("productIds")
    .optional({ nullable: true })
    .isArray()
    .withMessage("productIds must be an array of product IDs"),

  body("productId")
    .optional({ nullable: true })
    .isString()
    .withMessage("productId must be a string"),

  body("repeatUsage")
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === "") return true;

      if (["ONE", "MULTIPLE", "ONE_TIME"].includes(String(value))) {
        return true;
      }

      const numberValue = Number(value);

      if (Number.isInteger(numberValue) && numberValue >= 1) {
        return true;
      }

      throw new Error(
        "repeatUsage must be ONE, ONE_TIME, MULTIPLE, or a positive number"
      );
    }),

  optionalNullableString("image", "image"),

  statusValidation,

  isActiveValidation,

  applicablePincodesValidation,

  booleanFieldValidation("newUserOnly"),

  booleanFieldValidation("firstOrderOnly"),

  optionalNullableString("termsUrl", "termsUrl"),

  couponDateRangeValidation,
]);

export const updatePromoCodeValidation = validate([
  param("promoCodeId")
    .isUUID()
    .withMessage("promoCodeId must be a valid UUID"),

  codeValidation("promoCode", false),

  optionalNullableString("code", "code"),

  optionalNullableString("title", "title"),

  optionalNullableString("message", "message"),

  optionalNullableString("description", "description"),

  body("startDate")
    .optional()
    .isISO8601()
    .withMessage("startDate must be a valid date"),

  body("endDate")
    .optional()
    .isISO8601()
    .withMessage("endDate must be a valid date"),

  body("expiryDate")
    .optional()
    .isISO8601()
    .withMessage("expiryDate must be a valid date"),

  timeValidation("startTime", "startTime"),

  timeValidation("endTime", "endTime"),

  optionalNullableInt("noOfUsers", "noOfUsers", 1),

  optionalNullableInt("usageLimit", "usageLimit", 1),

  optionalNullableInt("maxTotalUses", "maxTotalUses", 1),

  optionalNullableInt("maxUsesPerUser", "maxUsesPerUser", 1),

  optionalNullableNumber("minimumOrderAmount", "minimumOrderAmount", 0),

  optionalNullableNumber("minOrderValue", "minOrderValue", 0),

  discountTypeValidation(false),

  updateDiscountValueValidation,

  optionalNullableNumber("discount", "discount", 0),

  optionalNullableNumber("value", "value", 0),

  optionalNullableNumber("maxDiscountAmount", "maxDiscountAmount", 0),

  optionalNullableNumber("maxDiscount", "maxDiscount", 0),

  body("percentageOff")
    .optional({ nullable: true, checkFalsy: false })
    .custom((value) => {
      if (value === null || value === "") return true;

      const numberValue = Number(value);

      if (Number.isNaN(numberValue)) {
        throw new Error("percentageOff must be a valid number");
      }

      if (numberValue < 0 || numberValue > 100) {
        throw new Error("percentageOff must be between 0 and 100");
      }

      return true;
    }),

  optionalNullableString("appicableOn", "appicableOn"),

  optionalNullableString("applicableOn", "applicableOn"),

  optionalNullableString("scope", "scope"),

  body("productIds")
    .optional({ nullable: true })
    .isArray()
    .withMessage("productIds must be an array of product IDs"),

  body("productId")
    .optional({ nullable: true })
    .isString()
    .withMessage("productId must be a string"),

  body("repeatUsage")

    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === "") return true;

      if (["ONE", "MULTIPLE", "ONE_TIME"].includes(String(value))) {
        return true;
      }

      const numberValue = Number(value);

      if (Number.isInteger(numberValue) && numberValue >= 1) {
        return true;
      }

      throw new Error(
        "repeatUsage must be ONE, ONE_TIME, MULTIPLE, or a positive number"
      );
    }),

  optionalNullableString("image", "image"),

  statusValidation,

  isActiveValidation,

  applicablePincodesValidation,

  booleanFieldValidation("newUserOnly"),

  booleanFieldValidation("firstOrderOnly"),

  optionalNullableString("termsUrl", "termsUrl"),

  couponDateRangeValidation,
]);

export const getPromoCodeByIdValidation = validate([
  param("promoCodeId")
    .isUUID()
    .withMessage("promoCodeId must be a valid UUID"),
]);

export const deletePromoCodeValidation = validate([
  param("promoCodeId")
    .isUUID()
    .withMessage("promoCodeId must be a valid UUID"),
]);

export const togglePromoCodeValidation = validate([
  param("promoCodeId")
    .isUUID()
    .withMessage("promoCodeId must be a valid UUID"),
]);

export const getPromoCodeListValidation = validate([
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
    .isBoolean()
    .withMessage("isActive must be boolean"),

  query("discountType")
    .optional()
    .isIn(["PERCENTAGE", "RUPEES", "AMOUNT", "FLAT", "FIXED"])
    .withMessage(
      "discountType must be one of PERCENTAGE, RUPEES, AMOUNT, FLAT, FIXED"
    ),

  query("type")
    .optional()
    .isIn(["PERCENTAGE", "RUPEES", "AMOUNT", "FLAT", "FIXED"])
    .withMessage("type must be one of PERCENTAGE, RUPEES, AMOUNT, FLAT, FIXED"),

  query("scope")
    .optional()
    .isString()
    .withMessage("scope must be a string"),

  query("repeatUsage")
    .optional()
    .custom((value) => {
      if (["ONE", "MULTIPLE", "ONE_TIME"].includes(String(value))) {
        return true;
      }

      const numberValue = Number(value);

      if (Number.isInteger(numberValue) && numberValue >= 1) {
        return true;
      }

      throw new Error(
        "repeatUsage must be ONE, ONE_TIME, MULTIPLE, or a positive number"
      );
    }),
]);