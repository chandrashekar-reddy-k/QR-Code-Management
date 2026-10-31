import { prisma } from '../../config/prismaClient.js';
import logger from '../../utils/logger.js';
import { errorResponse, successResponse, paginatedResponse } from '../../utils/responseHelper.js';

//================= CREATE (ADJUST STOCK) =================//
export const adjustStock = async (req, res) => {
  const { productId, warehouseId, adjustmentType, reason, quantity, notes } = req.body;
  const userId = req.user?.id || "admin"; // or get from auth

  try {
    logger.info("[STOCK] Adjust request received", req.body);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, stock: true, warehouseId: true, name: true }
    });

    if (!product) return errorResponse(res, 404, "Product not found");
    if (product.warehouseId !== warehouseId)
      return errorResponse(res, 400, "Product does not belong to this warehouse");

    let previousStock = product.stock;
    let newStock = previousStock;

    if (adjustmentType === "INCREASE") newStock += quantity;
    if (adjustmentType === "DECREASE") {
      if (previousStock < quantity) return errorResponse(res, 400, "Insufficient stock");
      newStock -= quantity;
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: { stock: newStock }
      });

      return await tx.stockAdjust.create({
        data: {
          productId,
          warehouseId,
          adjustmentType,
          reason,
          quantity,
          notes,
          previousStock,
          newStock,
          createdById: userId
        }
      });
    });

    logger.info("[STOCK] Adjusted successfully", { productId, newStock });
    return successResponse(res, 200, result, "Stock adjusted successfully");

  } catch (err) {
    logger.error("[STOCK] Adjustment failed", err);
    return errorResponse(res, 500, "Stock adjustment failed");
  }
};

//================= GET HISTORY LIST =================//
export const getStockAdjustHistory = async (req, res) => {
  try {
    const { productId, warehouseId } = req.query;

    const where = {
      ...(productId && { productId }),
      ...(warehouseId && { warehouseId })
    };

    logger.info("[STOCK] Fetching history", where);

    const history = await prisma.stockAdjust.findMany({
      where,
      include: {
        product: { select: { name: true } },
        warehouse: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return successResponse(res, 200, history);

  } catch (err) {
    logger.error("[STOCK] History fetch failed", err);
    return errorResponse(res, 500, "Failed to load history");
  }
};

//================= GET BY ID =================//
export const getStockAdjustById = async (req, res) => {
  try {
    logger.info("[STOCK] Fetching adjustment record", { id: req.params.id });

    const record = await prisma.stockAdjust.findUnique({
      where: { id: req.params.id },
      include: {
        product: { select: { name: true, images: true } },
        warehouse: { select: { id: true, name: true } }
      }
    });

    if (!record) return errorResponse(res, 404, "Adjustment record not found");
    return successResponse(res, 200, record);

  } catch (err) {
    logger.error("[STOCK] Fetch by id failed", err);
    return errorResponse(res, 500, "Failed to fetch record");
  }
};