import prisma from '../../utils/prisma.js';
import { resolveStoreScopeFromReq, resolveStoreScopeFilter } from '../../utils/resolveStoreScope.js';

// ─── STOCK REPORT (Warehouse) ─────────────────────────────────────
export const getStockReport = async (req, res) => {
  try {
    const storeScope = await resolveStoreScopeFromReq(req);
    const resolvedStoreId = storeScope.storeId;

    const isPosOnly = req.query.channel === 'POS_STORE' || req.query.posOnly === 'true';

    // 1. Get all products for the tenant/store
    const products = await prisma.product.findMany({
      where: {},
      include: {
        category: { select: { name: true } },
        channelInventories: true,
        posStoreStock: true,
        unifiedInventory: {
          where: resolvedStoreId ? {
            location: {
              OR: [
                typeof resolvedStoreId === 'string' ? { storeId: resolvedStoreId } : { storeId: resolvedStoreId },
                { warehouse: { Store: { some: typeof resolvedStoreId === 'string' ? { id: resolvedStoreId } : { id: resolvedStoreId } } } }
              ]
            }
          } : {},
          select: { onHand: true, location: { select: { name: true } } }
        },
        vehicleStocks: {
          select: { quantity: true }
        }
      }
    });

    // 2. Map products to a WarehouseInventory-like structure for frontend compatibility
    let report = products
      .map(p => {
        const warehouseQty = p.unifiedInventory.reduce((acc, curr) => acc + curr.onHand, 0);
        const vehicleQty = p.vehicleStocks ? p.vehicleStocks.reduce((acc, curr) => acc + curr.quantity, 0) : 0;
        const posInv = p.channelInventories?.find(ci => ci.channel === 'POS_STORE');
        const posQty = posInv ? posInv.quantity : (p.posStoreStock?.posStock ?? 0);
        const isPos = posInv ? Boolean(posInv.isActive) : (p.posStoreStock?.isPosEnabled ?? (Array.isArray(p.tags) && p.tags.includes('CH:POS')));
        const finalQty = isPosOnly ? posQty : (warehouseQty > 0 ? warehouseQty : (p.stock || 0));

        return {
          id: `virtual-${p.id}`,
          productId: p.id,
          quantity: finalQty, // Store POS Stock if isPosOnly, else Warehouse Stock
          posStock: posQty,
          isPos,
          isPosEnabled: isPos,
          posPrice: posInv?.channelPrice || p.posStoreStock?.posPrice || p.price,
          warehouseStock: warehouseQty > 0 ? warehouseQty : (p.stock || 0),
          vehicleStock: vehicleQty,
          totalStock: isPosOnly ? posQty : (finalQty + vehicleQty),
          storeId: p.storeId,
          product: {
            ...p,
            posStock: posQty,
            isPos,
            isPosEnabled: isPos,
            posPrice: posInv?.channelPrice || p.posStoreStock?.posPrice || p.price,
            warehouseStock: warehouseQty > 0 ? warehouseQty : (p.stock || 0),
            vehicleStock: vehicleQty,
            totalStock: isPosOnly ? posQty : (finalQty + vehicleQty)
          },
          warehouse: { name: p.unifiedInventory[0]?.location?.name || 'Main Warehouse' }
        };
      });

    if (isPosOnly) {
      report = report.filter(r => r.isPos || r.posStock > 0);
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stock report', error: error.message });
  }
};

// ─── LOW STOCK ALERT ─────────────────────────────────────
export const getLowStockAlert = async (req, res) => {
  try {
    const storeScope = await resolveStoreScopeFromReq(req);
    const resolvedStoreId = storeScope.storeId;

    const where = {};
    if (resolvedStoreId) {
      where.location = {
        OR: [
          typeof resolvedStoreId === 'string' ? { storeId: resolvedStoreId } : { storeId: resolvedStoreId },
          { warehouse: { Store: { some: typeof resolvedStoreId === 'string' ? { id: resolvedStoreId } : { id: resolvedStoreId } } } }
        ]
      };
    }

    // Get all warehouse inventory with product details
    const inventory = await prisma.unifiedInventory.findMany({
      where,
      include: {
        product: {
          select: { name: true, threshold: true, costPrice: true, price: true, status: true }
        },
        location: { select: { name: true } }
      }
    });

    // Filter items below their minimum stock threshold
    const lowStock = inventory.filter(item =>
      item.product.status === 'ACTIVE' &&
      item.product.threshold &&
      item.product.threshold > 0 &&
      item.onHand <= item.product.threshold
    ).map(item => ({
      ...item,
      quantity: item.onHand,
      product: {
        ...item.product,
        minStockAlert: item.product.threshold,
        purchasePrice: item.product.costPrice
      },
      warehouse: { name: item.location?.name || 'Main Warehouse' }
    }));

    res.json(lowStock);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching low stock alerts', error: error.message });
  }
};

// ─── PURCHASE REPORT ─────────────────────────────────────
export const getPurchaseReport = async (req, res) => {
  try {
    const { startDate, endDate, vendorId } = req.query;
    const storeScope = await resolveStoreScopeFromReq(req);
    const where = { ...storeScope };

    if (vendorId) where.vendorId = vendorId;
    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = new Date(startDate);
      if (endDate) where.invoiceDate.lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const purchases = await prisma.purchaseInvoice.findMany({
      where,
      include: {
        vendor: { select: { vendorName: true } },
        items: {
          include: { product: { select: { name: true } } }
        }
      },
      orderBy: { invoiceDate: 'desc' }
    });

    const summary = {
      totalPurchases: purchases.length,
      totalAmount: purchases.reduce((sum, p) => sum + p.totalAmount, 0),
      totalPaid: purchases.reduce((sum, p) => sum + p.paidAmount, 0),
      totalOutstanding: purchases.reduce((sum, p) => sum + (p.totalAmount - p.paidAmount), 0)
    };

    res.json({ purchases, summary });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching purchase report', error: error.message });
  }
};

// ─── VENDOR REPORT ─────────────────────────────────────
export const getVendorReport = async (req, res) => {
  try {
    const storeScope = await resolveStoreScopeFromReq(req);
    const where = { ...storeScope };

    const vendors = await prisma.vendor.findMany({
      where,
      include: {
        _count: {
          select: { purchaseInvoices: true, payments: true, purchaseOrders: true }
        }
      },
      orderBy: { currentBalance: 'desc' }
    });

    const summary = {
      totalVendors: vendors.length,
      activeVendors: vendors.filter(v => v.status === 'ACTIVE').length,
      totalOutstanding: vendors.reduce((sum, v) => sum + Math.max(0, v.currentBalance), 0),
      totalAdvance: vendors.reduce((sum, v) => sum + Math.abs(Math.min(0, v.currentBalance)), 0)
    };

    res.json({ vendors, summary });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vendor report', error: error.message });
  }
};

// ─── OUTSTANDING PAYABLES ─────────────────────────────────────
export const getOutstandingPayables = async (req, res) => {
  try {
    const storeScope = await resolveStoreScopeFromReq(req);
    const where = {
      status: { in: ['CONFIRMED', 'PARTIAL_PAID'] },
      ...storeScope
    };

    const invoices = await prisma.purchaseInvoice.findMany({
      where,
      include: {
        vendor: { select: { vendorName: true, creditDays: true, mobile: true } }
      },
      orderBy: { invoiceDate: 'asc' }
    });

    const result = invoices.map(inv => {
      const outstanding = inv.totalAmount - inv.paidAmount;
      const dueDate = new Date(new Date(inv.invoiceDate).getTime() + (inv.vendor?.creditDays || 30) * 86400000);
      const isOverdue = dueDate < new Date();
      const daysOverdue = isOverdue ? Math.floor((Date.now() - dueDate.getTime()) / 86400000) : 0;

      return {
        ...inv,
        outstanding,
        dueDate,
        isOverdue,
        daysOverdue
      };
    });

    const summary = {
      totalOutstanding: result.reduce((sum, r) => sum + r.outstanding, 0),
      overdueCount: result.filter(r => r.isOverdue).length,
      overdueAmount: result.filter(r => r.isOverdue).reduce((sum, r) => sum + r.outstanding, 0)
    };

    res.json({ invoices: result, summary });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching outstanding payables', error: error.message });
  }
};

// ─── AGING REPORT ─────────────────────────────────────
export const getAgingReport = async (req, res) => {
  try {
    const storeScope = await resolveStoreScopeFromReq(req);
    const where = {
      status: { in: ['CONFIRMED', 'PARTIAL_PAID'] },
      ...storeScope
    };

    const invoices = await prisma.purchaseInvoice.findMany({
      where,
      include: {
        vendor: { select: { vendorName: true, creditDays: true } }
      }
    });

    const now = Date.now();
    const buckets = {
      current: { count: 0, amount: 0, invoices: [] },
      '1-30': { count: 0, amount: 0, invoices: [] },
      '31-60': { count: 0, amount: 0, invoices: [] },
      '61-90': { count: 0, amount: 0, invoices: [] },
      '90+': { count: 0, amount: 0, invoices: [] }
    };

    for (const inv of invoices) {
      const outstanding = inv.totalAmount - inv.paidAmount;
      if (outstanding <= 0) continue;

      const dueDate = new Date(new Date(inv.invoiceDate).getTime() + (inv.vendor?.creditDays || 30) * 86400000);
      const daysOverdue = Math.max(0, Math.floor((now - dueDate.getTime()) / 86400000));

      let bucket;
      if (daysOverdue === 0) bucket = 'current';
      else if (daysOverdue <= 30) bucket = '1-30';
      else if (daysOverdue <= 60) bucket = '31-60';
      else if (daysOverdue <= 90) bucket = '61-90';
      else bucket = '90+';

      buckets[bucket].count++;
      buckets[bucket].amount += outstanding;
      buckets[bucket].invoices.push({
        invoiceNumber: inv.invoiceNumber,
        vendorName: inv.vendor?.vendorName,
        outstanding,
        daysOverdue
      });
    }

    res.json(buckets);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching aging report', error: error.message });
  }
};

// ─── PROFITABILITY REPORT ─────────────────────────────────────
export const getProfitabilityReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const storeScope = await resolveStoreScopeFromReq(req);
    const resolvedStore = storeScope.storeId;

    const cleanStartDate = startDate && startDate !== 'undefined' && startDate !== 'null' && startDate !== '' ? new Date(startDate) : null;
    const cleanEndDate = endDate && endDate !== 'undefined' && endDate !== 'null' && endDate !== '' ? new Date(endDate + 'T23:59:59.999Z') : null;

    const isStartValid = cleanStartDate && !isNaN(cleanStartDate.getTime());
    const isEndValid = cleanEndDate && !isNaN(cleanEndDate.getTime());

    // Get purchase costs
    const purchaseWhere = {};
    if (resolvedStore) {
      purchaseWhere.storeId = resolvedStore;
    }
    
    if (isStartValid || isEndValid) {
      purchaseWhere.invoiceDate = {};
      if (isStartValid) purchaseWhere.invoiceDate.gte = cleanStartDate;
      if (isEndValid) purchaseWhere.invoiceDate.lte = cleanEndDate;
    }

    // Get total purchases for summary
    const purchases = await prisma.purchaseInvoice.aggregate({
      where: purchaseWhere,
      _sum: { totalAmount: true }
    });

    // Get sales and calculate COGS (Cost of Goods Sold)
    const salesWhere = { status: { in: ['DELIVERED', 'COMPLETED', 'PAID'] } };
    if (resolvedStore) {
      const rawStoreIds = typeof resolvedStore === 'string' ? [resolvedStore] : (resolvedStore.in || []);
      const rawId = req.query?.storeId || req.user?.storeId || req.user?.warehouseId;
      const allTargetIds = Array.from(new Set([...rawStoreIds, ...(rawId ? [rawId] : [])])).filter(Boolean);

      if (allTargetIds.length > 0) {
        salesWhere.OR = [
          { warehouseId: { in: allTargetIds } },
          { allocatedStoreId: { in: allTargetIds } },
          { pickupStoreId: { in: allTargetIds } },
          { mobileStoreId: { in: allTargetIds } }
        ];
      }
    }

    if (isStartValid || isEndValid) {
      salesWhere.createdAt = {};
      if (isStartValid) salesWhere.createdAt.gte = cleanStartDate;
      if (isEndValid) salesWhere.createdAt.lte = cleanEndDate;
    }

    const orders = await prisma.order.findMany({
      where: salesWhere,
      select: {
        totalAmount: true,
        items: {
          select: {
            productId: true,
            quantity: true,
            unitPrice: true
          }
        }
      }
    });

    const productIds = Array.from(
      new Set(
        orders.flatMap(o => (o.items || []).map(i => i.productId)).filter(Boolean)
      )
    );

    const products = productIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, costPrice: true, price: true }
        })
      : [];

    const productMap = new Map(products.map(p => [p.id, p]));

    let totalSales = 0;
    let totalCOGS = 0;

    orders.forEach(order => {
      totalSales += (order.totalAmount || 0);
      (order.items || []).forEach(item => {
        const prod = item.productId ? productMap.get(item.productId) : null;
        const cost = prod ? (prod.costPrice ?? prod.price ?? 0) : (item.unitPrice || 0);
        totalCOGS += ((item.quantity || 0) * cost);
      });
    });

    const totalPurchases = purchases._sum.totalAmount || 0;
    const grossProfit = totalSales - totalCOGS;
    const marginPercent = totalSales > 0 ? Number(((grossProfit / totalSales) * 100).toFixed(2)) : 0;

    res.json({
      totalPurchases,
      totalSales,
      grossProfit,
      marginPercent
    });
  } catch (error) {
    console.error('[ProcurementReport] Profitability Error:', error);
    res.status(500).json({ message: 'Error fetching profitability report', error: error.message });
  }
};

// ─── STOCK LEDGER (All Movements) ─────────────────────────────────────
export const getStockLedger = async (req, res) => {
  try {
    const { productId, type, groupBy, vendorId } = req.query;
    const storeScope = await resolveStoreScopeFromReq(req);
    const resolvedStoreId = storeScope.storeId;
    const where = { ...storeScope };

    if (productId) where.productId = productId;
    if (type) where.type = type;

    if (groupBy === 'vendor') {
      const vendors = await prisma.vendor.findMany({
        where: {
          ...storeScope
        },
        include: {
          itemMappings: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  stock: true,
                  costPrice: true,
                  price: true,
                  category: { select: { name: true } },
                  sku: true
                }
              }
            }
          },
          purchaseInvoices: {
            where: { status: 'CONFIRMED' },
            orderBy: { invoiceDate: 'desc' },
            take: 1,
            select: { invoiceDate: true }
          }
        }
      });

      const summary = vendors.map(v => {
        let totalStockQty = 0;
        let inventoryValue = 0;

        v.itemMappings.forEach(m => {
          if (m.product) {
            const qty = m.product.stock || 0;
            const rate = m.lastPurchaseRate > 0 ? m.lastPurchaseRate : (m.purchasePrice > 0 ? m.purchasePrice : (m.product.costPrice || m.product.price || 0));
            totalStockQty += qty;
            inventoryValue += qty * rate;
          }
        });

        return {
          id: v.id,
          vendorName: v.vendorName,
          mobile: v.mobile,
          gstNumber: v.gstNumber,
          status: v.status,
          totalStockQty,
          inventoryValue,
          lastPurchase: v.purchaseInvoices[0]?.invoiceDate || null
        };
      });

      return res.json(summary);
    }

    if (vendorId) {
      const vendor = await prisma.vendor.findUnique({
        where: { id: vendorId },
        include: {
          itemMappings: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  stock: true,
                  costPrice: true,
                  price: true,
                  sku: true,
                  category: { select: { name: true } }
                }
              }
            }
          }
        }
      });

      if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

      const productIds = vendor.itemMappings.map(m => m.productId);
      const movements = await prisma.procurementStockLedger.findMany({
        where: {
          productId: { in: productIds },
          ...storeScope
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              costPrice: true,
              price: true,
              category: { select: { name: true } }
            }
          }
        }
      });

      // Find GoodsReceiptItems for the products to get their expiryStatus
      const grnItems = productIds.length > 0 ? await prisma.procurementGoodsReceiptItem.findMany({
        where: {
          productId: { in: productIds }
        },
        select: {
          productId: true,
          grnId: true,
          expiryStatus: true
        }
      }) : [];

      const expiryMap = {};
      grnItems.forEach(item => {
        expiryMap[`${item.productId}_${item.grnId}`] = item.expiryStatus;
      });

      const enrichedMovements = movements.map(m => {
        const prod = m.product;
        const rate = prod ? (prod.costPrice || prod.price || 0) : 0;
        let expiry = 'Safe';
        if (m.refType === 'GRN' && m.reference) {
          expiry = expiryMap[`${m.productId}_${m.reference}`] || 'Safe';
        }
        return {
          ...m,
          vendorName: vendor.vendorName,
          skuCode: prod?.sku || '—',
          category: prod?.category?.name || 'UNCATEGORIZED',
          unit: prod?.unit || 'UNITS',
          inventoryValue: m.balanceAfter * rate,
          expiryStatus: expiry || 'Safe'
        };
      });

      const products = vendor.itemMappings.map(m => {
        const prod = m.product;
        if (!prod) return null;
        const rate = m.lastPurchaseRate > 0 ? m.lastPurchaseRate : (m.purchasePrice > 0 ? m.purchasePrice : (prod.costPrice || prod.price || 0));
        return {
          id: prod.id,
          name: prod.name,
          skuCode: prod.sku,
          category: prod.category?.name || 'UNCATEGORIZED',
          unit: prod.unit || 'UNITS',
          stock: prod.stock || 0,
          purchasePrice: rate,
          totalValue: (prod.stock || 0) * rate
        };
      }).filter(Boolean);

      return res.json({
        vendor: {
          id: vendor.id,
          vendorName: vendor.vendorName,
          mobile: vendor.mobile,
          gstNumber: vendor.gstNumber,
          address: vendor.address,
          status: vendor.status
        },
        products,
        movements: enrichedMovements
      });
    }

    const ledger = await prisma.procurementStockLedger.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        product: { select: { name: true } }
      }
    });

    const grnIds = [...new Set(ledger.filter(item => item.refType === 'GRN' && item.reference).map(item => item.reference))];
    const invoiceIds = [...new Set(ledger.filter(item => item.refType && item.refType.startsWith('INVOICE') && item.reference).map(item => item.reference))];

    const grns = grnIds.length > 0 ? await prisma.procurementGoodsReceipt.findMany({
      where: { id: { in: grnIds } },
      select: {
        id: true,
        po: {
          select: {
            vendor: {
              select: { vendorName: true }
            }
          }
        }
      }
    }) : [];

    const invoices = invoiceIds.length > 0 ? await prisma.purchaseInvoice.findMany({
      where: { id: { in: invoiceIds } },
      select: {
        id: true,
        vendor: {
          select: { vendorName: true }
        }
      }
    }) : [];

    const vendorMap = {};
    grns.forEach(grn => {
      if (grn.po?.vendor?.vendorName) {
        vendorMap[grn.id] = grn.po.vendor.vendorName;
      }
    });
    invoices.forEach(inv => {
      if (inv.vendor?.vendorName) {
        vendorMap[inv.id] = inv.vendor.vendorName;
      }
    });

    const enrichedLedger = ledger.map(entry => {
      return {
        ...entry,
        vendorName: entry.reference ? (vendorMap[entry.reference] || '—') : '—'
      };
    });

    res.json(enrichedLedger);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stock ledger', error: error.message });
  }
};
