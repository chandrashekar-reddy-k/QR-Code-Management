import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requirePartner } from "../middlewares/partnerMiddleware.js";
import {
  createRack,
  deleteRack,
  updateRack,
  createShelf,
  deleteShelf,
  updateShelf,
  createTray,
  deleteTray,
  getLayout,
  mapProductLocation,
  listProductLocations,
  deleteProductLocation,
  listProducts,
  toggleRackStatus
} from "../controllers/settingsController.js";

const router = express.Router();

// Apply partner auth middleware
router.use(authMiddleware, requirePartner);

// Layout management routes
router.post("/racks", createRack);
router.put("/racks/:id", updateRack);
router.delete("/racks/:id", deleteRack);
router.patch("/racks/:id/status", toggleRackStatus);
router.get("/layout", getLayout);

router.post("/shelves", createShelf);
router.put("/shelves/:id", updateShelf);
router.delete("/shelves/:id", deleteShelf);

router.post("/trays", createTray);
router.delete("/trays/:id", deleteTray);

// Product mapping routes
router.post("/product-locations", mapProductLocation);
router.get("/product-locations", listProductLocations);
router.delete("/product-locations/:id", deleteProductLocation);
router.get("/products", listProducts);

export default router;
