import { prisma } from '../config/prismaClient.js';

export class PriceResolverService {
  /**
   * Resolves the active price for a product on a specific channel and date.
   * @param {Object} params
   * @param {string} params.productId
   * @param {string} params.channel - "POS", "ONLINE", "QUICK", "VEHICLE"
   * @param {Date} [params.date] - Optional date to check (defaults to now)
   */
  static async resolvePrice({ productId, productVariantId = null, channel, date = new Date(), partnerId = null }) {
    if (!productId || !channel) {
      throw new Error('productId and channel are required for price resolution.');
    }

    // 1. Fetch matching Price Book by code and partner isolation scope
    let priceBook;
    let resolvedCode = channel.toUpperCase();

    if (!resolvedCode.includes('_') && partnerId) {
      const user = await prisma.user.findUnique({
        where: { id: partnerId },
        select: { warehouseId: true }
      });
      if (user?.warehouseId) {
        resolvedCode = `${resolvedCode}_${user.warehouseId}`;
      }
    }

    try {
      priceBook = await prisma.priceBook.findFirst({
        where: {
          code: resolvedCode,
          isActive: true
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!priceBook && resolvedCode.includes('_')) {
        const baseCode = resolvedCode.split('_')[0];
        priceBook = await prisma.priceBook.findFirst({
          where: {
            code: baseCode,
            isActive: true
          },
          orderBy: { createdAt: 'desc' }
        });
      }
    } catch (err) {
      console.error('Error finding price book:', err);
    }

    if (!priceBook) {
      return this.getDefaultProductPrice(productId, productVariantId, channel);
    }

    // 2. Fetch active variant-level ProductPrice matching date range if variantId is provided
    let resolvedPrice = null;
    if (productVariantId) {
      resolvedPrice = await prisma.productPrice.findFirst({
        where: {
          productId,
          productVariantId,
          priceBookId: priceBook.id,
          effectiveFrom: { lte: date },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: date } }
          ]
        },
        orderBy: {
          effectiveFrom: 'desc'
        }
      });
    }

    // 3. Fallback to product-level ProductPrice
    let isVariantSpecific = !!resolvedPrice;
    if (!resolvedPrice) {
      resolvedPrice = await prisma.productPrice.findFirst({
        where: {
          productId,
          productVariantId: null,
          priceBookId: priceBook.id,
          effectiveFrom: { lte: date },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: date } }
          ]
        },
        orderBy: {
          effectiveFrom: 'desc'
        }
      });
    }

    if (!resolvedPrice) {
      return this.getDefaultProductPrice(productId, productVariantId, channel);
    }

    // If it's a product-level price and we requested a variant, we scale it proportionally
    if (!isVariantSpecific && productVariantId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { price: true }
      });
      const variant = await prisma.productVariant.findUnique({
        where: { id: productVariantId },
        select: { sellingPrice: true, mrp: true }
      });

      if (product && variant) {
        const basePrice = product.price || 1;
        const ratio = resolvedPrice.sellingPrice / basePrice;
        const variantSelling = variant.sellingPrice != null ? variant.sellingPrice : (variant.mrp || 0);
        return {
          mrp: variant.mrp != null ? Math.round(variant.mrp * ratio * 100) / 100 : resolvedPrice.mrp,
          sellingPrice: Math.round(variantSelling * ratio * 100) / 100,
          priceBookId: resolvedPrice.priceBookId,
          priceBookName: priceBook.name,
          source: 'price_book_scaled'
        };
      }
    }

    return {
      mrp: resolvedPrice.mrp,
      sellingPrice: resolvedPrice.sellingPrice,
      priceBookId: resolvedPrice.priceBookId,
      priceBookName: priceBook.name,
      source: isVariantSpecific ? 'price_book_variant' : 'price_book'
    };
  }

  /**
   * Fallback method to get standard prices defined on the product/variant itself or ChannelInventory.
   */
  static async getDefaultProductPrice(productId, productVariantId = null, channel = null) {
    // 1. Check ChannelInventory if a channel is specified (e.g. VEHICLE, POS_STORE, ONLINE_APP)
    if (channel) {
      try {
        const normalizedChannel = channel.toUpperCase() === 'POS' ? 'POS_STORE' : channel.toUpperCase();
        let channelInv = null;
        if (productVariantId) {
          channelInv = await prisma.channelInventory.findFirst({
            where: {
              productId,
              productVariantId,
              channel: normalizedChannel,
              isActive: true
            },
            orderBy: { createdAt: 'desc' }
          });
        }
        if (!channelInv && !productVariantId) {
          channelInv = await prisma.channelInventory.findFirst({
            where: {
              productId,
              channel: normalizedChannel,
              isActive: true
            },
            orderBy: { createdAt: 'desc' }
          });
        }

        if (channelInv && channelInv.channelPrice != null && Number(channelInv.channelPrice) > 0) {
          const sellingPrice = Number(channelInv.channelPrice);
          let itemMrp = sellingPrice;
          if (productVariantId) {
            const variant = await prisma.productVariant.findUnique({
              where: { id: productVariantId },
              select: { mrp: true, sellingPrice: true }
            });
            itemMrp = variant?.mrp || variant?.sellingPrice || sellingPrice;
          } else {
            const product = await prisma.product.findUnique({
              where: { id: productId },
              select: { mrp: true, price: true }
            });
            itemMrp = product?.mrp || product?.price || sellingPrice;
          }
          return {
            mrp: itemMrp,
            sellingPrice,
            source: 'channel_inventory'
          };
        }
      } catch (err) {
        console.warn('[PriceResolverService] ChannelInventory lookup failed:', err?.message);
      }
    }

    if (productVariantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: productVariantId },
        select: { sellingPrice: true, mrp: true }
      });
      if (variant) {
        return {
          mrp: variant.mrp || variant.sellingPrice || 0,
          sellingPrice: variant.sellingPrice || variant.mrp || 0,
          source: 'variant_fallback'
        };
      }
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, finalPrice: true, mrp: true, price: true, costPrice: true }
    });

    if (!product) {
      return {
        mrp: 0,
        sellingPrice: 0,
        source: 'not_found'
      };
    }

    const effectiveSellingPrice = product.finalPrice || product.price || 0;

    return {
      mrp: product.mrp || effectiveSellingPrice || product.price || 0,
      sellingPrice: effectiveSellingPrice,
      source: 'product_fallback'
    };
  }
}
