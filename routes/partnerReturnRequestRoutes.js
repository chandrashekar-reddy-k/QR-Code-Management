// routes/partnerReturnRequestRoutes.js
import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requirePartner } from "../middlewares/partnerMiddleware.js";
import {
  listPartnerReturnRequests,
  getReturnRequestById,
  approveReturnItem,
  rejectReturnItem,
  confirmWarehouseReceipt,
  updateReturnPhase
} from "../controllers/partnerReturnRequestController.js";

const router = express.Router();

// Secure all return request endpoints with auth + partner role checks
router.use(authMiddleware, requirePartner);

// GET /api/v1/partner/return-requests - List return requests
router.get("/", listPartnerReturnRequests);

// GET /api/v1/partner/return-requests/:id - View return request details
router.get("/:id", getReturnRequestById);

// POST /api/v1/partner/return-requests/:id/approve - Approve item return via OMS
router.post("/:id/approve", approveReturnItem);

// POST /api/v1/partner/return-requests/:id/reject - Reject item return via OMS
router.post("/:id/reject", rejectReturnItem);

// POST /api/v1/partner/return-requests/:id/receive - Confirm warehouse receipt + QC
router.post("/:id/receive", confirmWarehouseReceipt);

// PATCH & PUT /api/v1/partner/return-requests/:id/phase - Update return lifecycle stage
router.patch("/:id/phase", updateReturnPhase);
router.put("/:id/phase", updateReturnPhase);

export default router;
