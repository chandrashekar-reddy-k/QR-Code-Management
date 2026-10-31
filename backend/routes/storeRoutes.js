// routes/storeRoutes.js
import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requirePartner } from '../middlewares/partnerMiddleware.js';
import {
    getStoreProfile,
    updateStoreProfile,
    getStoreStatus,
    createStoreProfile,
    getStoreDocuments
} from '../controllers/storeController.js';
import {
    createStoreValidator,
    updateStoreValidator
} from '../validations/storeValidation.js';
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

// Store Profile Routes
router.get(
    '/profile',
    authMiddleware,
    requirePartner,
    getStoreProfile
);

router.put(
    '/profile',
    authMiddleware,
    requirePartner,
    updateStoreValidator,
    validate,
    updateStoreProfile
);

router.post(
    '/',
    authMiddleware,
    requirePartner,
    createStoreValidator,
    validate,
    createStoreProfile
);

// Store Status Routes
router.get(
    '/status',
    authMiddleware,
    requirePartner,
    getStoreStatus
);

// Store Documents Routes
router.get(
    '/documents',
    authMiddleware,
    requirePartner,
    getStoreDocuments
);

export default router;
