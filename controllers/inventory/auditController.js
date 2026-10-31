import { prisma } from '../../config/prismaClient.js';

/**
 * Generate unique audit number: AUD-YYYYMMDD-XXXX
 */
const generateAuditNumber = async () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await prisma.inventoryAudit.count();
  const seq = String(count + 1).padStart(4, '0');
  return `AUD-${dateStr}-${seq}`;
};

/**
 * 1. GET Dashboard Metrics & Audit Summary
 * route: GET /api/v1/inventorymanagement/audits/dashboard
 */
export const getAuditDashboard = async (req, res) => {
  try {
    const { storeId } = req.query;
    const where = {};
    if (storeId && storeId !== 'ALL' && storeId !== 'undefined' && storeId !== 'null') {
      where.storeId = storeId;
    }

    const [
      totalAudits,
      draftCount,
      pendingReviewCount,
      approvedCount,
      closedCount,
      recentAudits
    ] = await Promise.all([
      prisma.inventoryAudit.count({ where }),
      prisma.inventoryAudit.count({ where: { ...where, status: 'DRAFT' } }),
      prisma.inventoryAudit.count({ where: { ...where, status: { in: ['COUNT_SUBMITTED', 'PENDING_REVIEW', 'NEEDS_RECONCILIATION'] } } }),
      prisma.inventoryAudit.count({ where: { ...where, status: 'APPROVED' } }),
      prisma.inventoryAudit.count({ where: { ...where, status: 'CLOSED' } }),
      prisma.inventoryAudit.findMany({
        where,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          auditor: { select: { id: true, name: true, phone: true } },
          reviewer: { select: { id: true, name: true } },
          vehicle: { select: { id: true, vehicleNumber: true, vehicleName: true } },
          store: { select: { id: true, name: true } },
          _count: { select: { items: true } }
        }
      })
    ]);

    // Aggregate variance items across audits
    const lineStats = await prisma.inventoryAuditLine.aggregate({
      where: {
        audit: where,
        varianceQuantity: { not: 0 }
      },
      _count: { id: true },
      _sum: { varianceValue: true, varianceQuantity: true }
    });

    // Real-time active SKU count for each section (all products belonging to that channel/section, even if stock is 0)
    const [
      rawCount,
      repackingCount,
      readyCount,
      vehicleStocksCount,
      posCount,
      onlineCount,
      hubProds
    ] = await Promise.all([
      prisma.product.count({
        where: {
          isActive: true,
          inventoryType: { in: ['RAW', 'Raw', 'raw'] }
        }
      }),
      prisma.product.count({
        where: {
          isActive: true,
          inventoryType: { in: ['PRODUCTION', 'Production', 'repacking', 'REPACKING'] }
        }
      }),
      prisma.product.count({
        where: {
          isActive: true,
          OR: [
            { inventoryType: 'READY' },
            { finishedGoods: { some: {} } }
          ]
        }
      }),
      prisma.vehicleStock.count(),
      prisma.channelInventory.count({
        where: {
          channel: { in: ['POS_STORE', 'POS'] }
        }
      }),
      prisma.channelInventory.count({
        where: {
          channel: { in: ['ONLINE_APP', 'ONLINE', 'APP'] }
        }
      }),
      prisma.product.findMany({
        where: { isActive: true },
        select: { stock: true, price: true }
      })
    ]);

    const totalHubStockValue = hubProds.reduce((sum, p) => sum + (Number(p.stock || 0) * Number(p.price || 0)), 0);

    // Dynamic Last Audit & Variance stats for each section
    const sectionScopes = ['RAW_INVENTORY', 'REPACKING', 'READY_INVENTORY', 'VEHICLE', 'POS_CHANNEL', 'ONLINE_CHANNEL', 'HUB_CONSOLIDATED'];
    const lastAudits = await Promise.all(
      sectionScopes.map(scopeKey =>
        prisma.inventoryAudit.findFirst({
          where: {
            ...where,
            scope: scopeKey,
            status: { in: ['CLOSED', 'APPROVED', 'COUNT_SUBMITTED', 'PENDING_REVIEW'] }
          },
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              where: { varianceQuantity: { not: 0 } },
              select: { id: true }
            }
          }
        })
      )
    );

    const sectionAuditStats = {};
    sectionScopes.forEach((sKey, idx) => {
      const a = lastAudits[idx];
      sectionAuditStats[sKey] = {
        lastAuditDate: a?.reviewedAt || a?.createdAt || null,
        varianceCount: a ? (a.items?.length || 0) : 0
      };
    });

    res.json({
      success: true,
      data: {
        metrics: {
          totalAudits,
          draftCount,
          pendingReviewCount,
          approvedCount,
          closedCount,
          itemsWithVariance: lineStats._count.id || 0,
          totalVarianceValue: Math.round(lineStats._sum.varianceValue || 0),
          totalVarianceQuantity: Math.round(lineStats._sum.varianceQuantity || 0),
          sectionCounts: {
            RAW_INVENTORY: rawCount,
            REPACKING: repackingCount,
            READY_INVENTORY: readyCount,
            VEHICLE: vehicleStocksCount,
            POS_CHANNEL: posCount,
            ONLINE_CHANNEL: onlineCount,
            HUB_CONSOLIDATED: hubProds.length,
            HUB_STOCK_VALUE: Math.round(totalHubStockValue)
          },
          sectionAuditStats
        },
        recentAudits
      }
    });
  } catch (error) {
    console.error('[AuditController] Dashboard Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit dashboard', error: error.message });
  }
};

/**
 * 2. GET List of Audits (with filters and pagination)
 * route: GET /api/v1/inventorymanagement/audits
 */
export const listAudits = async (req, res) => {
  try {
    const { storeId, scope, status, search, page = 1, limit = 20 } = req.query;
    const where = {};

    if (storeId && storeId !== 'ALL' && storeId !== 'undefined' && storeId !== 'null') {
      where.storeId = storeId;
    }
    if (scope && scope !== 'ALL') {
      where.scope = scope;
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search && search.trim()) {
      where.OR = [
        { auditNumber: { contains: search.trim(), mode: 'insensitive' } },
        { auditor: { name: { contains: search.trim(), mode: 'insensitive' } } },
        { vehicle: { vehicleNumber: { contains: search.trim(), mode: 'insensitive' } } }
      ];
    }

    const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [total, audits] = await Promise.all([
      prisma.inventoryAudit.count({ where }),
      prisma.inventoryAudit.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          auditor: { select: { id: true, name: true, phone: true } },
          reviewer: { select: { id: true, name: true } },
          vehicle: { select: { id: true, vehicleNumber: true, vehicleName: true } },
          store: { select: { id: true, name: true } },
          _count: { select: { items: true } }
        }
      })
    ]);

    res.json({
      success: true,
      data: audits,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('[AuditController] List Audits Error:', error);
    res.status(500).json({ success: false, message: 'Failed to list audits', error: error.message });
  }
};

/**
 * 3. GET Single Audit Details with Items
 * route: GET /api/v1/inventorymanagement/audits/:id
 */
export const getAuditById = async (req, res) => {
  try {
    const { id } = req.params;
    const audit = await prisma.inventoryAudit.findUnique({
      where: { id },
      include: {
        auditor: { select: { id: true, name: true, phone: true, role: true } },
        reviewer: { select: { id: true, name: true, phone: true } },
        vehicle: { select: { id: true, vehicleNumber: true, vehicleName: true, displayId: true } },
        store: { select: { id: true, name: true } },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                barcode: true,
                unit: true,
                price: true,
                costPrice: true,
                category: { select: { name: true } },
                masterProduct: { select: { sku: true, name: true } },
                variants: { select: { id: true, sku: true, variantName: true }, take: 1 }
              }
            }
          },
          orderBy: { expectedQuantity: 'desc' }
        }
      }
    });

    if (!audit) {
      return res.status(404).json({ success: false, message: 'Audit record not found' });
    }

    // If BLIND counting method and status is DRAFT, hide expected quantities and variances from counter
    const isBlindDraft = audit.countingMethod === 'BLIND' && audit.status === 'DRAFT';
    const sanitizedItems = audit.items.map(item => {
      if (isBlindDraft) {
        return {
          ...item,
          expectedQuantity: null,
          varianceQuantity: null,
          variancePercent: null,
          varianceValue: null
        };
      }
      return item;
    });

    res.json({
      success: true,
      data: {
        ...audit,
        items: sanitizedItems
      }
    });
  } catch (error) {
    console.error('[AuditController] Get Audit Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit details', error: error.message });
  }
};

/**
 * 4. INITIATE AUDIT: Create Snapshot & Pre-fill Expected Ledger Stock
 * route: POST /api/v1/inventorymanagement/audits/initiate
 */
export const initiateAudit = async (req, res) => {
  try {
    const { storeId, scope, vehicleId, countingMethod = 'SYSTEM_ASSISTED', categoryId } = req.body;
    const auditorId = req.user?.id || req.body.auditorId;

    if (!scope) {
      return res.status(400).json({ success: false, message: 'Audit scope is required' });
    }
    if (scope === 'VEHICLE' && !vehicleId) {
      return res.status(400).json({ success: false, message: 'vehicleId is required for Vehicle Inventory audit' });
    }

    const auditNumber = await generateAuditNumber();
    const cutoffTime = new Date();

    // 1. Resolve Ledger Stock snapshot strictly for stock present in the selected channel/section
    let snapshotItems = [];

    if (scope === 'VEHICLE') {
      const vStocks = await prisma.vehicleStock.findMany({
        where: {
          ...(vehicleId ? { vehicleId } : {})
        },
        include: { product: true }
      });
      snapshotItems = vStocks.map(vs => ({
        productId: vs.productId,
        expectedQuantity: Number(vs.quantity || 0),
        unitPrice: Number(vs.product?.price || 0)
      }));
    } else if (scope === 'POS_CHANNEL') {
      const posInventories = await prisma.channelInventory.findMany({
        where: {
          channel: { in: ['POS_STORE', 'POS'] }
        },
        include: { Product: true }
      });
      snapshotItems = posInventories.map(ci => ({
        productId: ci.productId,
        expectedQuantity: Number(ci.quantity || 0),
        unitPrice: Number(ci.channelPrice || ci.Product?.price || 0)
      }));
    } else if (scope === 'ONLINE_CHANNEL') {
      const onlineInventories = await prisma.channelInventory.findMany({
        where: {
          channel: { in: ['ONLINE_APP', 'ONLINE', 'APP'] }
        },
        include: { Product: true }
      });
      snapshotItems = onlineInventories.map(ci => ({
        productId: ci.productId,
        expectedQuantity: Number(ci.quantity || 0),
        unitPrice: Number(ci.channelPrice || ci.Product?.price || 0)
      }));
    } else if (scope === 'RAW_INVENTORY') {
      const rawProducts = await prisma.product.findMany({
        where: {
          isActive: true,
          inventoryType: { in: ['RAW', 'Raw', 'raw'] },
          ...(storeId && storeId !== 'ALL' ? { warehouseId: storeId } : {}),
          ...(categoryId && categoryId !== 'ALL' ? { categoryId } : {})
        },
        select: { id: true, stock: true, price: true }
      });
      snapshotItems = rawProducts.map(p => ({
        productId: p.id,
        expectedQuantity: Number(p.stock || 0),
        unitPrice: Number(p.price || 0)
      }));
    } else if (scope === 'REPACKING') {
      const repackingProducts = await prisma.product.findMany({
        where: {
          isActive: true,
          inventoryType: { in: ['PRODUCTION', 'Production', 'repacking', 'REPACKING'] },
          ...(storeId && storeId !== 'ALL' ? { warehouseId: storeId } : {}),
          ...(categoryId && categoryId !== 'ALL' ? { categoryId } : {})
        },
        select: { id: true, stock: true, price: true }
      });
      snapshotItems = repackingProducts.map(p => ({
        productId: p.id,
        expectedQuantity: Number(p.stock || 0),
        unitPrice: Number(p.price || 0)
      }));
    } else if (scope === 'READY_INVENTORY') {
      // Finished / Ready goods present in warehouse stock (matches Ready Inventory screen)
      const readyProducts = await prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { inventoryType: 'READY' },
            { finishedGoods: { some: {} } }
          ],
          ...(storeId && storeId !== 'ALL' ? { warehouseId: storeId } : {}),
          ...(categoryId && categoryId !== 'ALL' ? { categoryId } : {})
        },
        select: { id: true, stock: true, price: true }
      });
      snapshotItems = readyProducts.map(p => ({
        productId: p.id,
        expectedQuantity: Number(p.stock || 0),
        unitPrice: Number(p.price || 0)
      }));
    } else {
      // HUB_CONSOLIDATED: All products across the hub
      const prods = await prisma.product.findMany({
        where: {
          isActive: true,
          ...(storeId && storeId !== 'ALL' ? { warehouseId: storeId } : {})
        },
        select: { id: true, stock: true, price: true }
      });
      snapshotItems = prods.map(p => ({
        productId: p.id,
        expectedQuantity: Number(p.stock || 0),
        unitPrice: Number(p.price || 0)
      }));
    }

    const totalExpected = snapshotItems.reduce((acc, curr) => acc + (curr.expectedQuantity || 0), 0);

    // 2. Create Audit and Audit Lines in atomic transaction
    const newAudit = await prisma.$transaction(async (tx) => {
      const audit = await tx.inventoryAudit.create({
        data: {
          auditNumber,
          tenantId: req.user?.tenantId || 'VK001',
          storeId: storeId || null,
          scope,
          vehicleId: vehicleId || null,
          countingMethod,
          status: 'DRAFT',
          cutoffTime,
          auditorId,
          totalExpectedQty: totalExpected
        }
      });

      if (snapshotItems.length > 0) {
        const linesData = snapshotItems.map(item => ({
          auditId: audit.id,
          productId: item.productId,
          expectedQuantity: item.expectedQuantity,
          unitPrice: item.unitPrice,
          countedQuantity: null,
          varianceQuantity: null,
          variancePercent: null,
          varianceValue: null
        }));
        await tx.inventoryAuditLine.createMany({ data: linesData });
      }

      return audit;
    });

    res.json({
      success: true,
      message: 'Audit initiated with frozen ledger snapshot',
      data: newAudit
    });
  } catch (error) {
    console.error('[AuditController] Initiate Audit Error:', error);
    res.status(500).json({ success: false, message: 'Failed to initiate audit', error: error.message });
  }
};

/**
 * 5. RECORD PHYSICAL COUNT: Updates count entry for SKU(s)
 * route: POST /api/v1/inventorymanagement/audits/:id/count
 */
export const recordPhysicalCount = async (req, res) => {
  try {
    const { id } = req.params;
    const { entries } = req.body; // Array of { lineId, productId, countedQuantity, remarks }

    const audit = await prisma.inventoryAudit.findUnique({ where: { id } });
    if (!audit) return res.status(404).json({ success: false, message: 'Audit not found' });
    if (audit.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Cannot record counts on non-draft audit' });
    }

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ success: false, message: 'No count entries provided' });
    }

    await prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        const lineWhere = entry.lineId
          ? { id: entry.lineId }
          : { auditId: id, productId: entry.productId };

        const line = await tx.inventoryAuditLine.findFirst({ where: lineWhere });
        if (line) {
          const counted = Math.max(0, Number(entry.countedQuantity || 0));
          const diff = counted - line.expectedQuantity;
          const pct = line.expectedQuantity > 0 ? (diff / line.expectedQuantity) * 100 : 0;
          const val = diff * line.unitPrice;

          await tx.inventoryAuditLine.update({
            where: { id: line.id },
            data: {
              countedQuantity: counted,
              varianceQuantity: diff,
              variancePercent: Number(pct.toFixed(2)),
              varianceValue: val,
              remarks: entry.remarks || line.remarks,
              reasonCode: entry.reasonCode || line.reasonCode
            }
          });
        }
      }
    });

    res.json({ success: true, message: 'Count recorded successfully' });
  } catch (error) {
    console.error('[AuditController] Record Count Error:', error);
    res.status(500).json({ success: false, message: 'Failed to record counts', error: error.message });
  }
};

/**
 * 6. SUBMIT AUDIT COUNT: Locks counter edits and computes total variance
 * route: POST /api/v1/inventorymanagement/audits/:id/submit
 */
export const submitAuditCount = async (req, res) => {
  try {
    const { id } = req.params;
    const audit = await prisma.inventoryAudit.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!audit) return res.status(404).json({ success: false, message: 'Audit not found' });
    if (audit.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Audit already submitted or processed' });
    }

    let totalCounted = 0;
    let totalVariance = 0;
    let totalVarianceVal = 0;
    let uncountedCount = 0;

    audit.items.forEach(item => {
      if (item.countedQuantity === null || item.countedQuantity === undefined) {
        uncountedCount++;
      } else {
        totalCounted += item.countedQuantity;
        totalVariance += (item.varianceQuantity || 0);
        totalVarianceVal += (item.varianceValue || 0);
      }
    });

    const nextStatus = totalVariance === 0 ? 'APPROVED' : 'PENDING_REVIEW';

    const updated = await prisma.inventoryAudit.update({
      where: { id },
      data: {
        status: nextStatus,
        totalCountedQty: totalCounted,
        totalVarianceQty: totalVariance,
        totalVarianceVal: totalVarianceVal
      }
    });

    res.json({
      success: true,
      message: nextStatus === 'APPROVED' ? 'Count verified with 0 variance. Audit approved.' : 'Count submitted for manager variance review.',
      data: updated
    });
  } catch (error) {
    console.error('[AuditController] Submit Audit Error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit audit count', error: error.message });
  }
};

/**
 * 7. APPROVE & POST RECONCILIATION:
 * Segregation of Duties: Reviews evidence and posts approved adjustments to authoritative stock ledgers.
 * route: POST /api/v1/inventorymanagement/audits/:id/approve
 */
export const approveAndReconcileAudit = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNotes, lineDecisions } = req.body;
    const reviewerId = req.user?.id || req.body.reviewerId;

    const audit = await prisma.inventoryAudit.findUnique({
      where: { id },
      include: { items: { include: { product: true } } }
    });

    if (!audit) return res.status(404).json({ success: false, message: 'Audit not found' });
    if (audit.status !== 'PENDING_REVIEW' && audit.status !== 'COUNT_SUBMITTED') {
      return res.status(400).json({ success: false, message: `Cannot approve audit in status ${audit.status}` });
    }

    // Segregation of duties check:
    // If the user has administrative/managerial privileges (SUPER_ADMIN, ADMIN, PARTNER, STORE_MANAGER, WAREHOUSE_MANAGER),
    // they are authorized to sign off and approve the reconciliation.
    const privilegedRoles = ['SUPER_ADMIN', 'ADMIN', 'PARTNER', 'STORE_MANAGER', 'WAREHOUSE_MANAGER', 'MANAGER'];
    const isAuthorizedApprover = privilegedRoles.includes(req.user?.role?.toUpperCase?.() || '');

    if (audit.auditorId === reviewerId && !isAuthorizedApprover) {
      return res.status(403).json({
        success: false,
        message: 'Segregation of duties policy: Auditor cannot self-approve discrepancies. Manager or Admin sign-off required.'
      });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Post approved adjustments to ledger
      for (const item of audit.items) {
        const delta = item.varianceQuantity || 0;
        if (delta !== 0 && item.countedQuantity !== null) {
          const txId = `ADJ_${audit.id}_${item.id}`.slice(0, 30);

          // Record in StockTransaction log if this is a vehicle audit with a valid vehicleId
          if (audit.vehicleId) {
            await tx.stockTransaction.create({
              data: {
                tenantId: audit.tenantId,
                storeId: audit.storeId,
                userId: reviewerId,
                type: 'AUDIT',
                vehicleId: audit.vehicleId,
                productId: item.productId,
                quantity: Math.floor(Math.abs(delta)),
                date: new Date()
              }
            });
          }

          // Adjust actual stock ledger according to the audit scope
          if (audit.scope === 'VEHICLE' && audit.vehicleId) {
            await tx.vehicleStock.upsert({
              where: { vehicleId_productId: { vehicleId: audit.vehicleId, productId: item.productId } },
              update: { quantity: Math.floor(item.countedQuantity) },
              create: {
                tenantId: audit.tenantId,
                storeId: audit.storeId,
                vehicleId: audit.vehicleId,
                productId: item.productId,
                quantity: Math.floor(item.countedQuantity),
                openingQuantity: Math.floor(item.countedQuantity)
              }
            });
          } else if (audit.scope === 'POS_CHANNEL') {
            await tx.channelInventory.updateMany({
              where: {
                productId: item.productId,
                channel: { in: ['POS_STORE', 'POS'] }
              },
              data: { quantity: Math.floor(item.countedQuantity) }
            });
          } else if (audit.scope === 'ONLINE_CHANNEL') {
            await tx.channelInventory.updateMany({
              where: {
                productId: item.productId,
                channel: { in: ['ONLINE_APP', 'ONLINE', 'APP'] }
              },
              data: { quantity: Math.floor(item.countedQuantity) }
            });
          } else {
            // Warehouse stock adjustment for RAW_INVENTORY, READY_INVENTORY, or HUB_CONSOLIDATED
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: Math.floor(item.countedQuantity) }
            });
          }

          // Mark audit line as reconciled
          await tx.inventoryAuditLine.update({
            where: { id: item.id },
            data: { isAdjusted: true, adjustmentTxId: txId }
          });
        }
      }

      // 2. Mark audit CLOSED
      await tx.inventoryAudit.update({
        where: { id },
        data: {
          status: 'CLOSED',
          reviewerId,
          reviewNotes: reviewNotes || 'Audit approved and ledger adjustments posted.',
          reviewedAt: new Date()
        }
      });
    });

    res.json({
      success: true,
      message: 'Audit approved and authoritative ledger adjustments posted successfully'
    });
  } catch (error) {
    console.error('[AuditController] Approve Audit Error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve audit', error: error.message });
  }
};
