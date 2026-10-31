import { prisma } from '../../config/prismaClient.js';

export const barcodeService = {
  async getPrintHistory() {
    return prisma.labelPrintJob.findMany({
      include: {
        printedBy: { select: { id: true, name: true, email: true } },
        workOrder: {
          include: {
            product: { select: { id: true, name: true, sku: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  async printLabels(data, userId) {
    const { workOrderId, batchNumber, barcodeType, printedQty, operatorId, printer, labelTemplate } = data;

    const wo = await prisma.workOrder.findUnique({ where: { id: workOrderId } });
    if (!wo) throw new Error('Work order not found');

    const printJob = await prisma.labelPrintJob.create({
      data: {
        workOrderId,
        batchNumber: batchNumber || wo.batchNumber || `BATCH-${Date.now()}`,
        barcodeType: barcodeType || 'CODE128',
        printedQty: parseInt(printedQty) || 0,
        printedById: userId,
        status: 'Printed',
        printer: printer || 'Zebra-ZT230',
        labelTemplate: labelTemplate || 'Retail Label',
        type: 'INITIAL'
      },
      include: { workOrder: true }
    });

    const assignedOperatorId = operatorId || wo.operatorId || userId;

    // Create LabelApplicationTask for operator
    const task = await prisma.labelApplicationTask.create({
      data: {
        woId: workOrderId,
        printJobId: printJob.id,
        operatorId: assignedOperatorId,
        assignedById: userId,
        requiredQuantity: parseFloat(printedQty) || wo.requiredQty || 0,
        appliedQuantity: 0,
        remainingQuantity: parseFloat(printedQty) || wo.requiredQty || 0,
        status: 'ASSIGNED',
        assignedAt: new Date()
      }
    });

    // Update WO labelsPrinted and status
    const newPrinted = (wo.labelsPrinted || 0) + (parseInt(printedQty) || 0);
    await prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        labelsPrinted: newPrinted,
        status: 'LABEL_APPLICATION_ASSIGNED',
        operatorId: assignedOperatorId
      }
    });

    return { printJob, task };
  },

  async reprintLabels(data, userId) {
    const { jobId, reprintReason, printedQty } = data;
    const existingJob = await prisma.labelPrintJob.findUnique({ where: { id: jobId } });
    if (!existingJob) throw new Error('Original print job not found');

    const qty = printedQty || existingJob.printedQty;

    const newJob = await prisma.labelPrintJob.create({
      data: {
        workOrderId: existingJob.workOrderId,
        batchNumber: existingJob.batchNumber,
        barcodeType: existingJob.barcodeType,
        printedQty: parseInt(qty) || 0,
        printedById: userId,
        status: 'Printed',
        reprintReason: reprintReason || 'Reprint requested',
        printer: existingJob.printer,
        labelTemplate: existingJob.labelTemplate,
        type: 'REPRINT'
      },
      include: { workOrder: true }
    });

    return newJob;
  },

  async getMyTasks(userId) {
    const where = userId ? { OR: [{ operatorId: userId }, { status: { in: ['ASSIGNED', 'IN_PROGRESS'] } }] } : {};
    return prisma.labelApplicationTask.findMany({
      where,
      include: {
        workOrder: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
            supervisor: { select: { id: true, name: true } }
          }
        },
        printJob: true
      },
      orderBy: { assignedAt: 'desc' }
    });
  },

  async completeTask(data, userId) {
    const { workOrderId, appliedQuantity, taskId } = data;

    let task;
    if (taskId) {
      task = await prisma.labelApplicationTask.findUnique({ where: { id: taskId } });
    } else {
      task = await prisma.labelApplicationTask.findFirst({
        where: { woId: workOrderId, status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
        orderBy: { assignedAt: 'desc' }
      });
    }

    const qty = parseFloat(appliedQuantity) || 0;

    if (task) {
      const newApplied = (task.appliedQuantity || 0) + qty;
      const remaining = Math.max(0, task.requiredQuantity - newApplied);
      const newStatus = remaining <= 0 ? 'COMPLETED' : 'IN_PROGRESS';

      task = await prisma.labelApplicationTask.update({
        where: { id: task.id },
        data: {
          appliedQuantity: newApplied,
          remainingQuantity: remaining,
          status: newStatus,
          startedAt: task.startedAt || new Date(),
          completedAt: newStatus === 'COMPLETED' ? new Date() : null
        }
      });
    }

    const wo = await prisma.workOrder.findUnique({ where: { id: workOrderId } });
    if (wo) {
      const totalApplied = (wo.labelsApplied || 0) + qty;
      await prisma.workOrder.update({
        where: { id: workOrderId },
        data: {
          labelsApplied: totalApplied,
          status: 'LABELS_APPLIED'
        }
      });
    }

    return task;
  }
};
