/**
 * Stock management utilities – aligned with existing product/inventory implementation.
 * Use for atomic updates to avoid race conditions (e.g. order creation).
 */
import { prisma } from '../config/prismaClient.js';
import logger from './logger.js';

/**
 * Atomically decrement product stock only if current stock >= quantity.
 * Returns { success: true, newStock } or { success: false, reason }.
 * @param {string} productId - Product UUID
 * @param {number} quantity - Positive integer to deduct
 * @returns {Promise<{ success: boolean, newStock?: number, reason?: string }>}
 */
export async function reserveStock(productId, quantity) {
  const qty = parseInt(quantity, 10);
  if (!productId || isNaN(qty) || qty <= 0) {
    return { success: false, reason: 'Invalid productId or quantity' };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { id: true, stock: true }
      });
      if (!product) return { success: false, reason: 'Product not found' };
      if (product.stock < qty) {
        return { success: false, reason: `Insufficient stock. Available: ${product.stock}, requested: ${qty}` };
      }
      const updated = await tx.product.update({
        where: { id: productId },
        data: { stock: { decrement: qty } },
        select: { stock: true }
      });
      return { success: true, newStock: updated.stock };
    });
    return result;
  } catch (error) {
    logger.error('[stockUtils] reserveStock failed', { productId, quantity, error: error.message });
    return { success: false, reason: error.message };
  }
}

/**
 * Restore (increment) product stock – e.g. on order cancellation.
 * @param {string} productId - Product UUID
 * @param {number} quantity - Positive integer to add
 */
export async function restoreStock(productId, quantity) {
  const qty = parseInt(quantity, 10);
  if (!productId || isNaN(qty) || qty <= 0) return { success: false, reason: 'Invalid productId or quantity' };

  try {
    const updated = await prisma.product.update({
      where: { id: productId },
      data: { stock: { increment: qty } },
      select: { stock: true }
    });
    return { success: true, newStock: updated.stock };
  } catch (error) {
    logger.error('[stockUtils] restoreStock failed', { productId, quantity, error: error.message });
    return { success: false, reason: error.message };
  }
}

/**
 * Validate stock and threshold consistency: stock >= 0, threshold >= 0, minStock <= maxStock when provided.
 * @param {object} data - { stock, threshold, minStock, maxStock }
 * @returns {{ valid: boolean, message?: string }}
 */
export function validateStockFields(data) {
  if (data.stock != null) {
    const s = parseInt(data.stock, 10);
    if (isNaN(s) || s < 0) return { valid: false, message: 'stock must be a non-negative integer' };
  }
  if (data.threshold != null) {
    const t = parseInt(data.threshold, 10);
    if (isNaN(t) || t < 0) return { valid: false, message: 'threshold must be a non-negative integer' };
  }
  if (data.minStock != null && data.maxStock != null) {
    const min = parseInt(data.minStock, 10);
    const max = parseInt(data.maxStock, 10);
    if (!isNaN(min) && !isNaN(max) && min > max) {
      return { valid: false, message: 'minStock must be less than or equal to maxStock' };
    }
  }
  return { valid: true };
}
