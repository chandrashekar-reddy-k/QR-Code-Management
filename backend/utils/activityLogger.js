import prisma from './prisma.js';

/**
 * Log an activity to the database
 * @param {Object} params
 * @param {string} params.userId - The ID of the user performing the action
 * @param {string} params.tenantId - The tenant ID
 * @param {string} params.action - The type of action (e.g., "SALE_CREATED")
 * @param {string} params.details - Human-readable description
 * @param {Object} [params.metadata] - Optional JSON data
 * @param {string} [params.storeId] - Optional store ID
 */
export const logActivity = async ({ userId, tenantId, action, details, metadata = {}, storeId = null, targetUserId = null }) => {
  try {
    let validStoreId = null;
    if (storeId) {
      // In Prisma schema, ActivityLog.storeId references Warehouse.id
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: storeId },
        select: { id: true }
      });
      if (warehouse) {
        validStoreId = warehouse.id;
      } else {
        // Check if storeId is a Store whose warehouseId exists
        const store = await prisma.store.findUnique({
          where: { id: storeId },
          select: { warehouseId: true }
        });
        if (store?.warehouseId) {
          validStoreId = store.warehouseId;
        }
      }
    }

    await prisma.activityLog.create({
      data: {
        userId,
        tenantId,
        action,
        details,
        metadata,
        storeId: validStoreId,
        targetUserId
      }
    });
  } catch (error) {
    // If foreign key constraint still fails for any reason, fallback without storeId
    try {
      await prisma.activityLog.create({
        data: {
          userId,
          tenantId,
          action,
          details,
          metadata,
          storeId: null,
          targetUserId
        }
      });
    } catch (fallbackError) {
      console.warn('[ActivityLogger] Skipped activity log:', fallbackError.message);
    }
  }
};
