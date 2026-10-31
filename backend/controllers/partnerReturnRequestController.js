import { randomUUID } from "crypto";
import { prisma } from "../config/prismaClient.js";
import logger from "../utils/logger.js";
import { errorResponse, successResponse, paginatedResponse } from "../utils/responseHelper.js";

/**
 * Resolves warehouseId for the authenticated partner.
 */
const resolveWarehouseId = async (reqUser) => {
  if (reqUser?.warehouseId) {
    return reqUser.warehouseId;
  }

  try {
    const emailOrPhone = reqUser?.email || reqUser?.phone;
    if (emailOrPhone) {
      const found = await prisma.user.findFirst({
        where: {
          OR: [
            ...(reqUser.email ? [{ email: reqUser.email }] : []),
            ...(reqUser.phone ? [{ phone: reqUser.phone }] : [])
          ]
        },
        select: { warehouseId: true }
      });
      if (found?.warehouseId) return found.warehouseId;
    }

    if (reqUser?.id) {
      const byId = await prisma.user.findUnique({
        where: { id: reqUser.id },
        select: { warehouseId: true }
      });
      if (byId?.warehouseId) return byId.warehouseId;
    }
  } catch (err) {
    logger.warn("resolveWarehouseId query failed in partnerReturnRequestController", err);
  }
  return null;
};

/**
 * Restores returned stock to ChannelInventory (channel: 'ONLINE_APP'), Product.stock, ProductVariant, and UnifiedInventory.
 */
export async function restoreOnlineStock(dbClient, { productId, productVariantId = null, quantity, warehouseId, unitPrice = 0 }) {
  const qty = Number(quantity) || 0;
  if (qty <= 0 || !productId) return;

  const targetWhId = warehouseId || null;

  try {
    // 1. ChannelInventory (ONLINE_APP)
    const existingOnlineInv = await dbClient.channelInventory.findFirst({
      where: {
        productId,
        channel: { in: ['ONLINE_APP', 'ONLINE', 'APP'] },
        ...(productVariantId ? { productVariantId } : {}),
        ...(targetWhId ? { warehouseId: targetWhId } : {})
      }
    }) || await dbClient.channelInventory.findFirst({
      where: {
        productId,
        channel: { in: ['ONLINE_APP', 'ONLINE', 'APP'] },
        ...(productVariantId ? { productVariantId } : {})
      }
    });

    if (existingOnlineInv) {
      await dbClient.channelInventory.update({
        where: { id: existingOnlineInv.id },
        data: {
          quantity: { increment: qty },
          isActive: true
        }
      });
      logger.info(`[RestoreStock] ChannelInventory ONLINE_APP updated for product ${productId}: +${qty}`);
    } else if (targetWhId) {
      await dbClient.channelInventory.create({
        data: {
          id: randomUUID(),
          channel: 'ONLINE_APP',
          warehouseId: targetWhId,
          productId,
          productVariantId: productVariantId || null,
          quantity: qty,
          channelPrice: Number(unitPrice) || 0,
          isActive: true
        }
      });
      logger.info(`[RestoreStock] ChannelInventory ONLINE_APP created for product ${productId}: qty ${qty}`);
    }
  } catch (err) {
    logger.warn(`[RestoreStock] ChannelInventory update warning: ${err.message}`);
  }

  // 2. Base Product stock
  try {
    await dbClient.product.update({
      where: { id: productId },
      data: { stock: { increment: qty } }
    });
  } catch (err) {
    logger.warn(`[RestoreStock] Product stock update warning: ${err.message}`);
  }

  // 3. ProductVariant stockQuantity (if applicable)
  if (productVariantId) {
    try {
      await dbClient.productVariant.update({
        where: { id: productVariantId },
        data: { stockQuantity: { increment: qty } }
      });
    } catch (err) {
      logger.warn(`[RestoreStock] ProductVariant stock update warning: ${err.message}`);
    }
  }

  // 4. UnifiedInventory (Warehouse level)
  try {
    const wi = await dbClient.unifiedInventory.findFirst({
      where: {
        productId,
        ...(productVariantId ? { productVariantId } : {}),
        ...(targetWhId ? {
          location: {
            OR: [
              { warehouseId: targetWhId },
              { storeId: targetWhId }
            ]
          }
        } : {})
      }
    }) || await dbClient.unifiedInventory.findFirst({
      where: {
        productId,
        ...(productVariantId ? { productVariantId } : {})
      }
    });

    if (wi) {
      await dbClient.unifiedInventory.update({
        where: { id: wi.id },
        data: {
          onHand: { increment: qty },
          available: { increment: qty }
        }
      });
    }
  } catch (err) {
    logger.warn(`[RestoreStock] UnifiedInventory update warning: ${err.message}`);
  }
}

/**
 * List returns for partner's warehouse.
 */
export const listPartnerReturnRequests = async (req, res) => {
  try {
    const userId = req.user?.id;
    let { page, limit, status, search } = req.query;

    page = parseInt(page) > 0 ? parseInt(page) : 1;
    limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
    const skip = (page - 1) * limit;

    const warehouseId = await resolveWarehouseId(req.user);
    if (!warehouseId) {
      return errorResponse(res, 403, "Warehouse not configured for your account.");
    }

    const where = {
      order: {
        warehouseId: warehouseId,
      },
    };

    if (status && status.trim() !== "") {
      const s = status.toUpperCase();
      if (s === "PENDING") {
        where.toPhase = { in: ["REQUESTED", "PENDING", "RETURN_INITIATED", "PARTNER_APPROVAL_PENDING"] };
      } else if (s === "APPROVED") {
        where.toPhase = { in: ["APPROVED", "PARTIALLY_APPROVED", "RETURN_RECEIVED_AT_WAREHOUSE", "REFUND_INITIATED", "REFUND_COMPLETED"] };
      } else if (s === "REJECTED") {
        where.toPhase = { in: ["REJECTED", "CANCELLED"] };
      } else {
        where.toPhase = s;
      }
    }

    if (search && search.trim() !== "") {
      const trimmedSearch = search.trim();
      where.OR = [
        { order: { orderNumber: { contains: trimmedSearch, mode: "insensitive" } } },
      ];
    }

    // Now uses OrderReturnHistory
    const [returnRequests, total] = await Promise.all([
      prisma.orderReturnHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              totalAmount: true,
              consumer: { select: { id: true, name: true, phone: true } },
              items: {
                include: {
                  product: { select: { id: true, name: true, images: true } }
                }
              }
            }
          },
        },
      }),
      prisma.orderReturnHistory.count({ where }),
    ]);

    // Map database items to frontend-expected fields
    const formattedRequests = returnRequests.map((rr) => {
      const metadata = rr.metadata || {};
      const metaItems = Array.isArray(metadata.items) ? metadata.items : [];
      
      const rawItems = metaItems.length > 0
        ? metaItems
        : (rr.order?.items || []).map(oi => ({
            orderItemId: oi.id,
            productId: oi.productId,
            productName: oi.productName || oi.product?.name || "Product Item",
            quantity: oi.quantity || 1,
            unitPrice: oi.unitPrice || 0,
            requestedAmount: oi.totalPrice || ((oi.unitPrice || 0) * (oi.quantity || 1)),
            status: "PENDING"
          }));

      // Only show items belonging to this partner (fallback to all if partnerId is null)
      const partnerItems = rawItems
        .filter(i => !i.partnerId || i.partnerId === warehouseId || i.partnerId === userId)
        .map(i => {
          const orderItem = rr.order?.items?.find(oi => oi.id === (i.orderItemId || i.id));
          const unitPrice = Number(i.unitPrice ?? orderItem?.unitPrice ?? 0);
          const quantity = Number(i.quantity || orderItem?.quantity || 1);
          const totalPrice = Number(i.requestedAmount || (orderItem ? (unitPrice * quantity) : (unitPrice * quantity)));
          return {
            id: i.orderItemId || i.id || orderItem?.id,
            orderItemId: i.orderItemId || i.id || orderItem?.id,
            productName: i.productName || orderItem?.productName || orderItem?.product?.name || "Product Item",
            quantity,
            unitPrice,
            totalPrice,
            status: i.status || "PENDING"
          };
        });
      
      const totalQty = partnerItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalAmount = metadata.requestedAmount || partnerItems.reduce((sum, item) => sum + item.totalPrice, 0) || rr.order?.totalAmount || 0;
      const firstItemName = partnerItems[0]?.productName || rr.order?.items?.[0]?.product?.name || "Order Products";

      // Map database phase (e.g. REQUESTED) to frontend lowercase status
      let mappedStatus = "pending";
      const toPhaseUpper = rr.toPhase?.toUpperCase();
      if (["APPROVED", "PARTIALLY_APPROVED", "RETURN_RECEIVED_AT_WAREHOUSE", "REFUND_INITIATED", "REFUND_COMPLETED"].includes(toPhaseUpper)) {
        mappedStatus = "approved";
      } else if (["REJECTED", "CANCELLED"].includes(toPhaseUpper)) {
        mappedStatus = "rejected";
      } else if (toPhaseUpper === "COMPLETED") {
        mappedStatus = "completed";
      }

      return {
        id: rr.id,
        orderId: rr.orderId,
        userId: rr.order?.consumer?.id || "N/A",
        name: rr.order?.consumer?.name || "N/A",
        productName: firstItemName,
        quantity: totalQty || 1,
        total: totalAmount,
        status: mappedStatus,
        toPhase: rr.toPhase,
        reason: rr.reason || "N/A",
        date: rr.createdAt.toISOString(),
        orderNumber: rr.order?.orderNumber || "N/A",
        items: partnerItems
      };
    });

    return paginatedResponse(
      res,
      200,
      formattedRequests,
      { total, page, limit },
      "Return requests fetched successfully"
    );
  } catch (error) {
    logger.error("[PartnerReturnRequests] Error listing return requests", {
      error: error.stack || error.message,
      userId: req.user?.id,
    });
    return errorResponse(res, 500, "Failed to fetch return requests");
  }
};

/**
 * Send an internal command to OMS to handle approval/rejection.
 */
const callOmsDecision = async (returnId, payload, authToken) => {
  // Use OMS_CORE_URL (set in .env) which points to the correct admin-apis base.
  // Route is /oms/returns/:id/item-decision — NOT /admin/oms/returns
  const OMS_BASE = process.env.OMS_CORE_URL || 'http://localhost:3001/api/v1/oms';
  const OMS_URL = `${OMS_BASE}/returns`;
  try {
    const response = await fetch(`${OMS_URL}/${returnId}/item-decision`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
       const errorData = await response.json();
       throw new Error(errorData.message || 'OMS Core rejected the command');
    }
    return await response.json();
  } catch (error) {
    logger.error("Failed to call OMS for item decision", error.message);
    throw error;
  }
}

export const approveReturnItem = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id: returnId } = req.params;
    const { orderItemId } = req.body || {};
    
    const warehouseId = await resolveWarehouseId(req.user);
    if (!warehouseId) {
      return errorResponse(res, 403, "Warehouse not configured for your account.");
    }

    const returnHistory = await prisma.orderReturnHistory.findUnique({
      where: { id: returnId },
      include: { order: { include: { items: true } } }
    });

    if (!returnHistory) {
      return errorResponse(res, 404, "Return request not found");
    }

    const metadata = (typeof returnHistory.metadata === "object" && returnHistory.metadata)
      ? { ...returnHistory.metadata }
      : {};
    const metaItems = Array.isArray(metadata.items) ? metadata.items : [];

    const updatedItems = metaItems.length > 0
      ? metaItems.map(item => {
          if (!orderItemId || item.orderItemId === orderItemId) {
            return { ...item, status: "APPROVED" };
          }
          return item;
        })
      : (returnHistory.order?.items || []).map(oi => ({
          orderItemId: oi.id,
          productId: oi.productId,
          quantity: oi.quantity,
          requestedAmount: oi.totalPrice || (oi.unitPrice * oi.quantity),
          status: "APPROVED"
        }));

    metadata.items = updatedItems;
    metadata.approvedAt = new Date().toISOString();
    metadata.approvedBy = userId;

    await prisma.orderReturnHistory.update({
      where: { id: returnId },
      data: {
        toPhase: "APPROVED",
        metadata
      }
    });

    await prisma.returnRequest.updateMany({
      where: { orderId: returnHistory.orderId },
      data: { status: "APPROVED" }
    }).catch(() => {});

    // Attempt OMS Core sync if configured
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      callOmsDecision(returnId, {
        orderItemId: orderItemId || updatedItems[0]?.orderItemId,
        partnerId: warehouseId,
        decision: "APPROVED",
        decidedBy: userId
      }, token).catch(err => logger.warn(`[PartnerReturns] OMS decision note: ${err.message}`));
    }

    return successResponse(res, 200, { returnId, phase: "APPROVED" }, "Return request approved and queued for refund processing");
  } catch (error) {
    logger.error("[PartnerReturns] approveReturnItem error", error);
    return errorResponse(res, 400, error.message);
  }
};

export const rejectReturnItem = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id: returnId } = req.params;
    const { orderItemId, reason } = req.body || {};
    
    if (!reason) {
      return errorResponse(res, 400, "Rejection reason is required.");
    }

    const warehouseId = await resolveWarehouseId(req.user);
    if (!warehouseId) {
      return errorResponse(res, 403, "Warehouse not configured for your account.");
    }

    const returnHistory = await prisma.orderReturnHistory.findUnique({
      where: { id: returnId },
      include: { order: { include: { items: true } } }
    });

    if (!returnHistory) {
      return errorResponse(res, 404, "Return request not found");
    }

    const metadata = (typeof returnHistory.metadata === "object" && returnHistory.metadata)
      ? { ...returnHistory.metadata }
      : {};
    const metaItems = Array.isArray(metadata.items) ? metadata.items : [];

    const updatedItems = metaItems.length > 0
      ? metaItems.map(item => {
          if (!orderItemId || item.orderItemId === orderItemId) {
            return { ...item, status: "REJECTED", rejectionReason: reason };
          }
          return item;
        })
      : (returnHistory.order?.items || []).map(oi => ({
          orderItemId: oi.id,
          productId: oi.productId,
          quantity: oi.quantity,
          requestedAmount: oi.totalPrice || (oi.unitPrice * oi.quantity),
          status: "REJECTED",
          rejectionReason: reason
        }));

    metadata.items = updatedItems;
    metadata.rejectedAt = new Date().toISOString();
    metadata.rejectedBy = userId;
    metadata.rejectionReason = reason;

    await prisma.orderReturnHistory.update({
      where: { id: returnId },
      data: {
        toPhase: "REJECTED",
        reason: reason || returnHistory.reason,
        metadata
      }
    });

    await prisma.returnRequest.updateMany({
      where: { orderId: returnHistory.orderId },
      data: { status: "REJECTED" }
    }).catch(() => {});

    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      callOmsDecision(returnId, {
        orderItemId: orderItemId || updatedItems[0]?.orderItemId,
        partnerId: warehouseId,
        decision: "REJECTED",
        reason,
        decidedBy: userId
      }, token).catch(err => logger.warn(`[PartnerReturns] OMS rejection note: ${err.message}`));
    }

    return successResponse(res, 200, { returnId, phase: "REJECTED" }, "Return request rejected");
  } catch (error) {
    logger.error("[PartnerReturns] rejectReturnItem error", error);
    return errorResponse(res, 400, error.message);
  }
};

/**
 * PATCH /api/v1/partner/return-requests/:id/phase
 * Update return request to any specified flow step
 */
export const updateReturnPhase = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id: returnId } = req.params;
    const { phase, status } = req.body || {};
    
    const targetPhase = (phase || status || '').toUpperCase();
    if (!targetPhase) {
      return errorResponse(res, 400, "Target phase is required");
    }

    const warehouseId = await resolveWarehouseId(req.user);
    if (!warehouseId) {
      return errorResponse(res, 403, "Warehouse not configured for your account.");
    }

    const returnHistory = await prisma.orderReturnHistory.findUnique({
      where: { id: returnId },
      include: { order: { include: { items: true } } }
    });

    if (!returnHistory) {
      return errorResponse(res, 404, "Return request not found");
    }

    const metadata = (typeof returnHistory.metadata === "object" && returnHistory.metadata)
      ? { ...returnHistory.metadata }
      : {};
    
    metadata.lastUpdatedPhase = targetPhase;
    metadata.updatedAt = new Date().toISOString();
    metadata.updatedBy = userId;

    await prisma.orderReturnHistory.update({
      where: { id: returnId },
      data: {
        toPhase: targetPhase,
        metadata
      }
    });

    // Also update ReturnRequest record status
    let rrStatus = "PENDING";
    if (["APPROVED", "PARTIALLY_APPROVED"].includes(targetPhase)) rrStatus = "APPROVED";
    else if (["PICKUP_ASSIGNED", "OUT_FOR_PICKUP", "RETURN_OUT_FOR_PICKUP", "RETURN_PICKUP_ASSIGNED"].includes(targetPhase)) rrStatus = "PICKUP_ASSIGNED";
    else if (["PICKUP_COMPLETED", "RETURN_IN_TRANSIT"].includes(targetPhase)) rrStatus = "IN_TRANSIT";
    else if (["RETURN_RECEIVED_AT_WAREHOUSE"].includes(targetPhase)) rrStatus = "RECEIVED";
    else if (["REFUND_PROCESSING", "ADMIN_REFUND_PENDING"].includes(targetPhase)) rrStatus = "REFUND_PROCESSING";
    else if (["COMPLETED", "REFUND_COMPLETED", "REFUNDED"].includes(targetPhase)) rrStatus = "COMPLETED";
    else if (["REJECTED", "FAILED"].includes(targetPhase)) rrStatus = "REJECTED";

    await prisma.returnRequest.updateMany({
      where: { orderId: returnHistory.orderId },
      data: { status: rrStatus }
    }).catch(() => {});

    // If return reached warehouse receipt or terminal completed status, ensure items are restored to online stock
    if (["RETURN_RECEIVED_AT_WAREHOUSE", "COMPLETED", "REFUND_COMPLETED", "REFUNDED"].includes(targetPhase) && !metadata.stockRestored) {
      try {
        const orderItems = returnHistory.order?.items || [];
        for (const item of orderItems) {
          const matchedMeta = Array.isArray(metadata.items) ? metadata.items.find(m => m.orderItemId === item.id) : null;
          if (matchedMeta && matchedMeta.status === "REJECTED") continue;
          const restoreQty = Number(matchedMeta?.quantity || item.quantity || 0);
          if (restoreQty <= 0) continue;

          await restoreOnlineStock(prisma, {
            productId: item.productId,
            productVariantId: item.productVariantId || null,
            quantity: restoreQty,
            warehouseId,
            unitPrice: item.unitPrice || 0
          });
        }
        metadata.stockRestored = true;
        metadata.stockRestoredAt = new Date().toISOString();
        await prisma.orderReturnHistory.update({
          where: { id: returnId },
          data: { metadata }
        }).catch(() => {});
      } catch (stockErr) {
        logger.warn(`[PartnerReturns] Stock restore in updateReturnPhase warning: ${stockErr.message}`);
      }
    }

    logger.info(`[PartnerReturns] Return #${returnId} phase updated to ${targetPhase}`);

    return successResponse(res, 200, { returnId, phase: targetPhase }, `Return status updated to ${targetPhase}`);
  } catch (error) {
    logger.error("[PartnerReturns] updateReturnPhase error", error);
    return errorResponse(res, 500, "Failed to update return phase");
  }
};

/**
 * POST /api/v1/partner/return-requests/:id/receive
 * Partner confirms returned items arrived at warehouse and performs QC.
 * Body: {
 *   items: [ { orderItemId, qcStatus: 'PASSED' | 'FAILED', qcNotes?: string } ]
 * }
 * Effects:
 *  - Updates OMS return phase to RETURN_RECEIVED_AT_WAREHOUSE via OMS Core API
 *  - For PASSED items: triggers stock increment (inventory reconciliation)
 *  - For FAILED items: quarantines stock (no saleable inventory update)
 */
export const confirmWarehouseReceipt = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: returnId } = req.params;
    const { items: qcItems } = req.body;

    if (!Array.isArray(qcItems) || qcItems.length === 0) {
      return errorResponse(res, 400, 'items array with QC results is required');
    }

    const warehouseId = await resolveWarehouseId(req.user);
    if (!warehouseId) {
      return errorResponse(res, 403, 'Warehouse not configured for your account.');
    }

    // Fetch return history from local DB
    const returnHistory = await prisma.orderReturnHistory.findUnique({
      where: { id: returnId },
      include: { order: { include: { items: true } } }
    });

    if (!returnHistory) {
      return errorResponse(res, 404, 'Return request not found');
    }

    // Only allow receipt confirmation if pickup is completed
    if (!['PICKUP_COMPLETED', 'APPROVED', 'PARTIALLY_APPROVED'].includes(returnHistory.toPhase)) {
      return errorResponse(res, 400, `Cannot confirm receipt. Return is in phase: ${returnHistory.toPhase}`);
    }

    const metadata = (typeof returnHistory.metadata === 'object' && returnHistory.metadata)
      ? { ...returnHistory.metadata }
      : {};
    const metaItems = Array.isArray(metadata.items) ? metadata.items : [];

    // Merge QC results into metadata items
    const qcMap = {};
    qcItems.forEach(qi => { qcMap[qi.orderItemId] = qi; });

    metadata.items = metaItems.map(item => {
      const qc = qcMap[item.orderItemId];
      if (!qc) return item;
      return {
        ...item,
        qcStatus: qc.qcStatus,
        qcNotes: qc.qcNotes || null,
        qcVerifiedAt: new Date().toISOString(),
        qcVerifiedBy: userId
      };
    });
    metadata.warehouseReceivedAt = new Date().toISOString();
    metadata.warehouseReceivedBy = userId;

    // Update return phase and reconcile inventory in a transaction
    await prisma.$transaction(async (tx) => {
      // Update the return phase
      await tx.orderReturnHistory.update({
        where: { id: returnId },
        data: { toPhase: 'RETURN_RECEIVED_AT_WAREHOUSE', metadata }
      });

      // Reconcile stock for QC-passed items
      for (const qcItem of qcItems) {
        if (qcItem.qcStatus !== 'PASSED') continue; // FAILED = quarantine

        const orderItem = returnHistory.order?.items?.find(i => i.id === qcItem.orderItemId);
        if (!orderItem) continue;

        const returnedQty = metaItems.find(mi => mi.orderItemId === qcItem.orderItemId)?.quantity || 0;
        if (returnedQty <= 0) continue;

        const stockIdentifier = orderItem.productVariantId
          ? { productVariantId: orderItem.productVariantId }
          : { productId: orderItem.productId };

        try {
          await tx.stock.updateMany({
            where: { ...stockIdentifier, warehouseId },
            data: { available: { increment: returnedQty } }
          });
          logger.info('[WarehouseReceipt] Stock replenished', { ...stockIdentifier, warehouseId, qty: returnedQty, returnId });
        } catch (stockErr) {
          logger.warn('[WarehouseReceipt] Stock update skipped (non-fatal)', { msg: stockErr.message });
        }

        // Restore stock to ChannelInventory (channel: 'ONLINE_APP'), Product.stock, ProductVariant, and UnifiedInventory
        await restoreOnlineStock(tx, {
          productId: orderItem.productId,
          productVariantId: orderItem.productVariantId || null,
          quantity: returnedQty,
          warehouseId,
          unitPrice: orderItem.unitPrice || 0
        });
      }
    });

    logger.info('[PartnerReturn] Warehouse receipt confirmed', { returnId, userId, warehouseId });

    return successResponse(res, 200,
      { returnId, phase: 'RETURN_RECEIVED_AT_WAREHOUSE' },
      'Warehouse receipt confirmed. Return is now pending refund processing.'
    );
  } catch (error) {
    logger.error('[PartnerReturn] confirmWarehouseReceipt error', { error: error.message });
    return errorResponse(res, 500, 'Failed to confirm warehouse receipt');
  }
};

export const getReturnRequestById = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id: returnId } = req.params;

    const warehouseId = await resolveWarehouseId(req.user);
    if (!warehouseId) {
      return errorResponse(res, 403, "Warehouse not configured for your account.");
    }

    const returnRequest = await prisma.orderReturnHistory.findFirst({
      where: {
        id: returnId,
        order: {
          warehouseId: warehouseId
        }
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            consumer: { select: { id: true, name: true, phone: true } },
            items: {
              include: {
                product: { select: { id: true, name: true, images: true } }
              }
            }
          }
        }
      }
    });

    if (!returnRequest) {
      return errorResponse(res, 404, "Return request not found.");
    }

    const metadata = returnRequest.metadata || {};
    const metaItems = Array.isArray(metadata.items) ? metadata.items : [];
    
    const rawItems = metaItems.length > 0
      ? metaItems
      : (returnRequest.order?.items || []).map(oi => ({
          orderItemId: oi.id,
          productId: oi.productId,
          productName: oi.productName || oi.product?.name || "Product Item",
          quantity: oi.quantity || 1,
          unitPrice: oi.unitPrice || 0,
          requestedAmount: oi.totalPrice || ((oi.unitPrice || 0) * (oi.quantity || 1)),
          status: "PENDING"
        }));

    const partnerItems = rawItems
      .filter(i => !i.partnerId || i.partnerId === warehouseId || i.partnerId === userId)
      .map(i => {
        const orderItem = returnRequest.order?.items?.find(oi => oi.id === (i.orderItemId || i.id));
        const unitPrice = Number(i.unitPrice ?? orderItem?.unitPrice ?? 0);
        const quantity = Number(i.quantity || orderItem?.quantity || 1);
        const totalPrice = Number(i.requestedAmount || (orderItem ? (unitPrice * quantity) : (unitPrice * quantity)));
        return {
          id: i.orderItemId || i.id || orderItem?.id,
          orderItemId: i.orderItemId || i.id || orderItem?.id,
          productName: i.productName || orderItem?.productName || orderItem?.product?.name || "Product Item",
          quantity,
          unitPrice,
          totalPrice,
          status: i.status || "PENDING"
        };
      });

    const totalQty = partnerItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = metadata.requestedAmount || partnerItems.reduce((sum, item) => sum + item.totalPrice, 0) || returnRequest.order?.totalAmount || 0;
    const firstItemName = partnerItems[0]?.productName || returnRequest.order?.items?.[0]?.product?.name || "Order Products";

    let mappedStatus = "pending";
    const toPhaseUpper = returnRequest.toPhase?.toUpperCase();
    if (["APPROVED", "PARTIALLY_APPROVED", "RETURN_RECEIVED_AT_WAREHOUSE", "REFUND_INITIATED", "REFUND_COMPLETED"].includes(toPhaseUpper)) {
      mappedStatus = "approved";
    } else if (["REJECTED", "CANCELLED"].includes(toPhaseUpper)) {
      mappedStatus = "rejected";
    } else if (toPhaseUpper === "COMPLETED") {
      mappedStatus = "completed";
    }

    const formattedRequest = {
      id: returnRequest.id,
      orderId: returnRequest.orderId,
      userId: returnRequest.order?.consumer?.id || "N/A",
      name: returnRequest.order?.consumer?.name || "N/A",
      productName: firstItemName,
      quantity: totalQty || 1,
      total: totalAmount,
      status: returnRequest.toPhase,
      toPhase: returnRequest.toPhase,
      reason: returnRequest.reason || "N/A",
      date: returnRequest.createdAt.toISOString(),
      orderNumber: returnRequest.order?.orderNumber || "N/A",
      items: partnerItems
    };

    return successResponse(res, 200, formattedRequest, "Return request details fetched successfully");
  } catch (error) {
    logger.error("[PartnerReturnRequests] Error getting return request by id", {
      error: error.stack || error.message,
      userId: req.user?.id,
    });
    return errorResponse(res, 500, "Failed to fetch return request details");
  }
};
