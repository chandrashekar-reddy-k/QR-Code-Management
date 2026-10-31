import express from "express";
import {
  createPromoCode,
  getPromoCodeList,
  getPromoCodeById,
  updatePromoCode,
  deletePromoCode,
  togglePromoCodeStatus,
} from "../controllers/promocodesController.js";

import {
  createPromoCodeValidation,
  updatePromoCodeValidation,
  getPromoCodeByIdValidation,
  deletePromoCodeValidation,
  togglePromoCodeValidation,
  getPromoCodeListValidation,
} from "../validations/promocodesValidations.js";
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post("/create", authMiddleware, createPromoCode);
router.get("/getall", authMiddleware, getPromoCodeList);
router.get("/get/:promoCodeId", authMiddleware, getPromoCodeByIdValidation, getPromoCodeById);
router.put("/update/:promoCodeId", authMiddleware, updatePromoCodeValidation, updatePromoCode);
router.patch("/toggle/:promoCodeId", authMiddleware, togglePromoCodeValidation, togglePromoCodeStatus);
router.delete("/delete/:promoCodeId", authMiddleware, deletePromoCodeValidation, deletePromoCode);

export default router;