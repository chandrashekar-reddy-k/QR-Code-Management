import express from "express";
import {
  getInventoryOverview,
  createStockTransfer,
  getStockTransfers,
  getTransferById,
  updateTransferStatus,
  getReservations,
  releaseReservationById
} from "../../controllers/product&invManagement/inventoryController.js";
import {
  createLocation,
  getLocations,
  getBalances,
  createBatch,
  getBatches,
  getStockLedger,
  updateLocation,
  getProductInventory,
  getLocationInventory,
  createMovement
} from "../../controllers/product&invManagement/unifiedInventoryController.js";

const router = express.Router();

// Overview
router.get("/overview", getInventoryOverview);

// Transfers
router.post("/transfers", createStockTransfer);
router.get("/transfers", getStockTransfers);
router.get("/transfers/:id", getTransferById);
router.patch("/transfers/:id/status", updateTransferStatus);

// Locations
router.post("/locations", createLocation);
router.get("/locations", getLocations);
router.put("/locations/:id", updateLocation);
router.post("/inventory-locations", createLocation);
router.get("/inventory-locations", getLocations);
router.put("/inventory-locations/:id", updateLocation);
router.get("/product/:id", getProductInventory);
router.get("/location/:id", getLocationInventory);

// Balances
router.get("/balances", getBalances);
router.get("/", getBalances);

// Batches
router.post("/batches", createBatch);
router.get("/batches", getBatches);

// Ledger
router.get("/ledger", getStockLedger);

// Movements
router.post("/movements", createMovement);
router.post("/inventory-movement", createMovement);

// Reservations
router.get("/reservations", getReservations);
router.post("/reservations/:id/release", releaseReservationById);

export default router;
