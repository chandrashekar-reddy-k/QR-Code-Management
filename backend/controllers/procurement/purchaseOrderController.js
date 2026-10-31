import prisma from '../../utils/prisma.js';
import { getTenantId } from '../../utils/tenantContext.js';
import { generateId } from '../../utils/idGenerator.js';
import { logActivity } from '../../utils/activityLogger.js';
import { resolveStoreScopeFromReq, resolveWriteStoreId } from '../../utils/resolveStoreScope.js';
// Removed duplicate prisma import

// ─── METADATA UTILS ────────────────────────────────
export const parsePOMetadata = (po) => {
  if (!po) return po;
  const metaIndex = po.remarks?.indexOf('\n[PO_METADATA]:');
  let itemMeta = [];
  let attachments = {};
  let poType = 'REQUISITION';
  let taxDiscount = '';
  let cleanRemarks = po.remarks;

  if (metaIndex !== -1 && metaIndex !== undefined && metaIndex !== null) {
    cleanRemarks = po.remarks.slice(0, metaIndex);
    try {
      const parsed = JSON.parse(po.remarks.slice(metaIndex + 15));
      if (Array.isArray(parsed)) {
        itemMeta = parsed;
      } else {
        itemMeta = parsed.items || [];
        attachments = parsed.attachments || {};
        poType = parsed.poType || 'REQUISITION';
        taxDiscount = parsed.taxDiscount || '';
      }
    } catch (e) {
      console.error('Failed to parse PO metadata from remarks', e);
    }
  }

  const items = po.items ? po.items.map((item, idx) => {
    const meta = itemMeta[idx] || itemMeta.find(m => (m.productVariantId && m.productVariantId === item.productId) || m.productId === item.productId || m.productId === item.product?.id);
    const variants = item.product?.variants || [];
    let matchedVariant = null;
    if (meta?.productVariantId) {
      matchedVariant = variants.find(v => v.id === meta.productVariantId);
    }
    if (!matchedVariant && meta?.variantName) {
      matchedVariant = variants.find(v => v.variantName === meta.variantName);
    }
    if (!matchedVariant && meta?.skuCode) {
      matchedVariant = variants.find(v => v.sku === meta.skuCode);
    }
    if (!matchedVariant && (meta?.mrp || item.rate)) {
      const targetMrp = meta?.mrp || item.rate;
      matchedVariant = variants.find(v => Number(v.mrp) === Number(targetMrp) || Number(v.price) === Number(targetMrp));
    }

    return {
      ...item,
      productVariantId: matchedVariant?.id || meta?.productVariantId || item.productVariantId || null,
      variantName: matchedVariant?.variantName || meta?.variantName || item.variantName || item.product?.variantName || '',
      skuCode: matchedVariant?.sku || meta?.skuCode || item.skuCode || item.product?.skuCode || item.product?.sku || '',
      uom: meta?.uom || item.product?.unit?.name || item.product?.unit || item.uom || 'PACK',
      mrp: meta?.mrp > 0 ? meta.mrp : (matchedVariant?.mrp || item.product?.mrp || 0),
      landingPrice: meta?.landingPrice > 0 ? meta.landingPrice : (item.rate || item.product?.purchasePrice || 0),
      sellingPrice: meta?.sellingPrice > 0 ? meta.sellingPrice : (matchedVariant?.price || item.product?.price || 0),
      tax: meta ? parseFloat(meta.tax || 0) : 0,
      discount: meta ? parseFloat(meta.discount || 0) : 0
    };
  }) : [];

  return {
    ...po,
    remarks: cleanRemarks,
    items,
    attachments,
    poType,
    taxDiscount
  };
};

const parsePOsMetadata = (pos) => {
  return pos.map(parsePOMetadata);
};

// ─── CREATE PO ─────────────────────────────────────
export const createPO = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || getTenantId();
    const { vendorId, items, poDate, expectedDelivery, remarks, isDirectGRN } = req.body;

    if (!vendorId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Vendor and at least one item are required' });
    }

    // Validate vendor is active
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor || vendor.status !== 'ACTIVE') {
      return res.status(400).json({ message: 'Vendor is inactive or not found. Cannot create PO.' });
    }
    
    if (!isDirectGRN && vendor.approvalStatus !== 'APPROVED') {
      return res.status(400).json({ message: 'Vendor is pending approval. Cannot create standard PO.' });
    }

    // Validate only mapped items unless it's a Direct PO or Direct GRN
    const isDirect = req.body.poType === 'DIRECT';

    if (!isDirect && !isDirectGRN) {
      const mappedItems = await prisma.vendorItemMapping.findMany({
        where: { vendorId },
        select: { productId: true }
      });
      const mappedProductIds = new Set(mappedItems.map(m => m.productId));

      if (mappedProductIds.size > 0) {
        const variantsOfMapped = await prisma.productVariant.findMany({
          where: { productId: { in: Array.from(mappedProductIds) } },
          select: { id: true, productId: true }
        });
        variantsOfMapped.forEach(v => mappedProductIds.add(v.id));

        const unmappedItemIds = items.map(i => i.productId).filter(id => id && !mappedProductIds.has(id));
        if (unmappedItemIds.length > 0) {
          const extraVariants = await prisma.productVariant.findMany({
            where: { id: { in: unmappedItemIds } },
            select: { id: true, productId: true }
          });
          extraVariants.forEach(v => {
            if (mappedProductIds.has(v.productId)) {
              mappedProductIds.add(v.id);
            }
          });
        }
      }

      for (const item of items) {
        if (!mappedProductIds.has(item.productId)) {
          return res.status(400).json({ message: `Item ${item.productId} is not mapped to this vendor` });
        }
        if (!item.quantity || item.quantity <= 0) {
          return res.status(400).json({ message: 'All item quantities must be greater than 0' });
        }
      }
    } else {
      // Direct PO or Direct GRN validation: just ensure quantities are positive
      for (const item of items) {
        if (!item.quantity || item.quantity <= 0) {
          return res.status(400).json({ message: 'All item quantities must be greater than 0' });
        }
      }
    }

    // Normalize and clean product IDs (in case frontend passes compound IDs like "productId_variantName")
    items.forEach(item => {
      if (item.productId && typeof item.productId === 'string' && item.productId.includes('_')) {
        const potentialBaseId = item.productId.split('_')[0];
        if (potentialBaseId && potentialBaseId.length > 10) {
          item.productId = potentialBaseId;
        }
      }
    });

    // Validate and resolve item product IDs (Product or ProductVariant table)
    const itemProductIds = [...new Set(items.map(i => i.productId).filter(Boolean))];
    
    // 1. Find direct Product matches
    const existingProducts = itemProductIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: itemProductIds } },
          select: { id: true, name: true, variantName: true }
        })
      : [];
    const validProductIds = new Set(existingProducts.map(p => p.id));
    const productNameMap = new Map();
    existingProducts.forEach(p => {
      productNameMap.set(p.id, p.variantName ? `${p.name} (${p.variantName})` : p.name);
    });

    // 2. Resolve any ProductVariant IDs to their parent Product ID
    const missingProductIds = itemProductIds.filter(id => !validProductIds.has(id));
    if (missingProductIds.length > 0) {
      const matchingVariants = await prisma.productVariant.findMany({
        where: { id: { in: missingProductIds } },
        select: { 
          id: true, 
          productId: true, 
          variantName: true,
          product: true
        }
      });
      
      const variantToProductMap = new Map();
      const variantDetailMap = new Map();
      matchingVariants.forEach(v => {
        if (v.productId) {
          variantToProductMap.set(v.id, v.productId);
          variantDetailMap.set(v.id, {
            variantId: v.id,
            variantName: v.variantName || v.name || '',
            sku: v.sku || v.skuCode || '',
            parentProductId: v.productId
          });
          validProductIds.add(v.id);
          const fullName = v.product?.name 
            ? `${v.product.name}${v.variantName ? ` (${v.variantName})` : ''}` 
            : v.variantName || v.id;
          productNameMap.set(v.id, fullName);
        }
      });

      items.forEach(item => {
        if (variantToProductMap.has(item.productId)) {
          const vDetail = variantDetailMap.get(item.productId);
          item.productVariantId = item.productId;
          item.variantName = item.variantName || vDetail?.variantName || '';
          if (vDetail?.sku && (!item.skuCode || item.skuCode === 'NO-SKU')) {
            item.skuCode = vDetail.sku;
          }
          item.productId = variantToProductMap.get(item.productId);
        }
      });
    }

    const invalidItem = items.find(i => !validProductIds.has(i.productId));
    if (invalidItem) {
      const displayName = invalidItem.name || productNameMap.get(invalidItem.productId) || invalidItem.productId;
      return res.status(400).json({ message: `Invalid product "${displayName}". Product does not exist in catalog.` });
    }

    const incomingStoreId = req.body.storeId || req.user.storeId || req.user.warehouseId || null;
    const storeId = await resolveWriteStoreId(incomingStoreId);

    // Calculate totals with item-level tax & discount
    const totalAmount = items.reduce((sum, item) => {
      const qty = parseInt(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const discount = parseFloat(item.discount || 0);
      const tax = parseFloat(item.tax || 0);
      const baseVal = qty * rate;
      const discVal = baseVal * (discount / 100);
      const taxVal = (baseVal - discVal) * (tax / 100);
      return sum + (baseVal - discVal + taxVal);
    }, 0);

    const displayId = await generateId({
      entity: 'PO',
      tenantId,
      storeId
    });

    if (isDirectGRN) {
      const mappedItems = await prisma.vendorItemMapping.findMany({
        where: { vendorId },
        select: { productId: true }
      });
      const mappedProductIds = new Set(mappedItems.map(m => m.productId));

      for (const item of items) {
        if (!mappedProductIds.has(item.productId)) {
          await prisma.vendorItemMapping.upsert({
            where: { vendorId_productId: { vendorId, productId: item.productId } },
            update: { lastPurchaseRate: parseFloat(item.rate) || 0 },
            create: {
                            storeId,
              vendorId,
              productId: item.productId,
              purchasePrice: parseFloat(item.rate) || 0,
              lastPurchaseRate: parseFloat(item.rate) || 0,
              isPreferred: false
            }
          });
        }
      }
    }

    const itemMetadata = items.map(i => ({
      productId: i.productId,
      productVariantId: i.productVariantId || i.variantId || null,
      variantName: i.variantName || null,
      skuCode: i.skuCode || i.sku || null,
      uom: i.uom || i.unit || 'PACK',
      mrp: parseFloat(i.mrp || 0),
      landingPrice: parseFloat(i.landingPrice || i.rate || 0),
      sellingPrice: parseFloat(i.sellingPrice || 0),
      tax: parseFloat(i.tax || 0),
      discount: parseFloat(i.discount || 0)
    }));
    const metadataPayload = {
      items: itemMetadata,
      attachments: req.body.attachments || {},
      poType: req.body.poType || 'REQUISITION',
      taxDiscount: req.body.taxDiscount || ''
    };
    const serializedRemarks = remarks 
      ? `${remarks}\n[PO_METADATA]:${JSON.stringify(metadataPayload)}`
      : `\n[PO_METADATA]:${JSON.stringify(metadataPayload)}`;

    let po;
    try {
      po = await prisma.purchaseOrder.create({
        data: {
          storeId,
          displayId,
          vendorId,
          poDate: poDate ? new Date(poDate) : new Date(),
          expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
          remarks: serializedRemarks,
          totalAmount,
          items: {
            create: items.map(item => {
              const qty = parseInt(item.quantity) || 0;
              const rate = parseFloat(item.rate) || 0;
              const discount = parseFloat(item.discount || 0);
              const tax = parseFloat(item.tax || 0);
              const baseVal = qty * rate;
              const discVal = baseVal * (discount / 100);
              const taxVal = (baseVal - discVal) * (tax / 100);
              const itemTotal = baseVal - discVal + taxVal;

              return {
                productId: item.productId,
                quantity: qty,
                rate: rate,
                total: itemTotal
              };
            })
          }
        },
        include: {
          vendor: { select: { vendorName: true } },
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
    } catch (createErr) {
      if (createErr.code === 'P2002' && createErr.meta?.target?.includes('poNumber')) {
        console.warn('[PO] poNumber sequence collision detected, syncing sequence and retrying...');
        const maxPo = await prisma.purchaseOrder.findFirst({
          select: { poNumber: true },
          orderBy: { poNumber: 'desc' }
        });
        const nextVal = (maxPo?.poNumber || 0) + 1;
        await prisma.$queryRawUnsafe(`SELECT setval('"PurchaseOrder_poNumber_seq"', ${nextVal}, false)`);

        po = await prisma.purchaseOrder.create({
          data: {
            storeId,
            displayId,
            vendorId,
            poDate: poDate ? new Date(poDate) : new Date(),
            expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
            remarks: serializedRemarks,
            totalAmount,
            items: {
              create: items.map(item => {
                const qty = parseInt(item.quantity) || 0;
                const rate = parseFloat(item.rate) || 0;
                const discount = parseFloat(item.discount || 0);
                const tax = parseFloat(item.tax || 0);
                const baseVal = qty * rate;
                const discVal = baseVal * (discount / 100);
                const taxVal = (baseVal - discVal) * (tax / 100);
                const itemTotal = baseVal - discVal + taxVal;

                return {
                  productId: item.productId,
                  quantity: qty,
                  rate: rate,
                  total: itemTotal
                };
              })
            }
          },
          include: {
            vendor: { select: { vendorName: true } },
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
      } else {
        throw createErr;
      }
    }

    logActivity({
      userId: req.user.id,
      storeId: storeId || req.user.storeId,
      action: 'PO_CREATED',
      details: `Created Purchase Order ${po.displayId} for vendor ${po.vendor?.vendorName}. Total: ₹${totalAmount.toFixed(2)}`,
      metadata: { poId: po.id, totalAmount }
    });

    res.status(201).json({ message: 'Purchase Order created successfully', po: parsePOMetadata(po) });
  } catch (error) {
    import('fs').then(fs => fs.writeFileSync('po_error.log', error.stack || error.message));
    console.error('❌ Create PO Error:', error);
    res.status(500).json({ message: 'Error creating purchase order', error: error.message, stack: error.stack });
  }
};

// ─── GET POs ─────────────────────────────────────
export const getPOs = async (req, res) => {
  try {
    const { status, vendorId, storeId: queryStoreId } = req.query;

    const storeScope = await resolveStoreScopeFromReq(req);
    const where = { ...storeScope };

    if (status) {
      if (status.includes(',')) {
        where.status = { in: status.split(',') };
      } else {
        where.status = status;
      }
    }
    if (vendorId) where.vendorId = vendorId;

    const pos = await prisma.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        vendor: { select: { vendorName: true, mobile: true } },
        items: {
          include: {
            product: {
              include: {
                variants: true
              }
            }
          }
        },
        _count: { select: { goodsReceipts: true } }
      }
    });

    res.json(parsePOsMetadata(pos));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching purchase orders', error: error.message });
  }
};

// ─── GET SINGLE PO ─────────────────────────────────────
export const getPOById = async (req, res) => {
  try {
    const { id } = req.params;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
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
        },
        goodsReceipts: {
          include: { items: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!po) return res.status(404).json({ message: 'Purchase Order not found' });
    res.json(parsePOMetadata(po));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching purchase order', error: error.message });
  }
};

// ─── UPDATE PO STATUS ─────────────────────────────────────
export const updatePOStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['CREATED', 'APPROVED', 'ORDERED', 'DELIVERED', 'CLOSED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const po = await prisma.purchaseOrder.update({
      where: { id },
      data: { status },
      include: { vendor: { select: { vendorName: true } } }
    });

    logActivity({
      userId: req.user.id,
      
      storeId: po.storeId || req.user.storeId,
      action: 'PO_UPDATED',
      details: `Updated status of PO ${po.displayId} to ${status}`,
      metadata: { poId: id, status }
    });

    res.json({ message: `PO status updated to ${status}`, po });
  } catch (error) {
    import('fs').then(fs => fs.writeFileSync('po_status_error.log', error.stack || error.message));
    res.status(500).json({ message: 'Error updating PO status', error: error.message, stack: error.stack });
  }
};

// ─── UPDATE PO ─────────────────────────────────────
export const updatePO = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, poDate, expectedDelivery, remarks } = req.body;

    const existingPO = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!existingPO) return res.status(404).json({ message: 'PO not found' });

    const totalAmount = items ? items.reduce((sum, item) => {
      const q = parseInt(item.quantity) || 0;
      const r = parseFloat(item.rate) || 0;
      const discount = parseFloat(item.discount || 0);
      const tax = parseFloat(item.tax || 0);
      const baseVal = q * r;
      const discVal = baseVal * (discount / 100);
      const taxVal = (baseVal - discVal) * (tax / 100);
      return sum + (baseVal - discVal + taxVal);
    }, 0) : existingPO.totalAmount;

    let serializedRemarks = remarks;
    if (items || req.body.attachments) {
      const baseRemarks = remarks !== undefined ? remarks : (existingPO.remarks || '');
      const cleanBaseRemarks = baseRemarks.includes('\n[PO_METADATA]:')
        ? baseRemarks.slice(0, baseRemarks.indexOf('\n[PO_METADATA]:'))
        : baseRemarks;

      const finalItems = items || existingPO.items;
      const itemMetadata = finalItems.map(i => ({
        productId: i.productId,
        uom: i.uom || i.unit || 'PACK',
        mrp: parseFloat(i.mrp || 0),
        landingPrice: parseFloat(i.landingPrice || i.rate || 0),
        sellingPrice: parseFloat(i.sellingPrice || 0),
        tax: parseFloat(i.tax || 0),
        discount: parseFloat(i.discount || 0)
      }));

      let existingAttachments = {};
      let existingPoType = 'REQUISITION';
      let existingTaxDiscount = '';
      if (existingPO.remarks?.includes('\n[PO_METADATA]:')) {
        try {
          const parsed = JSON.parse(existingPO.remarks.slice(existingPO.remarks.indexOf('\n[PO_METADATA]:') + 15));
          if (!Array.isArray(parsed)) {
            existingAttachments = parsed.attachments || {};
            existingPoType = parsed.poType || 'REQUISITION';
            existingTaxDiscount = parsed.taxDiscount || '';
          }
        } catch {}
      }

      const finalAttachments = req.body.attachments 
        ? { ...existingAttachments, ...req.body.attachments }
        : existingAttachments;

      const metadataPayload = {
        items: itemMetadata,
        attachments: finalAttachments,
        poType: req.body.poType || existingPoType,
        taxDiscount: req.body.taxDiscount !== undefined ? req.body.taxDiscount : existingTaxDiscount
      };

      serializedRemarks = cleanBaseRemarks 
        ? `${cleanBaseRemarks}\n[PO_METADATA]:${JSON.stringify(metadataPayload)}`
        : `\n[PO_METADATA]:${JSON.stringify(metadataPayload)}`;
    }

    const po = await prisma.$transaction(async (tx) => {
      // Delete old items if items are provided
      if (items) {
        await tx.purchaseOrderItem.deleteMany({ where: { poId: id } });
      }

      const parsedDate = poDate ? new Date(poDate) : null;
      const isValidDate = parsedDate && !isNaN(parsedDate.getTime());
      
      const parsedExp = expectedDelivery ? new Date(expectedDelivery) : null;
      const isValidExp = parsedExp && !isNaN(parsedExp.getTime());

      return await tx.purchaseOrder.update({
        where: { id },
        data: {
          poDate: isValidDate ? parsedDate : existingPO.poDate,
          expectedDelivery: isValidExp ? parsedExp : (expectedDelivery === null ? null : existingPO.expectedDelivery),
          remarks: serializedRemarks !== undefined ? serializedRemarks : existingPO.remarks,
          totalAmount,
          items: items ? {
            create: items.map(item => {
              const q = parseInt(item.quantity) || 0;
              const r = parseFloat(item.rate) || 0;
              const discount = parseFloat(item.discount || 0);
              const tax = parseFloat(item.tax || 0);
              const baseVal = q * r;
              const discVal = baseVal * (discount / 100);
              const taxVal = (baseVal - discVal) * (tax / 100);
              const itemTotal = baseVal - discVal + taxVal;
              return {
                productId: item.productId,
                quantity: q,
                rate: r,
                total: itemTotal
              };
            })
          } : undefined
        },
        include: {
          vendor: { select: { vendorName: true } },
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
    });

    logActivity({
      userId: req.user.id,
      
      storeId: po.storeId || req.user.storeId,
      action: 'PO_UPDATED',
      details: `Updated Purchase Order ${po.displayId}`,
      metadata: { poId: id }
    });

    res.json({ message: 'Purchase Order updated successfully', po: parsePOMetadata(po) });
  } catch (error) {
    console.error('❌ Update PO Error:', error);
    res.status(500).json({ message: 'Error updating purchase order', error: error.message });
  }
};

// ─── DELETE PO ─────────────────────────────────────
export const deletePO = async (req, res) => {
  try {
    const { id } = req.params;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { _count: { select: { goodsReceipts: true } } }
    });

    if (!po) return res.status(404).json({ message: 'PO not found' });
    
    // Safety check: Don't delete if goods have been received or if it's closed
    if (po._count.goodsReceipts > 0) {
      return res.status(400).json({ message: 'Cannot delete PO with associated Goods Receipts. Cancel it instead.' });
    }

    await prisma.$transaction([
      prisma.purchaseOrderItem.deleteMany({ where: { poId: id } }),
      prisma.purchaseOrder.delete({ where: { id } })
    ]);

    logActivity({
      userId: req.user.id,
      
      storeId: po.storeId || req.user.storeId,
      action: 'PO_DELETED',
      details: `Deleted Purchase Order ${po.displayId}`,
      metadata: { poId: id, poNumber: po.displayId }
    });

    res.json({ message: 'Purchase Order deleted successfully' });
  } catch (error) {
    console.error('❌ Delete PO Error:', error);
    res.status(500).json({ message: 'Error deleting purchase order', error: error.message });
  }
};
