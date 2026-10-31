// services/allocationService.js
import { prisma } from '../config/prismaClient.js';
import logger from '../utils/logger.js';

export const syncActiveOrderCounts = async () => {
  try {
    const shopkeepers = await prisma.shopkeeper.findMany();
    for (const sk of shopkeepers) {
      const activeCount = await prisma.order.count({
        where: {
          assignedShopkeeperId: sk.id,
          status: { in: ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP'] }
        }
      });
      await prisma.shopkeeper.update({
        where: { id: sk.id },
        data: { activeOrderCount: activeCount }
      });
    }
  } catch (err) {
    logger.error('[syncActiveOrderCounts] Error:', { error: err.message });
  }
};

const allocateUnassignedOrders = async () => {
  return; // Disabled automatic allocation permanently as per user request
  try {
    const unassigned = await prisma.order.findMany({
      where: {
        status: 'PENDING',
        assignedShopkeeperId: null
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    if (unassigned.length === 0) return;

    for (const order of unassigned) {
      const shopkeepers = await prisma.shopkeeper.findMany({
        where: {
          status: { not: 'Offline' }
        },
        orderBy: [
          { activeOrderCount: 'asc' },
          { id: 'asc' }
        ],
        take: 1
      });

      if (shopkeepers.length > 0) {
        const sk = shopkeepers[0];
        logger.info(`[AllocationService] Assigning order ${order.orderNumber} to ${sk.name}`);

        await prisma.order.update({
          where: { id: order.id },
          data: {
            assignedShopkeeperId: sk.id,
            allocationStartedAt: new Date(),
            allocationStatus: 'Pending',
            allocationAttempts: 1
          }
        });

        await syncActiveOrderCounts();
      }
    }
  } catch (err) {
    logger.error('[allocateUnassignedOrders] Error:', { error: err.message });
  }
};

const reallocateExpiredOrders = async () => {
  return; // Disabled automatic allocation permanently as per user request
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const expired = await prisma.order.findMany({
      where: {
        status: 'PENDING',
        allocationStatus: 'Pending',
        assignedShopkeeperId: { not: null },
        allocationStartedAt: { lt: fiveMinutesAgo }
      }
    });

    if (expired.length === 0) return;

    for (const order of expired) {
      logger.info(`[AllocationService] Order ${order.orderNumber} allocation expired. Reallocating...`);

      let nextShopkeepers = await prisma.shopkeeper.findMany({
        where: {
          status: { not: 'Offline' },
          id: { not: order.assignedShopkeeperId }
        },
        orderBy: [
          { activeOrderCount: 'asc' },
          { id: 'asc' }
        ],
        take: 1
      });

      if (nextShopkeepers.length === 0) {
        nextShopkeepers = await prisma.shopkeeper.findMany({
          where: { status: { not: 'Offline' } },
          orderBy: [
            { activeOrderCount: 'asc' },
            { id: 'asc' }
          ],
          take: 1
        });
      }

      if (nextShopkeepers.length > 0) {
        const sk = nextShopkeepers[0];
        await prisma.order.update({
          where: { id: order.id },
          data: {
            assignedShopkeeperId: sk.id,
            allocationStartedAt: new Date(),
            allocationStatus: 'Pending',
            allocationAttempts: { increment: 1 }
          }
        });

        await syncActiveOrderCounts();
      }
    }
  } catch (err) {
    logger.error('[reallocateExpiredOrders] Error:', { error: err.message });
  }
};

export const startAllocationService = () => {
  logger.info('🤖 Starting Shopkeeper Allocation background service...');
  syncActiveOrderCounts();
  const interval = setInterval(async () => {
    await allocateUnassignedOrders();
    await reallocateExpiredOrders();
  }, 5000);

  return () => clearInterval(interval);
};
