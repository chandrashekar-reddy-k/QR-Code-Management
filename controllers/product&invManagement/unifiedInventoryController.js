import { prisma } from '../../config/prismaClient.js';
import logger from '../../utils/logger.js';
import { errorResponse, successResponse } from '../../utils/responseHelper.js';
import { InventoryService } from '../../services/inventoryService.js';

// ==================== LOCATION MANAGEMENT ====================

export const createLocation = async (req, res) => {
  try {
    const { type, name, code, parentId, warehouseId, storeId, vehicleId, userId } = req.body;

    if (!type || !name || !code) {
      return errorResponse(res, 400, "Type, name, and code are required fields");
    }

    const location = await prisma.inventoryLocation.create({
      data: {
        type,
        name,
        code,
        parentId: parentId || null,
        warehouseId: warehouseId || null,
        storeId: storeId || null,
        vehicleId: vehicleId || null,
        userId: userId || null
      }
    });

    logger.info(`[InventoryLocation] Created successfully: ${location.id}`);
    return successResponse(res, 201, location, "Inventory location created successfully");
  } catch (error) {
    logger.error("[InventoryLocation] Create error", error);
    return errorResponse(res, 500, error.message || "Failed to create location");
  }
};

export const getLocations = async (req, res) => {
  try {
    let locations = await prisma.inventoryLocation.findMany({
      include: {
        children: true,
        warehouse: { select: { name: true } },
        store: { select: { name: true } },
        vehicle: { select: { registrationNumber: true } }
      }
    });

    if (locations.length === 0) {
      const warehouses = await prisma.warehouse.findMany();
      locations = warehouses.map(w => ({
        id: w.id,
        name: w.name,
        code: w.code || w.id.slice(0, 8),
        type: 'WAREHOUSE',
        warehouseId: w.id
      }));
    }

    return successResponse(res, 200, locations, "Locations fetched successfully");
  } catch (error) {
    logger.error("[InventoryLocation] Fetch error", error);
    return errorResponse(res, 500, "Failed to fetch locations");
  }
};

// ==================== BALANCES & STOCK LOOKUP ====================

export const getBalances = async (req, res) => {
  try {
    const { locationId, productId, productVariantId } = req.query;

    let where = {};
    if (locationId) where.locationId = locationId;
    if (productId) where.productId = productId;
    if (productVariantId) where.productVariantId = productVariantId;

    const balances = await prisma.unifiedInventory.findMany({
      where,
      include: {
        location: { select: { id: true, name: true, type: true } },
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            images: true,
            stock: true,
            warehouse: { select: { id: true, name: true } },
            vehicleStocks: {
              select: {
                quantity: true
              }
            }
          }
        },
        productVariant: { select: { id: true, variantName: true, sku: true, primaryImages: true } }
      }
    });

    const balancesWithDamaged = await Promise.all(
      balances.map(async (b) => {
        const damageAgg = await prisma.inventoryDamageEntry.aggregate({
          where: {
            productId: b.productId,
            productVariantId: b.productVariantId,
            locationId: b.locationId
          },
          _sum: { quantity: true }
        });
        const vehicleStock = b.product?.vehicleStocks?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;
        const image = b.productVariant?.primaryImages?.[0] || b.product?.images?.[0] || null;
        return {
          ...b,
          onHand: b.onHand || b.product?.stock || 0,
          damaged: damageAgg._sum.quantity || 0,
          vehicleStock,
          image
        };
      })
    );

    // FALLBACK: If unifiedInventory is empty or missing products, populate from Product table
    if (balancesWithDamaged.length === 0) {
      const productWhere = {};
      if (productId) productWhere.id = productId;

      const products = await prisma.product.findMany({
        where: productWhere,
        include: {
          warehouse: { select: { id: true, name: true } },
          vehicleStocks: { select: { quantity: true } }
        }
      });

      const fallbackBalances = products.map((p) => {
        const vehicleStock = p.vehicleStocks?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;
        return {
          id: `p-${p.id}`,
          productId: p.id,
          productVariantId: null,
          locationId: p.warehouse?.id || 'main-wh',
          location: {
            id: p.warehouse?.id || 'main-wh',
            name: p.warehouse?.name || 'Phirangipuram Warehouse',
            type: 'WAREHOUSE'
          },
          product: {
            id: p.id,
            name: p.name,
            sku: p.batchNumber || p.id.slice(0, 8),
            images: p.images,
            vehicleStocks: p.vehicleStocks
          },
          productVariant: null,
          onHand: p.stock ?? 0,
          available: p.stock ?? 0,
          reserved: 0,
          damaged: 0,
          inbound: 0,
          vehicleStock,
          image: p.images?.[0] || null
        };
      });

      return successResponse(res, 200, fallbackBalances, "Stock balances fetched successfully");
    }

    return successResponse(res, 200, balancesWithDamaged, "Stock balances fetched successfully");
  } catch (error) {
    logger.error("[UnifiedInventory] Fetch error", error);
    return errorResponse(res, 500, "Failed to fetch stock balances");
  }
};

// ==================== BATCH MANAGEMENT ====================

export const createBatch = async (req, res) => {
  try {
    const { batchNumber, lotNumber, productId, productVariantId, locationId, quantity, manufacturingDate, expiryDate } = req.body;

    if (!batchNumber || !productId || !locationId || quantity == null) {
      return errorResponse(res, 400, "batchNumber, productId, locationId, and quantity are required");
    }

    const batch = await prisma.$transaction(async (tx) => {
      // Create batch
      const newBatch = await tx.inventoryBatch.create({
        data: {
          batchNumber,
          lotNumber,
          productId,
          productVariantId: productVariantId || null,
          locationId,
          quantity,
          manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : null,
          expiryDate: expiryDate ? new Date(expiryDate) : null
        }
      });

      // Update unified inventory using Service
      if (InventoryService && InventoryService.adjustStock) {
        await InventoryService.adjustStock({
          locationId,
          productId,
          productVariantId,
          changeQty: quantity,
          type: 'INWARD',
          referenceType: 'BATCH_CREATION',
          referenceId: newBatch.id,
          tx
        });
      }

      return newBatch;
    });

    logger.info(`[InventoryBatch] Created batch: ${batch.id}`);
    return successResponse(res, 201, batch, "Batch created successfully and stock adjusted");
  } catch (error) {
    logger.error("[InventoryBatch] Create error", error);
    return errorResponse(res, 500, error.message || "Failed to create batch");
  }
};

export const getBatches = async (req, res) => {
  try {
    const { locationId, productId } = req.query;

    let where = {};
    if (locationId) where.locationId = locationId;
    if (productId) where.productId = productId;

    const batches = await prisma.inventoryBatch.findMany({
      where,
      include: {
        location: { select: { name: true } },
        product: { select: { name: true } }
      },
      orderBy: { expiryDate: "asc" }
    });

    return successResponse(res, 200, batches, "Batches fetched successfully");
  } catch (error) {
    logger.error("[InventoryBatch] Fetch error", error);
    return errorResponse(res, 500, "Failed to fetch batches");
  }
};

// ==================== STOCK LEDGER ====================

export const getStockLedger = async (req, res) => {
  try {
    const { locationId, productId, page = 1, limit = 50 } = req.query;

    let where = {};
    if (locationId) where.locationId = locationId;
    if (productId) where.productId = productId;

    const total = await prisma.stockLedger.count({ where });

    const ledger = await prisma.stockLedger.findMany({
      where,
      skip: (page - 1) * limit,
      take: Number(limit),
      include: {
        location: { select: { name: true, type: true } },
        product: { select: { name: true } },
        productVariant: { select: { variantName: true } },
        movement: { select: { type: true, userId: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return successResponse(res, 200, {
      total,
      page: Number(page),
      limit: Number(limit),
      ledger
    }, "Stock ledger fetched successfully");
  } catch (error) {
    logger.error("[StockLedger] Fetch error", error);
    return errorResponse(res, 500, "Failed to fetch stock ledger");
  }
};

export const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, name, code, isActive, parentId } = req.body;

    const location = await prisma.inventoryLocation.update({
      where: { id },
      data: {
        type,
        name,
        code,
        isActive,
        parentId: parentId !== undefined ? parentId : undefined
      }
    });

    logger.info(`[InventoryLocation] Updated successfully: ${location.id}`);
    return successResponse(res, 200, location, "Location updated successfully");
  } catch (error) {
    logger.error("[InventoryLocation] Update error", error);
    return errorResponse(res, 500, "Failed to update location");
  }
};

export const getProductInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const balances = await prisma.unifiedInventory.findMany({
      where: { productId: id },
      include: {
        location: { select: { id: true, name: true, type: true } }
      }
    });
    return successResponse(res, 200, balances, "Product inventory fetched successfully");
  } catch (error) {
    logger.error("[UnifiedInventory] Product fetch error", error);
    return errorResponse(res, 500, "Failed to fetch product inventory");
  }
};

export const getLocationInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const balances = await prisma.unifiedInventory.findMany({
      where: { locationId: id },
      include: {
        product: { select: { id: true, name: true } }
      }
    });
    return successResponse(res, 200, balances, "Location inventory fetched successfully");
  } catch (error) {
    logger.error("[UnifiedInventory] Location fetch error", error);
    return errorResponse(res, 500, "Failed to fetch location inventory");
  }
};

export const createMovement = async (req, res) => {
  try {
    const { type, productId, productVariantId, locationId, quantity, referenceType, referenceId, userId } = req.body;

    if (!type || !productId || !locationId || !quantity) {
      return errorResponse(res, 400, "type, productId, locationId, and quantity are required");
    }

    const isOutward = ['SALE', 'TRANSFER', 'DAMAGE', 'OUTWARD'].includes(type);
    const signedQty = isOutward ? -Math.abs(quantity) : Math.abs(quantity);

    let balance = null;
    if (InventoryService && InventoryService.adjustStock) {
      balance = await InventoryService.adjustStock({
        locationId,
        productId,
        productVariantId: productVariantId || null,
        changeQty: signedQty,
        type,
        referenceType,
        referenceId,
        userId
      });
    }

    return successResponse(res, 201, balance, "Inventory movement logged successfully");
  } catch (error) {
    logger.error("[InventoryMovement] Log error", error);
    return errorResponse(res, 500, error.message || "Failed to log movement");
  }
};
