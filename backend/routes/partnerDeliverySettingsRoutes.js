// routes/partnerDeliverySettingsRoutes.js
import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requirePartner } from "../middlewares/partnerMiddleware.js";
import { validateRequest } from "../middlewares/validateReqMiddleware.js";
import {
  getDeliverySettings,
  updateDeliverySettings,
  getDeliveryTypes,
  updateDeliveryTypes,
  listRouteMaps,
  listRouteMapsOptions,
  getRouteMap,
  createRouteMap,
  updateRouteMap,
  deleteRouteMap,
  listScheduledSlots,
  getScheduledSlot,
  createScheduledSlot,
  updateScheduledSlot,
  deleteScheduledSlot,
  createRoutePincodes,
  listRoutePincodes,
  deleteRoutePincode,
  createPickupSlot,
  listPickupSlots,
  getPickupSlot,
  updatePickupSlot,
  deletePickupSlot,
  createWarehouseBlackout,
  listWarehouseBlackouts,
  deleteWarehouseBlackout,
} from "../controllers/deliverySettingsController.js";
import {
  updateDeliverySettingsValidator,
  updateDeliveryTypesValidator,
  createRouteMapValidator,
  updateRouteMapValidator,
  routeMapIdParamValidator,
  createScheduledSlotValidator,
  updateScheduledSlotValidator,
  scheduledSlotIdParamValidator,
  createRoutePincodesValidator,
  routePincodeIdParamValidator,
  createPickupSlotValidator,
  updatePickupSlotValidator,
  pickupSlotIdParamValidator,
  createWarehouseBlackoutValidator,
  warehouseBlackoutIdParamValidator,
} from "../validations/deliverySettingsValidation.js";

const router = express.Router();

// All routes require auth + partner role
router.use(authMiddleware, requirePartner);

// ---------------------------------------------------------------------------
// General delivery settings
// ---------------------------------------------------------------------------
// GET /api/v1/partner/delivery-settings - Get delivery settings
router.get("/", getDeliverySettings);
// PUT /api/v1/partner/delivery-settings - Update delivery settings
router.put(
  "/",
  updateDeliverySettingsValidator,
  validateRequest,
  updateDeliverySettings,
);

// ---------------------------------------------------------------------------
// Delivery Types (Express, Self Pickup, Scheduled Delivery)
// ---------------------------------------------------------------------------
// GET /api/v1/partner/delivery-settings/types
router.get("/types", getDeliveryTypes);
// PUT /api/v1/partner/delivery-settings/types
router.put(
  "/types",
  updateDeliveryTypesValidator,
  validateRequest,
  updateDeliveryTypes,
);

// ---------------------------------------------------------------------------
// Route Maps (Scheduled Delivery areas)
// ---------------------------------------------------------------------------
// GET /api/v1/partner/delivery-settings/route-maps - List with pagination, search, sort
router.get("/route-maps", listRouteMaps);
// GET /api/v1/partner/delivery-settings/route-maps/list - Options for dropdown
router.get("/route-maps/list", listRouteMapsOptions);
// POST /api/v1/partner/delivery-settings/route-maps
router.post(
  "/route-maps",
  createRouteMapValidator,
  validateRequest,
  createRouteMap,
);
// GET /api/v1/partner/delivery-settings/route-maps/:id
router.get(
  "/route-maps/:id",
  routeMapIdParamValidator,
  validateRequest,
  getRouteMap,
);
// PUT /api/v1/partner/delivery-settings/route-maps/:id
router.put(
  "/route-maps/:id",
  updateRouteMapValidator,
  validateRequest,
  updateRouteMap,
);
// DELETE /api/v1/partner/delivery-settings/route-maps/:id
router.delete(
  "/route-maps/:id",
  routeMapIdParamValidator,
  validateRequest,
  deleteRouteMap,
);

// ---------------------------------------------------------------------------
// Scheduled Delivery Slots
// ---------------------------------------------------------------------------
// GET /api/v1/partner/delivery-settings/slots - List with pagination, search, sort
router.get("/slots", listScheduledSlots);
// POST /api/v1/partner/delivery-settings/slots
router.post(
  "/slots",
  createScheduledSlotValidator,
  validateRequest,
  createScheduledSlot,
);
// GET /api/v1/partner/delivery-settings/slots/:id
router.get(
  "/slots/:id",
  scheduledSlotIdParamValidator,
  validateRequest,
  getScheduledSlot,
);
// PUT /api/v1/partner/delivery-settings/slots/:id
router.put(
  "/slots/:id",
  updateScheduledSlotValidator,
  validateRequest,
  updateScheduledSlot,
);
// DELETE /api/v1/partner/delivery-settings/slots/:id
router.delete(
  "/slots/:id",
  scheduledSlotIdParamValidator,
  validateRequest,
  deleteScheduledSlot,
);

// ---------------------------------------------------------------------------
// Route Pincode Management
// ---------------------------------------------------------------------------
// POST /api/v1/partner/delivery-settings/route-pincodes
router.post(
  "/route-pincodes",
  createRoutePincodesValidator,
  validateRequest,
  createRoutePincodes,
);
// GET /api/v1/partner/delivery-settings/route-pincodes?routeId=
router.get("/route-pincodes", listRoutePincodes);
// DELETE /api/v1/partner/delivery-settings/route-pincodes/:id
router.delete(
  "/route-pincodes/:id",
  routePincodeIdParamValidator,
  validateRequest,
  deleteRoutePincode,
);

// ---------------------------------------------------------------------------
// Pickup Slot Management (Partner)
// ---------------------------------------------------------------------------
// POST /api/v1/partner/delivery-settings/pickup-slots
router.post(
  "/pickup-slots",
  createPickupSlotValidator,
  validateRequest,
  createPickupSlot,
);
// GET /api/v1/partner/delivery-settings/pickup-slots?page=1&limit=10 (optional: fromDate, toDate)
router.get("/pickup-slots", listPickupSlots);
// GET /api/v1/partner/delivery-settings/pickup-slots/:id
router.get(
  "/pickup-slots/:id",
  pickupSlotIdParamValidator,
  validateRequest,
  getPickupSlot,
);
// PUT /api/v1/partner/delivery-settings/pickup-slots/:id
router.put(
  "/pickup-slots/:id",
  updatePickupSlotValidator,
  validateRequest,
  updatePickupSlot,
);
// DELETE /api/v1/partner/delivery-settings/pickup-slots/:id
router.delete(
  "/pickup-slots/:id",
  pickupSlotIdParamValidator,
  validateRequest,
  deletePickupSlot,
);

// ---------------------------------------------------------------------------
// Warehouse Blackout Management
// ---------------------------------------------------------------------------
// POST /api/v1/partner/delivery-settings/warehouse-blackouts
router.post(
  "/warehouse-blackouts",
  createWarehouseBlackoutValidator,
  validateRequest,
  createWarehouseBlackout,
);
// GET /api/v1/partner/delivery-settings/warehouse-blackouts?fromDate=&toDate=
router.get("/warehouse-blackouts", listWarehouseBlackouts);
// DELETE /api/v1/partner/delivery-settings/warehouse-blackouts/:id
router.delete(
  "/warehouse-blackouts/:id",
  warehouseBlackoutIdParamValidator,
  validateRequest,
  deleteWarehouseBlackout,
);

export default router;
