// routes/partnerOrderRoutes.js
import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requirePartner } from "../middlewares/partnerMiddleware.js";
import { validateRequest } from "../middlewares/validateReqMiddleware.js";
import {
  getPartnerOrders,
  getPartnerDeliveryOrders,
  getPartnerPickupStoreOrders,
  getDeliveryAgents,
  getPartnerOrderById,
  getOrderTimeline,
  getOrderAuditHistory,
  acceptOrder,
  rejectOrder,
  updateOrderStatus,
  assignOrderToAgent,
  requestDeliveryOtp,
  verifyDelivery,
  bulkTransitionOrders,
  generatePickingList,
  getWarehouseStats,
  getAtpInventory,
  getEscalatedOrders,
  markPartnerItemUnavailable,
} from "../controllers/partnerOrderController.js";
import {
  orderIdParamValidator,
  updateOrderStatusValidator,
  rejectOrderValidator,
  assignAgentValidator,
  listOrdersQueryValidator,
  requestDeliveryOtpValidator,
  verifyDeliveryValidator,
  markItemUnavailableValidator,
} from "../validations/partnerOrderValidation.js";

const router = express.Router();

// All routes require auth + partner role
router.use(authMiddleware, requirePartner);

// GET /api/v1/partner/orders - List orders for ALL delivery types (optional: deliveryType, routeMapId)
router.get("/", listOrdersQueryValidator, validateRequest, getPartnerOrders);

// GET /api/v1/partner/orders/delivery - List delivery orders (optional: deliveryType=scheduled|express|fast, routeMapId when scheduled)
router.get("/delivery", listOrdersQueryValidator, validateRequest, getPartnerDeliveryOrders);

// GET /api/v1/partner/orders/pickup-store - List orders for PICKUP_STORE only (optional: cartType)
router.get("/pickup-store", listOrdersQueryValidator, validateRequest, getPartnerPickupStoreOrders);

// GET /api/v1/partner/orders/delivery-agents - List delivery agents (for assigning orders)
router.get("/delivery-agents", getDeliveryAgents);

// GET /api/v1/partner/orders/warehouse-stats - Get warehouse stats
router.get("/warehouse-stats", getWarehouseStats);

// GET /api/v1/partner/orders/atp-inventory - Get ATP inventory
router.get("/atp-inventory", getAtpInventory);

// GET /api/v1/partner/orders/escalated - Get escalated orders
router.get("/escalated", getEscalatedOrders);

// GET /api/v1/partner/orders/:orderId/timeline - Get order lifecycle timeline
router.get(
  "/:orderId/timeline",
  orderIdParamValidator,
  validateRequest,
  getOrderTimeline,
);

// GET /api/v1/partner/orders/:orderId/audit-history - Get order audit history
router.get(
  "/:orderId/audit-history",
  orderIdParamValidator,
  validateRequest,
  getOrderAuditHistory,
);

// GET /api/v1/partner/orders/:orderId - Get order details
router.get(
  "/:orderId",
  orderIdParamValidator,
  validateRequest,
  getPartnerOrderById,
);

// POST /api/v1/partner/orders/:orderId/accept - Accept order (PLACED → CONFIRMED)
router.post(
  "/:orderId/accept",
  orderIdParamValidator,
  validateRequest,
  acceptOrder,
);

// POST /api/v1/partner/orders/:orderId/reject - Reject order (PLACED → CANCELLED)
router.post(
  "/:orderId/reject",
  rejectOrderValidator,
  validateRequest,
  rejectOrder,
);

// PUT /api/v1/partner/orders/:orderId/status - Update status (CONFIRMED → PROCESSING → READY_FOR_PICKUP)
router.put(
  "/:orderId/status",
  updateOrderStatusValidator,
  validateRequest,
  updateOrderStatus,
);

// PUT /api/v1/partner/orders/:orderId/assign-agent - Assign order to delivery partner (READY_FOR_PICKUP → ASSIGNED_TO_AGENT)
router.put(
  "/:orderId/assign-agent",
  assignAgentValidator,
  validateRequest,
  assignOrderToAgent,
);

// POST /api/v1/partner/orders/:orderId/request-delivery-otp - Request delivery OTP from delivery-api
router.post(
  "/:orderId/request-delivery-otp",
  requestDeliveryOtpValidator,
  validateRequest,
  requestDeliveryOtp,
);

// POST /api/v1/partner/orders/:orderId/verify-delivery - Verify delivery OTP and complete delivery
router.post(
  "/:orderId/verify-delivery",
  verifyDeliveryValidator,
  validateRequest,
  verifyDelivery,
);

// POST /api/v1/partner/orders/bulk-transition - Bulk transition orders owned by partner's warehouse
router.post(
  "/bulk-transition",
  bulkTransitionOrders,
);

// POST /api/v1/partner/orders/picking-list - Generate consolidated picking list for selected orders
router.post(
  "/picking-list",
  generatePickingList,
);

// POST /api/v1/partner/orders/:orderId/items/:itemId/mark-unavailable - Mark item unavailable during picking
router.post(
  "/:orderId/items/:itemId/mark-unavailable",
  markItemUnavailableValidator,
  validateRequest,
  markPartnerItemUnavailable,
);

export default router;
