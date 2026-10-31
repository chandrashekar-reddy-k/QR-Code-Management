import { validationResult } from "express-validator";
import { validationErrorResponse } from "../utils/responseHelper.js";

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationErrorResponse(res, errors);
  }
  next();
};
