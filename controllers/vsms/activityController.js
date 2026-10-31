import { prisma } from '../../config/prismaClient.js';

// @desc    Get all activity logs with filtering
// @route   GET /api/admin/activities
// @access  Admin
export const getActivityLogs = async (req, res, next) => {
    try {
        const { userId, action, startDate, endDate, storeId, limit = 100, skip = 0 } = req.query;

        const where = {
            tenantId: req.user.tenantId,
            ...(userId && { userId }),
            ...(action && { action }),
            ...(storeId && storeId !== 'null' && storeId !== 'undefined' && { storeId }),
            ...(startDate || endDate ? {
                createdAt: {
                    ...(startDate && { gte: new Date(startDate) }),
                    ...(endDate && { lte: new Date(endDate) })
                }
            } : {})
        };

        // If user has a store assigned and is not a tenant owner, restrict to their store
        if (req.user.storeId) {
            const isGlobal = 
                ['TENANT_OWNER', 'SUPER_ADMIN', 'ADMIN'].includes(req.user.role) || 
                req.user.customRole?.portalType === 'ADMIN';
                
            if (!isGlobal) {
                where.storeId = req.user.storeId;
            }
        }

        const [logs, total] = await Promise.all([
            prisma.activityLog.findMany({
                where,
                include: {
                    user: { select: { id: true, name: true, role: true } },
                    store: { select: { id: true, name: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit),
                skip: parseInt(skip)
            }),
            prisma.activityLog.count({ where })
        ]);

        res.json({
            logs,
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip)
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get current user's activity logs
// @route   GET /api/v1/vsms/activities/my or /api/v1/agent/activities/my
// @access  Private
export const getMyActivityLogs = async (req, res, next) => {
    try {
        const { limit = 50, skip = 0 } = req.query;
        const tenantId = req.user?.tenantId || 'VK001';
        const userId = req.user?.id;

        if (!userId) {
            return res.json({ success: true, logs: [], total: 0, limit: parseInt(limit), skip: parseInt(skip) });
        }

        const [logs, total] = await Promise.all([
            prisma.activityLog.findMany({
                where: {
                    OR: [
                        { userId },
                        { targetUserId: userId }
                    ],
                    tenantId
                },
                include: {
                    store: { select: { id: true, name: true } },
                    user: { select: { id: true, name: true, role: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit),
                skip: parseInt(skip)
            }),
            prisma.activityLog.count({
                where: {
                    OR: [
                        { userId },
                        { targetUserId: userId }
                    ],
                    tenantId
                }
            })
        ]);

        res.json({
            success: true,
            logs,
            total,
            limit: parseInt(limit),
            skip: parseInt(skip)
        });
    } catch (err) {
        next(err);
    }
};
