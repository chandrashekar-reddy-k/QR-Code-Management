import prisma from '../../utils/prisma.js';
import { uploadToSupabase } from '../../utils/supabaseService.js';
import { sendNotification } from '../../services/notificationService.js';
import { getTenantId } from '../../utils/tenantContext.js';
import { generateId } from '../../utils/idGenerator.js';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import XLSX from 'xlsx';
import { logActivity } from '../../utils/activityLogger.js';

// Global caches for bulk operations
const catCache = new Map();
const subCache = new Map();
const unitCache = new Map();

// Item Master
// Consolidated Init Data (Mega-Fetch)
export const getInventoryInitData = async (req, res) => {
  try {
    const { storeId } = req.query;
    const tenantId = req.user.tenantId;

    // Filter logic for Products
    const productWhere = {};
    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      productWhere.OR = [{ storeId: storeId }, { storeId: null }];
    } else if (req.user.storeId) {
      const isGlobal = 
        ['TENANT_OWNER', 'SUPER_ADMIN', 'ADMIN'].includes(req.user.role) || 
        req.user.customRole?.portalType === 'ADMIN';
        
      if (!isGlobal) {
        productWhere.OR = [{ storeId: req.user.storeId }, { storeId: null }];
      }
    }

    // Parallel fetching for performance
    const [products, categories, subCategories, units, vehicles, settings, refillRequests] = await Promise.all([
      prisma.product.findMany({
        where: productWhere,
        include: {
          category: { select: { name: true } },
          subCategory: { select: { name: true } },
          vehicleStocks: { select: { quantity: true } },
          vehicleStockAssignments: true,
          channelInventories: true
        }
      }),
      prisma.category.findMany(),
      prisma.subCategory.findMany(),
      prisma.unit.findMany(),
      prisma.vehicle.findMany({ 
        where: { ...(storeId && storeId !== 'null' ? { storeId } : {}) },
        include: {
          assignedUsers: { select: { id: true, name: true } }
        }
      }),
      prisma.businessSettings.findMany({ 
        where: { 
          ...(storeId && storeId !== 'null' ? { storeId } : { storeId: null })
        } 
      }),
      prisma.refillRequest.findMany({
        where: { tenantId, status: 'PENDING', ...(storeId && storeId !== 'null' ? { storeId } : {}) },
        include: { 
          items: true
        }
      })
    ]);

    // Populate user, vehicle, and products safely for refillRequests
    const refillUserIds = [...new Set(refillRequests.map(r => r.userId).filter(Boolean))];
    const refillVehicleIds = [...new Set(refillRequests.map(r => r.vehicleId).filter(Boolean))];
    const refillProductIds = [...new Set(refillRequests.flatMap(r => (r.items || []).map(i => i.productId).filter(Boolean)))];

    const [refillUsers, refillVehicles, refillProducts] = await Promise.all([
      refillUserIds.length > 0 ? prisma.user.findMany({ where: { id: { in: refillUserIds } }, select: { id: true, name: true } }) : [],
      refillVehicleIds.length > 0 ? prisma.vehicle.findMany({ where: { id: { in: refillVehicleIds } }, select: { id: true, vehicleNumber: true, vehicleName: true } }) : [],
      refillProductIds.length > 0 ? prisma.product.findMany({ where: { id: { in: refillProductIds } }, select: { id: true, name: true, sku: true, unit: true, unitType: true } }) : []
    ]);
    const refillUserMap = Object.fromEntries(refillUsers.map(u => [u.id, u]));
    const refillVehicleMap = Object.fromEntries(refillVehicles.map(v => [v.id, v]));
    const refillProductMap = Object.fromEntries(refillProducts.map(p => [p.id, p]));

    const processedRefillRequests = refillRequests.map(req => ({
      ...req,
      user: refillUserMap[req.userId] || null,
      vehicle: refillVehicleMap[req.vehicleId] || null,
      items: (req.items || []).map(item => {
        const product = refillProductMap[item.productId];
        return {
          ...item,
          product: product ? {
            ...product,
            unit: { name: product.unit, type: product.unitType || 'pcs' }
          } : {
            name: 'Unknown Product',
            unit: { name: 'pcs', type: 'pcs' }
          }
        };
      })
    }));

    // 1. Process items to sum warehouse quantity
    const processedItems = products.map(item => {
      const warehouseQty = item.WarehouseInventory?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;
      const vsaQty = item.vehicleStockAssignments?.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0) || 0;
      const vehicleQty = vsaQty > 0 ? vsaQty : (item.vehicleStocks?.reduce((acc, curr) => acc + curr.quantity, 0) || 0);
      const posInv = item.channelInventories?.find(ci => ci.channel === 'POS_STORE');
      const onlineInv = item.channelInventories?.find(ci => ci.channel === 'ONLINE_APP');
      const vehicleStoreStock = vsaQty > 0 ? vsaQty : (posInv?.quantity || 0);
      const effectiveWarehouseQty = warehouseQty > 0 ? warehouseQty : (item.stock ?? 0);
      const totalQty = effectiveWarehouseQty + vehicleQty;

      return {
        ...item,
        warehouseStock: effectiveWarehouseQty,
        vehicleStock: vehicleQty,
        vehicleStoreStock,
        totalStock: totalQty,
        stock: effectiveWarehouseQty,
        posStock: posInv?.quantity ?? 0,
        onlineStock: onlineInv?.quantity ?? 0
      };
    });

    // 2. Fetch Vehicle Stock for all vehicles at once (The "Mega-Fix" for per-vehicle requests)
    const vehicleIds = vehicles.map(v => v.id);
    const allVehicleStock = await prisma.vehicleStock.findMany({
      where: { vehicleId: { in: vehicleIds } }
    });

    const stockProductIds = [...new Set(allVehicleStock.map(s => s.productId).filter(Boolean))];
    const stockProducts = stockProductIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: stockProductIds } },
          select: { id: true, name: true, sku: true, price: true, unit: true }
        })
      : [];
    const stockProductMap = Object.fromEntries(stockProducts.map(p => [p.id, p]));

    // Group vehicle stock by vehicleId
    const vehicleStockMap = {};
    allVehicleStock.forEach(stock => {
      if (!vehicleStockMap[stock.vehicleId]) {
        vehicleStockMap[stock.vehicleId] = [];
      }
      vehicleStockMap[stock.vehicleId].push({
        ...stock,
        product: stockProductMap[stock.productId] || null
      });
    });

    res.json({
      items: processedItems,
      categories,
      subCategories,
      units,
      vehicles,
      vehicleStock: vehicleStockMap,
      settings,
      refillRequests: processedRefillRequests,
      success: true
    });

  } catch (error) {
    console.error('❌ getInventoryInitData Error:', error.message);
    res.status(500).json({ 
      message: 'Error fetching inventory initialization data', 
      error: error.message,
      success: false 
    });
  }
};

export const getItems = async (req, res) => {
  try {
    const { storeId, all } = req.query;
    const where = {};
    
    if (all === 'true') {
      // Show everything for the tenant, no storeId filter
    } else if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      where.storeId = storeId;
    } else if (req.user.storeId) {
      const isGlobal = 
        ['TENANT_OWNER', 'SUPER_ADMIN', 'ADMIN'].includes(req.user.role) || 
        req.user.customRole?.portalType === 'ADMIN';
        
      if (!isGlobal) {
        where.storeId = req.user.storeId;
      }
    }

    const items = await prisma.product.findMany({
      where,
      include: {
        category: { select: { name: true } },
        subCategory: { select: { name: true } },
        store: { select: { name: true } },
        variants: {
          where: {
            status: 'ACTIVE',
            isEnabled: true
          }
        },
        vehicleStocks: {
          select: { quantity: true }
        }
      }
    });

    // Map each item and provide a comprehensive stock breakdown
    const processedItems = items.map(item => {
      const warehouseQty = item.WarehouseInventory.reduce((acc, curr) => acc + curr.quantity, 0);
      const vehicleQty = item.vehicleStocks.reduce((acc, curr) => acc + curr.quantity, 0);
      const effectiveWarehouseQty = warehouseQty > 0 ? warehouseQty : (item.stock ?? 0);
      const totalQty = effectiveWarehouseQty + vehicleQty;
      
      return {
        ...item,
        warehouseStock: effectiveWarehouseQty,
        vehicleStock: vehicleQty,
        totalStock: totalQty,
        storeName: item.store?.name || 'Global Registry',
        stock: effectiveWarehouseQty // Keep 'stock' as effectiveWarehouseQty for backward compatibility where needed
      };
    });

    res.json(processedItems);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching items', error: error.message });
  }
};

export const bulkImportItems = async (req, res) => {
  try {
    const { transfers, targetStoreId } = req.body;
    const tenantId = req.user.tenantId;

    if (!transfers || !Array.isArray(transfers) || !targetStoreId) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    const results = await prisma.$transaction(async (tx) => {
      const processed = [];

      // Get or create default warehouse for the tenant
      let warehouse = await tx.warehouse.findFirst({ where: { tenantId } });
      if (!warehouse) {
        warehouse = await tx.warehouse.create({
          data: { tenantId, name: 'Main Warehouse', location: 'Default' }
        });
      }

      for (const transfer of transfers) {
        const { productId, quantity } = transfer;

        if (quantity <= 0) continue;

        // 1. Get Source Product & its Warehouse Stock
        const sourceProd = await tx.product.findUnique({
          where: { id: productId },
          include: { WarehouseInventory: true }
        });

        if (!sourceProd) {
          throw new Error(`Source product ${productId} not found`);
        }

        const sourceTotalStock = sourceProd.WarehouseInventory.reduce((acc, curr) => acc + curr.quantity, 0);

        if (sourceTotalStock < quantity) {
          throw new Error(`Insufficient warehouse stock for ${sourceProd.name}. Available: ${sourceTotalStock}, Requested: ${quantity}`);
        }

        // 2. Find or Create Target Product
        let targetProd = await tx.product.findFirst({
          where: {
            tenantId,
            storeId: targetStoreId,
            OR: [
              { name: sourceProd.name },
              { barcode: sourceProd.barcode && sourceProd.barcode !== '' ? sourceProd.barcode : undefined }
            ].filter(Boolean)
          }
        });

        if (!targetProd) {
          targetProd = await tx.product.create({
            data: {
              name: sourceProd.name,
              description: sourceProd.description,
              mrp: sourceProd.mrp,
              price: sourceProd.price,
              landingPrice: sourceProd.landingPrice,
              discount: sourceProd.discount,
              discountType: sourceProd.discountType,
              status: sourceProd.status,
              image: sourceProd.image,
              categoryId: sourceProd.categoryId,
              subCategoryId: sourceProd.subCategoryId,
              brandId: sourceProd.brandId,
              unitId: sourceProd.unitId,
              unitValue: sourceProd.unitValue,
              gst: sourceProd.gst,
              isFree: sourceProd.isFree,
              minShopAmount: sourceProd.minShopAmount,
              barcode: sourceProd.barcode,
              skuCode: sourceProd.skuCode,
              minStockAlert: sourceProd.minStockAlert,
              tenantId,
              storeId: targetStoreId,
              stock: 0, // Will be updated via WarehouseInventory logic below
            }
          });
        }

        // 3. Update Warehouse Inventory for Target Product
        await tx.warehouseInventory.upsert({
          where: {
            warehouseId_productId: {
              warehouseId: warehouse.id,
              productId: targetProd.id
            }
          },
          update: { quantity: { increment: quantity } },
          create: {
            tenantId,
            warehouseId: warehouse.id,
            productId: targetProd.id,
            quantity: quantity
          }
        });

        // 4. Update Product Master stock for Target (Aggregate)
        await tx.product.update({
          where: { id: targetProd.id },
          data: { stock: { increment: quantity } }
        });

        // 5. Deduct from Source Warehouse Inventory
        // We pick the first warehouse record that has stock for simplicity, or specific one if known
        // Here we just use the default warehouse as most items are there
        const sourceWI = await tx.warehouseInventory.findFirst({
          where: { productId: sourceProd.id, warehouseId: warehouse.id }
        });

        if (sourceWI && sourceWI.quantity >= quantity) {
          await tx.warehouseInventory.update({
            where: { id: sourceWI.id },
            data: { quantity: { decrement: quantity } }
          });
        } else {
          // If not in default warehouse, find any that has stock
          const anyWI = await tx.warehouseInventory.findFirst({
            where: { productId: sourceProd.id, quantity: { gte: quantity } }
          });
          if (anyWI) {
            await tx.warehouseInventory.update({
              where: { id: anyWI.id },
              data: { quantity: { decrement: quantity } }
            });
          }
        }

        // 6. Deduct from Source Product Master stock (Aggregate)
        await tx.product.update({
          where: { id: sourceProd.id },
          data: { stock: { decrement: quantity } }
        });

        processed.push(targetProd);
      }

      return processed;
    }, {
      maxWait: 20000,
      timeout: 60000
    });

    res.json({ 
      success: true,
      message: `Successfully synced ${results.length} products and updated Warehouse inventory.`, 
      syncedCount: results.length 
    });
  } catch (error) {
    console.error('Sync Error:', error);
    res.status(500).json({ message: error.message || 'Error syncing items' });
  }
};

export const createItem = async (req, res) => {
  const tenantId = req.user?.tenantId || getTenantId();
  try {
    const {
      name,
      description,
      mrp,
      price,
      landingPrice,
      discount,
      status,
      image,
      categoryId,
      subCategoryId,
      brandId,
      unitId,
      unitValue,
      gst,
      isFree,
      minShopAmount,
      barcode,
      skuCode,
      purchasePrice,
      minStockAlert
    } = req.body;

    const finalLandingPrice = landingPrice || purchasePrice;

    // Ensure we have a valid tenantId
    const finalTenantId = tenantId || req.user?.tenantId || 'VK001';

    // Emergency Logging
    fs.appendFileSync('inventory_trace.log', `[${new Date().toISOString()}] Creating Item: ${name} | Tenant: ${finalTenantId} | User: ${req.user?.id}\n`);

    // Handle image upload to Supabase if file is present
    let imageUrl = image || null;
    if (req.file) {
      imageUrl = await uploadToSupabase(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'product-images',
        'products'
      );
    }

    // Convert strings to floats safely
    const parseNumber = (val) => {
      if (val === undefined || val === null || val === '') return undefined;
      const num = parseFloat(val);
      return isNaN(num) ? undefined : num;
    };

    // Handle default relations since they are required in Prisma Schema
    let finalCategoryId = categoryId;
    let finalSubCategoryId = subCategoryId;
    let finalBrandId = brandId;

    if (!finalCategoryId || finalCategoryId === 'default') {
      let defaultCategory = await prisma.category.findFirst({
        where: { tenantId: finalTenantId, name: 'Uncategorized', storeId: null }
      });
      if (!defaultCategory) {
        defaultCategory = await prisma.category.create({
          data: { name: 'Uncategorized', tenantId: finalTenantId, storeId: null }
        });
      }
      finalCategoryId = defaultCategory.id;
    }

    if (!finalSubCategoryId || finalSubCategoryId === 'default') {
      let defaultSub = await prisma.subCategory.findFirst({
        where: { name: 'Uncategorized', categoryId: finalCategoryId, tenantId: finalTenantId }
      });
      if (!defaultSub) {
        defaultSub = await prisma.subCategory.create({
          data: { name: 'Uncategorized', categoryId: finalCategoryId, tenantId: finalTenantId }
        });
      }
      finalSubCategoryId = defaultSub.id;
    }

    if (!finalBrandId || finalBrandId === 'default') {
      let defaultBrand = await prisma.brand.findFirst({
        where: { tenantId: finalTenantId, name: 'Unbranded' }
      });
      if (!defaultBrand) {
        defaultBrand = await prisma.brand.create({
          data: { name: 'Unbranded', tenantId: finalTenantId }
        });
      }
      finalBrandId = defaultBrand.id;
    }

    const itemData = {
      tenantId: finalTenantId,
      name,
      description,
      mrp: parseNumber(mrp),
      price: parseNumber(price) || 0,
      landingPrice: parseNumber(finalLandingPrice),
      discount: parseNumber(discount),
      status: status || 'ACTIVE',
      image: imageUrl,
      categoryId: finalCategoryId,
      subCategoryId: finalSubCategoryId,
      brandId: finalBrandId,
      unitId: unitId || undefined,
      unitValue: parseNumber(unitValue),
      gst: parseNumber(gst) || 0,
      isFree: isFree === 'true' || isFree === true,
      minShopAmount: parseNumber(minShopAmount) || 0,
      barcode: barcode || null,
      skuCode: skuCode || null,
      minStockAlert: parseNumber(minStockAlert),
      storeId: (req.body.storeId && req.body.storeId !== 'null' && req.body.storeId !== '') ? req.body.storeId : req.user.storeId
    };

    // Generate display ID for item (VK-ITM-[CATEGORY]-[NUMBER])
    const categoryForId = await prisma.category.findUnique({ where: { id: finalCategoryId }, select: { name: true } });
    const catCode = (categoryForId?.name || 'GEN').substring(0, 4).toUpperCase();
    const displayId = await generateId({
      entity: 'ITM',
      tenantId: finalTenantId,
      storeId: itemData.storeId,
      categoryCode: catCode
    });
    itemData.displayId = displayId;

    const item = await prisma.product.create({
      data: itemData
    });

    // Handle initial stock if provided (using raw SQL to bypass stale client validation)
    const initialStock = parseInt(req.body.stock) || 0;
    if (initialStock > 0) {
      await prisma.$executeRawUnsafe(`UPDATE "Product" SET "stock" = ${initialStock} WHERE "id" = '${item.id}'`);
      
      // Also ensure at least one WarehouseInventory record exists if we have a warehouse
      let warehouse = await prisma.warehouse.findFirst({
        where: { tenantId: finalTenantId }
      });

      if (!warehouse) {
        warehouse = await prisma.warehouse.create({
          data: { tenantId: finalTenantId, name: 'Main Warehouse', location: 'Default' }
        });
      }

      if (warehouse) {
        const existingWi = await prisma.warehouseInventory.findFirst({
          where: { warehouseId: warehouse.id, productId: item.id }
        });
        if (existingWi) {
          await prisma.warehouseInventory.update({
            where: { id: existingWi.id },
            data: { quantity: initialStock }
          });
        } else {
          try {
            await prisma.warehouseInventory.create({
              data: {
                tenantId: finalTenantId,
                warehouseId: warehouse.id,
                productId: item.id,
                quantity: initialStock
              }
            });
          } catch (wiErr) {
            await prisma.warehouseInventory.updateMany({
              where: { warehouseId: warehouse.id, productId: item.id },
              data: { quantity: initialStock }
            });
          }
        }
      }
      
      console.log(`[Inventory] Initial stock set for ${item.name}: ${initialStock}`);
    }

    res.status(201).json({ message: 'Item created successfully', item });
  } catch (error) {
    console.error('❌ Create Item Error:', error);
    try {
      const fs = await import('fs');
      fs.appendFileSync('emergency_debug.log', `[${new Date().toISOString()}] CREATE ITEM ERROR:\n${error.message}\n${error.stack}\n\n`);
    } catch (e) {}
    res.status(500).json({ message: 'Error creating item', error: error.message });
  }
};

export const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      mrp,
      price,
      landingPrice,
      discount,
      status,
      image,
      gst,
      isFree,
      minShopAmount,
      unitId,
      unitValue,
      categoryId,
      subCategoryId,
      brandId,
      barcode,
      skuCode,
      storeId,
      stock,
      minStockAlert
    } = req.body;

    // Ensure we have a valid tenantId
    const finalTenantId = req.user?.tenantId || getTenantId() || 'VK001';

    // Handle image upload to Supabase if file is present
    let imageUrl = image || undefined;
    if (req.file) {
      imageUrl = await uploadToSupabase(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'product-images',
        'products'
      );
      if (!imageUrl) {
        return res.status(500).json({ message: 'Failed to upload image to storage' });
      }
    }

    const parseNumber = (val) => {
      if (val === undefined || val === null || val === '') return undefined;
      const num = parseFloat(val);
      return isNaN(num) ? undefined : num;
    };

    // Handle default relations logic similar to createItem
    let finalCategoryId = categoryId;
    let finalSubCategoryId = subCategoryId;
    let finalBrandId = brandId;

    if (finalCategoryId === 'default') {
      let defaultCategory = await prisma.category.findFirst({
        where: { tenantId: finalTenantId, name: 'Uncategorized', storeId: null }
      });
      if (!defaultCategory) {
        defaultCategory = await prisma.category.create({
          data: { name: 'Uncategorized', tenantId: finalTenantId, storeId: null }
        });
      }
      finalCategoryId = defaultCategory.id;
    }

    if (finalSubCategoryId === 'default') {
      let defaultSub = await prisma.subCategory.findFirst({
        where: { name: 'Uncategorized', categoryId: finalCategoryId || undefined, tenantId: finalTenantId }
      });
      if (!defaultSub && finalCategoryId) {
        defaultSub = await prisma.subCategory.create({
          data: { name: 'Uncategorized', categoryId: finalCategoryId, tenantId: finalTenantId }
        });
      }
      finalSubCategoryId = defaultSub?.id;
    }

    if (finalBrandId === 'default') {
      let defaultBrand = await prisma.brand.findFirst({
        where: { tenantId: finalTenantId, name: 'Unbranded' }
      });
      if (!defaultBrand) {
        defaultBrand = await prisma.brand.create({
          data: { name: 'Unbranded', tenantId: finalTenantId }
        });
      }
      finalBrandId = defaultBrand.id;
    }

    const updateData = {
      name,
      mrp: parseNumber(mrp),
      price: parseNumber(price),
      landingPrice: parseNumber(landingPrice),
      discount: parseNumber(discount),
      status,
      image: imageUrl,
      gst: parseNumber(gst),
      isFree: isFree === undefined ? undefined : (isFree === 'true' || isFree === true),
      minShopAmount: parseNumber(minShopAmount),
      unitId: unitId || undefined,
      unitValue: parseNumber(unitValue),
      categoryId: finalCategoryId || undefined,
      subCategoryId: finalSubCategoryId || undefined,
      brandId: finalBrandId || undefined,
      barcode: barcode === undefined ? undefined : (barcode || null),
      skuCode: skuCode === undefined ? undefined : (skuCode || null),
      minStockAlert: parseNumber(minStockAlert),
      storeId: (storeId && storeId !== 'null' && storeId !== '') ? storeId : undefined
    };

    const item = await prisma.product.update({
      where: { id },
      data: updateData
    });

    // Handle manual stock override if provided
    if (stock !== undefined) {
      const newStock = parseInt(stock) || 0;
      await prisma.$executeRawUnsafe(`UPDATE "Product" SET "stock" = ${newStock} WHERE "id" = '${id}'`);
      
      // Ensure a warehouse exists for this tenant
      let warehouse = await prisma.warehouse.findFirst({
        where: { tenantId: finalTenantId }
      });

      if (!warehouse) {
        warehouse = await prisma.warehouse.create({
          data: { tenantId: finalTenantId, name: 'Main Warehouse', location: 'Default' }
        });
      }

      // Upsert WarehouseInventory to ensure the 'getItems' mapping reflects the override
      const existingWi = await prisma.warehouseInventory.findFirst({
        where: { warehouseId: warehouse.id, productId: id }
      });
      if (existingWi) {
        await prisma.warehouseInventory.update({
          where: { id: existingWi.id },
          data: { quantity: newStock }
        });
      } else {
        try {
          await prisma.warehouseInventory.create({
            data: {
              tenantId: finalTenantId,
              warehouseId: warehouse.id,
              productId: id,
              quantity: newStock
            }
          });
        } catch (wiErr) {
          await prisma.warehouseInventory.updateMany({
            where: { warehouseId: warehouse.id, productId: id },
            data: { quantity: newStock }
          });
        }
      }

      // If there are other warehouses, set them to 0 to maintain consistency
      await prisma.warehouseInventory.updateMany({
        where: { 
          productId: id, 
          warehouseId: { not: warehouse.id },
          tenantId: finalTenantId
        },
        data: { quantity: 0 }
      });

      console.log(`[Inventory] Manual stock override for ${item.name}: ${newStock}`);
    }

    res.json({ message: 'Item updated successfully', item });
  } catch (error) {
    console.error('❌ Update Item Error:', error);
    try {
      const fs = await import('fs');
      fs.appendFileSync('emergency_debug.log', `[${new Date().toISOString()}] UPDATE ITEM ERROR:\n${error.message}\n${error.stack}\n\n`);
    } catch (e) {}
    res.status(500).json({ message: 'Error updating item', error: error.message });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await prisma.product.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ message: 'Item not found' });

    // Cascade delete all child records in dependency order to avoid foreign key constraints
    const where = { productId: id };
    
    await prisma.cartItem.deleteMany({ where });
    const orderItemIds = (await prisma.orderItem.findMany({ where, select: { id: true } })).map(item => item.id);
    await prisma.return.deleteMany({ where: { orderItemId: { in: orderItemIds } } });
    await prisma.orderItem.deleteMany({ where });
    await prisma.stockTransaction.deleteMany({ where });
    await prisma.vehicleStock.deleteMany({ where });
    await prisma.warehouseInventory.deleteMany({ where });
    await prisma.productVariant.deleteMany({ where });
    await prisma.refillItem.deleteMany({ where });
    await prisma.stockAuditItem.deleteMany({ where });
    await prisma.vendorItemMapping.deleteMany({ where });
    await prisma.purchaseOrderItem.deleteMany({ where });
    await prisma.goodsReceiptItem.deleteMany({ where });
    await prisma.purchaseInvoiceItem.deleteMany({ where });
    await prisma.damageEntry.deleteMany({ where });
    await prisma.procurementStockLedger.deleteMany({ where });

    // Finally delete the product
    await prisma.product.delete({ where: { id } });

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting item:', error.message);
    res.status(500).json({ message: 'Error deleting item', error: error.message });
  }
};

// Stock Loading (Morning)
export const loadStock = async (req, res) => {
  try {
    const { vehicleId, items } = req.body;

    if (!vehicleId) {
      return res.status(400).json({ message: 'Vehicle ID is required' });
    }

    // 0. Deduplicate items by productId and sum quantities to prevent SQL conflicts
    const uniqueItemsMap = new Map();
    for (const item of items) {
      const q = parseFloat(item.quantity) || 0;
      if (q <= 0) continue;
      const existing = uniqueItemsMap.get(item.productId) || 0;
      uniqueItemsMap.set(item.productId, existing + q);
    }
    const processedItemsList = Array.from(uniqueItemsMap.entries()).map(([productId, quantity]) => ({ productId, quantity }));

    if (processedItemsList.length === 0) {
      return res.status(400).json({ message: 'No valid items to load' });
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true, storeId: true, vehicleNumber: true, displayId: true }
    });

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    const storeId = vehicle.storeId;

    // 1. Pre-fetch products WITH their warehouse inventories
    const productIds = processedItemsList.map(i => i.productId);
    const products = await prisma.product.findMany({ 
      where: { id: { in: productIds } },
      include: { WarehouseInventory: true }
    });

    const productMap = new Map(products.map(p => [p.id, p]));

    // 2. Validate stock availability for all items before starting transaction
    for (const item of processedItemsList) {
      const q = item.quantity;
      
      const prod = productMap.get(item.productId);
      if (!prod) throw new Error(`Product ${item.productId} not found`);

      // Calculate effective stock exactly like getItems does
      const totalWarehouseQty = (prod.WarehouseInventory || []).reduce((acc, curr) => acc + curr.quantity, 0);
      const effectiveStock = totalWarehouseQty > 0 ? totalWarehouseQty : (prod.stock || 0);

      if (Math.floor(q) > effectiveStock) {
        throw new Error(`VALIDATION:Insufficient stock for ${prod.name}. Available: ${effectiveStock}`);
      }
    }

    await prisma.$transaction(async (tx) => {
      const transactionsData = [];
      const vehicleStockValues = [];
      const productUpdateValues = [];
      const wiUpdateValues = [];
      for (const item of processedItemsList) {
        const q = item.quantity;
        const cleanQty = Math.floor(q);

        console.log(`[LoadStock] Checking product: ${item.productId}`);
        const prod = await tx.product.findUnique({ where: { id: item.productId } });
        if (!prod) {
          throw new Error(`VALIDATION:Product ${item.productId} not found`);
        }
        if (Math.floor(q) > (prod.stock || 0)) {
          throw new Error(`VALIDATION:Insufficient stock for ${prod.name}. Available: ${prod.stock}`);
        }

        console.log(`[LoadStock] Creating transaction record`);
        await tx.stockTransaction.create({
          data: {
            tenantId: req.user.tenantId,
            storeId,
            userId: req.user.id,
            type: 'LOAD',
            vehicleId,
            productId: item.productId,
            quantity: q
          }
        });

        console.log(`[LoadStock] Updating vehicle stock (upsert)`);
        await tx.vehicleStock.upsert({
          where: {
            vehicleId_productId: { vehicleId, productId: item.productId }
          },
          update: {
            quantity: { increment: Math.floor(q) }
          },
          create: {
            tenantId: req.user.tenantId,
            storeId,
            vehicleId,
            productId: item.productId,
            quantity: Math.floor(q),
            openingQuantity: Math.floor(q)
          }
        });

        console.log(`[LoadStock] Decrementing WarehouseInventory`);
        const wi = await tx.warehouseInventory.findFirst({
          where: { productId: item.productId, tenantId: req.user.tenantId }
        });
        
        if (wi) {
          await tx.warehouseInventory.update({
            where: { id: wi.id },
            data: { quantity: { decrement: cleanQty } }
          });
        } else {
          // Fallback if no WarehouseInventory record exists (rare case)
          // Create one so future queries find it
          let warehouse = await tx.warehouse.findFirst({ where: { tenantId: req.user.tenantId } });
          if (!warehouse) {
            warehouse = await tx.warehouse.create({
              data: { tenantId: req.user.tenantId, name: 'Main Warehouse', location: 'Default' }
            });
          }
          await tx.warehouseInventory.create({
            data: {
              tenantId: req.user.tenantId,
              warehouseId: warehouse.id,
              productId: item.productId,
              quantity: -cleanQty
            }
          });
        }

        console.log(`[LoadStock] Syncing Product.stock`);
        const allWi = await tx.warehouseInventory.findMany({
          where: { productId: item.productId, tenantId: req.user.tenantId }
        });
        const totalQty = allWi.reduce((acc, curr) => acc + curr.quantity, 0);
        
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: totalQty }
        });
        console.log(`[LoadStock] Item Success`);
      }
    }, {
      maxWait: 10000,
      timeout: 30000
    });

    res.json({ message: 'Stock loaded successfully' });

    // Find the user assigned to this vehicle to track as targetUserId
    const assignedUser = await prisma.user.findFirst({
      where: { assignedVehicleId: vehicleId, status: 'ACTIVE' },
      select: { id: true }
    });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId,
      action: 'STOCK_LOADING',
      details: `Loaded morning stock for vehicle ${vehicle?.vehicleNumber || vehicle?.displayId || vehicleId}. Total items: ${items.length}`,
      targetUserId: assignedUser?.id,
      metadata: { vehicleId, itemCount: items.length }
    });

    sendNotification({
      vehicleIds: [vehicleId],
      roles: ['ADMIN'],
      title: 'Stock Loaded',
      message: `New stock has been loaded to vehicle.`,
      type: 'inventory',
      priority: 'low',
      metadata: { vehicleId }
    });
    } catch (error) {
    console.error('❌ loadStock Crash:', error);
    
    const errorMessage = error.message || '';
    
    // 1. Handle our custom business logic validation errors
    if (errorMessage.match(/VALIDATION:/i)) {
      const parts = errorMessage.split(/VALIDATION:/i);
      const cleanMessage = parts[parts.length - 1].trim();
      return res.status(400).json({ message: cleanMessage });
    }

    res.status(500).json({ 
      message: 'Error loading stock', 
      error: errorMessage,
      code: error.code
    });
  }
};

export const getLoadHistory = async (req, res) => {
  try {
    const { storeFilterId, startDate, endDate } = req.query;

    const whereClause = {
      tenantId: req.user.tenantId,
      type: 'LOAD'
    };

    if (storeFilterId) whereClause.storeId = storeFilterId;
    else if (req.user.storeId) whereClause.storeId = req.user.storeId;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      whereClause.date = { gte: start, lte: end };
    }

    const history = await prisma.stockTransaction.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      take: 500
    });

    const allProductIds = [...new Set(history.map(item => item.productId).filter(Boolean))];
    const products = allProductIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: allProductIds } },
          select: { id: true, name: true, sku: true }
        })
      : [];
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    const allVehicleIds = [...new Set(history.map(item => item.vehicleId).filter(Boolean))];
    const vehicles = allVehicleIds.length > 0
      ? await prisma.vehicle.findMany({
          where: { id: { in: allVehicleIds } },
          select: { id: true, vehicleNumber: true, displayId: true }
        })
      : [];
    const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));

    const allUserIds = [...new Set(history.map(item => item.userId).filter(Boolean))];
    const users = allUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: allUserIds } },
          select: { id: true, name: true, role: true }
        })
      : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const processedHistory = history.map(item => ({
      ...item,
      product: productMap[item.productId] || null,
      vehicle: vehicleMap[item.vehicleId] || null,
      user: userMap[item.userId] || null
    }));

    res.json(processedHistory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching load history', error: error.message });
  }
};

// Stock Return (Evening)
export const returnStock = async (req, res) => {
  try {
    const { vehicleId, items } = req.body;
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true, storeId: true, vehicleNumber: true, displayId: true }
    });

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    const storeId = vehicle.storeId;

    // 1. Pre-fetch warehouse inventories for bulk updates
    const productIds = items.map(i => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { WarehouseInventory: true }
    });
    const productMap = new Map(products.map(p => [p.id, p]));

    await prisma.$transaction(async (tx) => {
      const transactionsData = [];
      const vehicleUpdateValues = [];
      const productUpdateValues = [];
      const wiUpdateValues = [];

      for (const item of items) {
        const q = parseFloat(item.quantity);
        if (isNaN(q) || q <= 0) continue;
        const cleanQty = Math.floor(q);
        
        const prod = productMap.get(item.productId);

        // Transaction record
        transactionsData.push({
          tenantId: req.user.tenantId,
          storeId,
          userId: req.user.id,
          type: 'RETURN',
          vehicleId,
          productId: item.productId,
          quantity: cleanQty
        });

        // 🆕 Decrement Vehicle Stock
        const existingVStock = await tx.vehicleStock.findUnique({
          where: { vehicleId_productId: { vehicleId, productId: item.productId } }
        });
        const newOpening = Math.max(0, (existingVStock?.openingQuantity || 0) - cleanQty);
        const newQuantity = Math.max(0, (existingVStock?.quantity || 0) - cleanQty);

        await tx.vehicleStock.upsert({
          where: { vehicleId_productId: { vehicleId, productId: item.productId } },
          update: { 
            quantity: newQuantity,
            openingQuantity: newOpening
          },
          create: {
            tenantId: req.user.tenantId,
            storeId,
            vehicleId,
            productId: item.productId,
            quantity: 0,
            openingQuantity: 0
          }
        });

        // 🆕 Update VehicleStockAssignment: append returned stock back to VSM pool
        const vsa = await tx.vehicleStockAssignment.findFirst({
          where: {
            productId: item.productId,
            vehicleId,
            status: { not: 'CLOSED' }
          }
        }) || await tx.vehicleStockAssignment.findFirst({
          where: {
            productId: item.productId,
            vehicleId
          }
        });

        if (vsa) {
          const vsaNewQty = (vsa.quantity || 0) + cleanQty;
          await tx.vehicleStockAssignment.update({
            where: { id: vsa.id },
            data: {
              quantity: vsaNewQty,
              returnedQuantity: (vsa.returnedQuantity || 0) + cleanQty,
              status: 'OPEN'
            }
          });
        } else {
          await tx.vehicleStockAssignment.create({
            data: {
              id: crypto.randomUUID(),
              vehicleId,
              productId: item.productId,
              openingQuantity: cleanQty,
              quantity: cleanQty,
              returnedQuantity: cleanQty,
              status: 'OPEN',
              tenantId: req.user.tenantId || 'VK001',
              storeId
            }
          });
        }

        // 🆕 Fall returned stock into Vehicle Stock Management: Increment POS_STORE ChannelInventory
        const posInv = await tx.channelInventory.findFirst({
          where: {
            productId: item.productId,
            channel: 'POS_STORE'
          }
        });

        if (posInv) {
          await tx.channelInventory.update({
            where: { id: posInv.id },
            data: {
              quantity: (posInv.quantity || 0) + cleanQty
            }
          });
        } else {
          await tx.channelInventory.create({
            data: {
              id: crypto.randomUUID(),
              channel: 'POS_STORE',
              warehouseId: storeId,
              productId: item.productId,
              productVariantId: null,
              quantity: cleanQty,
              channelPrice: prod?.price || 0,
              isActive: true
            }
          });
        }
        
        // 🆕 INCREMENT WarehouseInventory
        const wi = await tx.warehouseInventory.findFirst({
          where: { productId: item.productId, tenantId: req.user.tenantId }
        });

        if (wi) {
          await tx.warehouseInventory.update({
            where: { id: wi.id },
            data: { quantity: { increment: cleanQty } }
          });
        } else {
          // If no WarehouseInventory record exists, create one
          let warehouse = await tx.warehouse.findFirst({ where: { tenantId: req.user.tenantId } });
          if (!warehouse) {
            warehouse = await tx.warehouse.create({
              data: { tenantId: req.user.tenantId, name: 'Main Warehouse', location: 'Default' }
            });
          }
          await tx.warehouseInventory.create({
            data: {
              tenantId: req.user.tenantId,
              warehouseId: warehouse.id,
              productId: item.productId,
              quantity: cleanQty
            }
          });
        }

        // 🆕 SYNC Product.stock (Source of Truth is now the sum of all WarehouseInventory)
        const allWi = await tx.warehouseInventory.findMany({
          where: { productId: item.productId, tenantId: req.user.tenantId }
        });
        const totalQty = allWi.reduce((acc, curr) => acc + curr.quantity, 0);
        
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: totalQty }
        });
      }
    }, {
      maxWait: 10000,
      timeout: 30000
    });

    res.json({ message: 'Stock returned successfully' });

    // Find the user assigned to this vehicle to track as targetUserId
    const assignedUser = await prisma.user.findFirst({
      where: { assignedVehicleId: vehicleId, status: 'ACTIVE' },
      select: { id: true }
    });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId,
      action: 'STOCK_RETURNING',
      details: `Returned evening stock for vehicle ${vehicle?.vehicleNumber || vehicle?.displayId || vehicleId}. Total items: ${items.length}`,
      targetUserId: assignedUser?.id,
      metadata: { vehicleId, itemCount: items.length }
    });

    sendNotification({
      vehicleIds: [vehicleId],
      roles: ['ADMIN'],
      title: 'Stock Returned',
      message: `Stock has been returned from vehicle.`,
      type: 'inventory',
      priority: 'low',
      metadata: { vehicleId }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error returning stock', error: error.message });
  }
};

export const getReturnHistory = async (req, res) => {
  try {
    const { storeFilterId, startDate, endDate } = req.query;

    const whereClause = {
      tenantId: req.user.tenantId,
      type: 'RETURN'
    };

    if (storeFilterId) whereClause.storeId = storeFilterId;
    else if (req.user.storeId) whereClause.storeId = req.user.storeId;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      whereClause.date = { gte: start, lte: end };
    }

    const history = await prisma.stockTransaction.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      take: 500
    });

    const allProductIds = [...new Set(history.map(item => item.productId).filter(Boolean))];
    const products = allProductIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: allProductIds } },
          select: { id: true, name: true, sku: true }
        })
      : [];
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    const allVehicleIds = [...new Set(history.map(item => item.vehicleId).filter(Boolean))];
    const vehicles = allVehicleIds.length > 0
      ? await prisma.vehicle.findMany({
          where: { id: { in: allVehicleIds } },
          select: { id: true, vehicleNumber: true, displayId: true }
        })
      : [];
    const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));

    const allUserIds = [...new Set(history.map(item => item.userId).filter(Boolean))];
    const users = allUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: allUserIds } },
          select: { id: true, name: true, role: true }
        })
      : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const processedHistory = history.map(item => ({
      ...item,
      product: productMap[item.productId] || null,
      vehicle: vehicleMap[item.vehicleId] || null,
      user: userMap[item.userId] || null
    }));

    res.json(processedHistory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching return history', error: error.message });
  }
};

export const bulkCreateItems = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || getTenantId() || 'VK001';
    const products = req.body;
    if (!Array.isArray(products)) {
      return res.status(400).json({ message: 'Products data must be an array' });
    }

    const createdItems = [];

    // Ensure default relations exist
    let defaultCategory = await prisma.category.findFirst({
      where: { tenantId, name: 'Uncategorized', storeId: null }
    });
    if (!defaultCategory) {
      defaultCategory = await prisma.category.create({
        data: { name: 'Uncategorized', tenantId, storeId: null }
      });
    }

    const defaultBrand = await prisma.brand.upsert({
      where: { tenantId_name: { tenantId, name: 'Unbranded' } },
      update: {},
      create: { name: 'Unbranded', tenantId }
    });

    let defaultSub = await prisma.subCategory.findFirst({
      where: { name: 'Uncategorized', categoryId: defaultCategory.id, tenantId }
    });
    if (!defaultSub) {
      defaultSub = await prisma.subCategory.create({
        data: { name: 'Uncategorized', categoryId: defaultCategory.id, tenantId }
      });
    }

    // 1. Pre-fetch all existing relations for this tenant to populate caches instantly
    const [existingCats, existingUnits] = await Promise.all([
      prisma.category.findMany({ where: { tenantId, storeId: null } }),
      prisma.unit.findMany({ where: { tenantId, storeId: null } })
    ]);

    // Populate caches with existing data
    existingCats.forEach(c => catCache.set(c.name.trim(), c.id));
    existingUnits.forEach(u => unitCache.set(u.type.trim(), u.id));

    // Pre-fetch all local subcategories
    const existingSubs = await prisma.subCategory.findMany({
      where: { categoryId: { in: existingCats.map(c => c.id) }, tenantId }
    });
    existingSubs.forEach(s => subCache.set(`${s.categoryId}_${s.name.trim()}`, s.id));

    // 2. Pre-process relations in high-speed batches to avoid individual DB Round-Trips
    const uniqueCatNames = [...new Set(products.filter(p => p.categoryName).map(p => String(p.categoryName).trim()))];
    const uniqueUnitTypes = [...new Set(products.filter(p => p.unitType).map(p => String(p.unitType).trim()))];

    // Find and bulk-create missing Categories
    const missingCats = uniqueCatNames.filter(name => !catCache.has(name));
    if (missingCats.length > 0) {
      await prisma.category.createMany({
        data: missingCats.map(name => ({ tenantId, name })),
        skipDuplicates: true
      });
      const updatedCats = await prisma.category.findMany({ where: { tenantId, name: { in: missingCats }, storeId: null } });
      updatedCats.forEach(c => catCache.set(c.name.trim(), c.id));
    }

    // Now resolve Sub-Categories
    const subPairs = [];
    products.forEach(p => {
      if (p.categoryName && p.subCategoryName) {
        const cId = catCache.get(String(p.categoryName).trim());
        if (cId) subPairs.push({ categoryId: cId, name: String(p.subCategoryName).trim() });
      }
    });
    const uniqueSubPairs = Array.from(new Set(subPairs.map(s => `${s.categoryId}|${s.name}`)))
      .map(str => ({ categoryId: str.split('|')[0], name: str.split('|')[1] }));

    const missingSubs = uniqueSubPairs.filter(s => !subCache.has(`${s.categoryId}_${s.name}`));
    if (missingSubs.length > 0) {
      await prisma.subCategory.createMany({
        data: missingSubs.map(s => ({ ...s, tenantId })),
        skipDuplicates: true
      });
      const updatedSubs = await prisma.subCategory.findMany({
        where: { tenantId, name: { in: missingSubs.map(s => s.name) }, categoryId: { in: missingSubs.map(s => s.categoryId) } }
      });
      updatedSubs.forEach(s => subCache.set(`${s.categoryId}_${s.name.trim()}`, s.id));
    }

    // Resolve missing Units
    const missingUnits = uniqueUnitTypes.filter(type => !unitCache.has(type));
    if (missingUnits.length > 0) {
      await prisma.unit.createMany({
        data: missingUnits.map(type => ({ tenantId, name: type, type })),
        skipDuplicates: true
      });
      const updatedUnits = await prisma.unit.findMany({ where: { tenantId, type: { in: missingUnits }, storeId: null } });
      updatedUnits.forEach(u => unitCache.set(u.type.trim(), u.id));
    }

    const parseNumber = (val) => {
      if (val === undefined || val === null || val === '') return undefined;
      const num = parseFloat(val);
      return isNaN(num) ? undefined : num;
    };

    console.log(`[TurboBulk] Final Phase: Mapping ${products.length} products...`);
    const itemDataArray = [];

    for (const prod of products) {
      if (!prod.name) continue;

      let targetCategoryId = defaultCategory.id;
      if (prod.categoryName) {
        targetCategoryId = catCache.get(String(prod.categoryName).trim()) || defaultCategory.id;
      }

      let targetSubCategoryId = defaultSub.id;
      if (prod.subCategoryName && targetCategoryId) {
        targetSubCategoryId = subCache.get(`${targetCategoryId}_${String(prod.subCategoryName).trim()}`) || defaultSub.id;
      }

      let targetUnitId = null;
      if (prod.unitType) {
        targetUnitId = unitCache.get(String(prod.unitType).trim()) || null;
      }

      itemDataArray.push({
        tenantId,
        storeId: req.user?.storeId || null,
        name: prod.name,
        description: prod.description || '',
        mrp: parseNumber(prod.mrp),
        price: parseNumber(prod.price) || 0,
        landingPrice: parseNumber(prod.landingPrice),
        discount: parseNumber(prod.discount),
        status: prod.status || 'ACTIVE',
        categoryId: targetCategoryId,
        subCategoryId: targetSubCategoryId,
        brandId: prod.brandId || defaultBrand.id,
        unitId: targetUnitId,
        unitValue: parseNumber(prod.unitValue),
        gst: parseNumber(prod.gst) || 0,
        isFree: prod.isFree === true || prod.isFree === 'true',
        minShopAmount: parseNumber(prod.minShopAmount) || 0,
      });
    }
    
    let insertCount = 0;
    if(itemDataArray.length > 0) {
       const chunkSize = 500;
       for (let i = 0; i < itemDataArray.length; i += chunkSize) {
         const chunk = itemDataArray.slice(i, i + chunkSize);
         const result = await prisma.product.createMany({
            data: chunk,
            skipDuplicates: true
         });
         insertCount += result.count;
       }
    }

    res.status(201).json({ message: `Successfully created ${insertCount} items`, count: insertCount });
  } catch (error) {
    console.error('❌ Bulk Create Item Error:', error);
    res.status(500).json({ message: 'Error bulk creating items', error: error.message });
  }
};

export const importZipInventory = async (req, res) => {
  const tempDir = path.join('uploads', 'tmp', `zip-${Date.now()}`);
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No ZIP file uploaded' });
    }

    const tenantId = req.user?.tenantId || getTenantId() || 'VK001';
    const storeId = req.user?.storeId || null;

    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Extract ZIP
    console.log(`[ZIP Import] Processing file: ${req.file.originalname} for Tenant: ${tenantId}`);
    const zip = new AdmZip(req.file.buffer);
    zip.extractAllTo(tempDir, true);

    // Find Excel file and Images folder
    let files = fs.readdirSync(tempDir);
    console.log(`[ZIP Import] Extracted ${files.length} items to ${tempDir}`);
    
    // If there's only one item and it's a directory, go inside it
    if (files.length === 1 && fs.statSync(path.join(tempDir, files[0])).isDirectory()) {
      const subDir = path.join(tempDir, files[0]);
      console.log(`[ZIP Import] Single top-level directory detected: ${files[0]}. Descending...`);
      // Copy contents back to tempDir or just adjust tempDir?
      // Adjusting paths is easier
      const subFiles = fs.readdirSync(subDir);
      subFiles.forEach(f => {
        fs.renameSync(path.join(subDir, f), path.join(tempDir, f));
      });
      files = fs.readdirSync(tempDir);
    }

    const excelFile = files.find(f => f.endsWith('.xlsx') || f.endsWith('.xls') || f.endsWith('.csv'));
    const imageFolder = files.find(f => f.toLowerCase() === 'images' || f.toLowerCase() === 'product_images');
    const imageFolderPath = imageFolder ? path.join(tempDir, imageFolder) : tempDir;

    if (!excelFile) {
      throw new Error('No Excel/CSV file found in ZIP');
    }

    // Parse Excel
    const excelFilePath = path.join(tempDir, excelFile);
    const fileBuffer = fs.readFileSync(excelFilePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (data.length === 0) {
      throw new Error('Excel file is empty');
    }

    // Pre-create relations (similar to bulkCreateItems)
    // Ensure default relations exist
    let defaultCategory = await prisma.category.findFirst({
      where: { tenantId, name: 'Uncategorized', storeId: null }
    });
    if (!defaultCategory) {
      defaultCategory = await prisma.category.create({
        data: { name: 'Uncategorized', tenantId, storeId: null }
      });
    }

    const defaultBrand = await prisma.brand.upsert({
      where: { tenantId_name: { tenantId, name: 'Unbranded' } },
      update: {},
      create: { name: 'Unbranded', tenantId }
    });

    let defaultSub = await prisma.subCategory.findFirst({
      where: { name: 'Uncategorized', categoryId: defaultCategory.id, tenantId }
    });
    if (!defaultSub) {
      defaultSub = await prisma.subCategory.create({
        data: { name: 'Uncategorized', categoryId: defaultCategory.id, tenantId }
      });
    }

    // Populate Caches
    const [existingCats, existingUnits] = await Promise.all([
      prisma.category.findMany({ where: { tenantId, storeId: null } }),
      prisma.unit.findMany({ where: { tenantId, storeId: null } })
    ]);
    existingCats.forEach(c => catCache.set(c.name.trim(), c.id));
    existingUnits.forEach(u => unitCache.set(u.type.trim(), u.id));

    const existingSubs = await prisma.subCategory.findMany({
      where: { categoryId: { in: existingCats.map(c => c.id) }, tenantId }
    });
    existingSubs.forEach(s => subCache.set(`${s.categoryId}_${s.name.trim()}`, s.id));

    const parseNumber = (val) => {
      if (val === undefined || val === null || val === '') return undefined;
      const num = parseFloat(val);
      return isNaN(num) ? undefined : num;
    };

    let successCount = 0;
    let errorCount = 0;

    for (const row of data) {
      try {
        const keys = Object.keys(row);
        const findKey = (search) => keys.find(k => k.toLowerCase().includes(search.toLowerCase()));

        const nameKey = findKey('product name') || findKey('name') || keys[0];
        if (!row[nameKey]) continue;

        const imgFilenameKey = findKey('image filename') || findKey('image') || findKey('filename');
        const categoryKey = findKey('category');
        const subCategoryKey = findKey('sub-category') || findKey('sub category');
        const unitTypeKey = findKey('unit type');
        const statusKey = findKey('status');

        let statusValue = 'ACTIVE';
        if (statusKey && row[statusKey] !== undefined && row[statusKey] !== null && String(row[statusKey]).trim() !== '') {
          const sStr = String(row[statusKey]).trim().toUpperCase();
          if (sStr === 'INACTIVE' || sStr === 'FALSE' || sStr === '0' || sStr === 'DISABLED' || sStr === 'NO') {
            statusValue = 'INACTIVE';
          } else if (sStr === 'ACTIVE' || sStr === 'TRUE' || sStr === '1' || sStr === 'ENABLED' || sStr === 'YES') {
            statusValue = 'ACTIVE';
          } else {
            statusValue = sStr.includes('INACTIVE') ? 'INACTIVE' : 'ACTIVE';
          }
        }
        
        let imageUrl = null;
        if (imgFilenameKey && row[imgFilenameKey]) {
          const imgPath = path.join(imageFolderPath, row[imgFilenameKey]);
          if (fs.existsSync(imgPath)) {
            const fileBuffer = fs.readFileSync(imgPath);
            const mimeType = row[imgFilenameKey].toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
            imageUrl = await uploadToSupabase(fileBuffer, row[imgFilenameKey], mimeType, 'product-images', 'products');
          }
        }

        let categoryId = defaultCategory.id;
        if (categoryKey && row[categoryKey]) {
          const catName = String(row[categoryKey]).trim();
          if (catCache.has(catName)) {
            categoryId = catCache.get(catName);
          } else {
            const newCat = await prisma.category.create({ data: { tenantId, name: catName } });
            catCache.set(catName, newCat.id);
            categoryId = newCat.id;
          }
        }

        let subCategoryId = defaultSub.id;
        if (subCategoryKey && row[subCategoryKey] && categoryId) {
          const subName = String(row[subCategoryKey]).trim();
          const cacheKey = `${categoryId}_${subName}`;
          if (subCache.has(cacheKey)) {
            subCategoryId = subCache.get(cacheKey);
          } else {
            const newSub = await prisma.subCategory.create({ data: { tenantId, categoryId, name: subName } });
            subCache.set(cacheKey, newSub.id);
            subCategoryId = newSub.id;
          }
        }

        let unitId = null;
        if (unitTypeKey && row[unitTypeKey]) {
          const unitType = String(row[unitTypeKey]).trim();
          if (unitCache.has(unitType)) {
            unitId = unitCache.get(unitType);
          } else {
            const newUnit = await prisma.unit.create({ data: { tenantId, type: unitType, name: unitType } });
            unitCache.set(unitType, newUnit.id);
            unitId = newUnit.id;
          }
        }

        const catCode = (row[categoryKey] || 'GEN').toString().substring(0, 4).toUpperCase();
        const displayId = await generateId({ entity: 'ITM', tenantId, storeId, categoryCode: catCode });

        const isReturnableKey = findKey('isreturnable') || findKey('returnable');
        const isCancelableKey = findKey('iscancelable') || findKey('cancelable') || findKey('cancel-able');
        const isCodAllowedKey = findKey('iscodallowed') || findKey('codallowed') || findKey('cod allowed');

        const parseBoolVal = (val, defaultVal = false) => {
          if (val === undefined || val === null || String(val).trim() === '') return defaultVal;
          if (typeof val === 'boolean') return val;
          const s = String(val).trim().toLowerCase();
          if (['true', '1', 'yes', 'y', 'enabled'].includes(s)) return true;
          if (['false', '0', 'no', 'n', 'disabled'].includes(s)) return false;
          return defaultVal;
        };

        await prisma.product.create({
          data: {
            tenantId,
            storeId,
            displayId,
            name: row[nameKey],
            description: row[findKey('description')] || '',
            mrp: parseNumber(row[findKey('mrp')]),
            price: parseNumber(row[findKey('selling price') || findKey('price')]) || 0,
            landingPrice: parseNumber(row[findKey('landing price') || findKey('purchase price')]),
            discount: parseNumber(row[findKey('discount')]),
            gst: parseNumber(row[findKey('gst')]) || 0,
            unitValue: parseNumber(row[findKey('unit value')]),
            unitId,
            categoryId,
            subCategoryId,
            brandId: defaultBrand.id,
            image: imageUrl,
            status: statusValue,
            isReturnable: isReturnableKey ? parseBoolVal(row[isReturnableKey], false) : false,
            isCancelable: isCancelableKey ? parseBoolVal(row[isCancelableKey], false) : false,
            isCodAllowed: isCodAllowedKey ? parseBoolVal(row[isCodAllowedKey], true) : false
          }
        });
        successCount++;
      } catch (err) {
        console.error(`Error importing row: ${row.name}`, err);
        errorCount++;
      }
    }

    res.json({ message: 'ZIP Import complete', success: successCount, failed: errorCount });
  } catch (error) {
    console.error('❌ ZIP Import Error:', error);
    try {
      fs.appendFileSync('zip_import_error.log', `[${new Date().toISOString()}] ERROR: ${error.message}\nSTACK: ${error.stack}\n\n`);
    } catch (e) {}
    res.status(500).json({ message: error.message });
  } finally {
    // Cleanup
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (e) {}
  }
};

export const bulkDeleteItems = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Product IDs must be provided as a non-empty array' });
    }

    // Cascade delete all child records for these items in dependency order
    await prisma.orderItem.deleteMany({ where: { productId: { in: ids } } });
    await prisma.stockTransaction.deleteMany({ where: { productId: { in: ids } } });
    await prisma.vehicleStock.deleteMany({ where: { productId: { in: ids } } });
    await prisma.warehouseInventory.deleteMany({ where: { productId: { in: ids } } });
    await prisma.productVariant.deleteMany({ where: { productId: { in: ids } } });
    await prisma.refillItem.deleteMany({ where: { productId: { in: ids } } });
    const deleteResult = await prisma.product.deleteMany({ where: { id: { in: ids } } });

    res.json({ message: `Successfully deleted ${deleteResult.count} items`, count: deleteResult.count });
  } catch (error) {
    console.error('❌ Bulk Delete Item Error:', error);
    res.status(500).json({ message: 'Error bulk deleting items', error: error.message });
  }
};

export const getVehicleInventory = async (req, res) => {
  try {
    const { id } = req.params; // vehicleId
    const inventory = await prisma.vehicleStock.findMany({
      where: { 
        vehicleId: id,
        tenantId: req.user.tenantId,
      }
    });

    // Separately fetch products to avoid required relation validation crash
    const allProductIds = [...new Set(
      inventory.map(item => item.productId).filter(Boolean)
    )];
    const products = allProductIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: allProductIds } },
          include: { 
            category: true,
            brand: true,
            subCategory: true
          }
        })
      : [];
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    const processedInventory = inventory.map(item => {
      const product = productMap[item.productId];
      return {
        ...item,
        product: product || {
          name: 'Unknown Product',
          sku: 'N/A',
          category: null,
          brand: null,
          subCategory: null
        }
      };
    });

    res.json(processedInventory);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vehicle inventory', error: error.message });
  }
};

export const auditVehicleStock = async (req, res) => {
  try {
    const { id } = req.params; // vehicleId
    const { items } = req.body; // items = [{ productId, quantity }]
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      select: { id: true, storeId: true, vehicleNumber: true, displayId: true }
    });
    const storeId = vehicle?.storeId;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ message: 'Invalid items data' });
    }

    console.log('Starting Optimized Audit for vehicle:', id);
    
    // Pre-fetch all current stocks to avoid N+1 queries in transaction
    const existingStocks = await prisma.vehicleStock.findMany({
      where: { 
        vehicleId: id,
        productId: { in: items.map(i => i.productId) }
      }
    });
    // Create a map for O(1) lookup
    const stockMap = new Map(existingStocks.map(s => [s.productId, s.quantity]));

    await prisma.$transaction(async (tx) => {
      // 1. Create a parent Audit record
      const audit = await tx.stockAudit.create({
        data: {
          tenantId: req.user.tenantId,
          storeId,
          vehicleId: id,
          userId: req.user.id,
          remark: req.body.remark || 'Manual Audit'
        }
      });

      // 2. Prepare data for batch operations
      const auditItemsData = [];
      const transactionsData = [];
      const stockUpsertValues = [];
      
      for (const item of items) {
        const q = parseFloat(item.quantity);
        if (isNaN(q)) continue;

        const currentQty = stockMap.get(item.productId) || 0;
        const cleanQty = Math.floor(q);

        auditItemsData.push({
          tenantId: req.user.tenantId,
          auditId: audit.id,
          productId: item.productId,
          oldQuantity: Math.floor(currentQty),
          newQuantity: cleanQty
        });

        transactionsData.push({
          tenantId: req.user.tenantId,
          storeId,
          type: 'AUDIT',
          vehicleId: id,
          productId: item.productId,
          quantity: cleanQty,
          date: new Date()
        });

        // Prepare raw values for bulk upsert
        const randomId = `vstk_${Math.random().toString(36).substring(2, 15)}`;
        const storeVal = storeId ? `'${storeId}'` : 'NULL';
        stockUpsertValues.push(`('${randomId}', '${req.user.tenantId}', ${storeVal}, '${id}', '${item.productId}', ${cleanQty}, ${cleanQty})`);
      }

      // 3. Ultra-Fast Bulk Upsert using Raw SQL (PostgreSQL)
      if (stockUpsertValues.length > 0) {
        await tx.$executeRawUnsafe(`
          INSERT INTO "VehicleStock" ("id", "tenantId", "storeId", "vehicleId", "productId", "quantity", "openingQuantity")
          VALUES ${stockUpsertValues.join(',')}
          ON CONFLICT ("vehicleId", "productId")
          DO UPDATE SET 
            "quantity" = EXCLUDED."quantity",
            "openingQuantity" = EXCLUDED."openingQuantity"
        `);
      }
      
      if (auditItemsData.length > 0) {
        await tx.stockAuditItem.createMany({ data: auditItemsData });
        await tx.stockTransaction.createMany({ data: transactionsData });
      }
    }, {
      maxWait: 30000,
      timeout: 120000
    });
    console.log('Prisma Transaction committed successfully.');

    // Find the user assigned to this vehicle to track as targetUserId
    const assignedUser = await prisma.user.findFirst({
      where: { assignedVehicleId: id, status: 'ACTIVE' },
      select: { id: true }
    });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId,
      action: 'STOCK_AUDITED',
      details: `Audited stock for vehicle ${vehicle?.vehicleNumber || vehicle?.displayId || id}. Items: ${items.length}`,
      targetUserId: assignedUser?.id,
      metadata: { vehicleId: id, itemCount: items.length, remark: req.body.remark }
    });

    res.json({ message: 'Inventory audited successfully' });
  } catch (error) {
    console.error('❌ Audit Error:', error);
    res.status(500).json({ message: 'Error auditing stock', error: error.message });
  }
};

export const getRefillRequests = async (req, res) => {
  try {
    const { storeId } = req.query || {};
    const tenantId = req.user?.tenantId || getTenantId() || 'VK001';
    const where = { tenantId };

    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      where.storeId = storeId;
    } else if (req.user.storeId) {
      const isGlobal = 
        ['TENANT_OWNER', 'SUPER_ADMIN', 'ADMIN'].includes(req.user.role) || 
        req.user.customRole?.portalType === 'ADMIN';
        
      if (!isGlobal) {
        where.storeId = req.user.storeId;
      }
    }

    const requests = await prisma.refillRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true
      }
    });

    // Separately fetch vehicle, user, and products to avoid required relation validation crash if deleted
    const allVehicleIds = [...new Set(requests.map(r => r.vehicleId).filter(Boolean))];
    const vehicles = allVehicleIds.length > 0
      ? await prisma.vehicle.findMany({
          where: { id: { in: allVehicleIds } },
          select: { id: true, vehicleNumber: true, vehicleName: true }
        })
      : [];
    const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));

    const allUserIds = [...new Set(requests.map(r => r.userId).filter(Boolean))];
    const users = allUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: allUserIds } },
          select: { id: true, name: true }
        })
      : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const allProductIds = [...new Set(
      requests.flatMap(r => r.items.map(i => i.productId).filter(Boolean))
    )];
    const products = allProductIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: allProductIds } },
          select: { id: true, name: true, sku: true, unit: true, unitType: true }
        })
      : [];
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    const processedRequests = requests.map(req => ({
      ...req,
      vehicle: vehicleMap[req.vehicleId] || null,
      user: userMap[req.userId] || null,
      items: req.items.map(item => {
        const product = productMap[item.productId];
        return {
          ...item,
          product: product ? {
            ...product,
            unit: { name: product.unit, type: product.unitType || 'pcs' }
          } : {
            name: 'Unknown Product',
            unit: { name: 'pcs', type: 'pcs' }
          }
        };
      })
    }));

    res.json(processedRequests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching refill requests', error: error.message });
  }
};

export const approveRefillRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedItemIds, quantities, remarks } = req.body;

    const request = await prisma.refillRequest.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!request) return res.status(404).json({ message: 'Refill request not found' });
    if (request.status !== 'PENDING') return res.status(400).json({ message: 'Request is already processed' });

    // 1. Fetch all products first (outside transaction for speed)
    let itemsToProcess = request.items;
    if (approvedItemIds && Array.isArray(approvedItemIds)) {
      itemsToProcess = itemsToProcess.filter(item => approvedItemIds.includes(item.id));
    }

    // Process overrides safely
    itemsToProcess = itemsToProcess.map(item => {
      let finalQty = item.quantity;
      if (quantities && quantities[item.id] !== undefined && quantities[item.id] !== '') {
        const parsed = parseInt(quantities[item.id], 10);
        if (!isNaN(parsed) && parsed >= 0) finalQty = parsed;
      }
      return {
        ...item,
        originalQuantity: item.quantity,
        quantity: finalQty, // override for loading stock
        adminRemark: remarks?.[item.id] || null
      };
    });

    const productIds = itemsToProcess.map(item => item.productId);
    const validProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { channelInventories: true }
    });
    const validProductIds = new Set(validProducts.map(p => p.id));
    const productMap = new Map(validProducts.map(p => [p.id, p]));

    // Helper: parse vehicleStoreStock from channelInventories (POS_STORE)
    const getVehicleStoreStock = (prod) => {
      const posInv = prod?.channelInventories?.find(ci => ci.channel === 'POS_STORE');
      return posInv?.quantity || 0;
    };

    // 2. Filter valid items and CONSOLIDATE duplicates (prevents row locking issues)
    const consolidatedMap = {};
    itemsToProcess.forEach(item => {
      if (!validProductIds.has(item.productId)) {
        console.warn(`[RefillApproval] Skipping invalid product ID: ${item.productId}`);
        return;
      }
      
      if (!consolidatedMap[item.productId]) {
        consolidatedMap[item.productId] = { quantity: 0, name: validProducts.find(p => p.id === item.productId)?.name };
      }
      consolidatedMap[item.productId].quantity += item.quantity;
    });

    const finalItemsToProcess = Object.entries(consolidatedMap).map(([productId, data]) => ({
      productId,
      quantity: data.quantity,
      name: data.name
    }));

    // 2b. Pre-validate against vehicleStoreStock — only stock reserved for the vehicle channel can be refilled.
    //     This matches what Vehicle Stock Management shows as "Vehicle Store Stock".
    for (const item of finalItemsToProcess) {
      const prod = productMap.get(item.productId);
      if (!prod) continue;
      const vehicleStoreStock = getVehicleStoreStock(prod);
      if (Math.floor(item.quantity) > vehicleStoreStock) {
        return res.status(400).json({
          message: `Insufficient vehicle-reserved stock for "${item.name}". Reserved for vehicle: ${vehicleStoreStock}, Requested: ${item.quantity}. Please reserve stock from Ready Inventory first.`
        });
      }
    }

    // 3. Run stock updates in a highly-resilient atomic transaction
    await prisma.$transaction(async (tx) => {
      // 1. Bulk Log Transactions
      if (finalItemsToProcess.length > 0) {
        await tx.stockTransaction.createMany({
          data: finalItemsToProcess.map(item => ({
            tenantId: request.tenantId,
            storeId: request.storeId,
            userId: req.user.id,
            date: new Date(),
            type: 'REFILL',
            vehicleId: request.vehicleId,
            productId: item.productId,
            quantity: item.quantity
          }))
        });
      }

      // 2. Fetch existing vehicle stocks to decide between update and create
      const existingStocks = await tx.vehicleStock.findMany({
        where: { 
          vehicleId: request.vehicleId,
          productId: { in: finalItemsToProcess.map(i => i.productId) }
        }
      });
      const existingProductIds = new Set(existingStocks.map(s => s.productId));

      // 3. Update Stocks
      for (const item of finalItemsToProcess) {
        if (existingProductIds.has(item.productId)) {
          await tx.vehicleStock.update({
            where: { vehicleId_productId: { vehicleId: request.vehicleId, productId: item.productId } },
            data: { quantity: { increment: item.quantity } }
          });
        } else {
          await tx.vehicleStock.create({
            data: {
              tenantId: request.tenantId,
              storeId: request.storeId,
              vehicleId: request.vehicleId,
              productId: item.productId,
              quantity: item.quantity,
              openingQuantity: item.quantity
            }
          });
        }

        // Decrement WarehouseInventory (physical stock leaves store)
        const wi = await tx.warehouseInventory.findFirst({
          where: { productId: item.productId, tenantId: request.tenantId }
        });
        if (wi) {
          await tx.warehouseInventory.update({
            where: { id: wi.id },
            data: { quantity: { decrement: Math.floor(item.quantity) } }
          });
        }

        // Sync Product.stock
        const allWi = await tx.warehouseInventory.findMany({
          where: { productId: item.productId, tenantId: request.tenantId }
        });
        const totalQty = allWi.reduce((acc, curr) => acc + curr.quantity, 0);
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: totalQty }
        });
      }


      const processedItemIds = itemsToProcess.map(i => i.id);
      
      if (processedItemIds.length < request.items.length) {
        // Partial Approval
        // Remove items from the current pending request
        await tx.refillItem.deleteMany({
          where: { id: { in: processedItemIds } }
        });

        // Create a new request for the approved items to keep historical records
        await tx.refillRequest.create({
          data: {
            tenantId: request.tenantId,
            vehicleId: request.vehicleId,
            userId: request.userId,
            approvedById: req.user.id,
            status: 'APPROVED',
            parentId: request.parentId || request.id,
            items: {
              create: finalItemsToProcess.map(item => ({
                tenantId: item.tenantId || request.tenantId,
                productId: item.productId,
                quantity: item.quantity,
                requestedQuantity: item.originalQuantity || item.quantity,
                adminRemark: item.adminRemark
              }))
            }
          }
        });
      } else {
        // Full Approval
        await tx.refillRequest.update({
          where: { id },
          data: { 
            status: 'APPROVED',
            approvedById: req.user.id
          }
        });

        // Update items to store the requested quantity if not already set
        for (const item of finalItemsToProcess) {
          await tx.refillItem.updateMany({
            where: { refillRequestId: id, productId: item.productId },
            data: { 
              quantity: item.quantity,
              requestedQuantity: item.originalQuantity || item.quantity,
              adminRemark: item.adminRemark
            }
          });
        }
      }
    }, {
      maxWait: 50000,
      timeout: 120000
    });

    logActivity({
      userId: req.user.id,
      tenantId: req.user.tenantId,
      storeId: request.storeId,
      action: 'REFILL_APPROVED',
      details: `Approved refill request ${id} for vehicle ${request.vehicleId}. Items: ${itemsToProcess.length}`,
      targetUserId: request.userId,
      metadata: { 
        refillRequestId: id, 
        vehicleId: request.vehicleId, 
        agentId: request.userId,
        itemCount: itemsToProcess.length 
      }
    });

    // Send immediate response to the client so UI updates instantly
    res.json({ message: 'Refill request approved and stock loaded successfully' });

    // Consolidated notification logic: aggregate from all related requests (Run in background)
    Promise.resolve().then(async () => {
      try {
        const rootId = request.parentId || request.id;
        const allRelatedRequests = await prisma.refillRequest.findMany({
          where: {
            OR: [{ id: rootId }, { parentId: rootId }]
          },
          select: {
            status: true,
            items: {
              select: {
                productId: true,
                quantity: true,
                requestedQuantity: true,
                adminRemark: true
              }
            }
          }
        });

        const productIds = [...new Set(allRelatedRequests.flatMap(r => (r.items || []).map(i => i.productId)).filter(Boolean))];
        const products = productIds.length > 0
          ? await prisma.product.findMany({
              where: { id: { in: productIds } },
              select: { id: true, name: true }
            })
          : [];
        const productNameMap = Object.fromEntries(products.map(p => [p.id, p.name]));

    // Flatten all items from this flow
    const itemMap = new Map();
    allRelatedRequests.forEach(req => {
      req.items.forEach(item => {
        const key = item.productId;
        const requested = item.requestedQuantity || item.quantity;
        const approved = req.status === 'APPROVED' ? item.quantity : 0;
        
        let status = req.status; // PENDING, APPROVED, REJECTED
        if (req.status === 'APPROVED' && item.quantity < requested) {
          status = 'PARTIAL';
        }

        // Priority logic for statuses: APPROVED/REJECTED/PARTIAL override PENDING
        if (!itemMap.has(key) || status !== 'PENDING') {
          itemMap.set(key, {
            name: productNameMap[item.productId] || 'Product',
            requested,
            approved,
            status,
            adminRemark: item.adminRemark
          });
        }
      });
    });

    const refillItemsSummary = Array.from(itemMap.values());

    await prisma.notification.deleteMany({
      where: {
        userId: request.userId,
        type: 'inventory',
        isRead: false,
        metadata: { path: ['rootId'], equals: rootId }
      }
    });

        sendNotification({
          userIds: [request.userId],
          title: 'Refill Request Reviewed',
          message: `Your refill request review is in progress.`,
          type: 'inventory',
          priority: 'high',
          metadata: { 
            requestId: request.id, 
            rootId: rootId,
            vehicleId: request.vehicleId,
            refillItems: refillItemsSummary 
          }
        });
      } catch (notifError) {
        console.error('Error in background notification logic for approve:', notifError);
      }
    });

  } catch (error) {
    console.error('❌ Error approving refill request:', error);
    import('fs').then(fs => {
      fs.writeFileSync('approve_refill_error.log', new Date().toISOString() + '\\n' + String(error.stack || error) + '\\n\\n', { flag: 'a' });
    });
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error approving refill request', error: error.message });
    }
  }
};

export const rejectRefillRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectedItemIds } = req.body;

    const request = await prisma.refillRequest.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!request) {
      console.log('Reject Refill Failed: Not found', id);
      return res.status(404).json({ message: 'Refill request not found' });
    }
    if (request.status !== 'PENDING') {
      console.log('Reject Refill Failed: Already processed', id, 'Status:', request.status);
      return res.status(400).json({ message: `Request is already ${request.status}` });
    }

    let itemsToProcess = request.items;
    if (rejectedItemIds && Array.isArray(rejectedItemIds)) {
      itemsToProcess = itemsToProcess.filter(item => rejectedItemIds.includes(item.id));
    }

    const processedItemIds = itemsToProcess.map(i => i.id);

    await prisma.$transaction(async (tx) => {
      if (processedItemIds.length < request.items.length) {
        // Partial Rejection
        await tx.refillItem.deleteMany({
          where: { id: { in: processedItemIds } }
        });

        await tx.refillRequest.create({
          data: {
            tenantId: request.tenantId,
            vehicleId: request.vehicleId,
            userId: request.userId,
            status: 'REJECTED',
            parentId: request.parentId || request.id,
            items: {
              create: itemsToProcess.map(item => ({
                tenantId: item.tenantId || request.tenantId,
                productId: item.productId,
                quantity: 0,
                requestedQuantity: item.requestedQuantity || item.quantity
              }))
            }
          }
        });
      } else {
        // Full Rejection
        await tx.refillRequest.update({
          where: { id },
          data: { status: 'REJECTED' }
        });
      }
    });

    res.json({ message: 'Refill request rejected' });

    // Consolidated notification logic: aggregate from all related requests (Run in background)
    Promise.resolve().then(async () => {
      try {
        const rootId = request.parentId || request.id;
        const allRelatedRequests = await prisma.refillRequest.findMany({
          where: {
            OR: [{ id: rootId }, { parentId: rootId }]
          },
          select: {
            status: true,
            items: {
              select: {
                productId: true,
                quantity: true,
                requestedQuantity: true,
                adminRemark: true
              }
            }
          }
        });

        const productIds = [...new Set(allRelatedRequests.flatMap(r => (r.items || []).map(i => i.productId)).filter(Boolean))];
        const products = productIds.length > 0
          ? await prisma.product.findMany({
              where: { id: { in: productIds } },
              select: { id: true, name: true }
            })
          : [];
        const productNameMap = Object.fromEntries(products.map(p => [p.id, p.name]));

        const itemMap = new Map();
    allRelatedRequests.forEach(req => {
      req.items.forEach(item => {
        const key = item.productId;
        const requested = item.requestedQuantity || item.quantity;
        const approved = req.status === 'APPROVED' ? item.quantity : 0;
        
        let status = req.status;
        if (req.status === 'APPROVED' && item.quantity < requested) {
          status = 'PARTIAL';
        }

        if (!itemMap.has(key) || status !== 'PENDING') {
          itemMap.set(key, {
            name: productNameMap[item.productId] || 'Product',
            requested,
            approved,
            status,
            adminRemark: item.adminRemark
          });
        }
      });
    });

    const refillItemsSummary = Array.from(itemMap.values());

    await prisma.notification.deleteMany({
      where: {
        userId: request.userId,
        type: 'inventory',
        isRead: false,
        metadata: { path: ['rootId'], equals: rootId }
      }
    });

        sendNotification({
          userIds: [request.userId],
          title: 'Refill Request Updated',
          message: `Your refill request review is in progress.`,
          type: 'inventory',
          priority: 'high',
          metadata: { 
            requestId: request.id, 
            rootId: rootId,
            vehicleId: request.vehicleId,
            refillItems: refillItemsSummary 
          }
        });
      } catch (notifError) {
        console.error('Error in background notification logic for reject:', notifError);
      }
    });
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error rejecting refill request', error: error.message });
    }
  }
};

export const getAuditHistory = async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const { storeId } = req.query;
    let vehicleId = req.params.id || req.params.vehicleId || req.query.vehicleId;
    
    if (vehicleId === 'me' || vehicleId === 'undefined' || vehicleId === 'null') {
      vehicleId = req.user?.assignedVehicleId;
    }

    if (!vehicleId && req.user?.id) {
      const userRecord = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { assignedVehicleId: true }
      });
      if (userRecord?.assignedVehicleId) {
        vehicleId = userRecord.assignedVehicleId;
      }
    }

    const tenantId = req.user?.tenantId || 'VK001';
    const where = { tenantId };

    if (vehicleId) {
      where.vehicleId = vehicleId;
    }

    // Only apply storeId filter if explicitly provided in query,
    // or if not filtering by vehicle and user is scoped to a store.
    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      where.storeId = storeId;
    } else if (!vehicleId && req.user?.storeId) {
      const isGlobal = 
        ['TENANT_OWNER', 'SUPER_ADMIN', 'ADMIN'].includes(req.user.role) || 
        req.user.customRole?.portalType === 'ADMIN';
        
      if (!isGlobal) {
        where.storeId = req.user.storeId;
      }
    }

    // 1. Fetch Audits
    const audits = await prisma.stockAudit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: { select: { id: true, vehicleNumber: true, vehicleName: true } },
        user: { select: { id: true, name: true, phone: true } },
        items: true
      }
    });

    // 2. Fetch Approved Refills
    const refillWhere = {
      tenantId,
      status: 'APPROVED'
    };
    if (vehicleId) {
      refillWhere.vehicleId = vehicleId;
    }
    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      refillWhere.storeId = storeId;
    }

    const approvedRefills = await prisma.refillRequest.findMany({
      where: refillWhere,
      orderBy: { updatedAt: 'desc' },
      include: {
        vehicle: { select: { id: true, vehicleNumber: true, vehicleName: true } },
        user: { select: { id: true, name: true, phone: true } },
        approvedBy: { select: { id: true, name: true, phone: true } },
        items: true
      },
      take: 100
    });

    // 3. Fetch Returns from StockTransaction
    const returnWhere = {
      tenantId,
      type: 'RETURN'
    };
    if (vehicleId) {
      returnWhere.vehicleId = vehicleId;
    }
    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      returnWhere.storeId = storeId;
    }

    const returnTransactions = await prisma.stockTransaction.findMany({
      where: returnWhere,
      orderBy: { date: 'desc' },
      include: {
        vehicle: { select: { id: true, vehicleNumber: true, vehicleName: true } },
        user: { select: { id: true, name: true, phone: true } }
      },
      take: 200
    });

    // Collect all product IDs from audits, refills, and returns
    const allProductIds = [...new Set([
      ...audits.flatMap(a => a.items.map(i => i.productId).filter(Boolean)),
      ...approvedRefills.flatMap(r => r.items.map(i => i.productId).filter(Boolean)),
      ...returnTransactions.map(t => t.productId).filter(Boolean)
    ])];

    const products = allProductIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: allProductIds } },
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
            unitType: true,
            price: true,
            costPrice: true,
            images: true,
            category: { select: { id: true, name: true } }
          }
        })
      : [];
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    // Format Audits
    const processedAudits = audits.map(audit => {
      const processedItems = audit.items.map(item => {
        const product = productMap[item.productId];
        return {
          ...item,
          systemQuantity: item.oldQuantity,
          auditedQuantity: item.newQuantity,
          variance: item.newQuantity - item.oldQuantity,
          product: product ? {
            ...product,
            skuCode: product.sku || 'N/A',
            unit: { name: product.unit, type: product.unitType || 'COUNT' }
          } : {
            id: item.productId,
            name: 'Deleted / Legacy Product',
            sku: 'N/A',
            skuCode: 'N/A',
            category: { name: 'General' },
            unit: { name: 'PCS', type: 'COUNT' }
          }
        };
      });
      return {
        ...audit,
        type: 'AUDIT',
        notes: audit.remark || 'Vehicle Stock Audit',
        remark: audit.remark || 'Vehicle Stock Audit',
        items: processedItems
      };
    });

    // Format Approved Refills
    const processedRefills = approvedRefills
      .filter(r => r.items && r.items.length > 0)
      .map(refill => {
        let totalAmt = 0;
        const items = refill.items.map(item => {
          const prod = productMap[item.productId];
          const price = Number(prod?.price || 0);
          const qty = Number(item.quantity || 0);
          totalAmt += price * qty;
          return {
            id: item.id,
            productId: item.productId,
            systemQuantity: item.requestedQuantity || qty,
            auditedQuantity: qty,
            quantity: qty,
            variance: qty,
            adminRemark: item.adminRemark,
            product: prod ? {
              ...prod,
              skuCode: prod.sku || 'N/A',
              unit: { name: prod.unit, type: prod.unitType || 'COUNT' }
            } : {
              id: item.productId,
              name: 'Product',
              sku: 'N/A',
              skuCode: 'N/A',
              category: { name: 'General' },
              unit: { name: 'PCS', type: 'COUNT' }
            }
          };
        });

        const approverName = refill.approvedBy?.name || 'Warehouse Supervisor';
        return {
          id: refill.id,
          type: 'REFILL',
          createdAt: refill.updatedAt || refill.createdAt,
          vehicleId: refill.vehicleId,
          vehicle: refill.vehicle,
          user: refill.approvedBy || refill.user,
          totalAmount: totalAmt,
          remark: `Refill Request Approved by ${approverName}`,
          notes: `Refill Request Approved by ${approverName}`,
          items
        };
      });

    // Group return transactions by batch (timestamp within 2 minutes, same vehicle & user)
    const returnGroups = [];
    returnTransactions.forEach(tx => {
      const txTime = new Date(tx.date).getTime();
      let group = returnGroups.find(g => 
        g.vehicleId === tx.vehicleId && 
        g.userId === tx.userId && 
        Math.abs(new Date(g.createdAt).getTime() - txTime) < 120000
      );
      if (!group) {
        group = {
          id: `ret_${tx.id}`,
          type: 'RETURN',
          createdAt: tx.date,
          vehicleId: tx.vehicleId,
          vehicle: tx.vehicle,
          user: tx.user,
          remark: 'Stock Return to Warehouse',
          notes: 'Stock Return to Warehouse',
          items: []
        };
        returnGroups.push(group);
      }
      const prod = productMap[tx.productId];
      group.items.push({
        id: tx.id,
        productId: tx.productId,
        oldQuantity: tx.quantity,
        newQuantity: 0,
        systemQuantity: tx.quantity,
        auditedQuantity: 0,
        variance: -tx.quantity,
        quantity: tx.quantity,
        product: prod ? {
          ...prod,
          skuCode: prod.sku || 'N/A',
          unit: { name: prod.unit, type: prod.unitType || 'COUNT' }
        } : {
          id: tx.productId,
          name: 'Product',
          sku: 'N/A',
          skuCode: 'N/A',
          category: { name: 'General' },
          unit: { name: 'PCS', type: 'COUNT' }
        }
      });
    });

    const combinedHistory = [...processedAudits, ...processedRefills, ...returnGroups].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.json(combinedHistory);
  } catch (error) {
    console.error('getAuditHistory error:', error);
    res.status(500).json({ message: 'Error fetching audit history', error: error.message });
  }
};

// Update Product Stock Count
export const updateProductStock = async (req, res) => {
  try {
    const { productId, quantity, mode } = req.body;
    const finalTenantId = req.user?.tenantId || getTenantId();

    console.log(`[Inventory] Stock Update Request: Product=${productId}, Qty=${quantity}, Mode=${mode}, Tenant=${finalTenantId}`);

    if (!productId || quantity === undefined) {
      return res.status(400).json({ message: 'productId and quantity are required' });
    }

    const qty = parseInt(quantity);
    if (isNaN(qty)) {
      return res.status(400).json({ message: 'Invalid quantity' });
    }

    const updatedProduct = await prisma.$transaction(async (tx) => {
      // 1. Find Product
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new Error('Product not found in database');

      // 2. Update Product main stock using raw SQL to bypass stale Prisma client validation
      if (mode === 'add') {
        await tx.$executeRawUnsafe(`UPDATE "Product" SET "stock" = "stock" + ${qty} WHERE "id" = '${productId}'`);
      } else {
        await tx.$executeRawUnsafe(`UPDATE "Product" SET "stock" = ${qty} WHERE "id" = '${productId}'`);
      }
      
      const prod = await tx.product.findUnique({ where: { id: productId } });
      if (!prod) throw new Error('Product not found after update');

      console.log(`[Inventory] Primary stock updated for ${prod.name}. New total: ${prod.stock}`);

      // 3. Find/Create Warehouse
      let warehouse = await tx.warehouse.findFirst({
        where: { tenantId: finalTenantId }
      });

      if (!warehouse) {
        console.log(`[Inventory] No warehouse found for tenant ${finalTenantId}, creating default.`);
        warehouse = await tx.warehouse.create({
          data: {
            tenantId: finalTenantId,
            name: 'Main Warehouse',
            location: 'System Generated'
          }
        });
      }

      // 4. Update Warehouse Inventory
      const existingWI = await tx.warehouseInventory.findFirst({
        where: { 
          warehouseId: warehouse.id,
          productId: productId 
        }
      });

      if (existingWI) {
        await tx.warehouseInventory.update({
          where: { id: existingWI.id },
          data: {
            quantity: mode === 'add' ? { increment: qty } : qty
          }
        });
      } else {
        await tx.warehouseInventory.create({
          data: {
            tenantId: finalTenantId,
            warehouseId: warehouse.id,
            productId: productId,
            quantity: qty
          }
        });
      }

      console.log(`[Inventory] Warehouse Inventory synced for warehouse ${warehouse.id}`);

      // 4.5. Update UnifiedInventory
      let location = await tx.inventoryLocation.findFirst({
        where: { warehouseId: warehouse.id, type: 'WAREHOUSE' }
      });
      if (!location) {
        location = await tx.inventoryLocation.create({
          data: {
            type: 'WAREHOUSE',
            name: `${warehouse.name} Location`,
            code: `WH-${warehouse.id.slice(0, 8).toUpperCase()}`,
            warehouseId: warehouse.id,
            isActive: true
          }
        });
      }
      const locationId = location.id;

      const existingUnified = await tx.unifiedInventory.findFirst({
        where: { productId, locationId }
      });

      const newOnHand = mode === 'add' 
        ? (existingUnified ? existingUnified.onHand + qty : qty)
        : qty;

      if (existingUnified) {
        await tx.unifiedInventory.update({
          where: { id: existingUnified.id },
          data: {
            onHand: newOnHand,
            available: newOnHand - existingUnified.reserved
          }
        });
      } else {
        await tx.unifiedInventory.create({
          data: {
            productId,
            locationId,
            onHand: newOnHand,
            available: newOnHand
          }
        });
      }

      // Sync Product.stock
      const allWi = await tx.unifiedInventory.findMany({
        where: { productId }
      });
      const totalQty = allWi.reduce((acc, curr) => acc + curr.onHand, 0);

      await tx.product.update({
        where: { id: productId },
        data: { stock: totalQty }
      });

      console.log(`[Inventory] UnifiedInventory synced. New product stock: ${totalQty}`);

      // 5. Return updated product with relations for UI
      return tx.product.findUnique({
        where: { id: productId },
        include: {
          category: true,
          subCategory: true,
          brand: true,
        }
      });
    }, {
      maxWait: 10000,
      timeout: 30000
    });

    // Log Activity (Non-blocking or outside transaction is fine)
    await logActivity({
      tenantId: finalTenantId,
      userId: req.user.id,
      storeId: req.user.storeId || null,
      action: 'STOCK_UPDATE',
      entity: 'PRODUCT',
      entityId: productId,
      description: `Stock ${mode === 'add' ? 'added' : 'set'}: ${qty} units for ${updatedProduct.name}. New total: ${updatedProduct.stock}`,
    }).catch(err => console.warn('[Inventory] Log activity failed:', err.message));

    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error('❌ updateProductStock Error Details:', {
      message: error.message,
      stack: error.stack,
      body: req.body
    });
    res.status(500).json({ message: 'Error updating stock', error: error.message });
  }
};
export const getRefillHistory = async (req, res) => {
  try {
    const { storeFilterId, startDate, endDate } = req.query;

    const whereClause = {
      tenantId: req.user.tenantId,
      type: 'REFILL'
    };

    if (storeFilterId) whereClause.storeId = storeFilterId;
    else if (req.user.storeId) whereClause.storeId = req.user.storeId;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      whereClause.date = { gte: start, lte: end };
    }

    const history = await prisma.stockTransaction.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      take: 500
    });

    const allProductIds = [...new Set(history.map(item => item.productId).filter(Boolean))];
    const products = allProductIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: allProductIds } },
          select: { id: true, name: true, sku: true }
        })
      : [];
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    const allVehicleIds = [...new Set(history.map(item => item.vehicleId).filter(Boolean))];
    const vehicles = allVehicleIds.length > 0
      ? await prisma.vehicle.findMany({
          where: { id: { in: allVehicleIds } },
          select: { id: true, vehicleNumber: true, displayId: true }
        })
      : [];
    const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));

    const allUserIds = [...new Set(history.map(item => item.userId).filter(Boolean))];
    const users = allUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: allUserIds } },
          select: { id: true, name: true, role: true }
        })
      : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const processedHistory = history.map(item => ({
      ...item,
      product: productMap[item.productId] || null,
      vehicle: vehicleMap[item.vehicleId] || null,
      user: userMap[item.userId] || null
    }));

    res.json(processedHistory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching refill history', error: error.message });
  }
};
