import { prisma } from '../config/prismaClient.js';
import logger from '../utils/logger.js';
import { publishUnassignedDeliveryAlertFanout } from './partnerOrderRealtimeService.js';

let workerInterval = null;
const SWEEP_INTERVAL_MS = 15000; // 15 seconds
const TIMEOUT_SECONDS = parseInt(process.env.DELIVERY_UNASSIGNED_TIMEOUT_SECONDS || '120', 10);

export async function sweepUnassignedDeliveryOrders() {
  const now = Date.now();
  const cutoff = new Date(now - TIMEOUT_SECONDS * 1000);
  const minTime = new Date(now - 24 * 60 * 60 * 1000); // last 24 hours

  try {
    const expiredOrders = await prisma.order.findMany({
      where: {
        agentId: null,
        status: {
          in: ['PLACED', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP'],
        },
        createdAt: {
          lte: cutoff,
          gte: minTime,
        },
        OR: [
          // Never scheduled or SLA reached
          { assignmentDueAt: null },
          { assignmentDueAt: { gt: new Date(1000), lte: new Date(now) } },
        ],
      },
      select: {
        id: true,
        orderNumber: true,
        warehouseId: true,
        deliveryType: true,
        status: true,
        totalAmount: true,
      },
    });

    if (!expiredOrders.length) return;

    for (const order of expiredOrders) {
      // Atomic lock using epoch 0 sentinel to avoid duplicate alert
      const locked = await prisma.order.updateMany({
        where: {
          id: order.id,
          agentId: null,
          status: { in: ['PLACED', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP'] },
          OR: [
            { assignmentDueAt: null },
            { assignmentDueAt: { gt: new Date(1000) } },
          ],
        },
        data: {
          assignmentDueAt: new Date(0), // Sentinel marker: alerted
        },
      });

      if (locked.count === 0) continue;

      logger.warn(`[UnassignedSLAWorker] 🚨 ${TIMEOUT_SECONDS}s SLA expired with no rider for order ${order.orderNumber}. Dispatching real-time alert.`);

      // Persist notification record
      if (order.warehouseId) {
        await prisma.notification.create({
          data: {
            userId: order.warehouseId,
            type: 'SYSTEM_ALERT',
            title: 'Delivery Partner Not Assigned',
            message: `This order #${order.orderNumber} has not been accepted by any delivery partner within ${TIMEOUT_SECONDS} seconds. Please check the order and arrange delivery.`,
            channel: ['IN_APP', 'SOCKET'],
            data: {
              orderId: order.id,
              orderNumber: order.orderNumber,
              warehouseId: order.warehouseId,
              deliveryType: order.deliveryType || 'FAST',
              totalAmount: Number(order.totalAmount || 0),
              alertType: 'UNASSIGNED_DELIVERY_TIMEOUT',
              timeoutSeconds: TIMEOUT_SECONDS,
              timestamp: new Date().toISOString(),
            },
          },
        }).catch(() => {});
      }

      // Publish Realtime Socket Fanout
      await publishUnassignedDeliveryAlertFanout({
        orderId: order.id,
        orderNumber: order.orderNumber,
        warehouseId: order.warehouseId,
        deliveryType: order.deliveryType || 'FAST',
        status: order.status,
        totalAmount: Number(order.totalAmount || 0),
        timeoutSeconds: TIMEOUT_SECONDS,
        title: 'Delivery Partner Not Assigned',
        message: `This order has not been accepted by any delivery partner within ${TIMEOUT_SECONDS} seconds. Please check the order and arrange delivery.`,
        timestamp: new Date().toISOString(),
      });

      // Clean up in-memory broadcast and cancel offer to all delivery agents so the card is removed from their portals
      try {
        const { cancelDeliveryBroadcast } = await import('./deliveryBroadcastService.js');
        await cancelDeliveryBroadcast(order.id, null, true, 'Delivery offer expired without acceptance');
      } catch (cancelErr) {
        logger.debug('[UnassignedSLAWorker] cancelDeliveryBroadcast non-fatal error', { error: cancelErr.message });
      }
    }
  } catch (err) {
    logger.error('[UnassignedSLAWorker] Error in sweepUnassignedDeliveryOrders:', { error: err.message });
  }
}

export function startUnassignedDeliverySlaWorker() {
  if (workerInterval) return;
  // Run first check after 3 seconds, then every 15 seconds
  setTimeout(() => {
    sweepUnassignedDeliveryOrders().catch(() => {});
  }, 3000);
  workerInterval = setInterval(() => {
    sweepUnassignedDeliveryOrders().catch(() => {});
  }, SWEEP_INTERVAL_MS);
  logger.info('[UnassignedSLAWorker] Background SLA worker started (interval 15s)');
}

export function stopUnassignedDeliverySlaWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    logger.info('[UnassignedSLAWorker] Background SLA worker stopped');
  }
}
