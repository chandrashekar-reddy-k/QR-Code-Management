import { prisma } from '../../config/prismaClient.js';
import logger from '../../utils/logger.js';
import { errorResponse, successResponse, paginatedResponse } from '../../utils/responseHelper.js';

const createGRN = async (req, res) => {
  try {
    const { supplierId, warehouseId, linkedPO, items } = req.body;
    const userId = req.user?.id || req.query.userId;
    const targetWarehouseId = warehouseId || req.user?.warehouseId;

    if (!items || !items.length) {
      return errorResponse(res, 400, "At least one product is required");
    }

    const grn = await prisma.goodsReceipt.create({
      data: {
        grnCode: `GRN-${Date.now()}`,
        supplierId,
        warehouseId: targetWarehouseId,
        linkedPO,
        createdById: userId,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity
          }))
        }
      }
    });

    return successResponse(res, 201, grn, "GRN created successfully");
  } catch (error) {
    logger.error("[GRN] Create error", error);
    return errorResponse(res, 500, "Failed to create GRN");
  }
};


const getGRNs = async (req, res) => {
  try {
    const { status, supplierId, warehouseId, page = 1, limit = 20 } = req.query;
    const targetWarehouseId = warehouseId || req.user?.warehouseId || '00000000-0000-0000-0000-000000000000';

    let where = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;
    where.warehouseId = targetWarehouseId;

    const total = await prisma.goodsReceipt.count({ where });

    const grns = await prisma.goodsReceipt.findMany({
      where,
      skip: (page - 1) * limit,
      take: Number(limit),
      include: {
        supplier: { select: { companyName: true } },
        warehouse: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    const formatted = grns.map((g) => ({
      id: g.id,
      grnCode: g.grnCode,
      supplier: g.supplier.companyName,
      location: g.warehouse.name,
      status: g.status,
      receivedAt: g.receivedAt,
      linkedPO: g.linkedPO
    }));

    return successResponse(res, 200, {
      total,
      page: Number(page),
      limit: Number(limit),
      grns: formatted
    });
  } catch (error) {
    logger.error("[GRN] Fetch error", error);
    return errorResponse(res, 500, "Failed to fetch GRNs");
  }
};


const getGRNById = async (req, res) => {
  const { id } = req.params;

  const grn = await prisma.goodsReceipt.findUnique({
    where: { id },
    include: {
      supplier: true,
      warehouse: true,
      items: {
        include: {
          product: { select: { name: true, images: true } }
        }
      }
    }
  });

  if (!grn) {
    return errorResponse(res, 404, "GRN not found");
  }

  return successResponse(res, 200, grn);
};


const completeGRN = async (req, res) => {
  const { id } = req.params;

  const grn = await prisma.goodsReceipt.findUnique({
    where: { id },
    include: { items: true }
  });

  if (!grn || grn.status !== "DRAFT") {
    return errorResponse(res, 400, "GRN not found or already completed");
  }

  await prisma.$transaction(async (tx) => {
    for (const item of grn.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: { increment: item.quantity }
        }
      });
    }

    await tx.goodsReceipt.update({
      where: { id },
      data: {
        status: "COMPLETED",
        receivedAt: new Date()
      }
    });
  });

  return successResponse(res, 200, null, "GRN completed successfully");
};

export {
    createGRN,
    getGRNs,
    getGRNById,
    completeGRN
}