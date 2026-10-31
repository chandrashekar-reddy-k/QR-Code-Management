import { prisma } from '../../config/prismaClient.js';
import { PriceResolverService } from '../../services/priceResolverService.js';

/**
 * Create or update a Price Book.
 */
export async function createPriceBook(req, res) {
  try {
    const { name, code, isActive } = req.body;
    if (!name || !code) {
      return res.status(400).json({ status: 400, message: 'Name and unique code are required.' });
    }

    const priceBook = await prisma.priceBook.upsert({
      where: { code: code.toUpperCase() },
      update: {
        name,
        isActive: isActive !== undefined ? isActive : true
      },
      create: {
        name,
        code: code.toUpperCase(),
        isActive: isActive !== undefined ? isActive : true
      }
    });

    return res.status(200).json({ status: 200, message: 'Price Book saved successfully.', data: priceBook });
  } catch (error) {
    console.error('Error creating price book:', error);
    return res.status(500).json({ status: 500, message: error.message });
  }
}

/**
 * Get all Price Books.
 */
export async function getPriceBooks(req, res) {
  try {
    const priceBooks = await prisma.priceBook.findMany({
      orderBy: { code: 'asc' }
    });
    return res.status(200).json({ status: 200, data: priceBooks });
  } catch (error) {
    console.error('Error fetching price books:', error);
    return res.status(500).json({ status: 500, message: error.message });
  }
}

/**
 * Assign individual or bulk prices.
 * When a new price is created, any existing open-ended (effectiveTo: null) price for the same
 * product + variant + pricebook is automatically expired (effectiveTo set to effFrom - 1ms).
 * This ensures only one price is active at any given time and edits always reflect immediately.
 */
export async function createProductPrice(req, res) {
  try {
    const { prices } = req.body;

    if (Array.isArray(prices)) {
      // Bulk creation
      const createdPrices = [];
      for (const p of prices) {
        const { productId, productVariantId, priceBookId, mrp, sellingPrice, effectiveFrom, effectiveTo } = p;
        if (!productId || !priceBookId || mrp === undefined || sellingPrice === undefined) {
          continue;
        }

        const effFrom = effectiveFrom ? new Date(effectiveFrom) : new Date();
        const effTo = effectiveTo ? new Date(effectiveTo) : null;
        const variantId = productVariantId || null;

        // Look for an existing open-ended record (upsert strategy: update if open, else create new)
        const openEnded = await prisma.productPrice.findFirst({
          where: {
            productId,
            productVariantId: variantId,
            priceBookId,
            effectiveTo: null
          },
          orderBy: { createdAt: 'desc' }
        });

        let productPrice;
        if (openEnded) {
          // Update the existing open record in place — no new rows created
          productPrice = await prisma.productPrice.update({
            where: { id: openEnded.id },
            data: {
              mrp: Number(mrp),
              sellingPrice: Number(sellingPrice),
              effectiveFrom: effFrom,
              effectiveTo: effTo
            }
          });
        } else {
          productPrice = await prisma.productPrice.create({
            data: {
              productId,
              productVariantId: variantId,
              priceBookId,
              mrp: Number(mrp),
              sellingPrice: Number(sellingPrice),
              effectiveFrom: effFrom,
              effectiveTo: effTo
            }
          });
        }
        createdPrices.push(productPrice);
      }
      return res.status(200).json({ status: 200, message: `${createdPrices.length} product prices processed.`, data: createdPrices });
    } else {
      // Individual creation
      const { productId, productVariantId, priceBookId, mrp, sellingPrice, effectiveFrom, effectiveTo } = req.body;
      if (!productId || !priceBookId || mrp === undefined || sellingPrice === undefined) {
        return res.status(400).json({ status: 400, message: 'productId, priceBookId, mrp, and sellingPrice are required.' });
      }

      const effFrom = effectiveFrom ? new Date(effectiveFrom) : new Date();
      const effTo = effectiveTo ? new Date(effectiveTo) : null;
      const variantId = productVariantId || null;

      // Look for an existing open-ended record (upsert strategy: update if open, else create new)
      const openEnded = await prisma.productPrice.findFirst({
        where: {
          productId,
          productVariantId: variantId,
          priceBookId,
          effectiveTo: null
        },
        orderBy: { createdAt: 'desc' }
      });

      let productPrice;
      if (openEnded) {
        // Update the existing open record in place — no new rows created on edits
        productPrice = await prisma.productPrice.update({
          where: { id: openEnded.id },
          data: {
            mrp: Number(mrp),
            sellingPrice: Number(sellingPrice),
            effectiveFrom: effFrom,
            effectiveTo: effTo
          }
        });
      } else {
        productPrice = await prisma.productPrice.create({
          data: {
            productId,
            productVariantId: variantId,
            priceBookId,
            mrp: Number(mrp),
            sellingPrice: Number(sellingPrice),
            effectiveFrom: effFrom,
            effectiveTo: effTo
          }
        });
      }

      return res.status(200).json({ status: 200, message: 'Product price assigned successfully.', data: productPrice });
    }
  } catch (error) {
    console.error('Error creating product price:', error);
    return res.status(500).json({ status: 500, message: error.message });
  }
}

/**
 * Get resolved price for a product.
 */
export async function getPrices(req, res) {
  try {
    const { productId, channel, date } = req.query;
    if (!productId || !channel) {
      return res.status(400).json({ status: 400, message: 'productId and channel query params are required.' });
    }

    const resolved = await PriceResolverService.resolvePrice({
      productId,
      channel,
      date: date ? new Date(date) : new Date()
    });

    return res.status(200).json({ status: 200, data: resolved });
  } catch (error) {
    console.error('Error resolving price:', error);
    return res.status(500).json({ status: 500, message: error.message });
  }
}

/**
 * Get side-by-side comparison for all products.
 */
export async function getPriceComparison(req, res) {
  try {
    const [priceBooks, activePrices, products] = await Promise.all([
      prisma.priceBook.findMany({ where: { isActive: true } }),
      prisma.productPrice.findMany({
        where: {
          effectiveFrom: { lte: new Date() },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: new Date() } }
          ]
        },
        orderBy: { effectiveFrom: 'desc' }
      }),
      prisma.product.findMany({
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          mrp: true,
          variants: {
            where: {
              status: 'ACTIVE',
              isEnabled: true
            },
            select: {
              id: true,
              variantName: true,
              sku: true,
              mrp: true,
              sellingPrice: true
            }
          }
        }
      })
    ]);

    // Map price book codes to IDs, prioritizing partner-specific price books (sorting partnerId desc, nulls last)
    const pbMap = {};
    const sortedPriceBooks = [...priceBooks].sort((a, b) => {
      if (a.partnerId && !b.partnerId) return 1;
      if (!a.partnerId && b.partnerId) return -1;
      return 0;
    });

    for (const pb of sortedPriceBooks) {
      // If code is POS, Pargi's custom price book will overwrite the global POS entry
      pbMap[pb.code] = pb.id;
    }

    // Build fast price lookup map
    const priceMap = new Map();
    for (const price of activePrices) {
      const key = `${price.productId}_${price.productVariantId || 'null'}_${price.priceBookId}`;
      if (!priceMap.has(key)) {
        priceMap.set(key, price);
      }
    }

    // Fast in-memory resolver
    const resolvePriceInMemory = (productId, productVariantId, priceBookCode, catalogMrp, catalogPrice) => {
      const priceBookId = pbMap[priceBookCode];
      if (priceBookId) {
        // 1. Try variant specific price book entry
        if (productVariantId) {
          const key = `${productId}_${productVariantId}_${priceBookId}`;
          if (priceMap.has(key)) {
            const entry = priceMap.get(key);
            return { id: entry.id, mrp: entry.mrp, sellingPrice: entry.sellingPrice, isCustom: true };
          }
        }
        // 2. Try product level price book entry
        const prodKey = `${productId}_null_${priceBookId}`;
        if (priceMap.has(prodKey)) {
          const entry = priceMap.get(prodKey);
          return { id: entry.id, mrp: entry.mrp, sellingPrice: entry.sellingPrice, isCustom: true };
        }
      }
      // 3. Fallback to catalog base price
      return { id: null, mrp: catalogMrp || catalogPrice, sellingPrice: catalogPrice, isCustom: false };
    };

    const comparison = [];
    for (const prod of products) {
      // 1. Resolve for the base product
      const posPrice = resolvePriceInMemory(prod.id, null, 'POS', prod.mrp, prod.price);
      const onlinePrice = resolvePriceInMemory(prod.id, null, 'ONLINE', prod.mrp, prod.price);
      const quickPrice = resolvePriceInMemory(prod.id, null, 'QUICK', prod.mrp, prod.price);
      const vehiclePrice = resolvePriceInMemory(prod.id, null, 'VEHICLE', prod.mrp, prod.price);

      comparison.push({
        id: prod.id,
        productVariantId: null,
        name: prod.name,
        sku: prod.sku || '',
        baseMrp: prod.mrp || prod.price,
        basePrice: prod.price,
        posMrp: posPrice.mrp,
        posPrice: posPrice.sellingPrice,
        posCustomId: posPrice.id,
        posIsCustom: posPrice.isCustom,
        onlineMrp: onlinePrice.mrp,
        onlinePrice: onlinePrice.sellingPrice,
        onlineCustomId: onlinePrice.id,
        onlineIsCustom: onlinePrice.isCustom,
        quickMrp: quickPrice.mrp,
        quickPrice: quickPrice.sellingPrice,
        quickCustomId: quickPrice.id,
        quickIsCustom: quickPrice.isCustom,
        vehicleMrp: vehiclePrice.mrp,
        vehiclePrice: vehiclePrice.sellingPrice,
        vehicleCustomId: vehiclePrice.id,
        vehicleIsCustom: vehiclePrice.isCustom
      });

      // 2. Resolve for each variant
      if (Array.isArray(prod.variants)) {
        for (const variant of prod.variants) {
          const vPosPrice = resolvePriceInMemory(prod.id, variant.id, 'POS', variant.mrp, variant.sellingPrice);
          const vOnlinePrice = resolvePriceInMemory(prod.id, variant.id, 'ONLINE', variant.mrp, variant.sellingPrice);
          const vQuickPrice = resolvePriceInMemory(prod.id, variant.id, 'QUICK', variant.mrp, variant.sellingPrice);
          const vVehiclePrice = resolvePriceInMemory(prod.id, variant.id, 'VEHICLE', variant.mrp, variant.sellingPrice);

          comparison.push({
            id: prod.id,
            productVariantId: variant.id,
            name: `${prod.name} (${variant.variantName})`,
            sku: variant.sku || '',
            baseMrp: variant.mrp || variant.sellingPrice,
            basePrice: variant.sellingPrice || variant.mrp,
            posMrp: vPosPrice.mrp,
            posPrice: vPosPrice.sellingPrice,
            posCustomId: vPosPrice.id,
            posIsCustom: vPosPrice.isCustom,
            onlineMrp: vOnlinePrice.mrp,
            onlinePrice: vOnlinePrice.sellingPrice,
            onlineCustomId: vOnlinePrice.id,
            onlineIsCustom: vOnlinePrice.isCustom,
            quickMrp: vQuickPrice.mrp,
            quickPrice: vQuickPrice.sellingPrice,
            quickCustomId: vQuickPrice.id,
            quickIsCustom: vQuickPrice.isCustom,
            vehicleMrp: vVehiclePrice.mrp,
            vehiclePrice: vVehiclePrice.sellingPrice,
            vehicleCustomId: vVehiclePrice.id,
            vehicleIsCustom: vVehiclePrice.isCustom
          });
        }
      }
    }

    return res.status(200).json({ status: 200, data: comparison });
  } catch (error) {
    console.error('Error in price comparison:', error);
    return res.status(500).json({ status: 500, message: error.message });
  }
}

/**
 * Get Price History for a product.
 */
export async function getProductPriceHistory(req, res) {
  try {
    const { productId } = req.query;
    if (!productId) {
      return res.status(400).json({ status: 400, message: 'productId query param is required.' });
    }

    const history = await prisma.productPrice.findMany({
      where: { productId },
      include: {
        priceBook: true
      },
      orderBy: { effectiveFrom: 'desc' }
    });

    return res.status(200).json({ status: 200, data: history });
  } catch (error) {
    console.error('Error fetching product price history:', error);
    return res.status(500).json({ status: 500, message: error.message });
  }
}

/**
 * Delete a product price by ID.
 */
export async function deleteProductPrice(req, res) {
  try {
    const { id } = req.params;
    const { productId, productVariantId, priceBookId } = req.query;

    if (id) {
      await prisma.productPrice.delete({
        where: { id }
      });
      return res.status(200).json({ status: 200, message: 'Pricing record deleted successfully.' });
    }

    if (!productId || !priceBookId) {
      return res.status(400).json({ status: 400, message: 'Either id or (productId and priceBookId) is required.' });
    }

    const variantId = productVariantId || null;
    await prisma.productPrice.deleteMany({
      where: {
        productId,
        productVariantId: variantId,
        priceBookId
      }
    });

    return res.status(200).json({ status: 200, message: 'Pricing record deleted successfully.' });
  } catch (error) {
    console.error('Error deleting product price:', error);
    return res.status(500).json({ status: 500, message: error.message });
  }
}
