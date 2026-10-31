import { prisma } from '../../config/prismaClient.js';
import { logActivity } from '../utils/activityLogger.js';
import { InventoryCache } from '../../utils/cacheHelper.js';

// Create a new transfer request
export const createTransfer = async (req, res) => {
  try {
    let { fromVehicleId, toVehicleId, fromUserId, toUserId, remarks, items } = req.body;
    const tenantId = req.user?.tenantId || 'VK001';

    // Auto-resolve fromUserId and fromVehicleId from authenticated user if not provided
    if (!fromUserId && req.user?.id) {
      fromUserId = req.user.id;
    }
    if (!fromVehicleId) {
      fromVehicleId = req.user?.assignedVehicleId || req.user?.assignedVehicle?.id;
      if (!fromVehicleId && fromUserId) {
        const u = await prisma.user.findUnique({
          where: { id: fromUserId },
          select: { assignedVehicleId: true }
        });
        fromVehicleId = u?.assignedVehicleId;
      }
    }

    // Auto-resolve toVehicleId from target agent if needed
    if (!toVehicleId && toUserId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: toUserId },
        select: { assignedVehicleId: true }
      });
      toVehicleId = targetUser?.assignedVehicleId;
    }

    if (!fromVehicleId || !toVehicleId || !fromUserId || !toUserId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters. Both source & destination agents and at least one item are required.'
      });
    }

    if (fromUserId === toUserId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot transfer stock to the same agent.'
      });
    }

    // Check source agent stock levels & verify valid product references
    for (const item of items) {
      const requestedQty = parseInt(item.quantity, 10) || 0;
      if (requestedQty <= 0) {
        return res.status(400).json({ success: false, message: 'Requested transfer quantity must be greater than zero.' });
      }

      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product ID ${item.productId} is invalid or no longer exists in catalog.`
        });
      }

      const stock = await prisma.vehicleStock.findFirst({
        where: {
          vehicleId: fromVehicleId,
          productId: item.productId,
          tenantId
        }
      });

      if (!stock || stock.quantity < requestedQty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product: ${product.name}. Available: ${stock?.quantity || 0}, Requested: ${requestedQty}`
        });
      }
    }

    // Create the transfer record in database
    const transfer = await prisma.agentStockTransfer.create({
      data: {
        tenantId,
        fromVehicleId,
        toVehicleId,
        fromUserId,
        toUserId,
        remarks: remarks || null,
        status: 'PENDING',
        items: {
          create: items.map(i => ({
            productId: i.productId,
            quantity: parseInt(i.quantity, 10)
          }))
        }
      },
      include: {
        items: true,
        fromUser: { select: { id: true, name: true, phone: true } },
        toUser: { select: { id: true, name: true, phone: true } },
        fromVehicle: { select: { id: true, vehicleNumber: true, vehicleName: true } },
        toVehicle: { select: { id: true, vehicleNumber: true, vehicleName: true } }
      }
    });

    // Populate products safely for response
    const productIds = transfer.items.map(i => i.productId).filter(Boolean);
    const products = productIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, sku: true, price: true, unit: true }
        })
      : [];
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    const transferWithProducts = {
      ...transfer,
      items: transfer.items.map(item => ({
        ...item,
        product: productMap[item.productId] || { id: item.productId, name: 'Product', sku: 'N/A', price: 0, unit: 'PCS' }
      }))
    };

    // Log Activity
    await logActivity({
      tenantId,
      userId: req.user.id,
      action: 'STOCK_TRANSFER_INITIATE',
      details: `Transfer initiated from ${transfer.fromUser?.name || 'Agent'} (${transfer.fromVehicle?.vehicleNumber || 'Vehicle'}) to ${transfer.toUser?.name || 'Agent'} (${transfer.toVehicle?.vehicleNumber || 'Vehicle'})`,
      metadata: { transferId: transfer.id }
    }).catch(err => console.warn('[Transfer Log] Activity log failed:', err.message));

    // Invalidate vehicle cache
    try {
      await InventoryCache.invalidatePrefix(`vsms:inventory:vehicle:${fromVehicleId}`);
      await InventoryCache.invalidatePrefix(`vsms:inventory:vehicle:${toVehicleId}`);
      console.log(`[TransferCreate] Cache invalidated for vehicles: ${fromVehicleId}, ${toVehicleId}`);
    } catch (cacheErr) {
      console.warn('[TransferCreate] Failed to invalidate cache:', cacheErr.message);
    }

    res.status(201).json({ success: true, data: transferWithProducts, message: 'Stock transfer request created successfully' });
  } catch (error) {
    console.error('createTransfer Error:', error);
    res.status(500).json({ success: false, message: 'Error initiating transfer', error: error.message });
  }
};

// Get list of transfers
export const getTransfers = async (req, res) => {
  try {
    const { fromUserId, toUserId, fromVehicleId, toVehicleId, status, startDate, endDate, myTransfers } = req.query;
    const tenantId = req.user?.tenantId || 'VK001';

    const where = { tenantId };

    if (myTransfers === 'true' && req.user?.id) {
      where.OR = [
        { fromUserId: req.user.id },
        { toUserId: req.user.id }
      ];
    } else {
      if (fromUserId) where.fromUserId = fromUserId;
      if (toUserId) where.toUserId = toUserId;
    }

    if (fromVehicleId) where.fromVehicleId = fromVehicleId;
    if (toVehicleId) where.toVehicleId = toVehicleId;
    if (status) where.status = status;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    }

    const transfers = await prisma.agentStockTransfer.findMany({
      where,
      include: {
        fromUser: { select: { id: true, name: true, phone: true } },
        toUser: { select: { id: true, name: true, phone: true } },
        fromVehicle: { select: { id: true, vehicleNumber: true, vehicleName: true } },
        toVehicle: { select: { id: true, vehicleNumber: true, vehicleName: true } },
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Separately fetch products to avoid required relation validation crash
    const allProductIds = [...new Set(
      transfers.flatMap(t => t.items.map(i => i.productId).filter(Boolean))
    )];
    const products = allProductIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: allProductIds } },
          select: { id: true, name: true, sku: true, price: true, unit: true }
        })
      : [];
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    // Fetch approvals for these transfers
    const transferIds = transfers.map(t => t.id);
    const approvals = transferIds.length > 0
      ? await prisma.agentTransferApproval.findMany({
          where: { transferId: { in: transferIds } },
          orderBy: { createdAt: 'desc' }
        })
      : [];

    const approvalUserIds = [...new Set(approvals.map(a => a.userId))];
    const approvalUsers = approvalUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: approvalUserIds } },
          select: { id: true, name: true }
        })
      : [];
    const userMap = Object.fromEntries(approvalUsers.map(u => [u.id, u]));

    const approvalMap = {};
    approvals.forEach(a => {
      if (!approvalMap[a.transferId]) approvalMap[a.transferId] = [];
      approvalMap[a.transferId].push({
        ...a,
        user: userMap[a.userId] || { id: a.userId, name: 'Admin' }
      });
    });

    const processedTransfers = transfers.map(t => {
      const processedItems = t.items.map(item => {
        const product = productMap[item.productId];
        return {
          ...item,
          product: product || {
            id: item.productId,
            name: 'Unknown Product',
            sku: 'N/A',
            price: 0,
            unit: 'PCS'
          }
        };
      });
      return {
        ...t,
        items: processedItems,
        approvalHistory: approvalMap[t.id] || []
      };
    });

    res.json(processedTransfers);
  } catch (error) {
    console.error('getTransfers Error:', error);
    res.status(500).json({ message: 'Error retrieving transfers', error: error.message });
  }
};

// Retrieve specific transfer by ID
export const getTransferById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const transfer = await prisma.agentStockTransfer.findFirst({
      where: { id, tenantId },
      include: {
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
        fromVehicle: { select: { id: true, vehicleNumber: true, vehicleName: true } },
        toVehicle: { select: { id: true, vehicleNumber: true, vehicleName: true } },
        items: true
      }
    });

    if (!transfer) {
      return res.status(404).json({ message: 'Transfer request not found' });
    }

    const productIds = transfer.items.map(i => i.productId).filter(Boolean);
    const products = productIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, sku: true, price: true, unit: true }
        })
      : [];
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    const processedTransfer = {
      ...transfer,
      items: transfer.items.map(item => ({
        ...item,
        product: productMap[item.productId] || { id: item.productId, name: 'Unknown Product', sku: 'N/A', price: 0, unit: 'PCS' }
      }))
    };

    res.json(processedTransfer);
  } catch (error) {
    console.error('getTransferById Error:', error);
    res.status(500).json({ message: 'Error retrieving transfer details', error: error.message });
  }
};

// Approve transfer request
export const approveTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const tenantId = req.user.tenantId;

    const transfer = await prisma.agentStockTransfer.findFirst({
      where: { id, tenantId },
      include: { items: true }
    });

    if (!transfer) {
      return res.status(404).json({ message: 'Transfer request not found' });
    }

    if (transfer.status !== 'PENDING') {
      return res.status(400).json({ message: 'Transfer request is not pending' });
    }

    // Execute transfer in a database transaction
    await prisma.$transaction(async (tx) => {
      // 1. Decrement source vehicle stocks
      for (const item of transfer.items) {
        const sourceStock = await tx.vehicleStock.findFirst({
          where: {
            vehicleId: transfer.fromVehicleId,
            productId: item.productId,
            tenantId
          }
        });

        if (!sourceStock || sourceStock.quantity < item.quantity) {
          throw new Error(`Insufficient stock for product ID: ${item.productId}`);
        }

        await tx.vehicleStock.update({
          where: { id: sourceStock.id },
          data: {
            quantity: { decrement: item.quantity }
          }
        });

        // 2. Increment target vehicle stocks (upsert)
        const targetStock = await tx.vehicleStock.findFirst({
          where: {
            vehicleId: transfer.toVehicleId,
            productId: item.productId,
            tenantId
          }
        });

        if (targetStock) {
          await tx.vehicleStock.update({
            where: { id: targetStock.id },
            data: {
              quantity: { increment: item.quantity },
              openingQuantity: { increment: item.quantity }
            }
          });
        } else {
          await tx.vehicleStock.create({
            data: {
              tenantId,
              vehicleId: transfer.toVehicleId,
              productId: item.productId,
              quantity: item.quantity,
              openingQuantity: item.quantity
            }
          });
        }

        // Log StockTransactions for source and destination vehicles
        await tx.stockTransaction.create({
          data: {
            tenantId,
            vehicleId: transfer.fromVehicleId,
            productId: item.productId,
            quantity: item.quantity,
            type: 'RETURN', // Decrement from source vehicle
            userId: req.user.id
          }
        });

        await tx.stockTransaction.create({
          data: {
            tenantId,
            vehicleId: transfer.toVehicleId,
            productId: item.productId,
            quantity: item.quantity,
            type: 'LOAD', // Increment in destination vehicle
            userId: req.user.id
          }
        });
      }

      // 3. Update transfer status
      await tx.agentStockTransfer.update({
        where: { id },
        data: { status: 'APPROVED' }
      });

      // 4. Record approval history
      await tx.agentTransferApproval.create({
        data: {
          transferId: id,
          status: 'APPROVED',
          remarks,
          userId: req.user.id
        }
      });
    });

    // Log Activity
    await logActivity({
      tenantId,
      userId: req.user.id,
      action: 'STOCK_TRANSFER_APPROVE',
      entity: 'AGENT_TRANSFER',
      entityId: id,
      description: `Transfer approved and stock moved: ${id}`
    }).catch(err => console.warn('[Transfer Log] Activity log failed:', err.message));

    // Invalidate vehicle cache
    try {
      await InventoryCache.invalidatePrefix(`vsms:inventory:vehicle:${transfer.fromVehicleId}`);
      await InventoryCache.invalidatePrefix(`vsms:inventory:vehicle:${transfer.toVehicleId}`);
      console.log(`[TransferApprove] Cache invalidated for vehicles: ${transfer.fromVehicleId}, ${transfer.toVehicleId}`);
    } catch (cacheErr) {
      console.warn('[TransferApprove] Failed to invalidate cache:', cacheErr.message);
    }

    res.json({ success: true, message: 'Transfer approved and stock updated successfully' });
  } catch (error) {
    console.error('approveTransfer Error:', error);
    res.status(500).json({ message: 'Error approving transfer', error: error.message });
  }
};

// Reject transfer request
export const rejectTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const tenantId = req.user.tenantId;

    const transfer = await prisma.agentStockTransfer.findFirst({
      where: { id, tenantId }
    });

    if (!transfer) {
      return res.status(404).json({ message: 'Transfer request not found' });
    }

    if (transfer.status !== 'PENDING') {
      return res.status(400).json({ message: 'Transfer request is not pending' });
    }

    // Update status to REJECTED and add approval log
    await prisma.$transaction([
      prisma.agentStockTransfer.update({
        where: { id },
        data: { status: 'REJECTED' }
      }),
      prisma.agentTransferApproval.create({
        data: {
          transferId: id,
          status: 'REJECTED',
          remarks,
          userId: req.user.id
        }
      })
    ]);

    // Log Activity
    await logActivity({
      tenantId,
      userId: req.user.id,
      action: 'STOCK_TRANSFER_REJECT',
      entity: 'AGENT_TRANSFER',
      entityId: id,
      description: `Transfer rejected: ${id}`
    }).catch(err => console.warn('[Transfer Log] Activity log failed:', err.message));

    // Invalidate vehicle cache
    try {
      await InventoryCache.invalidatePrefix(`vsms:inventory:vehicle:${transfer.fromVehicleId}`);
      await InventoryCache.invalidatePrefix(`vsms:inventory:vehicle:${transfer.toVehicleId}`);
      console.log(`[TransferReject] Cache invalidated for vehicles: ${transfer.fromVehicleId}, ${transfer.toVehicleId}`);
    } catch (cacheErr) {
      console.warn('[TransferReject] Failed to invalidate cache:', cacheErr.message);
    }

    res.json({ success: true, message: 'Transfer request rejected successfully' });
  } catch (error) {
    console.error('rejectTransfer Error:', error);
    res.status(500).json({ message: 'Error rejecting transfer', error: error.message });
  }
};

// Retrieve active vehicles and their drivers
export const getActiveVehicles = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || 'VK001';
    const vehicles = await prisma.vehicle.findMany({
      where: {
        tenantId,
        status: true,
        assignedUsers: {
          some: {
            isActive: true
          }
        }
      },
      include: {
        assignedUsers: {
          where: { isActive: true },
          select: { id: true, name: true, phone: true, role: true }
        }
      }
    });
    res.json(vehicles);
  } catch (error) {
    console.error('getActiveVehicles Error:', error);
    res.status(500).json({ message: 'Error retrieving active vehicles', error: error.message });
  }
};

// Retrieve all active agents with assigned vehicles for transfer dropdown
export const getActiveAgents = async (req, res) => {
  try {
    const currentUserId = req.user?.id;
    const agents = await prisma.user.findMany({
      where: {
        isActive: true,
        assignedVehicleId: { not: null },
        ...(currentUserId ? { id: { not: currentUserId } } : {})
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        assignedVehicleId: true,
        assignedVehicle: {
          select: {
            id: true,
            vehicleNumber: true,
            vehicleName: true,
            displayId: true,
            status: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: agents });
  } catch (error) {
    console.error('getActiveAgents Error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving active agents', error: error.message });
  }
};
