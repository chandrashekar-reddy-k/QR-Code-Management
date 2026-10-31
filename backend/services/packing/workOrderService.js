import { prisma } from '../../config/prismaClient.js';

let columnsEnsured = false;
async function ensureWorkOrderColumns() {
  if (columnsEnsured) return;
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "PackingWorkOrder" ADD COLUMN IF NOT EXISTS "sourceItems" jsonb;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "PackingWorkOrder" ADD COLUMN IF NOT EXISTS "outputAllocations" jsonb;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "PackingWorkOrder" ADD COLUMN IF NOT EXISTS "remarks" text;`);
    columnsEnsured = true;
  } catch (err) {
    console.warn('[workOrderService] Ensure columns note:', err?.message || err);
  }
}

export const workOrderService = {
  async getWorkOrders(params = {}) {
    await ensureWorkOrderColumns();
    const limit = parseInt(params.limit) || 100;
    const page = parseInt(params.page) || 1;
    const skip = (page - 1) * limit;

    const where = {};
    if (params.status) {
      if (Array.isArray(params.status)) {
        where.status = { in: params.status };
      } else if (params.status.includes(',')) {
        where.status = { in: params.status.split(',') };
      } else {
        where.status = params.status;
      }
    }

    if (params.supervisorId) where.supervisorId = params.supervisorId;
    if (params.operatorId) where.operatorId = params.operatorId;
    if (params.inspectorId) where.inspectorId = params.inspectorId;
    if (params.warehouseId) where.warehouseId = params.warehouseId;

    if (params.search) {
      where.OR = [
        { woNumber: { contains: params.search, mode: 'insensitive' } },
        { batchNumber: { contains: params.search, mode: 'insensitive' } }
      ];
    }

    const include = {
      product: { include: { category: true, variants: true } },
      supervisor: { select: { id: true, name: true, email: true, phone: true } },
      operator: { select: { id: true, name: true, email: true, phone: true } },
      inspector: { select: { id: true, name: true, email: true, phone: true } },
      warehouse: true,
      qualityChecks: true,
      finishedGoods: true,
      repackingLogs: true,
      labelTasks: true
    };

    const [data, total] = await Promise.all([
      prisma.workOrder.findMany({
        where,
        skip,
        take: limit,
        include,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.workOrder.count({ where })
    ]);

    // Map Product uom and stock cleanly for frontend expectations
    const formattedData = data.map(wo => {
      if (wo.product) {
        wo.product.type = wo.product.productType || 'RAW_MATERIAL';
        wo.product.availableStock = wo.product.stock || 0;
        wo.product.uom = {
          id: wo.product.unit || 'unit',
          name: wo.product.unit || 'unit',
          abbreviation: wo.product.unit || 'unit'
        };
      }
      if (typeof wo.sourceItems === 'string') {
        try { wo.sourceItems = JSON.parse(wo.sourceItems); } catch (e) {}
      }
      if (typeof wo.outputAllocations === 'string') {
        try { wo.outputAllocations = JSON.parse(wo.outputAllocations); } catch (e) {}
      }
      return wo;
    });

    return { data: formattedData, total, page, limit };
  },

  async createWorkOrder(payload, creatorId) {
    await ensureWorkOrderColumns();
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = `${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 100)}`;
    const woNumber = payload.woNumber || `WO-${todayStr}-${randSuffix}`;
    const batchNumber = payload.batchNumber || `BAT-${todayStr}-${randSuffix}`;

    // 1. Resolve Product safely
    let targetProductId = payload.productId;
    let existingProduct = null;

    if (targetProductId) {
      existingProduct = await prisma.product.findFirst({
        where: {
          OR: [
            { id: targetProductId },
            { sku: targetProductId },
            { name: targetProductId }
          ]
        }
      });
    }

    if (!existingProduct && Array.isArray(payload.sourceItems) && payload.sourceItems.length > 0) {
      for (const item of payload.sourceItems) {
        const terms = [item.productId, item.id, item.sku, item.product].filter(Boolean);
        for (const term of terms) {
          existingProduct = await prisma.product.findFirst({
            where: {
              OR: [
                { id: term },
                { sku: term },
                { name: { contains: term, mode: 'insensitive' } }
              ]
            }
          });
          if (existingProduct) break;
        }
        if (existingProduct) break;
      }
    }

    if (!existingProduct) {
      existingProduct = await prisma.product.findFirst();
    }

    if (!existingProduct) {
      let category = await prisma.category.findFirst();
      if (!category) {
        category = await prisma.category.create({
          data: {
            name: 'General Category',
            slug: `gen-cat-${Date.now()}`
          }
        });
      }

      existingProduct = await prisma.product.create({
        data: {
          name: payload.sourceItems?.[0]?.product || 'General Packing Product',
          sku: `SKU-GEN-${Date.now().toString().slice(-4)}`,
          productType: 'RAW_MATERIAL',
          unit: payload.sourceItems?.[0]?.uom || 'KG',
          price: 0,
          categoryId: category.id,
          stock: 1000
        }
      });
    }

    // 2. Resolve Supervisor safely
    let supervisorId = payload.supervisorId || creatorId;
    if (supervisorId) {
      const userExists = await prisma.user.findUnique({ where: { id: supervisorId } });
      if (!userExists) supervisorId = null;
    }
    if (!supervisorId) {
      const firstUser = await prisma.user.findFirst({ select: { id: true } });
      if (firstUser) {
        supervisorId = firstUser.id;
      } else {
        const defaultUser = await prisma.user.create({
          data: {
            name: 'System Admin',
            phone: `999${Date.now().toString().slice(-7)}`,
            email: `admin_${Date.now()}@villagkart.com`,
            password: 'hashed_password_placeholder',
            role: 'ADMIN'
          }
        });
        supervisorId = defaultUser.id;
      }
    }

    // 3. Resolve Operator safely
    let operatorId = payload.operatorId;
    if (operatorId) {
      const opExists = await prisma.user.findUnique({ where: { id: operatorId } });
      if (!opExists) operatorId = null;
    }

    // 4. Resolve Inspector safely
    let inspectorId = payload.inspectorId;
    if (inspectorId) {
      const inspExists = await prisma.user.findUnique({ where: { id: inspectorId } });
      if (!inspExists) inspectorId = null;
    }

    // 5. Resolve Warehouse safely
    let warehouseId = payload.warehouseId;
    if (warehouseId) {
      const whExists = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
      if (!whExists) warehouseId = null;
    }

    const data = {
      woNumber,
      batchNumber,
      product: { connect: { id: existingProduct.id } },
      supervisor: { connect: { id: supervisorId } },
      status: payload.status || 'DRAFT',
      priority: payload.priority || 'MEDIUM',
      requiredQty: parseFloat(payload.requiredQty) || 0,
      sourceItems: payload.sourceItems || undefined,
      outputAllocations: payload.outputAllocations || undefined,
      remarks: payload.remarks || undefined,
      ...(operatorId ? { operator: { connect: { id: operatorId } } } : {}),
      ...(inspectorId ? { inspector: { connect: { id: inspectorId } } } : {}),
      ...(warehouseId ? { warehouse: { connect: { id: warehouseId } } } : {}),
      expectedDate: payload.expectedDate ? new Date(payload.expectedDate) : null
    };

    const created = await prisma.workOrder.create({
      data,
      include: {
        product: { include: { category: true } },
        supervisor: { select: { id: true, name: true, email: true } },
        operator: { select: { id: true, name: true, email: true } },
        inspector: { select: { id: true, name: true, email: true } }
      }
    });

    // Save JSONB fields safely via raw SQL so work order creation never fails due to Prisma Client DMMF schema version mismatch
    const sourceItemsJson = payload.sourceItems ? JSON.stringify(payload.sourceItems) : null;
    const outputAllocationsJson = payload.outputAllocations ? JSON.stringify(payload.outputAllocations) : null;
    const remarksVal = payload.remarks || null;

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "PackingWorkOrder" SET "sourceItems" = $1::jsonb, "outputAllocations" = $2::jsonb, "remarks" = $3 WHERE "id" = $4`,
        sourceItemsJson,
        outputAllocationsJson,
        remarksVal,
        created.id
      );
    } catch (err) {
      console.warn('[workOrderService] Optional JSON fields update note:', err?.message || err);
    }

    created.sourceItems = payload.sourceItems || null;
    created.outputAllocations = payload.outputAllocations || null;
    created.remarks = payload.remarks || null;

    if (created.product) {
      created.product.type = created.product.productType || 'RAW_MATERIAL';
      created.product.availableStock = created.product.stock || 0;
      created.product.uom = {
        id: created.product.unit || 'unit',
        name: created.product.unit || 'unit',
        abbreviation: created.product.unit || 'unit'
      };
    }

    return created;
  },

  async getWorkOrderById(id) {
    const wo = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        product: { include: { category: true, variants: true } },
        supervisor: { select: { id: true, name: true, email: true, phone: true } },
        operator: { select: { id: true, name: true, email: true, phone: true } },
        inspector: { select: { id: true, name: true, email: true, phone: true } },
        warehouse: true,
        qualityChecks: true,
        finishedGoods: true,
        repackingLogs: true,
        labelTasks: true,
        LabelPrintJob: true
      }
    });

    if (wo && wo.product) {
      wo.product.type = wo.product.productType || 'RAW_MATERIAL';
      wo.product.availableStock = wo.product.stock || 0;
      wo.product.uom = {
        id: wo.product.unit || 'unit',
        name: wo.product.unit || 'unit',
        abbreviation: wo.product.unit || 'unit'
      };
    }

    if (wo) {
      if (typeof wo.sourceItems === 'string') {
        try { wo.sourceItems = JSON.parse(wo.sourceItems); } catch (e) {}
      }
      if (typeof wo.outputAllocations === 'string') {
        try { wo.outputAllocations = JSON.parse(wo.outputAllocations); } catch (e) {}
      }
    }

    return wo;
  },

  async updateWorkOrder(id, payload) {
    const data = {};
    if (payload.status) data.status = payload.status;
    if (payload.priority) data.priority = payload.priority;
    if (payload.requiredQty !== undefined) data.requiredQty = parseFloat(payload.requiredQty);
    if (payload.actualProduced !== undefined) data.actualProduced = parseFloat(payload.actualProduced);
    if (payload.actualRejected !== undefined) data.actualRejected = parseFloat(payload.actualRejected);
    if (payload.batchNumber !== undefined) data.batchNumber = payload.batchNumber;
    if (payload.operatorId !== undefined) data.operatorId = payload.operatorId || null;
    if (payload.inspectorId !== undefined) data.inspectorId = payload.inspectorId || null;
    if (payload.warehouseId !== undefined) data.warehouseId = payload.warehouseId;
    if (payload.expectedDate !== undefined) data.expectedDate = payload.expectedDate ? new Date(payload.expectedDate) : null;
    if (payload.startedAt !== undefined) data.startedAt = payload.startedAt ? new Date(payload.startedAt) : null;
    if (payload.completedAt !== undefined) data.completedAt = payload.completedAt ? new Date(payload.completedAt) : null;
    if (payload.isPaused !== undefined) data.isPaused = payload.isPaused;
    if (payload.pauseReason !== undefined) data.pauseReason = payload.pauseReason;

    // Auto-advance status from PACKING_STARTED to PACKING_IN_PROGRESS if units are being produced and no explicit status is provided
    if (!payload.status && data.actualProduced !== undefined && data.actualProduced > 0) {
      const currentWo = await prisma.workOrder.findUnique({ where: { id }, select: { status: true } });
      if (currentWo && currentWo.status === 'PACKING_STARTED') {
        data.status = 'PACKING_IN_PROGRESS';
      }
    }

    const updated = await prisma.workOrder.update({
      where: { id },
      data,
      include: {
        product: { include: { category: true } },
        supervisor: { select: { id: true, name: true, email: true, phone: true } },
        operator: { select: { id: true, name: true, email: true, phone: true } },
        inspector: { select: { id: true, name: true, email: true, phone: true } }
      }
    });

    if (updated.product) {
      updated.product.type = updated.product.productType || 'RAW_MATERIAL';
      updated.product.availableStock = updated.product.stock || 0;
      updated.product.uom = {
        id: updated.product.unit || 'unit',
        name: updated.product.unit || 'unit',
        abbreviation: updated.product.unit || 'unit'
      };
    }

    return updated;
  },

  async updateWorkOrderStatus(id, status, extra = {}) {
    const data = { status };
    if (status === 'PACKING_STARTED' || status === 'PACKING_IN_PROGRESS') {
      data.startedAt = new Date();
    } else if (status === 'COMPLETED' || status === 'PACKING_COMPLETED') {
      data.completedAt = new Date();
    }

    if (extra.operatorId) data.operatorId = extra.operatorId;
    if (extra.inspectorId) data.inspectorId = extra.inspectorId;
    if (extra.priority) data.priority = extra.priority;
    if (extra.actualProduced !== undefined) data.actualProduced = parseFloat(extra.actualProduced);
    if (extra.actualRejected !== undefined) data.actualRejected = parseFloat(extra.actualRejected);
    if (extra.labelsPrinted !== undefined) data.labelsPrinted = parseFloat(extra.labelsPrinted);

    const updated = await prisma.workOrder.update({
      where: { id },
      data,
      include: {
        product: { include: { category: true } },
        supervisor: { select: { id: true, name: true, email: true } },
        operator: { select: { id: true, name: true, email: true } },
        inspector: { select: { id: true, name: true, email: true } }
      }
    });

    if (updated.product) {
      updated.product.type = updated.product.productType || 'RAW_MATERIAL';
      updated.product.availableStock = updated.product.stock || 0;
      updated.product.uom = {
        id: updated.product.unit || 'unit',
        name: updated.product.unit || 'unit',
        abbreviation: updated.product.unit || 'unit'
      };
    }

    if (status === 'PENDING') {
      try {
        const existing = await prisma.approvalRequest.findFirst({
          where: { relatedEntityId: id, status: 'PENDING' }
        });
        if (!existing) {
          let reqUser = updated.supervisorId || updated.operatorId || extra.userId;
          if (!reqUser) {
            const u = await prisma.user.findFirst({ select: { id: true } });
            reqUser = u?.id;
          }
          if (reqUser) {
            await prisma.approvalRequest.create({
              data: {
                type: 'WORK_ORDER',
                relatedEntityId: updated.id,
                relatedEntityName: updated.woNumber || updated.id,
                requestedById: reqUser,
                reason: 'Work Order Approval Request',
                priority: updated.priority || 'MEDIUM',
                status: 'PENDING'
              }
            });
          }
        }
      } catch (err) {
        console.error('[updateWorkOrderStatus] Error creating ApprovalRequest:', err);
      }
    }

    return updated;
  },

  async pauseWorkOrder(id, reason) {
    return prisma.workOrder.update({
      where: { id },
      data: {
        isPaused: true,
        pauseReason: reason || 'Work order paused by user',
        status: 'PAUSED'
      }
    });
  },

  async resumeWorkOrder(id) {
    return prisma.workOrder.update({
      where: { id },
      data: {
        isPaused: false,
        pauseReason: null,
        status: 'PACKING_IN_PROGRESS'
      }
    });
  },

  async deleteWorkOrder(id) {
    const wo = await prisma.workOrder.findUnique({ where: { id } });
    if (!wo) throw new Error('Work order not found');
    if (wo.status !== 'DRAFT' && wo.status !== 'PENDING') {
      throw new Error('Only DRAFT or PENDING work orders can be deleted');
    }
    await prisma.approvalRequest.deleteMany({ where: { relatedEntityId: id } });
    return prisma.workOrder.delete({ where: { id } });
  }
};
