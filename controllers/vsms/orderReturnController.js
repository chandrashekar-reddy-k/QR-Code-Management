import { prisma } from '../../config/prismaClient.js';
import { sendNotification } from '../services/notificationService.js';
import { logActivity } from '../utils/activityLogger.js';
import { format } from 'date-fns';
import { recalculateDailySummary, broadcastCashUpdate } from './cashController.js';
import { InventoryCache } from '../../utils/cacheHelper.js';

import crypto from 'crypto';

// ─── HELPER: Check if session is frozen ───────────────────────────────
async function isSessionFrozen(tenantId, storeId, agentId) {
  const dateString = format(new Date(), 'yyyy-MM-dd');
  const session = await prisma.sessionSales.findFirst({
    where: { tenantId, storeId, date: dateString, agentId, isFrozen: true }
  });
  return !!session;
}

// ─── HELPER: Map product image from images array for frontend compatibility ─
function formatOrderProductImage(order) {
  if (!order) return order;
  if (Array.isArray(order.items)) {
    order.items.forEach(it => {
      if (it.product) {
        it.product.image = it.product.images?.[0] || null;
      }
    });
  }
  return order;
}

// ─── HELPER: Restore stock to POS channels (ChannelInventory, PosStoreStock, Product, UnifiedInventory) ─
async function restorePOSStock(tx, { productId, productVariantId = null, quantity, storeId, tenantId, unitPrice = 0 }) {
  const targetStoreId = storeId || null;

  // 1. ChannelInventory (channel: 'POS_STORE')
  const existingChannelInv = await tx.channelInventory.findFirst({
    where: {
      productId,
      channel: 'POS_STORE',
      ...(productVariantId ? { productVariantId } : {}),
      ...(targetStoreId ? { warehouseId: targetStoreId } : {})
    }
  }) || await tx.channelInventory.findFirst({
    where: {
      productId,
      channel: 'POS_STORE',
      ...(productVariantId ? { productVariantId } : {})
    }
  });

  if (existingChannelInv) {
    await tx.channelInventory.update({
      where: { id: existingChannelInv.id },
      data: { quantity: { increment: quantity } }
    });
  } else if (targetStoreId) {
    await tx.channelInventory.create({
      data: {
        id: crypto.randomUUID(),
        channel: 'POS_STORE',
        warehouseId: targetStoreId,
        productId,
        productVariantId: productVariantId || null,
        quantity,
        channelPrice: unitPrice || 0,
        isActive: true
      }
    });
  }

  // 2. PosStoreStock (Counter Stock)
  if (tx.posStoreStock) {
    const existingPosStock = await tx.posStoreStock.findFirst({
      where: { productId }
    });

    if (existingPosStock) {
      await tx.posStoreStock.update({
        where: { id: existingPosStock.id },
        data: { posStock: { increment: quantity } }
      });
    } else {
      await tx.posStoreStock.create({
        data: {
          id: crypto.randomUUID(),
          productId,
          warehouseId: targetStoreId,
          posStock: quantity,
          isPosEnabled: true
        }
      }).catch(() => {});
    }
  }

  // 3. Product.stock
  await tx.product.update({
    where: { id: productId },
    data: { stock: { increment: quantity } }
  });

  // 4. ProductVariant.stockQuantity (if variant)
  if (productVariantId) {
    await tx.productVariant.update({
      where: { id: productVariantId },
      data: { stockQuantity: { increment: quantity } }
    }).catch(() => {});
  }

  // 5. UnifiedInventory (Warehouse / Store level inventory)
  const wi = await tx.unifiedInventory.findFirst({
    where: {
      productId,
      ...(productVariantId ? { productVariantId } : {}),
      ...(targetStoreId ? {
        location: {
          OR: [
            { warehouseId: targetStoreId },
            { storeId: targetStoreId }
          ]
        }
      } : {})
    }
  }) || await tx.unifiedInventory.findFirst({
    where: {
      productId,
      ...(productVariantId ? { productVariantId } : {})
    }
  });

  if (wi) {
    await tx.unifiedInventory.update({
      where: { id: wi.id },
      data: {
        onHand: { increment: quantity },
        available: { increment: quantity }
      }
    });
  }
}

// ─── HELPER: Invalidate POS and inventory cache prefixes ───────────────
async function invalidatePOSAndInventoryCaches(vehicleId = null) {
  try {
    await InventoryCache.invalidatePrefix('vsms:inventory:');
    await InventoryCache.invalidatePrefix('vsms:items:');
    await InventoryCache.invalidatePrefix('vsms:products:');
    await InventoryCache.invalidatePrefix('vsms:catalog:');
    if (vehicleId) {
      await InventoryCache.invalidatePrefix(`vsms:inventory:vehicle:${vehicleId}`);
    }
  } catch (err) {
    console.warn('[Cache Invalidation Warning]:', err.message);
  }
}

// @desc    Edit order item quantity (before session close)
// @route   PUT /api/orders/:orderId/items/:itemId
// @access  Private
export const editOrderItem = async (req, res, next) => {
  try {
    const { orderId, itemId } = req.params;
    const { quantity } = req.body;
    const tenantId = req.user.tenantId;

    if (!quantity || quantity < 1) {
      res.status(400);
      throw new Error('Quantity must be at least 1');
    }

    // Check session freeze
    if (await isSessionFrozen(tenantId, req.user.storeId, req.user.id)) {
      res.status(403);
      throw new Error('Session is closed. No edits allowed.');
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });

    if (!order) { res.status(404); throw new Error('Order not found'); }
    if (order.status === 'CANCELLED') { res.status(400); throw new Error('Cannot edit cancelled order'); }

    const item = order.items.find(i => i.id === itemId);
    if (!item) { res.status(404); throw new Error('Order item not found'); }

    const itemPrice = Number(item.unitPrice ?? item.price ?? (item.totalPrice && item.quantity ? item.totalPrice / item.quantity : 0)) || 0;
    const qtyDiff = quantity - item.quantity;
    const amountDiff = qtyDiff * itemPrice;

    // If increasing qty, check stock
    if (qtyDiff > 0 && order.vehicleId) {
      const stock = await prisma.vehicleStock.findUnique({
        where: { vehicleId_productId: { vehicleId: order.vehicleId, productId: item.productId } }
      });
      if (!stock || stock.quantity < qtyDiff) {
        res.status(400);
        throw new Error(`Insufficient stock. Available: ${stock?.quantity || 0}`);
      }
    } else if (qtyDiff > 0 && !order.vehicleId) {
      // POS sale — check Product.stock
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (product && product.stock < qtyDiff) {
        res.status(400);
        throw new Error(`Insufficient store stock. Available: ${product.stock}`);
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update order item
      await tx.orderItem.update({
        where: { id: itemId },
        data: { quantity }
      });

      // Update order total
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { totalAmount: { increment: amountDiff } },
        include: { items: { include: { product: { select: { id: true, name: true, images: true } } } }, payment: true, returns: true }
      });

      // Adjust stock if order was completed
      if (order.status === 'COMPLETED' && order.vehicleId && qtyDiff !== 0) {
        await tx.vehicleStock.upsert({
          where: { vehicleId_productId: { vehicleId: order.vehicleId, productId: item.productId } },
          update: { quantity: { decrement: qtyDiff } },
          create: {
            vehicleId: order.vehicleId,
            productId: item.productId,
            quantity: -qtyDiff,
            tenantId,
            storeId: req.user.storeId || null
          }
        });
      } else if (order.status === 'COMPLETED' && !order.vehicleId && qtyDiff !== 0) {
        const targetStoreId = order.warehouseId || order.storeId || req.user.storeId || req.user.warehouseId;
        if (qtyDiff < 0) {
          // Quantity reduced — return items to POS stock
          await restorePOSStock(tx, {
            productId: item.productId,
            productVariantId: item.productVariantId,
            quantity: Math.abs(qtyDiff),
            storeId: targetStoreId,
            tenantId,
            unitPrice: item.unitPrice || item.price || 0
          });
        } else {
          // Quantity increased — decrement POS stock
          const existingPosInv = await tx.channelInventory.findFirst({
            where: {
              productId: item.productId,
              channel: 'POS_STORE',
              ...(item.productVariantId ? { productVariantId: item.productVariantId } : {}),
              ...(targetStoreId ? { warehouseId: targetStoreId } : {})
            }
          }) || await tx.channelInventory.findFirst({
            where: {
              productId: item.productId,
              channel: 'POS_STORE',
              ...(item.productVariantId ? { productVariantId: item.productVariantId } : {})
            }
          });
          if (existingPosInv) {
            await tx.channelInventory.update({
              where: { id: existingPosInv.id },
              data: { quantity: { decrement: qtyDiff } }
            });
          }
          if (tx.posStoreStock) {
            await tx.posStoreStock.updateMany({
              where: { productId: item.productId },
              data: { posStock: { decrement: qtyDiff } }
            }).catch(() => {});
          }
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: qtyDiff } }
          });
          if (item.productVariantId) {
            await tx.productVariant.update({
              where: { id: item.productVariantId },
              data: { stockQuantity: { decrement: qtyDiff } }
            }).catch(() => {});
          }
          const wi = await tx.unifiedInventory.findFirst({
            where: {
              productId: item.productId,
              ...(item.productVariantId ? { productVariantId: item.productVariantId } : {}),
              ...(targetStoreId ? {
                location: {
                  OR: [
                    { warehouseId: targetStoreId },
                    { storeId: targetStoreId }
                  ]
                }
              } : {})
            }
          }) || await tx.unifiedInventory.findFirst({
            where: {
              productId: item.productId,
              ...(item.productVariantId ? { productVariantId: item.productVariantId } : {})
            }
          });
          if (wi) {
            await tx.unifiedInventory.update({
              where: { id: wi.id },
              data: {
                onHand: { decrement: qtyDiff },
                available: { decrement: qtyDiff }
              }
            });
          }
        }
      }

      // Update payment if exists
      if (order.payment) {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: { amount: { increment: amountDiff } }
        });
      }

      return formatOrderProductImage(updatedOrder);
    });

    logActivity({
      userId: req.user.id, tenantId, storeId: req.user.storeId,
      action: 'ORDER_ITEM_EDITED',
      details: `Edited qty of item in order #${order.displayId} from ${item.quantity} to ${quantity}`,
      metadata: { orderId, itemId, oldQty: item.quantity, newQty: quantity, amountDiff }
    });

    sendNotification({
      roles: ['ADMIN'],
      title: 'Order Item Edited',
      message: `Order #${order.displayId} item qty changed (${item.quantity} → ${quantity}).`,
      type: 'sales', priority: 'medium',
      metadata: { orderId, itemId }
    });

    await invalidatePOSAndInventoryCaches(order.vehicleId);

    res.json(result);
  } catch (error) {
    console.error('[Edit Order Item Error]:', error);
    next(error);
  }
};

// @desc    Remove item from order (before session close)
// @route   DELETE /api/orders/:orderId/items/:itemId
// @access  Private
export const removeOrderItem = async (req, res, next) => {
  try {
    const { orderId, itemId } = req.params;
    const tenantId = req.user.tenantId;

    if (await isSessionFrozen(tenantId, req.user.storeId, req.user.id)) {
      res.status(403);
      throw new Error('Session is closed. No edits allowed.');
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payment: true }
    });

    if (!order) { res.status(404); throw new Error('Order not found'); }
    if (order.status === 'CANCELLED') { res.status(400); throw new Error('Cannot edit cancelled order'); }
    if (order.items.length <= 1) { res.status(400); throw new Error('Cannot remove last item. Cancel order instead.'); }

    const item = order.items.find(i => i.id === itemId);
    if (!item) { res.status(404); throw new Error('Order item not found'); }

    const itemPrice = Number(item.unitPrice ?? item.price ?? (item.totalPrice && item.quantity ? item.totalPrice / item.quantity : 0)) || 0;
    const itemTotal = itemPrice * item.quantity;

    const result = await prisma.$transaction(async (tx) => {
      await tx.orderItem.delete({ where: { id: itemId } });

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { totalAmount: { decrement: itemTotal } },
        include: { items: { include: { product: { select: { id: true, name: true, images: true } } } }, payment: true, returns: true }
      });

      // Restore stock if order was completed
      if (order.status === 'COMPLETED' && order.vehicleId) {
        await tx.vehicleStock.upsert({
          where: { vehicleId_productId: { vehicleId: order.vehicleId, productId: item.productId } },
          update: { quantity: { increment: item.quantity } },
          create: {
            vehicleId: order.vehicleId,
            productId: item.productId,
            quantity: item.quantity,
            tenantId,
            storeId: req.user.storeId || null
          }
        });
      } else if (order.status === 'COMPLETED' && !order.vehicleId) {
        // POS sale — restore stock into ChannelInventory, PosStoreStock, Product & UnifiedInventory
        const targetStoreId = order.warehouseId || order.storeId || req.user.storeId || req.user.warehouseId;
        await restorePOSStock(tx, {
          productId: item.productId,
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          storeId: targetStoreId,
          tenantId,
          unitPrice: item.unitPrice || item.price || 0
        });
      }

      if (order.payment) {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: { amount: { decrement: itemTotal } }
        });
      }

      return formatOrderProductImage(updatedOrder);
    });

    logActivity({
      userId: req.user.id, tenantId, storeId: req.user.storeId,
      action: 'ORDER_ITEM_REMOVED',
      details: `Removed item from order #${order.displayId}. Amount adjusted: -₹${itemTotal}`,
      metadata: { orderId, itemId, removedAmount: itemTotal }
    });

    await invalidatePOSAndInventoryCaches(order.vehicleId);

    res.json(result);
  } catch (error) {
    console.error('[Remove Order Item Error]:', error);
    next(error);
  }
};

// @desc    Return item(s) from order (before session close)
// @route   POST /api/orders/:orderId/return
// @access  Private
export const returnOrderItems = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { items, reason } = req.body; // items: [{ orderItemId, returnQty }]
    const tenantId = req.user.tenantId;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400);
      throw new Error('At least one return item is required');
    }

    if (await isSessionFrozen(tenantId, req.user.storeId, req.user.id)) {
      res.status(403);
      throw new Error('Session is closed. No returns allowed.');
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, returns: true, payment: true }
    });

    if (!order) { res.status(404); throw new Error('Order not found'); }
    if (order.status === 'CANCELLED') { res.status(400); throw new Error('Cannot return from cancelled order'); }

    // Fetch existing returns for this order from orderReturn table
    const existingReturns = await prisma.orderReturn.findMany({
      where: { orderId }
    });

    // Validate return quantities
    let totalReturnAmount = 0;
    const returnOps = [];

    for (const ri of items) {
      const orderItem = order.items.find(i => i.id === ri.orderItemId);
      if (!orderItem) { res.status(400); throw new Error(`Order item ${ri.orderItemId} not found`); }

      // Calculate already returned qty for this item from orderReturn records
      const alreadyReturned = existingReturns
        .filter(r => r.orderItemId === ri.orderItemId && (r.status === 'COMPLETED' || !r.status))
        .reduce((sum, r) => sum + (r.returnQty || 0), 0);

      const maxReturnable = orderItem.quantity - alreadyReturned;
      if (ri.returnQty > maxReturnable) {
        res.status(400);
        throw new Error(`Cannot return ${ri.returnQty} of item. Max returnable: ${maxReturnable}`);
      }
      if (ri.returnQty < 1) {
        res.status(400);
        throw new Error('Return quantity must be at least 1');
      }

      const itemPrice = Number(orderItem.unitPrice ?? orderItem.price ?? (orderItem.totalPrice && orderItem.quantity ? orderItem.totalPrice / orderItem.quantity : 0)) || 0;
      const returnAmount = ri.returnQty * itemPrice;
      totalReturnAmount += returnAmount;

      returnOps.push({
        orderItem,
        returnQty: ri.returnQty,
        returnAmount,
        alreadyReturned,
        maxReturnable
      });
    }

    // ─── CASH MANAGEMENT VALIDATION ───
    // For store orders (POS, STORE_PICKUP, in-store), refund is given in cash from counter register
    let resolvedRegisterStoreId = null;
    const dateString = format(new Date(), 'yyyy-MM-dd');

    if (!order.vehicleId) {
      const targetStoreId = order.warehouseId || order.storeId || order.allocatedStoreId || order.pickupStoreId || req.user.storeId || req.user.warehouseId;

      let storeRegister = null;
      if (targetStoreId) {
        storeRegister = await prisma.storeCashRegister.findFirst({
          where: { storeId: targetStoreId, date: dateString }
        });
      }
      if (!storeRegister) {
        const storeRecord = await prisma.store.findFirst({
          where: { OR: [{ id: targetStoreId }, { warehouseId: targetStoreId }] },
          select: { id: true, warehouseId: true }
        });
        const possibleIds = [targetStoreId, storeRecord?.id, storeRecord?.warehouseId].filter(Boolean);
        if (possibleIds.length > 0) {
          storeRegister = await prisma.storeCashRegister.findFirst({
            where: { storeId: { in: possibleIds }, date: dateString }
          });
        }
      }

      if (!storeRegister || storeRegister.status !== 'OPEN') {
        res.status(400);
        throw new Error('Cash counter is not opened. Please open the cash counter first before processing cash returns.');
      }

      resolvedRegisterStoreId = storeRegister.storeId;
      const storeRecord = await prisma.store.findFirst({
        where: { OR: [{ id: resolvedRegisterStoreId }, { warehouseId: resolvedRegisterStoreId }] },
        select: { id: true, warehouseId: true }
      });
      const storeIdsToMatch = Array.from(new Set([resolvedRegisterStoreId, storeRecord?.id, storeRecord?.warehouseId].filter(Boolean)));
      const baseWhere = { storeId: resolvedRegisterStoreId, date: dateString };

      const [allOpening, allDeposits, approvedAgentClosingSum, allBankDeposits, allSafeDeposits, allSafeWithdrawals] = await Promise.all([
        prisma.openingCash.aggregate({ where: baseWhere, _sum: { totalOpeningCash: true } }),
        prisma.storeDeposit.aggregate({ where: baseWhere, _sum: { amount: true } }),
        prisma.closingCash.aggregate({ where: { ...baseWhere, status: 'APPROVED' }, _sum: { actualCash: true } }),
        prisma.bankDeposit.aggregate({ where: baseWhere, _sum: { amount: true } }),
        prisma.safeTransaction.aggregate({ where: { ...baseWhere, type: 'DEPOSIT' }, _sum: { amount: true } }),
        prisma.safeTransaction.aggregate({ where: { ...baseWhere, type: 'WITHDRAW' }, _sum: { amount: true } })
      ]);

      const assignedOut = allOpening._sum.totalOpeningCash || 0;
      const receivedIn = (allDeposits._sum.amount || 0) + (approvedAgentClosingSum._sum.actualCash || 0);
      const bankTransferred = allBankDeposits._sum.amount || 0;
      const movedToSafe = allSafeDeposits._sum.amount || 0;
      const withdrawnFromSafe = allSafeWithdrawals._sum.amount || 0;

      const startOfDay = new Date(`${dateString}T00:00:00.000+05:30`);
      const endOfDay = new Date(`${dateString}T23:59:59.999+05:30`);

      const candidateReturns = await prisma.orderReturn.findMany({
        where: { createdAt: { gte: startOfDay, lte: endOfDay } }
      });
      const priorReturnsCash = candidateReturns
        .filter(r => storeIdsToMatch.includes(r.storeId))
        .reduce((sum, r) => sum + (r.returnAmount || 0), 0);

      const posSales = await prisma.order.findMany({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
          status: { in: ['DELIVERED', 'COMPLETED', 'PAID', 'CONFIRMED', 'PACKED', 'READY_FOR_PICKUP', 'PARTIALLY_RETURNED'] },
          OR: [
            { orderType: 'POS' },
            { fulfillmentType: 'STORE_PICKUP' },
            { AND: [{ vehicleId: null }, { orderType: { not: 'ONLINE' } }, { fulfillmentType: { not: 'HOME_DELIVERY' } }] }
          ],
          AND: [
            {
              OR: [
                { warehouseId: { in: storeIdsToMatch } },
                { allocatedWarehouseId: { in: storeIdsToMatch } },
                { pickupStoreId: { in: storeIdsToMatch } },
                { allocatedStoreId: { in: storeIdsToMatch } }
              ]
            }
          ]
        },
        select: { id: true, paymentMode: true, totalAmount: true, cashAmount: true }
      });

      const totalStoreSalesCash = posSales.reduce((sum, o) => {
        if (o.paymentMode === 'CASH' || !o.paymentMode) {
          const returnsForOrder = candidateReturns.filter(r => r.orderId === o.id).reduce((s, r) => s + (r.returnAmount || 0), 0);
          return sum + (o.totalAmount || 0) + returnsForOrder;
        }
        if (o.paymentMode === 'CASH_UPI') {
          return sum + (o.cashAmount || 0);
        }
        return sum;
      }, 0);

      const storeExpenses = await prisma.expense.findMany({
        where: {
          status: { in: ['APPROVED', 'PAID'] },
          paymentMode: 'CASH',
          date: dateString,
          vehicleId: null,
          storeId: { in: storeIdsToMatch }
        },
        select: { amount: true }
      });
      const totalStoreExpensesCash = storeExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      const totalStoreCash = storeRegister.openingCash - assignedOut + receivedIn + totalStoreSalesCash - priorReturnsCash - bankTransferred - totalStoreExpensesCash;
      const safeBalance = movedToSafe - withdrawnFromSafe - bankTransferred;
      const availableCash = totalStoreCash - safeBalance;

      if (availableCash < totalReturnAmount) {
        res.status(400);
        throw new Error(`Insufficient cash in the cash counter. Available cash: ₹${Math.max(0, availableCash).toFixed(2)}, required refund: ₹${totalReturnAmount.toFixed(2)}. Please add cash float to the counter first.`);
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create return records
      for (const op of returnOps) {
        await tx.orderReturn.create({
          data: {
            id: crypto.randomUUID(),
            tenantId,
            storeId: resolvedRegisterStoreId || req.user.storeId || order.warehouseId || order.storeId || null,
            orderId,
            orderItemId: op.orderItem.id,
            productId: op.orderItem.productId,
            returnQty: op.returnQty,
            returnAmount: op.returnAmount,
            reason: reason || null,
            returnedById: req.user.id,
            updatedAt: new Date()
          }
        });

        // Restore stock
        if (order.vehicleId) {
          await tx.vehicleStock.upsert({
            where: { vehicleId_productId: { vehicleId: order.vehicleId, productId: op.orderItem.productId } },
            update: { quantity: { increment: op.returnQty } },
            create: {
              vehicleId: order.vehicleId,
              productId: op.orderItem.productId,
              quantity: op.returnQty,
              tenantId,
              storeId: req.user.storeId || null
            }
          });
        } else {
          // POS sale — restore stock into ChannelInventory (POS_STORE), PosStoreStock, Product & UnifiedInventory
          const targetStoreId = order.warehouseId || order.storeId || req.user.storeId || req.user.warehouseId;
          await restorePOSStock(tx, {
            productId: op.orderItem.productId,
            productVariantId: op.orderItem.productVariantId,
            quantity: op.returnQty,
            storeId: targetStoreId,
            tenantId,
            unitPrice: op.orderItem.unitPrice || op.orderItem.price || 0
          });
        }
      }

      // Update order total
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          totalAmount: { decrement: totalReturnAmount },
          status: totalReturnAmount >= order.totalAmount ? 'RETURNED' : 'PARTIALLY_RETURNED'
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, images: true, price: true }
              }
            }
          },
          payment: true
        }
      });

      // Adjust payment
      if (order.payment) {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: { amount: { decrement: totalReturnAmount } }
        });
      }

      // Fetch all returns for this order
      const allReturns = await tx.orderReturn.findMany({
        where: { orderId },
        orderBy: { createdAt: 'desc' }
      });

      // Product map for returns enrichment
      const itemMap = (updatedOrder.items || []).reduce((acc, it) => {
        acc[it.id] = it;
        return acc;
      }, {});

      const enrichedReturns = allReturns.map(r => {
        const it = itemMap[r.orderItemId];
        return {
          ...r,
          refundAmount: r.returnAmount,
          product: it?.product ? {
            id: it.product.id,
            name: it.product.name,
            image: it.product.images?.[0] || null,
            images: it.product.images || []
          } : null
        };
      });

      // Enrich items with returnedQty, returnableQty, unitPrice
      updatedOrder.items = updatedOrder.items.map(it => {
        const itemReturns = allReturns.filter(r => r.orderItemId === it.id);
        const itemReturnedQty = itemReturns.reduce((sum, r) => sum + (r.returnQty || 0), 0);
        const remainingQty = Math.max(0, it.quantity - itemReturnedQty);
        return {
          ...it,
          price: Number(it.unitPrice || it.price || 0),
          unitPrice: Number(it.unitPrice || it.price || 0),
          returnedQty: itemReturnedQty,
          returnableQty: remainingQty
        };
      });

      updatedOrder.returns = enrichedReturns;
      updatedOrder.storeId = order.warehouseId || order.storeId || order.allocatedStoreId || order.pickupStoreId;
      updatedOrder.customerName = order.customerName || order.consumer?.name || null;
      updatedOrder.mobile = order.mobile || order.consumer?.mobile || null;

      return formatOrderProductImage(updatedOrder);
    });

    logActivity({
      userId: req.user.id, tenantId, storeId: req.user.storeId,
      action: 'ORDER_RETURN',
      details: `Returned ${items.length} item(s) from order #${order.displayId}. Return value: ₹${totalReturnAmount}`,
      metadata: { orderId, returnAmount: totalReturnAmount, itemCount: items.length }
    });

    // Large return alert
    if (totalReturnAmount >= 500) {
      sendNotification({
        roles: ['ADMIN', 'SUPERVISOR'],
        title: '⚠️ Large Return Alert',
        message: `Return of ₹${totalReturnAmount} on order #${order.displayId} by ${req.user.name}.`,
        type: 'sales', priority: 'high',
        metadata: { orderId, returnAmount: totalReturnAmount }
      });
    }

    // Recalculate cash summary if vehicle agent sale
    if (order.vehicleId && (order.paymentMode === 'CASH' || order.paymentMode === 'CASH_UPI')) {
      recalculateDailySummary(order.vehicleId, dateString).catch(err => {
        console.warn('[CASH] Summary sync failed after return:', err.message);
      });
    }

    // Broadcast cash update to real-time cash drawer / register
    if (resolvedRegisterStoreId) {
      broadcastCashUpdate(resolvedRegisterStoreId, dateString, 'RETURN', {
        amount: totalReturnAmount,
        returnAmount: totalReturnAmount,
        orderId: order.id
      });
    }

    await invalidatePOSAndInventoryCaches(order.vehicleId);

    res.json(result);
  } catch (error) {
    console.error('[Return Order Items Error]:', error);
    next(error);
  }
};

// @desc    Cancel entire order (before session close)
// @route   POST /api/orders/:orderId/cancel
// @access  Private
export const cancelOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const tenantId = req.user.tenantId;

    if (await isSessionFrozen(tenantId, req.user.storeId, req.user.id)) {
      res.status(403);
      throw new Error('Session is closed. No cancellations allowed.');
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payment: true }
    });

    if (!order) { res.status(404); throw new Error('Order not found'); }
    if (order.status === 'CANCELLED') { res.status(400); throw new Error('Order already cancelled'); }

    const result = await prisma.$transaction(async (tx) => {
      // Restore all stock if order had completed delivery/sale
      const eligibleStatuses = ['COMPLETED', 'DELIVERED', 'PAID', 'CONFIRMED'];
      if (eligibleStatuses.includes(order.status)) {
        if (order.vehicleId) {
          for (const item of order.items) {
            await tx.vehicleStock.upsert({
              where: { vehicleId_productId: { vehicleId: order.vehicleId, productId: item.productId } },
              update: { quantity: { increment: item.quantity } },
              create: {
                vehicleId: order.vehicleId,
                productId: item.productId,
                quantity: item.quantity,
                tenantId,
                storeId: req.user.storeId || null
              }
            });
          }
        } else {
          // POS sale — restore Product.stock, ChannelInventory, PosStoreStock, ProductVariant & UnifiedInventory
          const targetStoreId = order.warehouseId || order.storeId || req.user.storeId || req.user.warehouseId;
          for (const item of order.items) {
            await restorePOSStock(tx, {
              productId: item.productId,
              productVariantId: item.productVariantId,
              quantity: item.quantity,
              storeId: targetStoreId,
              tenantId,
              unitPrice: item.unitPrice || item.price || 0
            });
          }
        }
      }

      // Cancel order
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledBy: req.user.id,
          cancellationReason: reason || 'Cancelled by admin',
          totalAmount: 0,
          cashAmount: 0,
          upiAmount: 0,
          paymentStatus: 'REFUNDED'
        },
        include: { items: { include: { product: { select: { id: true, name: true, images: true } } } }, returns: true, payment: true }
      });

      // Cancel / refund payment using valid PaymentStatus enum ('REFUNDED' or 'FAILED')
      if (order.payment) {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: { status: 'REFUNDED', amount: 0, refundedAt: new Date() }
        });
      }

      return formatOrderProductImage(updatedOrder);
    });

    logActivity({
      userId: req.user.id, tenantId, storeId: req.user.storeId,
      action: 'ORDER_CANCELLED',
      details: `Cancelled order #${order.displayId || order.orderNumber || orderId}. Original amount: ₹${order.totalAmount}. Reason: ${reason || 'N/A'}`,
      metadata: { orderId, originalAmount: order.totalAmount, reason }
    });

    sendNotification({
      roles: ['ADMIN', 'SUPERVISOR'],
      title: 'Order Cancelled',
      message: `Order #${order.displayId || order.orderNumber || orderId} (₹${order.totalAmount}) cancelled by ${req.user.name}. Reason: ${reason || 'N/A'}`,
      type: 'sales', priority: 'high',
      metadata: { orderId, originalAmount: order.totalAmount }
    });

    const dateString = format(order.createdAt || new Date(), 'yyyy-MM-dd');
    const resolvedStoreId = order.warehouseId || order.storeId || req.user.storeId || req.user.warehouseId;

    // Recalculate cash summary if vehicle sale
    if (order.vehicleId && (order.paymentMode === 'CASH' || order.paymentMode === 'CASH_UPI')) {
      recalculateDailySummary(order.vehicleId, dateString).catch(err => {
        console.warn('[CASH] Summary sync failed after cancel:', err.message);
      });
    }

    // Broadcast cash update to real-time cash drawer / store register to immediately deduct cash
    if (resolvedStoreId) {
      broadcastCashUpdate(resolvedStoreId, dateString, 'ORDER_CANCELLED', {
        amount: order.cashAmount || order.totalAmount || 0,
        orderId: order.id,
        orderNumber: order.orderNumber || order.displayId
      });
    }

    await invalidatePOSAndInventoryCaches(order.vehicleId);

    res.json(result);
  } catch (error) {
    console.error('[Cancel Order Error]:', error);
    next(error);
  }
};

// @desc    Get session sales summary
// @route   GET /api/orders/session-sales
// @access  Private
export const getSessionSales = async (req, res, next) => {
  try {
    const { date, storeId } = req.query;
    const tenantId = req.user.tenantId;
    const dateString = date || format(new Date(), 'yyyy-MM-dd');

    const startOfDay = new Date(dateString);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateString);
    endOfDay.setHours(23, 59, 59, 999);

    // Resolve warehouseId — prefer req.user.warehouseId, fallback to DB
    let userWarehouseId = req.user.warehouseId || req.user.storeId || null;
    if (!userWarehouseId && req.user?.id) {
      const dbUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { warehouseId: true } });
      userWarehouseId = dbUser?.warehouseId || null;
    }
    const targetStoreId = storeId || userWarehouseId;

    const whereClause = {
      createdAt: { gte: startOfDay, lte: endOfDay },
      status: { in: ['DELIVERED', 'RETURNED'] }
    };
    
    if (targetStoreId && targetStoreId !== 'undefined' && targetStoreId !== 'null') {
      const store = await prisma.store.findUnique({
        where: { id: targetStoreId },
        select: { warehouseId: true }
      });
      if (store?.warehouseId) {
        whereClause.warehouseId = store.warehouseId;
      } else {
        whereClause.warehouseId = targetStoreId;
      }
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        items: { include: { product: { select: { id: true, name: true } } } },
        returns: true
      }
    });

    const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalReturns = orders.reduce((sum, o) => sum + o.returns.reduce((rs, r) => rs + r.returnAmount, 0), 0);

    const cancelledOrders = await prisma.order.count({
      where: { ...whereClause, status: 'CANCELLED' }
    });

    // Group by payment mode
    const cashSales = orders.filter(o => o.paymentMode === 'CASH').reduce((s, o) => s + o.totalAmount, 0);
    const upiSales = orders.filter(o => o.paymentMode === 'UPI').reduce((s, o) => s + o.totalAmount, 0);

    res.json({
      date: dateString,
      totalOrders: orders.length,
      cancelledOrders,
      totalSales,
      totalReturns,
      netSales: totalSales - totalReturns,
      cashSales,
      upiSales,
      orders
    });
  } catch (error) {
    console.error('[Session Sales Error]:', error);
    next(error);
  }
};

// @desc    Get return report
// @route   GET /api/orders/return-report
// @access  Private (Admin)
export const getReturnReport = async (req, res, next) => {
  try {
    const { date, fromDate, toDate, storeId } = req.query;
    const tenantId = req.user.tenantId;

    const where = { tenantId };
    if (storeId) where.storeId = storeId;
    else if (req.user.storeId) where.storeId = req.user.storeId;

    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: d, lte: end };
    } else if (fromDate && toDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      where.createdAt = { gte: from, lte: to };
    }

    const returns = await prisma.orderReturn.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, images: true, price: true } },
        order: { select: { id: true, displayId: true, customerName: true, mobile: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    returns.forEach(r => {
      if (r.product) {
        r.product.image = r.product.images?.[0] || null;
      }
    });

    const totalReturnValue = returns.reduce((sum, r) => sum + r.returnAmount, 0);
    const totalReturnQty = returns.reduce((sum, r) => sum + r.returnQty, 0);

    res.json({
      totalReturns: returns.length,
      totalReturnValue,
      totalReturnQty,
      returns
    });
  } catch (error) {
    console.error('[Return Report Error]:', error);
    next(error);
  }
};

// @desc    Get item-wise sales report
// @route   GET /api/orders/item-wise-report
// @access  Private (Admin)
export const getItemWiseReport = async (req, res, next) => {
  try {
    const { date, storeId } = req.query;
    const tenantId = req.user.tenantId;
    const dateString = date || format(new Date(), 'yyyy-MM-dd');

    const startOfDay = new Date(dateString);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateString);
    endOfDay.setHours(23, 59, 59, 999);

    const orderWhere = {
      tenantId,
      createdAt: { gte: startOfDay, lte: endOfDay },
      status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] }
    };
    if (storeId) orderWhere.storeId = storeId;
    else if (req.user.storeId) orderWhere.storeId = req.user.storeId;

    const orders = await prisma.order.findMany({
      where: orderWhere,
      include: {
        items: { include: { product: { select: { id: true, name: true, images: true } } } },
        returns: true
      }
    });

    // Aggregate by product
    const itemMap = {};
    for (const order of orders) {
      for (const item of order.items) {
        if (!itemMap[item.productId]) {
          itemMap[item.productId] = {
            productId: item.productId,
            name: item.product?.name || 'Unknown',
            image: item.product?.images?.[0] || null,
            soldQty: 0, soldValue: 0,
            returnedQty: 0, returnedValue: 0
          };
        }
        itemMap[item.productId].soldQty += item.quantity;
        itemMap[item.productId].soldValue += item.price * item.quantity;
      }
      for (const ret of order.returns) {
        if (itemMap[ret.productId]) {
          itemMap[ret.productId].returnedQty += ret.returnQty;
          itemMap[ret.productId].returnedValue += ret.returnAmount;
        }
      }
    }

    const report = Object.values(itemMap).map(item => ({
      ...item,
      netQty: item.soldQty - item.returnedQty,
      netValue: item.soldValue - item.returnedValue
    }));

    report.sort((a, b) => b.netValue - a.netValue);

    res.json({ date: dateString, items: report });
  } catch (error) {
    console.error('[Item Wise Report Error]:', error);
    next(error);
  }
};

// @desc    Freeze/Close session (prevents further edits)
// @route   POST /api/orders/freeze-session
// @access  Private (Admin)
export const freezeSession = async (req, res, next) => {
  try {
    const { date, shift = 1, agentId } = req.body;
    const tenantId = req.user.tenantId;
    const dateString = date || format(new Date(), 'yyyy-MM-dd');

    const session = await prisma.sessionSales.upsert({
      where: {
        tenantId_storeId_date_shift_agentId: {
          tenantId,
          storeId: req.user.storeId || null,
          date: dateString,
          shift,
          agentId: agentId || null
        }
      },
      update: { isFrozen: true, frozenAt: new Date() },
      create: {
        tenantId,
        storeId: req.user.storeId,
        date: dateString,
        shift,
        agentId: agentId || null,
        isFrozen: true,
        frozenAt: new Date()
      }
    });

    logActivity({
      userId: req.user.id, tenantId, storeId: req.user.storeId,
      action: 'SESSION_FROZEN',
      details: `Session frozen for ${dateString} shift ${shift}`,
      metadata: { date: dateString, shift, agentId }
    });

    res.json({ message: 'Session frozen successfully', session });
  } catch (error) {
    console.error('[Freeze Session Error]:', error);
    next(error);
  }
};

// @desc    Report physical replacement item unavailable in store
// @route   POST /api/partner/returns/:returnId/replacement-unavailable
// @access  Private (Partner / Store Manager)
export const reportReplacementUnavailable = async (req, res, next) => {
  try {
    const { returnId } = req.params;
    const { orderId, reason, fallbackPreference } = req.body;
    const tenantId = req.user.tenantId;

    const history = await prisma.orderReturnHistory.create({
      data: {
        orderId,
        fromPhase: 'REPLACEMENT_PENDING_APPROVAL',
        toPhase: 'REPLACEMENT_HOLD_RELEASED',
        returnType: 'REPLACEMENT',
        reason: reason || 'Partner reported physical stock unavailable'
      }
    });

    logActivity({
      userId: req.user.id,
      tenantId,
      storeId: req.user.storeId,
      action: 'REPLACEMENT_UNAVAILABLE_REPORTED',
      details: `Partner reported replacement item unavailable for return ${returnId}`,
      metadata: { returnId, orderId, reason, fallbackPreference }
    });

    res.json({
      ok: true,
      message: 'Replacement unavailable reported successfully. OMS Core notified for fallback processing.',
      returnId,
      orderId,
      historyId: history.id
    });
  } catch (error) {
    console.error('[Report Replacement Unavailable Error]:', error);
    next(error);
  }
};

