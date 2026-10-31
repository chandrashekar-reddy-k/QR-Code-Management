// controllers/supplierController.js
import { prisma } from '../config/prismaClient.js';
import logger from '../utils/logger.js';
import { errorResponse, successResponse } from '../utils/responseHelper.js';

/**
 * Get partner's supplier profile
 * GET /api/v1/partner/supplier/profile
 */
export const getSupplierProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const supplier = await prisma.supplier.findUnique({
            where: { userId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        avatar: true,
                        isActive: true,
                        isVerified: true
                    }
                }
            }
        });

        if (!supplier) {
            logger.warn('Supplier profile not found for user', { userId });
            return errorResponse(res, 404, 'Supplier profile not found. Please complete your supplier registration.');
        }

        logger.info('Supplier profile retrieved', { userId, supplierId: supplier.id });
        return successResponse(res, 200, supplier, 'Supplier profile retrieved successfully');
    } catch (error) {
        logger.error('Error fetching supplier profile', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id
        });
        return errorResponse(res, 500, 'Internal server error');
    }
};

/**
 * Update partner's supplier profile
 * PUT /api/v1/partner/supplier/profile
 */
export const updateSupplierProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            companyName,
            gstin,
            businessAddress,
            licenseDocs,
            operatingHours,
            deliveryOptions
        } = req.body;

        // Check if supplier exists
        const existingSupplier = await prisma.supplier.findUnique({
            where: { userId }
        });

        if (!existingSupplier) {
            return errorResponse(res, 404, 'Supplier profile not found. Please complete your supplier registration.');
        }

        // Prepare update data (only include fields that are provided)
        const updateData = {};
        if (companyName !== undefined) updateData.companyName = companyName;
        if (gstin !== undefined) updateData.gstin = gstin;
        if (businessAddress !== undefined) updateData.businessAddress = businessAddress;
        if (licenseDocs !== undefined) updateData.licenseDocs = licenseDocs;
        if (operatingHours !== undefined) updateData.operatingHours = operatingHours;
        if (deliveryOptions !== undefined) updateData.deliveryOptions = deliveryOptions;

        // Update supplier
        const updatedSupplier = await prisma.supplier.update({
            where: { userId },
            data: updateData,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        avatar: true
                    }
                }
            }
        });

        logger.info('Supplier profile updated', { userId, supplierId: updatedSupplier.id });
        return successResponse(res, 200, updatedSupplier, 'Supplier profile updated successfully');
    } catch (error) {
        logger.error('Error updating supplier profile', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id
        });
        return errorResponse(res, 500, 'Internal server error');
    }
};

/**
 * Create supplier profile (for partner registration)
 * POST /api/v1/partner/supplier
 */
export const createSupplierProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        // Check if supplier already exists
        const existingSupplier = await prisma.supplier.findUnique({
            where: { userId }
        });

        if (existingSupplier) {
            return errorResponse(res, 409, 'Supplier profile already exists. Use update endpoint to modify.');
        }

        const {
            companyName,
            gstin,
            businessAddress,
            licenseDocs,
            operatingHours,
            deliveryOptions
        } = req.body;

        // Validate required fields
        if (!companyName || !businessAddress) {
            return errorResponse(res, 400, 'companyName and businessAddress are required');
        }

        // Validate businessAddress is an object
        if (typeof businessAddress !== 'object' || Array.isArray(businessAddress)) {
            return errorResponse(res, 400, 'businessAddress must be a valid JSON object');
        }

        // Create supplier
        const supplier = await prisma.supplier.create({
            data: {
                userId,
                companyName,
                gstin: gstin || null,
                businessAddress,
                licenseDocs: licenseDocs || null,
                operatingHours: operatingHours || null,
                deliveryOptions: deliveryOptions || null
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        avatar: true
                    }
                }
            }
        });

        logger.info('Supplier profile created', { userId, supplierId: supplier.id });
        return successResponse(res, 201, supplier, 'Supplier profile created successfully');
    } catch (error) {
        logger.error('Error creating supplier profile', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id
        });
        return errorResponse(res, 500, 'Internal server error');
    }
};

/**
 * Get supplier documents URLs
 * GET /api/v1/partner/supplier/documents
 */
export const getSupplierDocuments = async (req, res) => {
    try {
        const userId = req.user.id;

        const supplier = await prisma.supplier.findUnique({
            where: { userId },
            select: {
                id: true,
                licenseDocs: true
            }
        });

        if (!supplier) {
            return errorResponse(res, 404, 'Supplier profile not found');
        }

        const documents = {
            licenseDocs: supplier.licenseDocs
        };

        return successResponse(res, 200, documents, 'Supplier documents retrieved successfully');
    } catch (error) {
        logger.error('Error fetching supplier documents', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id
        });
        return errorResponse(res, 500, 'Internal server error');
    }
};
