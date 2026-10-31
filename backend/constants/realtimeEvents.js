export const REALTIME_PAYLOAD_VERSION = 1

export const SOCKET_NAMESPACES = Object.freeze({
  consumer: '/consumer',
  delivery: '/delivery',
  partner: '/partner',
  admin: '/admin'
})

export const SOCKET_EVENTS = Object.freeze({
  partner: {
    ORDER_UPDATED: 'partner:order_updated',
    DELIVERY_ASSIGNED: 'partner:delivery_assigned',
    NEW_ORDER: 'partner:new_order',
    DELIVERY_UNASSIGNED_TIMEOUT: 'partner:delivery_unassigned_timeout'
  },
  admin: {
    ORDER_UPDATED: 'admin:order_updated'
  },
  delivery: {
    REQUEST_OFFER: 'delivery:request_offer',
    OFFER_CANCELLED: 'delivery:offer_cancelled',
    NEW_ASSIGNMENT: 'delivery:new_assignment'
  }
})

export const roomWarehouse = (warehouseId) => `warehouse:${warehouseId}`
export const roomAdminGlobal = () => 'admin:global'
