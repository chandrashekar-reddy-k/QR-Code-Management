import { body, param, query } from "express-validator";

export const createCycleCountValidation = [
  body("locationId").isUUID().withMessage("Valid locationId required"),
  body("assignedToId").optional().isUUID().withMessage("Valid assignedToId must be a UUID if provided"),
  body("items").optional().isArray().withMessage("items must be an array"),
];

export const cycleCountIdValidation = [
  param("id").isUUID().withMessage("Invalid cycle count ID"),
];

export const listCycleCountValidation = [
  query("locationId").optional().isUUID(),
  query("assignedToId").optional().isUUID(),
  query("status").optional().isIn(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
];

export const updateCycleCountStatusValidation = [
  param("id").isUUID().withMessage("Invalid cycle count ID"),
  body("status")
    .isIn(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
    .withMessage("Invalid cycle count status"),
];
