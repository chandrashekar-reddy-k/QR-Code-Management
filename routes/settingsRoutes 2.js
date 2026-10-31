import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requirePartner } from "../middlewares/partnerMiddleware.js";
import {
  createRack,
  deleteRack,
  createShelf,
  deleteShelf,
  createTray,
  deleteTray,
  getLayout,
  mapProductLocation,
  listProductLocations,
  deleteProductLocation,
  listProducts
} from "../controllers/settingsController.js";

const router = express.Router();

// Apply partner auth middleware
router.use(authMiddleware, requirePartner);

// Layout management routes
router.post("/racks", createRack);
router.delete("/racks/:id", deleteRack);
router.get("/layout", getLayout);

router.post("/shelves", createShelf);
router.delete("/shelves/:id", deleteShelf);

router.post("/trays", createTray);
router.delete("/trays/:id", deleteTray);

// Product mapping routes
router.post("/product-locations", mapProductLocation);
router.get("/product-locations", listProductLocations);
router.delete("/product-locations/:id", deleteProductLocation);
router.get("/products", listProducts);

export default router;
