import { prisma } from '../../config/prismaClient.js';

export const approvalService = {
  async getApprovals(params = {}) {
    const where = {};
    if (params.status) where.status = params.status;
    if (params.type) where.type = params.type;

    if (params.searchTerm) {
      where.OR = [
        { relatedEntityName: { contains: params.searchTerm, mode: 'insensitive' } },
        { reason: { contains: params.searchTerm, mode: 'insensitive' } }
      ];
    }

    // Auto-sync Work Orders with status 'PENDING' to ApprovalRequests
    try {
      const pendingWOs = await prisma.workOrder.findMany({
        where: { status: 'PENDING' }
      });
      for (const wo of pendingWOs) {
        const existing = await prisma.approvalRequest.findFirst({
          where: { relatedEntityId: wo.id, status: 'PENDING' }
        });
        if (!existing) {
          let reqUser = wo.supervisorId || wo.operatorId;
          if (!reqUser) {
            const u = await prisma.user.findFirst({ select: { id: true } });
            reqUser = u?.id;
          }
          if (reqUser) {
            await prisma.approvalRequest.create({
              data: {
                type: 'WORK_ORDER',
                relatedEntityId: wo.id,
                relatedEntityName: wo.woNumber || wo.id,
                requestedById: reqUser,
                reason: 'Work Order Approval Request',
                priority: wo.priority || 'MEDIUM',
                status: 'PENDING'
              }
            });
          }
        }
      }
    } catch (e) {
      console.error('[getApprovals] Error syncing PENDING WorkOrders:', e);
    }

    const data = await prisma.approvalRequest.findMany({
      where,
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
        history: {
          include: { actionBy: { select: { id: true, name: true, email: true } } },
          orderBy: { actionDate: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Clean up orphan WORK_ORDER approval requests where the underlying WorkOrder was deleted
    const woReqs = data.filter(d => d.type === 'WORK_ORDER' && d.relatedEntityId);
    if (woReqs.length > 0) {
      const woIds = [...new Set(woReqs.map(d => d.relatedEntityId))];
      const existingWOs = await prisma.workOrder.findMany({
        where: { id: { in: woIds } },
        select: { id: true }
      });
      const existingWoSet = new Set(existingWOs.map(w => w.id));
      const orphanIds = woReqs.filter(d => !existingWoSet.has(d.relatedEntityId)).map(d => d.id);
      if (orphanIds.length > 0) {
        await prisma.approvalRequest.deleteMany({ where: { id: { in: orphanIds } } }).catch(e => console.error('[getApprovals] Orphan cleanup error:', e));
        return data.filter(d => !orphanIds.includes(d.id));
      }
    }

    return data;
  },

  async createApproval(payload, userId) {
    return prisma.approvalRequest.create({
      data: {
        type: payload.type || 'WORK_ORDER',
        relatedEntityId: payload.relatedEntityId,
        relatedEntityName: payload.relatedEntityName,
        requestedById: userId,
        reason: payload.reason || 'Approval requested',
        priority: payload.priority || 'MEDIUM',
        status: 'PENDING',
        existingValues: payload.existingValues || null,
        proposedValues: payload.proposedValues || null,
        remarks: payload.remarks || null,
        attachments: payload.attachments || []
      },
      include: {
        requestedBy: { select: { id: true, name: true, email: true } }
      }
    });
  },

  async processApproval(id, action, comments, userId) {
    const status = action === 'APPROVE' || action === 'APPROVED' ? 'APPROVED' : 'REJECTED';

    let actionUser = userId;
    if (!actionUser) {
      const u = await prisma.user.findFirst({ select: { id: true } });
      actionUser = u?.id;
    }

    let approval;
    try {
      approval = await prisma.approvalRequest.update({
        where: { id },
        data: {
          status,
          remarks: comments || null,
          history: actionUser ? {
            create: {
              action: action === 'APPROVE' || action === 'APPROVED' ? 'APPROVE' : 'REJECT',
              actionById: actionUser,
              comments: comments || null
            }
          } : undefined
        },
        include: {
          requestedBy: { select: { id: true, name: true, email: true } },
          history: {
            include: { actionBy: { select: { id: true, name: true, email: true } } },
            orderBy: { actionDate: 'desc' }
          }
        }
      });
    } catch (err) {
      // Fallback: Check if id is a WorkOrder ID
      const wo = await prisma.workOrder.findUnique({ where: { id } });
      if (wo) {
        const targetWoStatus = status === 'APPROVED' ? 'APPROVED' : 'CANCELLED';
        await prisma.workOrder.update({
          where: { id },
          data: { status: targetWoStatus }
        });
        const existingAppr = await prisma.approvalRequest.findFirst({
          where: { relatedEntityId: id }
        });
        if (existingAppr) {
          approval = await prisma.approvalRequest.update({
            where: { id: existingAppr.id },
            data: { status, remarks: comments || null }
          });
        } else {
          return { id, status: targetWoStatus, relatedEntityId: id };
        }
      } else {
        throw err;
      }
    }

    // Sync corresponding WorkOrder status if approval is for a WORK_ORDER
    if (approval && approval.type === 'WORK_ORDER' && approval.relatedEntityId) {
      const targetWoStatus = status === 'APPROVED' ? 'APPROVED' : 'CANCELLED';
      await prisma.workOrder.update({
        where: { id: approval.relatedEntityId },
        data: { status: targetWoStatus }
      }).catch(e => console.error('[processApproval] Failed to update WorkOrder status:', e));
    }

    return approval;
  }
};
