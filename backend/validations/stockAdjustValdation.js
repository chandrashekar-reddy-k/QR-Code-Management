import { body, param } from "express-validator";

export const stockAdjustValidator = [
  body("productId").isUUID(),
  body("warehouseId").isUUID(),
  body("adjustmentType").isIn(["INCREASE", "DECREASE"]),
  body("reason").notEmpty(),
  body("quantity").isInt({ gt: 0 }),
  body("notes").optional()
];

export const stockAdjustIdValidator = [
  param("id").isUUID().withMessage("Invalid adjustment id")
];
