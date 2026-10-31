import express from "express";
import {
  getAllAppSections,
  getAppSectionById,
  createAppSection,
  updateAppSection,
  deleteAppSection,
} from "../controllers/appSectionConfigController.js";

const router = express.Router();

router.get("/", getAllAppSections);
router.get("/:id", getAppSectionById);
router.post("/", createAppSection);
router.put("/:id", updateAppSection);
router.delete("/:id", deleteAppSection);

export default router;
