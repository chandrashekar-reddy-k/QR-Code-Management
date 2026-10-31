import { prisma } from '../../config/prismaClient.js';

export const issueService = {
  async getIssues(params = {}) {
    const where = {};
    if (params.woId) where.woId = params.woId;
    if (params.status) where.status = params.status;

    return prisma.issue.findMany({
      where,
      include: {
        reportedBy: { select: { id: true, name: true, email: true } },
        workOrder: {
          select: { id: true, woNumber: true, batchNumber: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  async reportIssue(payload, userId) {
    const { type, description, photoUrls, priority, woId } = payload;
    return prisma.issue.create({
      data: {
        type: type || 'OTHER',
        description: description || 'Issue reported',
        photoUrls: photoUrls || [],
        priority: priority || 'MEDIUM',
        woId: woId || null,
        reportedById: userId || payload.reportedById,
        status: 'OPEN'
      },
      include: {
        reportedBy: { select: { id: true, name: true, email: true } },
        workOrder: { select: { id: true, woNumber: true } }
      }
    });
  }
};
