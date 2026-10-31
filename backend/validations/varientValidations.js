import { body, param } from "express-validator";

export const createVariantValidation = [
  body("productId").notEmpty().withMessage("productId is required"),
  body("sku").notEmpty().withMessage("sku is required"),
  body("variantName").notEmpty().withMessage("variantName is required"),
  body("unitType").notEmpty().withMessage("unitType is required"),
  body("warehouseId").optional(),
  body("categoryId").optional(),
  body("landingPrice").isFloat().withMessage("landingPrice must be a number"),
  body("mrp").optional().isFloat(),
  body("sellingPrice").optional().isFloat(),
  body("discountType").optional().isString(),
  body("discountValue").optional().isFloat(),
  body("stockQuantity").optional().isInt(),
  body("minOrderQty").optional().isInt(),
  body("maxOrderQty").optional().isInt(),
  body("lowStockThreshold").optional().isInt(),
];

export const updateVariantValidation = [
  param("id").notEmpty().withMessage("variant id is required"),
  body("sku").optional().isString(),
  body("variantName").optional().isString(),
  body("unitType").optional().isString(),
  body("landingPrice").optional().isFloat(),
  body("stockQuantity").optional().isInt(),
];

export const variantIdParamValidation = [
  param("id").notEmpty().withMessage("variant id is required"),
];

export const productIdParamValidation = [
  param("productId").notEmpty().withMessage("productId is required"),
];
