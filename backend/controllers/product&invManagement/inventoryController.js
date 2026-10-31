import { prisma } from '../../config/prismaClient.js';
import logger from '../../utils/logger.js';
import { errorResponse, successResponse, paginatedResponse } from '../../utils/responseHelper.js';
import { emitCanonicalEvent } from '../../audit/auditLogger.js';
import { CANONICAL_EVENTS } from '../../audit/auditConstants.js';
import { InventoryService } from '../../services/inventoryService.js';

const getInventoryOverview = async (req, res) => {
  try {
    const {
      warehouseId,
      status,
      search,
      page = 1,
      limit = 20
    } = req.query;

    let where = {};

    const targetWarehouseId = warehouseId || req.user?.warehouseId || '00000000-0000-0000-0000-000000000000';

    // -------------------- LOCATION FILTER --------------------
    where.warehouseId = targetWarehouseId;

    // -------------------- SEARCH --------------------
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { batchNumber: { contains: search, mode: "insensitive" } },
        { hsnCode: { contains: search, mode: "insensitive" } }
      ];
    }

    // -------------------- STATUS FILTER --------------------
    if (status === "IN_STOCK") {
      where.stock = { gt: prisma.product.fields.threshold };
    }

    if (status === "LOW_STOCK") {
      where.AND = [
        { stock: { gt: 0 } },
        { stock: { lte: prisma.product.fields.threshold } }
      ];
    }

    if (status === "OUT_OF_STOCK") {
      where.stock = 0;
    }

    if (status === "NEGATIVE") {
      where.stock = { lt: 0 };
    }

    // -------------------- SUMMARY COUNTS --------------------
    const [
      totalSkus,
      lowStock,
      outOfStock,
      totalOnHandAgg
    ] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.count({
        where: {
          ...where,
          stock: { gt: 0, lte: prisma.product.fields.threshold }
        }
      }),
      prisma.product.count({
        where: { ...where, stock: 0 }
      }),
      prisma.product.aggregate({
        where,
        _sum: { stock: true }
      })
    ]);

    // -------------------- PAGINATION --------------------
    const skip = (page - 1) * limit;

    const products = await prisma.product.findMany({
      where,
      skip,
      take: Number(limit),
      include: {
        warehouse: { select: { id: true, name: true } }
      },
      orderBy: { updatedAt: "desc" }
    });

    // -------------------- TABLE FORMAT --------------------
    const tableData = products.map((p) => {
      let statusLabel = "IN_STOCK";

      if (p.stock <= 0) statusLabel = "OUT_OF_STOCK";
      else if (p.stock <= p.threshold) statusLabel = "LOW_STOCK";
      if (p.stock < 0) statusLabel = "NEGATIVE";

      return {
        id: p.id,
        thumbnail: p.images?.[0] || null,
        productName: p.name,
        sku: p.batchNumber || p.id.slice(0, 8),
        location: p.warehouse?.name || "N/A",
        onHand: p.stock,
        reserved: 0, // future use
        available: p.stock, // stock - reserved
        inbound: 0, // future GRN
        status: statusLabel
      };
    });

    logger.info("[Inventory] Overview fetched successfully");

    return successResponse(res, 200, {
      summary: {
        totalSkus,
        lowStock,
        outOfStock,
        totalOnHand: totalOnHandAgg._sum.stock || 0
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalSkus / limit)
      },
      inventory: tableData
    });

  } catch (error) {
    logger.error("[Inventory] Overview error", error);
    return errorResponse(res, 500, "Failed to fetch inventory overview");
  }
};

const createStockTransfer = async (req, res) => {
  try {
    const { fromWarehouseId, toWarehouseId, notes, items } = req.body;
    const userId = req.query.userId || req.user?.id;

    if (fromWarehouseId === toWarehouseId) {
      return errorResponse(res, 400, "From and To location cannot be same");
    }

    if (!items || !items.length) {
      return errorResponse(res, 400, "At least one SKU is required");
    }

    const transfer = await prisma.$transaction(async (tx) => {
      const newTransfer = await tx.stockTransfer.create({
        data: {
          transferCode: `TRF-${Date.now()}`,
          notes,
          fromLocation: {
            connect: { id: fromWarehouseId }
          },
          toLocation: {
            connect: { id: toWarehouseId }
          },
          items: {
            create: items.map((i) => ({
              product: {
                connect: { id: i.productId }
              },
              quantity: i.quantity
            }))
          },
          requestedBy: { connect: { id: userId } }
        }
      });

      return newTransfer;
    });

    await emitCanonicalEvent({
      eventName: CANONICAL_EVENTS.inventoryAdjusted,
      eventId: `INVENTORY_ADJUSTED:TRANSFER_CREATE:${transfer.id}`,
      entityType: "STOCK_TRANSFER",
      entityId: transfer.id,
      action: "TRANSFER_CREATED",
      afterJson: transfer,
      payload: {
        actorId: req.user?.id || userId || null,
        actorRole: req.user?.role || null,
        fromWarehouseId,
        toWarehouseId,
      },
    });

    return successResponse(res, 201, transfer, "Transfer created successfully");
  } catch (error) {
    logger.error("[TRANSFER] Create error", error);
    return errorResponse(res, 500, "Failed to create transfer");
  }
};


const getStockTransfers = async (req, res) => {
  try {
    const { status, fromWarehouseId, toWarehouseId, page = 1, limit = 20 } = req.query;

    let where = {};
    if (status) where.status = status;
    if (fromWarehouseId) where.fromLocationId = fromWarehouseId;
    if (toWarehouseId) where.toLocationId = toWarehouseId;

    const total = await prisma.stockTransfer.count({ where });

    const transfers = await prisma.stockTransfer.findMany({
      where,
      skip: (page - 1) * limit,
      take: Number(limit),
      include: {
        fromLocation: { select: { name: true } },
        toLocation: { select: { name: true } },
        requestedBy: { select: { name: true } },
        items: true
      },
      orderBy: { createdAt: "desc" }
    });

    const formatted = transfers.map((t) => ({
      id: t.id,
      transferCode: t.transferCode,
      fromLocation: t.fromLocation?.name || "Unknown",
      toLocation: t.toLocation?.name || "Unknown",
      skuCount: t.items.length,
      status: t.status,
      requestedBy: t.requestedBy?.name || "Unknown",
      requestedAt: t.createdAt
    }));

    return successResponse(res, 200, {
      total,
      page: Number(page),
      limit: Number(limit),
      transfers: formatted
    });
  } catch (error) {
    logger.error("[TRANSFER] Fetch error", error);
    return errorResponse(res, 500, "Failed to fetch transfers");
  }
};


const getTransferById = async (req, res) => {
  const { id } = req.params;

  const transfer = await prisma.stockTransfer.findUnique({
    where: { id },
    include: {
      fromLocation: true,
      toLocation: true,
      requestedBy: true,
      items: {
        include: { product: { select: { name: true } } }
      }
    }
  });

  if (!transfer) {
    return errorResponse(res, 404, "Transfer not found");
  }

  return successResponse(res, 200, transfer);
};


const updateTransferStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ["REQUESTED", "IN_TRANSIT", "COMPLETED", "CANCELLED"];
  if (!allowed.includes(status)) {
    return errorResponse(res, 400, "Invalid status");
  }

  // Fetch current transfer and check if it's already completed
  const currentTransfer = await prisma.stockTransfer.findUnique({
    where: { id },
    include: { items: true }
  });

  if (!currentTransfer) {
    return errorResponse(res, 404, "Transfer not found");
  }

  if (currentTransfer.status === "COMPLETED") {
    return errorResponse(res, 400, "Transfer is already completed");
  }

  if (currentTransfer.status === "CANCELLED") {
    return errorResponse(res, 400, "Cannot update status of a cancelled transfer");
  }

  // Update status and perform stock moves in a transaction if next status is COMPLETED
  const transfer = await prisma.$transaction(async (tx) => {
    if (status === "COMPLETED") {
      for (const item of currentTransfer.items) {
        // Deduct from source (fromLocationId)
        const fromInv = await tx.unifiedInventory.findUnique({
          where: {
            productId_productVariantId_locationId: {
              productId: item.productId,
              productVariantId: null,
              locationId: currentTransfer.fromLocationId
            }
          }
        });

        const fromOnHand = fromInv ? fromInv.onHand : 0;
        const fromReserved = fromInv ? fromInv.reserved : 0;

        await tx.unifiedInventory.upsert({
          where: {
            productId_productVariantId_locationId: {
              productId: item.productId,
              productVariantId: null,
              locationId: currentTransfer.fromLocationId
            }
          },
          update: {
            onHand: fromOnHand - item.quantity,
            available: (fromOnHand - item.quantity) - fromReserved
          },
          create: {
            productId: item.productId,
            productVariantId: null,
            locationId: currentTransfer.fromLocationId,
            onHand: -item.quantity,
            reserved: 0,
            available: -item.quantity
          }
        });

        await tx.inventoryLedger.create({
          data: {
            productId: item.productId,
            productVariantId: null,
            locationId: currentTransfer.fromLocationId,
            quantity: item.quantity,
            transactionType: "OUTWARD",
            referenceId: id,
            notes: `Stock transfer outbound: ${currentTransfer.transferCode}`
          }
        });

        // Add to destination (toLocationId)
        const toInv = await tx.unifiedInventory.findUnique({
          where: {
            productId_productVariantId_locationId: {
              productId: item.productId,
              productVariantId: null,
              locationId: currentTransfer.toLocationId
            }
          }
        });

        const toOnHand = toInv ? toInv.onHand : 0;
        const toReserved = toInv ? toInv.reserved : 0;

        await tx.unifiedInventory.upsert({
          where: {
            productId_productVariantId_locationId: {
              productId: item.productId,
              productVariantId: null,
              locationId: currentTransfer.toLocationId
            }
          },
          update: {
            onHand: toOnHand + item.quantity,
            available: (toOnHand + item.quantity) - toReserved
          },
          create: {
            productId: item.productId,
            productVariantId: null,
            locationId: currentTransfer.toLocationId,
            onHand: item.quantity,
            reserved: 0,
            available: item.quantity
          }
        });

        await tx.inventoryLedger.create({
          data: {
            productId: item.productId,
            productVariantId: null,
            locationId: currentTransfer.toLocationId,
            quantity: item.quantity,
            transactionType: "INWARD",
            referenceId: id,
            notes: `Stock transfer inbound: ${currentTransfer.transferCode}`
          }
        });
      }
    }

    return tx.stockTransfer.update({
      where: { id },
      data: { status }
    });
  });

  await emitCanonicalEvent({
    eventName: CANONICAL_EVENTS.inventoryAdjusted,
    eventId: `INVENTORY_ADJUSTED:TRANSFER_STATUS:${id}:${status}`,
    entityType: "STOCK_TRANSFER",
    entityId: id,
    action: "TRANSFER_STATUS_UPDATED",
    afterJson: transfer,
    payload: {
      actorId: req.user?.id || null,
      actorRole: req.user?.role || null,
      status,
    },
  });

  return successResponse(res, 200, transfer, "Transfer status updated");
};

const getReservations = async (req, res) => {
  try {
    const { productId, variantId, warehouseId } = req.query;

    let where = {};
    if (productId) where.productId = productId;
    if (variantId) where.productVariantId = variantId;
    if (warehouseId) where.locationId = warehouseId;

    const reservations = await prisma.inventoryReservation.findMany({
      where,
      include: {
        product: {
          select: { name: true, sku: true }
        },
        productVariant: {
          select: { variantName: true, sku: true }
        },
        location: {
          select: { name: true, code: true }
        },
        user: {
          select: { name: true }
        },
        order: {
          select: { orderNumber: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const grouped = {};
    for (const r of reservations) {
      const key = r.orderId || r.id;
      if (!grouped[key]) {
        grouped[key] = {
          id: key,
          orderId: r.order?.orderNumber || r.orderId || 'N/A',
          customerName: r.user?.name || r.order?.customerName || 'Walk-in Customer',
          locationCode: r.location?.code || r.location?.name || r.locationId || 'N/A',
          locationId: r.locationId || null,
          qty: 0,
          status: r.status === 'PENDING' ? 'active' : (r.status === 'COMPLETED' ? 'completed' : 'released'),
          rawStatus: r.status,
          isStale: r.status === 'PENDING' && (Date.now() - new Date(r.createdAt).getTime()) > 24 * 60 * 60 * 1000,
          createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
          expiresAt: r.expiresAt ? r.expiresAt.toISOString() : (r.createdAt ? new Date(r.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() : new Date().toISOString()),
          items: []
        };
      }

      grouped[key].qty += r.quantity;
      grouped[key].items.push({
        id: r.id,
        productName: r.product?.name || 'Unknown Product',
        variantName: r.productVariant?.variantName || 'Standard',
        sku: r.productVariant?.sku || r.product?.sku || 'N/A',
        qty: r.quantity,
        variantId: r.productVariantId || r.productId
      });

      if (r.status === 'PENDING') {
        grouped[key].status = 'active';
        grouped[key].rawStatus = 'PENDING';
      }
    }

    const mapped = Object.values(grouped);

    return successResponse(res, 200, mapped, "Reservations retrieved successfully");
  } catch (error) {
    logger.error("Error fetching reservations", { error: error.message });
    return errorResponse(res, 500, "Internal server error: " + error.message);
  }
};

const releaseReservationById = async (req, res) => {
  try {
    const { id } = req.params;
    const { releaseReason } = req.body || {};
    const userId = req.user?.id || null;

    const reservation = await prisma.inventoryReservation.findFirst({
      where: {
        OR: [
          { id },
          { orderId: id }
        ]
      }
    });

    if (!reservation) {
      return errorResponse(res, 404, "No reservation found for ID: " + id);
    }

    if (reservation.status !== 'PENDING') {
      return errorResponse(res, 400, `Cannot release reservation ${id}. Current status is '${reservation.status}'`);
    }

    await InventoryService.forceReleaseReservation({
      reservationId: reservation.id,
      releaseReason: releaseReason || 'Admin Force Release',
      releasedBy: userId
    });

    logger.info(`[InventoryController] Force released reservation ${id} by user ${userId}`);
    return successResponse(res, 200, null, "Reservation released successfully");
  } catch (error) {
    logger.error("Error releasing reservation", { error: error.message });
    return errorResponse(res, 500, error.message || "Internal server error");
  }
};

export { 
    getInventoryOverview,
    createStockTransfer,
    getStockTransfers,
    getTransferById,
    updateTransferStatus,
    getReservations,
    releaseReservationById
 };