import { prisma } from "../config/prismaClient.js";
import logger from "../utils/logger.js";
import { errorResponse, successResponse } from "../utils/responseHelper.js";

/**
 * Helper to get the partner's warehouseId
 */
const getWarehouseId = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { warehouseId: true, role: true },
  });
  if (user && user.role === "SHOPKEEPER" && !user.warehouseId) {
    const warehouse = await prisma.warehouse.findFirst({
      select: { id: true }
    });
    if (warehouse) {
      await prisma.user.update({
        where: { id: userId },
        data: { warehouseId: warehouse.id }
      });
      return warehouse.id;
    }
  }
  return user?.warehouseId || null;
};

// ==========================================
// RACK CONTROLLERS
// ==========================================

export const createRack = async (req, res) => {
  try {
    const { name, code, maxShelves } = req.body;
    if (!name) return errorResponse(res, 400, "Rack name is required");

    const warehouseId = await getWarehouseId(req.user.id);
    if (!warehouseId) return errorResponse(res, 400, "Partner does not have an assigned warehouse");

    const existing = await prisma.rack.findFirst({
      where: { warehouseId, name: { equals: name, mode: "insensitive" } },
    });
    if (existing) return errorResponse(res, 400, `Rack with name "${name}" already exists`);

    const parsedMaxShelves = maxShelves ? parseInt(maxShelves) : null;

    const rack = await prisma.rack.create({
      data: { name: name.trim(), code: code ? code.trim() : null, maxShelves: parsedMaxShelves, warehouseId },
    });

    return successResponse(res, 201, rack, "Rack created successfully");
  } catch (error) {
    console.error("RACK ERROR", error);
    logger.error(`Error in createRack: ${error.message}`);
    return errorResponse(res, 500, error.message || "Failed to create rack");
  }
};

export const updateRack = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, maxShelves } = req.body;
    if (!name) return errorResponse(res, 400, "Rack name is required");

    const warehouseId = await getWarehouseId(req.user.id);
    if (!warehouseId) return errorResponse(res, 400, "Partner does not have an assigned warehouse");

    const existing = await prisma.rack.findFirst({
      where: { id, warehouseId },
    });
    if (!existing) return errorResponse(res, 404, "Rack not found");

    // Check duplicate
    const duplicate = await prisma.rack.findFirst({
      where: { warehouseId, name: { equals: name, mode: "insensitive" }, id: { not: id } },
    });
    if (duplicate) return errorResponse(res, 400, `Rack with name "${name}" already exists`);

    const parsedMaxShelves = maxShelves ? parseInt(maxShelves) : null;

    const rack = await prisma.rack.update({
      where: { id },
      data: { name, code: code ? code.trim() : null, maxShelves: parsedMaxShelves },
    });

    return successResponse(res, 200, rack, "Rack updated successfully");
  } catch (error) {
    logger.error("Error updating rack", error);
    return errorResponse(res, 500, error.message || "Failed to update rack");
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

export const toggleRackStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const warehouseId = await getWarehouseId(req.user.id);

    const rack = await prisma.rack.findFirst({
      where: { id, warehouseId },
    });
    if (!rack) return errorResponse(res, 404, "Rack not found");

    const updated = await prisma.rack.update({
      where: { id },
      data: { isActive: !rack.isActive },
    });

    return successResponse(res, 200, updated, `Rack status updated to ${updated.isActive ? 'Active' : 'Inactive'}`);
  } catch (error) {
    logger.error("Error toggling rack status", error);
    return errorResponse(res, 500, "Failed to toggle rack status");
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

export const updateShelf = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return errorResponse(res, 400, "Shelf name is required");

    const warehouseId = await getWarehouseId(req.user.id);

    const existing = await prisma.shelf.findFirst({
      where: {
        id,
        rack: { warehouseId },
      },
    });
    if (!existing) return errorResponse(res, 404, "Shelf not found");

    // Check duplicate
    const duplicate = await prisma.shelf.findFirst({
      where: { rackId: existing.rackId, name: { equals: name, mode: "insensitive" }, id: { not: id } },
    });
    if (duplicate) return errorResponse(res, 400, `Shelf with name "${name}" already exists on this rack`);

    const shelf = await prisma.shelf.update({
      where: { id },
      data: { name },
    });

    return successResponse(res, 200, shelf, "Shelf updated successfully");
  } catch (error) {
    logger.error("Error updating shelf", error);
    return errorResponse(res, 500, error.message || "Failed to update shelf");
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
    const { shelfId, name, capacity } = req.body;
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

    const parsedCapacity = capacity ? parseInt(capacity) : null;

    const tray = await prisma.tray.create({
      data: { name, shelfId, capacity: parsedCapacity },
    });

    return successResponse(res, 201, tray, "Tray created successfully");
  } catch (error) {
    logger.error("Error creating rack", error);
    return errorResponse(res, 500, "Failed to create rack: " + (error.message || error.toString()));
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

    const fs = await import('fs');
    fs.appendFileSync('getLayout.log', `[${new Date().toISOString()}] req.user: ${JSON.stringify(req.user)}, warehouseId: ${warehouseId}, racks count: ${racks.length}\n`);

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
    const { productId, productVariantId, trayId, quantity } = req.body;
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
        data: { 
          trayId,
          ...(quantity !== undefined && { quantity: Number(quantity) })
        },
      });
    } else {
      mapping = await prisma.productLocation.create({
        data: {
          warehouseId,
          productId,
          productVariantId: productVariantId || null,
          trayId,
          ...(quantity !== undefined && { quantity: Number(quantity) })
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
      quantity: m.quantity,
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
