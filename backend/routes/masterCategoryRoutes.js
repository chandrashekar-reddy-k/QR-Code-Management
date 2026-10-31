import express from "express";
import {
    getActiveCategoriesWithSubCategories,
    addWarehouseCategories,
    getPartnerWarehouseCategories,
    updateWarehouseCategories,
    toggleWarehouseCategoryStatus,
    requestNewCategory,
    requestNewSubCategory
} from "../controllers/masterCategoryController.js";
import { authMiddleware } from '../middlewares/authMiddleware.js';
const router = express.Router();

router.get(
  "/catandsubcat",
  authMiddleware,
  getActiveCategoriesWithSubCategories
);

router.post(
  "/catandsubcat/add",
  authMiddleware,
  addWarehouseCategories
);

router.post(
  "/request-category",
  authMiddleware,
  requestNewCategory
);

router.post(
  "/request-subcategory",
  authMiddleware,
  requestNewSubCategory
);

router.get(
  "/warehouse/catandsubcat",
  authMiddleware,
  getPartnerWarehouseCategories
)

router.put(
  "/warehouse/catandsubcat",
  authMiddleware,
  updateWarehouseCategories
)

router.patch(
  "/warehouse/catandsubcat/toggle/:id",
  authMiddleware,
  toggleWarehouseCategoryStatus
)

export default router;