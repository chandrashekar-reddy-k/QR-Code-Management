import { prisma } from '../config/prismaClient.js';
import logger from '../utils/logger.js';
import { InventoryCache } from '../utils/cacheHelper.js';

/**
 * Service to manage all transactions and inventory adjustments under the Unified Inventory Core.
 */
export const InventoryService = {
  /**
   * Adjusts stock at a given location for a product/variant.
   * Logs movements and ledger entries.
   */

  async adjustStock({ locationId, productId, productVariantId = null, changeQty, type, referenceType = null, referenceId = null, userId = null, tx = null, allowNegative = false }) {
    const execute = async (t) => {
      // Invalidate cache
      const cacheKey = `inventory:${locationId}:${productId}:${productVariantId || 'default'}`;
      await InventoryCache.invalidate(cacheKey);

      // 1. Get or create UnifiedInventory record
      let unified = await t.unifiedInventory.findFirst({
        where: {
          productId,
          productVariantId,
          locationId
        }
      });

      if (!unified) {
        unified = await t.unifiedInventory.create({
          data: {
            productId,
            productVariantId,
            locationId,
            onHand: 0,
            reserved: 0,
            available: 0
          }
        });
      }

      const beforeQuantity = unified.onHand;
      const newOnHand = beforeQuantity + changeQty;
      const newAvailable = newOnHand - unified.reserved;

      if (newOnHand < 0 && !allowNegative) {
        throw new Error(`Insufficient stock for adjustment. Location: ${locationId}, Product: ${productId}, Current On-Hand: ${beforeQuantity}, Requested Adjustment: ${changeQty}`);
      }

      // 2. Update UnifiedInventory balances
      const updatedUnified = await t.unifiedInventory.update({
        where: { id: unified.id },
        data: {
          onHand: newOnHand,
          available: newAvailable
        }
      });

      // 3. Create InventoryMovement record
      const movement = await t.inventoryMovement.create({
        data: {
          type,
          productId,
          productVariantId,
          fromLocationId: changeQty < 0 ? locationId : null,
          toLocationId: changeQty > 0 ? locationId : null,
          quantity: Math.abs(changeQty),
          userId,
          referenceType,
          referenceId
        }
      });

      // 4. Write Immutable StockLedger entry
      await t.stockLedger.create({
        data: {
          productId,
          productVariantId,
          locationId,
          beforeQuantity,
          afterQuantity: newOnHand,
          changeQuantity: changeQty,
          movementId: movement.id,
          referenceType,
          referenceId
        }
      });

      logger.info(`[InventoryService] Stock adjusted. Location: ${locationId}, Product: ${productId}, Change: ${changeQty}, New OnHand: ${newOnHand}`);
      return updatedUnified;
    };

    if (tx) {
      return execute(tx);
    } else {
      return prisma.$transaction(execute);
    }
  },

  /**
   * Checks if a location has enough available stock (onHand - reserved).
   */
  async checkAvailability({ locationId, productId, productVariantId = null, qty }) {
    const cacheKey = `inventory:${locationId}:${productId}:${productVariantId || 'default'}`;
    const cachedAvailable = await InventoryCache.get(cacheKey);
    if (cachedAvailable !== null) {
      return cachedAvailable >= qty;
    }

    const unified = await prisma.unifiedInventory.findFirst({
      where: {
        productId,
        productVariantId,
        locationId
      }
    });

    if (!unified) {
      await InventoryCache.set(cacheKey, 0);
      return false;
    }

    await InventoryCache.set(cacheKey, unified.available);
    return unified.available >= qty;
  },

  /**
   * Temporarily reserves stock for an order with strict concurrency & idempotency protection.
   */
  async reserveStock({ locationId, productId, productVariantId = null, qty, orderId, userId = null, tx = null }) {
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new Error(`Reservation quantity must be a positive integer. Got: ${qty}`);
    }

    const execute = async (t) => {
      // 1. Idempotency check: Return existing pending reservation if retry occurs
      const existing = await t.inventoryReservation.findFirst({
        where: {
          orderId,
          productId,
          productVariantId: productVariantId ?? null,
          locationId,
          status: 'PENDING'
        }
      });

      if (existing) {
        logger.info(`[InventoryService] Idempotent reserve hit for order ${orderId}, product ${productId}`);
        return existing;
      }

      // 2. Atomic conditional update to prevent overselling race conditions
      const updateResult = await t.unifiedInventory.updateMany({
        where: {
          productId,
          productVariantId: productVariantId ?? null,
          locationId,
          available: { gte: qty }
        },
        data: {
          reserved: { increment: qty },
          available: { decrement: qty }
        }
      });

      if (updateResult.count === 0) {
        throw new Error(`Insufficient available stock to reserve. Location: ${locationId}, Product: ${productId}, Requested: ${qty}`);
      }

      // 3. Create InventoryReservation record
      const reservation = await t.inventoryReservation.create({
        data: {
          productId,
          productVariantId,
          locationId,
          quantity: qty,
          status: 'PENDING',
          userId,
          orderId
        }
      });

      logger.info(`[InventoryService] Stock reserved atomically. Location: ${locationId}, Product: ${productId}, Qty: ${qty}, Order: ${orderId}`);
      return reservation;
    };

    return tx ? execute(tx) : prisma.$transaction(execute, { timeout: 15000 });
  },

  /**
   * Consumes a reservation upon Order Fulfillment (Delivery/Dispatch).
   * Atomically claims reservation, decreases onHand & reserved stock with DB guards, and logs stock ledger entries.
   */
  async consumeReservation({ reservationId, orderId, tx = null }) {
    const execute = async (t) => {
      const whereClause = reservationId ? { id: reservationId } : { orderId, status: 'PENDING' };
      const reservations = await t.inventoryReservation.findMany({ where: whereClause });

      for (const res of reservations) {
        // 1. Atomic state claim to eliminate concurrent execution race conditions
        const claimResult = await t.inventoryReservation.updateMany({
          where: { id: res.id, status: 'PENDING' },
          data: { status: 'COMPLETED' }
        });

        if (claimResult.count === 0) {
          logger.warn(`[InventoryService] Reservation ${res.id} is not PENDING. Skipping consumption.`);
          continue;
        }

        const unified = await t.unifiedInventory.findFirst({
          where: {
            productId: res.productId,
            productVariantId: res.productVariantId ?? null,
            locationId: res.locationId
          }
        });

        if (!unified) {
          throw new Error(`UnifiedInventory record missing for reservation ${res.id}`);
        }

        // 2. Guarded DB decrement preventing balance underflows
        const invUpdate = await t.unifiedInventory.updateMany({
          where: {
            id: unified.id,
            reserved: { gte: res.quantity },
            onHand: { gte: res.quantity }
          },
          data: {
            onHand: { decrement: res.quantity },
            reserved: { decrement: res.quantity }
          }
        });

        if (invUpdate.count === 0) {
          throw new Error(`Inventory balance underflow error consuming reservation ${res.id}. OnHand: ${unified.onHand}, Reserved: ${unified.reserved}, Qty: ${res.quantity}`);
        }

        // 3. Audit Trail: InventoryMovement
        const movement = await t.inventoryMovement.create({
          data: {
            type: 'OUTWARD',
            productId: res.productId,
            productVariantId: res.productVariantId,
            fromLocationId: res.locationId,
            quantity: res.quantity,
            referenceType: 'ORDER_FULFILLMENT',
            referenceId: res.orderId || orderId
          }
        });

        // 4. Audit Trail: StockLedger
        await t.stockLedger.create({
          data: {
            productId: res.productId,
            productVariantId: res.productVariantId,
            locationId: res.locationId,
            beforeQuantity: unified.onHand,
            afterQuantity: unified.onHand - res.quantity,
            changeQuantity: -res.quantity,
            movementId: movement.id,
            referenceType: 'ORDER_FULFILLMENT',
            referenceId: res.orderId || orderId
          }
        });

        logger.info(`[InventoryService] Consumed reservation ${res.id} for order ${res.orderId}.`);
      }
    };

    return tx ? execute(tx) : prisma.$transaction(execute, { timeout: 15000 });
  },

  /**
   * Cancels a reservation and returns reserved stock back to available pool safely with full audit trail.
   */
  async cancelReservation({ reservationId, orderId, tx = null }) {
    const execute = async (t) => {
      const whereClause = reservationId ? { id: reservationId } : { orderId, status: 'PENDING' };
      const reservations = await t.inventoryReservation.findMany({ where: whereClause });

      for (const res of reservations) {
        // 1. Atomic state claim to eliminate concurrent execution race conditions
        const claimResult = await t.inventoryReservation.updateMany({
          where: { id: res.id, status: 'PENDING' },
          data: { status: 'CANCELLED' }
        });

        if (claimResult.count === 0) {
          logger.warn(`[InventoryService] Reservation ${res.id} is not PENDING. Skipping cancellation.`);
          continue;
        }

        const unified = await t.unifiedInventory.findFirst({
          where: {
            productId: res.productId,
            productVariantId: res.productVariantId ?? null,
            locationId: res.locationId
          }
        });

        if (!unified) continue;

        // 2. Guarded DB update
        const invUpdate = await t.unifiedInventory.updateMany({
          where: {
            id: unified.id,
            reserved: { gte: res.quantity }
          },
          data: {
            reserved: { decrement: res.quantity },
            available: { increment: res.quantity }
          }
        });

        if (invUpdate.count === 0) {
          throw new Error(`Inventory balance underflow error cancelling reservation ${res.id}`);
        }

        // 3. Audit Trail: InventoryMovement
        const movement = await t.inventoryMovement.create({
          data: {
            type: 'INWARD',
            productId: res.productId,
            productVariantId: res.productVariantId,
            toLocationId: res.locationId,
            quantity: res.quantity,
            referenceType: 'ORDER_CANCELLATION',
            referenceId: res.orderId || orderId
          }
        });

        // 4. Audit Trail: StockLedger
        await t.stockLedger.create({
          data: {
            productId: res.productId,
            productVariantId: res.productVariantId,
            locationId: res.locationId,
            beforeQuantity: unified.onHand,
            afterQuantity: unified.onHand,
            changeQuantity: res.quantity,
            movementId: movement.id,
            referenceType: 'ORDER_CANCELLATION',
            referenceId: res.orderId || orderId
          }
        });

        logger.info(`[InventoryService] Cancelled reservation ${res.id} for order ${res.orderId}. Restored available stock +${res.quantity}`);
      }
    };

    return tx ? execute(tx) : prisma.$transaction(execute, { timeout: 15000 });
  },

  /**
   * Admin Force Release of a pending reservation with audit tracking and balance guards.
   */
  async forceReleaseReservation({ reservationId, releaseReason = 'Admin Force Release', releasedBy = null }) {
    return prisma.$transaction(async (t) => {
      // 1. Atomic state claim to eliminate concurrent execution race conditions
      const claimResult = await t.inventoryReservation.updateMany({
        where: { id: reservationId, status: 'PENDING' },
        data: { status: 'CANCELLED' }
      });

      if (claimResult.count === 0) {
        throw new Error(`Cannot release reservation ${reservationId}. Reservation not found or not in PENDING status.`);
      }

      const res = await t.inventoryReservation.findUnique({
        where: { id: reservationId }
      });

      const unified = await t.unifiedInventory.findFirst({
        where: {
          productId: res.productId,
          productVariantId: res.productVariantId ?? null,
          locationId: res.locationId
        }
      });

      if (unified) {
        // 2. Guarded DB update
        const invUpdate = await t.unifiedInventory.updateMany({
          where: {
            id: unified.id,
            reserved: { gte: res.quantity }
          },
          data: {
            reserved: { decrement: res.quantity },
            available: { increment: res.quantity }
          }
        });

        if (invUpdate.count === 0) {
          throw new Error(`Inventory balance underflow releasing reservation ${res.id}`);
        }

        // 3. Audit Trail: Movement & Stock Ledger
        const movement = await t.inventoryMovement.create({
          data: {
            type: 'INWARD',
            productId: res.productId,
            productVariantId: res.productVariantId,
            toLocationId: res.locationId,
            quantity: res.quantity,
            userId: releasedBy,
            referenceType: 'ADMIN_FORCE_RELEASE',
            referenceId: res.orderId || res.id
          }
        });

        await t.stockLedger.create({
          data: {
            productId: res.productId,
            productVariantId: res.productVariantId,
            locationId: res.locationId,
            beforeQuantity: unified.onHand,
            afterQuantity: unified.onHand,
            changeQuantity: res.quantity,
            movementId: movement.id,
            referenceType: 'ADMIN_FORCE_RELEASE',
            referenceId: res.orderId || res.id
          }
        });
      }

      logger.info(`[InventoryService] Force released reservation ${reservationId}. Reason: ${releaseReason}, By: ${releasedBy || 'System'}`);
      return res;
    });
  },

  /**
   * Safely transfers stock between locations using double-entry transactions.
   */
  async transferStock({ fromLocationId, toLocationId, items, userId = null, referenceType = 'STOCK_TRANSFER', referenceId = null }) {
    return prisma.$transaction(async (t) => {
      for (const item of items) {
        const { productId, productVariantId = null, quantity } = item;

        // Deduct from source location
        await this.adjustStock({
          locationId: fromLocationId,
          productId,
          productVariantId,
          changeQty: -quantity,
          type: 'TRANSFER',
          referenceType,
          referenceId,
          userId,
          tx: t
        });

        // Add to destination location
        await this.adjustStock({
          locationId: toLocationId,
          productId,
          productVariantId,
          changeQty: quantity,
          type: 'TRANSFER',
          referenceType,
          referenceId,
          userId,
          tx: t
        });
      }

      logger.info(`[InventoryService] Transferred ${items.length} items from ${fromLocationId} to ${toLocationId}`);
    });
  }
};
