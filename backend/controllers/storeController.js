// controllers/storeController.js
import { prisma } from '../config/prismaClient.js';
import logger from '../utils/logger.js';
import { errorResponse, successResponse } from '../utils/responseHelper.js';
import pkg from '@prisma/client';
const { Status } = pkg;

/**
 * Get partner's store profile
 * GET /api/v1/partner/store/profile
 */
export const getStoreProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const store = await prisma.store.findUnique({
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

        if (!store) {
            logger.warn('Store not found for user', { userId });
            return errorResponse(res, 404, 'Store profile not found. Please complete your store registration.');
        }

        logger.info('Store profile retrieved', { userId, storeId: store.id });
        return successResponse(res, 200, store, 'Store profile retrieved successfully');
    } catch (error) {
        logger.error('Error fetching store profile', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id
        });
        return errorResponse(res, 500, 'Internal server error');
    }
};

/**
 * Update partner's store profile
 * PUT /api/v1/partner/store/profile
 */
export const updateStoreProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            name,
            description,
            categoryIds,
            taxName,
            taxNumber,
            panNumber,
            logoUrl,
            nationalIdUrl,
            addressProofUrl
        } = req.body;

        // Check if store exists
        const existingStore = await prisma.store.findUnique({
            where: { userId }
        });

        if (!existingStore) {
            return errorResponse(res, 404, 'Store profile not found. Please complete your store registration.');
        }

        // Prepare update data (only include fields that are provided)
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (categoryIds !== undefined) updateData.categoryIds = categoryIds;
        if (taxName !== undefined) updateData.taxName = taxName;
        if (taxNumber !== undefined) updateData.taxNumber = taxNumber;
        if (panNumber !== undefined) updateData.panNumber = panNumber;
        if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
        if (nationalIdUrl !== undefined) updateData.nationalIdUrl = nationalIdUrl;
        if (addressProofUrl !== undefined) updateData.addressProofUrl = addressProofUrl;

        // Update store
        const updatedStore = await prisma.store.update({
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

        logger.info('Store profile updated', { userId, storeId: updatedStore.id });
        return successResponse(res, 200, updatedStore, 'Store profile updated successfully');
    } catch (error) {
        logger.error('Error updating store profile', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id
        });
        return errorResponse(res, 500, 'Internal server error');
    }
};

/**
 * Get store status
 * GET /api/v1/partner/store/status
 */
export const getStoreStatus = async (req, res) => {
    try {
        const userId = req.user.id;

        const store = await prisma.store.findUnique({
            where: { userId },
            select: {
                id: true,
                status: true,
                name: true
            }
        });

        if (!store) {
            return errorResponse(res, 404, 'Store profile not found');
        }

        return successResponse(res, 200, {
            status: store.status,
            storeId: store.id,
            storeName: store.name
        }, 'Store status retrieved successfully');
    } catch (error) {
        logger.error('Error fetching store status', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id
        });
        return errorResponse(res, 500, 'Internal server error');
    }
};

/**
 * Create store profile (for new partner registration)
 * POST /api/v1/partner/store
 */
export const createStoreProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        // Check if store already exists
        const existingStore = await prisma.store.findUnique({
            where: { userId }
        });

        if (existingStore) {
            return errorResponse(res, 409, 'Store profile already exists. Use update endpoint to modify.');
        }

        const {
            name,
            description,
            categoryIds,
            taxName,
            taxNumber,
            panNumber,
            logoUrl,
            nationalIdUrl,
            addressProofUrl
        } = req.body;

        // Validate required fields
        if (!name || !panNumber || !logoUrl || !nationalIdUrl || !addressProofUrl) {
            return errorResponse(res, 400, 'name, panNumber, logoUrl, nationalIdUrl, and addressProofUrl are required');
        }

        // Create store
        const store = await prisma.store.create({
            data: {
                userId,
                name,
                description: description || null,
                categoryIds: categoryIds || [],
                taxName: taxName || null,
                taxNumber: taxNumber || null,
                panNumber,
                logoUrl,
                nationalIdUrl,
                addressProofUrl,
                status: Status.ACTIVE,
                commission: 0
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

        logger.info('Store profile created', { userId, storeId: store.id });
        return successResponse(res, 201, store, 'Store profile created successfully');
    } catch (error) {
        logger.error('Error creating store profile', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id
        });
        return errorResponse(res, 500, 'Internal server error');
    }
};

/**
 * Get store documents URLs
 * GET /api/v1/partner/store/documents
 */
export const getStoreDocuments = async (req, res) => {
    try {
        const userId = req.user.id;

        const store = await prisma.store.findUnique({
            where: { userId },
            select: {
                id: true,
                logoUrl: true,
                nationalIdUrl: true,
                addressProofUrl: true
            }
        });

        if (!store) {
            return errorResponse(res, 404, 'Store profile not found');
        }

        const documents = {
            logo: store.logoUrl,
            nationalId: store.nationalIdUrl,
            addressProof: store.addressProofUrl
        };

        return successResponse(res, 200, documents, 'Store documents retrieved successfully');
    } catch (error) {
        logger.error('Error fetching store documents', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id
        });
        return errorResponse(res, 500, 'Internal server error');
    }
};
