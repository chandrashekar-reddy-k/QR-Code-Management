import logger from '../utils/logger.js';
import { prisma } from '../config/prismaClient.js';

const NOTIFICATION_SERVICE_URL = (process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4001').replace(/\/+$/, '');
const INTERNAL_SYNC_KEY = process.env.INTERNAL_SYNC_KEY || '';

/**
 * Non-blocking, production-safe bridge to dispatch order notifications to Port 4001.
 * Uses native global fetch so zero external dependencies (no axios) are needed.
 * Wraps calls in try/catch fire-and-forget so partner workflows (accept, reject, status)
 * are never slowed down or disrupted if the Notification Service is unreachable.
 *
 * @param {Object} params
 * @param {string} params.orderId - The order ID
 * @param {string} params.toStatus - CONFIRMED, CANCELLED, DELIVERED, etc.
 * @param {string} [params.reason] - Reason for status update or cancellation
 */
export const dispatchPartnerOrderNotification = async ({ orderId, toStatus, reason }) => {
  if (!orderId || !toStatus) return;

  const statusNorm = String(toStatus).toUpperCase();
  // Supported notifications from partner portal
  if (!['CONFIRMED', 'CANCELLED', 'DELIVERED'].includes(statusNorm)) {
    return;
  }

  setImmediate(async () => {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          consumer: {
            select: { id: true, name: true, phone: true, email: true }
          },
          payment: {
            select: { method: true, amount: true, status: true }
          },
          items: {
            include: {
              product: {
                select: { name: true }
              }
            }
          }
        }
      });

      if (!order || !order.consumer) return;

      const consumer = order.consumer;
      const orderNumber = order.orderNumber || order.orderNo || order.id;
      const eventId = `evt_order_${order.id}_${statusNorm.toLowerCase()}`;
      const customerName = consumer.name || 'Customer';
      const totalAmount = Number(order.totalAmount || 0).toFixed(2);
      const paymentMethod = order.payment?.method || order.paymentMethod || 'Cash On Delivery (COD)';

      // Clean single-line items summary for WhatsApp & SMS
      const itemsList = order.items || [];
      const itemsCount = itemsList.reduce((sum, it) => sum + (it.quantity || 1), 0);
      const itemsSummary = itemsList.length > 0
        ? itemsList.map(it => `${it.product?.name || 'Item'} (x${it.quantity || 1}) - ₹${Number(it.totalPrice || (it.unitPrice * (it.quantity || 1)) || 0).toFixed(2)}`).join(', ')
        : `Total: ₹${totalAmount}`;

      // Formatted HTML table for Emails
      const itemsTable = itemsList.length > 0
        ? `<table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;">
            <thead>
              <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left;">
                <th style="padding: 10px 14px; font-weight: 600; color: #475569;">Item</th>
                <th style="padding: 10px 14px; font-weight: 600; color: #475569; text-align: center;">Qty</th>
                <th style="padding: 10px 14px; font-weight: 600; color: #475569; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList.map((item, idx) => {
                const name = item.product?.name || item.productName || 'Produce Item';
                const qty = item.quantity || 1;
                const price = Number(item.totalPrice || (item.unitPrice * qty) || 0).toFixed(2);
                const bg = idx % 2 === 0 ? '#ffffff' : '#fcfdfd';
                return `<tr style="background-color: ${bg}; border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 12px 14px; color: #1e293b; font-weight: 500;">${name}</td>
                  <td style="padding: 12px 14px; color: #64748b; text-align: center;">${qty}</td>
                  <td style="padding: 12px 14px; color: #0f172a; text-align: right; font-weight: 600;">₹${price}</td>
                </tr>`;
              }).join('')}
            </tbody>
            <tfoot>
              <tr style="border-top: 2px solid #e2e8f0; background-color: #f8fafc;">
                <td colspan="2" style="padding: 12px 14px; font-weight: 700; color: #0f172a;">Total Amount</td>
                <td style="padding: 12px 14px; font-weight: 700; color: #16a34a; text-align: right; font-size: 15px;">₹${totalAmount}</td>
              </tr>
            </tfoot>
          </table>`
        : `<p style="color: #64748b; font-size: 14px;">Total Amount: ₹${totalAmount}</p>`;

      const payload = {
        customerName,
        orderNumber,
        totalAmount,
        paymentMethod,
        itemsTable,
        status: statusNorm,
        itemsCount,
        itemsSummary,
        reason: reason || (statusNorm === 'CONFIRMED' ? 'Order confirmed by store partner' : `Order ${statusNorm.toLowerCase()}`),
        cancellationReason: reason || null
      };

      const response = await fetch(`${NOTIFICATION_SERVICE_URL}/api/v1/notifications/send`, {
        method: 'POST',
        headers: {
          'x-api-key': INTERNAL_SYNC_KEY,
          'x-source-service': 'villagkart-partner-apis',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventId,
          eventType: `ORDER_${statusNorm}`,
          sourceService: 'villagkart-partner-apis',
          channel: 'ALL',
          recipient: {
            userId: consumer.id,
            phone: consumer.phone,
            email: consumer.email
          },
          payload
        }),
        signal: AbortSignal.timeout(4000)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        logger.warn(`[NotificationBridge] Dispatch notice for ORDER_${statusNorm} (${orderId}): Status ${response.status} - ${errorText}`);
      } else {
        logger.info(`[NotificationBridge] Successfully dispatched ORDER_${statusNorm} for order #${orderNumber} to Notification Service`);
      }
    } catch (err) {
      // Non-blocking fail-safe: warning only, never interrupts partner APIs
      logger.warn(`[NotificationBridge] Dispatch notice for ORDER_${statusNorm} (${orderId}): ${err.message}`);
    }
  });
};

export default {
  dispatchPartnerOrderNotification
};
