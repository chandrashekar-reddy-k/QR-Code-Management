import { prisma } from "../config/prismaClient.js";
import logger from "../utils/logger.js";
import { errorResponse, successResponse } from "../utils/responseHelper.js";

/**
 * Helper to get the partner's warehouseId
 */
const getWarehouseId = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { warehouseId: true },
  });
  return user?.warehouseId || null;
};

// ==========================================
// RACK CONTROLLERS
// ==========================================

export const createRack = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return errorResponse(res, 400, "Rack name is required");

    const warehouseId = await getWarehouseId(req.user.id);
    if (!warehouseId) return errorResponse(res, 400, "Partner does not have an assigned warehouse");

    // Check duplicate
    const existing = await prisma.rack.findFirst({
      where: { warehouseId, name: { equals: name, mode: "insensitive" } },
    });
    if (existing) return errorResponse(res, 400, `Rack with name "${name}" already exists`);

    const rack = await prisma.rack.create({
      data: { name, warehouseId },
    });

    return successResponse(res, 201, rack, "Rack created successfully");
  } catch (error) {
    logger.error("Error creating rack", error);
    return errorResponse(res, 500, error.message || "Failed to create rack");
  }
};

export const deleteRack = async (req, res) => {
  try {
    const { id } = req.params;
    const warehouseId = await getWarehouseId(req.user.id);

    const rack = await prisma.rack.findFirst({
      where: { id, warehouseId },
    });
    if (!rack) return errorResponse(res, 404, "Rack not found");

    await prisma.rack.delete({ where: { id } });
    return successResponse(res, 200, null, "Rack deleted successfully");
  } catch (error) {
    logger.error("Error deleting rack", error);
    return errorResponse(res, 500, "Failed to delete rack");
  }
};

// ==========================================
// SHELF CONTROLLERS
// ==========================================

export const createShelf = async (req, res) => {
  try {
    const { rackId, name } = req.body;
    if (!rackId || !name) return errorResponse(res, 400, "Rack ID and Shelf name are required");

    const warehouseId = await getWarehouseId(req.user.id);

    // Verify rack ownership
    const rack = await prisma.rack.findFirst({
      where: { id: rackId, warehouseId },
    });
    if (!rack) return errorResponse(res, 404, "Rack not found");

    // Check duplicate shelf on this rack
    const existing = await prisma.shelf.findFirst({
      where: { rackId, name: { equals: name, mode: "insensitive" } },
    });
    if (existing) return errorResponse(res, 400, `Shelf with name "${name}" already exists on this rack`);

    const shelf = await prisma.shelf.create({
      data: { name, rackId },
    });

    return successResponse(res, 201, shelf, "Shelf created successfully");
  } catch (error) {
    logger.error("Error creating shelf", error);
    return errorResponse(res, 500, "Failed to create shelf");
  }
};

export const deleteShelf = async (req, res) => {
  try {
    const { id } = req.params;
    const warehouseId = await getWarehouseId(req.user.id);

    const shelf = await prisma.shelf.findFirst({
      where: {
        id,
        rack: { warehouseId },
      },
    });
    if (!shelf) return errorResponse(res, 404, "Shelf not found");

    await prisma.shelf.delete({ where: { id } });
    return successResponse(res, 200, null, "Shelf deleted successfully");
  } catch (error) {
    logger.error("Error deleting shelf", error);
    return errorResponse(res, 500, "Failed to delete shelf");
  }
};

// ==========================================
// TRAY CONTROLLERS
// ==========================================

export const createTray = async (req, res) => {
  try {
    const { shelfId, name } = req.body;
    if (!shelfId || !name) return errorResponse(res, 400, "Shelf ID and Tray name are required");

    const warehouseId = await getWarehouseId(req.user.id);

    // Verify shelf ownership
    const shelf = await prisma.shelf.findFirst({
      where: {
        id: shelfId,
        rack: { warehouseId },
      },
    });
    if (!shelf) return errorResponse(res, 404, "Shelf not found");

    // Check duplicate
    const existing = await prisma.tray.findFirst({
      where: { shelfId, name: { equals: name, mode: "insensitive" } },
    });
    if (existing) return errorResponse(res, 400, `Tray with name "${name}" already exists on this shelf`);

    const tray = await prisma.tray.create({
      data: { name, shelfId },
    });

    return successResponse(res, 201, tray, "Tray created successfully");
  } catch (error) {
    logger.error("Error creating tray", error);
    return errorResponse(res, 500, "Failed to create tray");
  }
};

export const deleteTray = async (req, res) => {
  try {
    const { id } = req.params;
    const warehouseId = await getWarehouseId(req.user.id);

    const tray = await prisma.tray.findFirst({
      where: {
        id,
        shelf: { rack: { warehouseId } },
      },
    });
    if (!tray) return errorResponse(res, 404, "Tray not found");

    await prisma.tray.delete({ where: { id } });
    return successResponse(res, 200, null, "Tray deleted successfully");
  } catch (error) {
    logger.error("Error deleting tray", error);
    return errorResponse(res, 500, "Failed to delete tray");
  }
};

// ==========================================
// HIERARCHY / GENERAL LAYOUT
// ==========================================

export const getLayout = async (req, res) => {
  try {
    const warehouseId = await getWarehouseId(req.user.id);
    if (!warehouseId) return errorResponse(res, 400, "Partner does not have an assigned warehouse");

    const racks = await prisma.rack.findMany({
      where: { warehouseId },
      include: {
        shelves: {
          include: {
            trays: true,
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return successResponse(res, 200, racks, "Layout retrieved successfully");
  } catch (error) {
    logger.error("Error fetching layouts", error);
    return errorResponse(res, 500, "Failed to fetch layouts");
  }
};

// ==========================================
// PRODUCT MAPPING
// ==========================================

export const mapProductLocation = async (req, res) => {
  try {
    const { productId, productVariantId, trayId } = req.body;
    if (!productId || !trayId) return errorResponse(res, 400, "Product ID and Tray ID are required");

    const warehouseId = await getWarehouseId(req.user.id);
    if (!warehouseId) return errorResponse(res, 400, "Partner does not have an assigned warehouse");

    // Verify product exists in partner's warehouse
    const product = await prisma.product.findFirst({
      where: { id: productId, warehouseId },
    });
    if (!product) return errorResponse(res, 404, "Product not found in this warehouse");

    // If a variant is specified, verify it belongs to this product
    if (productVariantId) {
      const variant = await prisma.productVariant.findFirst({
        where: { id: productVariantId, productId },
      });
      if (!variant) return errorResponse(res, 404, "Product variant not found");
    }

    // Verify tray belongs to partner's warehouse
    const tray = await prisma.tray.findFirst({
      where: {
        id: trayId,
        shelf: { rack: { warehouseId } },
      },
    });
    if (!tray) return errorResponse(res, 404, "Tray not found");

    // Enforce uniqueness at application level since database constraint might be an index
    // Check if this variant (or product if no variant) is already mapped in this warehouse
    const existing = await prisma.productLocation.findFirst({
      where: {
        warehouseId,
        productId,
        productVariantId: productVariantId || null,
      },
    });

    let mapping;
    if (existing) {
      mapping = await prisma.productLocation.update({
        where: { id: existing.id },
        data: { trayId },
      });
    } else {
      mapping = await prisma.productLocation.create({
        data: {
          warehouseId,
          productId,
          productVariantId: productVariantId || null,
          trayId,
        },
      });
    }

    return successResponse(res, 200, mapping, "Location mapped successfully");
  } catch (error) {
    logger.error("Error mapping product location", error);
    return errorResponse(res, 500, "Failed to map product location");
  }
};

export const listProductLocations = async (req, res) => {
  try {
    const warehouseId = await getWarehouseId(req.user.id);
    if (!warehouseId) return errorResponse(res, 400, "Partner does not have an assigned warehouse");

    const mappings = await prisma.productLocation.findMany({
      where: { warehouseId },
      include: {
        product: {
          select: { id: true, name: true },
        },
        productVariant: {
          select: { id: true, variantName: true, sku: true, measurement: true, unit: true },
        },
        tray: {
          include: {
            shelf: {
              include: {
                rack: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Format display names to include variant detail
    const formatted = mappings.map(m => ({
      id: m.id,
      productId: m.productId,
      productVariantId: m.productVariantId,
      product: {
        id: m.productId,
        name: m.productVariant 
          ? `${m.product?.name} - ${m.productVariant.variantName} (${m.productVariant.measurement || ""}${m.productVariant.unit || ""})`
          : m.product?.name,
        sku: m.productVariant?.sku || null,
      },
      tray: m.tray,
    }));

    return successResponse(res, 200, formatted, "Product mappings retrieved successfully");
  } catch (error) {
    logger.error("Error fetching product locations", error);
    return errorResponse(res, 500, "Failed to fetch product locations");
  }
};

export const deleteProductLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const warehouseId = await getWarehouseId(req.user.id);

    const mapping = await prisma.productLocation.findFirst({
      where: { id, warehouseId },
    });
    if (!mapping) return errorResponse(res, 404, "Mapping not found");

    await prisma.productLocation.delete({ where: { id } });
    return successResponse(res, 200, null, "Product location mapping removed");
  } catch (error) {
    logger.error("Error deleting product mapping", error);
    return errorResponse(res, 500, "Failed to remove product location mapping");
  }
};

export const listProducts = async (req, res) => {
  try {
    const warehouseId = await getWarehouseId(req.user.id);
    if (!warehouseId) return errorResponse(res, 400, "Partner does not have an assigned warehouse");

    const products = await prisma.product.findMany({
      where: { warehouseId, isActive: true },
      select: {
        id: true,
        name: true,
        variants: {
          where: { isEnabled: true, status: "ACTIVE" },
          select: {
            id: true,
            sku: true,
            variantName: true,
            unit: true,
            unitType: true,
            measurement: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Expand the products list into a flat list of map-ready variants
    const variantList = [];
    for (const p of products) {
      if (p.variants && p.variants.length > 0) {
        for (const v of p.variants) {
          variantList.push({
            id: p.id, // product ID
            productVariantId: v.id, // variant ID
            name: `${p.name} - ${v.variantName} (${v.measurement || ""}${v.unit || ""})`,
            sku: v.sku,
          });
        }
      } else {
        variantList.push({
          id: p.id,
          productVariantId: null,
          name: p.name,
          sku: null,
        });
      }
    }

    return successResponse(res, 200, variantList, "Products list retrieved successfully");
  } catch (error) {
    logger.error("Error fetching products list", error);
    return errorResponse(res, 500, "Failed to fetch products list");
  }
};
