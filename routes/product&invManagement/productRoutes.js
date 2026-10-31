import express from "express";
import {
  createProduct,
  getProductList,
  getProductByProductId,
  updateProduct,
  updateChannelAllocation,
  getPendingProducts,
  updateProductStatus,
  downloadProductTemplate,
  downloadProductUpdateTemplate,
  downloadProductZipTemplate,
  bulkUploadProducts,
  bulkUpdateProducts,
  bulkZipUploadProducts,
  softDeleteProduct,
  getAllBrands,
  getAllCategories,
  getAllSubCategories,
  toggleProductStatus,
  importMasterProductToWarehouse,
  getUnitsByUnitType,
  getUnitTypes,
  getMasterProducts,
  getMasterProductById,
  getActiveTaxes,
  syncFlashDeal,
  getInventoryDashboardStats,
  updateProductLifecycle,
  bulkReturnToReady,
  bulkUpdateOnlinePrices,
  resetAllProductsStock,
  undoResetProductsStock,
  assignRandomProductsStock
} from "../../controllers/product&invManagement/productController.js";

import {
  getAllRatings,
  getRatingById
} from "../../controllers/product&invManagement/ratingController.js"

import {
  createProductValidator,
  updateProductValidator,
} from "../../validations/productValidation.js";

//import validateRequest from "../middlewares/validateRequest.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.get('/masterproducts/:id', authMiddleware, getMasterProductById)

router.post('/import/masterproduct', authMiddleware, importMasterProductToWarehouse)

router.get('/units/:unitTypeId', authMiddleware, getUnitsByUnitType)

router.get('/unittypes', authMiddleware, getUnitTypes)

router.get('/masterproducts', authMiddleware, getMasterProducts)

router.get(
  "/ratings",
  authMiddleware,
  getAllRatings
)

router.get(
  "/dashboard/stats",
  authMiddleware,
  getInventoryDashboardStats
)

router.get(
  "/ratings/:id",
  authMiddleware,
  getRatingById
)

// ----------------------------
// 📌 Create Product
// ----------------------------
router.post(
  "/",
  authMiddleware,         // enable if you require auth
  createProductValidator,

  createProduct
);

// ----------------------------
// 📌 Get Product List (with filters & pagination)
// ----------------------------
router.get(
  "/",
  authMiddleware,
  getProductList
);

// ----------------------------
// 📌 Partner Product Bulk APIs (matching Master Product structure)
// Must be BEFORE /:productId to avoid "template" being captured as productId
// 1. Download bulk upload template
// 2. Download bulk update template
// 3. Bulk upload products
// 4. Bulk update products
// ----------------------------
router.get(
  "/template/download",
  authMiddleware,
  downloadProductTemplate
);

router.get(
  "/template/update/download",
  authMiddleware,
  downloadProductUpdateTemplate
);

router.get(
  "/zip-template/download",
  authMiddleware,
  downloadProductZipTemplate
);

router.post(
  "/bulk",
  authMiddleware,
  bulkUploadProducts
);

router.post(
  "/bulk/update",
  authMiddleware,
  bulkUpdateProducts
);

router.post(
  "/bulk/zip",
  authMiddleware,
  bulkZipUploadProducts
);

router.post(
  "/bulk-update-online-price",
  authMiddleware,
  bulkUpdateOnlinePrices
);

// ----------------------------
// 📌 Get Pending Products
// ---------------------------- 
router.get(
  "/pending/list",
  authMiddleware,
  getPendingProducts
);

router.get(
  "/brands/list",
  authMiddleware,
  getAllBrands
);

router.get(
  "/categories/list",
  authMiddleware,
  getAllCategories
);
router.get(
  "/subcategories/list",
  authMiddleware,
  getAllSubCategories
);
router.get(
  "/taxes/active",
  authMiddleware,
  getActiveTaxes
);

// ----------------------------
// 📌 Get Single Product by ID
// ----------------------------
router.get(
  "/:productId",
  authMiddleware,
  getProductByProductId
);

// ----------------------------
// 📌 Update Product Status
// ----------------------------
router.put(
  "/:productId/status",
  authMiddleware,
  updateProductStatus
);

router.delete(
  "/:productId/delete",
  authMiddleware,
  softDeleteProduct
);

router.patch(
  "/toggle/:productId",
  authMiddleware,
  toggleProductStatus
);

router.patch(
  "/:productId/status",
  authMiddleware,
  updateProductStatus
);

// ----------------------------
// 📈 Flash Deal — sync global timer
// ----------------------------
router.put(
  "/flash-deal/sync",
  authMiddleware,
  syncFlashDeal
);

// ----------------------------
// 📦 Channel Allocation (Ready Inventory)
// ----------------------------
router.patch(
  "/:productId/channel-allocation",
  authMiddleware,
  updateChannelAllocation
);

// ----------------------------
// 📌 Update Product
// ----------------------------
router.put(
  "/:productId",
  authMiddleware,
  updateProductValidator,

  updateProduct
);



// ----------------------------
// 📌 Update Product Lifecycle (Channel Allocation status)
// ----------------------------
router.post(
  "/bulk/lifecycle/return-to-ready",
  authMiddleware,
  bulkReturnToReady
);

router.post(
  "/:productId/lifecycle",
  authMiddleware,
  updateProductLifecycle
);

router.post(
  "/reset-stock",
  authMiddleware,
  resetAllProductsStock
);

router.post(
  "/undo-reset-stock",
  authMiddleware,
  undoResetProductsStock
);

router.post(
  "/random-stock",
  authMiddleware,
  assignRandomProductsStock
);

export default router;
