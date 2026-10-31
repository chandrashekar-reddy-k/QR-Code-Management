import express from "express";
import { validateRequest } from "../../middlewares/validateReqMiddleware.js";
import { createProductVariant, getVariantsByProductId, getVariantById, updateProductVariant, disableVariant,
    downloadProductVariantTemplate,
    downloadProductVariantUpdateTemplate,
    bulkUploadProductVariants,
    bulkUpdateProductVariants,
    getProductIdAndName
 } from "../../controllers/product&invManagement/varientController.js";
import { createVariantValidation, updateVariantValidation, productIdParamValidation, variantIdParamValidation } from "../../validations/varientValidations.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.get(
  "/id-name",
  authMiddleware,
  getProductIdAndName
);
router.get('/bulk-template', authMiddleware, downloadProductVariantTemplate)
router.get('/bulk-update-template', authMiddleware, downloadProductVariantUpdateTemplate)
router.post('/bulk-upload', authMiddleware, bulkUploadProductVariants)
router.post('/bulk-update', authMiddleware, bulkUpdateProductVariants)
router.post("/", createVariantValidation, validateRequest, createProductVariant);
router.get("/product/:productId", productIdParamValidation, validateRequest, getVariantsByProductId);
router.get("/:id", variantIdParamValidation, validateRequest, getVariantById);
router.put("/:id", updateVariantValidation, validateRequest, updateProductVariant);
router.delete("/delete/:id", variantIdParamValidation, validateRequest, disableVariant);



export default router;