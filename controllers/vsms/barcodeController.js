import { prisma } from '../../config/prismaClient.js';
import { logActivity } from '../utils/activityLogger.js';

// @desc    Get Barcode Dashboard Stats
// @route   GET /api/barcode/dashboard
// @access  Private
export const getDashboardStats = async (req, res, next) => {
  try {
    const tenantId = req.user?.tenantId || 'VK001';
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const targetWarehouseId = req.user?.warehouseId;
    const warehouseFilter = targetWarehouseId ? { warehouseId: targetWarehouseId } : {};

    // 1. Total Products & Variants
    const totalProducts = await prisma.product.count({
      where: warehouseFilter
    });
    const totalVariants = await prisma.productVariant.count({
      where: { product: warehouseFilter }
    });

    // 2. Barcoded Items
    const productsWithBarcode = await prisma.product.count({
      where: { ...warehouseFilter, barcode: { not: null } }
    });
    const variantsWithBarcode = await prisma.productVariant.count({
      where: { product: warehouseFilter, gtin: { not: null } }
    });
    const totalWithBarcode = productsWithBarcode + variantsWithBarcode;

    // 3. Unbarcoded Items
    const productsNoVariantsNoBarcode = await prisma.product.count({
      where: {
        ...warehouseFilter,
        barcode: null,
        variants: { none: {} }
      }
    });
    const variantsNoBarcode = await prisma.productVariant.count({
      where: {
        product: warehouseFilter,
        gtin: null
      }
    });
    const totalWithoutBarcode = productsNoVariantsNoBarcode + variantsNoBarcode;

    // 4. Barcodes Generated Today
    const productVgksToday = await prisma.product.count({
      where: {
        ...warehouseFilter,
        createdAt: { gte: todayStart },
        barcode: { startsWith: 'VGK' }
      }
    });
    const variantVgksToday = await prisma.productVariant.count({
      where: {
        product: warehouseFilter,
        createdAt: { gte: todayStart },
        gtin: { startsWith: 'VGK' }
      }
    });
    const barcodesGeneratedToday = productVgksToday + variantVgksToday;

    // 5. Labels Printed Today
    let labelsPrintedToday = 0;
    try {
      if (prisma.barcodePrintHistory) {
        const printAggregate = await prisma.barcodePrintHistory.aggregate({
          where: {
            tenantId,
            printedAt: { gte: todayStart }
          },
          _sum: {
            labelCount: true
          }
        });
        labelsPrintedToday = printAggregate._sum.labelCount || 0;
      }
    } catch (err) {
      console.warn('barcodePrintHistory aggregate failed:', err.message);
    }

    // 6. Recently Added Products
    const recentlyAdded = await prisma.product.findMany({
      where: warehouseFilter,
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        category: true,
        brand: true,
      }
    });

    const productsWithVGK = await prisma.product.findMany({
      where: { ...warehouseFilter, barcode: { startsWith: 'VGK' } },
      select: { barcode: true }
    });
    const variantsWithVGK = await prisma.productVariant.findMany({
      where: { product: warehouseFilter, gtin: { startsWith: 'VGK' } },
      select: { gtin: true }
    });

    let maxNum = 0;
    const parseBarcodeNum = (bc) => {
      if (!bc) return 0;
      const numPart = bc.replace('VGK', '');
      const num = parseInt(numPart, 10);
      return isNaN(num) ? 0 : num;
    };
    productsWithVGK.forEach(p => {
      const num = parseBarcodeNum(p.barcode);
      if (num > maxNum) maxNum = num;
    });
    variantsWithVGK.forEach(v => {
      const num = parseBarcodeNum(v.gtin);
      if (num > maxNum) maxNum = num;
    });
    const nextBarcodeSequence = `VGK${String(maxNum + 1).padStart(8, '0')}`;

    res.json({
      totalProducts,
      totalVariants,
      productsWithBarcode: totalWithBarcode,
      productsWithoutBarcode: totalWithoutBarcode,
      barcodesGeneratedToday,
      labelsPrintedToday,
      recentlyAdded,
      nextBarcodeSequence
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Barcode Master List
// @route   GET /api/barcode
// @access  Private
// @type    type can be 'master' or 'mapping' (both should restrict by partner warehouse)
export const getBarcodeMasterList = async (req, res, next) => {
  try {
    const tenantId = req.user?.tenantId || 'VK001';
    const { search, categoryId, brandId, page = 1, limit = 10, type, filter } = req.query;
    const skip = Math.max(0, (parseInt(page) - 1) * parseInt(limit));
    const take = Math.max(1, parseInt(limit));
    const targetWarehouseId = req.user?.warehouseId;
    const where = targetWarehouseId ? { warehouseId: targetWarehouseId } : {};

    const andConditions = [];

    if (type === 'master') {
      andConditions.push({
        OR: [
          { barcode: { startsWith: 'VGK' } },
          {
            variants: {
              some: {
                gtin: { startsWith: 'VGK' }
              }
            }
          }
        ]
      });
    }

    // Barcode status filter: barcoded, unbarcoded, all
    const normalizedFilter = String(filter || '').toLowerCase();
    if (normalizedFilter === 'barcoded') {
      andConditions.push({
        OR: [
          { barcode: { not: null } },
          {
            variants: {
              some: {
                gtin: { not: null }
              }
            }
          }
        ]
      });
    } else if (normalizedFilter === 'unbarcoded') {
      andConditions.push({
        OR: [
          {
            barcode: null,
            variants: { none: {} }
          },
          {
            variants: {
              some: {
                gtin: null
              }
            }
          }
        ]
      });
    }

    if (search && String(search).trim()) {
      const q = String(search).trim();
      andConditions.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { barcode: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
          {
            variants: {
              some: {
                OR: [
                  { variantName: { contains: q, mode: 'insensitive' } },
                  { sku: { contains: q, mode: 'insensitive' } },
                  { gtin: { contains: q, mode: 'insensitive' } }
                ]
              }
            }
          }
        ]
      });
    }

    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId;
    }
    if (brandId && brandId !== 'all') {
      where.brandId = brandId;
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const includeObj = {
      category: {
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
      variants: {
        select: {
          id: true,
          variantName: true,
          sku: true,
          unit: true,
          unitType: true,
          measurement: true,
          status: true,
          gtin: true
        }
      }
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        include: includeObj,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({ where })
    ]);

    res.json({
      products,
      total,
      pages: Math.ceil(total / take) || 1,
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('[BarcodeController getBarcodeMasterList Error]:', error);
    next(error);
  }
};

// @desc    Quick Map or Clear Barcode for Product / Variant
// @route   POST /api/barcode/quick-map
// @access  Private
export const quickMapBarcode = async (req, res, next) => {
  try {
    const tenantId = req.user?.tenantId || 'VK001';
    const { productId, variantId, barcode } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    const cleanBarcode = barcode && String(barcode).trim() ? String(barcode).trim() : null;

    // Validate uniqueness if barcode is being assigned
    if (cleanBarcode) {
      // 1. Check duplicate on Product model
      const duplicateProduct = await prisma.product.findFirst({
        where: {
          barcode: cleanBarcode,
          id: { not: productId }
        },
        select: { id: true, name: true }
      });
      if (duplicateProduct) {
        return res.status(400).json({
          success: false,
          message: `Barcode "${cleanBarcode}" is already assigned to product "${duplicateProduct.name}"`
        });
      }

      // 2. Check duplicate on ProductVariant model
      const duplicateVariant = await prisma.productVariant.findFirst({
        where: {
          gtin: cleanBarcode,
          ...(variantId ? { id: { not: variantId } } : {})
        },
        include: { product: { select: { name: true } } }
      });
      if (duplicateVariant) {
        return res.status(400).json({
          success: false,
          message: `Barcode "${cleanBarcode}" is already assigned to variant "${duplicateVariant.variantName}" of product "${duplicateVariant.product?.name || 'Product'}"`
        });
      }
    }

    if (variantId) {
      const updatedVariant = await prisma.productVariant.update({
        where: { id: variantId },
        data: { gtin: cleanBarcode }
      });

      logActivity({
        userId: req.user?.id,
        tenantId,
        storeId: req.user?.storeId || req.user?.warehouseId,
        action: cleanBarcode ? 'BARCODE_MAPPED' : 'BARCODE_CLEARED',
        details: `${cleanBarcode ? 'Mapped barcode ' + cleanBarcode : 'Cleared barcode'} for variant ID ${variantId}`,
        metadata: { productId, variantId, barcode: cleanBarcode }
      });

      return res.json({
        success: true,
        message: cleanBarcode ? `Mapped barcode ${cleanBarcode}` : 'Barcode cleared',
        variant: updatedVariant
      });
    } else {
      const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: { barcode: cleanBarcode }
      });

      // Also sync master product if linked
      if (updatedProduct.masterProductId) {
        try {
          await prisma.masterProduct.update({
            where: { id: updatedProduct.masterProductId },
            data: { barcode: cleanBarcode }
          });
        } catch (mErr) {
          console.warn('Master product barcode sync failed:', mErr.message);
        }
      }

      logActivity({
        userId: req.user?.id,
        tenantId,
        storeId: req.user?.storeId || req.user?.warehouseId,
        action: cleanBarcode ? 'BARCODE_MAPPED' : 'BARCODE_CLEARED',
        details: `${cleanBarcode ? 'Mapped barcode ' + cleanBarcode : 'Cleared barcode'} for product ${updatedProduct.name}`,
        metadata: { productId, barcode: cleanBarcode }
      });

      return res.json({
        success: true,
        message: cleanBarcode ? `Mapped barcode ${cleanBarcode}` : 'Barcode cleared',
        product: updatedProduct
      });
    }
  } catch (error) {
    console.error('[BarcodeController quickMapBarcode Error]:', error);
    next(error);
  }
};

// @desc    Quick Map Barcode for Product / MasterProduct / Variant
// @route   POST /api/barcode/quick-map
// @access  Private
export const quickMapProductBarcode = async (req, res, next) => {
  try {
    const tenantId = req.user?.tenantId;
    const { productId, variantId, barcode } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    const cleanBarcode = barcode ? String(barcode).trim() : null;
    const targetWarehouseId = req.user?.warehouseId;
    const warehouseFilter = targetWarehouseId ? { warehouseId: targetWarehouseId } : {};

    // 1. Fetch product
    const product = await prisma.product.findFirst({
      where: { id: productId, ...warehouseFilter },
      include: {
        variants: true
      }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found or access denied' });
    }

    // 2. Check if barcode is already assigned to a DIFFERENT product or variant
    if (cleanBarcode) {
      const conflictProduct = await prisma.product.findFirst({
        where: {
          barcode: cleanBarcode,
          id: { not: productId }
        }
      });
      if (conflictProduct) {
        return res.status(400).json({
          message: `Barcode "${cleanBarcode}" is already mapped to product "${conflictProduct.name}"`
        });
      }

      if (variantId) {
        const conflictVariant = await prisma.productVariant.findFirst({
          where: {
            gtin: cleanBarcode,
            id: { not: variantId }
          },
          include: { product: true }
        });
        if (conflictVariant) {
          return res.status(400).json({
            message: `Barcode "${cleanBarcode}" is already mapped to variant "${conflictVariant.variantName}" of "${conflictVariant.product?.name || 'another product'}"`
          });
        }
      }
    }

    // 3. Perform atomic update across Product, MasterProduct, Variant, POS Stock, and Supplier Mapping
    const result = await prisma.$transaction(async (tx) => {
      let updatedVariant = null;

      if (variantId) {
        // Update Product Variant
        updatedVariant = await tx.productVariant.update({
          where: { id: variantId },
          data: { gtin: cleanBarcode }
        });

        // Sync MasterProductVariant if linked
        if (updatedVariant.masterProductVariantId) {
          try {
            await tx.masterProductVariant.update({
              where: { id: updatedVariant.masterProductVariantId },
              data: { gtin: cleanBarcode }
            });
          } catch (mErr) {
            console.warn('[BARCODE_SYNC] MasterProductVariant sync skipped:', mErr.message);
          }
        }
      } else {
        // Update Product
        await tx.product.update({
          where: { id: productId },
          data: { barcode: cleanBarcode }
        });

        // Sync MasterProduct if linked
        if (product.masterProductId) {
          try {
            await tx.masterProduct.update({
              where: { id: product.masterProductId },
              data: { barcode: cleanBarcode }
            });
          } catch (mErr) {
            console.warn('[BARCODE_SYNC] MasterProduct sync skipped:', mErr.message);
          }
        }
      }

      // Sync PosStoreStock barcode if record exists
      try {
        if (tx.posStoreStock) {
          await tx.posStoreStock.updateMany({
            where: { productId },
            data: { barcode: cleanBarcode }
          });
        }
      } catch (posErr) {
        console.warn('[BARCODE_SYNC] PosStoreStock update skipped:', posErr.message);
      }

      // Sync or create SupplierBarcodeMapping if available
      try {
        if (tx.supplierBarcodeMapping && cleanBarcode) {
          const existingMapping = await tx.supplierBarcodeMapping.findFirst({
            where: { productId }
          });
          if (existingMapping) {
            await tx.supplierBarcodeMapping.update({
              where: { id: existingMapping.id },
              data: { supplierBarcode: cleanBarcode }
            });
          } else {
            await tx.supplierBarcodeMapping.create({
              data: {
                productId,
                supplierBarcode: cleanBarcode
              }
            });
          }
        }
      } catch (suppErr) {
        console.warn('[BARCODE_SYNC] SupplierBarcodeMapping sync skipped:', suppErr.message);
      }

      // Fetch fresh updated product record
      return await tx.product.findUnique({
        where: { id: productId },
        include: {
          category: true,
          brand: true,
          variants: true
        }
      });
    });

    logActivity({
      userId: req.user.id,
      tenantId,
      storeId: req.user.storeId,
      action: 'BARCODE_QUICK_MAPPED',
      details: variantId
        ? `Mapped barcode "${cleanBarcode || 'CLEARED'}" to variant ID ${variantId} of product "${product.name}"`
        : `Mapped barcode "${cleanBarcode || 'CLEARED'}" to product "${product.name}"`,
      metadata: { productId, variantId, barcode: cleanBarcode }
    });

    return res.json({
      success: true,
      message: cleanBarcode
        ? `Barcode "${cleanBarcode}" mapped successfully to Product and Master catalog`
        : 'Barcode cleared successfully',
      product: result
    });
  } catch (error) {
    next(error);
  }
};



// @desc    Generate Unique Barcode (VGK00000001)
// @route   POST /api/barcode/generate
// @access  Private
export const generateBarcode = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { productId, variantId } = req.body;
    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }
    const targetWarehouseId = req.user?.warehouseId;
    const warehouseFilter = targetWarehouseId ? { warehouseId: targetWarehouseId } : {};

    // Check if product exists and belongs to this warehouse
    const product = await prisma.product.findFirst({
      where: { id: productId, ...warehouseFilter }
    });
    if (!product) {
      return res.status(404).json({ message: 'Product not found or access denied' });
    }

    // Find all products and variants with VGK barcodes to determine the highest suffix for this warehouse
    const productsWithVGK = await prisma.product.findMany({
      where: { ...warehouseFilter, barcode: { startsWith: 'VGK' } },
      select: { barcode: true }
    });
    const variantsWithVGK = await prisma.productVariant.findMany({
      where: { product: warehouseFilter, gtin: { startsWith: 'VGK' } },
      select: { gtin: true }
    });
    let maxNum = 0;
    const parseBarcodeNum = (bc) => {
      if (!bc) return 0;
      const numPart = bc.replace('VGK', '');
      const num = parseInt(numPart, 10);
      return isNaN(num) ? 0 : num;
    };
    productsWithVGK.forEach(p => {
      const num = parseBarcodeNum(p.barcode);
      if (num > maxNum) maxNum = num;
    });
    variantsWithVGK.forEach(v => {
      const num = parseBarcodeNum(v.gtin);
      if (num > maxNum) maxNum = num;
    });
    const nextNum = maxNum + 1;
    const barcode = `VGK${String(nextNum).padStart(8, '0')}`;

    if (variantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId }
      });
      if (!variant) {
        return res.status(404).json({ message: 'Variant not found' });
      }
      if (variant.gtin) {
        return res.json({ barcode: variant.gtin, message: 'Variant already has a barcode' });
      }
      const updatedVariant = await prisma.productVariant.update({
        where: { id: variantId },
        data: { gtin: barcode }
      });
      logActivity({
        userId: req.user.id,
        tenantId,
        storeId: req.user.storeId,
        action: 'BARCODE_GENERATED',
        details: `Generated barcode ${barcode} for variant ${variant.variantName} of product ${product.name}`,
        metadata: { productId, variantId, barcode }
      });
      return res.json({ barcode, variant: updatedVariant });
    } else {
      if (product.barcode) {
        return res.json({ barcode: product.barcode, message: 'Product already has a barcode' });
      }
      const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: { barcode }
      });
      logActivity({
        userId: req.user.id,
        tenantId,
        storeId: req.user.storeId,
        action: 'BARCODE_GENERATED',
        details: `Generated barcode ${barcode} for product ${product.name}`,
        metadata: { productId, barcode }
      });
      return res.json({ barcode, product: updatedProduct });
    }
  } catch (error) {
    next(error);
  }
};
// @desc    Map Supplier Barcode
// @route   POST /api/barcode/map-supplier
// @access  Private
export const mapSupplierBarcode = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { productId, variantId, supplierBarcode } = req.body;
    if (!productId || !supplierBarcode) {
      return res.status(400).json({ message: 'Product ID and Supplier Barcode are required' });
    }
    const targetWarehouseId = req.user?.warehouseId;
    const warehouseFilter = targetWarehouseId ? { warehouseId: targetWarehouseId } : {};

    // Verify the product belongs to this partner's warehouse
    const product = await prisma.product.findFirst({
      where: { id: productId, ...warehouseFilter }
    });
    if (!product) {
      return res.status(404).json({ message: 'Product not found or access denied' });
    }

    if (!prisma.supplierBarcodeMapping) {
      if (variantId) {
        const updatedVariant = await prisma.productVariant.update({
          where: { id: variantId },
          data: { gtin: supplierBarcode }
        });
        logActivity({
          userId: req.user.id,
          tenantId,
          storeId: req.user.storeId,
          action: 'SUPPLIER_BARCODE_MAPPED',
          details: `Mapped supplier barcode ${supplierBarcode} to variant ID ${variantId}`,
          metadata: { productId, variantId, supplierBarcode }
        });
        return res.status(201).json({ id: 'mock-mapping', productId, variantId, supplierBarcode });
      } else {
        const updatedProduct = await prisma.product.update({
          where: { id: productId },
          data: { barcode: supplierBarcode }
        });
        logActivity({
          userId: req.user.id,
          tenantId,
          storeId: req.user.storeId,
          action: 'SUPPLIER_BARCODE_MAPPED',
          details: `Mapped supplier barcode ${supplierBarcode} to product ID ${productId}`,
          metadata: { productId, supplierBarcode }
        });
        return res.status(201).json({ id: 'mock-mapping', productId, supplierBarcode });
      }
    }
    // Check if mapping already exists
    const existing = await prisma.supplierBarcodeMapping.findFirst({
      where: { supplierBarcode }
    });
    if (existing) {
      return res.status(400).json({ message: 'Supplier barcode is already mapped to a product' });
    }
    const mapping = await prisma.$transaction(async (tx) => {
      if (variantId) {
        await tx.productVariant.update({
          where: { id: variantId },
          data: { gtin: supplierBarcode }
        });
      } else {
        await tx.product.update({
          where: { id: productId },
          data: { barcode: supplierBarcode }
        });
      }
      return await tx.supplierBarcodeMapping.create({
        data: {
          productId,
          supplierBarcode
        }
      });
    });
    logActivity({
      userId: req.user.id,
      tenantId,
      storeId: req.user.storeId,
      action: 'SUPPLIER_BARCODE_MAPPED',
      details: variantId
        ? `Mapped supplier barcode ${supplierBarcode} to variant ID ${variantId}`
        : `Mapped supplier barcode ${supplierBarcode} to product ID ${productId}`,
      metadata: { productId, variantId, supplierBarcode }
    });
    res.status(201).json(mapping);
  } catch (error) {
    next(error);
  }
};
// @desc    Delete Supplier Barcode Mapping
// @route   DELETE /api/barcode/map-supplier/:id
// @access  Private
export const deleteSupplierBarcodeMapping = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    if (!prisma.supplierBarcodeMapping) {
      return res.json({ message: 'Supplier barcode mapping deleted successfully' });
    }
    const mapping = await prisma.supplierBarcodeMapping.findFirst({
      where: { id }
    });
    if (!mapping) {
      return res.status(404).json({ message: 'Mapping not found' });
    }
    await prisma.$transaction([
      prisma.product.update({
        where: { id: mapping.productId },
        data: { barcode: null }
      }),
      prisma.supplierBarcodeMapping.delete({
        where: { id }
      })
    ]);
    res.json({ message: 'Supplier barcode mapping deleted successfully' });
  } catch (error) {
    next(error);
  }
};
// @desc    Log Barcode Printing
// @route   POST /api/barcode/log-print
// @access  Private
export const logPrint = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { productId, barcode, labelCount, source } = req.body;
    if (!productId || !barcode) {
      return res.status(400).json({ message: 'Product ID and Barcode are required' });
    }
    let log = { id: 'mock-print-log', message: 'Logged successfully (mocked)' };
    try {
      if (prisma.barcodePrintHistory) {
        log = await prisma.barcodePrintHistory.create({
          data: {
            tenantId,
            productId,
            barcode,
            labelCount: parseInt(labelCount) || 1,
            source: source || 'SINGLE',
            printedById: req.user.id
          }
        });
      }
    } catch (err) {
      console.warn('barcodePrintHistory create failed:', err.message);
    }
    res.status(201).json(log);
  } catch (error) {
    next(error);
  }
};
// @desc    Log Barcode Scanning
// @route   POST /api/barcode/log-scan
// @access  Private
export const logScan = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { productId, barcode, actionType, scannerType } = req.body;
    if (!productId || !barcode || !actionType) {
      return res.status(400).json({ message: 'Product ID, Barcode, and Action Type are required' });
    }
    let log = { id: 'mock-scan-log', message: 'Logged successfully (mocked)' };
    try {
      if (prisma.barcodeScanHistory) {
        log = await prisma.barcodeScanHistory.create({
          data: {
            tenantId,
            productId,
            barcode,
            actionType,
            scannerType: scannerType || 'POS_SCANNER',
            scannedById: req.user.id
          }
        });
      }
    } catch (err) {
      console.warn('barcodeScanHistory create failed:', err.message);
    }
    res.status(201).json(log);
  } catch (error) {
    next(error);
  }
};
// @desc    Lookup Scanned Barcode (Supplier or Internal)
// @route   GET /api/barcode/lookup/:code
// @access  Private
export const lookupBarcode = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ message: 'Barcode is required' });
    }
    // 1. Search in Product internal barcode
    let product = await prisma.product.findFirst({
      where: {
        tenantId,
        barcode: code,
        status: 'ACTIVE'
      },
      include: {
        category: true,
        brand: true,
        WarehouseInventory: true,
        vehicleStocks: true
      }
    });
    // 2. Search in Supplier Mappings if not found
    if (!product && prisma.supplierBarcodeMapping) {
      try {
        const mapping = await prisma.supplierBarcodeMapping.findFirst({
          where: {
            supplierBarcode: code
          },
          include: {
            product: {
              include: {
                category: true,
                brand: true,
                WarehouseInventory: true,
                vehicleStocks: true
              }
            }
          }
        });
        if (mapping) {
          product = mapping.product;
        }
      } catch (err) {
        console.warn('supplierBarcodeMapping lookup failed:', err.message);
      }
    }
    if (!product) {
      return res.status(404).json({ message: 'Product not found with this barcode' });
    }
    // Flatten stocks
    const warehouseQty = product.WarehouseInventory?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;
    const vehicleQty = product.vehicleStocks?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;
    const totalStock = warehouseQty + vehicleQty;
    res.json({
      ...product,
      warehouseStock: warehouseQty,
      vehicleStock: vehicleQty,
      totalStock
    });
  } catch (error) {
    next(error);
  }
};
// @desc    Bulk Import Barcodes
// @route   POST /api/barcode/import
// @access  Private
export const bulkImport = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { items } = req.body; // Array of { skuCode, barcode, supplierBarcode }
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ message: 'Items array is required' });
    }
    let successCount = 0;
    let errors = [];
    // Pre-fetch defaults once outside the loop to prevent repeated queries
    let defaultCategory = await prisma.category.findFirst({
      where: { name: 'Uncategorized' }
    });
    if (!defaultCategory) {
      defaultCategory = await prisma.category.create({
        data: { name: 'Uncategorized' }
      });
    }
    let defaultBrand = await prisma.brand.findFirst({
      where: { name: 'Unbranded' }
    });
    if (!defaultBrand) {
      defaultBrand = await prisma.brand.create({
        data: { name: 'Unbranded' }
      });
    }
    let defaultSub = await prisma.subCategory.findFirst({
      where: { name: 'Uncategorized', categoryId: defaultCategory.id }
    });
    if (!defaultSub) {
      defaultSub = await prisma.subCategory.create({
        data: { name: 'Uncategorized', categoryId: defaultCategory.id }
      });
    }
    // Cache to look up entities during execution to optimize DB roundtrips
    const categoryCache = new Map();
    const brandCache = new Map();
    const unitCache = new Map();
    for (const item of items) {
      try {
        const { skuCode, barcode, supplierBarcode, name, category, brand, unit, packSize, status } = item;
        if (!skuCode) {
          errors.push({ item, reason: 'skuCode is missing' });
          continue;
        }
        let product = await prisma.product.findFirst({
          where: {
            OR: [
              { skuCode },
              { displayId: skuCode }
            ]
          }
        });
        // Parse Barcode Fields
        const barcodeVal = barcode?.toString().trim() || null;
        const supplierVal = supplierBarcode?.toString().trim() || null;
        if (!product) {
          // Resolve category if provided
          let catId = defaultCategory.id;
          if (category) {
            const catKey = category.trim();
            if (categoryCache.has(catKey)) {
              catId = categoryCache.get(catKey);
            } else {
              let catRecord = await prisma.category.findFirst({
                where: { name: catKey }
              });
              if (!catRecord) {
                catRecord = await prisma.category.create({
                  data: { name: catKey }
                });
              }
              catId = catRecord.id;
              categoryCache.set(catKey, catId);
            }
          }
          // Resolve subcategory
          let subId = defaultSub.id;
          if (category) {
            let subRecord = await prisma.subCategory.findFirst({
              where: { name: 'Uncategorized', categoryId: catId }
            });
            if (!subRecord) {
              subRecord = await prisma.subCategory.create({
                data: { name: 'Uncategorized', categoryId: catId }
              });
            }
            subId = subRecord.id;
          }
          // Resolve brand
          let brandId = defaultBrand.id;
          if (brand) {
            const brandKey = brand.trim();
            if (brandCache.has(brandKey)) {
              brandId = brandCache.get(brandKey);
            } else {
              let brandRecord = await prisma.brand.findFirst({
                where: { name: brandKey }
              });
              if (!brandRecord) {
                brandRecord = await prisma.brand.create({
                  data: { name: brandKey }
                });
              }
              brandId = brandRecord.id;
              brandCache.set(brandKey, brandId);
            }
          }
          // Resolve unit
          let unitId = null;
          if (unit) {
            const unitKey = unit.trim();
            if (unitCache.has(unitKey)) {
              unitId = unitCache.get(unitKey);
            } else {
              let unitRecord = await prisma.unit.findFirst({
                where: { name: unitKey }
              });
              // Units require a unitType; skip creation if not found to avoid errors
              if (unitRecord) {
                unitId = unitRecord.id;
              }
              if (unitId) unitCache.set(unitKey, unitId);
            }
          }
          // Resolve display ID code prefix
          const catForCode = category ? category.trim() : 'GEN';
          const catCode = catForCode.substring(0, 4).toUpperCase();
          const nextSeqCount = await prisma.product.count({ where: {} });
          const displayId = `VK-ITM-${catCode}-${String(nextSeqCount + 1).padStart(5, '0')}`;
          // Coerce ItemStatus enum
          let productStatus = 'ACTIVE';
          if (status) {
            const upStatus = status.trim().toUpperCase();
            if (upStatus === 'ACTIVE' || upStatus === 'INACTIVE') {
              productStatus = upStatus;
            }
          }
          product = await prisma.product.create({
            data: {
              storeId: req.user?.storeId || null,
              name: name || `Product ${skuCode}`,
              skuCode,
              displayId,
              categoryId: catId,
              subCategoryId: subId,
              brandId,
              unitId,
              unitValue: parseFloat(packSize) || null,
              status: productStatus,
              price: 0.00,
              mrp: 0.00,
              barcode: barcodeVal || supplierVal || null
            }
          });
        } else {
          // If product exists, just update barcodes
          if (barcodeVal) {
            await prisma.product.update({
              where: { id: product.id },
              data: { barcode: barcodeVal }
            });
          }
        }
        // Map supplier barcode if provided
        if (supplierVal) {
          try {
            if (prisma.supplierBarcodeMapping) {
              const mappingExists = await prisma.supplierBarcodeMapping.findFirst({
                where: { supplierBarcode: supplierVal }
              });
              if (!mappingExists) {
                await prisma.$transaction([
                  prisma.product.update({
                    where: { id: product.id },
                    data: { barcode: supplierVal }
                  }),
                  prisma.supplierBarcodeMapping.create({
                    data: {
                      productId: product.id,
                      supplierBarcode: supplierVal
                    }
                  })
                ]);
              }
            } else {
              // If table doesn't exist, just update the product barcode field
              await prisma.product.update({
                where: { id: product.id },
                data: { barcode: supplierVal }
              });
            }
          } catch (err) {
            console.warn('supplierBarcodeMapping create failed:', err.message);
            // Fallback: just update the product barcode
            await prisma.product.update({
              where: { id: product.id },
              data: { barcode: supplierVal }
            });
          }
        }
        successCount++;
      } catch (err) {
        errors.push({ item, reason: err.message });
      }
    }
    res.json({
      message: `Bulk import completed. Success: ${successCount}, Errors: ${errors.length}`,
      successCount,
      errors
    });
  } catch (error) {
    next(error);
  }
};
// @desc    Reset/Delete Barcode from Product
// @route   DELETE /api/barcode/:productId
// @access  Private
export const resetBarcode = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { variantId } = req.query;
    if (variantId) {
      const updatedVariant = await prisma.productVariant.update({
        where: { id: variantId },
        data: { gtin: null }
      });
      return res.json({ message: 'Barcode reset successfully', variant: updatedVariant });
    }
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    // Also remove supplier barcode mappings if they exist
    try {
      if (prisma.supplierBarcodeMapping) {
        await prisma.supplierBarcodeMapping.deleteMany({
          where: { productId }
        });
      }
    } catch (err) {
      console.warn('supplierBarcodeMapping delete failed:', err.message);
    }
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: { barcode: null }
    });
    res.json({ message: 'Barcode reset successfully', product: updatedProduct });
  } catch (error) {
    next(error);
  }
};
// @desc    Reports: Products without Barcode
// @route   GET /api/barcode/reports/no-barcode
// @access  Private
export const getNoBarcodeProducts = async (req, res, next) => {
  try {
    const targetWarehouseId = req.user?.warehouseId || '00000000-0000-0000-0000-000000000000';
    const warehouseFilter = { warehouseId: targetWarehouseId };

    const products = await prisma.product.findMany({
      where: {
        ...warehouseFilter,
        OR: [
          { barcode: null },
          {
            variants: {
              some: {
                gtin: null
              }
            }
          }
        ]
      },
      include: {
        category: true,
        brand: true,
        variants: {
          select: {
            id: true,
            variantName: true,
            sku: true,
            unit: true,
            unitType: true,
            measurement: true,
            status: true,
            gtin: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Filter out products where all variants (or the product itself) already have barcodes assigned
    const filteredProducts = products.filter(p => {
      const hasProductBarcode = !!p.barcode;
      const variants = p.variants || [];
      const totalVariants = variants.length;
      
      // Case 1: Product has no variants
      if (totalVariants === 0) {
        return !hasProductBarcode;
      }
      
      // Case 2: Product has exactly 1 variant
      if (totalVariants === 1) {
        const variant = variants[0];
        // Unassigned only if BOTH product barcode and variant barcode are missing
        return !hasProductBarcode && !variant.gtin;
      }
      
      // Case 3: Product has multiple variants
      // Unassigned if any of the variants is missing a barcode
      return variants.some(v => !v.gtin);
    });

    res.json(filteredProducts);
  } catch (error) {
    next(error);
  }
};
// @desc    Reports: Barcode Print History
// @route   GET /api/barcode/reports/print-history
// @access  Private
export const getPrintHistory = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    let history = [];
    try {
      if (prisma.barcodePrintHistory) {
        history = await prisma.barcodePrintHistory.findMany({
          where: { tenantId },
          include: {
            product: true,
            printedBy: { select: { name: true, email: true } }
          },
          orderBy: { printedAt: 'desc' }
        });
      }
    } catch (err) {
      console.warn('barcodePrintHistory fetch failed:', err.message);
    }
    res.json(history);
  } catch (error) {
    next(error);
  }
};
// @desc    Reports: Barcode Scan History
// @route   GET /api/barcode/reports/scan-history
// @access  Private
export const getScanHistory = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    let history = [];
    try {
      if (prisma.barcodeScanHistory) {
        history = await prisma.barcodeScanHistory.findMany({
          where: { tenantId },
          include: {
            product: true,
            scannedBy: { select: { name: true, email: true } }
          },
          orderBy: { scannedAt: 'desc' }
        });
      }
    } catch (err) {
      console.warn('barcodeScanHistory fetch failed:', err.message);
    }
    res.json(history);
  } catch (error) {
    next(error);
  }
};
