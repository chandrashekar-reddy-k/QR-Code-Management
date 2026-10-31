import prisma from './prisma.js';

/**
 * Ensures products referenced in procurement (PO, GRN, Purchase Invoice, Vendor Mappings)
 * are marked as active, approved, and defaulted to RAW_MATERIAL if productType is null,
 * so they automatically reflect in Packing Module Master Data.
 * @param {string[]} productIds - Array of product IDs
 * @param {object} [tx] - Optional Prisma transaction client
 */
export async function syncPurchasedProductsToMasterData(productIds, tx = prisma) {
  if (!productIds || !Array.isArray(productIds) || productIds.length === 0) return;
  
  const cleanIds = Array.from(new Set(productIds.filter(Boolean)));
  if (cleanIds.length === 0) return;

  try {
    const products = await tx.product.findMany({
      where: { id: { in: cleanIds } },
      select: { id: true, isActive: true, status: true, productType: true }
    });

    for (const p of products) {
      if (!p.isActive || p.status !== 'APPROVED' || !p.productType) {
        await tx.product.update({
          where: { id: p.id },
          data: {
            isActive: true,
            status: 'APPROVED',
            productType: p.productType || 'RAW_MATERIAL'
          }
        });
      }
    }
  } catch (err) {
    console.error('Error in syncPurchasedProductsToMasterData:', err);
  }
}
