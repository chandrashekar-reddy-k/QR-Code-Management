import prisma from '../../utils/prisma.js';
import { generateId } from '../../utils/idGenerator.js';
import { logActivity } from '../../utils/activityLogger.js';
import { resolveStoreScopeFromReq, resolveWriteStoreId } from '../../utils/resolveStoreScope.js';
import { InventoryService } from '../../services/inventoryService.js';
import { parsePOMetadata } from './purchaseOrderController.js';

// Helper to enrich GRN with parsed PO metadata
const enrichGRN = (grn) => {
  if (!grn) return grn;
  const enrichedPo = grn.po ? parsePOMetadata(grn.po) : grn.po;
  const poItems = enrichedPo?.items || [];

  const items = (grn.items || []).map((item, idx) => {
    // Match against PO item by index or variant/product ID
    const matchedPoItem = poItems[idx] || poItems.find(pi => 
      pi.id === item.poItemId ||
      (pi.productVariantId && pi.productVariantId === item.productVariantId) ||
      (pi.productId === item.productId && (!item.productVariantId || pi.productVariantId === item.productVariantId))
    );

    const variants = item.product?.variants || matchedPoItem?.product?.variants || [];
    let matchedVariant = null;
    const targetVariantId = matchedPoItem?.productVariantId || item.productVariantId;
    if (targetVariantId) {
      matchedVariant = variants.find(v => v.id === targetVariantId);
    }
    if (!matchedVariant && matchedPoItem?.variantName) {
      matchedVariant = variants.find(v => v.variantName === matchedPoItem.variantName);
    }
    if (!matchedVariant && matchedPoItem?.skuCode) {
      matchedVariant = variants.find(v => v.sku === matchedPoItem.skuCode);
    }
    if (!matchedVariant && matchedPoItem?.rate && targetVariantId) {
      matchedVariant = variants.find(v => Number(v.price) === Number(matchedPoItem.rate) || Number(v.mrp) === Number(matchedPoItem.rate));
    }

    const resolvedVariantName = matchedPoItem?.variantName || matchedVariant?.variantName || item.variantName || item.product?.variantName || '';
    const resolvedSkuCode = matchedPoItem?.skuCode || matchedVariant?.sku || item.skuCode || item.product?.skuCode || item.product?.sku || '';

    return {
      ...item,
      productVariantId: matchedVariant?.id || matchedPoItem?.productVariantId || item.productVariantId || null,
      variantName: resolvedVariantName,
      skuCode: resolvedSkuCode,
      uom: matchedPoItem?.uom || item.product?.unit?.name || item.product?.unit || item.uom || 'PACK',
      mrp: matchedPoItem?.mrp > 0 ? matchedPoItem.mrp : (matchedVariant?.mrp || item.product?.mrp || 0),
      landingPrice: matchedPoItem?.landingPrice > 0 ? matchedPoItem.landingPrice : (matchedPoItem?.rate || item.product?.purchasePrice || 0),
      sellingPrice: matchedPoItem?.sellingPrice > 0 ? matchedPoItem.sellingPrice : (matchedVariant?.price || item.product?.price || 0)
    };
  });

  return {
    ...grn,
    po: enrichedPo,
    items
  };
};

// ─── GET ALL PROCUREMENT GRNS ─────────────────────────────────────
export const getProcurementGRNs = async (req, res) => {
  try {
    const { status, storeId, page = 1, limit = 1000 } = req.query;

    const storeScope = await resolveStoreScopeFromReq(req);
    let where = { ...storeScope };

    if (status) {
      const statusList = status.split(',')
        .map(s => s.trim().toUpperCase())
        .map(s => s === 'APPROVED' ? 'COMPLETE' : s) // Map APPROVED to COMPLETE if requested by frontend
        .filter(s => ['PARTIAL', 'COMPLETE'].includes(s));
      if (statusList.length > 0) {
        where.status = { in: statusList };
      }
    }

    const total = await prisma.procurementGoodsReceipt.count({ where });

    const grns = await prisma.procurementGoodsReceipt.findMany({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      include: {
        po: {
          include: {
            vendor: true,
            items: {
              include: {
                product: {
                  include: {
                    variants: true
                  }
                }
              }
            }
          }
        },
        items: {
          include: {
            product: {
              include: {
                variants: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: grns.map(enrichGRN),
      total,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching procurement GRNs', error: error.message });
  }
};

// ─── GET PROCUREMENT GRN BY ID ───────────────────────────────────
export const getProcurementGRNById = async (req, res) => {
  try {
    const { id } = req.params;

    const grn = await prisma.procurementGoodsReceipt.findUnique({
      where: { id },
      include: {
        po: {
          include: {
            vendor: true,
            items: {
              include: {
                product: {
                  include: {
                    variants: true
                  }
                }
              }
            }
          }
        },
        items: {
          include: {
            product: {
              include: {
                variants: true
              }
            }
          }
        }
      }
    });

    if (!grn) {
      return res.status(404).json({ message: 'Procurement GRN not found' });
    }

    res.json(enrichGRN(grn));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching procurement GRN', error: error.message });
  }
};

// ─── CREATE PROCUREMENT GRN ───────────────────────────────────────
export const createProcurementGRN = async (req, res) => {
  try {
    const { poId, remarks, items, attachments } = req.body;
    const incomingStoreId = req.body.storeId || req.user?.storeId || req.user?.warehouseId || null;
    const storeId = await resolveWriteStoreId(incomingStoreId);

    if (!poId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Purchase Order ID and items are required' });
    }

    // Normalize and resolve item product IDs to base Product.id
    items.forEach(item => {
      if (item.productId && typeof item.productId === 'string' && item.productId.includes('_')) {
        const potentialBaseId = item.productId.split('_')[0];
        if (potentialBaseId.length === 36) {
          item.productId = potentialBaseId;
        }
      }
    });

    const itemProductIds = [...new Set(items.map(i => i.productId).filter(Boolean))];
    const existingProducts = itemProductIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: itemProductIds } },
          select: { id: true }
        })
      : [];
    const validProductIds = new Set(existingProducts.map(p => p.id));
    const missingProductIds = itemProductIds.filter(id => !validProductIds.has(id));

    if (missingProductIds.length > 0) {
      const matchingVariants = await prisma.productVariant.findMany({
        where: { id: { in: missingProductIds } },
        select: { id: true, productId: true }
      });
      const variantToProductMap = new Map();
      matchingVariants.forEach(v => {
        if (v.productId) {
          variantToProductMap.set(v.id, v.productId);
        }
      });
      items.forEach(item => {
        if (variantToProductMap.has(item.productId)) {
          item.productId = variantToProductMap.get(item.productId);
        }
      });
    }

    // Generate Display ID
    const displayId = await generateId({
      entity: 'GRN',
      storeId
    });

    // Handle serialized metadata/attachments in remarks
    const metadataPayload = {
      attachments: attachments || []
    };
    const serializedRemarks = remarks 
      ? `${remarks}\n[GRN_METADATA]:${JSON.stringify(metadataPayload)}`
      : `\n[GRN_METADATA]:${JSON.stringify(metadataPayload)}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the ProcurementGoodsReceipt
      const newGRN = await tx.procurementGoodsReceipt.create({
        data: {
          storeId,
          poId,
          displayId,
          remarks: serializedRemarks,
          status: 'PARTIAL', // default status
          items: {
            create: items.map(item => ({
              productId: item.productId,
              orderedQty: parseInt(item.orderedQty) || 0,
              receivedQty: parseInt(item.receivedQty) || 0,
              damagedQty: parseInt(item.damagedQty) || 0,
              missingQty: parseInt(item.missingQty) || 0,
              expiryStatus: item.expiryStatus || 'SAFE',
              qcStatus: 'PENDING'
            }))
          }
        },
        include: {
          items: true
        }
      });

      // 2. Update PurchaseOrderItems receivedQty
      let allItemsCompleted = true;
      const poItems = await tx.purchaseOrderItem.findMany({
        where: { poId }
      });

      for (const item of items) {
        const poItem = poItems.find(pi => pi.productId === item.productId);
        if (poItem) {
          const newReceivedQty = poItem.receivedQty + (parseInt(item.receivedQty) || 0);
          await tx.purchaseOrderItem.update({
            where: { id: poItem.id },
            data: { receivedQty: newReceivedQty }
          });

          if (newReceivedQty < poItem.quantity) {
            allItemsCompleted = false;
          }
        }
      }

      // 3. Update PO status
      const updatedPOStatus = allItemsCompleted ? 'DELIVERED' : 'ORDERED';
      await tx.purchaseOrder.update({
        where: { id: poId },
        data: { status: updatedPOStatus }
      });

      // Check if GRN status should be COMPLETE
      const anyDamagedOrMissing = items.some(i => (parseInt(i.damagedQty) || 0) > 0 || (parseInt(i.missingQty) || 0) > 0);
      const grnStatus = (allItemsCompleted && !anyDamagedOrMissing) ? 'COMPLETE' : 'PARTIAL';
      
      const finalGRN = await tx.procurementGoodsReceipt.update({
        where: { id: newGRN.id },
        data: { status: grnStatus },
        include: {
          po: { include: { vendor: true } },
          items: { include: { product: true } }
        }
      });

      return finalGRN;
    });

    if (req.user?.id) {
      logActivity({
        userId: req.user.id,
        storeId,
        action: 'GRN_CREATED',
        details: `Created GRN-${result.displayId} for PO-${result.po?.displayId}`,
        metadata: { grnId: result.id, displayId: result.displayId }
      });
    }
    // Sync removed per user request

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error creating procurement GRN', error: error.message });
  }
};

// ─── UPDATE PROCUREMENT GRN ───────────────────────────────────────
export const updateProcurementGRN = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks, items, attachments } = req.body;

    const existingGRN = await prisma.procurementGoodsReceipt.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!existingGRN) {
      return res.status(404).json({ message: 'Procurement GRN not found' });
    }

    if (items && Array.isArray(items)) {
      items.forEach(item => {
        if (item.productId && typeof item.productId === 'string' && item.productId.includes('_')) {
          const potentialBaseId = item.productId.split('_')[0];
          if (potentialBaseId.length === 36) {
            item.productId = potentialBaseId;
          }
        }
      });

      const itemProductIds = [...new Set(items.map(i => i.productId).filter(Boolean))];
      const existingProducts = itemProductIds.length > 0
        ? await prisma.product.findMany({
            where: { id: { in: itemProductIds } },
            select: { id: true }
          })
        : [];
      const validProductIds = new Set(existingProducts.map(p => p.id));
      const missingProductIds = itemProductIds.filter(id => !validProductIds.has(id));

      if (missingProductIds.length > 0) {
        const matchingVariants = await prisma.productVariant.findMany({
          where: { id: { in: missingProductIds } },
          select: { id: true, productId: true }
        });
        const variantToProductMap = new Map();
        matchingVariants.forEach(v => {
          if (v.productId) {
            variantToProductMap.set(v.id, v.productId);
          }
        });
        items.forEach(item => {
          if (variantToProductMap.has(item.productId)) {
            item.productId = variantToProductMap.get(item.productId);
          }
        });
      }
    }

    const metadataPayload = {
      attachments: attachments || []
    };
    const serializedRemarks = remarks 
      ? `${remarks}\n[GRN_METADATA]:${JSON.stringify(metadataPayload)}`
      : `\n[GRN_METADATA]:${JSON.stringify(metadataPayload)}`;

    const result = await prisma.$transaction(async (tx) => {
      // Revert previous PO receivedQty modifications
      const poItems = await tx.purchaseOrderItem.findMany({
        where: { poId: existingGRN.poId }
      });

      for (const oldItem of existingGRN.items) {
        const poItem = poItems.find(pi => pi.productId === oldItem.productId);
        if (poItem) {
          await tx.purchaseOrderItem.update({
            where: { id: poItem.id },
            data: { receivedQty: Math.max(0, poItem.receivedQty - oldItem.receivedQty) }
          });
        }
      }

      // Delete old GRN items
      await tx.procurementGoodsReceiptItem.deleteMany({
        where: { grnId: id }
      });

      // Create new GRN items and update PO items
      let allItemsCompleted = true;
      const grnItemsData = [];

      for (const item of items) {
        const createdItem = await tx.procurementGoodsReceiptItem.create({
          data: {
            grnId: id,
            productId: item.productId,
            orderedQty: parseInt(item.orderedQty) || 0,
            receivedQty: parseInt(item.receivedQty) || 0,
            damagedQty: parseInt(item.damagedQty) || 0,
            missingQty: parseInt(item.missingQty) || 0,
            expiryStatus: item.expiryStatus || 'SAFE',
            qcStatus: item.qcStatus || 'PENDING'
          }
        });
        grnItemsData.push(createdItem);

        const poItem = poItems.find(pi => pi.productId === item.productId);
        if (poItem) {
          const newReceivedQty = Math.max(0, poItem.receivedQty - (existingGRN.items.find(i => i.productId === item.productId)?.receivedQty || 0) + (parseInt(item.receivedQty) || 0));
          await tx.purchaseOrderItem.update({
            where: { id: poItem.id },
            data: { receivedQty: newReceivedQty }
          });

          if (newReceivedQty < poItem.quantity) {
            allItemsCompleted = false;
          }
        }
      }

      const updatedPOStatus = allItemsCompleted ? 'DELIVERED' : 'ORDERED';
      await tx.purchaseOrder.update({
        where: { id: existingGRN.poId },
        data: { status: updatedPOStatus }
      });

      const anyDamagedOrMissing = items.some(i => (parseInt(i.damagedQty) || 0) > 0 || (parseInt(i.missingQty) || 0) > 0);
      const grnStatus = (allItemsCompleted && !anyDamagedOrMissing) ? 'COMPLETE' : 'PARTIAL';

      const updatedGRN = await tx.procurementGoodsReceipt.update({
        where: { id },
        data: {
          remarks: serializedRemarks,
          status: grnStatus
        },
        include: {
          po: { include: { vendor: true } },
          items: { include: { product: true } }
        }
      });

      return updatedGRN;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error updating procurement GRN', error: error.message });
  }
};

// ─── DELETE PROCUREMENT GRN ───────────────────────────────────────
export const deleteProcurementGRN = async (req, res) => {
  try {
    const { id } = req.params;

    const grn = await prisma.procurementGoodsReceipt.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!grn) {
      return res.status(404).json({ message: 'Procurement GRN not found' });
    }

    await prisma.$transaction(async (tx) => {
      const poItems = await tx.purchaseOrderItem.findMany({
        where: { poId: grn.poId }
      });

      for (const item of grn.items) {
        const poItem = poItems.find(pi => pi.productId === item.productId);
        if (poItem) {
          await tx.purchaseOrderItem.update({
            where: { id: poItem.id },
            data: { receivedQty: Math.max(0, poItem.receivedQty - item.receivedQty) }
          });
        }
      }

      await tx.purchaseOrder.update({
        where: { id: grn.poId },
        data: { status: 'ORDERED' }
      });

      await tx.procurementGoodsReceipt.delete({
        where: { id }
      });
    });

    res.json({ message: 'Procurement GRN deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting procurement GRN', error: error.message });
  }
};

// ─── UPDATE QC STATUS ─────────────────────────────────────────────
export const updateQCStatus = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { status, remarks } = req.body;

    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid QC status' });
    }

    const updatedItem = await prisma.procurementGoodsReceiptItem.update({
      where: { id: itemId },
      data: {
        qcStatus: status,
        qcRemarks: remarks
      },
      include: {
        product: true,
        grn: {
          include: {
            po: {
              include: {
                vendor: true
              }
            }
          }
        }
      }
    });

    // Increment stock of the product in inventory if APPROVED
    if (status === 'APPROVED') {
      await prisma.product.update({
        where: { id: updatedItem.productId },
        data: {
          stock: { increment: updatedItem.receivedQty }
        }
      });
    }

    res.json({ message: 'QC status updated successfully', item: updatedItem });
  } catch (error) {
    res.status(500).json({ message: 'Error updating QC status', error: error.message });
  }
};

// ─── GET UNCONFIGURED GRN ITEMS ─────────────────────────────────────
export const getUnconfiguredGRNItems = async (req, res) => {
  try {
    const storeScope = await resolveStoreScopeFromReq(req);
    const includeConfigured = req.query.includeConfigured === 'true' || req.query.all === 'true';

    // Fetch all units into a map for fast ID -> Name/ShortCode resolution
    const allUnits = await prisma.unit.findMany({
      select: { id: true, name: true, shortCode: true }
    });
    const unitMap = new Map();
    allUnits.forEach(u => {
      unitMap.set(u.id, u.name || u.shortCode);
    });

    // Find items that have been received
    const where = {
      receivedQty: { gt: 0 },
      ...(!includeConfigured && {
        OR: [
          { qcRemarks: null },
          { NOT: { qcRemarks: { contains: '[CONFIGURED_RAW]' } } }
        ]
      }),
      ...(storeScope.storeId && {
        grn: {
          storeId: storeScope.storeId
        }
      })
    };

    const items = await prisma.procurementGoodsReceiptItem.findMany({
      where,
      include: {
        product: {
          include: {
            category: true,
            subCategory: true,
            masterProduct: true
          }
        },
        grn: {
          include: {
            po: {
              include: {
                items: true
              }
            }
          }
        }
      },
      orderBy: { grn: { grnDate: 'desc' } }
    });

    // Enrich items with resolved category, unit, SKU, purchase rate, and configured status
    const enrichedItems = items.map(item => {
      const prod = item.product;
      const poItem = item.grn?.po?.items?.find(pi => pi.productId === item.productId);
      
      // Parse PO metadata for uom if available
      let poItemMeta = null;
      if (item.grn?.po?.remarks && item.grn.po.remarks.includes('[PO_METADATA]:')) {
        try {
          const metaStr = item.grn.po.remarks.split('[PO_METADATA]:')[1];
          const meta = JSON.parse(metaStr);
          if (Array.isArray(meta.items)) {
            poItemMeta = meta.items.find(i => i.productId === item.productId);
          }
        } catch (e) {}
      }

      const grnUnit = poItemMeta?.uom || poItem?.uom || poItem?.unit || item.uom || item.unit;
      const resolvedUnit = grnUnit 
        ? (unitMap.get(grnUnit) || grnUnit)
        : (prod?.unit ? (unitMap.get(prod.unit) || prod.unit) : 'Units');
      
      const resolvedSku = prod?.sku || prod?.masterProduct?.sku || prod?.barcode || (prod?.id ? prod.id.substring(0, 8).toUpperCase() : 'N/A');
      
      const resolvedCategory = prod?.category?.name || prod?.subCategory?.name || 'General';
      
      const resolvedPurchasePrice = poItem?.rate ?? prod?.costPrice ?? prod?.price ?? 0;
      const isConfigured = Boolean(item.qcRemarks && item.qcRemarks.includes('[CONFIGURED_RAW]'));

      return {
        ...item,
        resolvedSku,
        resolvedCategory,
        resolvedUnit,
        resolvedPurchasePrice,
        isConfigured
      };
    });

    res.json({
      success: true,
      data: enrichedItems,
    });
  } catch (error) {
    console.error("Error fetching unconfigured GRN items:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── CONFIGURE GRN ITEMS TO RAW INVENTORY ───────────────────────────
export const configureGRNItemsToRaw = async (req, res) => {
  try {
    const { items } = req.body; // array of { grnItemId, type: 'BRANDED' | 'NON-BRANDED' }
    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: "No items provided." });
    }

    const rawId = req.user?.storeId || req.user?.warehouseId || req.body?.storeId || req.query?.storeId || null;
    const storeId = await resolveWriteStoreId(rawId);

    const result = await prisma.$transaction(async (tx) => {
      let configuredCount = 0;
      let configuredItems = [];

      for (const item of items) {
        const grnItem = await tx.procurementGoodsReceiptItem.findUnique({
          where: { id: item.grnItemId },
          include: { product: true, grn: true }
        });

        if (!grnItem || grnItem.qcRemarks?.includes('[CONFIGURED_RAW]')) {
          continue; // Skip if already configured or not found
        }

        // Update the GRN item atomically to mark as configured
        const updatedRemarks = grnItem.qcRemarks ? `${grnItem.qcRemarks} [CONFIGURED_RAW]` : '[CONFIGURED_RAW]';
        await tx.procurementGoodsReceiptItem.update({
          where: { id: item.grnItemId },
          data: { qcRemarks: updatedRemarks }
        });

        // Add to Raw Inventory logic
        if (grnItem.product) {
          await tx.product.update({
            where: { id: grnItem.productId },
            data: {
              productType: item.type, // 'BRANDED' or 'NON-BRANDED'
              inventoryType: 'RAW',
              stock: { increment: grnItem.receivedQty }
            }
          });

          // Resolve the correct inventory location
          const targetStoreId = storeId || grnItem.grn?.storeId;
          let location = await tx.inventoryLocation.findFirst({
            where: { storeId: targetStoreId }
          });

          if (!location) {
            const storeRecord = await tx.store.findUnique({
              where: { id: targetStoreId }
            });
            if (storeRecord && storeRecord.warehouseId) {
              location = await tx.inventoryLocation.findFirst({
                where: { warehouseId: storeRecord.warehouseId }
              });
            }
          }

          if (!location && rawId) {
            location = await tx.inventoryLocation.findFirst({
              where: { warehouseId: rawId }
            });
          }

          if (!location) {
             // Fallback to the first available location to prevent hard crashes
             location = await tx.inventoryLocation.findFirst();
          }

          if (!location) {
            throw new Error(`Inventory location not found for store ${targetStoreId}`);
          }

          // Use InventoryService to sync UnifiedInventory, Movement, and Ledger
          await InventoryService.adjustStock({
            locationId: location.id,
            productId: grnItem.productId,
            changeQty: grnItem.receivedQty,
            type: 'INWARD',
            referenceType: 'GRN',
            referenceId: grnItem.grnId,
            userId: req.user?.id || null,
            tx: tx
          });
        }
        
        configuredItems.push(item.grnItemId);
        configuredCount++;
      }

      return { configuredCount, configuredItems };
    });

    res.json({
      success: true,
      message: `Successfully configured ${result.configuredCount} items.`,
      data: result
    });
  } catch (error) {
    console.error("Error configuring GRN items:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
