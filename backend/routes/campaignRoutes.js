import express from "express";
import {
  createCampaign,
  getCampaignList,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  toggleCampaignStatus,
} from "../controllers/campaginController.js";

import {
  createCampaignValidation,
  updateCampaignValidation,
  getCampaignByIdValidation,
  deleteCampaignValidation,
  toggleCampaignValidation,
  getCampaignListValidation,
} from "../validations/campaignValidations.js";
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post("/create", authMiddleware, createCampaignValidation, createCampaign);
router.get("/getall", authMiddleware, getCampaignListValidation, getCampaignList);
router.get("/get/:campaignId", authMiddleware, getCampaignByIdValidation, getCampaignById);
router.put("/update/:campaignId", authMiddleware, updateCampaignValidation, updateCampaign);
router.patch("/toggle/:campaignId", authMiddleware, toggleCampaignValidation, toggleCampaignStatus);
router.delete("/delete/:campaignId", authMiddleware, deleteCampaignValidation, deleteCampaign);

export default router;