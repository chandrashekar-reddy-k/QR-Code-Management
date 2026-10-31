import prisma from '../utils/prisma.js';

/**
 * Resolves prices of a list of products (and their variants) for a specific price book channel.
 * Uses optimized bulk queries to prevent N+1 query problems.
 * 
 * @param {Array} products - List of product objects from Prisma query.
 * @param {string} channel - The PriceBook code (default: 'VEHICLE').
 * @returns {Promise<Array>} - The products array with updated price and mrp fields.
 */
export const resolvePricesForProducts = async (products, channel = 'VEHICLE') => {
    if (!products || products.length === 0) return [];

    try {
        // 1. Fetch matching Price Book by code
        const priceBook = await prisma.priceBook.findFirst({
            where: {
                code: channel.toUpperCase(),
                isActive: true
            }
        });

        if (!priceBook) {
            // Fallback: Ensure mrp defaults to price if missing
            return products.map(p => ({
                ...p,
                mrp: p.mrp || p.price || 0,
                price: p.price || 0
            }));
        }

        const productIds = products.map(p => p.id);
        const now = new Date();

        // 2. Fetch active ProductPrice entries for these products and priceBook
        const prices = await prisma.productPrice.findMany({
            where: {
                productId: { in: productIds },
                priceBookId: priceBook.id,
                effectiveFrom: { lte: now },
                OR: [
                    { effectiveTo: null },
                    { effectiveTo: { gte: now } }
                ]
            },
            orderBy: { effectiveFrom: 'desc' }
        });

        // Create lookup maps for product level and variant level prices
        const priceMap = {};
        const variantPriceMap = {};
        for (const price of prices) {
            if (price.productVariantId) {
                const key = `${price.productId}_${price.productVariantId}`;
                if (!variantPriceMap[key]) {
                    variantPriceMap[key] = price;
                }
            } else {
                if (!priceMap[price.productId]) {
                    priceMap[price.productId] = price;
                }
            }
        }

        // 3. Map products to their resolved prices
        return products.map(p => {
            const resolved = priceMap[p.id];
            const updatedProduct = { ...p };

            if (resolved) {
                updatedProduct.mrp = resolved.mrp;
                updatedProduct.price = resolved.sellingPrice;
                updatedProduct.discount = Math.max(0, resolved.mrp - resolved.sellingPrice);
            } else {
                updatedProduct.mrp = p.mrp || p.price || 0;
                updatedProduct.price = p.price || 0;
            }

            // Resolve variants if they are included
            if (p.variants && Array.isArray(p.variants)) {
                updatedProduct.variants = p.variants.map(v => {
                    const resolvedVariant = variantPriceMap[`${p.id}_${v.id}`];
                    if (resolvedVariant) {
                        return {
                            ...v,
                            mrp: resolvedVariant.mrp,
                            sellingPrice: resolvedVariant.sellingPrice
                        };
                    }

                    // Scaled fallback logic if variant doesn't have an override but base product does
                    if (resolved && p.price) {
                        const ratio = resolved.sellingPrice / p.price;
                        const variantSelling = v.sellingPrice != null ? v.sellingPrice : (v.mrp || 0);
                        return {
                            ...v,
                            mrp: v.mrp != null ? Math.round(v.mrp * ratio * 100) / 100 : resolved.mrp,
                            sellingPrice: Math.round(variantSelling * ratio * 100) / 100
                        };
                    }

                    return {
                        ...v,
                        mrp: v.mrp || v.sellingPrice || 0,
                        sellingPrice: v.sellingPrice || v.mrp || 0
                    };
                });
            }

            return updatedProduct;
        });
    } catch (error) {
        console.error(`[resolvePricesForProducts] Error resolving pricing for channel ${channel}:`, error);
        // Fallback to default product prices
        return products.map(p => ({
            ...p,
            mrp: p.mrp || p.price || 0,
            price: p.price || 0
        }));
    }
};

/**
 * Resolves pricing for a single product.
 */
export const resolvePriceForSingleProduct = async (product, channel = 'VEHICLE') => {
    if (!product) return null;
    const resolved = await resolvePricesForProducts([product], channel);
    return resolved[0] || null;
};
