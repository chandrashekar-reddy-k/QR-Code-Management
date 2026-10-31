import express from "express";
import {
  getInventoryAlerts,
  getInventoryAlertByProduct,
  getInventoryAlertSummary
} from "../../controllers/product&invManagement/alertsController.js";

import {
  getAlertByProductValidation,
  getAlertsValidation,
  getAlertSummaryValidation
} from "../../validations/alertValidation.js";

import { validateRequest } from "../../middlewares/validateReqMiddleware.js";

//import validateRequest from "../middlewares/validateRequest.js";

const router = express.Router();


router.get(
  "/",
  getAlertsValidation,
  validateRequest,
  getInventoryAlerts
);

router.get(
  "/alerts",
  getAlertsValidation,
  validateRequest,
  getInventoryAlerts
);

router.get(
  "/summary",
  getAlertSummaryValidation,
  getInventoryAlertSummary
);

router.get(
  "/alerts/summary",
  getAlertSummaryValidation,
  getInventoryAlertSummary
);

router.get(
  "/:productId",
  getAlertByProductValidation,
  validateRequest,
  getInventoryAlertByProduct
);

router.get(
  "/alerts/:productId",
  getAlertByProductValidation,
  validateRequest,
  getInventoryAlertByProduct
);

export default router;