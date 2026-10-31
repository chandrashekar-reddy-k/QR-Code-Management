import express from "express";
import {
  createGRN,
  getGRNs,
  getGRNById,
  completeGRN
} from "../../controllers/product&invManagement/grnController.js";


const router = express.Router();

router.post("/grn", createGRN);
router.get("/grn", getGRNs);
router.get("/grn/:id", getGRNById);
router.patch("/grn/:id/complete", completeGRN);
export default router;
