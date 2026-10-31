// routes/supplierRoutes.js
import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requirePartner } from '../middlewares/partnerMiddleware.js';
import {
    getSupplierProfile,
    updateSupplierProfile,
    createSupplierProfile,
    getSupplierDocuments
} from '../controllers/supplierController.js';
import {
    createSupplierValidator,
    updateSupplierValidator
} from '../validations/supplierValidation.js';
import { validationResult } from 'express-validator';
import { validationErrorResponse } from '../utils/responseHelper.js';

const router = express.Router();

// Validation middleware
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return validationErrorResponse(res, errors);
    }
    next();
};

// Supplier Profile Routes
router.get(
    '/profile',
    authMiddleware,
    requirePartner,
    getSupplierProfile
);

router.put(
    '/profile',
    authMiddleware,
    requirePartner,
    updateSupplierValidator,
    validate,
    updateSupplierProfile
);

router.post(
    '/',
    authMiddleware,
    requirePartner,
    createSupplierValidator,
    validate,
    createSupplierProfile
);

// Supplier Documents Routes
router.get(
    '/documents',
    authMiddleware,
    requirePartner,
    getSupplierDocuments
);

export default router;
