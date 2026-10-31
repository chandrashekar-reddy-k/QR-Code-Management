// middlewares/partnerMiddleware.js
import { errorResponse } from '../utils/responseHelper.js';
import pkg from '@prisma/client';
const { UserRole } = pkg;
import logger from '../utils/logger.js';

/**
 * Middleware to ensure the authenticated user has PARTNER role
 * Must be used after authMiddleware
 */
export const requirePartner = (req, res, next) => {
    if (!req.user) {
        logger.warn('Partner middleware - no user found in request', {
            ip: req.ip,
            path: req.path,
            method: req.method
        });
        return errorResponse(res, 401, 'Authentication required');
    }

    const normalizedUserRole = req.user.role ? req.user.role.trim().toUpperCase() : '';
    const allowedRoles = [
        "PARTNER",
        "SHOPKEEPER",
        "ADMIN",
        "SUPER_ADMIN",
        "REGIONAL_ADMIN",
        "OPERATIONAL_ADMIN",
        "OWNER",
        "STORE_MANAGER",
        "STORE MANAGER",
        "VEHICLE_AGENT",
        "DELIVERY_AGENT",
        "SALES_AGENT",
        "VSMS_AGENT"
    ];

    if (!allowedRoles.includes(normalizedUserRole)) {
        logger.warn('Access denied - Authorized role required', {
            userId: req.user.id,
            userRole: req.user.role,
            normalizedRole: normalizedUserRole,
            requiredRoles: allowedRoles,
            ip: req.ip,
            path: req.path
        });
        return errorResponse(res, 403, 'Partner, Shopkeeper, or Admin access required');
    }

    logger.debug('Partner access granted', {
        userId: req.user.id,
        role: req.user.role,
        path: req.path
    });

    next();
};
