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

    const partnerId = req.user?.id || null;
    let userWarehouseId = req.user?.warehouseId || req.user?.storeId || null;
    if (!userWarehouseId && partnerId) {
      const dbUser = await prisma.user.findUnique({ where: { id: partnerId }, select: { warehouseId: true } });
      userWarehouseId = dbUser?.warehouseId || null;
    }

    if (!userWarehouseId) {
      return res.status(400).json({ status: 400, message: 'User must be associated with a warehouse to configure price books.' });
    }

    const cleanCode = code.toUpperCase();
    const allowedChannels = ['ONLINE', 'VEHICLE', 'POS'];
    if (!allowedChannels.includes(cleanCode)) {
      return res.status(400).json({ status: 400, message: `Invalid channel code. Allowed channels: ${allowedChannels.join(', ')}` });
    }

    const resolvedCode = `${cleanCode}_${userWarehouseId}`;

    const priceBook = await prisma.priceBook.upsert({
      where: {
        code_partnerId: {
          code: resolvedCode,
          partnerId
        }
      },
      update: {
        name,
        isActive: isActive !== undefined ? isActive : true
      },
      create: {
        name,
        code: resolvedCode,
        partnerId,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    // Strip suffix for response
    const responsePB = {
      ...priceBook,
      code: cleanCode
    };

    return res.status(200).json({ status: 200, message: 'Price Book saved successfully.', data: responsePB });
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
    
    // Strip the warehouse suffix from the code so the frontend remains clean
    const cleanedPriceBooks = priceBooks.map(pb => {
      const cleanCode = pb.code.split('_')[0];
      return {
        ...pb,
        code: cleanCode
      };
    });

    return res.status(200).json({ status: 200, data: cleanedPriceBooks });
  } catch (error) {
    console.error('Error fetching price books:', error);
    return res.status(500).json({ status: 500, message: error.message });
  }
}

/**
 * Delete a Price Book.
 */
export async function deletePriceBook(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ status: 400, message: 'Price Book ID is required.' });
    }

    await prisma.priceBook.delete({
      where: { id }
    });

    return res.status(200).json({ status: 200, message: 'Price Book deleted successfully.' });
  } catch (error) {
    console.error('Error deleting price book:', error);
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

        let numMrp = Number(mrp);
        let numSellingPrice = Number(sellingPrice);

        // Fetch product costPrice for floor check
        const prod = await prisma.product.findUnique({
          where: { id: productId },
          select: { costPrice: true }
        });
        const costPrice = prod?.costPrice ?? null;

        // Ceiling constraint: sellingPrice cannot exceed MRP
        if (numSellingPrice > numMrp) {
          numSellingPrice = numMrp;
        }
        // Floor constraint: sellingPrice cannot be lower than costPrice
        if (costPrice !== null && costPrice !== undefined && numSellingPrice < costPrice) {
          numSellingPrice = costPrice;
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
              mrp: numMrp,
              sellingPrice: numSellingPrice,
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
              mrp: numMrp,
              sellingPrice: numSellingPrice,
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

      let productCostPrice = null;
      const prod = await prisma.product.findUnique({
        where: { id: productId },
        select: { costPrice: true, mrp: true }
      });
      if (prod) {
        productCostPrice = prod.costPrice ?? null;
      }

        const numMrp = Math.round(Number(mrp));
        let numSellingPrice = Math.round(Number(sellingPrice));

        // Ceiling price check: sellingPrice cannot exceed mrp (ceiling)
        if (numSellingPrice > numMrp) {
          return res.status(400).json({
            status: 400,
            message: `Selling price (${numSellingPrice}) cannot exceed ceiling price / MRP (${numMrp}).`
          });
        }

        // Floor price check: sellingPrice cannot be lower than costPrice (floor) if defined
        if (productCostPrice !== null && productCostPrice !== undefined && numSellingPrice < productCostPrice) {
          return res.status(400).json({
            status: 400,
            message: `Selling price (${numSellingPrice}) cannot be below floor price / Cost Price (${productCostPrice}).`
          });
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
              mrp: numMrp,
              sellingPrice: numSellingPrice,
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
              mrp: numMrp,
              sellingPrice: numSellingPrice,
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
    let targetWarehouseId = req.user?.warehouseId || null;
    if (!targetWarehouseId && req.user?.id) {
      const dbUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { warehouseId: true } });
      targetWarehouseId = dbUser?.warehouseId || null;
    }

    // Filter products and prices by targetWarehouseId
    const productFilter = targetWarehouseId ? { warehouseId: targetWarehouseId } : {};

    const [priceBooks, activePrices, products] = await Promise.all([
      prisma.priceBook.findMany({ where: { isActive: true } }),
      prisma.productPrice.findMany({
        where: {
          effectiveFrom: { lte: new Date() },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: new Date() } }
          ],
          product: productFilter
        },
        orderBy: { effectiveFrom: 'desc' }
      }),
      prisma.product.findMany({
        where: productFilter,
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
      const customPrices = {};
      for (const pb of priceBooks) {
        const priceResult = resolvePriceInMemory(prod.id, null, pb.code, prod.mrp, prod.price);
        customPrices[pb.id] = {
          id: priceResult.id,
          mrp: priceResult.mrp,
          sellingPrice: priceResult.sellingPrice,
          isCustom: priceResult.isCustom
        };
      }

      comparison.push({
        id: prod.id,
        productVariantId: null,
        name: prod.name,
        sku: prod.sku || '',
        baseMrp: prod.mrp || prod.price,
        basePrice: prod.price,
        customPrices
      });

      // 2. Resolve for each variant
      if (Array.isArray(prod.variants)) {
        for (const variant of prod.variants) {
          const vCustomPrices = {};
          for (const pb of priceBooks) {
            const priceResult = resolvePriceInMemory(prod.id, variant.id, pb.code, variant.mrp, variant.sellingPrice);
            vCustomPrices[pb.id] = {
              id: priceResult.id,
              mrp: priceResult.mrp,
              sellingPrice: priceResult.sellingPrice,
              isCustom: priceResult.isCustom
            };
          }

          comparison.push({
            id: prod.id,
            productVariantId: variant.id,
            name: `${prod.name} (${variant.variantName})`,
            sku: variant.sku || '',
            baseMrp: variant.mrp || variant.sellingPrice,
            basePrice: variant.sellingPrice || variant.mrp,
            customPrices: vCustomPrices
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
      const priceRecord = await prisma.productPrice.findUnique({
        where: { id }
      });
      if (priceRecord) {
        await prisma.productPrice.deleteMany({
          where: {
            productId: priceRecord.productId,
            productVariantId: priceRecord.productVariantId,
            priceBookId: priceRecord.priceBookId
          }
        });
      }
      return res.status(200).json({ status: 200, message: 'Pricing records deleted successfully.' });
    }

    if (!productId) {
      return res.status(400).json({ status: 400, message: 'Either id or productId is required.' });
    }

    const variantId = productVariantId || null;
    const deleteFilter = {
      productId,
      productVariantId: variantId
    };
    if (priceBookId) {
      deleteFilter.priceBookId = priceBookId;
    }

    await prisma.productPrice.deleteMany({
      where: deleteFilter
    });

    return res.status(200).json({ status: 200, message: 'Pricing records deleted successfully.' });
  } catch (error) {
    console.error('Error deleting product price:', error);
    return res.status(500).json({ status: 500, message: error.message });
  }
}
