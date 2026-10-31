import prisma from '../../utils/prisma.js';
import { generateId } from '../../utils/idGenerator.js';
import { logActivity } from '../../utils/activityLogger.js';
import { createIdentityUser } from '../../../utils/identityService.js';

export const getSalesHistory = async (req, res) => {
  try {
    const { fromDate, toDate, vehicleId, userId, storeId } = req.query;
    
    // Build query using only valid Order model fields
    let whereClause = {};

    const fromDateVal = req.query.fromDate || req.query.startDate;
    const toDateVal = req.query.toDate || req.query.endDate;

    if (fromDateVal || toDateVal) {
      whereClause.createdAt = {};
      if (fromDateVal) {
        const from = new Date(fromDateVal);
        from.setHours(0, 0, 0, 0);
        whereClause.createdAt.gte = from;
      }
      if (toDateVal) {
        const to = new Date(toDateVal);
        to.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = to;
      }
    }

    if (vehicleId) whereClause.vehicleId = vehicleId;
    if (userId) whereClause.consumerId = userId;
    
    // Resolve warehouse scope: the incoming storeId may be a Warehouse ID or a Store ID
    let targetId = storeId || req.user.warehouseId || req.user.storeId;
    if (targetId && targetId !== 'undefined' && targetId !== 'null') {
      // Try it directly as a warehouseId first (most common case for this dashboard)
      const warehouseExists = await prisma.warehouse.findUnique({
        where: { id: targetId },
        select: { id: true }
      });
      if (warehouseExists) {
        whereClause.warehouseId = targetId;
      } else {
        // Fall back: maybe it's a Store ID — resolve its parent warehouseId
        const store = await prisma.store.findUnique({
          where: { id: targetId },
          select: { warehouseId: true }
        });
        if (store?.warehouseId) {
          whereClause.warehouseId = store.warehouseId;
        }
        // If neither resolved, no scope filter — return all (safe for admin)
      }
    }

    const sales = await prisma.order.findMany({
      where: whereClause,
      include: {
        customer: { select: { id: true, name: true, mobile: true } },
        consumer: { select: { id: true, name: true, phone: true, role: true } },
        vehicle: {
          include: {
            assignedUsers: { select: { id: true, name: true, phone: true } }
          }
        },
        route: { select: { id: true, routeName: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, price: true, landingPrice: true, images: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Bulk fetch all returns for the retrieved sales
    const orderIds = sales.map(s => s.id);
    const allReturns = orderIds.length > 0 ? await prisma.orderReturn.findMany({
      where: { orderId: { in: orderIds } },
      orderBy: { createdAt: 'desc' }
    }) : [];

    const returnsByOrderId = allReturns.reduce((acc, r) => {
      if (!acc[r.orderId]) acc[r.orderId] = [];
      acc[r.orderId].push(r);
      return acc;
    }, {});

    // Map consumer → user to keep the frontend API shape intact and attach returns
    const salesWithUser = sales.map(s => {
      const { consumer, ...rest } = s;
      const orderReturns = (returnsByOrderId[s.id] || []).map(r => ({
        ...r,
        refundAmount: r.returnAmount
      }));
      const enrichedItems = (s.items || []).map(it => {
        const itemReturns = orderReturns.filter(r => r.orderItemId === it.id);
        const itemReturnedQty = itemReturns.reduce((sum, r) => sum + (r.returnQty || 0), 0);
        return {
          ...it,
          price: Number(it.unitPrice || it.price || 0),
          unitPrice: Number(it.unitPrice || it.price || 0),
          returnedQty: itemReturnedQty,
          returnableQty: Math.max(0, it.quantity - itemReturnedQty)
        };
      });

      return {
        ...rest,
        storeId: s.allocatedStoreId || s.pickupStoreId || s.warehouseId || s.storeId || null,
        items: enrichedItems,
        returns: orderReturns,
        customerName: s.customerName || s.customer?.name || consumer?.name || 'Walk-in Customer',
        mobile: s.mobile || s.customer?.mobile || consumer?.phone || '',
        user: consumer
      };
    });

    res.json(salesWithUser);
  } catch (error) {
    console.error('🔥 Sales Fetch Error:', error);
    res.status(500).json({ 
      message: 'Error fetching sales data', 
      error: error.message,
      detail: error.meta || error.code
    });
  }
};

export const createManualSale = async (req, res) => {
  try {
    const { storeId, vehicleId, agentId, routeId, villageName, saleDate, customerName, mobile, paymentMode, cashAmount, upiAmount, remark, items } = req.body;
    const tenantId = req.user.tenantId;
    let finalStoreId = (storeId && storeId !== '') ? storeId : req.user.storeId;
    if (!finalStoreId) {
      const fallbackStore = await prisma.store.findFirst({ where: { tenantId } });
      if (fallbackStore) finalStoreId = fallbackStore.id;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items array is required' });
    }

    // Sort items deterministically by productId to prevent DB row-level deadlocks during concurrent updates
    items.sort((a, b) => String(a.productId).localeCompare(String(b.productId)));

    let totalAmount = 0;
    for (const item of items) {
      totalAmount += (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
    }

    const result = await prisma.$transaction(async (tx) => {
      const orderDisplayId = await generateId({
        entity: 'ORD',
        tenantId: tenantId,
        storeId: finalStoreId
      });

      const orderData = {
        tenant: { connect: { id: tenantId } },
        store: { connect: { id: finalStoreId } },
        displayId: orderDisplayId,
        customerName: customerName || 'Manual Entry',
        mobile: mobile || null,
        totalAmount,
        status: 'COMPLETED',
        paymentMode: paymentMode || 'CASH',
        cashAmount: parseFloat(cashAmount) || 0,
        upiAmount: parseFloat(upiAmount) || 0
      };

      if (saleDate) {
        orderData.createdAt = new Date(saleDate);
      }
      if (agentId) orderData.agentId = agentId;
      if (vehicleId) orderData.vehicle = { connect: { id: vehicleId } };
      if (routeId) orderData.route = { connect: { id: routeId } };
      if (villageName) orderData.villageName = villageName;
      // ── Resolve or create Customer in Customer table AND User table (role: CONSUMER) ──
      let customerIdResolved = null;
      let consumerUserIdResolved = null;

      if (mobile && mobile.trim() !== '') {
        const cleanMobile = mobile.trim();
        const customerDisplayName = customerName?.trim() || `Customer ${cleanMobile}`;

        // 1. Resolve or create in User table (role: CONSUMER)
        try {
          let consumerUser = await tx.user.findFirst({
            where: { phone: cleanMobile }
          });

          if (!consumerUser) {
            let identityUserId = null;
            try {
              const identityRes = await createIdentityUser({
                name: customerDisplayName,
                phone: cleanMobile,
                role: 'CONSUMER'
              });
              if (identityRes?.id) identityUserId = identityRes.id;
            } catch (idErr) {
              console.warn(`[createManualSale] Identity user creation warning for ${cleanMobile}: ${idErr.message}`);
            }

            consumerUser = await tx.user.create({
              data: {
                ...(identityUserId ? { id: identityUserId } : {}),
                phone: cleanMobile,
                name: customerDisplayName,
                role: 'CONSUMER',
                isActive: true,
                isVerified: true
              }
            });
          } else if (customerName?.trim() && (!consumerUser.name || consumerUser.name.startsWith('Customer '))) {
            consumerUser = await tx.user.update({
              where: { id: consumerUser.id },
              data: { name: customerDisplayName }
            }).catch(() => consumerUser);
          }

          if (consumerUser) {
            consumerUserIdResolved = consumerUser.id;
          }
        } catch (userErr) {
          console.error(`[createManualSale] Error resolving/creating consumer User for ${cleanMobile}:`, userErr);
        }

        // 2. Ensure persistent Customer Profile mapping to reflect in CRM directory views
        try {
          const cust = await tx.customer.upsert({
            where: { 
              tenantId_mobile: {
                tenantId,
                mobile: cleanMobile
              }
            },
            update: {
              ...(customerName ? { name: customerDisplayName } : {})
            },
            create: {
              tenant: { connect: { id: tenantId } },
              store: { connect: { id: finalStoreId } },
              name: customerDisplayName,
              mobile: cleanMobile,
              segment: 'REGULAR',
              loyaltyPoints: 0,
              creditBalance: 0
            }
          });
          customerIdResolved = cust.id;
        } catch (custErr) {
          // Graceful fallback for concurrent transaction indexing races
          const existingCust = await tx.customer.findUnique({ 
            where: { 
              tenantId_mobile: {
                tenantId,
                mobile: cleanMobile
              }
            } 
          });
          if (existingCust) customerIdResolved = existingCust.id;
        }
      }

      if (customerIdResolved) {
        orderData.customer = { connect: { id: customerIdResolved } };
      }

      const effectiveConsumerId = consumerUserIdResolved || agentId;
      if (effectiveConsumerId) {
        orderData.consumer = { connect: { id: effectiveConsumerId } };
      }

      const newOrder = await tx.order.create({
        data: {
          ...orderData,
          items: {
            create: items.map(item => ({
              tenant: { connect: { id: tenantId } },
              store: { connect: { id: finalStoreId } },
              product: { connect: { id: item.productId } },
              quantity: parseInt(item.quantity) || 1,
              price: parseFloat(item.price) || 0,
              discount: parseFloat(item.discount) || 0,
              gst: parseFloat(item.gst) || 0
            }))
          }
        },
        include: { items: true }
      });

      await tx.payment.create({
        data: {
          tenant: { connect: { id: tenantId } },
          store: { connect: { id: finalStoreId } },
          order: { connect: { id: newOrder.id } },
          paymentMode: orderData.paymentMode,
          amount: totalAmount,
          cashAmount: orderData.cashAmount,
          upiAmount: orderData.upiAmount,
          status: 'COMPLETED',
          ...(saleDate && { createdAt: new Date(saleDate) })
        }
      });

      // Inventory deduction
      for (const item of items) {
        const qty = parseInt(item.quantity) || 1;
        if (vehicleId) {
          // Deduct from vehicle stock
          const stock = await tx.vehicleStock.findUnique({
            where: { vehicleId_productId: { vehicleId, productId: item.productId } }
          });
          if (stock && stock.quantity >= qty) {
            await tx.vehicleStock.update({
              where: { vehicleId_productId: { vehicleId, productId: item.productId } },
              data: { quantity: { decrement: qty } }
            });
          } else {
            throw new Error(`Insufficient vehicle stock for product ID ${item.productId}`);
          }
        } else {
          // Deduct from store stock
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: qty } }
          });
          const wi = await tx.warehouseInventory.findFirst({
            where: { productId: item.productId, tenantId }
          });
          if (wi) {
            await tx.warehouseInventory.update({
              where: { id: wi.id },
              data: { quantity: { decrement: qty } }
            });
          }
        }
      }

      return newOrder;
    }, { maxWait: 5000, timeout: 20000 });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId: req.user.storeId,
      action: 'SALE_MANUAL_CREATE',
      details: `Admin created manual sale #${result.orderNumber} for ₹${result.totalAmount}. Remark: ${remark || 'N/A'}`,
      metadata: { orderId: result.id, orderNumber: result.orderNumber }
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('🔥 Create Manual Sale Error:', error);
    res.status(400).json({ 
      message: error.message || 'Error creating manual sale',
      detail: error.meta?.cause || JSON.stringify(error.meta) || error.code
    });
  }
};

export const suspendSale = async (req, res) => {
  try {
    const { storeId, terminalId, customerName, customerMobile, totalAmount, items } = req.body;
    const tenantId = req.user.tenantId;

    // Use relational mapping for all foreign keys to satisfy Prisma's strict validation
    const suspendedData = {
      tenant: { connect: { id: tenantId } },
      customerName: customerName || 'Walk-in',
      customerMobile: customerMobile || null,
      totalAmount: parseFloat(totalAmount) || 0,
      items: items || [],
    };

    if (storeId && storeId.trim() !== '') suspendedData.store = { connect: { id: storeId } };
    if (terminalId && terminalId.trim() !== '') suspendedData.terminal = { connect: { id: terminalId } };
    if (req.user.id) suspendedData.user = { connect: { id: req.user.id } };

    const suspended = await prisma.suspendedSale.create({
      data: suspendedData
    });

    res.status(201).json({ success: true, data: suspended });
  } catch (error) {
    console.error('🔥 Suspend Sale Error:', error);
    res.status(400).json({ 
      message: 'Error suspending sale', 
      error: error.message
    });
  }
};

export const getSuspendedSales = async (req, res) => {
  try {
    const { storeId, terminalId } = req.query;
    const where = { tenantId: req.user.tenantId };

    if (storeId && storeId !== 'null' && storeId !== 'undefined') where.storeId = storeId;
    if (terminalId && terminalId !== 'null' && terminalId !== 'undefined') where.terminalId = terminalId;

    const suspended = await prisma.suspendedSale.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: suspended });
  } catch (error) {
    console.error('🔥 Fetch Suspended Sales Error:', error);
    res.status(400).json({ message: 'Error fetching suspended sales', error: error.message });
  }
};

export const deleteSuspendedSale = async (req, res) => {
  try {
    const { id } = req.params;
    // Use deleteMany to allow filtering by tenantId (since id + tenantId is not a unique index)
    const result = await prisma.suspendedSale.deleteMany({
      where: { id, tenantId: req.user.tenantId }
    });
    
    if (result.count === 0) {
      return res.status(404).json({ message: 'Suspended sale not found or unauthorized' });
    }

    res.json({ success: true, message: 'Suspended sale deleted' });
  } catch (error) {
    console.error('🔥 Delete Suspended Sale Error:', error);
    res.status(400).json({ message: 'Error deleting suspended sale', error: error.message });
  }
};
