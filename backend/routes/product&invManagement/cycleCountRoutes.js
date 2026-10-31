import express from "express";
import {
  createCycleCount,
  getCycleCounts,
  getCycleCountById,
  updateCycleCountStatus,
} from "../../controllers/product&invManagement/cycleCountController.js";

import {
  createCycleCountValidation,
  cycleCountIdValidation,
  listCycleCountValidation,
} from "../../validations/cycleCountValidation.js";

//import validateRequest from "../middlewares/validateRequest.js";

const router = express.Router();

router.post(
  "/",
  createCycleCountValidation,
  createCycleCount
);

router.get(
  "/",
  listCycleCountValidation,
  getCycleCounts
);

router.get(
  "/:id",
  cycleCountIdValidation,
  getCycleCountById
);

router.patch(
  "/:id/status",
  cycleCountIdValidation,
  updateCycleCountStatus
);


export default router;
