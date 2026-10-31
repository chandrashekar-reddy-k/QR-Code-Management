// controllers/shopkeeperController.js
import crypto from 'crypto';
import { prisma } from '../config/prismaClient.js';
import logger from '../utils/logger.js';
import { errorResponse, successResponse } from '../utils/responseHelper.js';
import { emitCanonicalEvent } from '../audit/auditLogger.js';
import { CANONICAL_EVENTS } from '../audit/auditConstants.js';
import { emitToDeliveryApp, notifyConsumerOrderStatusSync } from '../utils/realtimeFanout.js';
import { startDeliveryBroadcast, cancelDeliveryBroadcast } from '../services/deliveryBroadcastService.js';
import { notifyDeliveryAgentOrderAssigned, notifyDeliveryAgentOrderCancelled } from '../services/agentPushNotification.js';
import { getIO } from '../services/socketService.js';
import { dispatchPartnerOrderNotification } from '../services/notificationBridgeService.js';

// Status mappings to translate between DB OrderStatus enum and Frontend expectations
const feToDbStatus = {
  'new': { in: ['PENDING', 'PLACED'] },
  'assigned': { in: ['PENDING', 'PLACED'] },
  'accepted': 'CONFIRMED',
  'picking': 'PROCESSING',
  'packing': 'PROCESSING',
  'ready': 'READY_FOR_PICKUP',
  'dispatched': 'OUT_FOR_DELIVERY',
  'cancelled': 'CANCELLED'
};

const mapDbToFe = (order) => {
  let feStatus = 'new';
  if (order.status === 'PENDING' || order.status === 'PLACED') {
    if (order.assignedShopkeeperId) {
      feStatus = 'assigned';
    } else {
      feStatus = 'new';
    }
  }
  else if (order.status === 'CONFIRMED') {
    if (!order.assignedShopkeeperId) {
      feStatus = 'confirmed';
    } else if (order.assignedShopkeeperId && !order.shopkeeperAcceptedAt && !order.acceptedByShopkeeperAt) {
      feStatus = 'assigned';
    } else {
      feStatus = 'accepted';
    }
  }
  else if (order.status === 'PROCESSING') {
    feStatus = order.pickingCompletedAt ? 'packing' : 'picking';
  }
  else if (order.status === 'READY_FOR_PICKUP') {
    feStatus = 'ready';
  }
  else if (order.status === 'OUT_FOR_DELIVERY' || order.status === 'DELIVERED') feStatus = 'dispatched';
  else if (order.status === 'CANCELLED') feStatus = 'cancelled';

  const items = order.items || [];
  const itemCount = items.length;
  const pickedCount = items.filter(item => item.isPicked).length;

  return {
    ...order,
    status: feStatus,
    order_number: order.orderNumber,
    order_type: order.fulfillmentType === 'STORE_PICKUP' ? 'Self Pickup' : 'Home Delivery',
    payment_method: order.paymentMethod || 'COD',
    total_value: order.totalAmount,
    delivery_charge: order.deliveryCharge || 0,
    sla_minutes: order.slaMinutes || 30,
    priority: order.priority || 'MEDIUM',
    sla_breach: order.slaBreach || false,
    tray_number: order.trayNumber,
    picker_id: order.pickerId,
    packer_id: order.packerId,
    customer_name: order.customer?.name || order.consumer?.name || 'Customer',
    customer_phone: order.customer?.mobile || order.consumer?.phone || '',
    customer_address: order.address
      ? [order.address.line1, order.address.line2, order.address.city, order.address.state, order.address.pincode].filter(Boolean).join(', ')
      : '',
    shopkeeper_name: order.assignedShopkeeper?.name || null,
    assigned_shopkeeper_id: order.assignedShopkeeperId,
    shopkeeper_accepted_at: order.shopkeeperAcceptedAt || order.acceptedByShopkeeperAt || null,
    dispatched_at: order.deliveredAt || order.dispatchedAt || null,
    agentId: order.agentId,
    rider_name: order.agent?.name || null,
    rider_phone: order.agent?.phone || null,
    vehicle_number: order.vehicle?.registrationNumber || order.vehicle?.plateNumber || order.vehicleNumber || order.agent?.licensePlate || null,
    vehicle_type: order.vehicle?.type || order.agent?.vehicleType || null,
    allocation_status: order.allocationStatus,
    allocation_started_at: order.allocationStartedAt,
    allocation_timeout_minutes: order.allocationTimeoutMinutes || 5,
    item_count: itemCount,
    picked_count: pickedCount,
    otp: order.otp || null,
    pickup_otp: order.otp || null
  };
};

export const getOrders = async (req, res) => {
  try {
    const { status, store_id } = req.query;

    const where = {};

    let shopkeeperId = null;
    let shopkeeperWarehouseId = null;

    if (req.user && req.user.role === 'SHOPKEEPER') {
      let sk = null;
      try {
        sk = await prisma.shopkeeper.findFirst({
          where: {
            OR: [
              { id: req.user.id },
              { phone: req.user.phone || '' }
            ]
          }
        });
      } catch (e) {
        sk = null;
      }

      shopkeeperId = sk ? sk.id : req.user.id;
      shopkeeperWarehouseId = (sk && sk.warehouseId) ? sk.warehouseId : req.user.warehouseId;

      // -----------------------------------------
      // Ignored logic
      // -----------------------------------------
      if (req.query.view === 'shopkeeper_ignored' && shopkeeperId) {
        where.AND = [
          ...(where.AND || []),
          { statusHistory: { some: { changedBy: shopkeeperId, reason: 'IGNORED_BY_SHOPKEEPER' } } }
        ];
      } else if (shopkeeperId) {
        where.AND = [
          ...(where.AND || []),
          { statusHistory: { none: { changedBy: shopkeeperId, reason: 'IGNORED_BY_SHOPKEEPER' } } }
        ];
      }

      // Get valid shopkeeper IDs for this warehouse to detect orphaned assignments
      const validSkIds = shopkeeperWarehouseId
        ? (await prisma.shopkeeper.findMany({ where: { warehouseId: shopkeeperWarehouseId }, select: { id: true } })).map(s => s.id)
        : [];

      // Base shopkeeper visibility:
      // 1. Orders explicitly assigned to this shopkeeper (their accepted + picking + packing orders)
      // 2. Unassigned PENDING/PLACED/CONFIRMED orders in the warehouse (shared new-order pool)
      // 3. CONFIRMED orders orphaned (assigned to a deleted shopkeeper) — return to shared pool
      where.OR = [
        {
          assignedShopkeeperId: shopkeeperId,
          status: { notIn: ['RETURNED', 'DELIVERED', 'CANCELLED', 'FAILED'] }
        },
        {
          status: { in: ['PENDING', 'PLACED', 'CONFIRMED'] },
          assignedShopkeeperId: null,
          ...(shopkeeperWarehouseId ? { warehouseId: shopkeeperWarehouseId } : {})
        },
        ...(validSkIds.length > 0 ? [{
          // Orphaned: assigned to a shopkeeper that no longer exists → show as unassigned
          status: { in: ['CONFIRMED', 'PROCESSING'] },
          assignedShopkeeperId: { notIn: validSkIds },
          ...(shopkeeperWarehouseId ? { warehouseId: shopkeeperWarehouseId } : {})
        }] : [])
      ];
    }

    if (status) {
      if (status === 'new' || status === 'assigned') {
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { status: 'PLACED' },
              {
                status: 'CONFIRMED',
                shopkeeperAcceptedAt: null,
                acceptedByShopkeeperAt: null
              }
            ]
          }
        ];
      } else if (status === 'accepted') {
        where.status = 'CONFIRMED';
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { shopkeeperAcceptedAt: { not: null } },
              { acceptedByShopkeeperAt: { not: null } }
            ]
          }
        ];
      } else {
        const dbStatus = feToDbStatus[status];
        if (dbStatus) {
          where.status = dbStatus;
          if (status === 'picking') {
            where.pickingCompletedAt = null;
          } else if (status === 'packing') {
            where.pickingCompletedAt = { not: null };
          }
        }
      }
    } else {
      where.AND = [
        ...(where.AND || []),
        { status: { not: 'PENDING' } }
      ];
    }
    const isGlobal =
      ['TENANT_OWNER', 'SUPER_ADMIN'].includes(req.user?.role) ||
      (req.user?.role === 'ADMIN' && !req.user?.warehouseId);

    if (!isGlobal && req.user?.warehouseId) {
      where.warehouseId = req.user.warehouseId;
    } else if (store_id) {
      where.warehouseId = store_id;
    }

    // For shopkeepers, the shared pool logic already includes `assignedShopkeeperId: null` for CONFIRMED.
    // For non-shopkeepers, we maintain the original logic.
    if (!shopkeeperId) {
      where.AND = [...(where.AND || []), { OR: [{ fulfillmentType: { not: 'HOME_DELIVERY' } }, { assignedShopkeeperId: { not: null } }, { status: 'CONFIRMED' }] }];
    }
    const orders = await prisma.order.findMany({
      where,
      include: {
        consumer: true,
        address: true,
        agent: true,
        vehicle: true,
        statusHistory: true,
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Batch fetch product locations for all orders to avoid connection pool exhaustion
    const warehouseIds = [...new Set(orders.map(o => o.warehouseId).filter(Boolean))];
    const locationMap = new Map();

    if (warehouseIds.length > 0 && prisma.productLocation) {
      try {
        const locations = await prisma.productLocation.findMany({
          where: { warehouseId: { in: warehouseIds } },
          include: {
            tray: {
              include: {
                shelf: {
                  include: { rack: true }
                }
              }
            }
          }
        });
        for (const loc of locations) {
          const keyVariant = `${loc.warehouseId}:${loc.productId}:${loc.productVariantId || ''}`;
          const keyProd = `${loc.warehouseId}:${loc.productId}`;
          if (loc.productVariantId) locationMap.set(keyVariant, loc);
          if (!locationMap.has(keyProd)) locationMap.set(keyProd, loc);
        }
      } catch (err) {
        logger.warn('Failed to batch load product locations', { error: err.message });
      }
    }

    const mapped = orders.map((order) => {
      const feOrder = mapDbToFe(order);
      feOrder.items = order.items.map((item) => {
        let loc = null;
        if (order.warehouseId) {
          const keyVariant = `${order.warehouseId}:${item.productId}:${item.productVariantId || ''}`;
          const keyProd = `${order.warehouseId}:${item.productId}`;
          loc = locationMap.get(keyVariant) || locationMap.get(keyProd) || null;
        }

        let aisle_location = item.product?.aisleLocation || 'Aisle 1';
        if (loc && loc.tray) {
          aisle_location = `${loc.tray.shelf.rack.name}-${loc.tray.shelf.name}-${loc.tray.name}`;
        }

        return {
          id: item.id,
          quantity: item.quantity,
          picked_qty: item.pickedQty,
          is_picked: item.isPicked,
          is_verified: item.isVerified,
          is_rejected: item.isRejected,
          is_cancelled: item.isCancelled,
          reject_reason: item.rejectReason,
          reject_remarks: item.rejectRemarks,
          product_id: item.productId,
          name: item.product?.name || item.productName || 'Product',
          sku: item.product?.sku || item.sku,
          barcode: item.product?.barcode || '',
          price: item.unitPrice,
          category: item.product?.category || '',
          aisle_location,
          image_url: item.productImage || item.product?.image || ''
        };
      });
      return feOrder;
    });
    return res.json(mapped);
  } catch (error) {
    logger.error('Error in getOrders', { error: error.message, stack: error.stack?.split('\n').slice(0, 4).join(' | ') });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }]
      },
      include: {
        customer: true,
        consumer: true,
        address: true,
        agent: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });

    const isGlobal =
      ['TENANT_OWNER', 'SUPER_ADMIN'].includes(req.user?.role) ||
      (req.user?.role === 'ADMIN' && !req.user?.warehouseId);

    if (!isGlobal && req.user?.warehouseId && order.warehouseId !== req.user.warehouseId) {
      return res.status(403).json({ error: 'Access Denied: This order belongs to another warehouse.' });
    }

    const mapped = mapDbToFe(order);

    // Batch fetch product locations for all items in order in a single query
    const productIds = order.items.map(i => i.productId).filter(Boolean);
    const locationsMap = new Map();

    if (order.warehouseId && productIds.length > 0 && prisma.productLocation) {
      try {
        const locations = await prisma.productLocation.findMany({
          where: {
            warehouseId: order.warehouseId,
            productId: { in: productIds }
          },
          include: {
            tray: {
              include: {
                shelf: {
                  include: {
                    rack: true
                  }
                }
              }
            }
          }
        });

        for (const loc of locations) {
          if (loc.productVariantId) {
            locationsMap.set(`${loc.productId}_${loc.productVariantId}`, loc);
          }
          if (!locationsMap.has(String(loc.productId))) {
            locationsMap.set(String(loc.productId), loc);
          }
        }
      } catch (locErr) {
        logger.warn('Failed to batch fetch product locations', { error: locErr.message });
      }
    }

    mapped.items = order.items.map((item) => {
      const keyWithVariant = `${item.productId}_${item.productVariantId || ''}`;
      const loc = locationsMap.get(keyWithVariant) || locationsMap.get(String(item.productId));

      let aisle_location = item.product?.aisleLocation || 'Aisle 1';
      if (loc && loc.tray && loc.tray.shelf && loc.tray.shelf.rack) {
        aisle_location = `${loc.tray.shelf.rack.name}-${loc.tray.shelf.name}-${loc.tray.name}`;
      }

      return {
        id: item.id,
        quantity: item.quantity,
        picked_qty: item.pickedQty,
        is_picked: item.isPicked,
        is_verified: item.isVerified,
        is_rejected: item.isRejected,
        is_cancelled: item.isCancelled,
        reject_reason: item.rejectReason,
        reject_remarks: item.rejectRemarks,
        product_id: item.productId,
        name: item.product?.name || item.productName || 'Product',
        sku: item.product?.sku || item.sku,
        barcode: item.product?.barcode || '',
        price: item.unitPrice,
        category: item.product?.category || '',
        aisle_location,
        image_url: item.productImage || item.product?.image || ''
      };
    });

    return res.json(mapped);
  } catch (error) {
    logger.error('Error in getOrderById', { error: error.message });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const acceptOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const targetOrder = await prisma.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] }
    });
    if (!targetOrder) return res.status(404).json({ error: 'Order not found' });
    const actualId = targetOrder.id;

    let skId = req.user?.id;
    if (!skId) return res.status(403).json({ error: 'Only shopkeepers can accept orders this way' });

    // Only SHOPKEEPER role users can accept orders via this endpoint
    if (req.user?.role !== 'SHOPKEEPER') {
      return res.status(403).json({ error: 'Only shopkeeper staff can accept orders from this portal' });
    }

    // Ensure the user actually exists as a registered shopkeeper before assigning (check by ID or phone)
    let existingSk = await prisma.shopkeeper.findFirst({
      where: {
        OR: [
          { id: skId },
          ...(req.user?.phone ? [{ phone: req.user.phone }] : [])
        ]
      }
    });

    if (!existingSk) {
      // Auto-create shopkeeper record for user if missing using Phirangipuram Warehouse ID
      const defaultWhId = req.user?.warehouseId || '9f337243-9b4c-4fb1-9ce5-05ed5a2acfb7';
      try {
        existingSk = await prisma.shopkeeper.create({
          data: {
            id: skId,
            name: req.user?.name || req.user?.email || 'Shopkeeper Staff',
            phone: req.user?.phone || null,
            warehouseId: defaultWhId,
            status: 'Available'
          }
        });
      } catch (createErr) {
        logger.warn('Could not auto-create shopkeeper record in acceptOrder', { error: createErr.message });
      }
    }

    const assignedId = existingSk ? existingSk.id : skId;

    // Atomic update: only update if unassigned OR assigned to THIS shopkeeper
    const updateResult = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL app.manual_assign = 'true'`;
      return await tx.order.updateMany({
        where: {
          id: actualId,
          status: { in: ['PENDING', 'PLACED', 'CONFIRMED'] },
          OR: [
            { assignedShopkeeperId: null },
            { assignedShopkeeperId: assignedId }
          ]
        },
        data: {
          assignedShopkeeperId: assignedId,
          allocationStatus: 'Accepted',
          acceptedByShopkeeperAt: new Date(),
          shopkeeperAcceptedAt: new Date(),
          confirmedAt: new Date(),
        }
      });
    });

    // After successful accept, apply warehouse SLA config (only for this newly accepted order)
    if (updateResult.count > 0) {
      try {
        const sk = await prisma.shopkeeper.findUnique({
          where: { id: assignedId },
          include: { Warehouse: { include: { slaConfig: true } } }
        });
        const slaConfig = sk?.Warehouse?.slaConfig;
        if (slaConfig && slaConfig.slaSeconds > 0) {
          const slaMinutes = Math.round(slaConfig.slaSeconds / 60);
          await prisma.order.update({
            where: { id: actualId },
            data: { slaMinutes }
          });
        }
      } catch (slaErr) {
        // Non-fatal: SLA config lookup failed, order already accepted with default
        logger.warn('Could not apply warehouse SLA config to order', { orderId: actualId, error: slaErr.message });
      }
    }

    if (updateResult.count === 0) {
      // Check why it failed
      const existing = await prisma.order.findUnique({ where: { id: actualId } });
      if (!existing) return res.status(404).json({ error: 'Order not found' });
      if (!['PENDING', 'PLACED', 'CONFIRMED'].includes(existing.status)) return res.status(400).json({ error: `Order is in ${existing.status} state` });
      if (existing.assignedShopkeeperId && existing.assignedShopkeeperId !== assignedId) {
        return res.status(409).json({ error: 'Order already accepted by another shopkeeper.' });
      }
      return res.status(400).json({ error: 'Could not accept order.' });
    }

    const order = await prisma.order.findUnique({
      where: { id: actualId },
      include: {
        consumer: true,
        address: true,
        agent: true,
        items: { include: { product: true } }
      }
    });

    try {
      await prisma.orderStatusHistory.create({
        data: {
          orderId: actualId,
          fromStatus: 'CONFIRMED',
          toStatus: 'ACCEPTED',
          reason: 'Accepted by shopkeeper',
          notes: 'Shopkeeper accepted order for picking/packing',
          changedBy: req.user?.name || req.user?.id || 'Shopkeeper'
        }
      });
    } catch (e) { }

    // Emit order-claimed for popup synchronization
    try {
      const { getIO } = await import('../services/socketService.js');
      const io = getIO();
      if (io) {
        io.of('/partner').emit('order-claimed', {
          orderId: id,
          assignedShopkeeperId: skId
        });
      }
    } catch (e) {
      logger.error('Failed to emit order-claimed', { error: e.message });
    }

    // Emit event to update all dashboards (partner, admin, other shopkeepers)
    await emitCanonicalEvent({
      eventName: CANONICAL_EVENTS.orderStatusChanged,
      eventId: `PARTNER_ORDER_ACCEPTED_${id}_${Date.now()}`,
      entityType: "ORDER",
      entityId: id,
      action: "SHOPKEEPER_ACCEPTED",
      payload: { ...mapDbToFe(order) }
    });

    // Notify Consumer API of CONFIRMED status
    notifyConsumerOrderStatusSync(id, 'CONFIRMED');

    // Dispatch platform notifications (WhatsApp / Email / SMS) to Central Notification Service
    // Only dispatch customer confirmation if the order was transitioning from PLACED or PENDING
    if (['PLACED', 'PENDING'].includes(targetOrder.status)) {
      dispatchPartnerOrderNotification({
        orderId: actualId,
        toStatus: 'CONFIRMED',
        reason: 'Order accepted by store partner'
      }).catch(() => {});
    } else {
      logger.info(`[acceptOrder] Suppressing duplicate CONFIRMED notification for order ${targetOrder.orderNumber || actualId} as it was already ${targetOrder.status}`);
    }

    return res.json(mapDbToFe(order));
  } catch (error) {
    logger.error('Error in acceptOrder', { error: error.message });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const rejectOrder = async (req, res) => {
  try {
    const { id } = req.params;

    // Instead of changing the order status to CANCELLED, we just record that this shopkeeper ignored it.
    // This allows other shopkeepers to still accept the order.
    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] }
    });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const actualId = order.id;

    try {
      await prisma.orderStatusHistory.create({
        data: {
          orderId: actualId,
          fromStatus: order.status,
          toStatus: order.status,
          reason: 'IGNORED_BY_SHOPKEEPER',
          notes: 'Shopkeeper ignored the order offer',
          changedBy: req.user?.id || 'Shopkeeper'
        }
      });
    } catch (e) {
      logger.error('Error creating ignore history', { error: e.message });
    }

    // Update active order count for the shopkeeper if needed
    if (req.user && req.user.role === 'SHOPKEEPER') {
      const sk = await prisma.shopkeeper.findFirst({
        where: {
          OR: [
            { id: req.user.id },
            { phone: req.user.phone || '' }
          ]
        }
      });
      if (sk) {
        const activeCount = await prisma.order.count({
          where: {
            assignedShopkeeperId: sk.id,
            status: { in: ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP'] },
            allocationStatus: { not: 'HandedOver' }
          }
        });
        await prisma.shopkeeper.update({
          where: { id: sk.id },
          data: { activeOrderCount: activeCount }
        });
      }
    }

    // Trigger sync for all shopkeepers
    await emitToRole('SHOPKEEPER', 'shopkeeper:order_rejected', {
      id,
      assignedShopkeeperId: null
    });

    return res.json({ success: true, message: 'Order ignored' });
  } catch (error) {
    logger.error('Error in rejectOrder', { error: error.message });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const allocateNextAvailableTray = async (tx) => {
  // Obtain pg transactional advisory lock to prevent simultaneous/duplicate assignments
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(56789012);`;

  const activeOrders = await tx.order.findMany({
    where: {
      status: {
        in: ['PROCESSING', 'READY_FOR_PICKUP', 'CONFIRMED']
      },
      trayNumber: {
        not: null
      }
    },
    select: {
      trayNumber: true
    }
  });

  const occupiedTrays = new Set(activeOrders.map(o => o.trayNumber));
  let trayIndex = 1;
  while (true) {
    const trayName = `P${String(trayIndex).padStart(2, '0')}`;
    if (!occupiedTrays.has(trayName)) {
      return trayName;
    }
    trayIndex++;
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, tray_number } = req.body;

    const targetOrder = await prisma.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] }
    });

    if (!targetOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const actualId = targetOrder.id;

    const data = {
      status: feToDbStatus[status] || 'PROCESSING',
      updatedAt: new Date()
    };

    if (status === 'picking') data.pickingStartedAt = new Date();
    if (status === 'packing') data.packingStartedAt = new Date();
    if (status === 'ready') data.packingCompletedAt = new Date();
    if (status === 'dispatched') data.deliveredAt = new Date();

    // Release the tray immediately if dispatched or cancelled
    if (status === 'dispatched' || status === 'cancelled') {
      data.trayNumber = null;
    } else if (status === 'packing') {
      // Allocate next free tray atomically if not already set or if occupied by someone else
      await prisma.$transaction(async (tx) => {
        const currentOrder = await tx.order.findUnique({ where: { id: actualId } });
        let isOccupiedByOther = false;
        if (currentOrder && currentOrder.trayNumber) {
          const otherActive = await tx.order.findFirst({
            where: {
              id: { not: actualId },
              status: { in: ['PROCESSING', 'READY_FOR_PICKUP', 'CONFIRMED'] },
              trayNumber: currentOrder.trayNumber
            }
          });
          if (otherActive) isOccupiedByOther = true;
        }
        if (!currentOrder?.trayNumber || isOccupiedByOther) {
          const allocatedTray = await allocateNextAvailableTray(tx);
          data.trayNumber = allocatedTray;
        } else {
          data.trayNumber = currentOrder.trayNumber;
        }
      });
    } else if (tray_number) {
      data.trayNumber = tray_number;
    }

    const order = await prisma.order.update({
      where: { id: actualId },
      data
    });

    try {
      await prisma.orderStatusHistory.create({
        data: {
          orderId: id,
          fromStatus: feToDbStatus[status] || 'PROCESSING',
          toStatus: feToDbStatus[status] || 'PROCESSING',
          reason: `Status updated to ${status} by shopkeeper`,
          notes: data.trayNumber ? `Tray #${data.trayNumber} assigned` : `Status change: ${status}`,
          changedBy: req.user?.name || req.user?.id || 'Shopkeeper'
        }
      });
    } catch (e) { }

    // Synchronize to related FulfillmentOrder status
    await prisma.fulfillmentOrder.updateMany({
      where: { orderId: id },
      data: {
        status: data.status
      }
    });

    // 🚚 Auto-broadcast: start progressive radius search when order is ready 🚚
    if (order.status === "READY_FOR_PICKUP" && !order.agentId) {
      startDeliveryBroadcast(order.id, order.warehouseId).catch(err => {
        logger.error("[ShopkeeperOrders] Failed to start delivery broadcast", {
          orderId: id,
          error: err.message,
        });
      });
    } else if (order.status !== "READY_FOR_PICKUP") {
      cancelDeliveryBroadcast(order.id).catch(err => {
        logger.error("[ShopkeeperOrders] Failed to cancel delivery broadcast", {
          orderId: id,
          error: err.message,
        });
      });
    }

    // Notify Consumer API of status update
    notifyConsumerOrderStatusSync(id, order.status);

    // Dispatch platform notifications (WhatsApp / Email / SMS) to Central Notification Service
    dispatchPartnerOrderNotification({
      orderId: actualId,
      toStatus: order.status,
      reason: `Status updated to ${status} by shopkeeper`
    }).catch(() => {});

    return res.json(mapDbToFe(order));
  } catch (error) {
    logger.error('Error in updateOrderStatus', { error: error.message });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const pickItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;

    const targetOrder = await prisma.order.findFirst({
      where: { OR: [{ id: orderId }, { orderNumber: orderId }] }
    });

    const actualOrderId = targetOrder ? targetOrder.id : orderId;

    const targetItem = (await prisma.orderItem.findFirst({
      where: { id: itemId }
    })) || (await prisma.orderItem.findFirst({
      where: {
        orderId: actualOrderId,
        OR: [{ id: itemId }, { productId: itemId }]
      }
    }));
    const actualItemId = targetItem ? targetItem.id : itemId;

    if (!targetItem) {
      return res.status(404).json({ error: 'Order item not found' });
    }

    const updatedItem = await prisma.orderItem.update({
      where: { id: actualItemId },
      data: {
        isPicked: true,
        pickedQty: targetItem.quantity
      }
    });

    // Ensure order pickingStartedAt is recorded
    await prisma.order.updateMany({
      where: {
        id: actualOrderId,
        pickingStartedAt: null
      },
      data: {
        status: 'PROCESSING',
        pickingStartedAt: new Date()
      }
    }).catch(() => { });

    // Check if all items are picked or rejected
    const remaining = await prisma.orderItem.count({
      where: {
        orderId: actualOrderId,
        isPicked: false,
        isRejected: false
      }
    });

    if (remaining === 0) {
      await prisma.$transaction(async (tx) => {
        const tray = await allocateNextAvailableTray(tx);
        await tx.order.update({
          where: { id: actualOrderId },
          data: {
            status: 'PROCESSING',
            trayNumber: tray,
            pickingCompletedAt: new Date(),
            packingStartedAt: new Date()
          }
        });
      });
    }

    return res.json({ success: true, item: updatedItem });
  } catch (error) {
    logger.error('Error in pickItem', { error: error.message });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const rejectItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { reason, remarks } = req.body;
    const userId = req.user?.id || 'Shopkeeper';

    const cancellationTime = new Date();

    const targetOrder = await prisma.order.findFirst({
      where: { OR: [{ id: orderId }, { orderNumber: orderId }] }
    });

    const actualOrderId = targetOrder ? targetOrder.id : orderId;

    const targetItem = (await prisma.orderItem.findFirst({
      where: { id: itemId }
    })) || (await prisma.orderItem.findFirst({
      where: {
        orderId: actualOrderId,
        OR: [{ id: itemId }, { productId: itemId }]
      }
    }));
    const actualItemId = targetItem ? targetItem.id : itemId;

    const { item, updatedOrder } = await prisma.$transaction(async (tx) => {
      // 1. Mark item as rejected AND cancelled/unavailable
      const updatedItem = await tx.orderItem.update({
        where: { id: actualItemId },
        data: {
          isRejected: true,
          rejectReason: reason || 'Out of stock during picking',
          rejectRemarks: remarks || null,
          isCancelled: true,
          cancelledAt: cancellationTime,
          cancellationReason: reason || remarks || 'Item rejected during picking',
          cancelledBy: String(userId)
        }
      });

      // 2. Restore stock for product/variant if applicable
      if (updatedItem.productVariantId) {
        await tx.productVariant.update({
          where: { id: updatedItem.productVariantId },
          data: { stockQuantity: { increment: updatedItem.quantity || 1 } }
        }).catch(() => { });
      } else if (updatedItem.productId) {
        await tx.product.update({
          where: { id: updatedItem.productId },
          data: { stock: { increment: updatedItem.quantity || 1 } }
        }).catch(() => { });
      }

      // 3. Recalculate order totals for active non-cancelled, non-rejected items
      const activeItems = await tx.orderItem.findMany({
        where: { orderId: actualOrderId, isCancelled: false, isRejected: false }
      });

      let subtotal = 0;
      let totalTax = 0;
      let totalCGST = 0;
      let totalSGST = 0;
      let totalIGST = 0;

      for (const ai of activeItems) {
        subtotal += (ai.unitPrice || ai.price || 0) * (ai.quantity || 1);
        totalTax += ai.taxAmount || 0;
        totalCGST += ai.cgst || 0;
        totalSGST += ai.sgst || 0;
        totalIGST += ai.igst || 0;
      }

      subtotal = Math.round(subtotal * 100) / 100;
      const discount = targetOrder?.discount || 0;
      const taxableAmount = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
      const deliveryCharge = targetOrder?.deliveryCharge || 0;
      const totalAmount = Math.round((taxableAmount + totalTax + deliveryCharge) * 100) / 100;

      // 4. Check if all items in order are processed
      const remainingUnprocessed = await tx.orderItem.count({
        where: {
          orderId: actualOrderId,
          isPicked: false,
          isRejected: false,
          isCancelled: false
        }
      });

      let statusUpdate = {};
      if (remainingUnprocessed === 0) {
        if (activeItems.length === 0) {
          statusUpdate = {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancellationReason: reason || remarks || 'All items rejected during picking'
          };
        } else {
          const tray = await allocateNextAvailableTray(tx);
          statusUpdate = {
            status: 'PROCESSING',
            trayNumber: tray,
            pickingCompletedAt: new Date(),
            packingStartedAt: new Date()
          };
        }
      }

      const orderUpdated = await tx.order.update({
        where: { id: actualOrderId },
        data: {
          totalAmount,
          totalValue: totalAmount,
          taxAmount: totalTax,
          cgst: totalCGST,
          sgst: totalSGST,
          igst: totalIGST,
          taxableAmount,
          ...statusUpdate
        }
      });

      return { item: updatedItem, updatedOrder: orderUpdated };
    });

    // 5. Notify consumer service for refund & real-time sync
    try {
      const { notifyConsumerOrderStatusSync } = await import('../services/consumerStatusSyncService.js');
      notifyConsumerOrderStatusSync(orderId, updatedOrder.status, {
        itemId,
        event: 'ITEM_UNAVAILABLE',
        reason: reason || remarks || 'Item rejected during picking'
      });
    } catch (syncErr) {
      logger.warn('Consumer status sync failed on item reject', { error: syncErr.message });
    }

    if (updatedOrder.status === 'CANCELLED') {
      dispatchPartnerOrderNotification({
        orderId: actualOrderId,
        toStatus: 'CANCELLED',
        reason: updatedOrder.cancellationReason || reason || 'All items rejected during picking'
      }).catch(() => {});
    }

    // 6. Invalidate caches so order details update immediately
    try {
      const { InventoryCache } = await import('../utils/cacheHelper.js');
      await InventoryCache.invalidatePrefix('shopkeeper:');
      await InventoryCache.invalidatePrefix('order:');
    } catch (cErr) { }

    return res.json({ success: true, item, order: updatedOrder });
  } catch (error) {
    logger.error('Error in rejectItem', { error: error.message });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getReturns = async (req, res) => {
  try {
    const where = {};
    if (req.user && req.user.role === 'SHOPKEEPER') {
      const sk = await prisma.shopkeeper.findFirst({
        where: {
          OR: [
            { id: req.user.id },
            { phone: req.user.phone || '' }
          ]
        }
      });
      if (sk) {
        where.order = { assignedShopkeeperId: sk.id };
      } else {
        return res.json([]);
      }
    } else {
      where.order = { assignedShopkeeperId: { not: null } };
    }

    const isGlobal =
      ['TENANT_OWNER', 'SUPER_ADMIN'].includes(req.user?.role) ||
      (req.user?.role === 'ADMIN' && !req.user?.warehouseId);

    if (!isGlobal && req.user?.warehouseId) {
      where.order = {
        ...where.order,
        warehouseId: req.user.warehouseId
      };
    }

    const returns = await prisma.return.findMany({
      where,
      include: {
        order: {
          include: {
            consumer: true,
            address: true,
            items: {
              include: {
                product: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const mapped = returns.map(ret => ({
      id: ret.id,
      order_id: ret.orderId,
      reason: ret.reason || 'No reason provided',
      status: ret.status.toLowerCase(),
      refund_amount: ret.refundAmount || 0,
      created_at: ret.createdAt,
      order_number: ret.order?.orderNumber,
      order_type: ret.order?.fulfillmentType === 'STORE_PICKUP' ? 'Self Pickup' : 'Home Delivery',
      payment_method: ret.order?.paymentMethod || 'COD',
      total_value: ret.order?.totalAmount,
      customer_name: ret.order?.consumer?.name || 'Customer',
      customer_phone: ret.order?.consumer?.phone || '',
      customer_address: ret.order?.address
        ? [ret.order.address.line1, ret.order.address.line2, ret.order.address.city, ret.order.address.state, ret.order.address.pincode].filter(Boolean).join(', ')
        : '',
      items: ret.order?.items.map(item => ({
        name: item.product?.name || item.productName || 'Product',
        image_url: item.productImage || item.product?.image || '',
        category: item.product?.category || '',
        quantity: item.quantity,
        price: item.unitPrice
      })) || []
    }));

    return res.json(mapped);
  } catch (error) {
    logger.error('Error in getReturns', { error: error.message });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const createReturn = async (req, res) => {
  try {
    const { order_id, reason, refund_amount } = req.body;
    const ret = await prisma.return.create({
      data: {
        orderId: order_id,
        reason,
        refundAmount: parseFloat(refund_amount) || 0,
        status: 'PENDING'
      }
    });
    return res.status(201).json(ret);
  } catch (error) {
    logger.error('Error in createReturn', { error: error.message });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const approveReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const ret = await prisma.return.update({
      where: { id },
      data: { status: 'APPROVED' }
    });
    return res.json(ret);
  } catch (error) {
    logger.error('Error in approveReturn', { error: error.message });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const rejectReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const ret = await prisma.return.update({
      where: { id },
      data: { status: 'REJECTED' }
    });
    return res.json(ret);
  } catch (error) {
    logger.error('Error in rejectReturn', { error: error.message });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getShopkeeperById = async (req, res) => {
  try {
    const { id } = req.params;
    const shopkeeper = await prisma.shopkeeper.findUnique({
      where: { id }
    });

    if (!shopkeeper) return res.status(404).json({ error: 'Shopkeeper not found' });

    const todayCompleted = await prisma.order.count({
      where: {
        assignedShopkeeperId: id,
        status: { in: ['OUT_FOR_DELIVERY', 'DELIVERED'] },
        deliveredAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });

    const orders = await prisma.order.findMany({
      where: {
        assignedShopkeeperId: id
      },
      include: {
        consumer: true,
        items: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const mappedOrders = orders.map(order => {
      const pickedCount = order.items.filter(item => item.isPicked).length;
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        fulfillmentType: order.fulfillmentType,
        status: order.status,
        trayNumber: order.trayNumber,
        customerName: order.consumer?.name || 'Customer',
        itemCount: order.items.length,
        pickedCount: pickedCount,
        createdAt: order.createdAt
      };
    });

    return res.json({
      id: shopkeeper.id,
      name: shopkeeper.name,
      employeeId: shopkeeper.employeeId,
      phone: shopkeeper.phone,
      status: shopkeeper.status,
      activeOrderCount: shopkeeper.activeOrderCount,
      orders: mappedOrders
    });
  } catch (error) {
    logger.error('Error in getShopkeeperById', { error: error.message });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getSLAReport = async (req, res) => {
  try {
    const skFilter = {};
    if (req.user && req.user.role === 'SHOPKEEPER') {
      const sk = await prisma.shopkeeper.findFirst({
        where: {
          OR: [
            { id: req.user.id },
            { phone: req.user.phone || '' }
          ]
        }
      });
      if (sk) {
        skFilter.assignedShopkeeperId = sk.id;
      } else {
        return res.json({
          breaches: [],
          summary: {
            active_breaches: 0,
            at_risk: 0,
            active_orders: 0,
            avg_fulfillment: 0
          },
          hourlyData: [],
          processingTimes: []
        });
      }
    } else {
      skFilter.assignedShopkeeperId = { not: null };
    }

    const isGlobal =
      ['TENANT_OWNER', 'SUPER_ADMIN'].includes(req.user?.role) ||
      (req.user?.role === 'ADMIN' && !req.user?.warehouseId);

    if (!isGlobal && req.user?.warehouseId) {
      skFilter.warehouseId = req.user.warehouseId;
    }

    // Fetch all relevant orders to calculate SLA properties dynamically on the backend
    const orders = await prisma.order.findMany({
      where: {
        ...skFilter
      },
      include: {
        consumer: true
      }
    });

    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Active orders logic
    // Active Orders = not yet dispatched (OUT_FOR_DELIVERY or DELIVERED) or cancelled (CANCELLED or REJECTED)
    const isActive = (o) => {
      return !['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REJECTED'].includes(o.status);
    };

    const activeOrders = orders.filter(isActive);

    let atRiskCount = 0;
    let breachedCount = 0;
    const breachesList = [];

    activeOrders.forEach((o) => {
      const acceptedAtStr = o.shopkeeperAcceptedAt || o.acceptedByShopkeeperAt;
      if (!acceptedAtStr) {
        return; // SLA hasn't started yet
      }
      const acceptedAt = new Date(acceptedAtStr).getTime();
      const elapsedMinutes = (now.getTime() - acceptedAt) / 60000;
      const slaMinutes = o.slaMinutes || 30;
      const remaining = slaMinutes - elapsedMinutes;

      if (remaining < 0) {
        breachedCount++;
        breachesList.push({
          order_number: o.orderNumber,
          customer_name: o.consumer?.name || 'Customer',
          customer_phone: o.consumer?.phone || '',
          order_type: o.fulfillmentType === 'STORE_PICKUP' ? 'Self Pickup' : 'Home Delivery',
          status: o.status,
          sla_minutes: slaMinutes,
          delay_minutes: Math.floor(-remaining)
        });
      } else if (remaining < 15) {
        atRiskCount++;
      }
    });

    // Avg fulfillment time for today's dispatched orders
    // average minutes from shopkeeper_accepted_at to dispatched_at (deliveredAt)
    const todayDispatched = orders.filter((o) => {
      const isDispatched = ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status);
      if (!isDispatched) return false;
      const dispatchTime = o.deliveredAt || o.updatedAt;
      if (!dispatchTime) return false;
      return new Date(dispatchTime).getTime() >= todayStart.getTime();
    });

    let totalFulfillmentMinutes = 0;
    let fulfillmentCount = 0;

    todayDispatched.forEach((o) => {
      const acceptedAtStr = o.shopkeeperAcceptedAt || o.acceptedByShopkeeperAt;
      const dispatchedAtStr = o.deliveredAt || o.updatedAt;
      if (acceptedAtStr && dispatchedAtStr) {
        const acceptedAt = new Date(acceptedAtStr).getTime();
        const dispatchedAt = new Date(dispatchedAtStr).getTime();
        const diffMinutes = (dispatchedAt - acceptedAt) / 60000;
        if (diffMinutes > 0) {
          totalFulfillmentMinutes += diffMinutes;
          fulfillmentCount++;
        }
      }
    });

    const avgFulfillment = fulfillmentCount > 0 ? Math.round(totalFulfillmentMinutes / fulfillmentCount) : 0;

    // hourlyData: group today's orders by hour of created_at
    const hourlyMap = {};
    const nowHour = now.getHours();
    for (let i = 5; i >= 0; i--) {
      const h = (nowHour - i + 24) % 24;
      const label = `${h.toString().padStart(2, '0')}:00`;
      hourlyMap[label] = { time: label, onTime: 0, breached: 0 };
    }

    orders.forEach((o) => {
      if (!o.createdAt) return;
      const createDate = new Date(o.createdAt);

      const diffMs = now.getTime() - createDate.getTime();
      if (diffMs < 0 || diffMs > 6 * 60 * 60 * 1000) return;

      const hourLabel = `${createDate.getHours().toString().padStart(2, '0')}:00`;
      if (hourlyMap[hourLabel]) {
        // Determine if it was breached
        const acceptedAtStr = o.shopkeeperAcceptedAt || o.acceptedByShopkeeperAt;
        let isBreached = false;
        if (acceptedAtStr) {
          const acceptedAt = new Date(acceptedAtStr).getTime();
          const dispatchedAtStr = o.deliveredAt || o.updatedAt;
          const end = dispatchedAtStr ? new Date(dispatchedAtStr).getTime() : now.getTime();
          const diffMinutes = (end - acceptedAt) / 60000;
          isBreached = diffMinutes > (o.slaMinutes || 30);
        }
        if (isBreached) {
          hourlyMap[hourLabel].breached++;
        } else {
          hourlyMap[hourLabel].onTime++;
        }
      }
    });

    // processingTimes: average picking and packing time per hour from existing timestamps
    const trendMap = {};
    for (let i = 5; i >= 0; i--) {
      const h = (nowHour - i + 24) % 24;
      const label = `${h.toString().padStart(2, '0')}:00`;
      trendMap[label] = { time: label, picking: 0, packing: 0, handover: 0, pickCount: 0, packCount: 0, handCount: 0 };
    }

    orders.forEach((o) => {
      const acceptedAtStr = o.shopkeeperAcceptedAt || o.acceptedByShopkeeperAt;
      if (!acceptedAtStr) return;
      const acceptedAt = new Date(acceptedAtStr);

      const hourLabel = `${acceptedAt.getHours().toString().padStart(2, '0')}:00`;
      if (!trendMap[hourLabel]) return;

      // 1. Picking duration
      const pickEndStr = o.pickingCompletedAt || o.packingStartedAt;
      if (pickEndStr) {
        const pickEnd = new Date(pickEndStr).getTime();
        const diff = (pickEnd - acceptedAt.getTime()) / 60000;
        if (diff > 0) {
          trendMap[hourLabel].picking += diff;
          trendMap[hourLabel].pickCount++;
        }
      }

      // 2. Packing duration
      const packEndStr = o.packingCompletedAt || o.readyAt;
      if (pickEndStr && packEndStr) {
        const pickEnd = new Date(pickEndStr).getTime();
        const packEnd = new Date(packEndStr).getTime();
        const diff = (packEnd - pickEnd) / 60000;
        if (diff > 0) {
          trendMap[hourLabel].packing += diff;
          trendMap[hourLabel].packCount++;
        }
      }

      // 3. Handover duration
      const dispatchStr = o.deliveredAt || o.updatedAt;
      const readyStr = o.readyAt || o.packingCompletedAt;
      if (dispatchStr && readyStr && ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status)) {
        const readyVal = new Date(readyStr).getTime();
        const dispVal = new Date(dispatchStr).getTime();
        const diff = (dispVal - readyVal) / 60000;
        if (diff > 0) {
          trendMap[hourLabel].handover += diff;
          trendMap[hourLabel].handCount++;
        }
      }
    });

    const processingTimes = Object.values(trendMap).map((t) => ({
      time: t.time,
      picking: t.pickCount > 0 ? Math.round(t.picking / t.pickCount) : 0,
      packing: t.packCount > 0 ? Math.round(t.packing / t.packCount) : 0,
      handover: t.handCount > 0 ? Math.round(t.handover / t.handCount) : 0,
    }));

    return res.json({
      breaches: breachesList,
      summary: {
        active_breaches: breachedCount,
        at_risk: atRiskCount,
        active_orders: activeOrders.length,
        avg_fulfillment: avgFulfillment
      },
      hourlyData: Object.values(hourlyMap),
      processingTimes
    });
  } catch (error) {
    logger.error('Error in getSLAReport', { error: error.message });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getStats = async (req, res) => {
  try {
    const skFilter = {};
    if (req.user && req.user.role === 'SHOPKEEPER') {
      const sk = await prisma.shopkeeper.findFirst({
        where: {
          OR: [
            { id: req.user.id },
            { phone: req.user.phone || '' }
          ]
        }
      });
      if (sk) {
        skFilter.assignedShopkeeperId = sk.id;
      } else {
        return res.json({
          new_orders: 0,
          accepted_orders: 0,
          picking_orders: 0,
          packing_orders: 0,
          ready_orders: 0,
          dispatched_orders: 0,
          cancelled_orders: 0,
          total_orders: 0,
          avg_fulfillment_mins: 0,
          sla_breaches: 0,
          revenue_today: 0,
          hourly: []
        });
      }
    } else {
      skFilter.assignedShopkeeperId = { not: null };
    }

    const isGlobal =
      ['TENANT_OWNER', 'SUPER_ADMIN'].includes(req.user?.role) ||
      (req.user?.role === 'ADMIN' && !req.user?.warehouseId);

    if (!isGlobal && req.user?.warehouseId) {
      skFilter.warehouseId = req.user.warehouseId;
    }

    const totalOrders = await prisma.order.count({ where: skFilter });
    const newOrders = await prisma.order.count({ where: { ...skFilter, status: { in: ['PENDING', 'PLACED'] } } });
    const acceptedOrders = await prisma.order.count({ where: { ...skFilter, status: 'CONFIRMED' } });
    const pickingOrders = await prisma.order.count({ where: { ...skFilter, status: 'PROCESSING', pickingCompletedAt: null } });
    const packingOrders = await prisma.order.count({ where: { ...skFilter, status: 'PROCESSING', pickingCompletedAt: { not: null } } });
    const readyOrders = await prisma.order.count({ where: { ...skFilter, status: 'READY_FOR_PICKUP' } });
    const dispatchedOrders = await prisma.order.count({ where: { ...skFilter, status: { in: ['OUT_FOR_DELIVERY', 'DELIVERED'] } } });
    const cancelledOrders = await prisma.order.count({ where: { ...skFilter, status: 'CANCELLED' } });

    return res.json({
      new_orders: newOrders,
      accepted_orders: acceptedOrders,
      picking_orders: pickingOrders,
      packing_orders: packingOrders,
      ready_orders: readyOrders,
      dispatched_orders: dispatchedOrders,
      cancelled_orders: cancelledOrders,
      total_orders: totalOrders,
      avg_fulfillment_mins: 12.4,
      sla_breaches: 0,
      revenue_today: 0,
      hourly: []
    });
  } catch (error) {
    logger.error('Error in getStats', { error: error.message });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getShopkeepers = async (req, res) => {
  try {
    const skFilter = {};
    const userFilter = { role: 'SHOPKEEPER', isActive: true };

    const isGlobal =
      ['TENANT_OWNER', 'SUPER_ADMIN'].includes(req.user?.role) ||
      (req.user?.role === 'ADMIN' && !req.user?.warehouseId);

    if (!isGlobal && req.user?.warehouseId) {
      skFilter.warehouseId = req.user.warehouseId;
      userFilter.warehouseId = req.user.warehouseId;
    }

    const shopkeepers = await prisma.shopkeeper.findMany({ where: skFilter });
    const users = await prisma.user.findMany({
      where: userFilter,
      select: {
        id: true,
        name: true,
        phone: true,
      }
    });

    const mergedMap = new Map();

    shopkeepers.forEach(s => {
      mergedMap.set(s.id, {
        id: s.id,
        name: s.name,
        phone: s.phone,
        status: s.status,
        activeOrderCount: s.activeOrderCount
      });
    });

    users.forEach(u => {
      const existing = mergedMap.get(u.id);
      mergedMap.set(u.id, {
        id: u.id,
        name: u.name || existing?.name || 'Unknown',
        phone: u.phone || existing?.phone || null,
        status: existing?.status || 'Available',
        activeOrderCount: existing?.activeOrderCount || 0
      });
    });

    const result = Array.from(mergedMap.values());
    return res.json(result);
  } catch (error) {
    logger.error('Error in getShopkeepers', { error: error.message });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getShopkeepersTracker = async (req, res) => {
  try {
    const skFilter = {};
    const isGlobal =
      ['TENANT_OWNER', 'SUPER_ADMIN'].includes(req.user?.role) ||
      (req.user?.role === 'ADMIN' && !req.user?.warehouseId);

    if (!isGlobal && req.user?.warehouseId) {
      skFilter.warehouseId = req.user.warehouseId;
    }

    const shopkeepers = await prisma.shopkeeper.findMany({
      where: skFilter,
      include: {
        orders: {
          where: {
            status: {
              in: ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP']
            },
            allocationStatus: { not: 'HandedOver' }
          },
          include: {
            consumer: true,
            items: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    const trackerData = shopkeepers.map(sk => {
      const activeOrder = sk.orders[0] || null;
      let orderDetails = null;

      if (activeOrder) {
        const pickedCount = activeOrder.items.filter(item => item.isPicked).length;
        orderDetails = {
          orderId: activeOrder.id,
          orderNumber: activeOrder.orderNumber,
          fulfillmentType: activeOrder.fulfillmentType,
          status: activeOrder.status,
          pickingCompletedAt: activeOrder.pickingCompletedAt,
          trayNumber: activeOrder.trayNumber,
          customerName: activeOrder.consumer?.name || 'Customer',
          itemCount: activeOrder.items.length,
          pickedCount: pickedCount
        };
      }

      return {
        id: sk.id,
        name: sk.name,
        employeeId: sk.employeeId,
        phone: sk.phone,
        status: activeOrder ? 'Busy' : 'Idle',
        activeOrder: orderDetails
      };
    });

    return res.json(trackerData);
  } catch (error) {
    logger.error('Error in getShopkeepersTracker', { error: error.message });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const allocateShopkeeper = async (req, res) => {
  try {
    const { id } = req.params;
    const { shopkeeperId } = req.body;

    if (!shopkeeperId) {
      const order = await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL "app.manual_assign" = 'true'`);
        const updated = await tx.order.update({
          where: { id },
          data: {
            assignedShopkeeperId: null,
            allocationStatus: null,
            allocationStartedAt: null
          },
        });
        try {
          await tx.orderStatusHistory.create({
            data: {
              orderId: id,
              fromStatus: updated.status || 'ALLOCATED',
              toStatus: updated.status || 'PLACED',
              reason: 'Shopkeeper unallocated',
              notes: 'Shopkeeper assignment removed',
              changedBy: req.user?.name || req.user?.id || 'Partner'
            }
          });
        } catch (e) { }
        return updated;
      });
      return res.json({ message: 'Shopkeeper unallocated successfully', order });
    }

    // Ensure target is a valid registered shopkeeper — do NOT auto-create for PARTNER/ADMIN users
    const existingShopkeeper = await prisma.shopkeeper.findUnique({
      where: { id: shopkeeperId }
    });
    if (!existingShopkeeper) {
      return res.status(400).json({
        error: 'Cannot allocate to this user. They are not a registered shopkeeper. Only Nisha1 or Nisha2 can be allocated.'
      });
    }

    const order = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL "app.manual_assign" = 'true'`);
      const updated = await tx.order.update({
        where: { id },
        data: {
          assignedShopkeeperId: shopkeeperId,
          allocationStatus: 'Pending',
          allocationStartedAt: new Date()
        },
      });

      const skName = existingShopkeeper?.name || (await tx.shopkeeper.findUnique({ where: { id: shopkeeperId }, select: { name: true } }))?.name || shopkeeperId;
      try {
        await tx.orderStatusHistory.create({
          data: {
            orderId: id,
            fromStatus: updated.status || 'PLACED',
            toStatus: 'ALLOCATED',
            reason: `Allocated to Shopkeeper (${skName})`,
            notes: `Assigned to ${skName}`,
            changedBy: req.user?.name || req.user?.id || 'Partner'
          }
        });
      } catch (e) {
        logger.error('Failed to log allocation to orderStatusHistory', { error: e.message });
      }

      return updated;
    });

    return res.json({ message: 'Allocated to shopkeeper successfully', order });
  } catch (error) {
    logger.error('Error in allocateShopkeeper', { error: error.message });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getActiveDeliveryAgents = async (req, res) => {
  try {
    let warehouseId = req.user.warehouseId;

    if (!warehouseId) {
      // Fallback: Check if they exist in the Shopkeeper table
      const orConditions = [{ id: req.user.id }];
      if (req.user.phone) orConditions.push({ phone: req.user.phone });
      const sk = await prisma.shopkeeper.findFirst({
        where: { OR: orConditions }
      });
      warehouseId = sk?.warehouseId;
    }

    if (!warehouseId && req.user.phone) {
      // Fallback: Check if they exist in the User table as a Partner
      const user = await prisma.user.findFirst({
        where: { phone: req.user.phone, role: 'PARTNER' }
      });
      warehouseId = user?.warehouseId;
    }

    let agents = [];
    if (warehouseId) {
      agents = await prisma.user.findMany({
        where: {
          warehouseId,
          role: { in: ['DELIVERY_AGENT', 'VEHICLE_AGENT'] },
          isActive: true
        },
        select: {
          id: true,
          name: true,
          phone: true,
          role: true,
          isOnline: true,
          avatar: true,
          _count: {
            select: {
              agentOrders: {
                where: { status: { in: ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'] } }
              }
            }
          }
        },
        orderBy: [
          { isOnline: "desc" },
          { name: "asc" }
        ]
      });
    }

    if (agents.length === 0) {
      // Fallback: fetch all active delivery/vehicle agents if warehouse match is empty
      agents = await prisma.user.findMany({
        where: {
          role: { in: ['DELIVERY_AGENT', 'VEHICLE_AGENT'] },
          isActive: true
        },
        select: {
          id: true,
          name: true,
          phone: true,
          role: true,
          isOnline: true,
          avatar: true,
          _count: {
            select: {
              agentOrders: {
                where: { status: { in: ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'] } }
              }
            }
          }
        },
        orderBy: [
          { isOnline: "desc" },
          { name: "asc" }
        ]
      });
    }

    const maxActiveOrders = parseInt(process.env.MAX_ACTIVE_ORDERS || '50', 10);
    const eligibleAgents = agents.filter((agent) => (agent._count?.agentOrders || 0) < maxActiveOrders);

    const mappedAgents = eligibleAgents.map((agent) => {
      const { _count, ...rest } = agent;
      return rest;
    });

    return res.json(mappedAgents);
  } catch (error) {
    logger.error('Error in getActiveDeliveryAgents', { error: error.message });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const assignRider = async (req, res) => {
  try {
    const { id } = req.params;
    const { agentId } = req.body;

    if (!id || !agentId) {
      return res.status(400).json({ error: 'Order ID and Agent ID are required' });
    }

    // 1. Fetch current order to check previous assignment, warehouse, orderNumber
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        agentId: true,
        warehouseId: true,
        totalAmount: true,
        status: true,
      }
    });

    if (!existingOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const previousAgentId = existingOrder.agentId;
    const isReassign = Boolean(previousAgentId && previousAgentId !== agentId);

    // If changing rider, notify the previous rider that the order has been reassigned/cancelled
    if (isReassign) {
      try {
        const io = getIO();
        const cancelPayload = {
          orderId: id,
          orderNumber: existingOrder.orderNumber,
          reason: 'REASSIGNED',
          message: `Order #${existingOrder.orderNumber || id} was reassigned to another delivery partner.`
        };
        if (io) {
          io.of('/delivery').to(`user:${previousAgentId}`).emit('delivery:offer_cancelled', cancelPayload);
          io.of('/delivery').to(`agent:${previousAgentId}`).emit('delivery:offer_cancelled', cancelPayload);
          io.to(`user:${previousAgentId}`).emit('delivery:offer_cancelled', cancelPayload);
        }
        notifyDeliveryAgentOrderCancelled(prisma, previousAgentId, {
          orderId: id,
          orderNumber: existingOrder.orderNumber,
          reason: 'REASSIGNED'
        }).catch(() => {});
      } catch (prevErr) {
        logger.warn('[Shopkeeper Assign] Failed to notify previous rider of re-assignment', { error: prevErr.message });
      }
    }

    // Find agent's active vehicle assignment to link vehicleId and routeId
    const activeAssignment = await prisma.routeAssignment.findFirst({
      where: { userId: agentId, status: true }
    });

    const order = await prisma.order.update({
      where: { id },
      data: {
        agentId: agentId,
        assignedAt: new Date(),
        ...(activeAssignment?.vehicleId ? { vehicleId: activeAssignment.vehicleId } : {}),
        ...(activeAssignment?.routeId ? { routeId: activeAssignment.routeId } : {})
      },
      include: {
        warehouse: {
          select: { id: true, name: true, address: true, location: true }
        },
        address: {
          select: { line1: true, line2: true, city: true, pincode: true }
        },
        consumer: {
          select: { name: true, phone: true }
        }
      }
    });

    // Also keep the Delivery record in sync so the order shows in the rider's app
    await prisma.delivery.upsert({
      where: { orderId: id },
      update: { agentId, status: 'ASSIGNED', assignedAt: new Date() },
      create: { orderId: id, agentId, status: 'ASSIGNED', assignedAt: new Date() }
    });

    // Sync with Delivery API
    const syncKey = process.env.DELIVERY_API_SYNC_KEY || "";
    const DELIVERY_API_BASE_URL = (
      process.env.DELIVERY_API_BASE_URL || "http://localhost:3003/api/v1"
    ).replace(/\/$/, "");
    try {
      const deliveryPayload = {
        orderId: id,
        status: "ASSIGNED_TO_AGENT",
        assignedAgentId: agentId,
        actorUserId: (req.user && req.user.id) ? req.user.id : "00000000-0000-0000-0000-000000000000",
        actorRole: "PARTNER",
      };
      const fullUrl = `${DELIVERY_API_BASE_URL}/order/order-status`;
      logger.info(`[Shopkeeper Assign] Syncing assignment to Delivery API: ${fullUrl}`);
      const response = await fetch(fullUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-internal-sync-key": syncKey
        },
        body: JSON.stringify(deliveryPayload)
      });
      const resText = await response.text();
      logger.info(`[Shopkeeper Assign] Delivery API response: ${response.status} ${resText}`);
    } catch (syncError) {
      logger.error('Error syncing assignment to Delivery API', { error: syncError.message });
    }

    const dropAddress = order.address
      ? [order.address.line1, order.address.line2, order.address.city, order.address.pincode].filter(Boolean).join(', ')
      : 'Customer address';
    const pickupAddress = order.warehouse?.address || order.warehouse?.name || 'Warehouse';

    const assignmentPayload = {
      id: order.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      agentId,
      warehouseId: order.warehouseId,
      pickupAddress,
      warehouseAddress: pickupAddress,
      dropAddress,
      deliveryCharge: Number(order.deliveryCharge) || 0,
      totalAmount: Number(order.totalAmount) || 0,
      customerName: order.consumer?.name || 'Customer',
      customerPhone: order.consumer?.phone || 'N/A',
      radiusKm: 1000,
      broadcastedAt: new Date().toISOString(),
      status: order.status,
      assignedAt: order.assignedAt ? order.assignedAt.toISOString() : new Date().toISOString(),
      reassigned: isReassign,
      assigned: true,
      isDirectAssignment: true,
      assignedToMe: true,
      title: "New order assigned 🚚",
      message: `Order #${order.orderNumber || id} assigned to you.`,
    };

    // 1. Direct Local Socket.IO emission to the assigned rider (both /delivery and root namespaces)
    try {
      const io = getIO();
      if (io) {
        // Delivery namespace: emit request_offer, order_offer, fast_delivery_alert to trigger the popup modal!
        io.of('/delivery').to(`user:${agentId}`).emit('delivery:request_offer', assignmentPayload);
        io.of('/delivery').to(`agent:${agentId}`).emit('delivery:request_offer', assignmentPayload);
        io.of('/delivery').to(`user:${agentId}`).emit('delivery:order_offer', assignmentPayload);
        io.of('/delivery').to(`agent:${agentId}`).emit('delivery:order_offer', assignmentPayload);
        io.of('/delivery').to(`user:${agentId}`).emit('delivery:fast_delivery_alert', assignmentPayload);
        io.of('/delivery').to(`agent:${agentId}`).emit('delivery:fast_delivery_alert', assignmentPayload);

        // Delivery namespace: emit new_assignment and order_assigned
        io.of('/delivery').to(`user:${agentId}`).emit('delivery:new_assignment', assignmentPayload);
        io.of('/delivery').to(`agent:${agentId}`).emit('delivery:new_assignment', assignmentPayload);
        io.of('/delivery').to(`user:${agentId}`).emit('delivery:order_assigned', assignmentPayload);
        io.of('/delivery').to(`agent:${agentId}`).emit('delivery:order_assigned', assignmentPayload);
        io.of('/delivery').to(`user:${agentId}`).emit('delivery:notification', assignmentPayload);

        // Root namespace: emit to user room
        io.to(`user:${agentId}`).emit('delivery:request_offer', assignmentPayload);
        io.to(`user:${agentId}`).emit('delivery:order_offer', assignmentPayload);
        io.to(`user:${agentId}`).emit('delivery:new_assignment', assignmentPayload);
        io.to(`user:${agentId}`).emit('delivery:order_assigned', assignmentPayload);
        io.to(`user:${agentId}`).emit('order:assigned', assignmentPayload);
        io.to(`user:${agentId}`).emit('notification', {
          title: "New order assigned 🚚",
          message: `Order #${order.orderNumber || id} assigned to you.`,
          type: "DELIVERY_ASSIGNED",
          priority: "high",
          metadata: assignmentPayload,
          createdAt: new Date().toISOString(),
          isRead: false
        });

        // Store/warehouse rooms: dismiss any active 120s unassigned alert popup in partner/shopkeeper UI
        if (order.warehouseId) {
          io.to(`store:${order.warehouseId}`).emit('delivery:assigned', assignmentPayload);
          io.to(`warehouse:${order.warehouseId}`).emit('delivery:assigned', assignmentPayload);
          io.of('/partner').to(`warehouse:${order.warehouseId}`).emit('partner:delivery_assigned', assignmentPayload);
        }

        logger.info(`[Shopkeeper Assign] Emitted real-time assignment sockets (request_offer, new_assignment, order_assigned) for order ${order.orderNumber} to agent ${agentId}`);
      }
    } catch (sockErr) {
      logger.warn('[Shopkeeper Assign] Local socket emission failed', { error: sockErr.message });
    }

    // 2. Persist in-app notification in DB for the delivery agent
    try {
      await prisma.notification.create({
        data: {
          userId: agentId,
          type: 'DELIVERY_ASSIGNED',
          title: 'New order assigned 🚚',
          message: `Order #${order.orderNumber || id} assigned to you.`,
          channel: ['IN_APP', 'PUSH'],
          isRead: false,
          data: assignmentPayload,
        }
      });
      logger.info(`[Shopkeeper Assign] In-app notification persisted for agent ${agentId}`);
    } catch (notifErr) {
      logger.warn('[Shopkeeper Assign] Failed to create in-app notification in DB', { error: notifErr.message });
    }

    // 3. Send high-priority Push Notification (FCM) to the rider's phone
    try {
      await notifyDeliveryAgentOrderAssigned(prisma, agentId, {
        orderId: id,
        orderNumber: order.orderNumber,
      });
      logger.info(`[Shopkeeper Assign] Push notification dispatched to agent ${agentId}`);
    } catch (pushErr) {
      logger.warn('[Shopkeeper Assign] Push notification failed', { error: pushErr.message });
    }

    // 4. Cross-service fanout
    await emitToDeliveryApp(id, agentId, assignmentPayload);

    // Cancel any active auto-assign broadcast since it was manually assigned
    try {
      await cancelDeliveryBroadcast(id, agentId, true);
    } catch (cancelErr) {
      logger.error('Error cancelling broadcast on manual assignment', { error: cancelErr.message });
    }

    return res.json({ message: 'Rider assigned successfully', order });
  } catch (error) {
    logger.error('Error in assignRider', { error: error.message });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const handoverOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;

    const currentOrder = await prisma.order.findFirst({
      where: {
        OR: [
          { id },
          { orderNumber: id }
        ]
      }
    });
    if (!currentOrder) return res.status(404).json({ error: 'Order not found' });
    const orderId = currentOrder.id;

    if (otp) {
      const cleanOtp = String(otp).trim();
      const now = new Date();
      let isValid = false;

      if (currentOrder.otp && String(currentOrder.otp).trim() === cleanOtp) {
        if (!currentOrder.otpExpiresAt || new Date(currentOrder.otpExpiresAt) >= now) {
          isValid = true;
        } else {
          return res.status(400).json({ success: false, message: 'Pickup OTP expired' });
        }
      }

      if (!isValid) {
        const pepper = process.env.ORDER_OTP_PEPPER || 'dev-order-otp-pepper-change-me';
        const otpHash = crypto.createHash('sha256').update(`${pepper}:${cleanOtp}`, 'utf8').digest('hex');
        const activeOrderOtp = await prisma.orderOtp.findFirst({
          where: { orderId, type: 'PICKUP', isVerified: false, expiresAt: { gt: now } }
        });
        if (activeOrderOtp && activeOrderOtp.otpHash === otpHash) {
          isValid = true;
          await prisma.orderOtp.update({ where: { id: activeOrderOtp.id }, data: { isVerified: true } });
        }
      }

      if (!isValid) {
        return res.status(400).json({ success: false, message: 'Invalid Pickup OTP' });
      }
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        allocationStatus: 'HandedOver',
        status: 'OUT_FOR_DELIVERY',
        pickedUpAt: new Date()
      }
    });

    await prisma.delivery.updateMany({
      where: { orderId },
      data: {
        status: 'OUT_FOR_DELIVERY',
        pickedUpAt: new Date()
      }
    });

    let sk = null;
    if (req.user && req.user.role === 'SHOPKEEPER') {
      sk = await prisma.shopkeeper.findFirst({
        where: {
          OR: [
            { id: req.user.id },
            { phone: req.user.phone || '' }
          ]
        }
      });
    } else if (order.assignedShopkeeperId) {
      sk = await prisma.shopkeeper.findUnique({
        where: { id: order.assignedShopkeeperId }
      });
    }

    if (sk) {
      const activeCount = await prisma.order.count({
        where: {
          assignedShopkeeperId: sk.id,
          status: { in: ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP'] },
          allocationStatus: { not: 'HandedOver' }
        }
      });

      const newStatus = activeCount > 0 ? "Busy" : "Available";
      await prisma.shopkeeper.update({
        where: { id: sk.id },
        data: { status: newStatus }
      });
    }

    await emitCanonicalEvent({
      eventName: CANONICAL_EVENTS.orderStatusChanged,
      eventId: `PARTNER_ORDER_HANDOVER:${orderId}`,
      entityType: "ORDER",
      entityId: orderId,
      action: "ALLOCATION_CHANGED",
      payload: mapDbToFe(order)
    });

    return res.json({ success: true, order: mapDbToFe(order) });
  } catch (error) {
    logger.error('Error in handoverOrder', { error: error.message });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getOrGeneratePickupOtp = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }]
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        otp: true,
        otpExpiresAt: true,
        agentId: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const now = new Date();

    // Collect currently active OTPs in the database to guarantee uniqueness across all concurrent orders
    const activeOrdersWithOtp = await prisma.order.findMany({
      where: {
        status: { in: ['CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'] },
        otp: { not: null }
      },
      select: { otp: true }
    });

    const usedOtps = new Set(activeOrdersWithOtp.map(o => o.otp).filter(Boolean));
    if (order.otp) usedOtps.add(order.otp);

    // If an active, non-expired OTP already exists and regenerate is not explicitly requested, return existing OTP
    const forceRegenerate = req.query.regenerate === 'true';
    if (!forceRegenerate && order.otp && order.otpExpiresAt && new Date(order.otpExpiresAt) > now) {
      return res.json({
        success: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        otp: order.otp,
        pickupOtp: order.otp
      });
    }

    // Always generate a fresh unique 6-digit OTP
    let newOtp;
    let attempts = 0;
    do {
      newOtp = crypto.randomInt(100000, 1000000).toString();
      attempts++;
    } while (usedOtps.has(newOtp) && attempts < 100);

    const otp = newOtp;
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours validity

    const pepper = process.env.ORDER_OTP_PEPPER || 'dev-order-otp-pepper-change-me';
    const otpHash = crypto.createHash('sha256').update(`${pepper}:${otp}`, 'utf8').digest('hex');

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          otp,
          otpExpiresAt: expiresAt
        }
      });

      await tx.orderOtp.updateMany({
        where: { orderId: order.id, type: 'PICKUP', isVerified: false },
        data: { isVerified: true }
      });

      await tx.orderOtp.create({
        data: {
          orderId: order.id,
          type: 'PICKUP',
          otpHash,
          expiresAt,
          attempts: 0,
          resendCount: 0,
          lastSentAt: now
        }
      });
    });

    logger.info('Unique pickup OTP generated', { orderId: order.id, orderNumber: order.orderNumber, otp });

    return res.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      otp,
      pickupOtp: otp
    });
  } catch (error) {
    logger.error('Error in getOrGeneratePickupOtp', { error: error.message });
    return res.status(500).json({ error: 'Failed to retrieve or generate pickup OTP' });
  }
};

// ─── SLA Configuration ───────────────────────────────────────────────────────

/**
 * Resolves the warehouseId for the current user.
 * For SHOPKEEPER role: looks up the Shopkeeper record by user id/phone.
 * For admin/partner roles: uses req.user.warehouseId directly.
 */
async function resolveWarehouseId(req) {
  if (req.user?.role === 'SHOPKEEPER') {
    const sk = await prisma.shopkeeper.findFirst({
      where: {
        OR: [
          { id: req.user.id },
          { phone: req.user.phone || '' }
        ]
      }
    });
    return sk?.warehouseId || null;
  }
  // Admin, Partner, Tenant owner, etc.
  return req.user?.warehouseId || null;
}

/**
 * GET /shopkeeper/sla-config
 * Returns the SLA config for the requesting user's warehouse.
 * Falls back to default 1800 seconds (30 min) if not configured.
 */
export const getSlaConfig = async (req, res) => {
  try {
    if (req.user?.role === 'SHOPKEEPER') {
      return res.status(403).json({ error: 'Access denied: SLA configuration is for admin/partner only' });
    }

    const warehouseId = await resolveWarehouseId(req);

    if (!warehouseId) {
      return res.status(400).json({ error: 'No warehouse associated with this account' });
    }

    const slaConfig = await prisma.warehouseSlaConfig.findUnique({
      where: { warehouseId }
    });

    const slaSeconds = slaConfig?.slaSeconds ?? 1800;
    return res.json({
      warehouseId,
      slaSeconds,
      hours: Math.floor(slaSeconds / 3600),
      minutes: Math.floor((slaSeconds % 3600) / 60)
    });
  } catch (error) {
    logger.error('Error in getSlaConfig', { error: error.message });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * PUT /shopkeeper/sla-config
 * Body: { hours: number, minutes: number }
 * Validates and upserts the SLA config for the requesting user's warehouse.
 */
export const upsertSlaConfig = async (req, res) => {
  try {
    if (req.user?.role === 'SHOPKEEPER') {
      return res.status(403).json({ error: 'Access denied: SLA configuration is for admin/partner only' });
    }

    const { hours, minutes } = req.body;

    // Validate
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);

    if (isNaN(h) || isNaN(m)) {
      return res.status(400).json({ error: 'Hours and Minutes must be valid numbers' });
    }
    if (h < 0 || h > 24) {
      return res.status(400).json({ error: 'Hours must be between 0 and 24' });
    }
    if (m < 0 || m > 59) {
      return res.status(400).json({ error: 'Minutes must be between 0 and 59' });
    }
    const slaSeconds = h * 3600 + m * 60;
    if (slaSeconds <= 0) {
      return res.status(400).json({ error: 'Total SLA duration must be greater than zero' });
    }

    const warehouseId = await resolveWarehouseId(req);
    if (!warehouseId) {
      return res.status(400).json({ error: 'No warehouse associated with this account' });
    }

    const config = await prisma.warehouseSlaConfig.upsert({
      where: { warehouseId },
      create: { warehouseId, slaSeconds },
      update: { slaSeconds }
    });

    logger.info('SLA config updated', { warehouseId, slaSeconds, by: req.user?.id });

    return res.json({
      warehouseId: config.warehouseId,
      slaSeconds: config.slaSeconds,
      hours: Math.floor(config.slaSeconds / 3600),
      minutes: Math.floor((config.slaSeconds % 3600) / 60)
    });
  } catch (error) {
    logger.error('Error in upsertSlaConfig', { error: error.message });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getUnassignedDeliveryAlerts = async (req, res) => {
  try {
    const userRole = (req.user?.role || '').toUpperCase();
    const isSuperAdmin = ['SUPER_ADMIN', 'ADMIN', 'OPERATIONAL_ADMIN', 'OPS_ADMIN'].includes(userRole);
    const isPartnerOrShopkeeper =
      isSuperAdmin ||
      userRole.includes('PARTNER') ||
      userRole.includes('SHOPKEEPER') ||
      ['OWNER', 'MANAGER', 'STAFF'].includes(userRole);

    // Only Partner and Shopkeeper (or Admin) roles should receive unassigned delivery alerts
    if (!isPartnerOrShopkeeper) {
      return res.json([]);
    }

    let warehouseId = req.user?.warehouseId || req.query.store_id || req.query.warehouseId;

    if (!warehouseId && req.user?.id) {
      const u = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { warehouseId: true },
      }).catch(() => null);
      if (u?.warehouseId) {
        warehouseId = u.warehouseId;
      } else {
        const orConditions = [{ id: req.user.id }];
        if (req.user.phone) orConditions.push({ phone: req.user.phone });
        const sk = await prisma.shopkeeper.findFirst({ where: { OR: orConditions } }).catch(() => null);
        warehouseId = sk?.warehouseId;
      }
    }

    // Non-super-admins MUST be scoped to their specific warehouse
    if (!isSuperAdmin && !warehouseId) {
      return res.json([]);
    }

    const timeoutSeconds = parseInt(process.env.DELIVERY_UNASSIGNED_TIMEOUT_SECONDS || '120', 10);
    const now = Date.now();
    const cutoff = new Date(now - timeoutSeconds * 1000); // at least 120s ago
    const minTime = new Date(now - 24 * 60 * 60 * 1000); // within last 24 hours

    const orders = await prisma.order.findMany({
      where: {
        ...(warehouseId ? { warehouseId } : {}),
        agentId: null,
        status: { in: ['PLACED', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP'] },
        createdAt: {
          lte: cutoff,
          gte: minTime,
        },
      },
      select: {
        id: true,
        orderNumber: true,
        warehouseId: true,
        deliveryType: true,
        totalAmount: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const mapped = orders.map((o) => ({
      orderId: o.id,
      orderNumber: o.orderNumber,
      warehouseId: o.warehouseId,
      deliveryType: o.deliveryType || 'FAST',
      status: o.status,
      totalAmount: Number(o.totalAmount || 0),
      timeoutSeconds,
      title: 'Delivery Partner Not Assigned',
      message: `This order has not been accepted by any delivery partner within ${timeoutSeconds} seconds. Please check the order and arrange delivery.`,
      timestamp: o.createdAt.toISOString(),
    }));

    return res.json(mapped);
  } catch (err) {
    logger.error('Error fetching unassigned delivery alerts', { error: err.message });
    return res.status(500).json({ error: 'Failed to fetch unassigned alerts' });
  }
};

