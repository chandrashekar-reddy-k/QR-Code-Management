import { prisma } from "../../config/prismaClient.js";
import logger from "../../utils/logger.js";
import { successResponse, errorResponse } from "../../utils/responseHelper.js";

const getInventoryAlerts = async (req, res) => {
  try {
    const { type = "all", warehouseId, search, page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    // dhjshfkjsf
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(warehouseId && { warehouseId }),
        ...(search && {
          name: { contains: search, mode: "insensitive" }
        })
      },
      skip,
      take: Number(limit),
      include: {
        warehouse: { select: { id: true, name: true } }
      },
      orderBy: { updatedAt: "desc" }
    });

    const alerts = products
      .map((p) => {
        let alertType = null;

        if (p.stock < 0) alertType = "NEGATIVE_STOCK";
        else if (p.stock === 0) alertType = "OUT_OF_STOCK";
        else if (p.stock <= p.threshold) alertType = "LOW_STOCK";

        return alertType
          ? {
            productId: p.id,
            productName: p.name,
            warehouse: p.warehouse,
            stock: p.stock,
            threshold: p.threshold,
            alertType,
            updatedAt: p.updatedAt
          }
          : null;
      })
      .filter(Boolean);

    // Optional: filter by type
    const filteredAlerts =
      type === "all"
        ? alerts
        : alerts.filter((a) => a.alertType === type);

    logger.info("[Alerts] Fetched inventory alerts");

    return successResponse(res, 200, filteredAlerts, "Alerts fetched successfully");
  } catch (err) {
    logger.error("[Alerts] Fetch failed", err);
    return errorResponse(res, 500, "Failed to fetch alerts");
  }
};



const getInventoryAlertByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        warehouse: { select: { id: true, name: true } }
      }
    });

    if (!product) {
      return errorResponse(res, 404, "Product not found");
    }

    const alertType =
      product.stock < 0
        ? "NEGATIVE_STOCK"
        : product.stock === 0
          ? "OUT_OF_STOCK"
          : product.stock <= product.threshold
            ? "LOW_STOCK"
            : null;

    logger.info("[Alerts] Alert details fetched", { productId });

    return successResponse(res, 200, {
      productId: product.id,
      name: product.name,
      warehouse: product.warehouse,
      stock: product.stock,
      threshold: product.threshold,
      minStock: product.minStock,
      maxStock: product.maxStock,
      alertType
    }, "Alert details fetched");
  } catch (err) {
    logger.error("[Alerts] Details fetch failed", err);
    return errorResponse(res, 500, "Failed to fetch alert details");
  }
};


const getInventoryAlertSummary = async (req, res) => {
  try {
    const [lowStock, outOfStock, negativeStock] = await Promise.all([
      prisma.product.count({
        where: { isActive: true, stock: { lte: prisma.product.fields.threshold } }
      }),
      prisma.product.count({
        where: { isActive: true, stock: 0 }
      }),
      prisma.product.count({
        where: { isActive: true, stock: { lt: 0 } }
      })
    ]);

    logger.info("[Alerts] Summary fetched");

    return successResponse(res, 200, {
      lowStock,
      outOfStock,
      negativeStock
    }, "Alert summary fetched");
  } catch (err) {
    logger.error("[Alerts] Summary fetch failed", err);
    return errorResponse(res, 500, "Failed to fetch alert summary");
  }
};

export {
  getInventoryAlertByProduct,
  getInventoryAlertSummary,
  getInventoryAlerts
}