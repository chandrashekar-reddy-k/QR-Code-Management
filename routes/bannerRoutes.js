import express from "express";
import {
  createBanner,
  getBannerList,
  getBannerById,
  updateBanner,
  deleteBanner,
  toggleBannerStatus,
} from "../controllers/bannerController.js";

import {
  createBannerValidation,
  updateBannerValidation,
  getBannerByIdValidation,
  deleteBannerValidation,
  getBannerListValidation,
  toggleBannerValidation,
} from "../validations/bannerValidations.js";
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post("/create",authMiddleware, createBannerValidation, createBanner);
router.get("/getall",authMiddleware, getBannerListValidation, getBannerList);
router.get("/get/:bannerId", authMiddleware, getBannerByIdValidation, getBannerById);
router.put("/update/:bannerId", authMiddleware, updateBannerValidation, updateBanner);
router.patch("/toggle/:bannerId", authMiddleware, toggleBannerValidation, toggleBannerStatus);
router.delete("/delete/:bannerId", authMiddleware, deleteBannerValidation, deleteBanner);

export default router;