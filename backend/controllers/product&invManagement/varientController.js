import { prisma } from "../../config/prismaClient.js";
import logger from "../../utils/logger.js";
import {
  errorResponse,
  successResponse,
  paginatedResponse
} from "../../utils/responseHelper.js";
import ExcelJS from "exceljs/dist/exceljs.min.js";
import { emitCanonicalEvent } from "../../audit/auditLogger.js";
import { CANONICAL_EVENTS } from "../../audit/auditConstants.js";
import { exportToExcel } from "../../utils/exportToExcel.js";
import { exportColumns } from "../../utils/exportColumns.js";
import {
  productHeaderMap,
  normalizeExcelRow,
} from "../../utils/normalizeExcelRow.js";
import XLSX from "xlsx";
import fs from "fs";
import path from "path";

const BULK_BATCH_SIZE = 200;

import csvParser from 'csv-parser'
import { Readable } from 'stream'

function parseBulkFile(filePathOrBuffer, originalname = '', mimetype = '') {
  const buf = Buffer.isBuffer(filePathOrBuffer)
    ? filePathOrBuffer
    : fs.readFileSync(filePathOrBuffer)

  const fileName = String(originalname || '').toLowerCase().trim()
  const mimeType = String(mimetype || '').toLowerCase().trim()

  const isCsv =
    fileName.endsWith('.csv') ||
    mimeType.includes('csv') ||
    mimeType.includes('text/plain')

  const isExcel =
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls') ||
    mimeType.includes('spreadsheetml') ||
    mimeType.includes('application/vnd.ms-excel') ||
    mimeType.includes('excel') ||
    // ✅ XLSX files are zip files and start with PK
    buf.subarray(0, 2).toString() === 'PK'

  if (!isCsv && !isExcel) {
    throw new Error('Invalid file type. Only xlsx, xls, and csv files are allowed')
  }

  const workbook = XLSX.read(buf, {
    type: 'buffer',
    raw: false
  })

  let sheet

  if (isExcel) {
    sheet =
      workbook.Sheets['ProductVariants'] ||
      workbook.Sheets['productvariants'] ||
      workbook.Sheets[workbook.SheetNames.find(
        name => String(name).trim().toLowerCase() === 'productvariants'
      )]

    if (!sheet) {
      throw new Error('ProductVariants sheet not found in uploaded Excel')
    }
  }

  if (isCsv) {
    sheet = workbook.Sheets[workbook.SheetNames[0]]
  }

  if (!sheet) {
    return []
  }

  return XLSX.utils.sheet_to_json(sheet, {
    defval: '',
    raw: false
  })
}

/**
 * ======================================================
 * CREATE PRODUCT VARIANT
 * ======================================================
 */
export const createProductVariant = async (req, res) => {
  try {
    logger.info("[VARIANT] Create request received", req.body);

    const {
      productId,
      sku,
      gtin,
      barcodeImage,
      variantName,
      unit,
      unitType,
      measurement,
      status,
      primaryImages,
      secondaryImages,
      metaTitle,
      metaKeywords,
      metaDescription,
      schemaMarkup,

      mrp,
      sellingPrice,
      landingPrice,
      discountType,
      discountValue,
      stockQuantity,
      minOrderQty,
      maxOrderQty,
      lowStockThreshold,
      isEnabled
    } = req.body;
    console.log("mrp :",mrp);
    
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, warehouseId: true, categoryId: true, name: true }
    });

    if (!product) {
      logger.warn("[VARIANT] Product not found", { productId });
      return errorResponse(res, 404, "Product not found");
    }

    // ✅ Check for duplicate SKU (per product, which inherits warehouse uniqueness)
    if (sku) {
      const existingSku = await prisma.productVariant.findFirst({
        where: {
          productId,
          sku
        }
      });
      if (existingSku) {
        logger.warn("[VARIANT] SKU already exists for this product", { productId, sku });
        return errorResponse(
          res,
          409,
          `SKU '${sku}' already exists for this product in warehouse ${product.warehouseId}`
        );
      }
    }

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        sku,
        gtin,
        barcodeImage,
        variantName,
        unit,
        unitType,
        measurement,
        status,
        primaryImages,
        secondaryImages,
        metaTitle,
        metaKeywords,
        metaDescription,
        schemaMarkup,

        mrp,
        sellingPrice,
        landingPrice,
        discountType,
        discountValue,
        stockQuantity,
        minOrderQty,
        maxOrderQty,
        lowStockThreshold,
        isEnabled
      }
    });

    logger.info("[VARIANT] Created successfully", {
      variantId: variant.id,
      productId
    });
    await emitCanonicalEvent({
      eventName: CANONICAL_EVENTS.productUpdated,
      eventId: `PRODUCT_UPDATED:${productId}:VARIANT_CREATE:${variant.id}`,
      entityType: "PRODUCT",
      entityId: productId,
      action: "VARIANT_CREATED",
      afterJson: variant,
      payload: {
        actorId: req.user?.id,
        actorRole: req.user?.role,
        variantId: variant.id
      }
    });

    return successResponse(res, 201, variant, "Product variant created successfully");

  } catch (err) {
    logger.error("[VARIANT] Create failed", err);
    return errorResponse(res, 500, err.message || "Variant creation failed");
  }
};


/**
 * ======================================================
 * GET ALL VARIANTS BY PRODUCT ID
 * ======================================================
 */
export const getVariantsByProductId = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    logger.info("[VARIANT] Fetching by productId", { productId });

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.productVariant.findMany({
        where: { productId },
        orderBy: { createdAt: "desc" },
        skip: Number(skip),
        take: Number(limit)
      }),
      prisma.productVariant.count({ where: { productId } })
    ]);

    logger.info("[VARIANT] List fetched", { count: data.length });

    return paginatedResponse(res, 200, data, total, page, limit);

  } catch (err) {
    logger.error("[VARIANT] Fetch by productId failed", err);
    return errorResponse(res, 500, "Failed to fetch variants");
  }
};


/**
 * ======================================================
 * GET VARIANT BY ID
 * ======================================================
 */
export const getVariantById = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info("[VARIANT] Fetching by id", { id });

    const variant = await prisma.productVariant.findUnique({
  where: { id },
  include: {
    product: {
      select: {
        id: true,
        name: true,
        warehouse: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } }
      }
    },
    inventory: true
  }
});

    if (!variant) {
      logger.warn("[VARIANT] Not found", { id });
      return errorResponse(res, 404, "Variant not found");
    }

    return successResponse(res, 200, variant, "Variant fetched successfully");

  } catch (err) {
    logger.error("[VARIANT] Fetch by id failed", err);
    return errorResponse(res, 500, "Failed to fetch variant");
  }
};





/**
 * ======================================================
 * UPDATE VARIANT
 * ======================================================
 */
export const updateProductVariant = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info("[VARIANT] Update request received", { id, body: req.body });

    const existing = await prisma.productVariant.findUnique({
      where: { id }
    });

    if (!existing) {
      logger.warn("[VARIANT] Update failed - not found", { id });
      return errorResponse(res, 404, "Variant not found");
    }

    // ✅ Check for duplicate SKU (per product, only if SKU is being changed)
    if (req.body.sku && req.body.sku !== existing.sku) {
      const existingSku = await prisma.productVariant.findFirst({
        where: {
          productId: existing.productId,
          sku: req.body.sku,
          NOT: {
            id: id  // Exclude current variant from check
          }
        }
      });
      if (existingSku) {
        logger.warn("[VARIANT] SKU already exists for this product", { 
          variantId: id, 
          sku: req.body.sku 
        });
        return errorResponse(
          res,
          409,
          `SKU '${req.body.sku}' already exists for this product`
        );
      }
    }

    const updated = await prisma.productVariant.update({
      where: { id },
      data: {
        ...req.body,
        productId: undefined,
        warehouseId: undefined,
        categoryId: undefined,
        createdAt: undefined
      }
    });

    logger.info("[VARIANT] Updated successfully", { id });
    await emitCanonicalEvent({
      eventName: CANONICAL_EVENTS.productUpdated,
      eventId: `PRODUCT_UPDATED:${existing.productId}:VARIANT_UPDATE:${id}`,
      entityType: "PRODUCT",
      entityId: existing.productId,
      action: "VARIANT_UPDATED",
      beforeJson: existing,
      afterJson: updated,
      payload: {
        actorId: req.user?.id,
        actorRole: req.user?.role,
        variantId: id
      }
    });

    return successResponse(res, 200, updated, "Variant updated successfully");

  } catch (err) {
    logger.error("[VARIANT] Update failed", err);
    return errorResponse(res, 500, "Variant update failed");
  }
};


/**
 * ======================================================
 * DELETE VARIANT (SOFT DISABLE)
 * ======================================================
 */
export const disableVariant = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info("[VARIANT] Disable request", { id });

    const variant = await prisma.productVariant.update({
      where: { id },
      data: { isEnabled: false }
    });
    await emitCanonicalEvent({
      eventName: CANONICAL_EVENTS.productUpdated,
      eventId: `PRODUCT_UPDATED:${variant.productId}:VARIANT_DISABLE:${id}`,
      entityType: "PRODUCT",
      entityId: variant.productId,
      action: "VARIANT_DISABLED",
      afterJson: variant,
      payload: {
        actorId: req.user?.id,
        actorRole: req.user?.role,
        variantId: id
      }
    });

    return successResponse(res, 200, variant, "Variant disabled successfully");

  } catch (err) {
    logger.error("[VARIANT] Disable failed", err);
    return errorResponse(res, 500, "Failed to disable variant");
  }
};


/* =====================================================
HELPERS FOR VARIANT BULK
===================================================== */

const getColumnLetter = (colIndex) => {
  let letter = ''
  let temp = colIndex

  while (temp > 0) {
    const remainder = (temp - 1) % 26
    letter = String.fromCharCode(65 + remainder) + letter
    temp = Math.floor((temp - 1) / 26)
  }

  return letter
}

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

  if (['true', '1', 'yes', 'y'].includes(normalizedValue)) return true
  if (['false', '0', 'no', 'n'].includes(normalizedValue)) return false

  return null
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

const normalizeVariantStatus = (value) => {
  const normalizedValue = normalizeText(value).toUpperCase()

  if (!normalizedValue) return null
  if (normalizedValue === 'ACTIVE') return 'ACTIVE'
  if (normalizedValue === 'INACTIVE') return 'INACTIVE'
  if (normalizedValue === 'OUT_OF_STOCK') return 'OUT_OF_STOCK'

  return 'INVALID'
}

const calculateVariantFinalPrice = ({ mrp, discountType, discountValue }) => {
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

const loadVariantBulkReferences = async (warehouseId, filters = {}) => {
  const {
    productId,
    categoryId,
    subCategoryId,
    brandId
  } = filters

  const productWhere = {
    warehouseId,
    isActive: true
  }

  if (productId) {
    productWhere.id = productId
  }

  if (categoryId) {
    productWhere.categoryId = categoryId
  }

  if (subCategoryId) {
    productWhere.subCategoryId = subCategoryId
  }

  if (brandId) {
    productWhere.brandId = brandId
  }

  const [products, unitTypes, units] = await Promise.all([
    prisma.product.findMany({
      where: productWhere,
      select: {
        id: true,
        name: true,
        sku: true,
        categoryId: true,
        subCategoryId: true,
        brandId: true,
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
      },
      orderBy: {
        name: 'asc'
      }
    }),

    prisma.unitType.findMany({
      where: {
        status: 'ACTIVE'
      },
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
        unitTypeId: true,
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
    })
  ])

  return {
    products,
    unitTypes,
    units
  }
}

/* =====================================================
1. DOWNLOAD PRODUCT VARIANT BULK UPLOAD TEMPLATE
GET /api/v1/product-variants/bulk-template
===================================================== */

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
    logger.warn("getWarehouseFromUser query failed in varientController", err);
  }

  // Return a dummy UUID to prevent leaking other warehouses' data
  return "00000000-0000-0000-0000-000000000000";
};

export const downloadProductVariantTemplate = async (req, res) => {
  try {
    logger.info('[PRODUCT_VARIANT] Bulk template download started')

    const userId = req.user.id
    const warehouseId = await getWarehouseFromUser(userId, prisma)

    const {
      products,
      unitTypes,
      units
    } = await loadVariantBulkReferences(warehouseId)

    logger.info('[PRODUCT_VARIANT] Template reference data fetched', {
      warehouseId,
      products: products.length,
      unitTypes: unitTypes.length,
      units: units.length
    })

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'VillagKart Partner'
    workbook.created = new Date()

    const maxDataRows = 1000

    const productHeaders = [
      'product',
      'variantName',
      'unitType',
      'unit',
      'measurement',
      'landingPrice',
      'mrp',
      'discountType',
      'discountValue',
      'finalPrice',
      'stock',
      'threshold',
      'minOrderQty',
      'maxOrderQty',
      'sku',
      'gtin',
      'barcodeImage',
      'primaryImages',
      'secondaryImages',
      'metaTitle',
      'metaKeywords',
      'schemaMarkup',
      'metaDescription',
      'status',
      'isEnabled'
    ]

    const requiredColumnIndices = [
      1, // product
      2, // variantName
      3, // unitType
      4, // unit
      5, // measurement
      6, // landingPrice
      7, // mrp
      8, // discountType
      11 // stock
    ]

    const sheet = workbook.addWorksheet('ProductVariants', {
      views: [{ state: 'frozen', ySplit: 1 }]
    })

    sheet.addRow(productHeaders)

    const unitTypeSafeNameMap = buildSafeNameMap(unitTypes, '_units')

    const unitTypeSafeNameColIndex = productHeaders.length + 1
    const unitTypeSafeNameColLetter = getColumnLetter(unitTypeSafeNameColIndex)

    sheet.getCell(`${unitTypeSafeNameColLetter}1`).value = 'unitTypeSafeName'
    sheet.getColumn(unitTypeSafeNameColIndex).hidden = true

    const exampleRows = [
      [
        products[0]?.name || 'Sample Product',
        '2 Pieces',
        'Piece',
        'Piece',
        '2',
        50,
        90,
        'PERCENTAGE',
        0,
        '',
        451,
        15,
        1,
        10,
        'KITKAT-2PCS',
        '',
        '',
        'image1.jpg',
        'image2.jpg',
        '',
        '',
        '',
        '',
        'ACTIVE',
        'TRUE'
      ],
      [
        products[0]?.name || 'Sample Product',
        '500 GM',
        'Weight',
        'Gram',
        '500',
        100,
        120,
        'RUPEES',
        10,
        '',
        100,
        10,
        1,
        5,
        'SAMPLE-500GM',
        '',
        '',
        'image1.jpg',
        '',
        '',
        '',
        '',
        '',
        'ACTIVE',
        'TRUE'
      ]
    ]

    exampleRows.forEach((row) => sheet.addRow(row))

    /*
      F = landingPrice
      G = mrp
      H = discountType
      I = discountValue
      J = finalPrice

      Formula only for example rows to avoid formula-only rows during upload.
    */
    const exampleStartRow = 2
    const exampleEndRow = exampleRows.length + 1

    for (let row = exampleStartRow; row <= exampleEndRow; row++) {
      sheet.getCell(`J${row}`).value = {
        formula: `IF(OR(G${row}="",G${row}=0),"",IF(H${row}="PERCENTAGE",ROUND(G${row}-(G${row}*I${row}/100),2),IF(H${row}="RUPEES",ROUND(G${row}-I${row},2),G${row})))`
      }
    }

    for (let row = 2; row <= maxDataRows; row++) {
      sheet.getCell(`${unitTypeSafeNameColLetter}${row}`).value = {
        formula: `IFERROR(VLOOKUP(C${row},UnitTypeSafeNames!$A$2:$B$${Math.max(unitTypes.length + 1, 2)},2,FALSE),"")`
      }
    }

    const applyListValidation = (colIndex, formulaOrValues) => {
      const colLetter = getColumnLetter(colIndex)

      for (let row = 2; row <= maxDataRows; row++) {
        sheet.getCell(`${colLetter}${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: Array.isArray(formulaOrValues)
            ? [`"${formulaOrValues.join(',')}"`]
            : [formulaOrValues],
          showErrorMessage: true,
          errorTitle: 'Invalid value',
          error: 'Select a valid value from dropdown.'
        }
      }
    }

    const lastProduct = products.length > 0 ? Math.min(products.length + 1, 500) : 2
    const lastUnitType = unitTypes.length > 0 ? Math.min(unitTypes.length + 1, 500) : 2

    if (products.length > 0) {
      applyListValidation(1, `Products!$B$2:$B$${lastProduct}`)
    }

    if (unitTypes.length > 0) {
      applyListValidation(3, `UnitTypes!$B$2:$B$${lastUnitType}`)
    }

    applyListValidation(8, ['PERCENTAGE', 'RUPEES'])
    applyListValidation(24, ['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK'])
    applyListValidation(25, ['TRUE', 'FALSE'])

    for (let row = 2; row <= maxDataRows; row++) {
      sheet.getCell(`D${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`INDIRECT(${unitTypeSafeNameColLetter}${row})`],
        showErrorMessage: true,
        errorTitle: 'Invalid unit',
        error: 'Select unitType first, then choose unit.'
      }
    }

    sheet.columns.forEach((col, index) => {
      col.width = 22

      const colIndex = index + 1
      const letter = getColumnLetter(colIndex)
      const isRequired = requiredColumnIndices.includes(colIndex)
      const headerCell = sheet.getCell(`${letter}1`)

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

    sheet.eachRow((row, rowNumber) => {
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

    const productsSheet = workbook.addWorksheet('Products')
    productsSheet.addRow(['id', 'name', 'category', 'subCategory', 'brand'])

    products.forEach((product) => {
      productsSheet.addRow([
        product.id,
        product.name,
        product.category?.name || '',
        product.subCategory?.name || '',
        product.brand?.name || ''
      ])
    })

    productsSheet.getRow(1).font = { bold: true }
    productsSheet.columns = [
      { width: 38 },
      { width: 35 },
      { width: 25 },
      { width: 25 },
      { width: 25 }
    ]

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

    unitTypeSafeNamesSheet.state = 'hidden'
    unitTypeSafeNamesSheet.getRow(1).font = { bold: true }
    unitTypeSafeNamesSheet.columns = [{ width: 35 }, { width: 35 }]

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
      unitsByTypeSheet.addRow(
        unitTypes.map((unitType) => {
          const list = unitTypeToUnits.get(unitType.name) || []
          return list[rowIndex] || ''
        })
      )
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

    const buffer = await workbook.xlsx.writeBuffer()

    logger.info('[PRODUCT_VARIANT] Bulk template generated successfully', {
      warehouseId,
      size: buffer.byteLength
    })

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="product-variant-bulk-template.xlsx"'
    )

    res.setHeader('Content-Length', buffer.byteLength)
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')

    return res.send(Buffer.from(buffer))
  } catch (error) {
    logger.error('[PRODUCT_VARIANT] Bulk template error', {
      message: error.message,
      stack: error.stack
    })

    if (!res.headersSent) {
      return errorResponse(res, 500, error.message)
    }
  }
}

/* =====================================================
2. DOWNLOAD PRODUCT VARIANT BULK UPDATE TEMPLATE
GET /api/v1/product-variants/bulk-update-template
Filters:
?productId=
?categoryId=
?subCategoryId=
?brandId=
===================================================== */

export const downloadProductVariantUpdateTemplate = async (req, res) => {
  try {
    logger.info('[PRODUCT_VARIANT] Bulk update template download started')

    const userId = req.user.id
    const warehouseId = await getWarehouseFromUser(userId, prisma)

    const {
      productId,
      categoryId,
      subCategoryId,
      brandId
    } = req.query

    /* -------------------------------------------------------
       1️⃣ Load unit types and units from existing helper
       We will NOT depend on helper products because it may filter isActive true
    ------------------------------------------------------- */

    const referenceData = await loadVariantBulkReferences(warehouseId, {
      productId,
      categoryId,
      subCategoryId,
      brandId
    })

    const unitTypes = referenceData.unitTypes || []
    const units = referenceData.units || []

    /* -------------------------------------------------------
       2️⃣ Fetch products manually
       ✅ Active + inactive products both allowed
       ❌ No isActive filter
    ------------------------------------------------------- */

    const productWhere = {
      warehouseId
    }

    if (productId) {
      productWhere.id = productId
    }

    if (categoryId) {
      productWhere.categoryId = categoryId
    }

    if (subCategoryId) {
      productWhere.subCategoryId = subCategoryId
    }

    if (brandId) {
      productWhere.brandId = brandId
    }

    const products = await prisma.product.findMany({
      where: productWhere,
      select: {
        id: true,
        name: true,
        sku: true,
        categoryId: true,
        subCategoryId: true,
        brandId: true,
        isActive: true,
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
      },
      orderBy: {
        name: 'asc'
      }
    })

    logger.info('[PRODUCT_VARIANT] Products fetched for template', {
      warehouseId,
      products: products.length,
      filters: {
        productId,
        categoryId,
        subCategoryId,
        brandId
      }
    })

    if (productId && products.length === 0) {
      return errorResponse(
        res,
        404,
        'Product not found for this warehouse'
      )
    }

    const allowedProductIds = products.map((product) => product.id)

    /* -------------------------------------------------------
       3️⃣ Fetch variants
       ✅ Product can be active or inactive
       ✅ Only warehouse restriction remains
    ------------------------------------------------------- */

    const variantWhere = {
      product: {
        warehouseId
      }
    }

    if (productId) {
      variantWhere.productId = productId
    } else if (allowedProductIds.length > 0) {
      variantWhere.productId = {
        in: allowedProductIds
      }
    }

    const variants = await prisma.productVariant.findMany({
      where: variantWhere,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            isActive: true,
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
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    logger.info('[PRODUCT_VARIANT] Update template reference data fetched', {
      warehouseId,
      products: products.length,
      variants: variants.length,
      unitTypes: unitTypes.length,
      units: units.length,
      filters: {
        productId,
        categoryId,
        subCategoryId,
        brandId
      }
    })

    if (!variants || variants.length === 0) {
      return errorResponse(
        res,
        404,
        'No product variants found for the selected filters.'
      )
    }

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'VillagKart Partner'
    workbook.created = new Date()

    const unitTypeSafeNameMap = buildSafeNameMap(unitTypes, '_units')

    const headers = [
      'id',
      'product',
      'variantName',
      'unitType',
      'unit',
      'measurement',
      'landingPrice',
      'mrp',
      'discountType',
      'discountValue',
      'finalPrice',
      'stock',
      'threshold',
      'minOrderQty',
      'maxOrderQty',
      'sku',
      'gtin',
      'barcodeImage',
      'primaryImages',
      'secondaryImages',
      'metaTitle',
      'metaKeywords',
      'schemaMarkup',
      'metaDescription',
      'status',
      'isEnabled'
    ]

    const requiredColumnIndices = [
      1, // id
      2, // product
      3, // variantName
      4, // unitType
      5, // unit
      6, // measurement
      7, // landingPrice
      8, // mrp
      9, // discountType
      12 // stock
    ]

    const sheet = workbook.addWorksheet('ProductVariants', {
      views: [{ state: 'frozen', ySplit: 1 }]
    })

    sheet.addRow(headers)

    const unitTypeSafeNameColIndex = headers.length + 1
    const unitTypeSafeNameColLetter = getColumnLetter(unitTypeSafeNameColIndex)

    sheet.getCell(`${unitTypeSafeNameColLetter}1`).value = 'unitTypeSafeName'
    sheet.getColumn(unitTypeSafeNameColIndex).hidden = true

    variants.forEach((variant) => {
      const calculatedFinalPrice = calculateVariantFinalPrice({
        mrp: variant.mrp,
        discountType: variant.discountType,
        discountValue: variant.discountValue
      })

      sheet.addRow([
        variant.id,
        variant.product?.name || '',
        variant.variantName || '',
        variant.unitType || '',
        variant.unit || '',
        variant.measurement || '',
        variant.landingPrice ?? '',
        variant.mrp ?? '',
        variant.discountType || '',
        variant.discountValue ?? '',
        calculatedFinalPrice,
        variant.stockQuantity ?? '',
        variant.lowStockThreshold ?? '',
        variant.minOrderQty ?? '',
        variant.maxOrderQty ?? '',
        variant.sku || '',
        variant.gtin || '',
        variant.barcodeImage || '',
        variant.primaryImages?.join(',') || '',
        variant.secondaryImages?.join(',') || '',
        variant.metaTitle || '',
        variant.metaKeywords || '',
        variant.schemaMarkup || '',
        variant.metaDescription || '',
        variant.status || 'ACTIVE',
        variant.isEnabled ? 'TRUE' : 'FALSE'
      ])
    })

    const lastVariantRow = variants.length + 1
    const maxDataRows = Math.max(lastVariantRow, 2)

    /*
      G = landingPrice
      H = mrp
      I = discountType
      J = discountValue
      K = finalPrice
    */
    for (let row = 2; row <= maxDataRows; row++) {
      sheet.getCell(`K${row}`).value = {
        formula: `IF(OR(H${row}="",H${row}=0),"",IF(I${row}="PERCENTAGE",ROUND(H${row}-(H${row}*J${row}/100),2),IF(I${row}="RUPEES",ROUND(H${row}-J${row},2),H${row})))`
      }

      sheet.getCell(`${unitTypeSafeNameColLetter}${row}`).value = {
        formula: `IFERROR(VLOOKUP(D${row},UnitTypeSafeNames!$A$2:$B$${Math.max(unitTypes.length + 1, 2)},2,FALSE),"")`
      }
    }

    const applyListValidation = (colIndex, formulaOrValues) => {
      const colLetter = getColumnLetter(colIndex)

      for (let row = 2; row <= maxDataRows; row++) {
        sheet.getCell(`${colLetter}${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: Array.isArray(formulaOrValues)
            ? [`"${formulaOrValues.join(',')}"`]
            : [formulaOrValues],
          showErrorMessage: true,
          errorTitle: 'Invalid value',
          error: 'Select a valid value from dropdown.'
        }
      }
    }

    const lastProduct = products.length > 0 ? Math.min(products.length + 1, 500) : 2
    const lastUnitType = unitTypes.length > 0 ? Math.min(unitTypes.length + 1, 500) : 2

    if (products.length > 0) {
      applyListValidation(2, `Products!$B$2:$B$${lastProduct}`)
    }

    if (unitTypes.length > 0) {
      applyListValidation(4, `UnitTypes!$B$2:$B$${lastUnitType}`)
    }

    applyListValidation(9, ['PERCENTAGE', 'RUPEES'])
    applyListValidation(25, ['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK'])
    applyListValidation(26, ['TRUE', 'FALSE'])

    for (let row = 2; row <= maxDataRows; row++) {
      sheet.getCell(`E${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`INDIRECT(${unitTypeSafeNameColLetter}${row})`],
        showErrorMessage: true,
        errorTitle: 'Invalid unit',
        error: 'Select unitType first, then choose unit.'
      }
    }

    sheet.columns.forEach((col, index) => {
      col.width = 22

      const colIndex = index + 1
      const letter = getColumnLetter(colIndex)
      const isRequired = requiredColumnIndices.includes(colIndex)
      const headerCell = sheet.getCell(`${letter}1`)

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

    sheet.eachRow((row, rowNumber) => {
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

    /* -------------------------------------------------------
       Products reference sheet
       ✅ Includes active and inactive products
    ------------------------------------------------------- */

    const productsSheet = workbook.addWorksheet('Products')
    productsSheet.addRow(['id', 'name', 'category', 'subCategory', 'brand', 'isActive'])

    products.forEach((product) => {
      productsSheet.addRow([
        product.id,
        product.name,
        product.category?.name || '',
        product.subCategory?.name || '',
        product.brand?.name || '',
        product.isActive ? 'TRUE' : 'FALSE'
      ])
    })

    productsSheet.getRow(1).font = { bold: true }
    productsSheet.columns = [
      { width: 38 },
      { width: 35 },
      { width: 25 },
      { width: 25 },
      { width: 25 },
      { width: 15 }
    ]

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

    unitTypeSafeNamesSheet.state = 'hidden'
    unitTypeSafeNamesSheet.getRow(1).font = { bold: true }
    unitTypeSafeNamesSheet.columns = [{ width: 35 }, { width: 35 }]

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
      unitsByTypeSheet.addRow(
        unitTypes.map((unitType) => {
          const list = unitTypeToUnits.get(unitType.name) || []
          return list[rowIndex] || ''
        })
      )
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

    const buffer = await workbook.xlsx.writeBuffer()

    logger.info('[PRODUCT_VARIANT] Bulk update template generated successfully', {
      warehouseId,
      products: products.length,
      variants: variants.length,
      size: buffer.byteLength
    })

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="product-variant-update-template.xlsx"'
    )

    res.setHeader('Content-Length', buffer.byteLength)
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')

    return res.send(Buffer.from(buffer))
  } catch (error) {
    logger.error('[PRODUCT_VARIANT] Bulk update template error', {
      message: error.message,
      stack: error.stack
    })

    if (!res.headersSent) {
      return errorResponse(res, 500, error.message)
    }
  }
}

/* =====================================================
3. BULK UPLOAD PRODUCT VARIANTS
POST /api/v1/product-variants/bulk-upload
===================================================== */

export const bulkUploadProductVariants = async (req, res) => {
  try {
    logger.info('[PRODUCT_VARIANT] Bulk upload started')

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

    const rawRows = parseBulkFile(fileData, originalname)

    const rows = rawRows
      .map((row, index) => ({
        ...row,
        __rowNum: index + 2
      }))
      .filter((row) => {
        const meaningfulValues = [
          row.product,
          row.variantName,
          row.unitType,
          row.unit,
          row.measurement,
          row.landingPrice,
          row.mrp,
          row.discountType,
          row.discountValue,
          row.stock,
          row.sku
        ]

        return meaningfulValues.some((value) => {
          return value !== undefined &&
            value !== null &&
            normalizeText(value) !== ''
        })
      })

    if (!rows || rows.length === 0) {
      return errorResponse(res, 400, 'No valid variant rows found')
    }

    const {
      products,
      unitTypes,
      units
    } = await loadVariantBulkReferences(warehouseId)

    const productMap = new Map(
      products.map((product) => [normalizeKey(product.name), product])
    )

    const unitTypeMap = new Map(
      unitTypes.map((unitType) => [normalizeKey(unitType.name), unitType])
    )

    const unitMap = new Map(
      units.map((unit) => [normalizeKey(unit.name), unit])
    )

    const results = {
      success: [],
      errors: []
    }

    logger.info('[PRODUCT_VARIANT] Bulk upload file parsed', {
      warehouseId,
      rawRows: rawRows.length,
      validRows: rows.length
    })

    for (const row of rows) {
      const rowNum = row.__rowNum
      const rowErrors = []

      try {
        const productName = normalizeText(row.product)
        const variantName = normalizeText(row.variantName)
        const unitTypeName = normalizeText(row.unitType)
        const unitName = normalizeText(row.unit)
        const measurement = normalizeText(row.measurement)

        const landingPrice = parseNumberValue(row.landingPrice)
        const mrp = parseNumberValue(row.mrp)
        const discountType = normalizeDiscountType(row.discountType)
        const discountValue = parseNumberValue(row.discountValue)
        const stock = parseIntegerValue(row.stock)
        const threshold = parseIntegerValue(row.threshold)
        const minOrderQty = parseIntegerValue(row.minOrderQty)
        const maxOrderQty = parseIntegerValue(row.maxOrderQty)
        const status = normalizeVariantStatus(row.status) || 'ACTIVE'
        const isEnabled = parseBoolSafe(row.isEnabled, true)

        const sku = normalizeText(row.sku)
        const gtin = normalizeText(row.gtin)
        const barcodeImage = normalizeText(row.barcodeImage)

        if (!productName) {
          rowErrors.push('Product is required')
        }

        if (!variantName) {
          rowErrors.push('Variant name is required')
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

        if (landingPrice === null) {
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

        if (status === 'INVALID') {
          rowErrors.push('Invalid status. Allowed values: ACTIVE, INACTIVE, OUT_OF_STOCK')
        }

        if (isEnabled === null) {
          rowErrors.push('isEnabled must be TRUE or FALSE')
        }

        const product = productMap.get(normalizeKey(productName))

        if (productName && !product) {
          rowErrors.push(`Invalid product: ${productName}`)
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

        if (landingPrice !== null && landingPrice < 0) {
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

        if (rowErrors.length) {
          results.errors.push({
            row: rowNum,
            variantName,
            error: rowErrors.join(', ')
          })

          continue
        }

        if (sku) {
          const existingSku = await prisma.productVariant.findUnique({
            where: {
              productId_sku: {
                productId: product.id,
                sku
              }
            },
            select: {
              id: true
            }
          })

          if (existingSku) {
            results.errors.push({
              row: rowNum,
              variantName,
              error: `SKU '${sku}' already exists for product '${productName}'`
            })

            continue
          }
        }

        const variant = await prisma.productVariant.create({
          data: {
            product: {
              connect: {
                id: product.id
              }
            },

            variantName,
            unitType: unitTypeName,
            unit: unitName,
            measurement,

            landingPrice,
            sellingPrice: calculateVariantFinalPrice({
              mrp,
              discountType,
              discountValue
            }),
            mrp,
            discountType,
            discountValue: discountValue || 0,

            stockQuantity: stock,
            lowStockThreshold: threshold ?? 5,
            minOrderQty: minOrderQty ?? 1,
            maxOrderQty: maxOrderQty ?? null,

            sku: sku || null,
            gtin: gtin || null,
            barcodeImage: barcodeImage || null,

            primaryImages: parseArrayValue(row.primaryImages),
            secondaryImages: parseArrayValue(row.secondaryImages),

            metaTitle: normalizeText(row.metaTitle) || null,
            metaKeywords: normalizeText(row.metaKeywords) || null,
            schemaMarkup: normalizeText(row.schemaMarkup) || null,
            metaDescription: normalizeText(row.metaDescription) || null,

            status,
            isEnabled
          }
        })

        results.success.push({
          id: variant.id,
          productId: product.id,
          product: product.name,
          variantName: variant.variantName
        })
      } catch (error) {
        results.errors.push({
          row: rowNum,
          error: error.message
        })
      }
    }

    logger.info('[PRODUCT_VARIANT] Bulk upload completed', {
      warehouseId,
      totalRecords: rows.length,
      successCount: results.success.length,
      failedCount: results.errors.length
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
    logger.error('[PRODUCT_VARIANT] Bulk upload failed', {
      message: error.message,
      stack: error.stack
    })

    return errorResponse(res, 500, error.message)
  }
}

/* =====================================================
4. BULK UPDATE PRODUCT VARIANTS
POST /api/v1/product-variants/bulk-update
===================================================== */

export const bulkUpdateProductVariants = async (req, res) => {
  try {
    logger.info('[PRODUCT_VARIANT] Bulk update started')

    const userId = req.user.id
    const warehouseId = await getWarehouseFromUser(userId, prisma)

    const file = req.files?.file || req.file

    if (!file) {
      return errorResponse(res, 400, 'No file uploaded')
    }

    const fileData = file.data || (file.path ? fs.readFileSync(file.path) : null)

    /*
      ✅ Use originalname first.
      In multer, originalname is usually the actual uploaded file name.
      file.name can sometimes come from express-fileupload or get modified.
    */
    const originalname =
      file.originalname ||
      file.name ||
      file.filename ||
      ''

    const mimetype =
      file.mimetype ||
      file.mimeType ||
      file.type ||
      ''

    if (!fileData) {
      return errorResponse(res, 400, 'Invalid file upload')
    }

    logger.info('[PRODUCT_VARIANT] Uploaded bulk update file info', {
      originalname,
      fileName: file.name,
      originalFileName: file.originalname,
      storedFileName: file.filename,
      size: file.size,
      mimetype
    })

    /*
      ✅ Pass mimetype also.
      Even if filename is wrongly detected, mimetype/buffer signature will detect Excel.
    */
    const rawRows = parseBulkFile(fileData, originalname, mimetype)

    const getVariantIdFromRow = (row) => {
      return normalizeText(
        row.variantId ||
        row.VariantId ||
        row.variantID ||
        row.VARIANT_ID ||
        row['variant id'] ||
        row['Variant ID'] ||
        row.id ||
        row.ID ||
        row.Id
      )
    }

    const rows = rawRows
      .map((row, index) => ({
        ...row,
        __rowNum: index + 2
      }))
      .filter((row) => {
        const variantId = getVariantIdFromRow(row)

        return variantId !== undefined &&
          variantId !== null &&
          normalizeText(variantId) !== ''
      })

    if (!rows || rows.length === 0) {
      return errorResponse(
        res,
        400,
        'No valid variant rows found. Variant ID is required for bulk update.'
      )
    }

    /* -------------------------------------------------------
       1️⃣ Load unit references from helper
    ------------------------------------------------------- */

    const referenceData = await loadVariantBulkReferences(warehouseId)

    const unitTypes = referenceData.unitTypes || []
    const units = referenceData.units || []

    /* -------------------------------------------------------
       2️⃣ Fetch products manually
       ✅ Active products allowed
       ✅ Inactive products allowed
       ❌ No isActive filter
    ------------------------------------------------------- */

    const products = await prisma.product.findMany({
      where: {
        warehouseId
      },
      select: {
        id: true,
        name: true,
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    const productMap = new Map(
      products.map((product) => [normalizeKey(product.name), product])
    )

    const unitTypeMap = new Map(
      unitTypes.map((unitType) => [normalizeKey(unitType.name), unitType])
    )

    const unitMap = new Map(
      units.map((unit) => [normalizeKey(unit.name), unit])
    )

    const results = {
      success: [],
      errors: []
    }

    logger.info('[PRODUCT_VARIANT] Bulk update file parsed', {
      warehouseId,
      rawRows: rawRows.length,
      validRows: rows.length,
      products: products.length,
      unitTypes: unitTypes.length,
      units: units.length
    })

    for (const row of rows) {
      const rowNum = row.__rowNum
      const rowErrors = []

      try {
        const id = getVariantIdFromRow(row)

        /* -------------------------------------------------------
           3️⃣ Find existing variant
           ✅ Active variants allowed
           ✅ Inactive variants allowed
           ✅ Disabled variants allowed
           ❌ No status filter
           ❌ No isEnabled filter
        ------------------------------------------------------- */

        const existingVariant = await prisma.productVariant.findFirst({
          where: {
            id,
            product: {
              warehouseId
            }
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                isActive: true
              }
            }
          }
        })

        if (!existingVariant) {
          const productExists = await prisma.product.findFirst({
            where: {
              id,
              warehouseId
            },
            select: {
              id: true,
              name: true
            }
          })

          results.errors.push({
            row: rowNum,
            id,
            error: productExists
              ? `Uploaded ID belongs to product '${productExists.name}'. Please use variantId / ProductVariant.id, not Product.id.`
              : `Variant with ID ${id} not found in your warehouse`
          })

          continue
        }

        const productName = normalizeText(row.product)
        const variantName = normalizeText(row.variantName)
        const unitTypeName = normalizeText(row.unitType)
        const unitName = normalizeText(row.unit)
        const measurement = normalizeText(row.measurement)

        const landingPrice = parseNumberValue(row.landingPrice)
        const mrp = parseNumberValue(row.mrp)
        const discountType = normalizeDiscountType(row.discountType)
        const discountValue = parseNumberValue(row.discountValue)
        const stock = parseIntegerValue(row.stock)
        const threshold = parseIntegerValue(row.threshold)
        const minOrderQty = parseIntegerValue(row.minOrderQty)
        const maxOrderQty = parseIntegerValue(row.maxOrderQty)
        const status = normalizeVariantStatus(row.status)

        /*
          If Excel isEnabled empty, keep existing value.
          If Excel isEnabled TRUE/FALSE, update it.
        */
        const isEnabled = parseBoolSafe(row.isEnabled, existingVariant.isEnabled)

        const sku = normalizeText(row.sku)
        const gtin = normalizeText(row.gtin)
        const barcodeImage = normalizeText(row.barcodeImage)

        if (!productName) {
          rowErrors.push('Product is required')
        }

        if (!variantName) {
          rowErrors.push('Variant name is required')
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

        if (landingPrice === null) {
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

        if (!status || status === 'INVALID') {
          rowErrors.push('Invalid status. Allowed values: ACTIVE, INACTIVE, OUT_OF_STOCK')
        }

        if (isEnabled === null) {
          rowErrors.push('isEnabled must be TRUE or FALSE')
        }

        let product = productMap.get(normalizeKey(productName))

        /*
          Extra safety:
          even if product map has issue, allow same existing product.
        */
        if (!product && existingVariant.product?.name) {
          const isSameProduct =
            normalizeKey(existingVariant.product.name) === normalizeKey(productName)

          if (isSameProduct) {
            product = {
              id: existingVariant.product.id,
              name: existingVariant.product.name,
              isActive: existingVariant.product.isActive
            }
          }
        }

        if (productName && !product) {
          rowErrors.push(`Invalid product: ${productName}`)
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

        if (landingPrice !== null && landingPrice < 0) {
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

        if (rowErrors.length) {
          results.errors.push({
            row: rowNum,
            id,
            error: rowErrors.join(', ')
          })

          continue
        }

        if (sku) {
          const duplicateSku = await prisma.productVariant.findFirst({
            where: {
              productId: product.id,
              sku,
              NOT: {
                id
              }
            },
            select: {
              id: true
            }
          })

          if (duplicateSku) {
            results.errors.push({
              row: rowNum,
              id,
              error: `SKU '${sku}' already exists for product '${productName}'`
            })

            continue
          }
        }

        const updatedVariant = await prisma.productVariant.update({
          where: {
            id
          },
          data: {
            product: {
              connect: {
                id: product.id
              }
            },

            variantName,
            unitType: unitTypeName,
            unit: unitName,
            measurement,

            landingPrice,
            sellingPrice: calculateVariantFinalPrice({
              mrp,
              discountType,
              discountValue
            }),
            mrp,
            discountType,
            discountValue: discountValue || 0,

            stockQuantity: stock,
            lowStockThreshold: threshold ?? 5,
            minOrderQty: minOrderQty ?? 1,
            maxOrderQty: maxOrderQty ?? null,

            sku: sku || null,
            gtin: gtin || null,
            barcodeImage: barcodeImage || null,

            primaryImages: parseArrayValue(row.primaryImages),
            secondaryImages: parseArrayValue(row.secondaryImages),

            metaTitle: normalizeText(row.metaTitle) || null,
            metaKeywords: normalizeText(row.metaKeywords) || null,
            schemaMarkup: normalizeText(row.schemaMarkup) || null,
            metaDescription: normalizeText(row.metaDescription) || null,

            /*
              ✅ This allows updating variant status to:
              ACTIVE / INACTIVE / OUT_OF_STOCK
            */
            status,

            /*
              ✅ This allows enabling or disabling variant:
              TRUE / FALSE
            */
            isEnabled
          }
        })

        results.success.push({
          id: updatedVariant.id,
          productId: product.id,
          product: product.name,
          productIsActive: product.isActive,
          variantName: updatedVariant.variantName,
          status: updatedVariant.status,
          isEnabled: updatedVariant.isEnabled
        })
      } catch (error) {
        results.errors.push({
          row: rowNum,
          error: error.message
        })
      }
    }

    logger.info('[PRODUCT_VARIANT] Bulk update completed', {
      warehouseId,
      totalRecords: rows.length,
      successCount: results.success.length,
      failedCount: results.errors.length
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
    logger.error('[PRODUCT_VARIANT] Bulk update failed', {
      message: error.message,
      stack: error.stack
    })

    return errorResponse(res, 500, error.message)
  }
}

export const getProductIdAndName = async (req, res) => {
  try {
    const userId = req.user?.id

    logger.info("[PRODUCT] Get product id and name API called", {
      userId,
      query: req.query
    })

    /* ------------------------------
       1️⃣ Get warehouseId
    ------------------------------ */

    let user = await prisma.user.findUnique({
      where: {
        id: userId
      },
      select: {
        warehouseId: true
      }
    })

    let warehouseId = user?.warehouseId || req.user?.warehouseId || "00000000-0000-0000-0000-000000000000";

    /* ------------------------------
       2️⃣ Optional filters
    ------------------------------ */

    const {
      search,
      categoryId,
      subCategoryId,
      brandId,
      status
    } = req.query

    const whereClause = {
      warehouseId
    }

    if (search && search.trim()) {
      whereClause.name = {
        contains: search.trim(),
        mode: "insensitive"
      }
    }

    if (categoryId) {
      whereClause.categoryId = categoryId
    }

    if (subCategoryId) {
      whereClause.subCategoryId = subCategoryId
    }

    if (brandId) {
      whereClause.brandId = brandId
    }

    if (status) {
      whereClause.status = status
    }

    /* ------------------------------
       3️⃣ Fetch products
    ------------------------------ */

    const products = await prisma.product.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: "asc"
      }
    })

    /* ------------------------------
       4️⃣ Format response
    ------------------------------ */

    const formattedProducts = products.map(product => ({
      productId: product.id,
      productName: product.name
    }))

    logger.info("[PRODUCT] Product id and name fetched successfully", {
      userId,
      warehouseId,
      count: formattedProducts.length
    })

    return successResponse(
      res,
      200,
      formattedProducts,
      "Products fetched successfully"
    )
  } catch (error) {
    logger.error("[PRODUCT] Get product id and name failed", {
      message: error.message,
      stack: error.stack
    })

    return errorResponse(
      res,
      500,
      error.message || "Failed to fetch products"
    )
  }
}