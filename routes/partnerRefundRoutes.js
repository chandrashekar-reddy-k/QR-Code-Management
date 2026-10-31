import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requirePartner } from "../middlewares/partnerMiddleware.js";
import {
  listPartnerRefunds,
  getPartnerRefundStats
} from "../controllers/partnerRefundController.js";

const router = express.Router();

router.use(authMiddleware, requirePartner);

router.get("/stats", getPartnerRefundStats);
router.get("/", listPartnerRefunds);

export default router;
