import { admin, firebaseInitialized } from "../config/firebase.js";
import logger from "../utils/logger.js";

async function collectAgentFcmTokens(prisma, userId) {
  const [devices, sessions] = await Promise.all([
    prisma.deviceToken.findMany({
      where: { userId, fcmToken: { not: null } },
      select: { fcmToken: true },
    }),
    prisma.session.findMany({
      where: {
        userId,
        fcmToken: { not: null },
        expiresAt: { gt: new Date() },
      },
      distinct: ["fcmToken"],
      select: { fcmToken: true },
    }),
  ]);
  const set = new Set();
  for (const d of devices) {
    if (d.fcmToken) set.add(d.fcmToken);
  }
  for (const s of sessions) {
    if (s.fcmToken) set.add(s.fcmToken);
  }
  return [...set];
}

/**
 * Notify a delivery agent when partner assigns an order (same DB as delivery-api).
 */
export async function notifyDeliveryAgentOrderAssigned(
  prisma,
  agentId,
  { orderId, orderNumber },
) {
  if (!firebaseInitialized || !admin.apps?.length) {
    logger.debug("[Push] Partner — Firebase off, skip notify");
    return;
  }
  const tokens = await collectAgentFcmTokens(prisma, agentId);
  if (!tokens.length) return;

  const data = {
    type: "ORDER_ASSIGNED",
    orderId: String(orderId),
    orderNumber: String(orderNumber || ""),
  };

  for (const token of tokens) {
    try {
      await admin.messaging().send({
        token,
        notification: {
          title: "New order assigned 🚚",
          body: `Order ${orderNumber || orderId} assigned to you`,
        },
        data: Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)]),
        ),
        android: {
          priority: "high",
          notification: {
            sound: "default",
            channelId: "delivery_orders",
          },
        },
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
              sound: "default",
            },
          },
        },
      });
    } catch (e) {
      logger.warn("[Push] Partner send failed", { message: e.message });
    }
  }
}

/**
 * Notify previous delivery agent when order is reassigned away from them.
 */
export async function notifyDeliveryAgentOrderCancelled(
  prisma,
  agentId,
  { orderId, orderNumber, reason },
) {
  if (!firebaseInitialized || !admin.apps?.length) return;
  const tokens = await collectAgentFcmTokens(prisma, agentId);
  if (!tokens.length) return;

  const data = {
    type: "ORDER_REASSIGNED",
    orderId: String(orderId),
    orderNumber: String(orderNumber || ""),
    reason: String(reason || "REASSIGNED"),
  };

  for (const token of tokens) {
    try {
      await admin.messaging().send({
        token,
        notification: {
          title: "Order Reassigned",
          body: `Order ${orderNumber || orderId} has been reassigned to another rider.`,
        },
        data: Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)]),
        ),
        android: {
          priority: "high",
          notification: {
            sound: "default",
          },
        },
      });
    } catch (e) {
      logger.warn("[Push] Partner cancel push failed", { message: e.message });
    }
  }
}
