import { admin, firebaseInitialized } from "../config/firebase.js";
import logger from "../utils/logger.js";

async function collectPartnerFcmTokens(prisma, shopkeeperId) {
  const [devices, sessions] = await Promise.all([
    prisma.deviceToken.findMany({
      where: { fcmToken: { not: null } },
      select: { fcmToken: true },
    }),
    prisma.session.findMany({
      where: {
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
 * Dispatch FCM push notification to partner device tokens when a new order arrives.
 */
export async function notifyPartnerNewOrder(prisma, orderData) {
  if (!firebaseInitialized || !admin.apps?.length) {
    logger.debug("[Push] Partner FCM disabled or not initialized — skipping FCM push");
    return;
  }

  const tokens = await collectPartnerFcmTokens(prisma, orderData.shopkeeperId);
  if (!tokens.length) {
    logger.debug("[Push] No partner FCM tokens found for push notification");
    return;
  }

  const payload = {
    notification: {
      title: "🔔 NEW ORDER RECEIVED!",
      body: `Order #${orderData.orderNumber || orderData.id} • ₹${orderData.totalAmount || 850} • ${orderData.itemCount || 6} items`,
    },
    data: {
      eventId: String(orderData.eventId || `evt_${Date.now()}`),
      orderId: String(orderData.id || orderData.orderId || ""),
      orderNumber: String(orderData.orderNumber || ""),
      status: "PLACED",
      totalAmount: String(orderData.totalAmount || 850),
      autoConfirmAt: String(orderData.autoConfirmAt || new Date(Date.now() + 30000).toISOString()),
    },
  };

  for (const token of tokens) {
    try {
      await admin.messaging().send({
        token,
        ...payload,
      });
      logger.info(`[Push] Successfully sent NEW_ORDER FCM push to token: ${token.substring(0, 15)}...`);
    } catch (err) {
      logger.warn(`[Push] Failed to send FCM push to token ${token.substring(0, 15)}...`, { error: err.message });
    }
  }
}
