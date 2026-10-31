import { prisma } from '../config/prismaClient.js';
import { errorResponse, successResponse, paginatedResponse } from '../utils/responseHelper.js';

/**
 * Resolves warehouseId for the authenticated partner.
 * Priority:
 *  1. req.user.warehouseId — already resolved by authMiddleware via DB email fallback
 *  2. DB lookup by email/phone from JWT claims (in case middleware skipped)
 *  3. DB lookup by JWT sub ID
 */
const resolveWarehouseId = async (reqUser) => {
  // 1. Use what authMiddleware already resolved
  if (reqUser?.warehouseId) {
    return reqUser.warehouseId;
  }

  try {
    // 2. Fallback: look up by email or phone from JWT claims
    const emailOrPhone = reqUser?.email || reqUser?.phone;
    if (emailOrPhone) {
      const found = await prisma.user.findFirst({
        where: {
          OR: [
            ...(reqUser.email ? [{ email: reqUser.email }] : []),
            ...(reqUser.phone ? [{ phone: reqUser.phone }] : [])
          ]
        },
        select: { warehouseId: true }
      });
      if (found?.warehouseId) return found.warehouseId;
    }

    // 3. Last resort: look up by local DB user ID (may differ from JWT sub)
    if (reqUser?.id) {
      const byId = await prisma.user.findUnique({
        where: { id: reqUser.id },
        select: { warehouseId: true }
      });
      if (byId?.warehouseId) return byId.warehouseId;
    }
  } catch (err) {
    console.error('[partnerRefundController] resolveWarehouseId DB lookup failed:', err.message);
  }
  return null;
};

export const listPartnerRefunds = async (req, res) => {
  try {
    const warehouseId = await resolveWarehouseId(req.user);

    if (!warehouseId) {
      return errorResponse(res, 403, 'Partner warehouse not configured. Please contact support.');
    }

    const warehouseIds = [warehouseId];

    let { page = 1, limit = 10, search = '', status = '', orderId = '', queue = 'queue' } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const skip = (page - 1) * limit;

    const baseOrderWhere = {
      order: {
        warehouseId: { in: warehouseIds }
      }
    };

    if (queue === 'queue') {
      const where = {
        ...baseOrderWhere,
        toPhase: {
          notIn: ['COMPLETED', 'REFUND_COMPLETED', 'REFUNDED', 'REJECTED', 'CANCELLED', 'FAILED']
        }
      };
      
      if (orderId) where.orderId = orderId;
      if (search) where.order = { ...where.order, orderNumber: { contains: search, mode: 'insensitive' } };

      const [returnsList, total] = await Promise.all([
        prisma.orderReturnHistory.findMany({
          where,
          skip,
          take: limit,
          include: {
            order: {
              select: { id: true, orderNumber: true, consumerId: true, totalAmount: true, payment: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.orderReturnHistory.count({ where })
      ]);

      const formattedReturns = returnsList.map(item => {
        const metadata = (typeof item.metadata === 'object' && item.metadata) ? item.metadata : {};
        const metaItems = Array.isArray(metadata.items) ? metadata.items : [];
        const itemsTotal = metaItems.reduce((sum, it) => sum + Number(it.requestedAmount || (it.unitPrice * it.quantity) || 0), 0);
        const requestedAmount = Number(metadata.requestedAmount) || (itemsTotal > 0 ? itemsTotal : Number(item.order?.totalAmount || 0));
        return {
          ...item,
          requestedAmount,
          metadata: {
            ...metadata,
            requestedAmount
          }
        };
      });

      return paginatedResponse(res, 200, formattedReturns, { page, limit, total }, 'Partner pending refunds fetched successfully');
    } else if (queue === 'failed') {
      const whereHistory = {
        ...baseOrderWhere,
        toPhase: { in: ['REJECTED', 'FAILED', 'CANCELLED'] }
      };
      if (orderId) whereHistory.orderId = orderId;
      if (search) whereHistory.order = { ...whereHistory.order, orderNumber: { contains: search, mode: 'insensitive' } };

      const [failedReturns, totalHistory, failedTxs] = await Promise.all([
        prisma.orderReturnHistory.findMany({
          where: whereHistory,
          skip,
          take: limit,
          include: {
            order: {
              select: { id: true, orderNumber: true, consumerId: true, totalAmount: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.orderReturnHistory.count({ where: whereHistory }),
        prisma.refundTransaction.findMany({
          where: { ...baseOrderWhere, status: 'FAILED' },
          include: {
            order: {
              select: { id: true, orderNumber: true, consumerId: true, totalAmount: true }
            }
          }
        })
      ]);

      const formatted = [
        ...failedReturns.map(item => {
          const metadata = (typeof item.metadata === 'object' && item.metadata) ? item.metadata : {};
          const metaItems = Array.isArray(metadata.items) ? metadata.items : [];
          const itemsTotal = metaItems.reduce((sum, it) => sum + Number(it.requestedAmount || (it.unitPrice * it.quantity) || 0), 0);
          const amount = Number(metadata.requestedAmount) || (itemsTotal > 0 ? itemsTotal : Number(item.order?.totalAmount || 0));
          return {
            id: item.id,
            orderId: item.orderId,
            order: item.order,
            amount,
            status: item.toPhase,
            createdAt: item.createdAt,
            reason: item.reason || metadata.rejectionReason || 'Rejected / Failed'
          };
        }),
        ...failedTxs
      ];

      return paginatedResponse(res, 200, formatted, { page, limit, total: totalHistory + failedTxs.length }, 'Failed refunds fetched successfully');
    } else {
      // queue === 'history'
      const whereTx = { ...baseOrderWhere };
      if (status) whereTx.status = status.toUpperCase();
      if (orderId) whereTx.orderId = orderId;
      if (search) whereTx.order = { ...whereTx.order, orderNumber: { contains: search, mode: 'insensitive' } };

      const whereHistory = {
        ...baseOrderWhere,
        toPhase: { in: ['COMPLETED', 'REFUND_COMPLETED', 'REFUNDED'] }
      };
      if (orderId) whereHistory.orderId = orderId;
      if (search) whereHistory.order = { ...whereHistory.order, orderNumber: { contains: search, mode: 'insensitive' } };

      const [refundsList, totalTxs, completedReturns, totalHistory] = await Promise.all([
        prisma.refundTransaction.findMany({
          where: whereTx,
          skip,
          take: limit,
          include: {
            order: {
              select: { id: true, orderNumber: true, consumerId: true, totalAmount: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.refundTransaction.count({ where: whereTx }),
        prisma.orderReturnHistory.findMany({
          where: whereHistory,
          skip,
          take: limit,
          include: {
            order: {
              select: { id: true, orderNumber: true, consumerId: true, totalAmount: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.orderReturnHistory.count({ where: whereHistory })
      ]);

      const formattedReturns = completedReturns.map(item => {
        const metadata = (typeof item.metadata === 'object' && item.metadata) ? item.metadata : {};
        const metaItems = Array.isArray(metadata.items) ? metadata.items : [];
        const itemsTotal = metaItems.reduce((sum, it) => sum + Number(it.requestedAmount || (it.unitPrice * it.quantity) || 0), 0);
        const amount = Number(metadata.requestedAmount) || (itemsTotal > 0 ? itemsTotal : Number(item.order?.totalAmount || 0));
        return {
          id: item.id,
          orderId: item.orderId,
          order: item.order,
          amount,
          status: 'COMPLETED',
          createdAt: item.createdAt
        };
      });

      // Combine transactions and completed return refunds
      const combined = [...refundsList, ...formattedReturns];

      return paginatedResponse(res, 200, combined, { page, limit, total: totalTxs + totalHistory }, 'Partner refund history fetched successfully');
    }
  } catch (error) {
    import('fs').then(fs => fs.appendFileSync('error.log', error.stack + '\n'));
    console.error('Error fetching partner refunds:', error);
    return errorResponse(res, 500, 'Internal Server Error');
  }
};

export const getPartnerRefundStats = async (req, res) => {
  try {
    const warehouseId = await resolveWarehouseId(req.user);

    if (!warehouseId) {
      return errorResponse(res, 403, 'Partner warehouse not configured. Please contact support.');
    }

    const warehouseIds = [warehouseId];
    const orderFilter = {
      order: { warehouseId: { in: warehouseIds } }
    };

    const [
      pendingReturns,
      approvedReturns,
      rejectedReturns,
      completedReturns,
      completedReturnsList,
      refundedTxCount,
      settlementDeductions
    ] = await Promise.all([
      prisma.orderReturnHistory.count({
        where: { ...orderFilter, toPhase: { in: ['REQUESTED', 'PENDING', 'RETURN_INITIATED', 'PARTNER_APPROVAL_PENDING'] } }
      }),
      prisma.orderReturnHistory.count({
        where: { ...orderFilter, toPhase: { in: ['APPROVED', 'PARTIALLY_APPROVED', 'PICKUP_ASSIGNED', 'PICKUP_COMPLETED', 'RETURN_IN_TRANSIT', 'RETURN_RECEIVED_AT_WAREHOUSE', 'REFUND_PENDING', 'REFUND_PROCESSING'] } }
      }),
      prisma.orderReturnHistory.count({
        where: { ...orderFilter, toPhase: { in: ['REJECTED', 'CANCELLED', 'FAILED'] } }
      }),
      prisma.orderReturnHistory.count({
        where: { ...orderFilter, toPhase: { in: ['COMPLETED', 'REFUND_COMPLETED', 'REFUNDED'] } }
      }),
      prisma.orderReturnHistory.findMany({
        where: { ...orderFilter, toPhase: { in: ['COMPLETED', 'REFUND_COMPLETED', 'REFUNDED'] } },
        include: { order: { select: { totalAmount: true } } }
      }),
      prisma.refundTransaction.count({
        where: { ...orderFilter, status: 'SUCCEEDED' }
      }),
      prisma.refundTransaction.aggregate({
        where: { ...orderFilter, status: 'SUCCEEDED' },
        _sum: { amount: true }
      })
    ]);

    const returnsAmountSum = completedReturnsList.reduce((sum, item) => {
      const metadata = (typeof item.metadata === 'object' && item.metadata) ? item.metadata : {};
      const amount = Number(metadata.requestedAmount) || Number(item.order?.totalAmount) || 0;
      return sum + amount;
    }, 0);

    const stats = {
      pendingReturns,
      approvedReturns,
      rejectedReturns,
      refundedOrders: refundedTxCount + completedReturns,
      settlementDeductions: (settlementDeductions._sum.amount || 0) + returnsAmountSum
    };

    return successResponse(res, 200, stats, 'Refund stats fetched successfully');
  } catch (error) {
    import('fs').then(fs => fs.appendFileSync('error.log', error.stack + '\n'));
    console.error('Error fetching partner refund stats:', error);
    return errorResponse(res, 500, 'Internal Server Error');
  }
};
