import { publishOrHttpFanout } from './realtimeTransport.js'
import {
  REALTIME_PAYLOAD_VERSION,
  SOCKET_EVENTS,
  SOCKET_NAMESPACES,
  roomAdminGlobal,
  roomWarehouse
} from '../constants/realtimeEvents.js'

export async function publishPartnerOrderFanout({
  orderId,
  orderNumber,
  priorStatus,
  status,
  warehouseId,
  agentId,
  eventId,
  deliveryStatus
}) {
  if (!warehouseId) return
  const correlationId = `partner:${orderId}:${status}:${eventId || Date.now()}`
  const payload = {
    v: REALTIME_PAYLOAD_VERSION,
    orderId,
    orderNumber,
    priorStatus,
    status,
    warehouseId,
    agentId,
    deliveryStatus,
    eventId,
    timestamp: new Date().toISOString()
  }
  const event =
    agentId && priorStatus !== status
      ? SOCKET_EVENTS.partner.DELIVERY_ASSIGNED
      : SOCKET_EVENTS.partner.ORDER_UPDATED
  const emits = [
    {
      namespace: SOCKET_NAMESPACES.partner,
      room: roomWarehouse(warehouseId),
      event,
      payload
    },
    {
      namespace: SOCKET_NAMESPACES.admin,
      room: roomAdminGlobal(),
      event: SOCKET_EVENTS.admin.ORDER_UPDATED,
      payload
    }
  ]

  if (status === 'PLACED') {
    emits.push({
      namespace: SOCKET_NAMESPACES.partner,
      room: roomWarehouse(warehouseId),
      event: SOCKET_EVENTS.partner.NEW_ORDER, // partner:new_order
      payload
    });
    console.log("[SOCKET] Emitting NEW_ORDER", {
      namespace: SOCKET_NAMESPACES.partner,
      room: roomWarehouse(warehouseId),
      event: SOCKET_EVENTS.partner.NEW_ORDER,
      orderId
    });
  }

  await publishOrHttpFanout({ correlationId, emits })

  // Also emit locally on root and partner namespaces
  try {
    const { getIO } = await import('./socketService.js')
    const localIo = getIO()
    if (localIo) {
      localIo.to(`store:${warehouseId}`).to(`warehouse:${warehouseId}`).emit('order:status', payload)
      localIo.of(SOCKET_NAMESPACES.partner).to(roomWarehouse(warehouseId)).to(`store:${warehouseId}`).emit(event, payload)
      localIo.of(SOCKET_NAMESPACES.admin).to(roomAdminGlobal()).emit(SOCKET_EVENTS.admin.ORDER_UPDATED, payload)

      if (status === 'PLACED') {
        localIo.to(`store:${warehouseId}`).to(`warehouse:${warehouseId}`).emit('order:new', payload)
        localIo.of(SOCKET_NAMESPACES.partner).to(roomWarehouse(warehouseId)).to(`store:${warehouseId}`).emit(
          SOCKET_EVENTS.partner.NEW_ORDER,
          payload
        )
      }
    }
  } catch (err) {
    // Ignore if Socket.io is not initialized yet
  }
}

export async function publishUnassignedDeliveryAlertFanout({
  orderId,
  orderNumber,
  warehouseId,
  deliveryType = 'FAST',
  status = 'CONFIRMED',
  totalAmount = 0,
  timeoutSeconds = 120,
  title = 'Delivery Partner Not Assigned',
  message = 'This order has not been accepted by any delivery partner within 120 seconds. Please check the order and arrange delivery.',
  timestamp = new Date().toISOString(),
}) {
  if (!warehouseId) return;
  const correlationId = `partner:unassigned:${orderId}:${Date.now()}`;
  const payload = {
    v: REALTIME_PAYLOAD_VERSION,
    orderId,
    orderNumber,
    warehouseId,
    deliveryType,
    status,
    totalAmount,
    timeoutSeconds,
    title,
    message,
    timestamp,
  };

  const emits = [
    {
      namespace: SOCKET_NAMESPACES.partner,
      room: roomWarehouse(warehouseId),
      event: SOCKET_EVENTS.partner.DELIVERY_UNASSIGNED_TIMEOUT,
      payload,
    },
    {
      namespace: SOCKET_NAMESPACES.admin,
      room: roomAdminGlobal(),
      event: SOCKET_EVENTS.partner.DELIVERY_UNASSIGNED_TIMEOUT,
      payload,
    },
  ];

  await publishOrHttpFanout({ correlationId, emits }).catch(() => {});

  // Emit locally on root and partner namespaces SCOPED TO THE STORE/WAREHOUSE ROOM ONLY
  try {
    const { getIO } = await import('./socketService.js');
    const localIo = getIO();
    if (localIo) {
      // Root namespace store room (listened by ShopkeeperERP useSocket)
      localIo.to(`store:${warehouseId}`).to(`warehouse:${warehouseId}`).emit('order:unassigned_timeout', payload);

      // Partner namespace warehouse room
      localIo.of(SOCKET_NAMESPACES.partner).to(roomWarehouse(warehouseId)).to(`store:${warehouseId}`).emit(
        SOCKET_EVENTS.partner.DELIVERY_UNASSIGNED_TIMEOUT,
        payload
      );

      // Admin namespace
      localIo.of(SOCKET_NAMESPACES.admin).to(roomAdminGlobal()).emit(
        SOCKET_EVENTS.partner.DELIVERY_UNASSIGNED_TIMEOUT,
        payload
      );

      // Delivery namespace: inform delivery apps that the offer has expired so it closes on their devices
      localIo.of(SOCKET_NAMESPACES.delivery).emit(SOCKET_EVENTS.delivery.OFFER_CANCELLED, {
        orderId,
        orderNumber,
        reason: 'Delivery offer expired without acceptance'
      });

      console.log(`[SOCKET] Emitted ${SOCKET_EVENTS.partner.DELIVERY_UNASSIGNED_TIMEOUT} for order ${orderNumber} scoped to warehouse ${warehouseId}`);
    }
  } catch (err) {
    console.error('Failed to emit local unassigned timeout socket:', err.message);
  }
}
