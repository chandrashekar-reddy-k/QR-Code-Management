// controllers/productController.js
import crypto from "crypto";
import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import ExcelJS from "exceljs/dist/exceljs.min.js";
import { prisma } from "../../config/prismaClient.js";
import logger from "../../utils/logger.js";
import { uploadFilesToS3 } from "../../utils/aws3.js";
import {
  errorResponse,
  successResponse,
  paginatedResponse,
} from "../../utils/responseHelper.js";
import { emitCanonicalEvent } from "../../audit/auditLogger.js";
import { CANONICAL_EVENTS } from "../../audit/auditConstants.js";
import { exportToExcel } from "../../utils/exportToExcel.js";
import { exportColumns } from "../../utils/exportColumns.js";
import { InventoryCache } from "../../utils/cacheHelper.js";
import {
  productHeaderMap,
  normalizeExcelRow,
} from "../../utils/normalizeExcelRow.js";

const BULK_BATCH_SIZE = 200;

/** Parse TRUE/FALSE/1/0 to boolean; otherwise undefined */
function parseBool(v) {
  if (v === true || v === 'TRUE' || v === '1' || v === 1) return true
  if (v === false || v === 'FALSE' || v === '0' || v === 0 || v === '') return false
  return undefined
}

/** Slug from name: lowercase, replace spaces with hyphen, remove invalid chars */
function slugify(name) {
  if (!name || typeof name !== 'string') return ''
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || ''
}

/** Get Excel column letter from 1-based index (1 = A, 27 = AA) */
function getColumnLetter(colIndex) {
  let s = ''
  let n = colIndex
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

/** Safe Excel range name - valid for defined names (no spaces, no special chars) */
function getSafeRangeName(value) {
  const name = String(value || '').trim().replace(/\s+/g, '_').replace(/[^A-Za-z0-9_]/g, '_')
  if (!name) return 'Unknown'
  if (/^[0-9]/.test(name)) return `_${name}`
  return name
}

/** Excel formula for INDIRECT - must produce same string as getSafeRangeName(cellValue)+suffix */
function getIndirectFormula(cellRef, suffix) {
  const subs = [[' ', '_'], ['&', '_'], ['-', '_'], ['/', '_'], ['.', '_']]
  let inner = cellRef
  for (const [from, to] of subs) {
    inner = `SUBSTITUTE(${inner},"${from}","${to}")`
  }
  return `INDIRECT(${inner}&"${suffix}")`
}

/**
 * Parse uploaded file (CSV or XLSX) and return rows from Products sheet.
 * Accepts buffer (express-fileupload) or file path (multer).
 */
function parseBulkFile(filePathOrBuffer, originalname = '') {
  const buf = Buffer.isBuffer(filePathOrBuffer) ? filePathOrBuffer : fs.readFileSync(filePathOrBuffer)
  const ext = (originalname || '').toLowerCase().slice(-4)
  const isCsv = ext === '.csv' || (originalname || '').toLowerCase().endsWith('.csv')
  const workbook = XLSX.read(buf, { type: 'buffer', raw: !isCsv })
  const sheet = workbook.Sheets['Products'] || workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []
  return XLSX.utils.sheet_to_json(sheet)
}

const createProduct = async (req, res) => {
  try {
    logger.info("[PRODUCT] Create request", req.body);
    console.log("req.user", req.user);

    const userId = req.user.id;

    // ✅ Get warehouseId from logged user
    const warehouseId = await getWarehouseFromUser(userId, prisma);

    let data = { ...req.body };

    delete data.warehouseId; // ❌ NEVER accept from frontend

    if (!data.subCategoryId) delete data.subCategoryId;
    if (!data.brandId) delete data.brandId;
    if (!data.supplierIds || !data.supplierIds.length) delete data.supplierIds;

    const {
      name,
      slug,
      description,
      shortDescription,
      images,
      tags,
      categoryId,
      subCategoryId,
      brandId,
      productType,
      inventoryType,
      price,
      mrp,
      discountType,
      discountValue,
      finalPrice,
      costPrice,
      taxRate,
      unitType,
      unit,
      measurement,
      stock,
      threshold,
      minOrderQty,
      maxOrderQty,
      isActive,
      isFeatured,
      variantName,
      sku,
      barcode,
      variantStatus,
      weight,
      metaTitle,
      metaKeywords,
      metaDescription,
      schemaMarkup,
      manufacturer,
      madeIn,
      fssaiLicNo,
      isReturnable,
      returnableDays,
      isCancelable,
      cancellableOrderStatuses,
      isCodAllowed,
      supplierIds,
    } = data;

    if (!name || !price || !categoryId || !unit) {
      return errorResponse(res, 400, "Required fields missing");
    }

    // ✅ Prevent duplicate product creation
    const existingProduct = await prisma.product.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive' // case-insensitive match
        },
        variantName: variantName || null,
        warehouseId: warehouseId
      }
    });

    if (existingProduct) {
      return errorResponse(res, 409, `A product with the name "${name}"${variantName ? ' and variant "' + variantName + '"' : ''} already exists.`);
    }

    const numPrice = Number(price);
    const numMrp = mrp ? Number(mrp) : null;
    const numCostPrice = costPrice ? Number(costPrice) : null;

    if (numMrp !== null && numPrice > numMrp) {
      return errorResponse(res, 400, `Selling price (${numPrice}) cannot exceed ceiling price / MRP (${numMrp})`);
    }

    if (numCostPrice !== null && numPrice < numCostPrice) {
      return errorResponse(res, 400, `Selling price (${numPrice}) cannot be lower than floor price / Cost Price (${numCostPrice})`);
    }

    // ✅ Validation for return policy
    if (isReturnable && !returnableDays) {
      return errorResponse(res, 400, "returnableDays is required when isReturnable is true");
    }
    if (isReturnable && (parseInt(returnableDays) <= 0 || parseInt(returnableDays) > 365)) {
      return errorResponse(res, 400, "returnableDays must be between 1 and 365");
    }

    // ✅ Validation for cancellation policy
    const validOrderStatuses = ["PLACED", "CONFIRMED", "PROCESSING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"];
    if (isCancelable && (!cancellableOrderStatuses || !Array.isArray(cancellableOrderStatuses) || cancellableOrderStatuses.length === 0)) {
      return errorResponse(res, 400, "cancellableOrderStatuses is required and must be an array when isCancelable is true");
    }
    if (isCancelable && cancellableOrderStatuses) {
      const invalidStatuses = cancellableOrderStatuses.filter(status => !validOrderStatuses.includes(status));
      if (invalidStatuses.length > 0) {
        return errorResponse(res, 400, `Invalid order statuses: ${invalidStatuses.join(", ")}. Valid statuses are: ${validOrderStatuses.join(", ")}`);
      }
    }

    // suppliers
    let supplierConnect;
    if (supplierIds?.length) {
      const suppliers = await prisma.supplier.findMany({
        where: { id: { in: supplierIds } },
        select: { id: true },
      });

      if (suppliers.length !== supplierIds.length)
        return errorResponse(res, 400, "Invalid supplierIds");

      supplierConnect = { connect: suppliers.map((s) => ({ id: s.id })) };
    }

    const prismaData = {
      name,
      slug,
      description,
      shortDescription,
      images: images || [],
      tags: tags || [],
      productType,
      inventoryType,
      price,
      mrp,
      discountType,
      discountValue,
      finalPrice,
      costPrice,
      taxRate,
      unitType,
      unit,
      measurement,
      stock: stock ?? 0,
      threshold: threshold ?? 5,
      minOrderQty,
      maxOrderQty,
      isActive: isActive ?? true,
      isFeatured: isFeatured ?? false,
      variantName,
      sku,
      barcode,
      variantStatus: variantStatus ?? true,
      weight: weight ?? 0,
      metaTitle,
      metaKeywords,
      metaDescription,
      schemaMarkup,
      manufacturer,
      madeIn,
      fssaiLicNo,
      isReturnable: isReturnable ?? false,
      returnableDays: isReturnable && returnableDays ? parseInt(returnableDays) : null,
      isCancelable: isCancelable ?? false,
      cancellableOrderStatuses: cancellableOrderStatuses && Array.isArray(cancellableOrderStatuses) ? cancellableOrderStatuses : [],
      isCodAllowed: isCodAllowed ?? false,

      // 🔥 AUTO warehouse
      warehouse: { connect: { id: warehouseId } },

      category: { connect: { id: categoryId } },
    };

    if (subCategoryId)
      prismaData.subCategory = { connect: { id: subCategoryId } };
    if (brandId) prismaData.brand = { connect: { id: brandId } };
    if (supplierConnect) prismaData.supplier = supplierConnect;

    // ✅ Check for duplicate slug (per warehouse, not globally)
    if (slug) {
      const existingSlug = await prisma.product.findFirst({
        where: {
          slug,
          warehouseId
        }
      });
      if (existingSlug) {
        return errorResponse(
          res,
          409,
          'Product slug must be unique within the warehouse'
        );
      }
    }

    const product = await prisma.product.create({
      data: prismaData,
      include: {
        warehouse: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        subCategory: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
      },
    });

    logger.info("[PRODUCT] Created", { id: product.id, warehouseId });
    await emitCanonicalEvent({
      eventName: CANONICAL_EVENTS.productUpdated,
      eventId: `PRODUCT_UPDATED:${product.id}:CREATE`,
      entityType: "PRODUCT",
      entityId: product.id,
      action: "CREATE",
      afterJson: product,
      payload: {
        actorId: req.user?.id,
        actorRole: req.user?.role,
        updateType: "CREATE",
        warehouseId,
      },
    });

    return successResponse(res, 201, product, "Product created successfully");
  } catch (error) {
    logger.error("[PRODUCT] Create failed", error);
    return errorResponse(res, 500, error.message);
  }
};

const getProductList = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search,
      categoryId,
      filter = "",
      warehouseId,
      isActive,
      inventoryType
    } = req.query

    const userId = req.user?.id

    page = Number(page)
    limit = Number(limit)
    const skip = (page - 1) * limit

    logger.info("[PRODUCT] Fetch products and variants request received", {
      userId,
      page,
      limit,
      search,
      categoryId,
      filter,
      warehouseId,
      isActive
    })

    if (!userId) {
      return errorResponse(res, 401, "Unauthorized user")
    }

    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
        warehouseId: true
      }
    })

    if (!user) {
      logger.info("[PRODUCT] User not in local database, using token information", { userId })
      user = {
        id: userId,
        name: req.user.name || "Token User",
        role: req.user.role,
        warehouseId: req.user.warehouseId
      };
    }

    const showAll = req.query.showAll === "true" || warehouseId === "all";
    const targetWarehouseId = !showAll ? (warehouseId || user.warehouseId || null) : null;
    const where = {};

    if (isActive !== undefined && isActive !== null) {
      where.isActive = String(isActive) === "true";
    }

    if (inventoryType) {
      if (inventoryType === 'READY') {
        where.AND = where.AND || [];
        where.AND.push({
          OR: [
            { inventoryType: 'READY' },
            { finishedGoods: { some: {} } }
          ]
        });
      } else {
        where.inventoryType = inventoryType;
      }
    }

    if (targetWarehouseId) {
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { warehouseId: targetWarehouseId },
          { warehouseId: null }
        ]
      });
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (filter !== undefined && filter !== null && filter !== "") {
      const normalizedFilter = String(filter).toUpperCase()

      if (normalizedFilter === "TRUE" || normalizedFilter === "FALSE") {
        where.isActive = normalizedFilter === "TRUE"
      } else if (["PENDING", "APPROVED", "REJECTED"].includes(normalizedFilter)) {
        where.status = normalizedFilter
      } else {
        return errorResponse(
          res,
          400,
          "Invalid filter. Use true/false for isActive or PENDING/APPROVED/REJECTED for status"
        )
      }
    }

    if (search && search.trim()) {
      const s = search.trim()

      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { name: { contains: s, mode: "insensitive" } },
          { slug: { contains: s, mode: "insensitive" } },
          { description: { contains: s, mode: "insensitive" } },
          { shortDescription: { contains: s, mode: "insensitive" } },
          { sku: { contains: s, mode: "insensitive" } },
          { barcode: { contains: s, mode: "insensitive" } },
          { category: { name: { contains: s, mode: "insensitive" } } },
          { subCategory: { name: { contains: s, mode: "insensitive" } } },
          { brand: { name: { contains: s, mode: "insensitive" } } },
          {
            variants: {
              some: {
                OR: [
                  { variantName: { contains: s, mode: "insensitive" } },
                  { sku: { contains: s, mode: "insensitive" } },
                  { gtin: { contains: s, mode: "insensitive" } },
                  { measurement: { contains: s, mode: "insensitive" } }
                ]
              }
            }
          }
        ]
      });
    }

    // Stats base: scope to category and targetWarehouseId to match the query filters
    const statsBaseWhere = {
      ...(categoryId && { categoryId }),
      ...(targetWarehouseId && { warehouseId: targetWarehouseId })
    }

    const [
      products,
      total,
      activeCount,
      inactiveCount,
      pendingCount,
      approvedCount,
      rejectedCount,
      units,
      unitTypes
    ] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          warehouse: {
            select: {
              id: true,
              name: true
            }
          },
          category: {
            select: {
              id: true,
              name: true
            }
          },
          subCategory: {
            select: {
              id: true,
              name: true
            }
          },
          brand: {
            select: {
              id: true,
              name: true
            }
          },
          supplier: {
            select: {
              id: true,
              companyName: true
            }
          },
          variants: {
            orderBy: { createdAt: "desc" }
          },
          channelInventories: true,
          vehicleStocks: true,
          vehicleStockAssignments: true,
          storeroomStock: true,
          productionStock: true,
          onlineAppStock: true,
          finishedGoods: true
        }
      }),

      prisma.product.count({ where }),

      prisma.product.count({
        where: {
          ...statsBaseWhere,
          isActive: true,
          status: "APPROVED"
        }
      }),

      prisma.product.count({
        where: {
          ...statsBaseWhere,
          isActive: false,
          status: "APPROVED"
        }
      }),

      // ✅ Pending product count
      prisma.product.count({
        where: {
          ...statsBaseWhere,
          status: "PENDING"
        }
      }),

      // ✅ Approved count
      prisma.product.count({
        where: {
          ...statsBaseWhere,
          status: "APPROVED"
        }
      }),

      prisma.product.count({
        where: {
          ...statsBaseWhere,
          status: "REJECTED"
        }
      }),

      prisma.unit.findMany({
        include: { unitType: true }
      }),
      prisma.unitType.findMany()
    ])

    const unitMap = new Map((units || []).map(u => [u.id, u]));
    const unitTypeMap = new Map((unitTypes || []).map(ut => [ut.id, ut]));

    logger.info("[PRODUCT] Products and variants fetched successfully", {
      userId,
      warehouseId: user.warehouseId,
      total,
      activeCount,
      inactiveCount,
      pendingCount,
      approvedCount,
      rejectedCount
    })

    return paginatedResponse(
      res,
      200,
      {
        stats: {
          active: activeCount,
          inactive: inactiveCount,
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,

          // ✅ all products regardless of status
          total: activeCount + inactiveCount + pendingCount + rejectedCount
        },
        user: {
          id: user.id,
          name: user.name,
          warehouseId: user.warehouseId
        },
        products: products.map(product => {
          const onlineInv = product.channelInventories?.find(ci => ci.channel === 'ONLINE_APP' || ci.channel === 'ONLINE' || ci.channel === 'APP');
          const posInv = product.channelInventories?.find(ci => ci.channel === 'POS_STORE' || ci.channel === 'POS');
          const vehicleInv = product.channelInventories?.find(ci => ci.channel === 'VEHICLE');
          const vehicleAssignments = product.vehicleStockAssignments || [];
          const vehiclePhysicalStocks = product.vehicleStocks || [];
          const assignmentStock = vehicleAssignments.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
          const physicalStock = vehiclePhysicalStocks.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
          const vsaStock = physicalStock > 0 ? physicalStock : assignmentStock;
          const vehicleStock = (vehicleInv?.quantity || 0) > 0 ? vehicleInv.quantity : vsaStock;

          const { ...rest } = product;

          // Resolve lifecycleStage from DB tables, tags, or store
          const tagStage = Array.isArray(product.tags) ? product.tags.find(t => t.startsWith('LIFECYCLE:'))?.split(':')[1] : null;

          const tags = Array.isArray(product.tags) ? product.tags : [];
          const hasChTag = tags.some(t => t.startsWith('CH:'));

          const isOnline = onlineInv !== undefined
            ? Boolean(onlineInv.isActive)
            : (hasChTag ? tags.includes('CH:ONLINE') : false);

          const isPos = posInv !== undefined
            ? Boolean(posInv.isActive)
            : (hasChTag ? tags.includes('CH:POS') : false);

          const isVehicle = vehicleInv !== undefined
            ? Boolean(vehicleInv.isActive)
            : (product.liveStockChannel?.isVehicle !== undefined
              ? Boolean(product.liveStockChannel.isVehicle)
              : (hasChTag ? tags.includes('CH:VEHICLE') : vehicleAssignments.length > 0));

          const posPrice = posInv?.channelPrice || product.price || null;
          const onlinePrice = onlineInv?.channelPrice || product.price || null;
          const barcode = product.barcode;
          const shelfLocation = tags.find(t => t.startsWith('SHELF:'))?.split(':')[1] || 'Aisle 1 - Bay A';

          const posStock = posInv?.quantity ?? 0;
          const onlineStock = onlineInv?.quantity ?? 0;
          const isPosChannelReq = req.query?.channel === 'POS_STORE' || req.query?.posOnly === 'true';
          const effectiveStock = isPosChannelReq ? posStock : (posStock > 0 ? posStock : Number(product.stock || 0));

          // Resolve clean human-readable unit name
          let cleanUnit = product.unit || 'Pack';
          const unitObj = unitMap.get(product.unit);
          if (unitObj) {
            cleanUnit = unitObj.name || unitObj.shortCode || 'Pack';
          } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanUnit)) {
            cleanUnit = 'Pack';
          }

          let vehicleStoreStock = vehicleInv?.quantity ?? 0;
          let vsmPrice = vehicleInv?.channelPrice || product.price || null;
          
          // Resolve clean human-readable unitType name
          let cleanUnitType = product.unitType;
          const unitTypeObj = unitTypeMap.get(product.unitType);
          if (unitTypeObj) {
            cleanUnitType = unitTypeObj.name || 'Pack';
          } else if (unitObj?.unitType?.name) {
            cleanUnitType = unitObj.unitType.name;
          } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanUnitType) || !cleanUnitType) {
            cleanUnitType = 'Pack';
          }

          const assignedVehicles = vehicleAssignments.map(va => ({
            vehicleId: va.vehicleId,
            vehicleNumber: va.vehicle?.vehicleNumber || 'Van',
            vehicleName: va.vehicle?.vehicleName || 'Fleet Van',
            quantity: va.quantity || 0,
            openingQuantity: va.openingQuantity || 0,
            soldQuantity: va.soldQuantity || 0,
            returnedQuantity: va.returnedQuantity || 0,
            status: va.status
          }));

          return {
            ...rest,
            unit: cleanUnit,
            unitType: cleanUnitType,
            unitTypeId: product.unitType,
            unitTypeName: cleanUnitType,
            mrp: Number(product.mrp || 0),
            landingPrice: Number((product.landingPrice && product.landingPrice > 0 ? product.landingPrice : null) ?? (product.costPrice && product.costPrice > 0 ? product.costPrice : null) ?? (product.variants?.[0]?.landingPrice && product.variants?.[0]?.landingPrice > 0 ? product.variants[0].landingPrice : null) ?? (product.variants?.[0]?.costPrice && product.variants?.[0]?.costPrice > 0 ? product.variants[0].costPrice : null) ?? (product.variants?.[0]?.purchasePrice && product.variants?.[0]?.purchasePrice > 0 ? product.variants[0].purchasePrice : null) ?? 0),
            costPrice: Number((product.costPrice && product.costPrice > 0 ? product.costPrice : null) ?? (product.landingPrice && product.landingPrice > 0 ? product.landingPrice : null) ?? (product.variants?.[0]?.costPrice && product.variants?.[0]?.costPrice > 0 ? product.variants[0].costPrice : null) ?? (product.variants?.[0]?.landingPrice && product.variants?.[0]?.landingPrice > 0 ? product.variants[0].landingPrice : null) ?? 0),
            sellingPrice: Number(product.finalPrice || product.price || 0), // Master Selling Price from Product
            price: Number(product.price || 0),
            productMinOrderQty: product.minOrderQty, // Product master min limit
            productMaxOrderQty: product.maxOrderQty, // Product master max limit
            stock: effectiveStock,
            baseStock: product.stock, // 👈 True DB stock value
            posStock,
            onlineStock,
            channelInventories: product.channelInventories || [],
            vehicleStockAssignments: product.vehicleStockAssignments || [],
            assignedVehicles,
            onlineAppStock: onlineInv ? {
              isPublished: onlineInv.isActive,
              onlineStock: onlineInv.quantity,
              appPrice: onlineInv.channelPrice,
              discountType: onlineInv.discountType,
              discountValue: onlineInv.discountValue,
              minOrderQty: onlineInv.minOrderQty || 1,
              maxOrderQty: onlineInv.maxOrderQty || 50
            } : null,
            posStoreStock: posInv ? {
              isPosEnabled: posInv.isActive,
              posStock: posInv.quantity,
              posPrice: posInv.channelPrice,
              taxRate: posInv.taxRate,
              barcode: product.barcode,
              shelfLocation
            } : null,
            onlinePrice,
            onlineDiscountType: onlineInv?.discountType,
            onlineDiscountValue: onlineInv?.discountValue,
            minOrderQty: onlineInv?.minOrderQty || 1,
            maxOrderQty: onlineInv?.maxOrderQty || 50,
            posPrice,
            vsmPrice,
            barcode,
            shelfLocation,
            isOnline,
            isPos,
            isVehicle,
            vehicleStock,
            vehicleStoreStock,
            totalStock: effectiveStock + vehicleStock
          };
        })
      },
      { total, page, limit },
      "Products and variants fetched successfully"
    )
  } catch (error) {
    logger.error("[PRODUCT] Fetch products and variants failed", {
      error: error.message,
      stack: error.stack
    })

    return errorResponse(res, 500, "Failed to fetch products and variants")
  }
}

const toggleProductStatus = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, isActive: true },
    });

    if (!product) {
      return errorResponse(res, 404, "Product not found");
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        isActive: !product.isActive,
      },
    });

    logger.info("[PRODUCT] Status toggled", {
      productId,
      isActive: updated.isActive,
    });
    await emitCanonicalEvent({
      eventName: CANONICAL_EVENTS.productUpdated,
      eventId: `PRODUCT_UPDATED:${productId}:TOGGLE_ACTIVE:${updated.isActive}`,
      entityType: "PRODUCT",
      entityId: productId,
      action: "TOGGLE_ACTIVE",
      beforeJson: product,
      afterJson: updated,
      payload: {
        actorId: req.user?.id,
        actorRole: req.user?.role,
        updateType: "TOGGLE_ACTIVE",
      },
    });

    return successResponse(
      res,
      200,
      updated,
      `Product ${updated.isActive ? "activated" : "deactivated"} successfully`,
    );
  } catch (error) {
    logger.error("[PRODUCT] Toggle status failed", error);
    return errorResponse(res, 500, "Failed to toggle product status");
  }
};

/* ============================================================================
   GET BY ID
============================================================================ */
const getProductByProductId = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        warehouse: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        subCategory: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        variants: true,
        channelInventories: true,
        vehicleStockAssignments: true
      },
    });

    if (!product) return errorResponse(res, 404, "Product not found");

    const posInv = product.channelInventories?.find(ci => ci.channel === 'POS_STORE' || ci.channel === 'POS');
    const onlineInv = product.channelInventories?.find(ci => ci.channel === 'ONLINE_APP' || ci.channel === 'ONLINE' || ci.channel === 'APP');
    const vehicleInv = product.channelInventories?.find(ci => ci.channel === 'VEHICLE');
    const vsaStock = product.vehicleStockAssignments?.reduce((acc, curr) => acc + (curr.quantity || 0), 0) || 0;
    const vehicleStock = (vehicleInv?.quantity || 0) > 0 ? vehicleInv.quantity : vsaStock;
    const vehicleStoreStock = posInv?.quantity || 0;
    const totalStock = (product.stock || 0) + vehicleStock;

    return successResponse(res, 200, {
      ...product,
      posStock: posInv?.quantity ?? 0,
      onlineStock: onlineInv?.quantity ?? 0,
      posPrice: posInv?.channelPrice ?? product.price,
      onlinePrice: onlineInv?.channelPrice ?? product.price,
      vsmPrice: vehicleInv?.channelPrice ?? product.price,
      vehicleStock,
      vehicleStoreStock,
      totalStock
    });
  } catch (error) {
    logger.error("[PRODUCT] Get by id failed", error);
    return errorResponse(res, 500, "Failed to fetch product");
  }
};

/* ============================================================================
   UPDATE PRODUCT
============================================================================ */
const updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    let data = { ...req.body };

    const exists = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!exists) return errorResponse(res, 404, "Product not found");

    // ✅ Explicitly handle mrp: null — allow callers to clear the MRP (e.g. remove offer / rollback)
    if (Object.prototype.hasOwnProperty.call(req.body, 'mrp') && req.body.mrp === null) {
      data.mrp = null;
    }

    // ✅ Explicitly handle flashDealEnd: null — allow clearing the flash deal
    if (Object.prototype.hasOwnProperty.call(req.body, 'flashDealEnd')) {
      if (req.body.flashDealEnd === null) {
        data.flashDealEnd = null;
      } else if (typeof req.body.flashDealEnd === 'string') {
        data.flashDealEnd = new Date(req.body.flashDealEnd);
      }
    }

    // Floor and Ceiling validation for selling price
    // Only validate if any of the pricing fields are being updated
    if (data.price !== undefined || data.mrp !== undefined || data.costPrice !== undefined) {
      const newPrice = data.price !== undefined ? Number(data.price) : exists.price;
      const newMrp = data.mrp !== undefined ? (data.mrp !== null ? Number(data.mrp) : null) : exists.mrp;
      const newCostPrice = data.costPrice !== undefined ? (data.costPrice !== null ? Number(data.costPrice) : null) : exists.costPrice;

      if (newMrp !== null && newPrice > newMrp) {
        return errorResponse(res, 400, `Selling price (${newPrice}) cannot exceed ceiling price / MRP (${newMrp})`);
      }
      
      // Allow promotional/flash/offer pricing or explicit bypass to sell below floor price (e.g. loss-leader marketing promotions)
      const isPromoDeal = Boolean(
        data.allowBelowCost ||
        data.discountType === 'OFFER' ||
        (data.flashDealEnd && new Date(data.flashDealEnd) > new Date()) ||
        (exists.flashDealEnd && new Date(exists.flashDealEnd) > new Date()) ||
        (data.mrp && Number(data.mrp) > newPrice)
      );

      if (!isPromoDeal && newCostPrice !== null && newPrice < newCostPrice) {
        return errorResponse(res, 400, `Selling price (${newPrice}) cannot be lower than floor price / Cost Price (${newCostPrice})`);
      }
    }

    // ✅ Check for duplicate slug (per warehouse, not globally)
    // Only validate if slug is being updated and is different from current slug
    if (data.slug && data.slug !== exists.slug) {
      const existingSlug = await prisma.product.findFirst({
        where: {
          slug: data.slug,
          warehouseId: data.warehouseId || exists.warehouseId,
          NOT: {
            id: productId  // Exclude current product from check
          }
        }
      });
      if (existingSlug) {
        return errorResponse(
          res,
          409,
          'Product slug must be unique within the warehouse'
        );
      }
    }

    // ✅ Validation for return policy on update
    if (data.isReturnable === true && !data.returnableDays && !exists.returnableDays) {
      return errorResponse(res, 400, "returnableDays is required when isReturnable is true");
    }
    if (data.returnableDays && (parseInt(data.returnableDays) <= 0 || parseInt(data.returnableDays) > 365)) {
      return errorResponse(res, 400, "returnableDays must be between 1 and 365");
    }

    // ✅ Validation for cancellation policy on update
    const validOrderStatuses = ["PLACED", "CONFIRMED", "PROCESSING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"];
    if (data.isCancelable === true && (!data.cancellableOrderStatuses || !Array.isArray(data.cancellableOrderStatuses) || data.cancellableOrderStatuses.length === 0) && (!exists.cancellableOrderStatuses || exists.cancellableOrderStatuses.length === 0)) {
      return errorResponse(res, 400, "cancellableOrderStatuses is required and must be an array when isCancelable is true");
    }
    if (data.cancellableOrderStatuses && Array.isArray(data.cancellableOrderStatuses)) {
      const invalidStatuses = data.cancellableOrderStatuses.filter(status => !validOrderStatuses.includes(status));
      if (invalidStatuses.length > 0) {
        return errorResponse(res, 400, `Invalid order statuses: ${invalidStatuses.join(", ")}. Valid statuses are: ${validOrderStatuses.join(", ")}`);
      }
    }

    if (data.categoryId) {
      data.category = { connect: { id: data.categoryId } };
    }
    if (data.subCategoryId) {
      data.subCategory = { connect: { id: data.subCategoryId } };
    }
    if (data.brandId) {
      data.brand = { connect: { id: data.brandId } };
    }
    if (data.warehouseId) {
      data.warehouse = { connect: { id: data.warehouseId } };
    }

    if (data.supplierIds) {
      const suppliers = await prisma.supplier.findMany({
        where: { id: { in: data.supplierIds } },
        select: { id: true },
      });
      data.supplier = { set: suppliers.map((s) => ({ id: s.id })) };
    }

    // Always clean up relation ID fields to prevent Prisma schema validation errors
    delete data.categoryId;
    delete data.subCategoryId;
    delete data.brandId;
    delete data.warehouseId;
    delete data.supplierIds;

    // ✅ Process new fields for update
    if (data.returnableDays) {
      data.returnableDays = parseInt(data.returnableDays);
    }
    if (data.cancellableOrderStatuses && Array.isArray(data.cancellableOrderStatuses)) {
      // Keep as is, already validated
    }

    delete data.id;
    delete data.createdAt;
    let targetLandingPrice = null;
    if (data.landingPrice !== undefined || data.costPrice !== undefined) {
      targetLandingPrice = Number(data.landingPrice ?? data.costPrice ?? 0);
      data.costPrice = targetLandingPrice;
    }
    delete data.landingPrice;

    // Extract custom prices to avoid Prisma crash on base Product
    const posPrice = data.posPrice;
    const onlinePrice = data.onlinePrice;
    const vsmPrice = data.vsmPrice;
    const minOrderQty = data.minOrderQty;
    const maxOrderQty = data.maxOrderQty;
    const discountType = data.discountType;
    const discountValue = data.discountValue;

    delete data.posPrice;
    delete data.onlinePrice;
    delete data.vsmPrice;
    delete data.allowBelowCost;
    delete data.approvalStatus;
    delete data.channelPrice;

    if (minOrderQty !== undefined && !isNaN(minOrderQty)) {
      data.minOrderQty = parseInt(minOrderQty);
    } else {
      delete data.minOrderQty;
    }
    if (maxOrderQty !== undefined && !isNaN(maxOrderQty)) {
      data.maxOrderQty = parseInt(maxOrderQty);
    } else {
      delete data.maxOrderQty;
    }

    // Determine if we are transitioning from RAW to READY or PRODUCTION
    const isTransitioningToReady = (exists.inventoryType === 'RAW' && data.inventoryType === 'READY');
    const isTransitioningToProduction = (data.inventoryType === 'PRODUCTION');
    const transferQty = data.transferQty !== undefined && data.transferQty !== null ? Number(data.transferQty) : null;
    const transferGrnId = data.grnId || null;

    delete data.transferQty;
    delete data.grnId;

    if (isTransitioningToProduction) {
      let availableRawStock = Number(exists.stock || 0);

      try {
        const grnAgg = await prisma.procurementGoodsReceiptItem.aggregate({
          where: { productId },
          _sum: { receivedQty: true }
        });
        const totalProcured = grnAgg._sum.receivedQty;

        if (totalProcured !== null && totalProcured > 0) {
          const existingProdStock = await prisma.productionStock.findUnique({
            where: { productId }
          });
          const alreadyInProduction = Number(existingProdStock?.inProductionQty || 0);
          availableRawStock = Math.max(0, totalProcured - alreadyInProduction);
        }
      } catch (_aggErr) {
        // Fallback to exists.stock
      }

      const effectiveTransfer = (transferQty !== null && !isNaN(transferQty) && transferQty > 0)
        ? transferQty
        : availableRawStock;

      const remainingStock = Math.max(0, availableRawStock - effectiveTransfer);
      if (remainingStock > 0) {
        // Keep in RAW inventory with reduced stock!
        data.inventoryType = 'RAW';
        data.stock = remainingStock;
      } else {
        // Completely moved to PRODUCTION
        data.inventoryType = 'PRODUCTION';
        data.stock = 0;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const productUpdated = await tx.product.update({
        where: { id: productId },
        data,
        include: {
          warehouse: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          subCategory: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
          supplier: { select: { id: true, companyName: true } },
        },
      });

      if (targetLandingPrice !== null && targetLandingPrice > 0) {
        try {
          await tx.productVariant.updateMany({
            where: { productId },
            data: { landingPrice: targetLandingPrice }
          });
        } catch (_vErr) {}
      }

      if (isTransitioningToProduction) {
        const currentStock = Number(exists.stock || 0);
        const effectiveTransfer = (transferQty !== null && !isNaN(transferQty) && transferQty > 0)
          ? transferQty
          : (currentStock > 0 ? currentStock : 0);

        if (effectiveTransfer > 0) {
          await tx.productionStock.upsert({
            where: { productId },
            create: {
              productId,
              warehouseId: exists.warehouseId,
              inProductionQty: effectiveTransfer,
              processingStage: 'GRADING_PACKING',
              notes: transferGrnId ? `Transferred from GRN: ${transferGrnId}` : 'Transferred from Raw Inventory'
            },
            update: {
              inProductionQty: { increment: effectiveTransfer },
              ...(transferGrnId && { notes: `Transferred from GRN: ${transferGrnId}` })
            }
          });

          let location = await tx.inventoryLocation.findFirst({
            where: { warehouseId: exists.warehouseId }
          }) || await tx.inventoryLocation.findFirst();

          if (location) {
            await tx.inventoryLedger.create({
              data: {
                productId: exists.id,
                locationId: location.id,
                quantity: effectiveTransfer,
                transactionType: 'OUTWARD',
                referenceId: exists.id,
                notes: `Transferred ${effectiveTransfer} RAW stock to PRODUCTION`
              }
            });
          }
        }
      }

      if (isTransitioningToReady) {
        // Resolve a location for ledger entry
        let location = await tx.inventoryLocation.findFirst({
          where: { warehouseId: exists.warehouseId }
        });
        if (!location) {
          location = await tx.inventoryLocation.findFirst();
        }

        if (location) {
          // Log RAW deduction
          await tx.inventoryLedger.create({
            data: {
              productId: exists.id,
              locationId: location.id,
              quantity: exists.stock,
              transactionType: 'OUTWARD',
              referenceId: exists.id,
              notes: 'Converted RAW stock to READY (Deduction)'
            }
          });
          // Log READY addition
          await tx.inventoryLedger.create({
            data: {
              productId: exists.id,
              locationId: location.id,
              quantity: exists.stock,
              transactionType: 'INWARD',
              referenceId: exists.id,
              notes: 'Converted RAW stock to READY (Addition)'
            }
          });
        }
      }

      return productUpdated;
    });

    const targetWhId = updated.warehouseId || req.user?.warehouseId || 'default_wh';

    if (posPrice !== undefined) {
      try {
        const existingPos = await prisma.channelInventory.findFirst({
          where: { productId, channel: 'POS_STORE' }
        });
        if (existingPos) {
          await prisma.channelInventory.update({
            where: { id: existingPos.id },
            data: { channelPrice: Number(posPrice) }
          });
        } else {
          await prisma.channelInventory.create({
            data: {
              id: crypto.randomUUID(),
              channel: 'POS_STORE',
              warehouseId: targetWhId,
              productId,
              productVariantId: null,
              channelPrice: Number(posPrice),
              quantity: 0,
              isActive: true
            }
          });
        }
      } catch (err) {
        logger.warn('[PRODUCT] ChannelInventory POS_STORE update warning:', err?.message);
      }
    }

    if (onlinePrice !== undefined || minOrderQty !== undefined || maxOrderQty !== undefined || discountValue !== undefined) {
      const channelUpdate = {};
      if (onlinePrice !== undefined) channelUpdate.channelPrice = Number(onlinePrice);
      if (minOrderQty !== undefined) channelUpdate.minOrderQty = parseInt(minOrderQty);
      if (maxOrderQty !== undefined) channelUpdate.maxOrderQty = parseInt(maxOrderQty);
      if (discountType !== undefined) channelUpdate.discountType = discountType;
      if (discountValue !== undefined) channelUpdate.discountValue = parseFloat(discountValue);

      try {
        const existingOnline = await prisma.channelInventory.findFirst({
          where: { productId, channel: 'ONLINE_APP' }
        });
        if (existingOnline) {
          await prisma.channelInventory.update({
            where: { id: existingOnline.id },
            data: channelUpdate
          });
        } else {
          await prisma.channelInventory.create({
            data: {
              id: crypto.randomUUID(),
              channel: 'ONLINE_APP',
              warehouseId: targetWhId,
              productId,
              productVariantId: null,
              channelPrice: onlinePrice !== undefined ? Number(onlinePrice) : (updated.finalPrice || updated.price || 0),
              minOrderQty: minOrderQty !== undefined ? parseInt(minOrderQty) : 1,
              maxOrderQty: maxOrderQty !== undefined ? parseInt(maxOrderQty) : 50,
              discountType: discountType || null,
              discountValue: discountValue !== undefined ? parseFloat(discountValue) : null,
              quantity: 0,
              isActive: true
            }
          });
        }
      } catch (err) {
        logger.warn('[PRODUCT] ChannelInventory ONLINE_APP update warning:', err?.message);
      }
    }

    if (vsmPrice !== undefined && vsmPrice !== null && !isNaN(vsmPrice)) {
      try {
        const existingVehicle = await prisma.channelInventory.findFirst({
          where: { productId, channel: 'VEHICLE' }
        });
        if (existingVehicle) {
          await prisma.channelInventory.update({
            where: { id: existingVehicle.id },
            data: { channelPrice: Number(vsmPrice) }
          });
        } else {
          await prisma.channelInventory.create({
            data: {
              id: crypto.randomUUID(),
              channel: 'VEHICLE',
              warehouseId: targetWhId,
              productId,
              productVariantId: null,
              channelPrice: Number(vsmPrice),
              quantity: 0,
              isActive: true
            }
          });
        }
      } catch (err) {
        logger.warn('[PRODUCT] ChannelInventory VEHICLE update warning:', err?.message);
      }
    }

    if (data.isActive !== undefined) {
      try {
        await prisma.channelInventory.updateMany({
          where: { productId },
          data: { isActive: Boolean(data.isActive) }
        });
      } catch (err) {
        logger.warn('[PRODUCT] ChannelInventory isActive sync warning:', err?.message);
      }
    }

    logger.info("[PRODUCT] Updated", { id: productId });
    
    // Invalidate inventory cache to immediately reflect VSM price changes
    if (typeof InventoryCache !== 'undefined') {
      try {
        await InventoryCache.invalidatePrefix(`vsms:inventory:`);
        await InventoryCache.invalidatePrefix(`vsms:items:`);
        await InventoryCache.invalidatePrefix(`vsms:products:`);
        await InventoryCache.invalidatePrefix(`vsms:catalog:`);
      } catch (err) {
        logger.warn('[PRODUCT] Cache invalidation failed:', err?.message);
      }
    }
    await emitCanonicalEvent({
      eventName: CANONICAL_EVENTS.productUpdated,
      eventId: `PRODUCT_UPDATED:${productId}:UPDATE`,
      entityType: "PRODUCT",
      entityId: productId,
      action: "UPDATE",
      beforeJson: exists,
      afterJson: updated,
      payload: {
        actorId: req.user?.id,
        actorRole: req.user?.role,
        updateType: "UPDATE",
      },
    });
    return successResponse(res, 200, updated, "Product updated successfully");
  } catch (error) {
    logger.error("[PRODUCT] Update failed", error);
    return errorResponse(res, 500, "Update failed");
  }
};

const getPendingProducts = async (req, res) => {
  try {
    const userId = req.user.id;
    const warehouseId = await getWarehouseFromUser(userId, prisma);

    const { categoryId, sellerId, search, page = 1, limit = 20 } = req.query;

    let where = {
      status: "PENDING",
      warehouseId, // 🔥
    };

    if (categoryId) where.categoryId = categoryId;
    if (sellerId) where.supplierId = sellerId;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { category: { name: { contains: search, mode: "insensitive" } } },
        { subCategory: { name: { contains: search, mode: "insensitive" } } },
        { brand: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const skip = (page - 1) * limit;

    const products = await prisma.product.findMany({
      where,
      skip,
      take: Number(limit),
      include: {
        warehouse: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        subCategory: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        supplier: { select: { id: true, companyName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const [totalPending, totalApproved, totalRejected] = await Promise.all([
      prisma.product.count({ where: { status: "PENDING", warehouseId } }),
      prisma.product.count({ where: { status: "APPROVED", warehouseId } }),
      prisma.product.count({ where: { status: "REJECTED", warehouseId } }),
    ]);

    logger.info("[PRODUCT] Pending fetched", { warehouseId });

    return successResponse(
      res,
      200,
      {
        counts: {
          totalPending,
          totalApproved,
          totalRejected,
          totalRequested: totalPending + totalApproved + totalRejected,
        },
        pagination: {
          page: Number(page),
          limit: Number(limit),
        },
        products,
      },
      "Pending products fetched successfully",
    );
  } catch (error) {
    logger.error("[PRODUCT] Pending fetch error", error);
    return errorResponse(res, 500, "Failed to fetch pending products");
  }
};

const updateProductStatus = async (req, res) => {
  try {
    const { productId } = req.params;
    const { status, isActive, reason } = req.body;

    // check product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return errorResponse(res, 404, "Product not found");
    }

    const dataToUpdate = {};
    if (status) {
      dataToUpdate.status = status;
    }
    if (isActive !== undefined) {
      dataToUpdate.isActive = Boolean(isActive);
    } else if (status === 'APPROVED' || status === 'ACTIVE') {
      dataToUpdate.isActive = true;
    } else if (status === 'REJECTED' || status === 'INACTIVE') {
      dataToUpdate.isActive = false;
    }

    if (Object.keys(dataToUpdate).length === 0) {
      dataToUpdate.isActive = !product.isActive;
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: dataToUpdate,
    });

    logger.info(`[Product] Status updated for ${productId} → ${status}`);
    await emitCanonicalEvent({
      eventName: CANONICAL_EVENTS.productUpdated,
      eventId: `PRODUCT_UPDATED:${productId}:STATUS:${status}`,
      entityType: "PRODUCT",
      entityId: productId,
      action: "STATUS_UPDATED",
      beforeJson: product,
      afterJson: updated,
      payload: {
        actorId: req.user?.id,
        actorRole: req.user?.role,
        updateType: "STATUS_UPDATED",
        reason: reason || null,
      },
    });

    return successResponse(
      res,
      200,
      updated,
      "Product status updated successfully",
    );
  } catch (error) {
    logger.error("[Product] Status update error", error);
    return errorResponse(res, 500, "Failed to update status");
  }
};

const softDeleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) return errorResponse(res, 404, "Product not found");

    let deleted = await prisma.$transaction(async (tx) => {
      // 1. Cascade delete transient/volatile relations
      await tx.cartItem.deleteMany({ where: { productId } });
      await tx.productLocation.deleteMany({ where: { productId } });
      await tx.productPrice.deleteMany({ where: { productId } });
      await tx.productVariant.deleteMany({ where: { productId } });
      await tx.vendorItemMapping.deleteMany({ where: { productId } });

      // 2. Cascade delete transaction / history tables in dependency order
      const orderItemIds = (await tx.orderItem.findMany({ where: { productId }, select: { id: true } })).map(item => item.id);
      await tx.return.deleteMany({ where: { orderItemId: { in: orderItemIds } } });
      await tx.orderItem.deleteMany({ where: { productId } });
      await tx.stockTransaction.deleteMany({ where: { productId } });
      await tx.vehicleStock.deleteMany({ where: { productId } });
      await tx.refillItem.deleteMany({ where: { productId } });
      await tx.stockAuditItem.deleteMany({ where: { productId } });
      await tx.purchaseOrderItem.deleteMany({ where: { productId } });
      await tx.goodsReceiptItem.deleteMany({ where: { productId } });
      await tx.purchaseInvoiceItem.deleteMany({ where: { productId } });
      await tx.damageEntry.deleteMany({ where: { productId } });
      await tx.purchaseRequisitionItem.deleteMany({ where: { productId } });
      await tx.procurementGoodsReceiptItem.deleteMany({ where: { productId } });
      await tx.procurementStockTransferItem.deleteMany({ where: { productId } });
      await tx.procurementStockLedger.deleteMany({ where: { productId } });
      await tx.bundleItem.deleteMany({ where: { productId } });

      return await tx.product.delete({
        where: { id: productId },
      });
    });

    await emitCanonicalEvent({
      eventName: CANONICAL_EVENTS.productUpdated,
      eventId: `PRODUCT_UPDATED:${productId}:HARD_DELETE`,
      entityType: "PRODUCT",
      entityId: productId,
      action: "DELETE",
      beforeJson: product,
      afterJson: deleted,
      payload: {
        actorId: req.user?.id,
        actorRole: req.user?.role,
        updateType: "HARD_DELETE",
      },
    });

    return successResponse(res, 200, deleted, "Product permanently deleted");
  } catch (error) {
    logger.error("[PRODUCT] Permanent delete failed", error);
    return errorResponse(res, 500, error.message || "Delete failed");
  }
};

const getAllBrands = async (req, res) => {
  try {
    const { categoryId, subCategoryId } = req.query;

    if (!categoryId && !subCategoryId) {
      return errorResponse(
        res,
        400,
        "categoryId or subCategoryId is required"
      );
    }

    const userId = req.user?.id;
    const warehouseId = await getWarehouseFromUser(userId, prisma);

    // Fetch warehouse approved category IDs
    const warehouseCats = await prisma.warehouseCategory.findMany({
      where: {
        warehouseId,
        isEnabled: true,
        approvalStatus: 'APPROVED'
      },
      select: { categoryId: true }
    });

    const approvedCategoryIds = warehouseCats.map(wc => wc.categoryId);

    const brands = await prisma.brand.findMany({
      where: {
        ...(categoryId && { categoryId }),
        ...(subCategoryId && { subCategoryId }),
        categoryId: { in: approvedCategoryIds },
        isActive: true,
      },
      orderBy: { priority: "desc" },
    });

    return successResponse(
      res,
      200,
      brands,
      "Brands fetched successfully"
    );
  } catch (error) {
    logger.error(`Error fetching brands by category: ${error.message}`);
    return errorResponse(res, 500, "Error fetching brands");
  }
};

const getAllCategories = async (req, res) => {
  logger.info("Get All Categories API called", { query: req.query });

  try {
    const {
      page,
      limit,
      search = "",
      isActive,
      sortBy = "displayOrder",
      order = "asc"
    } = req.query;

    const userId = req.user?.id;
    const warehouseId = await getWarehouseFromUser(userId, prisma);

    // Fetch warehouse approved category IDs
    const warehouseCats = await prisma.warehouseCategory.findMany({
      where: {
        warehouseId,
        isEnabled: true,
        approvalStatus: 'APPROVED'
      },
      select: { categoryId: true }
    });

    const approvedCategoryIds = warehouseCats.map(wc => wc.categoryId);

    const shouldPaginate = page && limit;
    const skip = shouldPaginate ? (Number(page) - 1) * Number(limit) : undefined;
    const take = shouldPaginate ? Number(limit) : undefined;

    const where = {
      id: { in: approvedCategoryIds },
      ...(search && {
        name: { contains: search, mode: "insensitive" }
      }),
      ...(isActive !== undefined && {
        isActive: isActive === "true"
      })
    };

    const [total, data] = await Promise.all([
      prisma.category.count({ where }),

      prisma.category.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: order },
        include: {
          subCategories: true,
          products: true
        }
      })
    ]);

    logger.info("Warehouse categories fetched", {
      count: data.length
    });

    return res.json({
      total,
      ...(shouldPaginate && {
        page: Number(page),
        limit: Number(limit)
      }),
      data
    });

  } catch (error) {
    logger.error("Error fetching categories", error);

    res.status(500).json({
      message: error.message || "Internal Server Error"
    });
  }
};

const getAllSubCategories = async (req, res) => {
  logger.info("Get All SubCategories API called", { query: req.query });

  try {
    const {
      page,
      limit,
      search = "",
      categoryId,
      isActive,
      sortBy = "displayOrder",
      order = "asc"
    } = req.query;

    const userId = req.user?.id;
    const warehouseId = await getWarehouseFromUser(userId, prisma);

    // Fetch warehouse approved subcategory IDs
    const warehouseSubs = await prisma.warehouseSubCategory.findMany({
      where: {
        warehouseId,
        isEnabled: true,
        approvalStatus: 'APPROVED',
        ...(categoryId && {
          warehouseCategory: {
            categoryId
          }
        })
      },
      select: { subCategoryId: true }
    });

    const approvedSubCategoryIds = warehouseSubs.map(ws => ws.subCategoryId);

    const shouldPaginate = page && limit;
    const skip = shouldPaginate ? (Number(page) - 1) * Number(limit) : undefined;
    const take = shouldPaginate ? Number(limit) : undefined;

    const where = {
      id: { in: approvedSubCategoryIds },
      ...(search && { name: { contains: search, mode: "insensitive" } }),
      ...(categoryId && { categoryId }),
      ...(isActive !== undefined && { isActive: isActive === "true" })
    };

    const [total, data] = await Promise.all([
      prisma.subCategory.count({ where }),
      prisma.subCategory.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: order },
        include: {
          category: true,
          products: true
        }
      })
    ]);

    return res.json({
      total,
      ...(shouldPaginate && { page: Number(page), limit: Number(limit) }),
      data
    });

  } catch (error) {
    logger.error("Error fetching subCategories", error);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

const getWarehouseFromUser = async (userId, prisma) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { warehouseId: true },
    });

    if (user?.warehouseId) {
      return user.warehouseId;
    }
  } catch (err) {
    logger.warn("getWarehouseFromUser query failed", err);
  }

  // Return a dummy UUID to prevent leaking other warehouses' data
  return "00000000-0000-0000-0000-000000000000";
};

/* =====================================================
DOWNLOAD PRODUCT BULK UPLOAD TEMPLATE
GET /api/v1/products/template/download
===================================================== */
const downloadProductTemplate = async (req, res) => {
  try {
    logger.info('[PRODUCT] Bulk template download started')

    const userId = req.user.id
    const warehouseId = await getWarehouseFromUser(userId, prisma)

    const maxDataRows = 1000

    /* -------------------------------------------------------
       Helpers
    ------------------------------------------------------- */
    const getSafeDefinedName = (name, suffix = '') => {
      let safeName = String(name || '')
        .trim()
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')

      if (!safeName) safeName = 'EMPTY_NAME'

      if (/^[0-9]/.test(safeName)) {
        safeName = `_${safeName}`
      }

      return `${safeName}${suffix}`
    }

    const buildSafeNameMap = (items, suffix = '') => {
      const usedSafeNames = new Map()
      const safeNameMap = new Map()

      items.forEach((item) => {
        const originalName = item.name
        const baseSafeName = getSafeDefinedName(originalName, suffix)

        const count = usedSafeNames.get(baseSafeName) || 0
        const finalSafeName =
          count === 0 ? baseSafeName : `${baseSafeName}_${count + 1}`

        usedSafeNames.set(baseSafeName, count + 1)
        safeNameMap.set(originalName, finalSafeName)
      })

      return safeNameMap
    }

    /* -------------------------------------------------------
       Warehouse enabled categories and subcategories
    ------------------------------------------------------- */
    const warehouseCats = await prisma.warehouseCategory.findMany({
      where: {
        warehouseId,
        isEnabled: true,
        category: {
          isActive: true
        }
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        }
      },
      orderBy: {
        displayOrder: 'asc'
      }
    })

    const categories = warehouseCats
      .map((wc) => wc.category)
      .filter(Boolean)

    const allowedCategoryIds = categories.map((category) => category.id)

    const warehouseSubCats = await prisma.warehouseSubCategory.findMany({
      where: {
        warehouseId,
        warehouseCategory: {
          warehouseId,
          isEnabled: true,
          categoryId: {
            in: allowedCategoryIds
          }
        },
        subCategory: {
          isActive: true,
          category: {
            isActive: true
          }
        }
      },
      include: {
        subCategory: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                isActive: true
              }
            }
          }
        }
      }
    })

    const subCategories = warehouseSubCats
      .map((wsc) => wsc.subCategory)
      .filter(Boolean)

    const [brands, unitTypes, units, taxes] = await Promise.all([
      prisma.brand.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true
        },
        orderBy: { name: 'asc' }
      }),

      prisma.unitType.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          name: true
        },
        orderBy: [
          { displayOrder: 'asc' },
          { name: 'asc' }
        ]
      }),

      prisma.unit.findMany({
        where: {
          status: 'ACTIVE',
          unitType: {
            status: 'ACTIVE'
          }
        },
        select: {
          id: true,
          name: true,
          unitType: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: [
          { unitTypeId: 'asc' },
          { displayOrder: 'asc' },
          { name: 'asc' }
        ]
      }),

      prisma.tax.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          title: true,
          percentage: true
        },
        orderBy: [
          { displayOrder: 'asc' },
          { title: 'asc' }
        ]
      })
    ])

    logger.info('[PRODUCT] Template reference data fetched', {
      warehouseId,
      categories: categories.length,
      subCategories: subCategories.length,
      brands: brands.length,
      unitTypes: unitTypes.length,
      units: units.length,
      taxes: taxes.length
    })

    const categorySafeNameMap = buildSafeNameMap(categories, '_subs')
    const unitTypeSafeNameMap = buildSafeNameMap(unitTypes, '_units')

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'VillagKart Partner'
    workbook.created = new Date()

    const productHeaders = [
      'category',
      'subCategory',
      'name',
      'taxRate',
      'slug',
      'brand',
      'tags',
      'productType',
      'inventoryType',
      'description',
      'shortDescription',
      'images',
      'unitType',
      'unit',
      'measurement',
      'landingPrice',
      'price',
      'mrp',
      'discountType',
      'discountValue',
      'finalPrice',
      'costPrice',
      'stock',
      'threshold',
      'minOrderQty',
      'maxOrderQty',
      'metaTitle',
      'metaKeywords',
      'schemaMarkup',
      'metaDescription',
      'manufacturer',
      'madeIn',
      'fssaiLicNo',
      'isReturnable',
      'returnableDays',
      'isCancelable',
      'cancellableOrderStatuses',
      'isCodAllowed',
      'isActive',
      'isFeatured',
      'variantName',
      'sku'
    ]

    const requiredColumnIndices = [
      1,
      2,
      3,
      8,
      10,
      13,
      14,
      15,
      16,
      18,
      19,
      23
    ]

    const productSheet = workbook.addWorksheet('Products', {
      views: [{ state: 'frozen', ySplit: 1 }]
    })

    productSheet.addRow(productHeaders)

    const categorySafeNameColIndex = productHeaders.length + 1
    const categorySafeNameColLetter = getColumnLetter(categorySafeNameColIndex)

    const unitTypeSafeNameColIndex = productHeaders.length + 2
    const unitTypeSafeNameColLetter = getColumnLetter(unitTypeSafeNameColIndex)

    productSheet.getCell(`${categorySafeNameColLetter}1`).value = 'categorySafeName'
    productSheet.getColumn(categorySafeNameColIndex).hidden = true

    productSheet.getCell(`${unitTypeSafeNameColLetter}1`).value = 'unitTypeSafeName'
    productSheet.getColumn(unitTypeSafeNameColIndex).hidden = true

    const exampleRows = [
      [
        'Dairy',
        'Milk',
        'Amul Milk 1L',
        5,
        'amul-milk-1l',
        'Amul',
        'milk,fresh',
        'BRANDED',
        'PHYSICAL',
        'Fresh Amul milk 1 litre',
        'Milk 1L',
        'img1.jpg,img2.jpg',
        'Volume',
        'Litre',
        '1',
        60,
        60,
        65,
        'PERCENTAGE',
        10,
        '',
        50,
        100,
        10,
        1,
        10,
        'Amul Milk 1L',
        'milk,fresh,amul',
        '',
        'Fresh Amul milk 1 litre',
        'Amul',
        'India',
        '',
        'TRUE',
        7,
        'TRUE',
        'Placed, Confirmed',
        'TRUE',
        'TRUE',
        'FALSE',
        '1L',
        ''
      ]
    ]

    exampleRows.forEach((row) => productSheet.addRow(row))

    /* -------------------------------------------------------
       Formula columns

       P = landingPrice
       Q = price
       R = mrp
       S = discountType
       T = discountValue
       U = finalPrice

       Important:
       price/finalPrice formulas are applied only for example rows.
       Do not apply price/finalPrice formulas till 1000 rows.
    ------------------------------------------------------- */
    const exampleStartRow = 2
    const exampleEndRow = exampleRows.length + 1

    for (let row = exampleStartRow; row <= exampleEndRow; row++) {
      productSheet.getCell(`Q${row}`).value = {
        formula: `IF(OR(P${row}="",P${row}=0),"",P${row})`
      }

      productSheet.getCell(`U${row}`).value = {
        formula: `IF(OR(R${row}="",R${row}=0),"",IF(S${row}="PERCENTAGE",ROUND(R${row}-(R${row}*T${row}/100),2),IF(S${row}="RUPEES",ROUND(R${row}-T${row},2),R${row})))`
      }
    }

    /*
      Hidden helper formulas are okay till 1000 rows because upload API should ignore
      categorySafeName/unitTypeSafeName columns. They do not create visible finalPrice 0.
    */
    for (let row = 2; row <= maxDataRows; row++) {
      productSheet.getCell(`${categorySafeNameColLetter}${row}`).value = {
        formula: `IFERROR(VLOOKUP(A${row},CategorySafeNames!$A$2:$B$${Math.max(categories.length + 1, 2)},2,FALSE),"")`
      }

      productSheet.getCell(`${unitTypeSafeNameColLetter}${row}`).value = {
        formula: `IFERROR(VLOOKUP(M${row},UnitTypeSafeNames!$A$2:$B$${Math.max(unitTypes.length + 1, 2)},2,FALSE),"")`
      }
    }

    const applyListValidation = (colIndex, formulaOrValues) => {
      const colLetter = getColumnLetter(colIndex)

      for (let row = 2; row <= maxDataRows; row++) {
        try {
          productSheet.getCell(`${colLetter}${row}`).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: Array.isArray(formulaOrValues)
              ? [`"${formulaOrValues.join(',')}"`]
              : [formulaOrValues],
            showErrorMessage: true,
            errorTitle: 'Invalid value',
            error: 'Select a valid value from dropdown.'
          }
        } catch (err) {
          logger.error(`[PRODUCT] Data validation error ${colLetter}${row}`, err)
        }
      }
    }

    applyListValidation(8, ['BRANDED', 'NON-BRANDED'])
    applyListValidation(9, ['PHYSICAL', 'DIGITAL'])
    applyListValidation(19, ['PERCENTAGE', 'RUPEES'])

    applyListValidation(34, ['TRUE', 'FALSE'])
    applyListValidation(36, ['TRUE', 'FALSE'])
    applyListValidation(38, ['TRUE', 'FALSE'])
    applyListValidation(39, ['TRUE', 'FALSE'])
    applyListValidation(40, ['TRUE', 'FALSE'])

    const lastBrand = brands.length > 0 ? Math.min(brands.length + 1, 500) : 2
    const lastCategory = categories.length > 0 ? Math.min(categories.length + 1, 500) : 2
    const lastUnitType = unitTypes.length > 0 ? Math.min(unitTypes.length + 1, 500) : 2
    const lastTax = taxes.length > 0 ? Math.min(taxes.length + 1, 500) : 2

    if (categories.length > 0) {
      applyListValidation(1, `Categories!$B$2:$B$${lastCategory}`)
    }

    if (taxes.length > 0) {
      applyListValidation(4, `Taxes!$C$2:$C$${lastTax}`)
    }

    if (brands.length > 0) {
      applyListValidation(6, `Brands!$B$2:$B$${lastBrand}`)
    }

    if (unitTypes.length > 0) {
      applyListValidation(13, `UnitTypes!$B$2:$B$${lastUnitType}`)
    }

    for (let row = 2; row <= maxDataRows; row++) {
      try {
        productSheet.getCell(`B${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`INDIRECT(${categorySafeNameColLetter}${row})`],
          showErrorMessage: true,
          errorTitle: 'Invalid subCategory',
          error: 'Select category first, then choose subCategory.'
        }
      } catch (err) {
        logger.error(`[PRODUCT] SubCategory validation error B${row}`, err)
      }
    }

    for (let row = 2; row <= maxDataRows; row++) {
      try {
        productSheet.getCell(`N${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`INDIRECT(${unitTypeSafeNameColLetter}${row})`],
          showErrorMessage: true,
          errorTitle: 'Invalid unit',
          error: 'Select unitType first, then choose unit.'
        }
      } catch (err) {
        logger.error(`[PRODUCT] Unit validation error N${row}`, err)
      }
    }

    productSheet.columns.forEach((col, index) => {
      col.width = 20

      const colIndex = index + 1
      const letter = getColumnLetter(colIndex)
      const isRequired = requiredColumnIndices.includes(colIndex)

      const headerCell = productSheet.getCell(`${letter}1`)

      headerCell.font = {
        bold: true,
        color: { argb: 'FF000000' }
      }

      headerCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: isRequired ? 'FFFFFF99' : 'FFE0E0E0'
        }
      }

      headerCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }

      headerCell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true
      }
    })

    productSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }

        cell.alignment = {
          vertical: 'middle',
          wrapText: true
        }
      })
    })

    const brandsSheet = workbook.addWorksheet('Brands')
    brandsSheet.addRow(['id', 'name'])
    brands.forEach((brand) => brandsSheet.addRow([brand.id, brand.name]))
    brandsSheet.getRow(1).font = { bold: true }
    brandsSheet.columns = [{ width: 38 }, { width: 28 }]

    const categoriesSheet = workbook.addWorksheet('Categories')
    categoriesSheet.addRow(['id', 'name'])
    categories.forEach((category) => {
      categoriesSheet.addRow([category.id, category.name])
    })
    categoriesSheet.getRow(1).font = { bold: true }
    categoriesSheet.columns = [{ width: 38 }, { width: 28 }]

    const subCategoriesSheet = workbook.addWorksheet('SubCategories')
    subCategoriesSheet.addRow(['id', 'name', 'category'])
    subCategories.forEach((subCategory) => {
      subCategoriesSheet.addRow([
        subCategory.id,
        subCategory.name,
        subCategory.category?.name || ''
      ])
    })
    subCategoriesSheet.getRow(1).font = { bold: true }
    subCategoriesSheet.columns = [{ width: 38 }, { width: 28 }, { width: 28 }]

    const taxesSheet = workbook.addWorksheet('Taxes')
    taxesSheet.addRow(['id', 'title', 'percentage'])
    taxes.forEach((tax) => {
      taxesSheet.addRow([
        tax.id,
        tax.title,
        Number(tax.percentage)
      ])
    })
    taxesSheet.getRow(1).font = { bold: true }
    taxesSheet.columns = [{ width: 38 }, { width: 28 }, { width: 18 }]

    const unitTypesSheet = workbook.addWorksheet('UnitTypes')
    unitTypesSheet.addRow(['id', 'name'])
    unitTypes.forEach((unitType) => {
      unitTypesSheet.addRow([unitType.id, unitType.name])
    })
    unitTypesSheet.getRow(1).font = { bold: true }
    unitTypesSheet.columns = [{ width: 38 }, { width: 28 }]

    const unitsSheet = workbook.addWorksheet('Units')
    unitsSheet.addRow(['id', 'name', 'unitType'])
    units.forEach((unit) => {
      unitsSheet.addRow([
        unit.id,
        unit.name,
        unit.unitType?.name || ''
      ])
    })
    unitsSheet.getRow(1).font = { bold: true }
    unitsSheet.columns = [{ width: 38 }, { width: 28 }, { width: 28 }]

    const categorySafeNamesSheet = workbook.addWorksheet('CategorySafeNames')
    categorySafeNamesSheet.addRow(['category', 'safeName'])

    categories.forEach((category) => {
      categorySafeNamesSheet.addRow([
        category.name,
        categorySafeNameMap.get(category.name)
      ])
    })

    if (categories.length === 0) {
      categorySafeNamesSheet.addRow(['', ''])
    }

    categorySafeNamesSheet.getRow(1).font = { bold: true }
    categorySafeNamesSheet.columns = [{ width: 35 }, { width: 35 }]
    categorySafeNamesSheet.state = 'hidden'

    const unitTypeSafeNamesSheet = workbook.addWorksheet('UnitTypeSafeNames')
    unitTypeSafeNamesSheet.addRow(['unitType', 'safeName'])

    unitTypes.forEach((unitType) => {
      unitTypeSafeNamesSheet.addRow([
        unitType.name,
        unitTypeSafeNameMap.get(unitType.name)
      ])
    })

    if (unitTypes.length === 0) {
      unitTypeSafeNamesSheet.addRow(['', ''])
    }

    unitTypeSafeNamesSheet.getRow(1).font = { bold: true }
    unitTypeSafeNamesSheet.columns = [{ width: 35 }, { width: 35 }]
    unitTypeSafeNamesSheet.state = 'hidden'

    const subByCategorySheet = workbook.addWorksheet('SubCategoriesByCategory')

    const categoryToSubs = new Map()

    categories.forEach((category) => {
      categoryToSubs.set(
        category.name,
        subCategories
          .filter((subCategory) => subCategory.category?.name === category.name)
          .map((subCategory) => subCategory.name)
      )
    })

    const maxSubsPerCategory = Math.max(
      1,
      ...categories.map((category) => categoryToSubs.get(category.name)?.length || 0)
    )

    subByCategorySheet.addRow(categories.map((category) => category.name))

    for (let rowIndex = 0; rowIndex < maxSubsPerCategory; rowIndex++) {
      const row = categories.map((category) => {
        const subs = categoryToSubs.get(category.name) || []
        return subs[rowIndex] || ''
      })

      subByCategorySheet.addRow(row)
    }

    categories.forEach((category, index) => {
      const colLetter = getColumnLetter(index + 1)
      const safeName = categorySafeNameMap.get(category.name)

      workbook.definedNames.add(
        `SubCategoriesByCategory!$${colLetter}$2:$${colLetter}$${maxSubsPerCategory + 1}`,
        safeName
      )
    })

    subByCategorySheet.getRow(1).font = { bold: true }

    const unitsByTypeSheet = workbook.addWorksheet('UnitsByType')

    const unitTypeToUnits = new Map()

    unitTypes.forEach((unitType) => {
      unitTypeToUnits.set(
        unitType.name,
        units
          .filter((unit) => unit.unitType?.name === unitType.name)
          .map((unit) => unit.name)
      )
    })

    const maxUnitsPerType = Math.max(
      1,
      ...unitTypes.map((unitType) => unitTypeToUnits.get(unitType.name)?.length || 0)
    )

    unitsByTypeSheet.addRow(unitTypes.map((unitType) => unitType.name))

    for (let rowIndex = 0; rowIndex < maxUnitsPerType; rowIndex++) {
      const row = unitTypes.map((unitType) => {
        const unitList = unitTypeToUnits.get(unitType.name) || []
        return unitList[rowIndex] || ''
      })

      unitsByTypeSheet.addRow(row)
    }

    unitTypes.forEach((unitType, index) => {
      const colLetter = getColumnLetter(index + 1)
      const safeName = unitTypeSafeNameMap.get(unitType.name)

      workbook.definedNames.add(
        `UnitsByType!$${colLetter}$2:$${colLetter}$${maxUnitsPerType + 1}`,
        safeName
      )
    })

    unitsByTypeSheet.getRow(1).font = { bold: true }

    const excelBuffer = await workbook.xlsx.writeBuffer()

    logger.info('[PRODUCT] Bulk template generated successfully', {
      warehouseId,
      size: excelBuffer.byteLength
    })

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="partner-product-bulk-template.xlsx"'
    )

    res.setHeader('Content-Length', excelBuffer.byteLength)
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')

    return res.send(Buffer.from(excelBuffer))
  } catch (error) {
    logger.error('[PRODUCT] Template error', {
      message: error.message,
      stack: error.stack
    })

    if (!res.headersSent) {
      return errorResponse(res, 500, error.message)
    }
  }
}
/* =====================================================
DOWNLOAD PRODUCT UPDATE TEMPLATE
GET /api/v1/products/update-template/download
===================================================== */
const downloadProductUpdateTemplate = async (req, res) => {
  try {
    logger.info('[PRODUCT] Bulk update template download started')

    const userId = req.user.id
    const warehouseId = await getWarehouseFromUser(userId, prisma)

    const parseArrayQuery = (value) => {
      if (!value) return []

      if (Array.isArray(value)) {
        return value
          .flatMap((item) => String(item).split(','))
          .map((item) => item.trim())
          .filter(Boolean)
      }

      return String(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    }

    const getSafeDefinedName = (name, suffix = '') => {
      let safeName = String(name || '')
        .trim()
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')

      if (!safeName) safeName = 'EMPTY_NAME'

      if (/^[0-9]/.test(safeName)) {
        safeName = `_${safeName}`
      }

      return `${safeName}${suffix}`
    }

    const buildSafeNameMap = (items, suffix = '') => {
      const usedSafeNames = new Map()
      const safeNameMap = new Map()

      items.forEach((item) => {
        const originalName = item.name
        const baseSafeName = getSafeDefinedName(originalName, suffix)

        const count = usedSafeNames.get(baseSafeName) || 0
        const finalSafeName =
          count === 0 ? baseSafeName : `${baseSafeName}_${count + 1}`

        usedSafeNames.set(baseSafeName, count + 1)
        safeNameMap.set(originalName, finalSafeName)
      })

      return safeNameMap
    }

    const resolveName = (value, byIdMap, byNameMap) => {
      if (value === null || value === undefined || value === '') return ''

      const rawValue = String(value).trim()

      if (byIdMap.has(rawValue)) {
        return byIdMap.get(rawValue)?.name || ''
      }

      const lowerValue = rawValue.toLowerCase()

      if (byNameMap.has(lowerValue)) {
        return byNameMap.get(lowerValue)?.name || ''
      }

      return rawValue
    }

    const brandIds = parseArrayQuery(req.query.brands)
    const categoryIds = parseArrayQuery(req.query.categories)
    const subCategoryIds = parseArrayQuery(req.query.subCategories)

    const warehouseCats = await prisma.warehouseCategory.findMany({
      where: {
        warehouseId,
        isEnabled: true,
        category: {
          isActive: true
        }
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        }
      },
      orderBy: {
        displayOrder: 'asc'
      }
    })

    const categories = warehouseCats
      .map((wc) => wc.category)
      .filter(Boolean)

    const allowedCategoryIds = categories.map((category) => category.id)

    const warehouseSubCats = await prisma.warehouseSubCategory.findMany({
      where: {
        warehouseId,
        warehouseCategory: {
          warehouseId,
          isEnabled: true,
          categoryId: {
            in: allowedCategoryIds
          }
        },
        subCategory: {
          isActive: true,
          category: {
            isActive: true
          }
        }
      },
      include: {
        subCategory: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                isActive: true
              }
            }
          }
        }
      }
    })

    const subCategories = warehouseSubCats
      .map((wsc) => wsc.subCategory)
      .filter(Boolean)

    const allowedSubCategoryIds = subCategories.map((subCategory) => subCategory.id)

    const filteredCategoryIds =
      categoryIds.length > 0
        ? categoryIds.filter((id) => allowedCategoryIds.includes(id))
        : allowedCategoryIds

    const filteredSubCategoryIds =
      subCategoryIds.length > 0
        ? subCategoryIds.filter((id) => allowedSubCategoryIds.includes(id))
        : allowedSubCategoryIds

    const productWhere = {
      warehouseId
    }

    if (brandIds.length > 0) {
      productWhere.brandId = { in: brandIds }
    }

    if (filteredCategoryIds.length > 0) {
      productWhere.categoryId = { in: filteredCategoryIds }
    }

    if (filteredSubCategoryIds.length > 0) {
      productWhere.subCategoryId = { in: filteredSubCategoryIds }
    }

    const [
      brands,
      unitTypes,
      units,
      taxes,
      allUnitTypesForResolve,
      allUnitsForResolve,
      products
    ] = await Promise.all([
      prisma.brand.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true
        },
        orderBy: { name: 'asc' }
      }),

      prisma.unitType.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          name: true
        },
        orderBy: [
          { displayOrder: 'asc' },
          { name: 'asc' }
        ]
      }),

      prisma.unit.findMany({
        where: {
          status: 'ACTIVE',
          unitType: {
            status: 'ACTIVE'
          }
        },
        select: {
          id: true,
          name: true,
          unitType: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: [
          { unitTypeId: 'asc' },
          { displayOrder: 'asc' },
          { name: 'asc' }
        ]
      }),

      prisma.tax.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          title: true,
          percentage: true
        },
        orderBy: [
          { displayOrder: 'asc' },
          { title: 'asc' }
        ]
      }),

      prisma.unitType.findMany({
        select: {
          id: true,
          name: true
        }
      }),

      prisma.unit.findMany({
        select: {
          id: true,
          name: true,
          unitType: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),

      prisma.product.findMany({
        where: productWhere,
        include: {
          brand: true,
          category: true,
          subCategory: true
        },
        orderBy: { updatedAt: 'desc' }
      })
    ])

    logger.info('[PRODUCT] Update template reference data fetched', {
      warehouseId,
      brands: brands.length,
      categories: categories.length,
      subCategories: subCategories.length,
      unitTypes: unitTypes.length,
      units: units.length,
      taxes: taxes.length,
      products: products.length
    })

    if (!products || products.length === 0) {
      const hasFilters =
        brandIds.length > 0 ||
        categoryIds.length > 0 ||
        subCategoryIds.length > 0

      return errorResponse(
        res,
        404,
        hasFilters
          ? 'No products found for the selected filters in this warehouse.'
          : 'No products are available in this warehouse.'
      )
    }

    const unitTypeByIdMap = new Map(
      allUnitTypesForResolve.map((unitType) => [String(unitType.id).trim(), unitType])
    )

    const unitTypeByNameMap = new Map(
      allUnitTypesForResolve.map((unitType) => [
        String(unitType.name).trim().toLowerCase(),
        unitType
      ])
    )

    const unitByIdMap = new Map(
      allUnitsForResolve.map((unit) => [String(unit.id).trim(), unit])
    )

    const unitByNameMap = new Map(
      allUnitsForResolve.map((unit) => [
        String(unit.name).trim().toLowerCase(),
        unit
      ])
    )

    const categorySafeNameMap = buildSafeNameMap(categories, '_subs')
    const unitTypeSafeNameMap = buildSafeNameMap(unitTypes, '_units')

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'VillagKart Partner'
    workbook.created = new Date()

    /*
      Important:
      Update template should only apply price/finalPrice formulas until actual product rows.
      This avoids formula rows after real products.
    */
    const lastProductRow = products.length + 1
    const maxDataRows = Math.max(lastProductRow, 2)

    const mainHeaders = [
      'id',
      'category',
      'subCategory',
      'name',
      'taxRate',
      'slug',
      'brand',
      'tags',
      'productType',
      'inventoryType',
      'description',
      'shortDescription',
      'images',
      'unitType',
      'unit',
      'measurement',
      'landingPrice',
      'price',
      'mrp',
      'discountType',
      'discountValue',
      'finalPrice',
      'costPrice',
      'stock',
      'threshold',
      'minOrderQty',
      'maxOrderQty',
      'metaTitle',
      'metaKeywords',
      'schemaMarkup',
      'metaDescription',
      'manufacturer',
      'madeIn',
      'fssaiLicNo',
      'isReturnable',
      'isCancelable',
      'isCodAllowed',
      'isActive',
      'isFeatured',
      'variantName',
      'sku'
    ]

    const requiredColumnIndices = [
      1,
      2,
      3,
      4,
      9,
      11,
      14,
      15,
      16,
      17,
      19,
      20,
      24
    ]

    const mainSheet = workbook.addWorksheet('Products', {
      views: [{ state: 'frozen', ySplit: 1 }]
    })

    mainSheet.addRow(mainHeaders)

    const categorySafeNameColIndex = mainHeaders.length + 1
    const categorySafeNameColLetter = getColumnLetter(categorySafeNameColIndex)

    const unitTypeSafeNameColIndex = mainHeaders.length + 2
    const unitTypeSafeNameColLetter = getColumnLetter(unitTypeSafeNameColIndex)

    mainSheet.getCell(`${categorySafeNameColLetter}1`).value = 'categorySafeName'
    mainSheet.getColumn(categorySafeNameColIndex).hidden = true

    mainSheet.getCell(`${unitTypeSafeNameColLetter}1`).value = 'unitTypeSafeName'
    mainSheet.getColumn(unitTypeSafeNameColIndex).hidden = true

    products.forEach((product) => {
      const productUnitType = resolveName(
        product.unitType,
        unitTypeByIdMap,
        unitTypeByNameMap
      )

      const productUnit = resolveName(
        product.unit,
        unitByIdMap,
        unitByNameMap
      )

      const landingPriceValue =
        product.price !== undefined && product.price !== null
          ? product.price
          : ''

      mainSheet.addRow([
        product.id,
        product.category?.name || '',
        product.subCategory?.name || '',
        product.name || '',
        product.taxRate ?? '',
        product.slug || '',
        product.brand?.name || '',
        product.tags?.join(',') || '',
        product.productType || '',
        product.inventoryType || '',
        product.description || '',
        product.shortDescription || '',
        product.images?.join(',') || '',
        productUnitType,
        productUnit,
        product.measurement || '',
        landingPriceValue,
        product.price ?? '',
        product.mrp ?? '',
        product.discountType || '',
        product.discountValue ?? '',
        product.finalPrice ?? '',
        product.costPrice ?? '',
        product.stock ?? '',
        product.threshold ?? '',
        product.minOrderQty ?? '',
        product.maxOrderQty ?? '',
        product.metaTitle || '',
        product.metaKeywords || '',
        product.schemaMarkup || '',
        product.metaDescription || '',
        product.manufacturer || '',
        product.madeIn || '',
        product.fssaiLicNo || '',
        product.isReturnable ? 'TRUE' : 'FALSE',
        product.isCancelable ? 'TRUE' : 'FALSE',
        product.isCodAllowed ? 'TRUE' : 'FALSE',
        product.isActive ? 'TRUE' : 'FALSE',
        product.isFeatured ? 'TRUE' : 'FALSE',
        product.variantName || '',
        product.sku || ''
      ])
    })

    /*
      Q = landingPrice
      R = price
      S = mrp
      T = discountType
      U = discountValue
      V = finalPrice
    */
    for (let row = 2; row <= maxDataRows; row++) {
      mainSheet.getCell(`R${row}`).value = {
        formula: `IF(OR(Q${row}="",Q${row}=0),"",Q${row})`
      }

      mainSheet.getCell(`V${row}`).value = {
        formula: `IF(OR(S${row}="",S${row}=0),"",IF(T${row}="PERCENTAGE",ROUND(S${row}-(S${row}*U${row}/100),2),IF(T${row}="RUPEES",ROUND(S${row}-U${row},2),S${row})))`
      }

      mainSheet.getCell(`${categorySafeNameColLetter}${row}`).value = {
        formula: `IFERROR(VLOOKUP(B${row},CategorySafeNames!$A$2:$B$${Math.max(categories.length + 1, 2)},2,FALSE),"")`
      }

      mainSheet.getCell(`${unitTypeSafeNameColLetter}${row}`).value = {
        formula: `IFERROR(VLOOKUP(N${row},UnitTypeSafeNames!$A$2:$B$${Math.max(unitTypes.length + 1, 2)},2,FALSE),"")`
      }
    }

    const applyListValidation = (colIndex, formulaOrValues) => {
      const colLetter = getColumnLetter(colIndex)

      for (let row = 2; row <= maxDataRows; row++) {
        try {
          mainSheet.getCell(`${colLetter}${row}`).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: Array.isArray(formulaOrValues)
              ? [`"${formulaOrValues.join(',')}"`]
              : [formulaOrValues],
            showErrorMessage: true,
            errorTitle: 'Invalid value',
            error: 'Select a valid value from dropdown.'
          }
        } catch (err) {
          logger.error(`[PRODUCT] Data validation error ${colLetter}${row}`, err)
        }
      }
    }

    applyListValidation(9, ['BRANDED', 'NON-BRANDED'])
    applyListValidation(10, ['PHYSICAL', 'DIGITAL'])
    applyListValidation(20, ['PERCENTAGE', 'RUPEES'])

    applyListValidation(35, ['TRUE', 'FALSE'])
    applyListValidation(36, ['TRUE', 'FALSE'])
    applyListValidation(37, ['TRUE', 'FALSE'])
    applyListValidation(38, ['TRUE', 'FALSE'])
    applyListValidation(39, ['TRUE', 'FALSE'])

    const lastBrand = brands.length > 0 ? Math.min(brands.length + 1, 500) : 2
    const lastCategory = categories.length > 0 ? Math.min(categories.length + 1, 500) : 2
    const lastUnitType = unitTypes.length > 0 ? Math.min(unitTypes.length + 1, 500) : 2
    const lastTax = taxes.length > 0 ? Math.min(taxes.length + 1, 500) : 2

    if (categories.length > 0) {
      applyListValidation(2, `Categories!$B$2:$B$${lastCategory}`)
    }

    if (taxes.length > 0) {
      applyListValidation(5, `Taxes!$C$2:$C$${lastTax}`)
    }

    if (brands.length > 0) {
      applyListValidation(7, `Brands!$B$2:$B$${lastBrand}`)
    }

    if (unitTypes.length > 0) {
      applyListValidation(14, `UnitTypes!$B$2:$B$${lastUnitType}`)
    }

    for (let row = 2; row <= maxDataRows; row++) {
      try {
        mainSheet.getCell(`C${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`INDIRECT(${categorySafeNameColLetter}${row})`],
          showErrorMessage: true,
          errorTitle: 'Invalid subCategory',
          error: 'Select category first, then choose subCategory.'
        }
      } catch (err) {
        logger.error(`[PRODUCT] SubCategory validation error C${row}`, err)
      }
    }

    for (let row = 2; row <= maxDataRows; row++) {
      try {
        mainSheet.getCell(`O${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`INDIRECT(${unitTypeSafeNameColLetter}${row})`],
          showErrorMessage: true,
          errorTitle: 'Invalid unit',
          error: 'Select unitType first, then choose unit.'
        }
      } catch (err) {
        logger.error(`[PRODUCT] Unit validation error O${row}`, err)
      }
    }

    mainSheet.columns.forEach((col, index) => {
      col.width = 20

      const colIndex = index + 1
      const letter = getColumnLetter(colIndex)
      const isRequired = requiredColumnIndices.includes(colIndex)

      const headerCell = mainSheet.getCell(`${letter}1`)

      headerCell.font = {
        bold: true,
        color: { argb: 'FF000000' }
      }

      headerCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: isRequired ? 'FFFFFF99' : 'FFE0E0E0'
        }
      }

      headerCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }

      headerCell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true
      }
    })

    mainSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }

        cell.alignment = {
          vertical: 'middle',
          wrapText: true
        }
      })
    })

    const brandsSheet = workbook.addWorksheet('Brands')
    brandsSheet.addRow(['id', 'name'])
    brands.forEach((brand) => brandsSheet.addRow([brand.id, brand.name]))
    brandsSheet.getRow(1).font = { bold: true }
    brandsSheet.columns = [{ width: 38 }, { width: 28 }]

    const categoriesSheet = workbook.addWorksheet('Categories')
    categoriesSheet.addRow(['id', 'name'])
    categories.forEach((category) => categoriesSheet.addRow([category.id, category.name]))
    categoriesSheet.getRow(1).font = { bold: true }
    categoriesSheet.columns = [{ width: 38 }, { width: 28 }]

    const subCategoriesSheet = workbook.addWorksheet('SubCategories')
    subCategoriesSheet.addRow(['id', 'name', 'category'])
    subCategories.forEach((subCategory) => {
      subCategoriesSheet.addRow([
        subCategory.id,
        subCategory.name,
        subCategory.category?.name || ''
      ])
    })
    subCategoriesSheet.getRow(1).font = { bold: true }
    subCategoriesSheet.columns = [{ width: 38 }, { width: 28 }, { width: 28 }]

    const taxesSheet = workbook.addWorksheet('Taxes')
    taxesSheet.addRow(['id', 'title', 'percentage'])
    taxes.forEach((tax) => {
      taxesSheet.addRow([
        tax.id,
        tax.title,
        Number(tax.percentage)
      ])
    })
    taxesSheet.getRow(1).font = { bold: true }
    taxesSheet.columns = [{ width: 38 }, { width: 28 }, { width: 18 }]

    const unitTypesSheet = workbook.addWorksheet('UnitTypes')
    unitTypesSheet.addRow(['id', 'name'])
    unitTypes.forEach((unitType) => unitTypesSheet.addRow([unitType.id, unitType.name]))
    unitTypesSheet.getRow(1).font = { bold: true }
    unitTypesSheet.columns = [{ width: 38 }, { width: 28 }]

    const unitsSheet = workbook.addWorksheet('Units')
    unitsSheet.addRow(['id', 'name', 'unitType'])
    units.forEach((unit) => {
      unitsSheet.addRow([
        unit.id,
        unit.name,
        unit.unitType?.name || ''
      ])
    })
    unitsSheet.getRow(1).font = { bold: true }
    unitsSheet.columns = [{ width: 38 }, { width: 28 }, { width: 28 }]

    const categorySafeNamesSheet = workbook.addWorksheet('CategorySafeNames')
    categorySafeNamesSheet.addRow(['category', 'safeName'])

    categories.forEach((category) => {
      categorySafeNamesSheet.addRow([
        category.name,
        categorySafeNameMap.get(category.name)
      ])
    })

    if (categories.length === 0) {
      categorySafeNamesSheet.addRow(['', ''])
    }

    categorySafeNamesSheet.getRow(1).font = { bold: true }
    categorySafeNamesSheet.columns = [{ width: 35 }, { width: 35 }]
    categorySafeNamesSheet.state = 'hidden'

    const unitTypeSafeNamesSheet = workbook.addWorksheet('UnitTypeSafeNames')
    unitTypeSafeNamesSheet.addRow(['unitType', 'safeName'])

    unitTypes.forEach((unitType) => {
      unitTypeSafeNamesSheet.addRow([
        unitType.name,
        unitTypeSafeNameMap.get(unitType.name)
      ])
    })

    if (unitTypes.length === 0) {
      unitTypeSafeNamesSheet.addRow(['', ''])
    }

    unitTypeSafeNamesSheet.getRow(1).font = { bold: true }
    unitTypeSafeNamesSheet.columns = [{ width: 35 }, { width: 35 }]
    unitTypeSafeNamesSheet.state = 'hidden'

    const subByCategorySheet = workbook.addWorksheet('SubCategoriesByCategory')

    const categoryToSubs = new Map()

    categories.forEach((category) => {
      categoryToSubs.set(
        category.name,
        subCategories
          .filter((subCategory) => subCategory.category?.name === category.name)
          .map((subCategory) => subCategory.name)
      )
    })

    const maxSubsPerCategory = Math.max(
      1,
      ...categories.map((category) => categoryToSubs.get(category.name)?.length || 0)
    )

    subByCategorySheet.addRow(categories.map((category) => category.name))

    for (let rowIndex = 0; rowIndex < maxSubsPerCategory; rowIndex++) {
      const row = categories.map((category) => {
        const subs = categoryToSubs.get(category.name) || []
        return subs[rowIndex] || ''
      })

      subByCategorySheet.addRow(row)
    }

    categories.forEach((category, index) => {
      const colLetter = getColumnLetter(index + 1)
      const safeName = categorySafeNameMap.get(category.name)

      workbook.definedNames.add(
        `SubCategoriesByCategory!$${colLetter}$2:$${colLetter}$${maxSubsPerCategory + 1}`,
        safeName
      )
    })

    subByCategorySheet.getRow(1).font = { bold: true }

    const unitsByTypeSheet = workbook.addWorksheet('UnitsByType')

    const unitTypeToUnits = new Map()

    unitTypes.forEach((unitType) => {
      unitTypeToUnits.set(
        unitType.name,
        units
          .filter((unit) => unit.unitType?.name === unitType.name)
          .map((unit) => unit.name)
      )
    })

    const maxUnitsPerType = Math.max(
      1,
      ...unitTypes.map((unitType) => unitTypeToUnits.get(unitType.name)?.length || 0)
    )

    unitsByTypeSheet.addRow(unitTypes.map((unitType) => unitType.name))

    for (let rowIndex = 0; rowIndex < maxUnitsPerType; rowIndex++) {
      const row = unitTypes.map((unitType) => {
        const unitList = unitTypeToUnits.get(unitType.name) || []
        return unitList[rowIndex] || ''
      })

      unitsByTypeSheet.addRow(row)
    }

    unitTypes.forEach((unitType, index) => {
      const colLetter = getColumnLetter(index + 1)
      const safeName = unitTypeSafeNameMap.get(unitType.name)

      workbook.definedNames.add(
        `UnitsByType!$${colLetter}$2:$${colLetter}$${maxUnitsPerType + 1}`,
        safeName
      )
    })

    unitsByTypeSheet.getRow(1).font = { bold: true }

    const excelBuffer = await workbook.xlsx.writeBuffer()

    logger.info('[PRODUCT] Bulk update template generated successfully', {
      warehouseId,
      size: excelBuffer.byteLength,
      products: products.length,
      maxDataRows
    })

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="partner-product-update-template.xlsx"'
    )

    res.setHeader('Content-Length', excelBuffer.byteLength)
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')

    return res.send(Buffer.from(excelBuffer))
  } catch (error) {
    logger.error('[PRODUCT] Update template error', {
      message: error.message,
      stack: error.stack
    })

    if (!res.headersSent) {
      return errorResponse(res, 500, error.message)
    }
  }
}

/* =====================================================
BULK UPDATE PRODUCTS
POST /api/v1/products/bulk-update
===================================================== */


/* =====================================================
HELPERS
===================================================== */

const normalizeText = (value) => {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

const normalizeKey = (value) => normalizeText(value).toLowerCase()

const parseNumberValue = (value) => {
  if (
    value === undefined ||
    value === null ||
    normalizeText(value) === ''
  ) {
    return null
  }

  const num = Number(value)
  return Number.isNaN(num) ? null : num
}

const parseIntegerValue = (value) => {
  if (
    value === undefined ||
    value === null ||
    normalizeText(value) === ''
  ) {
    return null
  }

  const num = Number(value)
  if (Number.isNaN(num)) return null

  return parseInt(num, 10)
}

const parseArrayValue = (value) => {
  if (value === undefined || value === null || normalizeText(value) === '') {
    return []
  }

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

const parseBoolSafe = (value, defaultValue = null) => {
  if (
    value === undefined ||
    value === null ||
    normalizeText(value) === ''
  ) {
    return defaultValue
  }

  if (typeof value === 'boolean') return value

  const normalizedValue = normalizeText(value).toLowerCase()

  if (['true', '1', 'yes', 'y', 't', 'enabled', 'active', 'allow', 'allowed', '1.0'].includes(normalizedValue)) return true
  if (['false', '0', 'no', 'n', 'f', 'disabled', 'inactive', 'disallow', 'disallowed', '0.0'].includes(normalizedValue)) return false

  return defaultValue
}

const normalizeProductType = (value) => {
  const normalizedValue = normalizeText(value).toUpperCase()

  if (!normalizedValue) return null
  if (normalizedValue === 'BRANDED') return 'BRANDED'
  if (normalizedValue === 'NON-BRANDED') return 'NON-BRANDED'
  if (normalizedValue === 'NON_BRANDED') return 'NON-BRANDED'

  return 'INVALID'
}

const normalizeInventoryType = (value) => {
  const normalizedValue = normalizeText(value).toUpperCase()

  if (!normalizedValue) return null
  if (normalizedValue === 'PHYSICAL') return 'PHYSICAL'
  if (normalizedValue === 'DIGITAL') return 'DIGITAL'

  return 'INVALID'
}

const normalizeDiscountType = (value) => {
  const normalizedValue = normalizeText(value).toUpperCase()

  if (!normalizedValue) return null
  if (normalizedValue === 'PERCENTAGE') return 'PERCENTAGE'
  if (normalizedValue === 'RUPEES') return 'RUPEES'
  if (normalizedValue === 'FLAT') return 'RUPEES'

  return 'INVALID'
}

const calculateFinalPrice = ({ mrp, discountType, discountValue }) => {
  const safeMrp = Number(mrp || 0)
  const safeDiscountValue = Number(discountValue || 0)

  if (discountType === 'PERCENTAGE') {
    return Number((safeMrp - (safeMrp * safeDiscountValue / 100)).toFixed(2))
  }

  if (discountType === 'RUPEES') {
    return Number((safeMrp - safeDiscountValue).toFixed(2))
  }

  return safeMrp
}

const cleanupUploadedFile = (file) => {
  if (file?.path && fs.existsSync(file.path)) {
    try {
      fs.unlinkSync(file.path)
    } catch (cleanupError) {
      logger.warn('[PRODUCT] Failed to cleanup uploaded file', cleanupError)
    }
  }
}

const loadPartnerProductBulkReferences = async (warehouseId) => {
  const warehouseCats = await prisma.warehouseCategory.findMany({
    where: {
      warehouseId,
      isEnabled: true,
      category: {
        isActive: true
      }
    },
    include: {
      category: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })

  const categories = warehouseCats
    .map((wc) => wc.category)
    .filter(Boolean)

  const allowedCategoryIds = categories.map((category) => category.id)

  const warehouseSubCats = await prisma.warehouseSubCategory.findMany({
    where: {
      warehouseId,
      warehouseCategory: {
        warehouseId,
        isEnabled: true,
        categoryId: {
          in: allowedCategoryIds
        }
      },
      subCategory: {
        isActive: true,
        category: {
          isActive: true
        }
      }
    },
    include: {
      subCategory: {
        include: {
          category: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  })

  const subCategories = warehouseSubCats
    .map((wsc) => wsc.subCategory)
    .filter(Boolean)

  const [brands, unitTypes, units, taxes] = await Promise.all([
    prisma.brand.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true
      }
    }),

    prisma.unitType.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true
      }
    }),

    prisma.unit.findMany({
      where: {
        status: 'ACTIVE',
        unitType: {
          status: 'ACTIVE'
        }
      },
      select: {
        id: true,
        name: true,
        unitTypeId: true,
        unitType: {
          select: {
            id: true,
            name: true
          }
        }
      }
    }),

    prisma.tax.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        title: true,
        percentage: true
      }
    })
  ])

  return {
    brands,
    categories,
    subCategories,
    unitTypes,
    units,
    taxes
  }
}

/* =====================================================
BULK UPDATE PRODUCTS
POST /api/v1/products/bulk-update
===================================================== */

/* =====================================================
BULK UPDATE PRODUCTS
POST /api/v1/products/bulk-update
===================================================== */
const bulkUpdateProducts = async (req, res) => {
  try {
    const userId = req.user.id
    const warehouseId = await getWarehouseFromUser(userId, prisma)

    const file = req.files?.file || req.file

    if (!file) {
      return errorResponse(res, 400, 'No file uploaded')
    }

    const fileData = file.data || (file.path ? fs.readFileSync(file.path) : null)
    const originalname = file.name || file.originalname || ''

    if (!fileData) {
      return errorResponse(res, 400, 'Invalid file upload')
    }

    /* -------------------------------------
       HELPERS
    ------------------------------------- */
    const normalizeText = (value) => {
      if (value === null || value === undefined) return ''
      return String(value).trim()
    }

    const normalizeKey = (value) => normalizeText(value).toLowerCase()

    const parseNumber = (value) => {
      if (
        value === undefined ||
        value === null ||
        normalizeText(value) === ''
      ) {
        return null
      }

      const num = Number(value)
      return Number.isNaN(num) ? null : num
    }

    const parseInteger = (value) => {
      if (
        value === undefined ||
        value === null ||
        normalizeText(value) === ''
      ) {
        return null
      }

      const num = Number(value)

      if (Number.isNaN(num)) return null

      return parseInt(num, 10)
    }

    const parseArray = (value) => {
      if (value === undefined || value === null || normalizeText(value) === '') {
        return []
      }

      return String(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    }

    const parseBoolSafe = (value) => {
      if (value === undefined || value === null || normalizeText(value) === '') {
        return null
      }

      if (typeof value === 'boolean') return value

      const normalizedValue = normalizeText(value).toLowerCase()

      if (['true', '1', 'yes', 'y'].includes(normalizedValue)) return true
      if (['false', '0', 'no', 'n'].includes(normalizedValue)) return false

      return null
    }

    const normalizeProductType = (value) => {
      const normalizedValue = normalizeText(value).toUpperCase()

      if (!normalizedValue) return null
      if (normalizedValue === 'BRANDED') return 'BRANDED'
      if (normalizedValue === 'NON-BRANDED') return 'NON-BRANDED'
      if (normalizedValue === 'NON_BRANDED') return 'NON-BRANDED'

      return 'INVALID'
    }

    const normalizeInventoryType = (value) => {
      const normalizedValue = normalizeText(value).toUpperCase()

      if (!normalizedValue) return null
      if (normalizedValue === 'PHYSICAL') return 'PHYSICAL'
      if (normalizedValue === 'DIGITAL') return 'DIGITAL'

      return 'INVALID'
    }

    const normalizeDiscountType = (value) => {
      const normalizedValue = normalizeText(value).toUpperCase()

      if (!normalizedValue) return null
      if (normalizedValue === 'PERCENTAGE') return 'PERCENTAGE'
      if (normalizedValue === 'RUPEES') return 'RUPEES'
      if (normalizedValue === 'FLAT') return 'RUPEES'
      if (normalizedValue === 'AMOUNT') return 'RUPEES'
      if (normalizedValue === 'FIXED') return 'RUPEES'

      return 'INVALID'
    }

    const calculateFinalPrice = ({ mrp, discountType, discountValue }) => {
      const safeMrp = Number(mrp || 0)
      const safeDiscountValue = Number(discountValue || 0)

      if (discountType === 'PERCENTAGE') {
        return Number((safeMrp - (safeMrp * safeDiscountValue / 100)).toFixed(2))
      }

      if (discountType === 'RUPEES') {
        return Number((safeMrp - safeDiscountValue).toFixed(2))
      }

      return safeMrp
    }

    const rawRows = parseBulkFile(fileData, originalname)

    const rows = rawRows
      .map((row, index) => ({
        ...row,
        __rowNum: index + 2
      }))
      .filter((row) => {
        const id = row.id || row.ID || row.Id

        return id !== undefined &&
          id !== null &&
          normalizeText(id) !== ''
      })

    if (!rows || rows.length === 0) {
      return errorResponse(
        res,
        400,
        'No valid product rows found. Product ID is required for bulk update.'
      )
    }

    logger.info('[PRODUCT] Bulk update started', {
      rawCount: rawRows.length,
      validRows: rows.length,
      warehouseId
    })

    /* -------------------------------------
       LOAD ACTIVE WAREHOUSE REFERENCES
    ------------------------------------- */
    const warehouseCats = await prisma.warehouseCategory.findMany({
      where: {
        warehouseId,
        isEnabled: true,
        category: {
          isActive: true
        }
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    const categories = warehouseCats
      .map((wc) => wc.category)
      .filter(Boolean)

    const allowedCategoryIds = categories.map((category) => category.id)

    const warehouseSubCats = await prisma.warehouseSubCategory.findMany({
      where: {
        warehouseId,
        warehouseCategory: {
          warehouseId,
          isEnabled: true,
          categoryId: {
            in: allowedCategoryIds
          }
        },
        subCategory: {
          isActive: true,
          category: {
            isActive: true
          }
        }
      },
      include: {
        subCategory: {
          include: {
            category: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    const subCategories = warehouseSubCats
      .map((wsc) => wsc.subCategory)
      .filter(Boolean)

    const [brands, unitTypes, units, taxes] = await Promise.all([
      prisma.brand.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true
        }
      }),

      prisma.unitType.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          name: true
        }
      }),

      prisma.unit.findMany({
        where: {
          status: 'ACTIVE',
          unitType: {
            status: 'ACTIVE'
          }
        },
        select: {
          id: true,
          name: true,
          unitTypeId: true,
          unitType: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),

      prisma.tax.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          title: true,
          percentage: true
        }
      })
    ])

    const brandMap = new Map(
      brands.map((brand) => [normalizeKey(brand.name), brand.id])
    )

    const categoryMap = new Map(
      categories.map((category) => [normalizeKey(category.name), category.id])
    )

    const subCategoryMap = new Map(
      subCategories.map((subCategory) => [
        `${normalizeKey(subCategory.category?.name)}|${normalizeKey(subCategory.name)}`,
        subCategory.id
      ])
    )

    const unitTypeMap = new Map(
      unitTypes.map((unitType) => [normalizeKey(unitType.name), unitType])
    )

    const unitMap = new Map(
      units.map((unit) => [normalizeKey(unit.name), unit])
    )

    const taxPercentageSet = new Set(
      taxes.map((tax) => String(Number(tax.percentage)))
    )

    const results = {
      success: [],
      errors: []
    }

    let processed = 0

    for (const row of rows) {
      const rowNum = row.__rowNum
      const rowErrors = []

      try {
        const id = normalizeText(row.id || row.ID || row.Id)

        const product = await prisma.product.findUnique({
          where: { id },
          include: {
            category: {
              select: {
                id: true,
                name: true
              }
            },
            subCategory: {
              select: {
                id: true,
                name: true
              }
            },
            brand: {
              select: {
                id: true,
                name: true
              }
            }
          }
        })

        if (!product) {
          results.errors.push({
            row: rowNum,
            id,
            error: `Product with ID ${id} not found`
          })

          processed++
          continue
        }

        if (product.warehouseId !== warehouseId) {
          results.errors.push({
            row: rowNum,
            id,
            error: `Product ${id} does not belong to your warehouse`
          })

          processed++
          continue
        }

        const categoryName = normalizeText(row.category)
        const subCategoryName = normalizeText(row.subCategory)
        const name = normalizeText(row.name)
        const taxRate = parseNumber(row.taxRate)
        const slug = normalizeText(row.slug)
        const brandName = normalizeText(row.brand)
        const productType = normalizeProductType(row.productType)
        const inventoryType = normalizeInventoryType(row.inventoryType)
        const description = normalizeText(row.description)
        const shortDescription = normalizeText(row.shortDescription)
        const unitTypeName = normalizeText(row.unitType)
        const unitName = normalizeText(row.unit)
        const measurement = normalizeText(row.measurement)

        const landingPrice = parseNumber(row.landingPrice)
        const priceFromSheet = parseNumber(row.price)
        const actualPrice = landingPrice !== null ? landingPrice : priceFromSheet

        const mrp = parseNumber(row.mrp)
        const discountType = normalizeDiscountType(row.discountType)
        const discountValue = parseNumber(row.discountValue)
        const finalPriceFromSheet = parseNumber(row.finalPrice)
        const costPrice = parseNumber(row.costPrice)

        const stock = parseInteger(row.stock)
        const threshold = parseInteger(row.threshold)
        const minOrderQty = parseInteger(row.minOrderQty)
        const maxOrderQty = parseInteger(row.maxOrderQty)

        if (!categoryName) {
          rowErrors.push('Category is required')
        }

        if (!subCategoryName) {
          rowErrors.push('SubCategory is required')
        }

        if (!name) {
          rowErrors.push('Name is required')
        }

        if (!productType || productType === 'INVALID') {
          rowErrors.push('Valid productType is required. Allowed values: BRANDED, NON-BRANDED')
        }

        if (inventoryType === 'INVALID') {
          rowErrors.push('Invalid inventoryType. Allowed values: PHYSICAL, DIGITAL')
        }

        if (!description) {
          rowErrors.push('Description is required')
        }

        if (!unitTypeName) {
          rowErrors.push('UnitType is required')
        }

        if (!unitName) {
          rowErrors.push('Unit is required')
        }

        if (!measurement) {
          rowErrors.push('Measurement is required')
        }

        if (actualPrice === null) {
          rowErrors.push('Valid landingPrice is required')
        }

        if (mrp === null) {
          rowErrors.push('Valid mrp is required')
        }

        if (!discountType || discountType === 'INVALID') {
          rowErrors.push('Valid discountType is required. Allowed values: PERCENTAGE, RUPEES')
        }

        if (stock === null) {
          rowErrors.push('Valid stock is required')
        }

        let categoryId = categoryMap.get(normalizeKey(categoryName))

        if (!categoryId && product.category?.name) {
          const isSameExistingCategory =
            normalizeKey(product.category.name) === normalizeKey(categoryName)

          if (isSameExistingCategory) {
            categoryId = product.category.id
          }
        }

        if (categoryName && !categoryId) {
          rowErrors.push(`Invalid or inactive warehouse category: ${categoryName}`)
        }

        let subCategoryId = subCategoryMap.get(
          `${normalizeKey(categoryName)}|${normalizeKey(subCategoryName)}`
        )

        if (!subCategoryId && product.subCategory?.name && product.category?.name) {
          const isSameExistingCategory =
            normalizeKey(product.category.name) === normalizeKey(categoryName)

          const isSameExistingSubCategory =
            normalizeKey(product.subCategory.name) === normalizeKey(subCategoryName)

          if (isSameExistingCategory && isSameExistingSubCategory) {
            subCategoryId = product.subCategory.id
          }
        }

        if (categoryName && subCategoryName && !subCategoryId) {
          rowErrors.push(
            `Invalid subCategory '${subCategoryName}' or it does not belong to category '${categoryName}'`
          )
        }

        let brandId = null

        if (brandName) {
          brandId = brandMap.get(normalizeKey(brandName))

          if (!brandId) {
            const isSameExistingBrand =
              product.brand?.name &&
              normalizeKey(product.brand.name) === normalizeKey(brandName)

            if (isSameExistingBrand) {
              brandId = product.brand.id
            } else {
              rowErrors.push(`Invalid or inactive brand: ${brandName}`)
            }
          }
        }

        const unitType = unitTypeMap.get(normalizeKey(unitTypeName))
        const unitTypeId = unitType?.id || null

        if (unitTypeName && !unitTypeId) {
          rowErrors.push(`Invalid or inactive unitType: ${unitTypeName}`)
        }

        const unit = unitMap.get(normalizeKey(unitName))

        if (unitName && !unit) {
          rowErrors.push(`Invalid or inactive unit: ${unitName}`)
        }

        if (unit && unitTypeId && unit.unitTypeId !== unitTypeId) {
          rowErrors.push(`Unit '${unitName}' does not belong to unitType '${unitTypeName}'`)
        }

        const hasTaxRate =
          row.taxRate !== undefined &&
          row.taxRate !== null &&
          normalizeText(row.taxRate) !== ''

        if (hasTaxRate) {
          if (taxRate === null) {
            rowErrors.push('Invalid taxRate')
          } else if (
            Number(taxRate) !== 0 &&
            !taxPercentageSet.has(String(Number(taxRate)))
          ) {
            rowErrors.push(`Invalid or inactive taxRate: ${row.taxRate}`)
          }
        }

        if (actualPrice !== null && actualPrice < 0) {
          rowErrors.push('landingPrice cannot be negative')
        }

        if (mrp !== null && mrp < 0) {
          rowErrors.push('mrp cannot be negative')
        }

        if (discountValue !== null && discountValue < 0) {
          rowErrors.push('discountValue cannot be negative')
        }

        if (
          discountType === 'PERCENTAGE' &&
          discountValue !== null &&
          discountValue > 100
        ) {
          rowErrors.push('discountValue cannot be greater than 100 for PERCENTAGE discount')
        }

        if (
          discountType === 'RUPEES' &&
          discountValue !== null &&
          mrp !== null &&
          discountValue > mrp
        ) {
          rowErrors.push('discountValue cannot be greater than mrp for RUPEES discount')
        }

        if (stock !== null && stock < 0) {
          rowErrors.push('stock cannot be negative')
        }

        if (threshold !== null && threshold < 0) {
          rowErrors.push('threshold cannot be negative')
        }

        if (minOrderQty !== null && minOrderQty < 0) {
          rowErrors.push('minOrderQty cannot be negative')
        }

        if (maxOrderQty !== null && maxOrderQty < 0) {
          rowErrors.push('maxOrderQty cannot be negative')
        }

        if (
          minOrderQty !== null &&
          maxOrderQty !== null &&
          maxOrderQty < minOrderQty
        ) {
          rowErrors.push('maxOrderQty must be greater than or equal to minOrderQty')
        }

        const booleanFields = [
          'isReturnable',
          'isCancelable',
          'isCodAllowed',
          'isActive',
          'isFeatured'
        ]

        for (const field of booleanFields) {
          if (
            row[field] !== undefined &&
            row[field] !== null &&
            normalizeText(row[field]) !== ''
          ) {
            const parsed = parseBoolSafe(row[field])

            if (parsed === null) {
              rowErrors.push(`${field} must be TRUE or FALSE`)
            }
          }
        }

        if (rowErrors.length) {
          results.errors.push({
            row: rowNum,
            id,
            error: rowErrors.join(', ')
          })

          processed++
          continue
        }

        const updateData = {
          name,
          description,
          shortDescription: shortDescription || null,

          images: parseArray(row.images),
          tags: parseArray(row.tags),

          productType,
          inventoryType: inventoryType || null,

          price: actualPrice,
          mrp,
          discountType,
          discountValue: discountValue || 0,

          finalPrice:
            finalPriceFromSheet !== null
              ? finalPriceFromSheet
              : calculateFinalPrice({
                mrp,
                discountType,
                discountValue
              }),

          costPrice: costPrice !== null ? costPrice : null,
          taxRate: taxRate || 0,

          unitType: unitTypeName,
          unit: unitName,
          measurement,

          stock,
          threshold: threshold ?? 5,
          minOrderQty: minOrderQty ?? 1,
          maxOrderQty: maxOrderQty ?? null,

          metaTitle: normalizeText(row.metaTitle) || null,
          metaKeywords: normalizeText(row.metaKeywords) || null,
          schemaMarkup: normalizeText(row.schemaMarkup) || null,
          metaDescription: normalizeText(row.metaDescription) || null,

          manufacturer: normalizeText(row.manufacturer) || null,
          madeIn: normalizeText(row.madeIn) || null,
          fssaiLicNo: normalizeText(row.fssaiLicNo) || null,

          variantName: normalizeText(row.variantName) || null,
          sku: normalizeText(row.sku) || null
        }

        if (slug) {
          updateData.slug = slug
        }

        if (brandName && brandId) {
          updateData.brand = {
            connect: { id: brandId }
          }
        } else if (!brandName) {
          updateData.brand = {
            disconnect: true
          }
        }

        updateData.category = {
          connect: { id: categoryId }
        }

        updateData.subCategory = {
          connect: { id: subCategoryId }
        }

        const rawIsReturnable = row.isReturnable ?? row.IsReturnable ?? row['Is Returnable'] ?? row.returnable;
        if (rawIsReturnable !== undefined && rawIsReturnable !== null && normalizeText(rawIsReturnable) !== '') {
          updateData.isReturnable = parseBoolSafe(rawIsReturnable, false);
        }
        const rawReturnableDays = row.returnableDays ?? row.maxReturnDays ?? row['Returnable Days'] ?? row['Max Return Days'];
        if (rawReturnableDays !== undefined && rawReturnableDays !== null && normalizeText(rawReturnableDays) !== '') {
          updateData.returnableDays = parseInteger(rawReturnableDays) || (updateData.isReturnable ? 7 : null);
        }

        const rawIsCancelable = row.isCancelable ?? row.IsCancelable ?? row['Is Cancel-able'] ?? row['Is Cancelable'] ?? row.cancelable;
        if (rawIsCancelable !== undefined && rawIsCancelable !== null && normalizeText(rawIsCancelable) !== '') {
          updateData.isCancelable = parseBoolSafe(rawIsCancelable, false);
        }
        const rawCancellableOrderStatuses = row.cancellableOrderStatuses ?? row['Cancellable Order Statuses'] ?? row.cancellableStatus;
        if (rawCancellableOrderStatuses !== undefined && rawCancellableOrderStatuses !== null && normalizeText(rawCancellableOrderStatuses) !== '') {
          updateData.cancellableOrderStatuses = parseArray(rawCancellableOrderStatuses);
        }

        const rawIsCodAllowed = row.isCodAllowed ?? row.IsCodAllowed ?? row['Is COD Allowed'] ?? row.isCODAllowed ?? row.codAllowed;
        if (rawIsCodAllowed !== undefined && rawIsCodAllowed !== null && normalizeText(rawIsCodAllowed) !== '') {
          updateData.isCodAllowed = parseBoolSafe(rawIsCodAllowed, false);
        }

        if (normalizeText(row.isActive) !== '') {
          updateData.isActive = parseBoolSafe(row.isActive)
        }

        if (normalizeText(row.isFeatured) !== '') {
          updateData.isFeatured = parseBoolSafe(row.isFeatured)
        }

        await prisma.product.update({
          where: { id },
          data: updateData
        })

        results.success.push({
          id,
          name
        })

        processed++

        if (processed % BULK_BATCH_SIZE === 0) {
          logger.info(`[PRODUCT] Bulk update progress: ${processed}/${rows.length}`)
        }
      } catch (error) {
        results.errors.push({
          row: rowNum,
          error: error.message
        })

        processed++
      }
    }

    if (file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path)
      } catch (cleanupError) {
        logger.warn('[PRODUCT] Failed to cleanup uploaded file', cleanupError)
      }
    }

    logger.info('[PRODUCT] Bulk update completed', {
      total: rows.length,
      success: results.success.length,
      errors: results.errors.length
    })

    return successResponse(
      res,
      200,
      {
        totalRecords: rows.length,
        successCount: results.success.length,
        failedCount: results.errors.length,
        success: results.success,
        errors: results.errors
      },
      `Bulk update completed: ${results.success.length} success, ${results.errors.length} errors`
    )
  } catch (error) {
    logger.error('[PRODUCT] Bulk update failed', {
      message: error.message,
      stack: error.stack
    })

    return errorResponse(res, 500, error.message)
  }
}

/* =====================================================
BULK UPLOAD PRODUCTS
POST /api/v1/products/bulk-upload
===================================================== */

/* =====================================================
BULK UPLOAD PRODUCTS
POST /api/v1/products/bulk-upload
===================================================== */
const bulkUploadProducts = async (req, res) => {
  try {
    const userId = req.user.id
    const warehouseId = await getWarehouseFromUser(userId, prisma)

    const file = req.files?.file || req.file

    if (!file) {
      return errorResponse(res, 400, 'No file uploaded')
    }

    const fileData = file.data || (file.path ? fs.readFileSync(file.path) : null)
    const originalname = file.name || file.originalname || ''

    if (!fileData) {
      return errorResponse(res, 400, 'Invalid file upload')
    }

    /* -------------------------------------
       HELPERS
    ------------------------------------- */
    const normalizeText = (value) => {
      if (value === null || value === undefined) return ''
      return String(value).trim()
    }

    const normalizeKey = (value) => normalizeText(value).toLowerCase()

    const parseNumber = (value) => {
      if (
        value === undefined ||
        value === null ||
        normalizeText(value) === ''
      ) {
        return null
      }

      const num = Number(value)
      return Number.isNaN(num) ? null : num
    }

    const parseInteger = (value) => {
      if (
        value === undefined ||
        value === null ||
        normalizeText(value) === ''
      ) {
        return null
      }

      const num = Number(value)

      if (Number.isNaN(num)) return null

      return parseInt(num, 10)
    }

    const parseArray = (value) => {
      if (value === undefined || value === null || normalizeText(value) === '') {
        return []
      }

      return String(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    }

    const parseBoolSafe = (value, defaultValue = false) => {
      if (value === undefined || value === null || normalizeText(value) === '') {
        return defaultValue
      }

      if (typeof value === 'boolean') return value

      const normalizedValue = normalizeText(value).toLowerCase()

      if (['true', '1', 'yes', 'y'].includes(normalizedValue)) return true
      if (['false', '0', 'no', 'n'].includes(normalizedValue)) return false

      return defaultValue
    }

    const normalizeProductType = (value) => {
      const normalizedValue = normalizeText(value).toUpperCase()

      if (normalizedValue === 'BRANDED') return 'BRANDED'
      if (normalizedValue === 'NON-BRANDED') return 'NON-BRANDED'
      if (normalizedValue === 'NON_BRANDED') return 'NON-BRANDED'

      return null
    }

    const normalizeInventoryType = (value) => {
      const normalizedValue = normalizeText(value).toUpperCase()

      if (!normalizedValue) return null
      if (normalizedValue === 'PHYSICAL') return 'PHYSICAL'
      if (normalizedValue === 'DIGITAL') return 'DIGITAL'

      return null
    }

    const normalizeDiscountType = (value) => {
      const normalizedValue = normalizeText(value).toUpperCase()

      if (normalizedValue === 'PERCENTAGE') return 'PERCENTAGE'
      if (normalizedValue === 'RUPEES') return 'RUPEES'
      if (normalizedValue === 'FLAT') return 'RUPEES'
      if (normalizedValue === 'AMOUNT') return 'RUPEES'
      if (normalizedValue === 'FIXED') return 'RUPEES'

      return null
    }

    const calculateFinalPrice = ({ mrp, discountType, discountValue }) => {
      const safeMrp = Number(mrp || 0)
      const safeDiscountValue = Number(discountValue || 0)

      if (discountType === 'PERCENTAGE') {
        return Number((safeMrp - (safeMrp * safeDiscountValue / 100)).toFixed(2))
      }

      if (discountType === 'RUPEES') {
        return Number((safeMrp - safeDiscountValue).toFixed(2))
      }

      return safeMrp
    }

    const rawRows = parseBulkFile(fileData, originalname)

    const rows = rawRows
      .map((row, index) => ({
        ...row,
        __rowNum: index + 2
      }))
      .filter((row) => {
        const meaningfulValues = [
          row.category,
          row.subCategory,
          row.name,
          row.slug,
          row.brand,
          row.productType,
          row.description,
          row.unitType,
          row.unit,
          row.measurement,
          row.landingPrice,
          row.price,
          row.mrp,
          row.discountType,
          row.discountValue,
          row.stock
        ]

        return meaningfulValues.some((value) => {
          return value !== undefined &&
            value !== null &&
            normalizeText(value) !== ''
        })
      })

    if (!rows || rows.length === 0) {
      return errorResponse(
        res,
        400,
        'No valid product rows found in the uploaded file'
      )
    }

    logger.info('[PRODUCT] Bulk upload started', {
      rawCount: rawRows.length,
      validRows: rows.length,
      warehouseId
    })

    /* -------------------------------------
       LOAD ACTIVE WAREHOUSE REFERENCES
    ------------------------------------- */
    const warehouseCats = await prisma.warehouseCategory.findMany({
      where: {
        warehouseId,
        isEnabled: true,
        category: {
          isActive: true
        }
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    const categories = warehouseCats
      .map((wc) => wc.category)
      .filter(Boolean)

    const allowedCategoryIds = categories.map((category) => category.id)

    const warehouseSubCats = await prisma.warehouseSubCategory.findMany({
      where: {
        warehouseId,
        warehouseCategory: {
          warehouseId,
          isEnabled: true,
          categoryId: {
            in: allowedCategoryIds
          }
        },
        subCategory: {
          isActive: true,
          category: {
            isActive: true
          }
        }
      },
      include: {
        subCategory: {
          include: {
            category: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    const subCategories = warehouseSubCats
      .map((wsc) => wsc.subCategory)
      .filter(Boolean)

    const [brands, unitTypes, units, taxes] = await Promise.all([
      prisma.brand.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true
        }
      }),

      prisma.unitType.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          name: true
        }
      }),

      prisma.unit.findMany({
        where: {
          status: 'ACTIVE',
          unitType: {
            status: 'ACTIVE'
          }
        },
        select: {
          id: true,
          name: true,
          unitTypeId: true,
          unitType: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),

      prisma.tax.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          title: true,
          percentage: true
        }
      })
    ])

    const brandMap = new Map(
      brands.map((brand) => [normalizeKey(brand.name), brand.id])
    )

    const categoryMap = new Map(
      categories.map((category) => [normalizeKey(category.name), category.id])
    )

    const subCategoryMap = new Map(
      subCategories.map((subCategory) => [
        `${normalizeKey(subCategory.category?.name)}|${normalizeKey(subCategory.name)}`,
        subCategory.id
      ])
    )

    const unitTypeMap = new Map(
      unitTypes.map((unitType) => [normalizeKey(unitType.name), unitType])
    )

    const unitMap = new Map(
      units.map((unit) => [normalizeKey(unit.name), unit])
    )

    const taxPercentageSet = new Set(
      taxes.map((tax) => String(Number(tax.percentage)))
    )

    const results = {
      success: [],
      errors: []
    }

    let processed = 0

    for (const row of rows) {
      const rowNum = row.__rowNum
      const rowErrors = []

      try {
        const categoryName = normalizeText(row.category)
        const subCategoryName = normalizeText(row.subCategory)
        const name = normalizeText(row.name)
        const taxRate = parseNumber(row.taxRate)
        const slug = normalizeText(row.slug)
        const brandName = normalizeText(row.brand)
        const productType = normalizeProductType(row.productType)
        const inventoryType = normalizeInventoryType(row.inventoryType)
        const description = normalizeText(row.description)
        const shortDescription = normalizeText(row.shortDescription)
        const unitTypeName = normalizeText(row.unitType)
        const unitName = normalizeText(row.unit)
        const measurement = normalizeText(row.measurement)

        const landingPrice = parseNumber(row.landingPrice)
        const priceFromSheet = parseNumber(row.price)
        const actualPrice = landingPrice !== null ? landingPrice : priceFromSheet

        const mrp = parseNumber(row.mrp)
        const discountType = normalizeDiscountType(row.discountType)
        const discountValue = parseNumber(row.discountValue)
        const finalPriceFromSheet = parseNumber(row.finalPrice)
        const costPrice = parseNumber(row.costPrice)

        const stock = parseInteger(row.stock)
        const threshold = parseInteger(row.threshold)
        const minOrderQty = parseInteger(row.minOrderQty)
        const maxOrderQty = parseInteger(row.maxOrderQty)

        if (!categoryName) {
          rowErrors.push('Category is required')
        }

        if (!subCategoryName) {
          rowErrors.push('SubCategory is required')
        }

        if (!name) {
          rowErrors.push('Name is required')
        }

        if (!productType) {
          rowErrors.push('Valid productType is required. Allowed values: BRANDED, NON-BRANDED')
        }

        if (inventoryType === 'INVALID') {
          rowErrors.push('Invalid inventoryType. Allowed values: PHYSICAL, DIGITAL')
        }

        if (!description) {
          rowErrors.push('Description is required')
        }

        if (!unitTypeName) {
          rowErrors.push('UnitType is required')
        }

        if (!unitName) {
          rowErrors.push('Unit is required')
        }

        if (!measurement) {
          rowErrors.push('Measurement is required')
        }

        if (actualPrice === null) {
          rowErrors.push('Valid landingPrice is required')
        }

        if (mrp === null) {
          rowErrors.push('Valid mrp is required')
        }

        if (!discountType) {
          rowErrors.push('Valid discountType is required. Allowed values: PERCENTAGE, RUPEES')
        }

        if (stock === null) {
          rowErrors.push('Valid stock is required')
        }

        const categoryId = categoryMap.get(normalizeKey(categoryName))

        if (categoryName && !categoryId) {
          rowErrors.push(`Invalid or inactive warehouse category: ${categoryName}`)
        }

        const subCategoryId = subCategoryMap.get(
          `${normalizeKey(categoryName)}|${normalizeKey(subCategoryName)}`
        )

        if (categoryName && subCategoryName && !subCategoryId) {
          rowErrors.push(
            `Invalid subCategory '${subCategoryName}' or it does not belong to category '${categoryName}'`
          )
        }

        let brandId = null

        if (brandName) {
          brandId = brandMap.get(normalizeKey(brandName))

          if (!brandId) {
            rowErrors.push(`Invalid or inactive brand: ${brandName}`)
          }
        }

        const unitType = unitTypeMap.get(normalizeKey(unitTypeName))
        const unitTypeId = unitType?.id || null

        if (unitTypeName && !unitTypeId) {
          rowErrors.push(`Invalid or inactive unitType: ${unitTypeName}`)
        }

        const unit = unitMap.get(normalizeKey(unitName))

        if (unitName && !unit) {
          rowErrors.push(`Invalid or inactive unit: ${unitName}`)
        }

        if (unit && unitTypeId && unit.unitTypeId !== unitTypeId) {
          rowErrors.push(`Unit '${unitName}' does not belong to unitType '${unitTypeName}'`)
        }

        const hasTaxRate =
          row.taxRate !== undefined &&
          row.taxRate !== null &&
          normalizeText(row.taxRate) !== ''

        if (hasTaxRate) {
          if (taxRate === null) {
            rowErrors.push('Invalid taxRate')
          } else if (
            Number(taxRate) !== 0 &&
            !taxPercentageSet.has(String(Number(taxRate)))
          ) {
            rowErrors.push(`Invalid or inactive taxRate: ${row.taxRate}`)
          }
        }

        if (actualPrice !== null && actualPrice < 0) {
          rowErrors.push('landingPrice cannot be negative')
        }

        if (mrp !== null && mrp < 0) {
          rowErrors.push('mrp cannot be negative')
        }

        if (discountValue !== null && discountValue < 0) {
          rowErrors.push('discountValue cannot be negative')
        }

        if (
          discountType === 'PERCENTAGE' &&
          discountValue !== null &&
          discountValue > 100
        ) {
          rowErrors.push('discountValue cannot be greater than 100 for PERCENTAGE discount')
        }

        if (
          discountType === 'RUPEES' &&
          discountValue !== null &&
          mrp !== null &&
          discountValue > mrp
        ) {
          rowErrors.push('discountValue cannot be greater than mrp for RUPEES discount')
        }

        if (stock !== null && stock < 0) {
          rowErrors.push('stock cannot be negative')
        }

        if (threshold !== null && threshold < 0) {
          rowErrors.push('threshold cannot be negative')
        }

        if (minOrderQty !== null && minOrderQty < 0) {
          rowErrors.push('minOrderQty cannot be negative')
        }

        if (maxOrderQty !== null && maxOrderQty < 0) {
          rowErrors.push('maxOrderQty cannot be negative')
        }

        if (
          minOrderQty !== null &&
          maxOrderQty !== null &&
          maxOrderQty < minOrderQty
        ) {
          rowErrors.push('maxOrderQty must be greater than or equal to minOrderQty')
        }

        const booleanFields = [
          'isReturnable',
          'isCancelable',
          'isCodAllowed',
          'isActive',
          'isFeatured'
        ]

        for (const field of booleanFields) {
          if (
            row[field] !== undefined &&
            row[field] !== null &&
            normalizeText(row[field]) !== ''
          ) {
            const parsed = parseBoolSafe(row[field])

            if (parsed === null) {
              rowErrors.push(`${field} must be TRUE or FALSE`)
            }
          }
        }

        if (rowErrors.length) {
          results.errors.push({
            row: rowNum,
            name,
            error: rowErrors.join(', ')
          })

          processed++
          continue
        }

        const generatedSlug = slug || slugify(name)

        const createData = {
          name,
          slug: generatedSlug,
          description,
          shortDescription: shortDescription || null,

          images: parseArray(row.images),
          tags: parseArray(row.tags),

          productType,
          inventoryType: inventoryType || null,

          price: actualPrice,
          mrp,
          discountType,
          discountValue: discountValue || 0,

          finalPrice:
            finalPriceFromSheet !== null
              ? finalPriceFromSheet
              : calculateFinalPrice({
                mrp,
                discountType,
                discountValue
              }),

          costPrice: costPrice !== null ? costPrice : actualPrice,
          taxRate: taxRate || 0,

          unitType: unitTypeName,
          unit: unitName,
          measurement,

          stock,
          threshold: threshold ?? 5,
          minOrderQty: minOrderQty ?? 1,
          maxOrderQty: maxOrderQty ?? null,

          isActive: parseBoolSafe(row.isActive, true),
          isFeatured: parseBoolSafe(row.isFeatured, false),
          status: 'PENDING',

          variantName: normalizeText(row.variantName) || null,
          sku: normalizeText(row.sku) || null,

          barcode: null,
          variantStatus: true,
          weight: 0,

          metaTitle: normalizeText(row.metaTitle) || null,
          metaKeywords: normalizeText(row.metaKeywords) || null,
          schemaMarkup: normalizeText(row.schemaMarkup) || null,
          metaDescription: normalizeText(row.metaDescription) || null,

          manufacturer: normalizeText(row.manufacturer) || null,
          madeIn: normalizeText(row.madeIn) || null,
          fssaiLicNo: normalizeText(row.fssaiLicNo) || null,

          isReturnable: parseBoolSafe(row.isReturnable ?? row.IsReturnable ?? row['Is Returnable'] ?? row.returnable, false),
          returnableDays: parseInteger(row.returnableDays ?? row.maxReturnDays ?? row['Returnable Days'] ?? row['Max Return Days']) || (parseBoolSafe(row.isReturnable ?? row.IsReturnable ?? row['Is Returnable'] ?? row.returnable, false) ? 7 : null),
          isCancelable: parseBoolSafe(row.isCancelable ?? row.IsCancelable ?? row['Is Cancel-able'] ?? row['Is Cancelable'] ?? row.cancelable, false),
          cancellableOrderStatuses: parseArray(row.cancellableOrderStatuses ?? row['Cancellable Order Statuses'] ?? row.cancellableStatus),
          isCodAllowed: parseBoolSafe(row.isCodAllowed ?? row.IsCodAllowed ?? row['Is COD Allowed'] ?? row.isCODAllowed ?? row.codAllowed, false),

          warehouse: {
            connect: { id: warehouseId }
          },

          category: {
            connect: { id: categoryId }
          },

          subCategory: {
            connect: { id: subCategoryId }
          }
        }

        if (brandName && brandId) {
          createData.brand = {
            connect: { id: brandId }
          }
        }

        const product = await prisma.product.create({
          data: createData
        })

        results.success.push({
          id: product.id,
          name: product.name
        })

        processed++

        if (processed % BULK_BATCH_SIZE === 0) {
          logger.info(`[PRODUCT] Bulk upload progress: ${processed}/${rows.length}`)
        }
      } catch (error) {
        results.errors.push({
          row: rowNum,
          error: error.message
        })

        processed++
      }
    }

    if (file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path)
      } catch (cleanupError) {
        logger.warn('[PRODUCT] Failed to cleanup uploaded file', cleanupError)
      }
    }

    logger.info('[PRODUCT] Bulk upload completed', {
      total: rows.length,
      success: results.success.length,
      errors: results.errors.length
    })

    return successResponse(
      res,
      200,
      {
        totalRecords: rows.length,
        successCount: results.success.length,
        failedCount: results.errors.length,
        success: results.success,
        errors: results.errors
      },
      `Bulk upload completed: ${results.success.length} success, ${results.errors.length} errors`
    )
  } catch (error) {
    logger.error('[PRODUCT] Bulk upload failed', {
      message: error.message,
      stack: error.stack
    })

    return errorResponse(res, 500, error.message)
  }
}

/* =====================================================
DOWNLOAD BULK ZIP TEMPLATE
GET /api/v1/productmanagement/product/zip-template/download
===================================================== */
const downloadProductZipTemplate = async (req, res) => {
  try {
    logger.info('[PRODUCT] Download ZIP template started')

    const [brands, categories, subCategories, unitTypes, units, taxes] =
      await Promise.all([
        prisma.brand.findMany({
          where: { isActive: true },
          select: { id: true, name: true },
          orderBy: { name: 'asc' }
        }),
        prisma.category.findMany({
          where: { isActive: true },
          select: { id: true, name: true },
          orderBy: { name: 'asc' }
        }),
        prisma.subCategory.findMany({
          where: { isActive: true, category: { isActive: true } },
          select: { id: true, name: true, category: { select: { name: true } } },
          orderBy: { name: 'asc' }
        }),
        prisma.unitType.findMany({
          where: { status: 'ACTIVE' },
          select: { id: true, name: true },
          orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }]
        }),
        prisma.unit.findMany({
          where: { status: 'ACTIVE', unitType: { status: 'ACTIVE' } },
          select: { id: true, name: true, unitType: { select: { name: true } } },
          orderBy: [{ unitTypeId: 'asc' }, { displayOrder: 'asc' }, { name: 'asc' }]
        }),
        prisma.tax.findMany({
          where: { status: 'ACTIVE' },
          select: { id: true, title: true, percentage: true },
          orderBy: [{ displayOrder: 'asc' }, { title: 'asc' }]
        })
      ])

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'VillagKart Partner'
    workbook.created = new Date()

    const maxDataRows = 1000
    const categorySafeNameMap = buildSafeNameMap(categories)
    const unitTypeSafeNameMap = buildSafeNameMap(unitTypes)

    const masterHeaders = [
      'category', 'subCategory', 'name', 'taxRate', 'slug', 'brand', 'tags',
      'productType', 'inventoryType', 'description', 'shortDescription', 'images',
      'unitType', 'unit', 'measurement', 'landingPrice', 'price', 'mrp', 'discountType',
      'discountValue', 'finalPrice', 'costPrice', 'stock', 'threshold', 'minOrderQty', 'maxOrderQty',
      'status', 'metaTitle', 'metaKeywords', 'schemaMarkup', 'metaDescription', 'manufacturer',
      'madeIn', 'fssaiLicNo', 'isReturnable', 'returnableDays', 'isCancelable', 'cancellableOrderStatuses', 'isCodAllowed'
    ]

    const requiredColumnIndices = [1, 2, 3, 8, 10, 13, 14, 15, 16, 17, 18, 23, 27]

    const masterSheet = workbook.addWorksheet('Products', {
      views: [{ state: 'frozen', ySplit: 1 }]
    })

    masterSheet.addRow(masterHeaders)

    const categorySafeNameColIndex = masterHeaders.length + 1
    const categorySafeNameColLetter = getColumnLetter(categorySafeNameColIndex)
    const unitTypeSafeNameColIndex = masterHeaders.length + 2
    const unitTypeSafeNameColLetter = getColumnLetter(unitTypeSafeNameColIndex)

    masterSheet.getCell(`${categorySafeNameColLetter}1`).value = 'categorySafeName'
    masterSheet.getColumn(categorySafeNameColIndex).hidden = true

    masterSheet.getCell(`${unitTypeSafeNameColLetter}1`).value = 'unitTypeSafeName'
    masterSheet.getColumn(unitTypeSafeNameColIndex).hidden = true

    const exampleRows = [
      [
        'Dairy', 'Milk', 'Amul Milk 1L', 5, 'amul-milk-1l', 'Amul', 'milk,fresh',
        'BRANDED', 'PHYSICAL', 'Fresh Amul milk 1 litre', 'Milk 1L', 'sample_apple_1.jpg, sample_apple_2.jpg',
        'Volume', 'Litre', '1', 60, 60, 65, 'PERCENTAGE', 10, 58.5, 60,
        100, 10, 1, 10, 'ACTIVE', 'Amul Milk 1L', 'milk,fresh,amul', '',
        'Fresh Amul milk 1 litre', 'Amul', 'India', '', 'TRUE', 7, 'TRUE', 'Placed, Confirmed', 'TRUE'
      ]
    ]

    exampleRows.forEach(r => masterSheet.addRow(r))

    const applyListValidation = (colIndex, options) => {
      const colLetter = getColumnLetter(colIndex)
      const isFormula = typeof options === 'string'
      const formulaStr = isFormula ? options : `"${options.join(',')}"`

      for (let row = 2; row <= maxDataRows; row++) {
        masterSheet.getCell(`${colLetter}${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [formulaStr],
          showErrorMessage: true,
          errorTitle: 'Invalid Selection',
          error: 'Please select a value from the dropdown list.'
        }
      }
    }

    applyListValidation(8, ['BRANDED', 'NON-BRANDED'])
    applyListValidation(9, ['PHYSICAL', 'DIGITAL', 'SERVICE'])
    applyListValidation(19, ['PERCENTAGE', 'RUPEES'])
    applyListValidation(27, ['ACTIVE', 'INACTIVE', 'DRAFT', 'PUBLISHED'])
    applyListValidation(35, ['TRUE', 'FALSE'])
    applyListValidation(37, ['TRUE', 'FALSE'])
    applyListValidation(39, ['TRUE', 'FALSE'])

    const lastBrand = brands.length > 0 ? Math.min(brands.length + 1, 500) : 2
    const lastCategory = categories.length > 0 ? Math.min(categories.length + 1, 500) : 2
    const lastUnitType = unitTypes.length > 0 ? Math.min(unitTypes.length + 1, 500) : 2
    const lastTax = taxes.length > 0 ? Math.min(taxes.length + 1, 500) : 2

    if (categories.length > 0) applyListValidation(1, `Categories!$B$2:$B$${lastCategory}`)
    if (taxes.length > 0) applyListValidation(4, `Taxes!$C$2:$C$${lastTax}`)
    if (brands.length > 0) applyListValidation(6, `Brands!$B$2:$B$${lastBrand}`)
    if (unitTypes.length > 0) applyListValidation(13, `UnitTypes!$B$2:$B$${lastUnitType}`)

    for (let row = 2; row <= maxDataRows; row++) {
      masterSheet.getCell(`${categorySafeNameColLetter}${row}`).value = {
        formula: `IFERROR(VLOOKUP(A${row},CategorySafeNames!$A$2:$B$${Math.max(categories.length + 1, 2)},2,FALSE),"")`
      }
      masterSheet.getCell(`${unitTypeSafeNameColLetter}${row}`).value = {
        formula: `IFERROR(VLOOKUP(M${row},UnitTypeSafeNames!$A$2:$B$${Math.max(unitTypes.length + 1, 2)},2,FALSE),"")`
      }
      masterSheet.getCell(`B${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`INDIRECT(${categorySafeNameColLetter}${row})`],
        showErrorMessage: true,
        errorTitle: 'Invalid subCategory',
        error: 'Select category first, then choose subCategory.'
      }
      masterSheet.getCell(`N${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`INDIRECT(${unitTypeSafeNameColLetter}${row})`],
        showErrorMessage: true,
        errorTitle: 'Invalid unit',
        error: 'Select unitType first, then choose unit.'
      }
    }

    masterSheet.columns.forEach((col, index) => {
      col.width = 20
      const colIndex = index + 1
      const letter = getColumnLetter(colIndex)
      const isRequired = requiredColumnIndices.includes(colIndex)
      const headerCell = masterSheet.getCell(`${letter}1`)
      headerCell.font = { bold: true, color: { argb: 'FF000000' } }
      headerCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isRequired ? 'FFFFFF99' : 'FFE0E0E0' }
      }
      headerCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
      headerCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    })

    const addSimpleSheet = (name, headers, rows, widths = []) => {
      const sheet = workbook.addWorksheet(name)
      sheet.addRow(headers)
      rows.forEach((row) => sheet.addRow(row))
      sheet.getRow(1).font = { bold: true }
      sheet.columns = headers.map((_, index) => ({ width: widths[index] || 28 }))
      return sheet
    }

    addSimpleSheet('Brands', ['id', 'name'], brands.map((b) => [b.id, b.name]), [38, 28])
    addSimpleSheet('Categories', ['id', 'name'], categories.map((c) => [c.id, c.name]), [38, 28])
    addSimpleSheet('SubCategories', ['id', 'name', 'category'], subCategories.map((sc) => [sc.id, sc.name, sc.category?.name || '']), [38, 28, 28])
    addSimpleSheet('Taxes', ['id', 'title', 'percentage'], taxes.map((t) => [t.id, t.title, Number(t.percentage)]), [38, 28, 18])
    addSimpleSheet('UnitTypes', ['id', 'name'], unitTypes.map((ut) => [ut.id, ut.name]), [38, 28])
    addSimpleSheet('Units', ['id', 'name', 'unitType'], units.map((u) => [u.id, u.name, u.unitType?.name || '']), [38, 28, 28])

    const categorySafeNamesSheet = workbook.addWorksheet('CategorySafeNames')
    categorySafeNamesSheet.addRow(['category', 'safeName'])
    categories.forEach((category) => {
      categorySafeNamesSheet.addRow([category.name, categorySafeNameMap.get(category.name)])
    })
    if (categories.length === 0) categorySafeNamesSheet.addRow(['', ''])
    categorySafeNamesSheet.state = 'hidden'

    const unitTypeSafeNamesSheet = workbook.addWorksheet('UnitTypeSafeNames')
    unitTypeSafeNamesSheet.addRow(['unitType', 'safeName'])
    unitTypes.forEach((unitType) => {
      unitTypeSafeNamesSheet.addRow([unitType.name, unitTypeSafeNameMap.get(unitType.name)])
    })
    if (unitTypes.length === 0) unitTypeSafeNamesSheet.addRow(['', ''])
    unitTypeSafeNamesSheet.state = 'hidden'

    const subByCategorySheet = workbook.addWorksheet('SubCategoriesByCategory')
    const categoryToSubs = new Map()
    categories.forEach((category) => {
      categoryToSubs.set(category.name, subCategories.filter((sc) => sc.category?.name === category.name).map((sc) => sc.name))
    })
    const maxSubsPerCategory = Math.max(1, ...categories.map((category) => categoryToSubs.get(category.name)?.length || 0))
    subByCategorySheet.addRow(categories.map((c) => c.name))
    for (let rowIndex = 0; rowIndex < maxSubsPerCategory; rowIndex++) {
      subByCategorySheet.addRow(categories.map((category) => (categoryToSubs.get(category.name) || [])[rowIndex] || ''))
    }
    categories.forEach((category, colIdx) => {
      const colLetter = getColumnLetter(colIdx + 1)
      const safeName = categorySafeNameMap.get(category.name)
      workbook.definedNames.add(`SubCategoriesByCategory!$${colLetter}$2:$${colLetter}$${maxSubsPerCategory + 1}`, safeName)
    })

    const unitsByTypeSheet = workbook.addWorksheet('UnitsByType')
    const typeToUnits = new Map()
    unitTypes.forEach((unitType) => {
      typeToUnits.set(unitType.name, units.filter((u) => u.unitType?.name === unitType.name).map((u) => u.name))
    })
    const maxUnitsPerType = Math.max(1, ...unitTypes.map((unitType) => typeToUnits.get(unitType.name)?.length || 0))
    unitsByTypeSheet.addRow(unitTypes.map((ut) => ut.name))
    for (let rowIndex = 0; rowIndex < maxUnitsPerType; rowIndex++) {
      unitsByTypeSheet.addRow(unitTypes.map((unitType) => (typeToUnits.get(unitType.name) || [])[rowIndex] || ''))
    }
    unitTypes.forEach((unitType, colIdx) => {
      const colLetter = getColumnLetter(colIdx + 1)
      const safeName = unitTypeSafeNameMap.get(unitType.name)
      workbook.definedNames.add(`UnitsByType!$${colLetter}$2:$${colLetter}$${maxUnitsPerType + 1}`, safeName)
    })

    const excelBuffer = await workbook.xlsx.writeBuffer()

    const zip = new AdmZip()
    zip.addFile('Products_Template.xlsx', Buffer.from(excelBuffer))

    // 1x1 transparent PNG sample placeholder buffer
    const samplePngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    const sampleImageBuffer = Buffer.from(samplePngBase64, 'base64')

    zip.addFile('images/sample_apple_1.jpg', sampleImageBuffer)
    zip.addFile('images/sample_apple_2.jpg', sampleImageBuffer)

    const zipBuffer = zip.toBuffer()

    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', 'attachment; filename=product_zip_template.zip')
    return res.status(200).send(zipBuffer)
  } catch (error) {
    logger.error('[PRODUCT] Download ZIP template error', { message: error.message, stack: error.stack })
    return errorResponse(res, 500, error.message)
  }
}

/* =====================================================
BULK ZIP UPLOAD PRODUCTS (Excel + images/ folder)
POST /api/v1/productmanagement/product/bulk/zip
===================================================== */
const bulkZipUploadProducts = async (req, res) => {
  try {
    logger.info('[PRODUCT] Bulk ZIP upload started')

    const userId = req.user.id
    const warehouseId = await getWarehouseFromUser(userId, prisma)

    const file = req.files?.file || req.files?.zip || req.file

    if (!file) {
      return errorResponse(res, 400, 'No zip file uploaded')
    }

    const fileData = file.data || (file.path ? fs.readFileSync(file.path) : null)
    const originalname = file.name || file.originalname || ''

    if (!fileData) {
      return errorResponse(res, 400, 'Invalid zip file uploaded')
    }

    if (!originalname.toLowerCase().endsWith('.zip')) {
      return errorResponse(res, 400, 'Invalid file format. Please upload a .zip archive')
    }

    let zip
    try {
      zip = new AdmZip(fileData)
    } catch (err) {
      return errorResponse(res, 400, 'Failed to extract ZIP archive: ' + err.message)
    }

    const zipEntries = zip.getEntries()

    let excelEntry = null
    const imageMap = new Map()

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue
      const name = entry.entryName.replace(/\\/g, '/')
      const basename = name.split('/').pop()

      if (basename.startsWith('.') || name.includes('__MACOSX')) continue

      const ext = basename.toLowerCase().substring(basename.lastIndexOf('.'))
      if (['.xlsx', '.xls', '.csv'].includes(ext) && !excelEntry) {
        excelEntry = entry
      } else if (['.jpg', '.jpeg', '.jfif', '.pjpeg', '.pjp', '.png', '.webp', '.gif', '.svg', '.bmp', '.tiff'].includes(ext)) {
        const lowerPath = name.toLowerCase()
        const lowerBase = basename.toLowerCase()
        const baseNoExt = lowerBase.substring(0, lowerBase.lastIndexOf('.')) || lowerBase

        imageMap.set(lowerPath, entry)
        imageMap.set(lowerBase, entry)
        imageMap.set(baseNoExt, entry)
        if (lowerPath.startsWith('images/')) {
          const pathNoPrefix = lowerPath.replace(/^images\//, '')
          const pathNoPrefixNoExt = pathNoPrefix.substring(0, pathNoPrefix.lastIndexOf('.')) || pathNoPrefix
          imageMap.set(pathNoPrefix, entry)
          imageMap.set(pathNoPrefixNoExt, entry)
        }
      }
    }

    if (!excelEntry) {
      return errorResponse(res, 400, 'ZIP archive must contain an Excel (.xlsx/.xls) or CSV file with product data')
    }

    const excelBuffer = excelEntry.getData()
    const rawRows = parseBulkFile(excelBuffer, excelEntry.entryName)

    const normalizeText = (value) => {
      if (value === null || value === undefined) return ''
      return String(value).trim()
    }
    const normalizeKey = (value) => normalizeText(value).toLowerCase()

    const extractRowVal = (row, keys) => {
      const rowKeys = Object.keys(row);
      for (const k of keys) {
        // Direct match
        if (row[k] !== undefined && row[k] !== null && (typeof row[k] === 'boolean' || String(row[k]).trim() !== '')) {
          return row[k];
        }
        // Insensitive match ignoring punctuation (e.g. 'Is Returnable?' matches 'isReturnable')
        const targetClean = String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
        const matchedKey = rowKeys.find(rk => String(rk).toLowerCase().replace(/[^a-z0-9]/g, '') === targetClean);
        if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null && (typeof row[matchedKey] === 'boolean' || String(row[matchedKey]).trim() !== '')) {
          return row[matchedKey];
        }
      }
      return '';
    }

    const parseNumber = (value) => {
      if (value === undefined || value === null || normalizeText(value) === '') return null
      const num = Number(value)
      return Number.isNaN(num) ? null : num
    }

    const parseInteger = (value) => {
      if (value === undefined || value === null || normalizeText(value) === '') return null
      const num = Number(value)
      return Number.isNaN(num) ? null : parseInt(num, 10)
    }

    const parseArray = (value) => {
      if (value === undefined || value === null || normalizeText(value) === '') return []
      return String(value).split(',').map((item) => item.trim()).filter(Boolean)
    }

    const normalizeProductType = (value) => {
      const normalizedValue = normalizeText(value).toUpperCase()
      if (normalizedValue === 'BRANDED') return 'BRANDED'
      if (normalizedValue === 'NON-BRANDED') return 'NON-BRANDED'
      return 'NON-BRANDED'
    }

    const normalizeInventoryType = (value) => {
      const normalizedValue = normalizeText(value).toUpperCase()
      if (normalizedValue === 'PHYSICAL') return 'PHYSICAL'
      if (normalizedValue === 'DIGITAL') return 'DIGITAL'
      return 'PHYSICAL'
    }

    const normalizeDiscountType = (value) => {
      const normalizedValue = normalizeText(value).toUpperCase()
      if (normalizedValue === 'PERCENTAGE') return 'PERCENTAGE'
      if (['RUPEES', 'FLAT', 'AMOUNT', 'FIXED'].includes(normalizedValue)) return 'RUPEES'
      return 'PERCENTAGE'
    }

    const rows = rawRows
      .map((row, index) => ({
        ...row,
        __rowNum: index + 2
      }))
      .filter((row) => {
        const nameVal = extractRowVal(row, ['name', 'Name', 'Product Name', 'ProductName', 'Title'])
        const catVal = extractRowVal(row, ['category', 'Category', 'Category Name'])
        return nameVal !== '' || catVal !== ''
      })

    const totalRecords = rows.length
    if (!totalRecords) {
      return successResponse(
        res,
        200,
        {
          totalRecords: 0,
          successCount: 0,
          failedCount: 0,
          imagesProcessed: 0,
          errors: []
        },
        'No valid product rows found in Excel sheet'
      )
    }

    // Process & upload images referenced in rows to S3
    const uploadedUrlMap = new Map()
    let imagesProcessedCount = 0

    // Collect all image references from rows
    const uniqueImageNames = new Set()
    for (const row of rows) {
      const rawImageCol = extractRowVal(row, [
        'images', 'image', 'Images', 'Image', 'Product Image', 'Product Image(s)',
        'Product_Image', 'ProductImage', 'Image Name', 'Image Names', 'product_image', 'product image'
      ])
      const namesList = parseArray(rawImageCol)
      for (const imgName of namesList) {
        if (imgName && normalizeText(imgName)) {
          uniqueImageNames.add(normalizeText(imgName))
        }
      }
    }

    // Sort all zip images into a list for index-based matching fallback (e.g. image "1" -> 1st image in ZIP)
    const sortedZipImages = Array.from(new Set(imageMap.values()))

    for (const rawImgName of uniqueImageNames) {
      const lowerImgName = rawImgName.toLowerCase().replace(/\\/g, '/')
      const lowerBase = lowerImgName.split('/').pop()
      const lowerNoExt = lowerBase.substring(0, lowerBase.lastIndexOf('.')) || lowerBase

      let entry = imageMap.get(lowerImgName) || imageMap.get(lowerBase) || (lowerImgName.startsWith('images/') ? imageMap.get(lowerImgName.replace(/^images\//, '')) : null)

      if (!entry) {
        for (const [k, v] of imageMap.entries()) {
          const kBase = k.split('/').pop()
          const kNoExt = kBase.substring(0, kBase.lastIndexOf('.')) || kBase
          if (kNoExt === lowerNoExt || kBase === lowerBase || k === lowerImgName) {
            entry = v
            break
          }
        }
      }

      // Fallback: If reference is a number like "1", "2", "3" or "1.jpg", try matching by 1-based index or filename prefix
      if (!entry) {
        const numRef = parseInt(rawImgName, 10)
        if (!isNaN(numRef) && numRef >= 1 && numRef <= sortedZipImages.length) {
          entry = sortedZipImages[numRef - 1]
        } else {
          for (const [k, v] of imageMap.entries()) {
            const kBase = k.split('/').pop()
            const kNoExt = kBase.substring(0, kBase.lastIndexOf('.')) || kBase
            if (kNoExt.startsWith(rawImgName) || kBase.startsWith(rawImgName)) {
              entry = v
              break
            }
          }
        }
      }

      if (entry) {
        try {
          const imgData = entry.getData()
          const entryName = entry.entryName.split('/').pop()
          const mimeType = entryName.endsWith('.png') ? 'image/png' : entryName.endsWith('.webp') ? 'image/webp' : entryName.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg'
          const s3File = {
            name: entryName,
            originalname: entryName,
            data: imgData,
            buffer: imgData,
            mimetype: mimeType
          }
          const uploadRes = await uploadFilesToS3([s3File], 'products')
          const imgUrl = (uploadRes && uploadRes.length > 0) ? (uploadRes[0].location || uploadRes[0].url) : null
          if (imgUrl) {
            uploadedUrlMap.set(rawImgName, imgUrl)
            uploadedUrlMap.set(rawImgName.toLowerCase(), imgUrl)
            uploadedUrlMap.set(lowerBase, imgUrl)
            uploadedUrlMap.set(lowerImgName, imgUrl)
            imagesProcessedCount++
          }
        } catch (s3Err) {
          logger.error(`[ZIP_IMPORT] Failed to upload image ${rawImgName}:`, s3Err)
        }
      }
    }

    // Load active warehouse references
    const warehouseCats = await prisma.warehouseCategory.findMany({
      where: {
        warehouseId,
        isEnabled: true,
        category: { isActive: true }
      },
      include: {
        category: { select: { id: true, name: true } }
      }
    })

    const categories = warehouseCats.map((wc) => wc.category).filter(Boolean)
    const allowedCategoryIds = categories.map((c) => c.id)

    const warehouseSubCats = await prisma.warehouseSubCategory.findMany({
      where: {
        warehouseId,
        warehouseCategory: { warehouseId, isEnabled: true, categoryId: { in: allowedCategoryIds } },
        subCategory: { isActive: true, category: { isActive: true } }
      },
      include: {
        subCategory: { include: { category: { select: { id: true, name: true } } } }
      }
    })

    const subCategories = warehouseSubCats.map((wsc) => wsc.subCategory).filter(Boolean)

    const [brands, unitTypes, units, taxes] = await Promise.all([
      prisma.brand.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
      prisma.unitType.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true } }),
      prisma.unit.findMany({
        where: { status: 'ACTIVE', unitType: { status: 'ACTIVE' } },
        select: { id: true, name: true, unitTypeId: true, unitType: { select: { id: true, name: true } } }
      }),
      prisma.tax.findMany({ where: { status: 'ACTIVE' }, select: { id: true, title: true, percentage: true } })
    ])

    const brandMap = new Map(brands.map((b) => [normalizeKey(b.name), b.id]))
    const categoryMap = new Map(categories.map((c) => [normalizeKey(c.name), c.id]))
    const subCategoryMap = new Map(
      subCategories.map((sc) => [`${normalizeKey(sc.category?.name)}|${normalizeKey(sc.name)}`, sc.id])
    )
    const unitTypeMap = new Map(unitTypes.map((u) => [normalizeKey(u.name), u]))
    const unitMap = new Map(units.map((u) => [normalizeKey(u.name), u]))
    const taxPercentageSet = new Set(taxes.map((t) => String(Number(t.percentage))))

    const errors = []
    let successCount = 0

    for (const row of rows) {
      const rowNum = row.__rowNum
      const rowErrors = []

      try {
        const categoryName = extractRowVal(row, ['category', 'Category', 'Category Name', 'CategoryName'])
        const subCategoryName = extractRowVal(row, ['subCategory', 'subcategory', 'Sub Category', 'SubCategory', 'Subcategory Name'])
        let name = extractRowVal(row, ['name', 'Name', 'Product Name', 'ProductName', 'Title', 'Product Title'])
        const taxRate = parseNumber(extractRowVal(row, ['taxRate', 'TaxRate', 'Tax Rate', 'Tax', 'Tax (%)', 'GST', 'GST (%)']))
        const userSlug = extractRowVal(row, ['slug', 'Slug', 'Product Slug'])
        const brandName = extractRowVal(row, ['brand', 'Brand', 'Brand Name', 'BrandName'])
        const productType = normalizeProductType(extractRowVal(row, ['productType', 'ProductType', 'Product Type']))
        const inventoryType = normalizeInventoryType(extractRowVal(row, ['inventoryType', 'InventoryType', 'Inventory Type']))
        const description = extractRowVal(row, ['description', 'Description', 'Product Description']) || name || 'Product'
        const shortDescription = extractRowVal(row, ['shortDescription', 'Short Description', 'ShortDescription'])
        const unitTypeName = extractRowVal(row, ['unitType', 'UnitType', 'Unit Type'])
        const unitName = extractRowVal(row, ['unit', 'Unit', 'Unit Name'])
        const measurement = extractRowVal(row, ['measurement', 'Measurement', 'Size', 'Quantity']) || '1'

        const landingPrice = parseNumber(extractRowVal(row, ['landingPrice', 'LandingPrice', 'Landing Price', 'Landing_Price', 'Cost Price']))
        const priceFromSheet = parseNumber(extractRowVal(row, ['price', 'Price', 'Landing Price(Rs)']))
        const actualPrice = landingPrice !== null ? landingPrice : (priceFromSheet !== null ? priceFromSheet : 0)

        const mrp = parseNumber(extractRowVal(row, ['mrp', 'MRP', 'Mrp', 'M.R.P', 'Selling Price'])) || actualPrice
        const discountType = normalizeDiscountType(extractRowVal(row, ['discountType', 'DiscountType', 'Discount Type']))
        const discountValue = parseNumber(extractRowVal(row, ['discountValue', 'DiscountValue', 'Discount Value', 'Discount'])) || 0
        const costPrice = parseNumber(extractRowVal(row, ['costPrice', 'CostPrice', 'Cost Price'])) || actualPrice

        const stock = parseInteger(extractRowVal(row, ['stock', 'Stock', 'Total Stock'])) || 0
        const threshold = parseInteger(extractRowVal(row, ['threshold', 'Threshold', 'Low Stock Threshold'])) || 0
        const minOrderQty = parseInteger(extractRowVal(row, ['minOrderQty', 'MinOrderQty', 'Min Order Qty'])) || 1
        const maxOrderQty = parseInteger(extractRowVal(row, ['maxOrderQty', 'MaxOrderQty', 'Max Order Qty'])) || 10

        const tagsRaw = extractRowVal(row, ['tags', 'Tags', 'Product Tags'])
        const tags = parseArray(tagsRaw)

        const metaTitle = extractRowVal(row, ['metaTitle', 'MetaTitle', 'Meta Title'])
        const metaKeywords = extractRowVal(row, ['metaKeywords', 'MetaKeywords', 'Meta Keywords'])
        const schemaMarkup = extractRowVal(row, ['schemaMarkup', 'SchemaMarkup', 'Schema Markup'])
        const metaDescription = extractRowVal(row, ['metaDescription', 'MetaDescription', 'Meta Description'])
        const manufacturer = extractRowVal(row, ['manufacturer', 'Manufacturer'])
        const madeIn = extractRowVal(row, ['madeIn', 'MadeIn', 'Made In', 'Country Of Origin'])
        const fssaiLicNo = extractRowVal(row, ['fssaiLicNo', 'FSSAI', 'FSSAI Lic No', 'FSSAI License'])

        const isReturnable = parseBoolSafe(extractRowVal(row, ['isReturnable', 'IsReturnable', 'Is Returnable', 'returnable']), false)
        const isCancelable = parseBoolSafe(extractRowVal(row, ['isCancelable', 'IsCancelable', 'Is Cancel-able', 'Is Cancelable', 'cancelable']), false)
        const isCodAllowed = parseBoolSafe(extractRowVal(row, ['isCodAllowed', 'IsCodAllowed', 'Is COD Allowed', 'isCODAllowed', 'codAllowed']), false)
        const returnableDays = parseInteger(extractRowVal(row, ['returnableDays', 'maxReturnDays', 'Returnable Days', 'Max Return Days'])) || (isReturnable ? 7 : null)
        const cancellableOrderStatusesRaw = extractRowVal(row, ['cancellableOrderStatuses', 'Cancellable Order Statuses', 'cancellableStatus'])
        const cancellableOrderStatuses = parseArray(cancellableOrderStatusesRaw)

        if (!name) {
          rowErrors.push('Product name is required')
        }

        // Resilient Category resolution
        let categoryId = categoryMap.get(normalizeKey(categoryName))
        if (!categoryId && categoryName) {
          const matchedCat = categories.find((c) =>
            normalizeKey(c.name) === normalizeKey(categoryName) ||
            normalizeKey(c.name).includes(normalizeKey(categoryName)) ||
            normalizeKey(categoryName).includes(normalizeKey(c.name))
          )
          if (matchedCat) {
            categoryId = matchedCat.id
          } else {
            const dbCat = await prisma.category.findFirst({
              where: { isActive: true, name: { contains: categoryName, mode: 'insensitive' } }
            })
            if (dbCat) categoryId = dbCat.id
          }
        }
        if (!categoryId && categories.length > 0) {
          categoryId = categories[0].id
        }

        // Resilient SubCategory resolution
        let subCategoryId = subCategoryMap.get(`${normalizeKey(categoryName)}|${normalizeKey(subCategoryName)}`)
        if (!subCategoryId && subCategoryName) {
          const matchedSub = subCategories.find((sc) =>
            normalizeKey(sc.name) === normalizeKey(subCategoryName) ||
            normalizeKey(sc.name).includes(normalizeKey(subCategoryName)) ||
            normalizeKey(subCategoryName).includes(normalizeKey(sc.name))
          )
          if (matchedSub) {
            subCategoryId = matchedSub.id
          } else {
            const dbSub = await prisma.subCategory.findFirst({
              where: { isActive: true, name: { contains: subCategoryName, mode: 'insensitive' } }
            })
            if (dbSub) subCategoryId = dbSub.id
          }
        }
        if (!subCategoryId && subCategories.length > 0) {
          subCategoryId = subCategories[0].id
        }

        // Resilient Brand resolution
        let brandId = null
        if (brandName) {
          if (brandName.includes(',')) {
            const extraTags = parseArray(brandName)
            tags.push(...extraTags)
          } else {
            brandId = brandMap.get(normalizeKey(brandName)) || null
            if (!brandId) {
              const matchedBrand = brands.find((b) => normalizeKey(b.name) === normalizeKey(brandName))
              if (matchedBrand) brandId = matchedBrand.id
            }
          }
        }

        // Resilient UnitType resolution
        let unitTypeObj = unitTypeMap.get(normalizeKey(unitTypeName))
        if (!unitTypeObj && unitTypeName) {
          unitTypeObj = unitTypes.find((ut) => normalizeKey(ut.name) === normalizeKey(unitTypeName) || normalizeKey(ut.name).includes(normalizeKey(unitTypeName)))
          if (!unitTypeObj) {
            try {
              unitTypeObj = await prisma.unitType.create({
                data: { name: unitTypeName.trim(), status: 'ACTIVE' }
              })
              unitTypes.push(unitTypeObj)
              unitTypeMap.set(normalizeKey(unitTypeName), unitTypeObj)
            } catch (utErr) { }
          }
        }
        if (!unitTypeObj && unitTypes.length > 0) {
          unitTypeObj = unitTypes.find((ut) => normalizeKey(ut.name) === 'weight') || unitTypes[0]
        }
        const resolvedUnitTypeName = unitTypeObj?.name || (unitTypeName && unitTypeName.trim()) || 'Weight'
        const resolvedUnitTypeId = unitTypeObj?.id || null

        // Resilient Unit resolution
        let unitObj = unitMap.get(normalizeKey(unitName))
        if (!unitObj && unitName) {
          unitObj = units.find((u) => normalizeKey(u.name) === normalizeKey(unitName) || normalizeKey(u.name).includes(normalizeKey(unitName)))
          if (!unitObj && resolvedUnitTypeId) {
            try {
              unitObj = await prisma.unit.create({
                data: {
                  name: unitName.trim(),
                  shortCode: unitName.trim().toUpperCase(),
                  unitTypeId: resolvedUnitTypeId,
                  status: 'ACTIVE'
                }
              })
              units.push(unitObj)
              unitMap.set(normalizeKey(unitName), unitObj)
            } catch (uErr) { }
          }
        }
        if (!unitObj && units.length > 0) {
          unitObj = units.find((u) => normalizeKey(u.name) === 'kg' || normalizeKey(u.name) === 'pcs') || units[0]
        }
        const resolvedUnitName = unitObj?.name || (unitName && unitName.trim()) || 'Kg'
        const resolvedUnitId = unitObj?.id || null

        // Map images
        const rawImageCol = extractRowVal(row, [
          'images', 'image', 'Images', 'Image', 'Product Image', 'Product Image(s)',
          'Product_Image', 'ProductImage', 'Image Name', 'Image Names'
        ])
        const imgNameList = parseArray(rawImageCol)
        const finalImages = []

        for (const rawName of imgNameList) {
          const lowerRaw = rawName.toLowerCase()
          if (['kg', 'g', 'ml', 'litre', 'liter', 'pcs', 'pack'].includes(lowerRaw)) {
            continue
          }
          const lowerName = rawName.toLowerCase().replace(/\\/g, '/')
          const lowerBase = lowerName.split('/').pop()
          const matchedUrl = uploadedUrlMap.get(rawName) || uploadedUrlMap.get(lowerRaw) || uploadedUrlMap.get(lowerBase) || uploadedUrlMap.get(lowerName)
          if (matchedUrl) {
            finalImages.push(matchedUrl)
          } else if (rawName.startsWith('http://') || rawName.startsWith('https://')) {
            finalImages.push(rawName)
          } else {
            errors.push({ row: rowNum, field: 'images', message: `Image '${rawName}' referenced in Excel not found in ZIP images/ folder` })
          }
        }

        if (rowErrors.length > 0) {
          for (const msg of rowErrors) {
            errors.push({ row: rowNum, field: 'Validation', message: msg })
          }
          continue
        }

        // Calculate final price
        let safeDiscountValue = Number(discountValue || 0)
        let safeMrp = Number(mrp || 0)
        let finalPrice = safeMrp
        if (discountType === 'PERCENTAGE') {
          finalPrice = Number((safeMrp - (safeMrp * safeDiscountValue / 100)).toFixed(2))
        } else if (discountType === 'RUPEES') {
          finalPrice = Number((safeMrp - safeDiscountValue).toFixed(2))
        }

        const rawStatus = extractRowVal(row, ['status', 'Status', 'Product Status', 'productStatus', 'isActive', 'IsActive', 'State'])
        const normalizedStatus = normalizeText(rawStatus).toUpperCase()
        const isActive = ['INACTIVE', 'FALSE', '0', 'NO', 'DISABLED'].includes(normalizedStatus) ? false : true

        // Check if product already exists in this warehouse to prevent duplicates
        const existingProduct = await prisma.product.findFirst({
          where: {
            warehouseId,
            OR: [
              { name: { equals: name, mode: 'insensitive' } },
              { slug: { equals: slugify(name), mode: 'insensitive' } },
              ...(userSlug ? [{ slug: { equals: slugify(userSlug), mode: 'insensitive' } }] : [])
            ]
          }
        })

        if (existingProduct) {
          // Update existing product boolean flags, tax, images, and status
          await prisma.product.update({
            where: { id: existingProduct.id },
            data: {
              isReturnable,
              isCancelable,
              isCodAllowed,
              returnableDays: isReturnable ? returnableDays : null,
              cancellableOrderStatuses,
              isActive,
              taxRate: taxRate || 0,
              ...(finalImages.length > 0 ? { images: finalImages } : {})
            }
          })
          successCount++
          continue
        }

        // Create product in partner database
        const uniqueSlug = userSlug ? slugify(userSlug) : slugify(name)

        const product = await prisma.product.create({
          data: {
            name,
            slug: uniqueSlug,
            description,
            shortDescription: shortDescription || null,
            images: finalImages,
            tags,
            categoryId,
            subCategoryId,
            brandId,
            warehouseId,
            productType,
            inventoryType,
            price: actualPrice,
            mrp,
            discountType,
            discountValue: safeDiscountValue,
            finalPrice,
            costPrice,
            taxRate: taxRate || 0,
            unitType: resolvedUnitTypeName,
            unitTypeId: resolvedUnitTypeId,
            unit: resolvedUnitName,
            unitId: resolvedUnitId,
            measurement,
            stock,
            threshold,
            minOrderQty,
            maxOrderQty,
            isActive,
            isReturnable,
            isCancelable,
            isCodAllowed,
            returnableDays: isReturnable ? returnableDays : null,
            cancellableOrderStatuses,
            metaTitle: metaTitle || null,
            metaKeywords: metaKeywords || null,
            schemaMarkup: schemaMarkup || null,
            metaDescription: metaDescription || null,
            manufacturer: manufacturer || null,
            madeIn: madeIn || null,
            fssaiLicNo: fssaiLicNo || null,
            variants: {
              create: {
                variantName: `${measurement} ${resolvedUnitName}`,
                mrp,
                sellingPrice: actualPrice,
                discountType,
                discountValue: safeDiscountValue,
                landingPrice: actualPrice,
                stockQuantity: stock || 0,
                lowStockThreshold: threshold || 5,
                minOrderQty,
                maxOrderQty,
                unitType: resolvedUnitTypeName,
                unitTypeId: resolvedUnitTypeId,
                unit: resolvedUnitName,
                unitId: resolvedUnitId,
                measurement,
                primaryImages: finalImages,
                status: isActive ? 'ACTIVE' : 'INACTIVE'
              }
            }
          }
        })

        if (product) {
          successCount++
        }
      } catch (rowErr) {
        logger.error(`[ZIP_IMPORT] Error processing row ${rowNum}:`, rowErr)
        errors.push({
          row: rowNum,
          field: 'Database',
          message: rowErr.message || 'Error creating product'
        })
      }
    }

    const failedCount = totalRecords - successCount

    return successResponse(
      res,
      200,
      {
        totalRecords,
        successCount,
        failedCount,
        imagesProcessed: imagesProcessedCount,
        errors
      },
      `ZIP import completed. Success: ${successCount}, Failed: ${failedCount}, Images Uploaded: ${imagesProcessedCount}`
    )
  } catch (error) {
    logger.error('[PRODUCT] Bulk ZIP upload error', { message: error.message, stack: error.stack })
    return errorResponse(res, 500, error.message || 'Internal server error during ZIP import')
  }
}


const importMasterProductToWarehouse = async (req, res) => {
  try {
    const { products = [] } = req.body

    if (!Array.isArray(products) || !products.length) {
      return errorResponse(res, 400, 'products array is required')
    }

    const userId = req.user?.id

    logger.info('[IMPORT] Bulk Master Product + Selected Variants started', {
      count: products.length,
      userId
    })

    /* ---------------------------------------
       1️⃣ Get Warehouse
    ---------------------------------------- */
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { warehouseId: true }
    })

    if (!user?.warehouseId) {
      logger.warn('[IMPORT] User warehouse not found', { userId })
      return errorResponse(res, 400, 'User warehouse not found')
    }

    const warehouseId = user.warehouseId
    const results = []

    /* ---------------------------------------
       2️⃣ Import Loop
    ---------------------------------------- */
    for (const item of products) {
      const {
        masterProductId,
        masterProductVariantIds
      } = item

      try {
        if (!masterProductId) {
          results.push({
            masterProductId: null,
            status: 'FAILED',
            reason: 'masterProductId is required'
          })
          continue
        }

        /*
          ✅ Modified logic:
          - If masterProductVariantIds is not sent, use empty array
          - If masterProductVariantIds is sent as empty array, allow product import
          - If masterProductVariantIds is sent with values, import only selected variants
        */
        const selectedVariantIds = Array.isArray(masterProductVariantIds)
          ? masterProductVariantIds
          : []

        /* ---------------------------------------
           3️⃣ Fetch Master Product
        ---------------------------------------- */
        const masterProduct = await prisma.masterProduct.findUnique({
          where: { id: masterProductId },
          include: {
            supplier: true
          }
        })

        if (!masterProduct) {
          results.push({
            masterProductId,
            status: 'FAILED',
            reason: 'Master product not found'
          })
          continue
        }

        /* ---------------------------------------
           4️⃣ Fetch Selected Master Variants only
           ✅ Only fetch when variants are sent
        ---------------------------------------- */
        let selectedMasterVariants = []

        if (selectedVariantIds.length) {
          selectedMasterVariants = await prisma.masterProductVariant.findMany({
            where: {
              id: { in: selectedVariantIds },
              masterProductId
            }
          })

          if (!selectedMasterVariants.length) {
            results.push({
              masterProductId,
              status: 'FAILED',
              reason: 'No matching master product variants found for this master product'
            })
            continue
          }

          if (selectedMasterVariants.length !== selectedVariantIds.length) {
            results.push({
              masterProductId,
              status: 'FAILED',
              reason: 'Some selected master product variants are invalid'
            })
            continue
          }
        }

        /* ---------------------------------------
           5️⃣ Find or Create Product
        ---------------------------------------- */
        let product = await prisma.product.findFirst({
          where: {
            warehouseId,
            masterProductId
          }
        })

        let productStatus = 'ALREADY_EXISTS'

        if (!product) {
          product = await prisma.product.create({
            data: {
              masterProductId: masterProduct.id,

              // BASIC INFO
              name: masterProduct.name,
              slug: masterProduct.slug,
              description: masterProduct.description,
              shortDescription: masterProduct.shortDescription,
              images: masterProduct.images,
              tags: masterProduct.tags,
              brandId: masterProduct.brandId,
              categoryId: masterProduct.categoryId,
              subCategoryId: masterProduct.subCategoryId,
              productType: masterProduct.productType,
              inventoryType: masterProduct.inventoryType,

              // PRICING
              price: masterProduct.price,
              mrp: masterProduct.mrp,
              discountType: masterProduct.discountType,
              discountValue: masterProduct.discountValue,
              finalPrice: masterProduct.finalPrice,
              costPrice: masterProduct.costPrice,
              taxRate: masterProduct.taxRate,

              // UNIT
              unitType: masterProduct.unitType,
              unit: masterProduct.unit,
              measurement: masterProduct.measurement,

              // INVENTORY
              warehouseId,
              stock: masterProduct.stock,
              threshold: masterProduct.threshold,
              minOrderQty: masterProduct.minOrderQty,
              maxOrderQty: masterProduct.maxOrderQty,

              // STATUS
              status: 'APPROVED',
              isActive: false,
              isFeatured: masterProduct.isFeatured,

              // VARIANT INFO ON PRODUCT
              variantName: masterProduct.variantName,
              sku: masterProduct.sku,
              barcode: masterProduct.barcode,
              variantStatus: masterProduct.variantStatus,

              // EXTRA
              weight: masterProduct.weight,

              // SEO
              metaTitle: masterProduct.metaTitle,
              metaKeywords: masterProduct.metaKeywords,
              metaDescription: masterProduct.metaDescription,
              schemaMarkup: masterProduct.schemaMarkup,

              // SETTINGS
              manufacturer: masterProduct.manufacturer,
              madeIn: masterProduct.madeIn,
              fssaiLicNo: masterProduct.fssaiLicNo,
              isReturnable: masterProduct.isReturnable,
              returnableDays: masterProduct.returnableDays,
              isCancelable: masterProduct.isCancelable,
              cancellableOrderStatuses:
                masterProduct.cancellableOrderStatuses || [],
              isCodAllowed: masterProduct.isCodAllowed,

              supplier: {
                connect: masterProduct.supplier.map((s) => ({ id: s.id }))
              }
            }
          })

          productStatus = 'PRODUCT_IMPORTED'
        }

        /* ---------------------------------------
           6️⃣ Existing Product Variants
           ✅ Only needed when selected variants are sent
        ---------------------------------------- */
        let existingMasterVariantIds = new Set()
        let existingSkus = new Set()

        if (selectedMasterVariants.length) {
          const existingVariants = await prisma.productVariant.findMany({
            where: {
              productId: product.id
            },
            select: {
              id: true,
              sku: true,
              masterProductVariantId: true
            }
          })

          existingMasterVariantIds = new Set(
            existingVariants
              .filter((v) => v.masterProductVariantId)
              .map((v) => v.masterProductVariantId)
          )

          existingSkus = new Set(
            existingVariants
              .filter((v) => v.sku)
              .map((v) => v.sku)
          )
        }

        /* ---------------------------------------
           7️⃣ Import only selected variants
           ✅ If no variants sent, this loop will not run
        ---------------------------------------- */
        const importedVariants = []
        const skippedVariants = []

        for (const masterVariant of selectedMasterVariants) {
          const alreadyExistsByMasterVariant =
            masterVariant.id &&
            existingMasterVariantIds.has(masterVariant.id)

          const alreadyExistsBySku =
            masterVariant.sku &&
            existingSkus.has(masterVariant.sku)

          if (alreadyExistsByMasterVariant || alreadyExistsBySku) {
            skippedVariants.push({
              masterProductVariantId: masterVariant.id,
              sku: masterVariant.sku,
              reason: 'Variant already imported'
            })
            continue
          }

          const createdVariant = await prisma.productVariant.create({
            data: {
              productId: product.id,
              masterProductVariantId: masterVariant.id,

              sku: masterVariant.sku,
              gtin: masterVariant.gtin,
              barcodeImage: masterVariant.barcodeImage,
              variantName: masterVariant.variantName,
              unit: masterVariant.unit,
              unitType: masterVariant.unitType,
              measurement: masterVariant.measurement,
              status: masterVariant.status || 'ACTIVE',

              primaryImages: masterVariant.primaryImages || [],
              secondaryImages: masterVariant.secondaryImages || [],
              metaTitle: masterVariant.metaTitle,
              metaKeywords: masterVariant.metaKeywords,
              metaDescription: masterVariant.metaDescription,
              schemaMarkup: masterVariant.schemaMarkup,

              mrp: masterVariant.mrp || 0,
              sellingPrice: masterVariant.sellingPrice,
              landingPrice: masterVariant.landingPrice || 0,
              discountType: masterVariant.discountType,
              discountValue: masterVariant.discountValue,
              stockQuantity: masterVariant.stockQuantity || 0,
              minOrderQty: masterVariant.minOrderQty ?? 1,
              maxOrderQty: masterVariant.maxOrderQty,
              lowStockThreshold: masterVariant.lowStockThreshold ?? 5,
              isEnabled: masterVariant.isEnabled ?? true
            }
          })

          importedVariants.push({
            masterProductVariantId: masterVariant.id,
            productVariantId: createdVariant.id,
            sku: createdVariant.sku
          })
        }

        results.push({
          masterProductId,
          productId: product.id,
          productStatus,
          importedVariants,
          skippedVariants,
          status: 'SUCCESS'
        })
      } catch (err) {
        logger.error('[IMPORT] Single product import failed', {
          masterProductId,
          error: err.message
        })

        results.push({
          masterProductId,
          status: 'FAILED',
          reason: err.message
        })
      }
    }

    logger.info('[IMPORT] Bulk master product + selected variants completed', {
      warehouseId,
      resultsCount: results.length
    })

    return successResponse(
      res,
      201,
      results,
      'Bulk master products imported successfully'
    )
  } catch (error) {
    logger.error('[IMPORT] Bulk failed', {
      error: error.message
    })
    return errorResponse(res, 500, 'Bulk import failed')
  }
}



const getUnitsByUnitType = async (req, res) => {
  try {
    const { unitTypeId } = req.params

    const { search, status, page, limit } = req.query

    logger.info('[UNIT] Fetch by unitTypeId', { unitTypeId, search, status, page, limit })

    if (!unitTypeId) {
      return errorResponse(res, 400, 'unitTypeId is required')
    }

    const shouldPaginate = page && limit
    const skip = shouldPaginate ? (Number(page) - 1) * Number(limit) : undefined
    const take = shouldPaginate ? Number(limit) : undefined

    const where = {
      unitTypeId,
      ...(status && { status: status.toUpperCase() }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { shortCode: { contains: search, mode: 'insensitive' } }
        ]
      })
    }

    const [units, total] = await Promise.all([
      prisma.unit.findMany({
        where,
        skip,
        take,
        orderBy: [
          { displayOrder: 'asc' },
          { createdAt: 'desc' }
        ]
      }),
      prisma.unit.count({ where })
    ])

    logger.info('[UNIT] Units fetched by unitTypeId', {
      count: units.length
    })

    return res.json({
      total,
      ...(shouldPaginate && { page: Number(page), limit: Number(limit) }),
      data: units
    })

  } catch (error) {
    logger.error('[UNIT] Fetch by unitTypeId failed', {
      message: error.message,
      stack: error.stack
    })

    return errorResponse(res, 500, 'Failed to fetch units')
  }
}

const getUnitTypes = async (req, res) => {
  try {
    const { page, limit, search, status } = req.query

    logger.info("[UnitType] Fetch request received", { page, limit, search, status })

    const shouldPaginate = page && limit
    const skip = shouldPaginate ? (Number(page) - 1) * Number(limit) : undefined
    const take = shouldPaginate ? Number(limit) : undefined

    const where = {
      ...(status && { status: status.toUpperCase() }),
      ...(search && {
        name: { contains: search, mode: "insensitive" }
      })
    }

    const [records, total] = await Promise.all([
      prisma.unitType.findMany({
        where,
        skip,
        take,
        orderBy: { displayOrder: "asc" }
      }),
      prisma.unitType.count({ where })
    ])

    logger.info("[UnitType] Fetch successful", { total })

    return res.json({
      total,
      ...(shouldPaginate && { page: Number(page), limit: Number(limit) }),
      data: records
    })

  } catch (error) {
    logger.error("[UnitType] Fetch error", { message: error.message })
    return errorResponse(res, 500, "Failed to fetch unit types")
  }
}

const getMasterProducts = async (req, res) => {
  try {
    let {
      page,
      limit,
      search,
      status,
      categoryId,
      subCategoryId,
      source
    } = req.query;

    const userId = req.user?.id;

    /* ------------------------------
       1️⃣ Get warehouseId
    ------------------------------ */
    const user = userId ? await prisma.user.findUnique({
      where: { id: userId },
      select: { warehouseId: true }
    }) : null;

    const warehouseId = user?.warehouseId || null;

    /* ------------------------------
       3️⃣ Build filters
    ------------------------------ */
    const where = {};

    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (subCategoryId) where.subCategoryId = subCategoryId;

    /* ------------------------------
       🏷️ SOURCE FILTER (admin / partner)
       - partner: only MasterProducts already imported into this warehouse
       - admin:   only MasterProducts NOT yet imported into this warehouse
    ------------------------------ */
    if (source && warehouseId) {
      if (source === "partner") {
        where.products = { some: { warehouseId } };
      } else if (source === "admin") {
        where.products = { none: { warehouseId } };
      }
    }

    /* ------------------------------
       🔥 SEARCH
    ------------------------------ */
    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive"
          }
        },
        {
          sku: {
            contains: search,
            mode: "insensitive"
          }
        },
        {
          variants: {
            some: {
              OR: [
                {
                  variantName: {
                    contains: search,
                    mode: "insensitive"
                  }
                },
                {
                  sku: {
                    contains: search,
                    mode: "insensitive"
                  }
                },
                {
                  gtin: {
                    contains: search,
                    mode: "insensitive"
                  }
                }
              ]
            }
          }
        }
      ];
    }

    /* ------------------------------
       4️⃣ Pagination
    ------------------------------ */
    let pagination = {};

    if (page && limit) {
      page = Number(page);
      limit = Number(limit);

      pagination.skip = (page - 1) * limit;
      pagination.take = limit;
    }

    /* ------------------------------
       5️⃣ Fetch master products with variants
       Also fetch already imported products for warehouse
    ------------------------------ */
    const products = await prisma.masterProduct.findMany({
      where,
      ...pagination,
      include: {
        category: true,
        subCategory: true,
        brand: true,
        variants: {
          orderBy: { createdAt: "desc" }
        },
        products: {
          where: {
            warehouseId: warehouseId || "no-warehouse"
          },
          select: {
            id: true,
            masterProductId: true,
            variants: {
              select: {
                id: true,
                masterProductVariantId: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    /* ------------------------------
       6️⃣ Fetch UnitType and Unit details
    ------------------------------ */

    const unitTypeIds = [
      ...new Set(
        products
          .flatMap((product) => [
            product.unitType,
            ...(product.variants || []).map((variant) => variant.unitType)
          ])
          .flat()
          .filter(Boolean)
      )
    ];

    const unitIds = [
      ...new Set(
        products
          .flatMap((product) => [
            product.unit,
            ...(product.variants || []).map((variant) => variant.unit)
          ])
          .flat()
          .filter(Boolean)
      )
    ];

    const [unitTypes, units] = await Promise.all([
      unitTypeIds.length
        ? prisma.unitType.findMany({
          where: {
            id: { in: unitTypeIds }
          },
          select: {
            id: true,
            name: true
          }
        })
        : [],

      unitIds.length
        ? prisma.unit.findMany({
          where: {
            id: { in: unitIds }
          },
          select: {
            id: true,
            name: true,
            shortCode: true
          }
        })
        : []
    ]);

    const unitTypeMap = new Map(
      unitTypes.map((unitType) => [unitType.id, unitType])
    );

    const unitMap = new Map(
      units.map((unit) => [unit.id, unit])
    );

    /* ------------------------------
       7️⃣ Add isImported + Unit details
    ------------------------------ */
    const formattedProducts = products.map((product) => {
      const importedProduct = product.products?.[0] || null;

      const importedVariantIds = new Set(
        importedProduct?.variants
          ?.map((variant) => variant.masterProductVariantId)
          .filter(Boolean) || []
      );

      const productUnitType = unitTypeMap.get(product.unitType);
      const productUnit = unitMap.get(product.unit);

      return {
        ...product,

        // Product unit details
        unitTypeId: product.unitType || null,
        unitTypeName: productUnitType?.name || null,

        unitId: product.unit || null,
        unitName: productUnit?.name || null,
        unitShortCode: productUnit?.shortCode || null,

        // product imported or not
        isImported: !!importedProduct,

        // variants imported or not + unit details
        variants: product.variants.map((variant) => {
          const variantUnitType = unitTypeMap.get(variant.unitType);
          const variantUnit = unitMap.get(variant.unit);

          return {
            ...variant,

            unitTypeId: variant.unitType || null,
            unitTypeName: variantUnitType?.name || null,

            unitId: variant.unit || null,
            unitName: variantUnit?.name || null,
            unitShortCode: variantUnit?.shortCode || null,

            isImported: importedVariantIds.has(variant.id)
          };
        }),

        // optional: remove internal imported products relation from response
        products: undefined
      };
    });

    const total = await prisma.masterProduct.count({ where });

    /* ------------------------------
       8️⃣ Stats
    ------------------------------ */
    const baseWhere = {};

    const stats = {
      total: await prisma.masterProduct.count({ where: baseWhere }),
      active: await prisma.masterProduct.count({
        where: { ...baseWhere, isActive: true }
      }),
      inactive: await prisma.masterProduct.count({
        where: { ...baseWhere, isActive: false }
      })
    };

    logger.info("[MASTER_PRODUCT] List fetched", {
      warehouseId,
      count: formattedProducts.length,
      search
    });

    /* ------------------------------
       9️⃣ Response
    ------------------------------ */
    if (page && limit) {
      return paginatedResponse(
        res,
        200,
        { stats, products: formattedProducts },
        { page, limit, total },
        "Master products with variants fetched"
      );
    }

    return successResponse(
      res,
      200,
      {
        stats,
        total,
        products: formattedProducts
      },
      "Master products with variants fetched"
    );
  } catch (e) {
    logger.error("[MASTER_PRODUCT] List failed", e);
    return errorResponse(res, 500, e.message);
  }
};


const getMasterProductById = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info("[MASTER_PRODUCT] Fetch by id request", { id });

    if (!id) {
      return errorResponse(res, 400, "Product id is required");
    }

    const product = await prisma.masterProduct.findUnique({
      where: { id },
      include: {
        brand: {
          select: {
            id: true,
            name: true
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        },
        subCategory: {
          select: {
            id: true,
            name: true
          }
        },
        supplier: {
          select: {
            id: true,
            companyName: true
          }
        },
        variants: true
      }
    });

    if (!product) {
      return errorResponse(res, 404, "Master product not found");
    }

    /* ------------------------------
       Fetch UnitType and Unit details
    ------------------------------ */

    const unitTypeIds = [
      ...new Set(
        [
          product.unitType,
          ...(product.variants || []).map((variant) => variant.unitType)
        ].filter(Boolean)
      )
    ];

    const unitIds = [
      ...new Set(
        [
          product.unit,
          ...(product.variants || []).map((variant) => variant.unit)
        ].filter(Boolean)
      )
    ];

    const [unitTypes, units] = await Promise.all([
      unitTypeIds.length
        ? prisma.unitType.findMany({
          where: {
            id: { in: unitTypeIds }
          },
          select: {
            id: true,
            name: true
          }
        })
        : [],

      unitIds.length
        ? prisma.unit.findMany({
          where: {
            id: { in: unitIds }
          },
          select: {
            id: true,
            name: true,
            shortCode: true
          }
        })
        : []
    ]);

    const unitTypeMap = new Map(
      unitTypes.map((unitType) => [unitType.id, unitType])
    );

    const unitMap = new Map(
      units.map((unit) => [unit.id, unit])
    );

    const productUnitType = unitTypeMap.get(product.unitType);
    const productUnit = unitMap.get(product.unit);

    const formattedProduct = {
      ...product,

      // Product unit details
      unitTypeId: product.unitType || null,
      unitTypeName: productUnitType?.name || null,

      unitId: product.unit || null,
      unitName: productUnit?.name || null,
      unitShortCode: productUnit?.shortCode || null,

      // Variant unit details
      variants: product.variants.map((variant) => {
        const variantUnitType = unitTypeMap.get(variant.unitType);
        const variantUnit = unitMap.get(variant.unit);

        return {
          ...variant,

          unitTypeId: variant.unitType || null,
          unitTypeName: variantUnitType?.name || null,

          unitId: variant.unit || null,
          unitName: variantUnit?.name || null,
          unitShortCode: variantUnit?.shortCode || null
        };
      })
    };

    logger.info("[MASTER_PRODUCT] Fetch success", { productId: id });

    return successResponse(
      res,
      200,
      formattedProduct,
      "Master product fetched successfully"
    );
  } catch (error) {
    logger.error("[MASTER_PRODUCT] Fetch failed", {
      message: error.message,
      stack: error.stack
    });

    return errorResponse(res, 500, "Failed to fetch master product");
  }
};

const getActiveTaxes = async (req, res) => {
  try {
    const taxes = await prisma.tax.findMany({
      where: { status: "ACTIVE" },
      orderBy: { displayOrder: "asc" }
    })

    return successResponse(res, 200, taxes, "Active taxes fetched successfully")
  } catch (error) {
    logger.error("[TAX] Fetch active taxes failed", {
      message: error.message,
      stack: error.stack
    })
    return errorResponse(res, 500, "Failed to fetch active taxes")
  }
}


/* ============================================================================
   SYNC FLASH DEAL — set/clear the same flashDealEnd on multiple products
   so the entire flash sale section shares one global countdown timer
============================================================================ */
const syncFlashDeal = async (req, res) => {
  try {
    const { flashDealEnd, productIds } = req.body;

    // Determine the new end time (null = clear the flash deal)
    const flashEnd = flashDealEnd ? new Date(flashDealEnd) : null;

    if (flashDealEnd && isNaN(flashEnd.getTime())) {
      return errorResponse(res, 400, 'flashDealEnd must be a valid ISO date string or null');
    }

    let where = {};

    if (Array.isArray(productIds) && productIds.length > 0) {
      // Update only the specified products
      where = { id: { in: productIds } };
    } else if (flashEnd === null) {
      // Clear all currently active flash products (end all deals)
      where = { flashDealEnd: { not: null } };
    } else {
      // No specific products and not clearing — require productIds
      return errorResponse(res, 400, 'productIds array is required when setting a flash deal');
    }

    const { count } = await prisma.product.updateMany({
      where,
      data: { flashDealEnd: flashEnd },
    });

    logger.info('[FLASH DEAL SYNC] Updated', { count, flashDealEnd: flashEnd });
    return successResponse(res, 200, { count, flashDealEnd: flashEnd }, `Flash deal updated for ${count} product(s)`);
  } catch (error) {
    logger.error('[FLASH DEAL SYNC] Error:', { message: error.message });
    return errorResponse(res, 500, 'Failed to sync flash deal');
  }
};




const updateChannelAllocation = async (req, res) => {
  try {
    const { productId } = req.params;
    const { onlineQty, posQty, vehicleQty, mode } = req.body;
    const isSetMode = mode === 'SET';
    
    const oQty = Math.max(0, Number(onlineQty) || 0);
    const pQty = Math.max(0, Number(posQty) || 0);
    const vQty = Math.max(0, Number(vehicleQty) || 0);

    const totalAllocated = oQty + pQty + vQty;

    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ 
        where: { id: productId }, 
        select: { id: true, warehouseId: true, stock: true, price: true },
      });
      if (!product) {
        throw new Error('PRODUCT_NOT_FOUND:Product not found');
      }

      // Fetch Procurement GRN received stock
      const grnAgg = await tx.procurementGoodsReceiptItem.aggregate({
        where: { productId },
        _sum: { receivedQty: true }
      });
      const totalProcuredQty = grnAgg._sum.receivedQty || 0;

      // Also check Purchase Order items if any
      const poAgg = await tx.purchaseOrderItem.aggregate({
        where: { productId },
        _sum: { receivedQty: true }
      });
      const totalPoQty = poAgg._sum.receivedQty || 0;

      // Also check Finished Goods (production output) if any
      const fgAgg = await tx.finishedGoods.aggregate({
        where: { productId },
        _sum: { postedQty: true }
      });
      const totalFgQty = fgAgg._sum.postedQty || 0;

      // Determine total base stock available from procurement / production / catalog
      const effectiveTotalStock = Math.max(
        product.stock || 0,
        totalProcuredQty,
        totalPoQty,
        totalFgQty
      );

      // Compute existing allocations: ONLINE + POS channel rows + vehicle stock assignments.
      // Exclude VEHICLE channelInventory rows — vehicle qty lives in vehicleStockAssignment
      // (writing both would double-count and falsely report 0 available).
      const existingChannelAgg = await tx.channelInventory.aggregate({
        where: {
          productId,
          productVariantId: null,
          channel: { in: ['ONLINE_APP', 'POS_STORE', 'ONLINE', 'POS'] }
        },
        _sum: { quantity: true }
      });
      const existingVsaAgg = await tx.vehicleStockAssignment.aggregate({
        where: { productId, productVariantId: null },
        _sum: { quantity: true }
      });
      const currentAllocated = (existingChannelAgg._sum.quantity || 0) + (existingVsaAgg._sum.quantity || 0);

      const availableStock = Math.max(0, effectiveTotalStock - currentAllocated);

      if (isSetMode) {
        if (totalAllocated > effectiveTotalStock) {
          throw new Error(`VALIDATION:Cannot allocate ${totalAllocated} items across channels. Total ready stock is only ${effectiveTotalStock}.`);
        }
      } else {
        if (totalAllocated > availableStock) {
          throw new Error(`VALIDATION:Cannot allocate ${totalAllocated} items. Only ${availableStock} stock available (Total Stock: ${effectiveTotalStock}, Already Allocated: ${currentAllocated}).`);
        }
      }

      const targetWhId = product.warehouseId || req.user?.warehouseId || 'default_wh';

      // Keep product stock updated with effective total stock
      await tx.product.update({
        where: { id: productId },
        data: {
          stock: effectiveTotalStock,
          status: 'APPROVED',
          isActive: true,
          warehouseId: targetWhId
        }
      });

      // Update ONLINE_APP inventory
      const onlineInv = await tx.channelInventory.findFirst({
        where: {
          channel: { in: ['ONLINE_APP', 'ONLINE', 'APP'] },
          warehouseId: targetWhId,
          productId,
          productVariantId: null
        }
      });

      if (onlineInv) {
        await tx.channelInventory.update({
          where: { id: onlineInv.id },
          data: {
            quantity: isSetMode ? oQty : { increment: oQty },
            isActive: (isSetMode ? oQty : (onlineInv.quantity + oQty)) > 0
          }
        });
      } else {
        await tx.channelInventory.create({
          data: {
            id: crypto.randomUUID(),
            channel: 'ONLINE_APP',
            warehouseId: targetWhId,
            productId,
            productVariantId: null,
            quantity: oQty,
            channelPrice: product.price || 0,
            isActive: oQty > 0
          }
        });
      }

      // Update POS_STORE inventory
      const posExisting = await tx.channelInventory.findFirst({
        where: {
          channel: { in: ['POS_STORE', 'POS'] },
          warehouseId: targetWhId,
          productId,
          productVariantId: null
        }
      });

      if (posExisting) {
        await tx.channelInventory.update({
          where: { id: posExisting.id },
          data: {
            quantity: isSetMode ? pQty : { increment: pQty },
            isActive: (isSetMode ? pQty : (posExisting.quantity + pQty)) > 0
          }
        });
      } else {
        await tx.channelInventory.create({
          data: {
            id: crypto.randomUUID(),
            channel: 'POS_STORE',
            warehouseId: targetWhId,
            productId,
            productVariantId: null,
            quantity: pQty,
            channelPrice: product.price || 0,
            taxRate: 5.0,
            isActive: pQty > 0
          }
        });
      }

      // Handle Vehicle allocation
      let vehicle = await tx.vehicle.findFirst({
        where: { status: true }
      });

      if (!vehicle) {
        vehicle = await tx.vehicle.findFirst();
      }

      if (vQty > 0 && !vehicle) {
        throw new Error('VALIDATION:No vehicle found to assign stock. Please add an active vehicle first.');
      }

      if (vehicle) {
        const existingVsa = await tx.vehicleStockAssignment.findFirst({
          where: {
            vehicleId: vehicle.id,
            productId,
            productVariantId: null
          }
        });

        if (existingVsa) {
          const newVsaQty = isSetMode ? vQty : (existingVsa.quantity || 0) + vQty;
          const newOpening = isSetMode ? Math.max(existingVsa.openingQuantity || 0, vQty) : (existingVsa.openingQuantity || 0) + vQty;
          await tx.vehicleStockAssignment.update({
            where: { id: existingVsa.id },
            data: {
              quantity: newVsaQty,
              openingQuantity: newOpening,
              status: 'OPEN'
            }
          });
        } else if (vQty > 0) {
          await tx.vehicleStockAssignment.create({
            data: {
              id: crypto.randomUUID(),
              vehicleId: vehicle.id,
              productId,
              productVariantId: null,
              quantity: vQty,
              openingQuantity: vQty,
              status: 'OPEN'
            }
          });
        }
      }
    });

    await InventoryCache.invalidatePrefix(`vsms:inventory:items:store`);
    await InventoryCache.invalidatePrefix(`vsms:inventory:`);
    await InventoryCache.invalidatePrefix(`vsms:items:`);
    await InventoryCache.invalidatePrefix(`vsms:products:`);
    await InventoryCache.invalidatePrefix(`vsms:vehicles:`);

    try {
      const { getIO } = await import('../../services/socketService.js');
      const io = getIO();
      if (io) {
        io.of('/partner').emit('stock:update', { productId, vehicleQty: vQty, posQty: pQty, onlineQty: oQty });
        io.emit('stock:update', { productId, vehicleQty: vQty, posQty: pQty, onlineQty: oQty });
      }
    } catch (sockErr) {
      // Non-blocking socket notification
    }

    return successResponse(res, 200, { onlineQty: oQty, posQty: pQty, vehicleQty: vQty }, 'Channel allocation saved');
  } catch (error) {
    logger.error('[PRODUCT] Channel allocation update failed', error);
    const msg = error.message || 'Failed to save channel allocation';
    if (msg.startsWith('VALIDATION:') || msg.startsWith('PRODUCT_NOT_FOUND:')) {
      return errorResponse(res, 400, msg.replace(/^[^:]+:/, ''));
    }
    return errorResponse(res, 500, msg);
  }
};

export const getInventoryDashboardStats = async (req, res) => {
  try {
    const warehouseId = req.user?.warehouseId;

    // Build query: if user has a warehouseId, include their warehouse products
    // ALSO include products with no warehouseId (e.g. finished goods from production)
    const where = warehouseId
      ? { OR: [{ warehouseId }, { warehouseId: null }] }
      : {};

    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        inventoryType: true,
        stock: true,
        price: true,
        mrp: true,
      }
    });

    let totalItems = products.length;
    let lowStockItems = 0;
    let outOfStockItems = 0;
    
    let totalValue = 0;
    let rawValue = 0;
    let readyValue = 0;
    let rawCount = 0;
    let readyCount = 0;

    products.forEach(p => {
      const qty = p.stock || 0;
      const val = (p.price || p.mrp || 0) * qty;
      
      totalValue += val;
      
      if (p.inventoryType === 'RAW') {
        rawValue += val;
        rawCount++;
      }
      if (p.inventoryType === 'READY') {
        readyValue += val;
        readyCount++;
      }

      if (qty === 0) outOfStockItems++;
      else if (qty > 0 && qty <= 10) lowStockItems++;
    });

    return successResponse(res, 200, {
      totalItems,
      lowStockItems,
      outOfStockItems,
      totalValue,
      rawValue,
      readyValue,
      rawCount,
      readyCount,
    }, 'Inventory dashboard stats fetched successfully');
  } catch (error) {
    logger.error('[PRODUCT] Failed to fetch inventory dashboard stats', error);
    return errorResponse(res, 500, 'Failed to fetch inventory dashboard stats');
  }
};

const updateProductLifecycle = async (req, res) => {
  try {
    const { productId } = req.params;
    const { isOnline, isPos, isVehicle } = req.body;

    // Verify product exists
    const product = await prisma.product.findFirst({
      where: { id: productId },
      select: { id: true, warehouseId: true, isActive: true, stock: true, price: true }
    });

    if (!product) {
      return errorResponse(res, 404, "Product not found");
    }

    const whId = product.warehouseId || req.user?.warehouseId || 'default_wh';

    // Sync POS channel flag to ChannelInventory (POS_STORE)
    if (isPos !== undefined) {
      const isPosBool = Boolean(isPos);
      const existingPos = await prisma.channelInventory.findFirst({
        where: { productId, channel: 'POS_STORE' }
      });
      if (existingPos) {
        await prisma.channelInventory.update({
          where: { id: existingPos.id },
          data: { isActive: isPosBool }
        });
      } else {
        await prisma.channelInventory.create({
          data: {
            id: crypto.randomUUID(),
            channel: 'POS_STORE',
            warehouseId: whId,
            productId,
            productVariantId: null,
            quantity: product.stock || 0,
            channelPrice: product.price || 0,
            taxRate: 5.0,
            isActive: isPosBool
          }
        });
      }

      // Also sync PosStoreStock table if present
      const existingPosStoreStock = await prisma.posStoreStock.findUnique({
        where: { productId }
      });
      if (existingPosStoreStock) {
        await prisma.posStoreStock.update({
          where: { productId },
          data: { isPosEnabled: isPosBool }
        });
      } else {
        await prisma.posStoreStock.create({
          data: {
            id: crypto.randomUUID(),
            productId,
            warehouseId: whId,
            isPosEnabled: isPosBool,
            posStock: 0,
            taxRate: 5.0
          }
        });
      }

      // Note: Do not forcefully overwrite product.isActive to true here,
      // channel inventory activation should respect product master isActive status.
    }

    // Sync Online channel flag to ChannelInventory (ONLINE_APP)
    if (isOnline !== undefined) {
      const isOnlineBool = Boolean(isOnline);
      const existingOnline = await prisma.channelInventory.findFirst({
        where: { productId, channel: 'ONLINE_APP' }
      });
      if (existingOnline) {
        await prisma.channelInventory.update({
          where: { id: existingOnline.id },
          data: { isActive: isOnlineBool }
        });
      } else {
        await prisma.channelInventory.create({
          data: {
            id: crypto.randomUUID(),
            channel: 'ONLINE_APP',
            warehouseId: whId,
            productId,
            productVariantId: null,
            quantity: 0,
            channelPrice: product.price || 0,
            isActive: isOnlineBool
          }
        });
      }
    }

    // Sync Vehicle channel flag to ChannelInventory (VEHICLE)
    if (isVehicle !== undefined) {
      const isVehicleBool = Boolean(isVehicle);
      const existingVehicle = await prisma.channelInventory.findFirst({
        where: { productId, channel: 'VEHICLE' }
      });
      if (existingVehicle) {
        await prisma.channelInventory.update({
          where: { id: existingVehicle.id },
          data: { isActive: isVehicleBool }
        });
      } else {
        await prisma.channelInventory.create({
          data: {
            id: crypto.randomUUID(),
            channel: 'VEHICLE',
            warehouseId: whId,
            productId,
            productVariantId: null,
            quantity: 0,
            channelPrice: product.price || 0,
            isActive: isVehicleBool
          }
        });
      }

      // Also sync LiveStockChannel record if exists
      try {
        await prisma.liveStockChannel.upsert({
          where: { productId },
          update: { isVehicle: isVehicleBool },
          create: {
            id: crypto.randomUUID(),
            productId,
            warehouseId: whId,
            isVehicle: isVehicleBool
          }
        });
      } catch (_lscErr) {}

      // Keep tags synchronized
      try {
        const prodRecord = await prisma.product.findUnique({ where: { id: productId }, select: { tags: true } });
        if (prodRecord && Array.isArray(prodRecord.tags)) {
          let updatedTags = [...prodRecord.tags];
          if (!isVehicleBool) {
            updatedTags = updatedTags.filter(t => t !== 'CH:VEHICLE');
          } else if (!updatedTags.includes('CH:VEHICLE')) {
            updatedTags.push('CH:VEHICLE');
          }
          await prisma.product.update({ where: { id: productId }, data: { tags: updatedTags } });
        }
      } catch (_tagErr) {}
    }

    // Invalidate VSMS cache so POS terminal and vehicle sees the change immediately
    try {
      await InventoryCache.invalidatePrefix(`vsms:inventory:items:store`);
      await InventoryCache.invalidatePrefix(`vsms:inventory:`);
      await InventoryCache.invalidatePrefix(`vsms:items:`);
      await InventoryCache.invalidatePrefix(`vsms:products:`);
      await InventoryCache.invalidatePrefix(`vsms:catalog:`);
    } catch (_cacheErr) {
      // Cache invalidation failure is non-fatal
    }

    return successResponse(res, 200, {}, "Lifecycle status updated successfully");
  } catch (error) {
    logger.error("[PRODUCT] Lifecycle update error", { error: error?.message, stack: error?.stack });
    return errorResponse(res, 500, error?.message || "Failed to update lifecycle status");
  }
};

const bulkReturnToReady = async (req, res) => {
  try {
    const { productIds, channel } = req.body;
    
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return errorResponse(res, 400, "Please provide an array of productIds");
    }
    
    if (!['ONLINE', 'POS', 'VEHICLE'].includes(channel)) {
      return errorResponse(res, 400, "Invalid channel");
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update inventoryType to 'READY' for all
      await tx.product.updateMany({
        where: { id: { in: productIds } },
        data: { inventoryType: 'READY' }
      });

      // 2. Update specific channel flags & stock in ChannelInventory
      if (channel === 'POS') {
        await tx.channelInventory.updateMany({
          where: {
            channel: 'POS_STORE',
            productId: { in: productIds }
          },
          data: { isActive: false, quantity: 0 }
        });
      } else if (channel === 'ONLINE') {
        await tx.channelInventory.updateMany({
          where: {
            channel: 'ONLINE_APP',
            productId: { in: productIds }
          },
          data: { isActive: false, quantity: 0 }
        });
      } else if (channel === 'VEHICLE') {
        try {
          await tx.vehicleStockAssignment.deleteMany({
            where: { productId: { in: productIds } }
          });
          await tx.channelInventory.updateMany({
            where: {
              channel: 'VEHICLE',
              productId: { in: productIds }
            },
            data: { isActive: false, quantity: 0 }
          });
        } catch (e) {}
      }
    });

    // Invalidate VSMS cache
    try {
      await InventoryCache.invalidatePrefix(`vsms:inventory:items:store`);
      await InventoryCache.invalidatePrefix(`vsms:inventory:`);
      await InventoryCache.invalidatePrefix(`vsms:items:`);
      await InventoryCache.invalidatePrefix(`vsms:products:`);
      await InventoryCache.invalidatePrefix(`vsms:catalog:`);
    } catch (e) {}

    return successResponse(res, 200, {}, `Successfully returned ${productIds.length} products to Ready Inventory`);
  } catch (error) {
    logger.error("[PRODUCT] Bulk Return to Ready error", error);
    return errorResponse(res, 500, error?.message || "Failed to bulk return products");
  }
};

const bulkUpdateOnlinePrices = async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return errorResponse(res, 400, "Updates array is required and must not be empty");
    }

    const defaultWhId = req.user?.warehouseId || 'default_wh';
    const updatedIds = [];

    for (const update of updates) {
      const { productId, onlinePrice, posPrice, vehiclePrice, sellingPrice, mrp, minOrderQty, maxOrderQty, barcode } = update;

      if (!productId) continue;

      const existingProd = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, warehouseId: true, price: true, finalPrice: true, mrp: true }
      });

      if (!existingProd) continue;

      const whId = existingProd.warehouseId || defaultWhId;
      const productData = {};

      // 1. Update valid Product master fields
      if (mrp !== undefined && !isNaN(mrp)) {
        productData.mrp = Number(mrp);
      }
      if (sellingPrice !== undefined && !isNaN(sellingPrice)) {
        productData.finalPrice = Number(sellingPrice);
        productData.price = Number(sellingPrice);
      }
      if (minOrderQty !== undefined && !isNaN(minOrderQty)) {
        productData.minOrderQty = parseInt(minOrderQty);
      }
      if (maxOrderQty !== undefined && !isNaN(maxOrderQty)) {
        productData.maxOrderQty = parseInt(maxOrderQty);
      }
      if (barcode !== undefined && barcode !== null) {
        productData.barcode = String(barcode);
      }

      if (Object.keys(productData).length > 0) {
        try {
          await prisma.product.update({
            where: { id: productId },
            data: productData,
          });
        } catch (err) {
          logger.warn(`[PRODUCT] Product update error for ${productId}:`, err.message);
        }
      }

      // 2. ChannelInventory for ONLINE_APP
      if (onlinePrice !== undefined || minOrderQty !== undefined || maxOrderQty !== undefined) {
        try {
          const channelUpdate = {};
          if (onlinePrice !== undefined && !isNaN(onlinePrice)) {
            channelUpdate.channelPrice = Number(onlinePrice);
          }
          if (minOrderQty !== undefined && !isNaN(minOrderQty)) {
            channelUpdate.minOrderQty = parseInt(minOrderQty);
          }
          if (maxOrderQty !== undefined && !isNaN(maxOrderQty)) {
            channelUpdate.maxOrderQty = parseInt(maxOrderQty);
          }

          const existingOnline = await prisma.channelInventory.findFirst({
            where: { productId, channel: 'ONLINE_APP' }
          });

          if (existingOnline) {
            await prisma.channelInventory.update({
              where: { id: existingOnline.id },
              data: channelUpdate
            });
          } else {
            await prisma.channelInventory.create({
              data: {
                id: crypto.randomUUID(),
                channel: 'ONLINE_APP',
                warehouseId: whId,
                productId,
                productVariantId: null,
                channelPrice: onlinePrice !== undefined ? Number(onlinePrice) : (productData.finalPrice || existingProd.finalPrice || existingProd.price || 0),
                minOrderQty: minOrderQty !== undefined ? parseInt(minOrderQty) : 1,
                maxOrderQty: maxOrderQty !== undefined ? parseInt(maxOrderQty) : 50,
                quantity: 0,
                isActive: true
              }
            });
          }
        } catch (err) {
          logger.warn(`[PRODUCT] ChannelInventory ONLINE_APP update error for ${productId}:`, err.message);
        }
      }

      // 3. ChannelInventory for POS_STORE (if posPrice is passed)
      if (posPrice !== undefined && !isNaN(posPrice)) {
        try {
          const existingPos = await prisma.channelInventory.findFirst({
            where: { productId, channel: 'POS_STORE' }
          });

          if (existingPos) {
            await prisma.channelInventory.update({
              where: { id: existingPos.id },
              data: { channelPrice: Number(posPrice) }
            });
          } else {
            await prisma.channelInventory.create({
              data: {
                id: crypto.randomUUID(),
                channel: 'POS_STORE',
                warehouseId: whId,
                productId,
                productVariantId: null,
                channelPrice: Number(posPrice),
                quantity: 0,
                isActive: true
              }
            });
          }
        } catch (err) {
          logger.warn(`[PRODUCT] ChannelInventory POS_STORE update error for ${productId}:`, err.message);
        }
      }

      // 4. ChannelInventory for VEHICLE (if vehiclePrice is passed)
      if (vehiclePrice !== undefined && !isNaN(vehiclePrice)) {
        try {
          const existingVeh = await prisma.channelInventory.findFirst({
            where: { productId, channel: 'VEHICLE' }
          });

          if (existingVeh) {
            await prisma.channelInventory.update({
              where: { id: existingVeh.id },
              data: { channelPrice: Number(vehiclePrice) }
            });
          } else {
            await prisma.channelInventory.create({
              data: {
                id: crypto.randomUUID(),
                channel: 'VEHICLE',
                warehouseId: whId,
                productId,
                productVariantId: null,
                channelPrice: Number(vehiclePrice),
                quantity: 0,
                isActive: true
              }
            });
          }
        } catch (err) {
          logger.warn(`[PRODUCT] ChannelInventory VEHICLE update error for ${productId}:`, err.message);
        }
      }

      updatedIds.push(productId);
    }

    return successResponse(res, 200, { updatedCount: updatedIds.length }, `Successfully updated ${updatedIds.length} products`);
  } catch (error) {
    logger.error("[PRODUCT] Bulk update online price error", error);
    return errorResponse(res, 500, error?.message || "Failed to update prices");
  }
};

/* ============================================================================
   RESET ALL PRODUCTS STOCK & THRESHOLD TO ZERO + UNDO BACKUP
============================================================================ */
// In-memory backup store keyed by warehouseId (or 'global')
const stockBackupStore = new Map();

const resetAllProductsStock = async (req, res) => {
  try {
    const partnerUserId = req.user?.id;
    let warehouseId = req.user?.warehouseId || null;

    if (!warehouseId && partnerUserId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: partnerUserId },
        select: { warehouseId: true }
      });
      warehouseId = dbUser?.warehouseId || null;
    }

    const where = warehouseId ? { warehouseId } : {};

    // 1. Fetch current stocks before resetting so Undo can restore them
    const existingProducts = await prisma.product.findMany({
      where,
      select: { id: true, stock: true, threshold: true }
    });

    if (existingProducts.length > 0) {
      const backupKey = warehouseId || 'global';
      stockBackupStore.set(backupKey, existingProducts.map(p => ({
        id: p.id,
        stock: p.stock,
        threshold: p.threshold
      })));
    }

    // 2. Perform the reset to 0
    const updated = await prisma.product.updateMany({
      where,
      data: {
        stock: 0,
        threshold: 0
      }
    });

    logger.info(`[PRODUCT] Reset stock & threshold to 0 for ${updated.count} products (warehouseId: ${warehouseId || 'ALL'})`);
    return successResponse(
      res,
      200,
      { updatedCount: updated.count, canUndo: existingProducts.length > 0 },
      `Successfully reset stock and threshold to 0 for ${updated.count} products`
    );
  } catch (error) {
    logger.error("[PRODUCT] Reset all products stock error", error);
    return errorResponse(res, 500, error?.message || "Failed to reset products stock");
  }
};

const undoResetProductsStock = async (req, res) => {
  try {
    const partnerUserId = req.user?.id;
    let warehouseId = req.user?.warehouseId || null;

    if (!warehouseId && partnerUserId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: partnerUserId },
        select: { warehouseId: true }
      });
      warehouseId = dbUser?.warehouseId || null;
    }

    const backupKey = warehouseId || 'global';
    const backup = stockBackupStore.get(backupKey);

    if (!backup || backup.length === 0) {
      return errorResponse(res, 400, "No previous stock backup found to restore.");
    }

    // Restore stock and threshold for each backed-up product
    let restoredCount = 0;
    for (const item of backup) {
      try {
        await prisma.product.update({
          where: { id: item.id },
          data: {
            stock: item.stock,
            threshold: item.threshold
          }
        });
        restoredCount++;
      } catch (err) {
        logger.warn(`[PRODUCT Undo] Could not restore product ${item.id}:`, err.message);
      }
    }

    // Clear backup after successful undo
    stockBackupStore.delete(backupKey);

    logger.info(`[PRODUCT] Restored stock & threshold for ${restoredCount} products (warehouseId: ${warehouseId || 'ALL'})`);
    return successResponse(
      res,
      200,
      { restoredCount },
      `Successfully restored previous stock levels for ${restoredCount} products`
    );
  } catch (error) {
    logger.error("[PRODUCT] Undo reset stock error", error);
    return errorResponse(res, 500, error?.message || "Failed to undo stock reset");
  }
};

const assignRandomProductsStock = async (req, res) => {
  try {
    const partnerUserId = req.user?.id;
    let warehouseId = req.user?.warehouseId || null;

    if (!warehouseId && partnerUserId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: partnerUserId },
        select: { warehouseId: true }
      });
      warehouseId = dbUser?.warehouseId || null;
    }

    const where = warehouseId ? { warehouseId } : {};

    const existingProducts = await prisma.product.findMany({
      where,
      select: { id: true, stock: true, threshold: true }
    });

    if (existingProducts.length === 0) {
      return errorResponse(res, 404, "No products found to assign random stock.");
    }

    // Save backup before assigning random stock
    const backupKey = warehouseId || 'global';
    stockBackupStore.set(backupKey, existingProducts.map(p => ({
      id: p.id,
      stock: p.stock,
      threshold: p.threshold
    })));

    // Assign random stock (e.g. between 10 and 150) and random threshold (e.g. between 5 and 20)
    let updatedCount = 0;
    for (const prod of existingProducts) {
      const randomStock = Math.floor(Math.random() * 141) + 10; // 10 - 150
      const randomThreshold = Math.floor(Math.random() * 16) + 5; // 5 - 20
      try {
        await prisma.product.update({
          where: { id: prod.id },
          data: {
            stock: randomStock,
            threshold: randomThreshold
          }
        });
        updatedCount++;
      } catch (err) {
        logger.warn(`[PRODUCT Random Stock] Failed for product ${prod.id}:`, err.message);
      }
    }

    logger.info(`[PRODUCT] Assigned random stock to ${updatedCount} products (warehouseId: ${warehouseId || 'ALL'})`);
    return successResponse(
      res,
      200,
      { updatedCount, canUndo: true },
      `Successfully assigned random stock (10-150) to ${updatedCount} products`
    );
  } catch (error) {
    logger.error("[PRODUCT] Assign random stock error", error);
    return errorResponse(res, 500, error?.message || "Failed to assign random stock");
  }
};

export {
  createProduct,
  getProductList,
  getProductByProductId,
  updateProduct,
  updateChannelAllocation,
  getPendingProducts,
  updateProductStatus,
  downloadProductTemplate,
  downloadProductUpdateTemplate,
  downloadProductZipTemplate,
  bulkUploadProducts,
  bulkUpdateProducts,
  bulkZipUploadProducts,
  softDeleteProduct,
  getAllBrands,
  getAllCategories,
  getAllSubCategories,
  toggleProductStatus,
  importMasterProductToWarehouse,
  getUnitsByUnitType,
  getUnitTypes,
  getMasterProducts,
  getMasterProductById,
  getActiveTaxes,
  syncFlashDeal,
  updateProductLifecycle,
  bulkReturnToReady,
  bulkUpdateOnlinePrices,
  resetAllProductsStock,
  undoResetProductsStock,
  assignRandomProductsStock
};

// Trigger nodemon restart
