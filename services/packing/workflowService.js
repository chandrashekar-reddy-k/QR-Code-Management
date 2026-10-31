import { prisma } from '../../config/prismaClient.js';
import { InventoryCache } from '../../utils/cacheHelper.js';
import { InventoryService } from '../../services/inventoryService.js';

export const workflowService = {
  // --- Material Issue ---
  async createMaterialIssue(data, userId) {
    const woId = data.woId || data.id;
    const payload = data.payload || data;
    const issueNo = `MI-${Date.now().toString().slice(-6)}`;

    return await prisma.$transaction(async (tx) => {
      // 1. Check Work Order status
      const wo = await tx.workOrder.findUnique({ where: { id: woId } });
      if (!wo) throw new Error("Work Order not found");
      if (wo.status === 'MATERIAL_ISSUED' || wo.status === 'COMPLETED' || wo.status === 'CANCELLED') {
        const error = new Error(`Cannot issue materials. Work order is in ${wo.status} state.`);
        error.statusCode = 409;
        throw error;
      }

      // 2. Determine Location for Ledger
      let location = null;
      if (wo.warehouseId) {
        location = await tx.inventoryLocation.findFirst({
          where: { warehouseId: wo.warehouseId, type: 'WAREHOUSE' }
        });
      }
      if (!location) {
        location = await tx.inventoryLocation.findFirst();
      }

      // 3. Deduct Materials & Update sourceItems
      const materials = payload.materials || [];
      let sourceItems = Array.isArray(wo.sourceItems) ? JSON.parse(JSON.stringify(wo.sourceItems)) : [];

      for (const mat of materials) {
        if (!mat.issuedQty) continue;

        const issuedQty = Number(mat.issuedQty);
        if (issuedQty <= 0) continue;

        // Deduct from sourceItems in WorkOrder JSON
        if (sourceItems.length > 0) {
          const matchedItem = sourceItems.find(
            (s) =>
              (mat.productId && (s.id === mat.productId || s.productId === mat.productId)) ||
              (mat.itemCode && s.sku === mat.itemCode) ||
              (mat.materialName && (s.product === mat.materialName || s.productName === mat.materialName))
          );
          if (matchedItem) {
            const currentAvail = Number(matchedItem.availableQty) || 0;
            matchedItem.availableQty = Math.max(0, currentAvail - issuedQty);
          }
        }

        // Find Product in DB
        let product = null;
        if (mat.productId) {
          product = await tx.product.findUnique({ where: { id: mat.productId } }).catch(() => null);
        }
        if (!product && mat.itemCode) {
          product = await tx.product.findFirst({ where: { sku: mat.itemCode } }).catch(() => null);
        }
        if (!product && mat.materialName) {
          product = await tx.product.findFirst({ where: { name: mat.materialName } }).catch(() => null);
        }

        if (product) {
          // Deduct from Product.stock
          await tx.product.update({
            where: { id: product.id },
            data: { stock: { decrement: issuedQty } }
          });

          // Deduct from ProductionStock if allocated
          try {
            const currentProdStock = await tx.productionStock.findUnique({
              where: { productId: product.id }
            });
            if (currentProdStock && currentProdStock.inProductionQty > 0) {
              const decr = Math.min(currentProdStock.inProductionQty, issuedQty);
              await tx.productionStock.update({
                where: { productId: product.id },
                data: { inProductionQty: { decrement: decr } }
              });
            }
          } catch (_psErr) {}

          // Sync with InventoryService
          if (location) {
            await InventoryService.adjustStock({
              locationId: location.id,
              productId: product.id,
              changeQty: -issuedQty,
              type: 'OUTWARD',
              referenceType: 'WORK_ORDER',
              referenceId: wo.id,
              userId,
              allowNegative: true,
              tx
            }).catch((err) => console.warn('[createMaterialIssue] InventoryService adjustStock warning:', err.message));
          }
        }
      }

      // 4. Create Material Issue record
      const materialIssue = await tx.materialIssue.create({
        data: {
          issueNo,
          woId,
          issuedById: userId,
          status: 'ISSUED',
          payload: payload || {}
        },
        include: {
          workOrder: true,
          issuedBy: { select: { id: true, name: true, email: true } }
        }
      });

      // 5. Update Work Order status to MATERIAL_ISSUED and update sourceItems
      const updatedWO = await tx.workOrder.update({
        where: { id: woId },
        data: {
          status: 'MATERIAL_ISSUED',
          sourceItems: sourceItems.length > 0 ? sourceItems : wo.sourceItems
        },
        include: {
          product: { include: { category: true } },
          supervisor: { select: { id: true, name: true, email: true } },
          operator: { select: { id: true, name: true, email: true } }
        }
      });

      return { issue: materialIssue, updatedWO };
    });
  },

  async getMaterialIssueByWoId(woId) {
    return prisma.materialIssue.findFirst({
      where: { woId },
      include: {
        workOrder: true,
        issuedBy: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  // --- Quality Check ---
  async getQualityChecks(params = {}) {
    const limit = parseInt(params.limit) || 500;
    const page = parseInt(params.page) || 1;
    const skip = (page - 1) * limit;

    const where = {};
    if (params.woId) where.woId = params.woId;

    const [data, total] = await Promise.all([
      prisma.qualityCheck.findMany({
        where,
        skip,
        take: limit,
        include: {
          inspector: { select: { id: true, name: true, email: true } },
          workOrder: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
              supervisor: { select: { id: true, name: true } },
              operator: { select: { id: true, name: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.qualityCheck.count({ where })
    ]);

    return { data, total, page, limit };
  },

  async getQualityCheckByWoId(woId) {
    return prisma.qualityCheck.findFirst({
      where: { woId },
      include: {
        inspector: { select: { id: true, name: true, email: true } },
        workOrder: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
            supervisor: { select: { id: true, name: true } },
            operator: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  async submitQualityCheck(data, inspectorId) {
    const qcNumber = `QC-${Date.now().toString().slice(-6)}`;
    const {
      woId,
      checkedQty,
      result,
      severity,
      failureReason,
      remarks,
      checksPayload,
      targetWoStatus
    } = data;

    const qcRecord = await prisma.qualityCheck.create({
      data: {
        qcNumber,
        woId,
        inspectorId: inspectorId || data.inspectorId,
        checkedQty: parseFloat(checkedQty) || 0,
        result: result || 'PASS',
        severity: severity || null,
        failureReason: failureReason || null,
        remarks: remarks || null,
        checksPayload: checksPayload || {}
      },
      include: {
        inspector: { select: { id: true, name: true, email: true } },
        workOrder: true
      }
    });

    // Determine target WO status
    let finalWoStatus = targetWoStatus;
    if (!finalWoStatus) {
      if (result === 'PASS' || result === 'PARTIAL_PASS') finalWoStatus = 'QC_PASSED';
      else if (result === 'FAIL' || result === 'REJECT' || result === 'REWORK' || result === 'DISCARD') finalWoStatus = 'QC_FAILED';
      else if (result === 'HOLD') finalWoStatus = 'QC_HOLD';
      else finalWoStatus = 'QC_PASSED';
    }

    await prisma.workOrder.update({
      where: { id: woId },
      data: {
        status: finalWoStatus,
        inspectorId: inspectorId || data.inspectorId
      }
    });

    return qcRecord;
  },

  // --- Finished Goods ---
  async getFinishedGoods(params = {}) {
    const limit = parseInt(params.limit) || 500;
    const page = parseInt(params.page) || 1;
    const skip = (page - 1) * limit;

    const where = {};
    if (params.woId) where.woId = params.woId;

    const [data, total] = await Promise.all([
      prisma.finishedGoods.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: { select: { id: true, name: true, sku: true, price: true, mrp: true } },
          workOrder: {
            include: {
              product: { select: { id: true, name: true, sku: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.finishedGoods.count({ where })
    ]);

    return { data, total, page, limit };
  },

  async postFinishedGoods(data, userId) {
    const { woId, batchNumber, vehicleId, costPayload } = data;

    // Normalize to allocations array
    let allocations = data.allocations || [];
    if (allocations.length === 0 && data.postedQty && data.destination) {
      allocations.push({ destination: data.destination, qty: parseFloat(data.postedQty) });
    }

    if (allocations.length === 0) {
      const err = new Error('No allocations provided');
      err.statusCode = 400;
      throw err;
    }

    // Filter out invalid/zero qty allocations
    allocations = allocations
      .map(a => ({ destination: a.destination, qty: parseFloat(a.qty) || 0 }))
      .filter(a => a.qty > 0);

    if (allocations.length === 0) {
      const err = new Error('Total posted quantity must be greater than zero');
      err.statusCode = 400;
      throw err;
    }

    const totalPQty = allocations.reduce((sum, a) => sum + a.qty, 0);

    const wo = await prisma.workOrder.findUnique({ where: { id: woId }, include: { product: true } });
    if (!wo) {
      const err = new Error('Work order not found');
      err.statusCode = 400;
      throw err;
    }

    // Fetch QC records to validate total approved
    const qcRecords = await prisma.qualityCheck.findMany({
      where: { woId, result: { in: ['PASS', 'PARTIAL_PASS', 'CONDITIONAL_PASS'] } }
    });

    let totalApproved = 0;
    if (Array.isArray(wo.outputAllocations) && wo.outputAllocations.length > 0) {
      totalApproved = wo.outputAllocations.reduce((sum, a) => sum + (Number(a.approvedQty ?? a.packedUnits ?? a.packedQty ?? a.plannedUnits) || 0), 0);
    } else {
      totalApproved = wo.actualProduced || wo.requiredQty || 0;
    }

    if (qcRecords.length > 0) {
      const maxQcQty = qcRecords.reduce((sum, qc) => sum + (qc.checkedQty || 0), 0);
      if (maxQcQty > totalApproved) {
        totalApproved = maxQcQty;
      }
    }

    const existingFGs = await prisma.finishedGoods.findMany({ where: { woId } });
    const alreadyPosted = existingFGs.reduce((sum, fg) => sum + (fg.postedQty || 0), 0);

    if (alreadyPosted + totalPQty > totalApproved) {
      const err = new Error(`Cannot post more than approved quantity. Available to post: ${Math.max(0, totalApproved - alreadyPosted)}`);
      err.statusCode = 400;
      throw err;
    }

    const fgRecords = await prisma.$transaction(async (tx) => {
      const createdFgs = [];
      let currentPosted = alreadyPosted;

      for (let i = 0; i < allocations.length; i++) {
        const alloc = allocations[i];
        const fgNumber = `FG-${Date.now().toString().slice(-6)}-${i}`;

        let targetProductId = alloc.productId || alloc.sourceProductId;
        if (!targetProductId && Array.isArray(wo.outputAllocations) && wo.outputAllocations[i]) {
          targetProductId = wo.outputAllocations[i].sourceProductId || wo.outputAllocations[i].productId;
        }
        if (!targetProductId) {
          targetProductId = wo.productId;
        }

        const createdFg = await tx.finishedGoods.create({
          data: {
            fgNumber,
            woId,
            productId: targetProductId,
            batchNumber: batchNumber || wo.batchNumber || `BATCH-${Date.now()}`,
            postedQty: alloc.qty,
            destination: alloc.destination || 'Central Warehouse',
            costPayload: costPayload ? { ...costPayload, postedBy: userId, postedAt: new Date().toISOString() } : { postedBy: userId, postedAt: new Date().toISOString() }
          },
          include: {
            product: true,
            workOrder: true
          }
        });

        createdFgs.push(createdFg);
        currentPosted += alloc.qty;

        // Inventory Updates using consolidated ChannelInventory & VehicleStockAssignment
        if (alloc.destination === 'POS Stock') {
          const existingPosInv = await tx.channelInventory.findFirst({
            where: {
              channel: 'POS_STORE',
              warehouseId: wo.warehouseId,
              productId: wo.productId,
              productVariantId: null
            }
          });

          if (existingPosInv) {
            await tx.channelInventory.update({
              where: { id: existingPosInv.id },
              data: {
                quantity: { increment: alloc.qty },
                isActive: true
              }
            });
          } else {
            await tx.channelInventory.create({
              data: {
                channel: 'POS_STORE',
                warehouseId: wo.warehouseId,
                productId: wo.productId,
                productVariantId: null,
                quantity: alloc.qty,
                channelPrice: wo.product?.price || 0,
                taxRate: 5.0,
                isActive: true
              }
            });
          }

          await tx.product.update({
            where: { id: wo.productId },
            data: {
              stock: { increment: alloc.qty },
              status: 'APPROVED',
              isActive: true,
              ...(wo.warehouseId ? { warehouseId: wo.warehouseId } : {})
            }
          });
        } else if (alloc.destination === 'Online Stock') {
          const existingOnlineInv = await tx.channelInventory.findFirst({
            where: {
              channel: 'ONLINE_APP',
              warehouseId: wo.warehouseId,
              productId: wo.productId,
              productVariantId: null
            }
          });

          if (existingOnlineInv) {
            await tx.channelInventory.update({
              where: { id: existingOnlineInv.id },
              data: {
                quantity: { increment: alloc.qty },
                isActive: true
              }
            });
          } else {
            await tx.channelInventory.create({
              data: {
                channel: 'ONLINE_APP',
                warehouseId: wo.warehouseId,
                productId: wo.productId,
                productVariantId: null,
                quantity: alloc.qty,
                channelPrice: wo.product?.price || 0,
                isActive: true
              }
            });
          }

          await tx.product.update({
            where: { id: wo.productId },
            data: {
              stock: { increment: alloc.qty }
            }
          });
        } else if (alloc.destination === 'Vehicle Stock') {
          const defaultVehicle = await tx.vehicle.findFirst({ where: { status: true } });
          if (defaultVehicle) {
            await tx.vehicleStockAssignment.upsert({
              where: {
                vehicleId_productId_productVariantId: {
                  vehicleId: defaultVehicle.id,
                  productId: wo.productId,
                  productVariantId: null
                }
              },
              create: {
                vehicleId: defaultVehicle.id,
                productId: wo.productId,
                productVariantId: null,
                quantity: alloc.qty,
                openingQuantity: alloc.qty,
                status: 'OPEN'
              },
              update: {
                quantity: { increment: alloc.qty },
                openingQuantity: { increment: alloc.qty }
              }
            });
          }

          await tx.product.update({
            where: { id: wo.productId },
            data: {
              stock: { increment: alloc.qty }
            }
          });

          if (wo.warehouseId) {
            const location = await tx.inventoryLocation.findFirst({
              where: { warehouseId: wo.warehouseId, type: 'WAREHOUSE' }
            });
            if (location) {
              await InventoryService.adjustStock({
                locationId: location.id,
                productId: wo.productId,
                changeQty: alloc.qty,
                type: 'ADDITION',
                referenceType: 'WORK_ORDER',
                referenceId: wo.id,
                userId,
                tx
              });
            }
          }
        } else if (alloc.destination === 'Ready Inventory' || alloc.destination.startsWith('Ready Inventory') || alloc.destination === 'Central Warehouse') {
          // Standard Ready Inventory update — Keep raw product in RAW inventory and track finished goods separately
          if (wo.product && wo.product.inventoryType !== 'RAW') {
            await tx.product.update({
              where: { id: wo.productId },
              data: { inventoryType: 'RAW' }
            });
          }

          if (wo.warehouseId) {
            const location = await tx.inventoryLocation.findFirst({
              where: { warehouseId: wo.warehouseId, type: 'WAREHOUSE' }
            });
            if (location) {
              await InventoryService.adjustStock({
                locationId: location.id,
                productId: targetProductId,
                changeQty: alloc.qty,
                type: 'ADDITION',
                referenceType: 'WORK_ORDER',
                referenceId: wo.id,
                userId,
                tx
              });
            }
          }
        }
      }

      // Always mark Work Order as COMPLETED upon posting finished goods
      await tx.workOrder.update({
        where: { id: woId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        }
      });

      return createdFgs;
    });

    InventoryCache.invalidatePrefix('vsms:inventory:').catch(() => { });

    return fgRecords;
  },

  // --- Repacking ---
  async getRepackingLogs(params = {}) {
    const limit = parseInt(params.limit) || 500;
    const page = parseInt(params.page) || 1;
    const skip = (page - 1) * limit;

    const where = {};
    if (params.woId) where.sourceWoId = params.woId;

    const [data, total] = await Promise.all([
      prisma.repackingLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          sourceWorkOrder: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
              supervisor: { select: { id: true, name: true } },
              operator: { select: { id: true, name: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.repackingLog.count({ where })
    ]);

    return { data, total, page, limit };
  },

  async startRepacking(data, userId) {
    const rpNumber = `RP-${Date.now().toString().slice(-6)}`;
    const { sourceWoId, operatorId, remarks } = data;

    const wo = await prisma.workOrder.findUnique({ where: { id: sourceWoId } });
    if (!wo) throw new Error('Work order not found');

    const log = await prisma.repackingLog.create({
      data: {
        rpNumber,
        sourceWoId,
        repackType: 'REWORK',
        recoverableQty: 0,
        wasteQty: 0,
        loggedById: userId,
        status: 'REPACKING_IN_PROGRESS',
        remarks: remarks || null,
        operatorId: operatorId || userId,
        startedAt: new Date()
      },
      include: {
        sourceWorkOrder: true
      }
    });

    await prisma.workOrder.update({
      where: { id: sourceWoId },
      data: {
        status: 'REPACKING_IN_PROGRESS',
        operatorId: operatorId || userId
      }
    });

    return log;
  },

  async updateRepacking(id, data) {
    const updateData = {};
    if (data.recoverableQty !== undefined) updateData.recoverableQty = parseFloat(data.recoverableQty);
    if (data.wasteQty !== undefined) updateData.wasteQty = parseFloat(data.wasteQty);
    if (data.remarks !== undefined) updateData.remarks = data.remarks;
    if (data.requiresRelabeling !== undefined) updateData.requiresRelabeling = data.requiresRelabeling;
    if (data.status !== undefined) updateData.status = data.status;

    if (data.status === 'REPACKING_COMPLETED') {
      updateData.completedAt = new Date();
    }

    const log = await prisma.repackingLog.update({
      where: { id },
      data: updateData,
      include: { sourceWorkOrder: true }
    });

    if (data.status === 'REPACKING_COMPLETED') {
      const targetWoStatus = log.requiresRelabeling ? 'LABEL_APPLICATION_ASSIGNED' : 'QC_PENDING';
      await prisma.workOrder.update({
        where: { id: log.sourceWoId },
        data: { status: targetWoStatus }
      });
    }

    return log;
  },

  async createRepackingLog(data, userId) {
    const rpNumber = `RP-${Date.now().toString().slice(-6)}`;
    const log = await prisma.repackingLog.create({
      data: {
        rpNumber,
        sourceWoId: data.sourceWoId,
        repackType: data.repackType || 'REWORK',
        recoverableQty: parseFloat(data.recoverableQty) || 0,
        wasteQty: parseFloat(data.wasteQty) || 0,
        targetRecipeId: data.targetRecipeId || null,
        loggedById: userId,
        status: 'REPACKING_PENDING',
        remarks: data.remarks || null,
        requiresRelabeling: data.requiresRelabeling || false,
        operatorId: data.operatorId || userId
      },
      include: { sourceWorkOrder: true }
    });

    await prisma.workOrder.update({
      where: { id: data.sourceWoId },
      data: { status: 'REPACKING_PENDING' }
    });

    return log;
  }
};
