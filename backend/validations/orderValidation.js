import { checkSchema } from "express-validator";

export const updateOrderStatusValidator = checkSchema({
  orderId: {
    in: ["body"],
    notEmpty: {
      errorMessage: "orderId cannot be empty",
    },
    isString: {
      errorMessage: "orderId must be string",
    },
    trim: true,
  },
  status: {
    in: ["body"],
    notEmpty: {
      errorMessage: "status cannot be empty",
    },
    isString: {
      errorMessage: "status must be string",
    },
    isIn: {
      options: [[
        "PLACED",
        "CONFIRMED",
        "PROCESSING",
        "READY_FOR_PICKUP",
        "OUT_FOR_DELIVERY",
        "RETURN_INITIATED",
        "ASSIGNED_TO_AGENT",
        "PICKUP_OTP_PENDING",
        "PICKED_UP",
        "IN_TRANSIT",
        "DELIVERED",
        "CANCELLED",
        "FAILED",
        "RETURNED"
      ]],
      errorMessage: "Invalid status value",
    },
    trim: true,
  },
});

export const updateUserStatusValidator = checkSchema({
  agentId: {
    in: ["params"],
    isString: {
      errorMessage: "Agent ID must be a string",
    },
    notEmpty: {
      errorMessage: "Agent ID is required",
    },
  },
  isActive: {
    in: ["body"],
    isBoolean: {
      errorMessage: "isActive must be a boolean value (true/false)",
    },
    notEmpty: {
      errorMessage: "isActive is required",
    },
  },
});
