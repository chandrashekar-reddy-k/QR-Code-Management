import express from "express";
import { validateRequest } from "../../middlewares/validateReqMiddleware.js";
import { adjustStock, getStockAdjustHistory, getStockAdjustById } from "../../controllers/product&invManagement/stockAdjustController.js";
import { stockAdjustValidator, stockAdjustIdValidator } from "../../validations/stockAdjustValdation.js";

const router = express.Router();

router.post("/", stockAdjustValidator, validateRequest, adjustStock);
router.get("/history", getStockAdjustHistory);
router.get("/:id", stockAdjustIdValidator, validateRequest, getStockAdjustById);

export default router;
