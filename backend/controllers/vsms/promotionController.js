import { prisma } from '../../config/prismaClient.js';

// @desc    Create new promotion
// @route   POST /api/promotions
// @access  Admin
export const createPromotion = async (req, res) => {
    try {
        const promotion = await prisma.promotion.create({
            data: req.body
        });
        res.status(201).json(promotion);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get all promotions
// @route   GET /api/promotions
// @access  Admin/Agent
export const getPromotions = async (req, res) => {
    try {
        const { isActive, type } = req.query;
        const where = {};
        if (isActive !== undefined) where.isActive = isActive === 'true';
        if (type) where.type = type;

        const promotions = await prisma.promotion.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        res.json(promotions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update promotion
// @route   PUT /api/promotions/:id
// @access  Admin
export const updatePromotion = async (req, res) => {
    try {
        const promotion = await prisma.promotion.update({
            where: { id: req.params.id },
            data: req.body
        });
        res.json(promotion);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete promotion
// @route   DELETE /api/promotions/:id
// @access  Admin
export const deletePromotion = async (req, res) => {
    try {
        await prisma.promotion.delete({
            where: { id: req.params.id }
        });
        res.json({ message: 'Promotion removed' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Validate a promotion for a cart
// @route   POST /api/promotions/validate
// @access  Agent
export const validatePromotion = async (req, res) => {
    const { code, items = [], villageName, routeId, subtotal = 0, warehouseId } = req.body;

    if (!code) {
        return res.status(400).json({ message: 'Coupon code is required' });
    }

    const normalizedCode = String(code).trim().toUpperCase();

    try {
        // 1. Try finding in Coupon table (Primary system)
        const coupon = await prisma.coupon.findFirst({
            where: {
                code: normalizedCode,
                ...(warehouseId ? { OR: [{ warehouseId }, { warehouseId: null }] } : {})
            },
            include: {
                products: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                price: true,
                                mrp: true,
                                sku: true,
                            }
                        }
                    }
                }
            }
        });

        if (coupon) {
            if (!coupon.isActive) {
                return res.status(400).json({ message: 'Coupon is currently inactive' });
            }

            const now = new Date();
            if (coupon.startDate && now < new Date(coupon.startDate)) {
                return res.status(400).json({ message: 'Promo code has not started yet' });
            }
            if (coupon.expiryDate && now > new Date(coupon.expiryDate)) {
                return res.status(400).json({ message: 'Promo code has expired' });
            }

            if (coupon.maxTotalUses && coupon.totalUses >= coupon.maxTotalUses) {
                return res.status(400).json({ message: 'Coupon usage limit reached' });
            }

            if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
                return res.status(400).json({ message: `Minimum order value of ₹${coupon.minOrderValue} required` });
            }

            // Check if coupon is mapped to specific products
            const mappedProductIds = (coupon.products || []).map(p => p.productId);
            const isProductSpecific = mappedProductIds.length > 0 || String(coupon.scope).toUpperCase() === 'SPECIFIC_PRODUCTS';

            let eligibleAmount = subtotal;
            let appliedItems = [];

            if (isProductSpecific) {
                const matchingCartItems = items.filter(item => mappedProductIds.includes(item.productId));
                if (matchingCartItems.length === 0) {
                    const productNames = coupon.products.map(p => p.product?.name).filter(Boolean).slice(0, 3).join(', ');
                    return res.status(400).json({
                        message: `This coupon applies only to specific products: ${productNames || 'selected items'}. Please add them to cart.`
                    });
                }

                eligibleAmount = matchingCartItems.reduce((acc, item) => {
                    const itemPrice = Number(item.price || item.unitPrice || 0);
                    const qty = Number(item.quantity || 1);
                    return acc + (itemPrice * qty);
                }, 0);

                appliedItems = matchingCartItems;
            }

            // Calculate discount
            let calculatedDiscount = 0;
            const isPercentage = String(coupon.type).toUpperCase() === 'PERCENTAGE' || String(coupon.type).toUpperCase() === 'DISCOUNT';

            if (isPercentage) {
                calculatedDiscount = (eligibleAmount * Number(coupon.value || 0)) / 100;
                if (coupon.maxDiscount && calculatedDiscount > coupon.maxDiscount) {
                    calculatedDiscount = coupon.maxDiscount;
                }
            } else {
                // Flat/amount discount
                calculatedDiscount = Math.min(Number(coupon.value || 0), eligibleAmount);
            }

            return res.json({
                id: coupon.id,
                code: coupon.code,
                title: coupon.title,
                type: coupon.type,
                discountType: isPercentage ? 'PERCENTAGE' : 'FLAT',
                discountValue: coupon.value,
                calculatedDiscount: Math.round(calculatedDiscount * 100) / 100,
                isProductSpecific,
                appliedProducts: coupon.products.map(p => p.product || p),
                appliedItems,
                message: `Applied successfully! Saved ₹${Math.round(calculatedDiscount * 100) / 100}`
            });
        }

        // 2. Fallback to legacy Promotion table if exists
        const promotion = await prisma.promotion.findUnique({
            where: { code: normalizedCode }
        });

        if (!promotion || !promotion.isActive) {
            return res.status(404).json({ message: 'Invalid or inactive coupon code' });
        }

        const now = new Date();
        if (promotion.startDate && now < promotion.startDate) {
            return res.status(400).json({ message: 'Promotion has not started yet' });
        }
        if (promotion.endDate && now > promotion.endDate) {
            return res.status(400).json({ message: 'Promotion has expired' });
        }

        if (promotion.usageLimit && promotion.usedCount >= promotion.usageLimit) {
            return res.status(400).json({ message: 'Coupon usage limit reached' });
        }

        if (promotion.minOrderAmount && subtotal < promotion.minOrderAmount) {
            return res.status(400).json({ message: `Minimum order amount of ₹${promotion.minOrderAmount} required` });
        }

        if (promotion.targetRouteIds?.length > 0 && routeId && !promotion.targetRouteIds.includes(routeId)) {
            return res.status(400).json({ message: 'Coupon not applicable for this route' });
        }

        if (promotion.targetVillageNames?.length > 0 && villageName && !promotion.targetVillageNames.includes(villageName)) {
            return res.status(400).json({ message: 'Coupon not applicable for this village' });
        }

        let calculatedDiscount = 0;
        if (promotion.type === 'PERCENTAGE') {
            calculatedDiscount = (subtotal * promotion.discount) / 100;
            if (promotion.maxDiscount && calculatedDiscount > promotion.maxDiscount) {
                calculatedDiscount = promotion.maxDiscount;
            }
        } else {
            calculatedDiscount = Math.min(promotion.discount, subtotal);
        }

        res.json({
            ...promotion,
            calculatedDiscount: Math.round(calculatedDiscount * 100) / 100
        });
    } catch (error) {
        console.error('validatePromotion error:', error);
        res.status(500).json({ message: error.message || 'Failed to validate promotion' });
    }
};

