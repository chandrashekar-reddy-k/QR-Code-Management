import prisma from '../../../utils/prisma.js';
import { format } from 'date-fns';

const getStoreWhereClause = (storeId) => {
  if (!storeId || storeId === 'undefined' || storeId === 'null' || storeId === 'all') {
    return null;
  }
  return [
    { warehouseId: storeId },
    { allocatedWarehouseId: storeId },
    { allocatedStoreId: storeId },
    { pickupStoreId: storeId }
  ];
};

export const getDailyReport = async (req, res) => {
  try {
    const { storeId, startDate, endDate } = req.query;

    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      end = new Date();
      end.setHours(23, 59, 59, 999);
      start = new Date();
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
    }

    const where = {
      createdAt: { gte: start, lte: end },
      status: { not: 'CANCELLED' }
    };

    const targetStoreId = (storeId && storeId !== 'undefined' && storeId !== 'null') ? storeId : null;
    const storeWhere = getStoreWhereClause(targetStoreId);
    if (storeWhere) {
      where.OR = storeWhere;
    }

    const orders = await prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });

    const dailyGroups = {};
    const paymentSplits = { CASH: 0, UPI: 0, CARD: 0 };
    let totalSales = 0;
    let totalProfit = 0;

    orders.forEach(o => {
      const dateKey = format(o.createdAt, 'yyyy-MM-dd');
      if (!dailyGroups[dateKey]) {
        dailyGroups[dateKey] = {
          date: dateKey,
          totalCash: 0,
          totalUpi: 0,
          totalCard: 0,
          grandTotal: 0,
          totalOrders: 0,
          remark: ''
        };
      }

      const g = dailyGroups[dateKey];
      g.totalOrders += 1;
      g.grandTotal += (o.totalAmount || 0);
      totalSales += (o.totalAmount || 0);

      const orderProfit = (o.items || []).reduce((itemSum, item) => {
        return itemSum + (((item.unitPrice || item.price || 0) - (item.landingPrice || 0)) * (item.quantity || 0));
      }, 0);
      totalProfit += orderProfit;

      if (o.paymentMode === 'CASH') {
        g.totalCash += (o.totalAmount || 0);
        paymentSplits.CASH += (o.totalAmount || 0);
      } else if (o.paymentMode === 'UPI') {
        g.totalUpi += (o.totalAmount || 0);
        paymentSplits.UPI += (o.totalAmount || 0);
      } else if (o.paymentMode === 'CARD') {
        g.totalCard += (o.totalAmount || 0);
        paymentSplits.CARD += (o.totalAmount || 0);
      } else if (o.paymentMode === 'CREDIT' || o.paymentStatus === 'CREDIT' || o.paymentStatus === 'PENDING') {
        g.totalCredit = (g.totalCredit || 0) + (o.totalAmount || 0);
        paymentSplits.CREDIT = (paymentSplits.CREDIT || 0) + (o.totalAmount || 0);
      } else if (o.paymentMode === 'CASH_UPI') {
        const cashPart = o.cashAmount || 0;
        const upiPart = o.upiAmount || 0;
        g.totalCash += cashPart;
        g.totalUpi += upiPart;
        paymentSplits.CASH += cashPart;
        paymentSplits.UPI += upiPart;
      }
    });

    const historyData = Object.values(dailyGroups).sort((a, b) => b.date.localeCompare(a.date));

    res.json({
      success: true,
      title: 'Daily Report',
      date: format(start, 'yyyy-MM-dd'),
      totalOrders: orders.length,
      totalSales,
      totalProfit,
      paymentSplits,
      data: historyData
    });
  } catch (error) {
    console.error('[ReportController] Daily Report Error:', error);
    res.status(500).json({ success: false, message: 'Error fetching daily report', error: error.message });
  }
};

// 7-day or N-day trends for charts
export const getTrendsReport = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    const { storeId } = req.query;
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const where = {
      createdAt: { gte: startDate, lte: endDate },
      status: { not: 'CANCELLED' },
    };

    const targetStoreId = (storeId && storeId !== 'undefined' && storeId !== 'null') ? storeId : null;
    const storeWhere = getStoreWhereClause(targetStoreId);
    if (storeWhere) {
      where.OR = storeWhere;
    }

    const orders = await prisma.order.findMany({
      where,
      include: { items: true },
    });

    const dailyStatsMap = new Map();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const rawDate = format(d, 'yyyy-MM-dd');
      const dateString = format(d, 'dd MMM');
      dailyStatsMap.set(rawDate, { date: dateString, rawDate, revenue: 0, profit: 0, orders: 0 });
    }

    orders.forEach(order => {
      const rawDate = format(new Date(order.createdAt), 'yyyy-MM-dd');

      if (dailyStatsMap.has(rawDate)) {
        const stats = dailyStatsMap.get(rawDate);
        stats.orders += 1;
        stats.revenue += (order.totalAmount || 0);

        const profit = (order.items || []).reduce((itemSum, item) => {
          return itemSum + (((item.unitPrice || item.price || 0) - (item.landingPrice || 0)) * (item.quantity || 0));
        }, 0);
        stats.profit += profit;
      }
    });

    const finalResults = Array.from(dailyStatsMap.values()).map(stat => ({
      ...stat,
      revenue: Math.round(stat.revenue),
      profit: Math.round(stat.profit)
    }));

    res.json(finalResults);
  } catch (error) {
    console.error('[ReportController] Trends Report Error:', error);
    res.status(500).json({ message: 'Error fetching trends', error: error.message });
  }
};

export const getDayDetailedSales = async (req, res) => {
  try {
    const { date, storeId } = req.query;
    if (!date) return res.status(400).json({ message: 'Date is required' });

    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const where = {
      createdAt: { gte: startDate, lte: endDate },
      status: { not: 'CANCELLED' },
    };

    const targetStoreId = (storeId && storeId !== 'undefined' && storeId !== 'null') ? storeId : null;
    const storeWhere = getStoreWhereClause(targetStoreId);
    if (storeWhere) {
      where.OR = storeWhere;
    }

    const orderItems = await prisma.orderItem.findMany({
      where: { order: where }
    });

    const productIds = Array.from(new Set(orderItems.map(i => i.productId).filter(Boolean)));
    const products = productIds.length > 0 ? await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        sku: true,
        category: { select: { name: true } }
      }
    }) : [];

    const productLookup = products.reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {});

    const productMap = {};
    orderItems.forEach(item => {
      const key = item.productId;
      const unitPrice = item.unitPrice || item.price || 0;
      const prod = productLookup[key];
      if (!productMap[key]) {
        productMap[key] = {
          productId: key,
          name: prod?.name || item.productName || 'Unknown',
          sku: prod?.sku || 'N/A',
          category: prod?.category?.name || 'Uncategorized',
          quantity: 0,
          revenue: 0,
          profit: 0,
        };
      }
      productMap[key].quantity += (item.quantity || 0);
      productMap[key].revenue += unitPrice * (item.quantity || 0);
      productMap[key].profit += (unitPrice - (item.landingPrice || 0)) * (item.quantity || 0);
    });

    const results = Object.values(productMap).sort((a, b) => b.revenue - a.revenue);
    res.json(results);
  } catch (error) {
    console.error('[ReportController] Day Detailed Sales Error:', error);
    res.status(500).json({ message: 'Error fetching detailed day sales', error: error.message });
  }
};

export const getTopProducts = async (req, res) => {
  try {
    const { storeId } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orderFilter = {
      createdAt: { gte: today },
      status: { not: 'CANCELLED' },
    };

    const targetStoreId = (storeId && storeId !== 'undefined' && storeId !== 'null') ? storeId : req.user?.storeId;
    if (targetStoreId) {
      orderFilter.OR = [{ allocatedStoreId: targetStoreId }, { pickupStoreId: targetStoreId }];
    }

    const orderItems = await prisma.orderItem.findMany({
      where: { order: orderFilter }
    });

    const productIds = Array.from(new Set(orderItems.map(i => i.productId).filter(Boolean)));
    const products = productIds.length > 0 ? await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, image: true }
    }) : [];

    const productLookup = products.reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {});

    const productMap = {};
    orderItems.forEach(item => {
      const key = item.productId;
      const unitPrice = item.unitPrice || item.price || 0;
      const prod = productLookup[key];
      if (!productMap[key]) {
        productMap[key] = {
          name: prod?.name || item.productName || 'Unknown',
          image: prod?.image || item.productImage || null,
          totalQty: 0,
          totalRevenue: 0,
          totalProfit: 0,
        };
      }
      productMap[key].totalQty += (item.quantity || 0);
      productMap[key].totalRevenue += unitPrice * (item.quantity || 0);
      productMap[key].totalProfit += (unitPrice - (item.landingPrice || 0)) * (item.quantity || 0);
    });

    const topProducts = Object.values(productMap)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

    res.json(topProducts);
  } catch (error) {
    console.error('[ReportController] Top Products Error:', error);
    res.status(500).json({ message: 'Error fetching top products', error: error.message });
  }
};

export const getVehicleWiseReport = async (req, res) => {
  try {
    const { id } = req.params;

    const orders = await prisma.order.findMany({
      where: {
        vehicleId: id,
        status: { not: 'CANCELLED' }
      },
      include: { items: true }
    });

    const totalOrders = orders.length;
    let totalSales = 0;
    const itemsMap = {};

    orders.forEach(order => {
      totalSales += (order.totalAmount || 0);
      (order.items || []).forEach(item => {
        itemsMap[item.productId] = (itemsMap[item.productId] || 0) + (item.quantity || 0);
      });
    });

    res.json({ title: 'Vehicle Wise Report', totalOrders, totalSales, topSellingItems: itemsMap });
  } catch (error) {
    console.error('[ReportController] Vehicle Report Error:', error);
    res.status(500).json({ message: 'Error fetching vehicle report', error: error.message });
  }
};

export const getItemWiseReport = async (req, res) => {
  try {
    const { storeId: queryStoreId, startDate, endDate } = req.query;
    const storeId = (queryStoreId && queryStoreId !== 'undefined' && queryStoreId !== 'null') ? queryStoreId : req.user?.storeId;

    const orderWhere = { status: { not: 'CANCELLED' } };
    if (storeId) {
      orderWhere.OR = [{ allocatedStoreId: storeId }, { pickupStoreId: storeId }];
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      orderWhere.createdAt = { gte: start, lte: end };
    }

    const storeOrders = await prisma.order.findMany({
      where: orderWhere,
      select: { id: true }
    });
    const orderItemWhere = { orderId: { in: storeOrders.map(o => o.id) } };

    const orderItems = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: orderItemWhere,
      _sum: {
        quantity: true,
        unitPrice: true
      }
    });

    const productIds = Array.from(new Set(orderItems.map(item => item.productId).filter(Boolean)));
    const products = productIds.length > 0 ? await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true }
    }) : [];

    const productLookup = products.reduce((acc, p) => {
      acc[p.id] = p.name;
      return acc;
    }, {});

    const results = orderItems.map((item) => {
      const totalAmount = (item._sum.quantity || 0) * (item._sum.unitPrice || 0);
      return {
        itemName: productLookup[item.productId] || 'Unknown Product',
        totalQty: item._sum.quantity || 0,
        revenue: totalAmount
      };
    });

    res.json({ title: 'Item Wise Report', data: results });
  } catch (error) {
    console.error('[ReportController] Item Report Error:', error);
    res.status(500).json({ message: 'Error fetching item report', error: error.message });
  }
};

export const getDateRangeReport = async (req, res) => {
  try {
    const { from, to, storeId } = req.query;

    const where = {
      createdAt: { gte: new Date(from), lte: new Date(to) },
      status: { not: 'CANCELLED' }
    };

    const targetStoreId = (storeId && storeId !== 'undefined' && storeId !== 'null') ? storeId : req.user?.storeId;
    if (targetStoreId) {
      where.OR = [{ allocatedStoreId: targetStoreId }, { pickupStoreId: targetStoreId }];
    }

    const orders = await prisma.order.findMany({
      where
    });

    const totalOrders = orders.length;
    const totalSales = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    res.json({ title: 'Date Range Report', from, to, totalOrders, totalSales });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching date range report', error: error.message });
  }
};

export const getReconciliationReport = async (req, res) => {
  try {
    const { vehicleId, date, storeId: queryStoreId } = req.query;
    const storeId = (queryStoreId && queryStoreId !== 'undefined' && queryStoreId !== 'null') ? queryStoreId : req.user?.storeId;

    let dateQuery = new Date();
    dateQuery.setHours(0, 0, 0, 0);

    const productWhere = {};
    if (storeId) productWhere.storeId = storeId;

    const stockWhereLoad = { vehicleId, type: 'LOAD', date: { gte: dateQuery } };
    const stockWhereReturn = { vehicleId, type: 'RETURN', date: { gte: dateQuery } };

    const [items, loads, returns, sales] = await Promise.all([
      prisma.product.findMany({ where: productWhere, select: { id: true, name: true } }),
      prisma.stockTransaction.findMany({ where: stockWhereLoad }),
      prisma.stockTransaction.findMany({ where: stockWhereReturn }),
      prisma.orderItem.findMany({
        where: {
          order: {
            vehicleId,
            createdAt: { gte: dateQuery },
            status: { not: 'CANCELLED' }
          }
        }
      })
    ]);

    const loadMap = {};
    loads.forEach(l => loadMap[l.productId] = (loadMap[l.productId] || 0) + l.quantity);

    const returnMap = {};
    returns.forEach(r => returnMap[r.productId] = (returnMap[r.productId] || 0) + r.quantity);

    const saleMap = {};
    sales.forEach(s => saleMap[s.productId] = (saleMap[s.productId] || 0) + s.quantity);

    const report = items.map(product => {
      const pid = product.id;
      const loadedQty = loadMap[pid] || 0;
      const returnedQty = returnMap[pid] || 0;
      const soldQty = saleMap[pid] || 0;

      const expectedRemaining = loadedQty - soldQty;
      const difference = expectedRemaining - returnedQty;

      return {
        product: product.name,
        loadedQty,
        soldQty,
        returnedQty,
        difference
      };
    });

    res.json({ vehicleId, date: dateQuery, report });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching reconciliation report', error: error.message });
  }
};

export const getRouteWiseReport = async (req, res) => {
  try {
    const { startDate, endDate, storeId } = req.query;
    const where = {
      status: 'COMPLETED',
      routeId: { not: null }
    };

    if (startDate && endDate) {
      where.createdAt = { gte: new Date(startDate), lte: new Date(endDate) };
    }

    const targetStoreId = (storeId && storeId !== 'undefined' && storeId !== 'null') ? storeId : req.user?.storeId;
    if (targetStoreId) {
      where.OR = [{ allocatedStoreId: targetStoreId }, { pickupStoreId: targetStoreId }];
    }

    const routeData = await prisma.order.groupBy({
      by: ['routeId', 'allocatedStoreId'],
      where,
      _sum: {
        totalAmount: true
      },
      _count: {
        id: true
      }
    });

    const routeIds = routeData.map(r => r.routeId);
    const routes = await prisma.route.findMany({
      where: { id: { in: routeIds } },
      select: { id: true, routeName: true }
    });

    const routeMap = routes.reduce((acc, r) => {
      acc[r.id] = r.routeName;
      return acc;
    }, {});

    const result = routeData.map(r => ({
      routeName: routeMap[r.routeId] || 'Unmapped Route',
      totalSales: Math.round(r._sum.totalAmount || 0),
      orderCount: r._count.id,
      storeId: r.allocatedStoreId
    }));

    res.json(result);
  } catch (error) {
    console.error('[ReportController] Route Report Error:', error);
    res.status(500).json({ message: 'Error fetching route report', error: error.message });
  }
};

export const getVillageWiseReport = async (req, res) => {
  try {
    const { startDate, endDate, storeId } = req.query;
    const where = {
      status: 'COMPLETED',
      villageName: { not: null }
    };

    if (startDate && endDate) {
      where.createdAt = { gte: new Date(startDate), lte: new Date(endDate) };
    }

    const targetStoreId = (storeId && storeId !== 'undefined' && storeId !== 'null') ? storeId : req.user?.storeId;
    if (targetStoreId) {
      where.OR = [{ allocatedStoreId: targetStoreId }, { pickupStoreId: targetStoreId }];
    }

    const villageData = await prisma.order.groupBy({
      by: ['villageName', 'coverageType', 'allocatedStoreId'],
      where,
      _sum: {
        totalAmount: true
      },
      _count: {
        id: true
      }
    });

    const formattedData = villageData.map(v => ({
      villageName: v.villageName,
      coverageType: v.coverageType,
      totalSales: Math.round(v._sum.totalAmount || 0),
      orderCount: v._count.id,
      storeId: v.allocatedStoreId
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('[ReportController] Village Report Error:', error);
    res.status(500).json({ message: 'Error fetching village report', error: error.message });
  }
};

export const getAgentPerformance = async (req, res) => {
  try {
    const { storeId } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const agentFilter = {
      role: 'SALES_AGENT'
    };

    const targetStoreId = (storeId && storeId !== 'undefined' && storeId !== 'null') ? storeId : req.user?.storeId;
    if (targetStoreId) {
      agentFilter.storeId = targetStoreId;
    }

    const agents = await prisma.user.findMany({
      where: agentFilter,
      select: { id: true, name: true, dailyTarget: true, status: true, storeId: true }
    });

    const performance = await Promise.all(agents.map(async (agent) => {
      const orders = await prisma.order.findMany({
        where: {
          agentId: agent.id,
          createdAt: { gte: today },
          status: { not: 'CANCELLED' }
        },
        select: { totalAmount: true }
      });

      const totalSales = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      return {
        id: agent.id,
        name: agent.name || 'Unknown Agent',
        dailyTarget: agent.dailyTarget || 0,
        totalSales: totalSales,
        percentage: agent.dailyTarget > 0 ? Math.round((totalSales / agent.dailyTarget) * 100) : 0,
        status: agent.status,
        storeId: agent.storeId
      };
    }));

    res.json(performance);
  } catch (error) {
    console.error('[ReportController] Agent Performance Error:', error);
    res.status(500).json({ message: 'Error fetching agent performance', error: error.message });
  }
};

export const getCategoryWiseReport = async (req, res) => {
  try {
    const { storeId, startDate, endDate } = req.query;
    const where = {};
    const targetStoreId = (storeId && storeId !== 'undefined' && storeId !== 'null') ? storeId : req.user?.storeId;

    const orderWhere = { status: { not: 'CANCELLED' } };
    if (targetStoreId) {
      orderWhere.OR = [{ allocatedStoreId: targetStoreId }, { pickupStoreId: targetStoreId }];
    }
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      orderWhere.createdAt = { gte: start, lte: end };
    }

    const storeOrders = await prisma.order.findMany({
      where: orderWhere,
      select: { id: true }
    });
    where.orderId = { in: storeOrders.map(o => o.id) };

    const categorySales = await prisma.orderItem.findMany({
      where
    });

    const productIds = Array.from(new Set(categorySales.map(i => i.productId).filter(Boolean)));
    const products = productIds.length > 0 ? await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { category: true }
    }) : [];

    const productLookup = products.reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {});

    const categoryMap = {};
    categorySales.forEach(item => {
      const prod = productLookup[item.productId];
      const catName = prod?.category?.name || 'Uncategorized';
      const unitPrice = item.unitPrice || item.price || 0;
      if (!categoryMap[catName]) {
        categoryMap[catName] = { name: catName, totalSales: 0, orderCount: 0 };
      }
      categoryMap[catName].totalSales += unitPrice * (item.quantity || 0);
      categoryMap[catName].orderCount += 1;
    });

    res.json(Object.values(categoryMap).sort((a, b) => b.totalSales - a.totalSales));
  } catch (error) {
    console.error('[ReportController] Category Report Error:', error);
    res.status(500).json({ message: 'Error fetching category report', error: error.message });
  }
};

export const getReturnReport = async (req, res) => {
  try {
    const { storeId } = req.query;
    const where = {};
    const targetStoreId = (storeId && storeId !== 'undefined' && storeId !== 'null') ? storeId : req.user?.storeId;
    if (targetStoreId) {
      where.storeId = targetStoreId;
    }

    const returns = await prisma.orderReturn.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    const productIds = Array.from(new Set(returns.map(r => r.productId).filter(Boolean)));
    const products = productIds.length > 0 ? await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true }
    }) : [];
    const productLookup = products.reduce((acc, p) => {
      acc[p.id] = p.name;
      return acc;
    }, {});

    const formattedReturns = returns.map(r => ({
      ...r,
      product: { name: productLookup[r.productId] || 'Unknown Product' },
      order: { orderNumber: r.orderId, customerId: r.returnedById }
    }));

    res.json(formattedReturns);
  } catch (error) {
    console.error('[ReportController] Return Report Error:', error);
    res.status(500).json({ message: 'Error fetching return report', error: error.message });
  }
};

export const getSessionReport = async (req, res) => {
  try {
    const { storeId } = req.query;
    const where = {
      status: { not: 'CANCELLED' }
    };
    const targetStoreId = (storeId && storeId !== 'undefined' && storeId !== 'null') ? storeId : req.user?.storeId;
    if (targetStoreId) {
      where.OR = [{ allocatedStoreId: targetStoreId }, { pickupStoreId: targetStoreId }];
    }

    const sessions = await prisma.order.groupBy({
      by: ['coverageType'],
      where,
      _sum: { totalAmount: true },
      _count: { id: true }
    });

    res.json(sessions.map(s => ({
      session: s.coverageType || 'N/A',
      totalSales: s._sum.totalAmount || 0,
      orderCount: s._count.id
    })));
  } catch (error) {
    console.error('[ReportController] Session Report Error:', error);
    res.status(500).json({ message: 'Error fetching session report', error: error.message });
  }
};

export const getAllVehiclePerformance = async (req, res) => {
  try {
    const { storeId } = req.query;
    const where = {};
    if (storeId && storeId !== 'undefined' && storeId !== 'null') {
      where.storeId = storeId;
    }

    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        orders: {
          where: { status: { not: 'CANCELLED' } },
          select: { totalAmount: true }
        }
      }
    });

    const report = vehicles.map(v => ({
      id: v.id,
      displayId: v.displayId,
      vehicleNumber: v.vehicleNumber,
      totalSales: v.orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      orderCount: v.orders.length
    }));

    res.json(report.sort((a, b) => b.totalSales - a.totalSales));
  } catch (error) {
    console.error('[ReportController] Vehicle Performance Error:', error);
    res.status(500).json({ message: 'Error fetching vehicle performance', error: error.message });
  }
};

export const getProcurementSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, storeId, vendor } = req.query;
    const targetStoreId = (storeId && storeId !== 'undefined' && storeId !== 'null') ? storeId : null;

    const salesWhere = { status: { not: 'CANCELLED' } };
    const storeWhere = getStoreWhereClause(targetStoreId);
    if (storeWhere) {
      salesWhere.AND = [{ OR: storeWhere }];
    }

    if (startDate && endDate) {
      salesWhere.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z')
      };
    }

    // 1. Fetch all vendors registered in system with their item mappings & current balance
    const vendorWhere = {};
    if (targetStoreId) {
      vendorWhere.storeId = targetStoreId;
    }

    const allVendors = await prisma.vendor.findMany({
      where: vendorWhere,
      include: {
        itemMappings: {
          select: {
            productId: true,
            purchasePrice: true,
            lastPurchaseRate: true,
            product: {
              select: {
                id: true,
                name: true,
                stock: true,
                price: true,
                costPrice: true,
                storeroomStock: { select: { rawStock: true } }
              }
            }
          }
        }
      },
      orderBy: { vendorName: 'asc' }
    });

    // 2. Fetch sales order items for the requested period
    const orderItems = await prisma.orderItem.findMany({
      where: { order: salesWhere }
    });

    const productIds = Array.from(new Set(orderItems.map(i => i.productId).filter(Boolean)));
    const variantIds = Array.from(new Set(orderItems.map(i => i.productVariantId).filter(Boolean)));

    const [products, variants] = await Promise.all([
      productIds.length > 0 ? prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          name: true,
          costPrice: true,
          price: true,
          mrp: true,
          stock: true,
          category: { select: { name: true } },
          storeroomStock: { select: { rawStock: true } },
          VendorItemMapping: {
            select: {
              vendor: { select: { id: true, vendorName: true, mobile: true, displayId: true } }
            },
            take: 1
          }
        }
      }) : [],
      variantIds.length > 0 ? prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
        select: {
          id: true,
          variantName: true,
          landingPrice: true,
          sellingPrice: true
        }
      }) : []
    ]);

    const productLookup = products.reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
    const variantLookup = variants.reduce((acc, v) => { acc[v.id] = v; return acc; }, {});

    // Build map of vendor stats: total stock & inventory value per vendor
    const vendorStatsMap = {};
    allVendors.forEach(v => {
      let totalStock = 0;
      let inventoryVal = 0;
      (v.itemMappings || []).forEach(m => {
        if (m.product) {
          const effectiveStock = (m.product.stock || 0) + 
            (m.product.storeroomStock?.rawStock || 0);
          const rate = m.lastPurchaseRate > 0 ? m.lastPurchaseRate : (m.purchasePrice > 0 ? m.purchasePrice : (m.product.costPrice || m.product.price || 0));
          totalStock += effectiveStock;
          inventoryVal += (effectiveStock * rate);
        }
      });
      vendorStatsMap[v.vendorName] = {
        id: v.id,
        name: v.vendorName,
        displayId: v.displayId || `VK-VND-${v.id.slice(-4).toUpperCase()}`,
        mobile: v.mobile,
        category: v.vendorCategory || 'Raw Materials',
        currentBalance: v.currentBalance || 0,
        approvalStatus: v.approvalStatus || 'APPROVED',
        status: v.status || 'ACTIVE',
        totalStock,
        inventoryValue: Math.round(inventoryVal)
      };
    });

    let totalProcurementValue = 0;
    let totalSalesRevenue = 0;
    let totalGrossMargin = 0;

    const vendorSet = new Set();
    // Add all registered database vendors to the filter list upfront
    allVendors.forEach(v => {
      if (v.vendorName) vendorSet.add(v.vendorName);
    });

    const productMap = {};
    orderItems.forEach(item => {
      const key = item.productId;
      const prod = productLookup[item.productId];
      const variant = variantLookup[item.productVariantId];
      const qty = item.quantity || 0;
      const sellingPrice = item.unitPrice || (qty > 0 ? item.totalPrice / qty : 0) || variant?.sellingPrice || prod?.price || 0;
      const procurementCost = variant?.landingPrice || prod?.costPrice || (item.mrp ? (item.mrp * 0.7) : (sellingPrice * 0.7));

      // Resolve dynamic vendor name hierarchically
      let vendorName = prod?.VendorItemMapping?.[0]?.vendor?.vendorName;
      if (!vendorName) {
        // Find if mapped in allVendors
        const matchedVendor = allVendors.find(v => (v.itemMappings || []).some(m => m.productId === key));
        if (matchedVendor) {
          vendorName = matchedVendor.vendorName;
        }
      }
      if (!vendorName) {
        vendorName = 'Direct Procurement / Store Vendor';
      }

      vendorSet.add(vendorName);

      // Filter by vendor if requested (matches by name or displayId)
      if (vendor && vendor !== 'ALL') {
        const isMatched = (vendorName.toLowerCase() === vendor.toLowerCase()) || 
                          (vendorStatsMap[vendorName]?.id === vendor) ||
                          (vendorStatsMap[vendorName]?.displayId === vendor);
        if (!isMatched) {
          return;
        }
      }

      const revenue = sellingPrice * qty;
      const costValue = procurementCost * qty;
      const margin = revenue - costValue;

      totalSalesRevenue += revenue;
      totalProcurementValue += costValue;
      totalGrossMargin += margin;

      const currentStock = prod ? (
        (prod.stock || 0) + 
        (prod.storeroomStock?.rawStock || 0)
      ) : 0;

      if (!productMap[key]) {
        productMap[key] = {
          productId: key,
          name: prod?.name || item.productName || item.name || 'General Inventory Item',
          category: prod?.category?.name || 'General Category',
          vendorName,
          vendorDetails: vendorStatsMap[vendorName] || null,
          currentStock,
          procurementCost: Math.round(procurementCost * 100) / 100,
          sellingPrice: Math.round(sellingPrice * 100) / 100,
          totalQtySold: 0,
          totalRevenue: 0,
          totalCost: 0,
          grossMargin: 0,
          marginPercentage: 0
        };
      }

      productMap[key].totalQtySold += qty;
      productMap[key].totalRevenue += revenue;
      productMap[key].totalCost += costValue;
      productMap[key].grossMargin += margin;
      productMap[key].marginPercentage = productMap[key].totalRevenue > 0
        ? Math.round((productMap[key].grossMargin / productMap[key].totalRevenue) * 100)
        : 0;
    });

    const items = Object.values(productMap).sort((a, b) => b.totalRevenue - a.totalRevenue);
    const overallMarginPct = totalSalesRevenue > 0 ? Math.round((totalGrossMargin / totalSalesRevenue) * 100) : 0;

    // Build rich vendor list for dropdown
    const formattedVendors = Array.from(vendorSet).map(vName => {
      const vDetails = vendorStatsMap[vName];
      return {
        name: vName,
        displayId: vDetails?.displayId || '',
        mobile: vDetails?.mobile || '',
        category: vDetails?.category || '',
        stockQty: vDetails?.totalStock || 0,
        inventoryValue: vDetails?.inventoryValue || 0
      };
    });

    res.json({
      summary: {
        totalSalesRevenue: Math.round(totalSalesRevenue),
        totalProcurementValue: Math.round(totalProcurementValue),
        totalGrossMargin: Math.round(totalGrossMargin),
        marginPercentage: overallMarginPct,
        totalItemsSold: items.reduce((acc, i) => acc + i.totalQtySold, 0)
      },
      vendors: formattedVendors,
      vendorNames: Array.from(vendorSet),
      items
    });
  } catch (error) {
    console.error('[ReportController] Procurement Sales Report Error:', error);
    res.status(500).json({ message: 'Error fetching procurement sales report', error: error.message });
  }
};

export const getCreditSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, storeId, status } = req.query;
    const where = { paymentMode: 'CREDIT' };
    const targetStoreId = (storeId && storeId !== 'undefined' && storeId !== 'null') ? storeId : null;
    const storeWhere = getStoreWhereClause(targetStoreId);
    if (storeWhere) {
      where.AND = [{ OR: storeWhere }];
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z')
      };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: { select: { id: true, quantity: true, unitPrice: true } },
        customer: { select: { name: true, mobile: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    let totalCreditSalesRevenue = 0;
    let totalPendingCredit = 0;
    let totalSettledCredit = 0;
    let totalPartiallyPaidCredit = 0;

    const formattedOrders = orders.map(order => {
      const totalAmount = order.totalAmount || 0;
      const paidAmount = Math.min(totalAmount, (order.cashAmount || 0) + (order.upiAmount || 0));
      const pendingBalance = Math.max(0, totalAmount - paidAmount);

      let effectiveStatus = order.paymentStatus || 'PENDING';
      if (order.paymentStatus === 'PAID' || pendingBalance <= 0) {
        effectiveStatus = 'PAID';
      } else if (paidAmount > 0 || order.paymentStatus === 'PARTIALLY_PAID') {
        effectiveStatus = 'PARTIALLY_PAID';
      } else {
        effectiveStatus = 'PENDING';
      }

      totalCreditSalesRevenue += totalAmount;
      if (effectiveStatus === 'PAID') {
        totalSettledCredit += totalAmount;
      } else if (effectiveStatus === 'PARTIALLY_PAID') {
        totalPartiallyPaidCredit += paidAmount;
        totalPendingCredit += pendingBalance;
      } else {
        totalPendingCredit += totalAmount;
      }

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customer?.name || 'Walk-in Customer',
        customerPhone: order.customer?.mobile || 'N/A',
        storeId: order.allocatedStoreId || order.pickupStoreId || 'N/A',
        createdAt: order.createdAt,
        totalAmount,
        paidAmount,
        pendingBalance,
        paymentMode: order.paymentMode || 'CREDIT',
        paymentStatus: effectiveStatus,
        itemCount: (order.items || []).length
      };
    });

    const filteredOrders = status && status !== 'ALL'
      ? formattedOrders.filter(o => {
        if (status === 'PENDING' || status === 'PENDING_CREDIT') return o.paymentStatus === 'PENDING';
        return o.paymentStatus === status;
      })
      : formattedOrders;

    res.json({
      summary: {
        totalCreditSalesRevenue: Math.round(totalCreditSalesRevenue),
        totalCreditOrders: orders.length,
        totalPendingCredit: Math.round(totalPendingCredit),
        totalSettledCredit: Math.round(totalSettledCredit),
        totalPartiallyPaidCredit: Math.round(totalPartiallyPaidCredit)
      },
      orders: filteredOrders
    });
  } catch (error) {
    console.error('[ReportController] Credit Sales Report Error:', error);
    res.status(500).json({ message: 'Error fetching credit sales report', error: error.message });
  }
};

export const updateCreditPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus, additionalPayment, paymentMode = 'CASH' } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    let cashAmount = order.cashAmount || 0;
    let upiAmount = order.upiAmount || 0;
    const paymentAmount = Number(additionalPayment) || 0;

    if (paymentAmount > 0) {
      if (paymentMode === 'UPI') {
        upiAmount += paymentAmount;
      } else {
        cashAmount += paymentAmount;
      }
    }

    const newPaidAmount = cashAmount + upiAmount;
    let newPaymentStatus = paymentStatus || order.paymentStatus;

    if (paymentAmount > 0) {
      if (newPaidAmount >= order.totalAmount) {
        newPaymentStatus = 'PAID';
      } else if (newPaidAmount > 0) {
        newPaymentStatus = 'PARTIALLY_PAID';
      }
    } else if (paymentStatus === 'PAID') {
      newPaymentStatus = 'PAID';
      if (newPaidAmount < order.totalAmount) {
        cashAmount = order.totalAmount;
      }
    } else if (paymentStatus === 'PARTIALLY_PAID') {
      newPaymentStatus = 'PARTIALLY_PAID';
    } else if (paymentStatus === 'PENDING' || paymentStatus === 'PENDING_CREDIT') {
      newPaymentStatus = 'PENDING';
      cashAmount = 0;
      upiAmount = 0;
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: newPaymentStatus,
        cashAmount,
        upiAmount,
      }
    });

    const finalPaid = updatedOrder.cashAmount + updatedOrder.upiAmount;
    res.json({
      message: 'Payment status updated successfully',
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        totalAmount: updatedOrder.totalAmount,
        paidAmount: finalPaid,
        pendingBalance: Math.max(0, updatedOrder.totalAmount - finalPaid),
        paymentStatus: updatedOrder.paymentStatus
      }
    });
  } catch (error) {
    console.error('[ReportController] Update Credit Payment Status Error:', error);
    res.status(500).json({ message: 'Error updating payment status', error: error.message });
  }
};

export const getCategoryReport = getCategoryWiseReport;
export const getItemReport = getItemWiseReport;

/**
 * 1. Vehicle-wise Sales Report: Total sales generated by each vehicle
 * route: GET /api/v1/vsms/reports/vehicle-sales
 */
export const getVehicleSalesSummaryReport = async (req, res) => {
  try {
    const { vehicleId, storeId, startDate, endDate } = req.query;

    const where = {
      vehicleId: { not: null },
      status: { not: 'CANCELLED' }
    };

    if (vehicleId && vehicleId !== 'ALL') {
      where.vehicleId = vehicleId;
    }

    if (storeId && storeId !== 'ALL' && storeId !== 'undefined' && storeId !== 'null') {
      const storeWhere = getStoreWhereClause(storeId);
      if (storeWhere) where.OR = storeWhere;
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    }

    // Fetch vehicles list to guarantee all vehicles appear even if zero sales
    const vehicleWhere = {};
    if (vehicleId && vehicleId !== 'ALL') vehicleWhere.id = vehicleId;
    if (storeId && storeId !== 'ALL' && storeId !== 'undefined' && storeId !== 'null') vehicleWhere.storeId = storeId;

    const allVehicles = await prisma.vehicle.findMany({
      where: vehicleWhere,
      select: {
        id: true,
        vehicleNumber: true,
        vehicleName: true,
        displayId: true,
        store: { select: { id: true, name: true } },
        assignedUsers: { select: { id: true, name: true, phone: true } }
      },
      orderBy: { vehicleNumber: 'asc' }
    });

    const orders = await prisma.order.findMany({
      where,
      select: {
        id: true,
        totalAmount: true,
        paymentMode: true,
        vehicleId: true,
        createdAt: true,
        items: {
          select: { quantity: true }
        }
      }
    });

    const vehicleAggMap = {};
    allVehicles.forEach(v => {
      vehicleAggMap[v.id] = {
        vehicleId: v.id,
        vehicleNumber: v.vehicleNumber,
        vehicleName: v.vehicleName || 'Substore',
        displayId: v.displayId || '—',
        storeName: v.store?.name || 'Unassigned',
        driverName: v.assignedUsers?.[0]?.name || 'Unassigned',
        driverPhone: v.assignedUsers?.[0]?.phone || '—',
        orderCount: 0,
        totalSales: 0,
        totalItemsSold: 0,
        cashSales: 0,
        upiSales: 0,
        cardSales: 0,
        creditSales: 0
      };
    });

    orders.forEach(o => {
      if (!vehicleAggMap[o.vehicleId]) {
        vehicleAggMap[o.vehicleId] = {
          vehicleId: o.vehicleId,
          vehicleNumber: 'Unknown Vehicle',
          vehicleName: 'Substore',
          displayId: '—',
          storeName: 'Unassigned',
          driverName: 'Unassigned',
          driverPhone: '—',
          orderCount: 0,
          totalSales: 0,
          totalItemsSold: 0,
          cashSales: 0,
          upiSales: 0,
          cardSales: 0,
          creditSales: 0
        };
      }
      const agg = vehicleAggMap[o.vehicleId];
      const amount = Number(o.totalAmount || 0);
      agg.orderCount += 1;
      agg.totalSales += amount;
      const itemsQty = (o.items || []).reduce((sum, it) => sum + (it.quantity || 0), 0);
      agg.totalItemsSold += itemsQty;

      if (o.paymentMode === 'CASH') agg.cashSales += amount;
      else if (o.paymentMode === 'UPI') agg.upiSales += amount;
      else if (o.paymentMode === 'CARD') agg.cardSales += amount;
      else if (o.paymentMode === 'CREDIT') agg.creditSales += amount;
    });

    const list = Object.values(vehicleAggMap).sort((a, b) => b.totalSales - a.totalSales);
    const totalRevenue = list.reduce((sum, item) => sum + item.totalSales, 0);
    const totalOrders = list.reduce((sum, item) => sum + item.orderCount, 0);
    const totalItems = list.reduce((sum, item) => sum + item.totalItemsSold, 0);

    res.json({
      success: true,
      data: list,
      summary: {
        totalVehicles: list.length,
        activeVehicles: list.filter(v => v.orderCount > 0).length,
        totalRevenue,
        totalOrders,
        totalItems
      }
    });
  } catch (error) {
    console.error('[ReportController] Vehicle Sales Report Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch vehicle sales report', error: error.message });
  }
};

/**
 * 2. Current Stock Report: Item-wise stock currently available in each vehicle
 * route: GET /api/v1/vsms/reports/vehicle-current-stock
 */
export const getVehicleCurrentStockReport = async (req, res) => {
  try {
    const { vehicleId, storeId, search } = req.query;

    const where = {};
    if (vehicleId && vehicleId !== 'ALL') {
      where.vehicleId = vehicleId;
    }
    if (storeId && storeId !== 'ALL' && storeId !== 'undefined' && storeId !== 'null') {
      where.storeId = storeId;
    }

    if (search && search.trim()) {
      where.product = {
        OR: [
          { name: { contains: search.trim(), mode: 'insensitive' } },
          { sku: { contains: search.trim(), mode: 'insensitive' } }
        ]
      };
    }

    const stocks = await prisma.vehicleStock.findMany({
      where,
      include: {
        vehicle: {
          select: {
            id: true,
            vehicleNumber: true,
            vehicleName: true,
            displayId: true,
            store: { select: { id: true, name: true } },
            assignedUsers: { select: { id: true, name: true, phone: true } }
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            costPrice: true,
            category: { select: { name: true } }
          }
        }
      },
      orderBy: [
        { vehicle: { vehicleNumber: 'asc' } },
        { quantity: 'desc' }
      ]
    });

    const formatted = stocks.map(st => {
      const price = Number(st.product?.price || 0);
      const stockVal = (st.quantity || 0) * price;
      return {
        id: st.id,
        vehicleId: st.vehicleId,
        vehicleNumber: st.vehicle?.vehicleNumber || 'Unknown Vehicle',
        vehicleName: st.vehicle?.vehicleName || 'Substore',
        displayId: st.vehicle?.displayId || '—',
        storeName: st.vehicle?.store?.name || 'Unassigned',
        driverName: st.vehicle?.assignedUsers?.[0]?.name || 'Unassigned',
        driverPhone: st.vehicle?.assignedUsers?.[0]?.phone || '—',
        productId: st.productId,
        productName: st.product?.name || 'Unknown Product',
        sku: st.product?.sku || '—',
        category: st.product?.category?.name || 'General',
        price,
        currentStock: st.quantity || 0,
        openingQuantity: st.openingQuantity || 0,
        stockValue: stockVal
      };
    });

    const totalQuantity = formatted.reduce((sum, item) => sum + item.currentStock, 0);
    const totalValue = formatted.reduce((sum, item) => sum + item.stockValue, 0);
    const uniqueVehicles = new Set(formatted.map(i => i.vehicleId)).size;
    const uniqueProducts = new Set(formatted.map(i => i.productId)).size;

    res.json({
      success: true,
      data: formatted,
      summary: {
        totalRecords: formatted.length,
        totalQuantity,
        totalValue,
        uniqueVehicles,
        uniqueProducts
      }
    });
  } catch (error) {
    console.error('[ReportController] Vehicle Current Stock Report Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch current stock report', error: error.message });
  }
};

/**
 * 3 & 4. Loading Report (type='LOAD') and Refilling Report (type='REFILL')
 * route: GET /api/v1/vsms/reports/vehicle-stock-movements?type=LOAD | REFILL
 */
export const getVehicleStockMovementReport = async (req, res) => {
  try {
    const { vehicleId, storeId, type = 'LOAD', startDate, endDate, search } = req.query;

    const where = {
      type: type.toUpperCase() // 'LOAD' or 'REFILL'
    };

    if (vehicleId && vehicleId !== 'ALL') {
      where.vehicleId = vehicleId;
    }
    if (storeId && storeId !== 'ALL' && storeId !== 'undefined' && storeId !== 'null') {
      where.storeId = storeId;
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    }

    const transactions = await prisma.stockTransaction.findMany({
      where,
      include: {
        vehicle: {
          select: {
            id: true,
            vehicleNumber: true,
            vehicleName: true,
            displayId: true,
            store: { select: { id: true, name: true } },
            assignedUsers: { select: { id: true, name: true, phone: true } }
          }
        }
      },
      orderBy: { date: 'desc' },
      take: 1000
    });

    const productIds = [...new Set(transactions.map(t => t.productId).filter(Boolean))];
    const products = productIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, sku: true, price: true, category: { select: { name: true } } }
        })
      : [];
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    const userIds = [...new Set(transactions.map(t => t.userId).filter(Boolean))];
    const users = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, role: true }
        })
      : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    let formatted = transactions.map(tx => {
      const prod = productMap[tx.productId] || {};
      const usr = userMap[tx.userId] || {};
      const unitPrice = Number(prod.price || 0);
      const qty = tx.quantity || 0;

      return {
        id: tx.id,
        date: tx.date,
        type: tx.type,
        vehicleId: tx.vehicleId,
        vehicleNumber: tx.vehicle?.vehicleNumber || 'Unknown Vehicle',
        vehicleName: tx.vehicle?.vehicleName || 'Substore',
        displayId: tx.vehicle?.displayId || '—',
        storeName: tx.vehicle?.store?.name || 'Unassigned',
        assignedDriver: tx.vehicle?.assignedUsers?.[0]?.name || 'Unassigned',
        productId: tx.productId,
        productName: prod.name || 'Unknown Product',
        sku: prod.sku || '—',
        category: prod.category?.name || 'General',
        quantity: qty,
        unitPrice,
        totalValue: qty * unitPrice,
        handledBy: usr.name || 'Warehouse Staff',
        userRole: usr.role || 'STAFF'
      };
    });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      formatted = formatted.filter(item =>
        item.productName.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.vehicleNumber.toLowerCase().includes(q)
      );
    }

    const totalQty = formatted.reduce((sum, i) => sum + i.quantity, 0);
    const totalVal = formatted.reduce((sum, i) => sum + i.totalValue, 0);
    const uniqueVehicles = new Set(formatted.map(i => i.vehicleId)).size;
    const uniqueItems = new Set(formatted.map(i => i.productId)).size;

    res.json({
      success: true,
      type: type.toUpperCase(),
      data: formatted,
      summary: {
        totalRecords: formatted.length,
        totalQuantity: totalQty,
        totalValue: totalVal,
        uniqueVehicles,
        uniqueItems
      }
    });
  } catch (error) {
    console.error('[ReportController] Vehicle Stock Movement Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stock movement report', error: error.message });
  }
};

/**
 * 5. Item-wise Sales Report by Vehicle: Item-wise quantities sold by each vehicle
 * route: GET /api/v1/vsms/reports/vehicle-item-sales
 */
export const getVehicleItemSalesReport = async (req, res) => {
  try {
    const { vehicleId, storeId, startDate, endDate, search } = req.query;

    const orderWhere = {
      vehicleId: { not: null },
      status: { not: 'CANCELLED' }
    };

    if (vehicleId && vehicleId !== 'ALL') {
      orderWhere.vehicleId = vehicleId;
    }

    if (storeId && storeId !== 'ALL' && storeId !== 'undefined' && storeId !== 'null') {
      const storeWhere = getStoreWhereClause(storeId);
      if (storeWhere) orderWhere.OR = storeWhere;
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      orderWhere.createdAt = { gte: start, lte: end };
    }

    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: orderWhere
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            createdAt: true,
            vehicleId: true,
            vehicle: {
              select: {
                id: true,
                vehicleNumber: true,
                vehicleName: true,
                displayId: true,
                store: { select: { id: true, name: true } },
                assignedUsers: { select: { id: true, name: true } }
              }
            }
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: { select: { name: true } }
          }
        }
      },
      orderBy: { order: { createdAt: 'desc' } }
    });

    // Group by vehicleId + productId
    const grouped = {};
    orderItems.forEach(oi => {
      const vId = oi.order?.vehicleId || 'unknown';
      const pId = oi.productId || 'unknown';
      const key = `${vId}_${pId}`;
      const itemDate = oi.order?.createdAt ? new Date(oi.order.createdAt) : null;

      if (!grouped[key]) {
        grouped[key] = {
          vehicleId: vId,
          vehicleNumber: oi.order?.vehicle?.vehicleNumber || 'Unknown Vehicle',
          vehicleName: oi.order?.vehicle?.vehicleName || 'Substore',
          displayId: oi.order?.vehicle?.displayId || '—',
          storeName: oi.order?.vehicle?.store?.name || 'Unassigned',
          driverName: oi.order?.vehicle?.assignedUsers?.[0]?.name || 'Unassigned',
          productId: pId,
          productName: oi.product?.name || oi.productName || 'Unknown Product',
          sku: oi.product?.sku || '—',
          category: oi.product?.category?.name || 'General',
          totalQuantity: 0,
          totalRevenue: 0,
          orderCount: 0,
          ordersList: new Set(),
          lastSaleDate: itemDate,
          firstSaleDate: itemDate
        };
      }

      grouped[key].totalQuantity += (oi.quantity || 0);
      grouped[key].totalRevenue += Number(oi.totalPrice || (oi.quantity * (oi.unitPrice || 0)) || 0);
      grouped[key].ordersList.add(oi.orderId);

      if (itemDate) {
        if (!grouped[key].lastSaleDate || itemDate > grouped[key].lastSaleDate) {
          grouped[key].lastSaleDate = itemDate;
        }
        if (!grouped[key].firstSaleDate || itemDate < grouped[key].firstSaleDate) {
          grouped[key].firstSaleDate = itemDate;
        }
      }
    });

    let list = Object.values(grouped).map(item => ({
      ...item,
      orderCount: item.ordersList.size,
      ordersList: undefined,
      avgPricePerUnit: item.totalQuantity > 0 ? (item.totalRevenue / item.totalQuantity) : 0,
      date: item.lastSaleDate
    }));

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(item =>
        item.productName.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.vehicleNumber.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => b.totalRevenue - a.totalRevenue);

    const totalSoldQty = list.reduce((sum, item) => sum + item.totalQuantity, 0);
    const totalSoldVal = list.reduce((sum, item) => sum + item.totalRevenue, 0);
    const uniqueVehicles = new Set(list.map(i => i.vehicleId)).size;
    const uniqueProducts = new Set(list.map(i => i.productId)).size;

    res.json({
      success: true,
      data: list,
      summary: {
        totalRecords: list.length,
        totalSoldQuantity: totalSoldQty,
        totalSoldRevenue: totalSoldVal,
        uniqueVehicles,
        uniqueProducts
      }
    });
  } catch (error) {
    console.error('[ReportController] Vehicle Item Sales Report Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch vehicle item sales report', error: error.message });
  }
};

/**
 * 6. Vehicle Opening Stock Report:
 * Shows preserved baseline opening quantity of items loaded onto vehicles,
 * along with opening valuation, current in-vehicle stock, and units dispatched/sold.
 * route: GET /api/v1/vsms/reports/vehicle-opening-stock
 */
export const getVehicleOpeningStockReport = async (req, res) => {
  try {
    const { vehicleId, storeId, startDate, endDate, search } = req.query;

    const where = {
      type: 'LOAD'
    };

    if (vehicleId && vehicleId !== 'ALL') {
      where.vehicleId = vehicleId;
    }
    if (storeId && storeId !== 'ALL' && storeId !== 'undefined' && storeId !== 'null') {
      where.storeId = storeId;
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    }

    // 1. Fetch each distinct stock load transaction (keeps every loaded opening quantity constant in its own row)
    const transactions = await prisma.stockTransaction.findMany({
      where,
      include: {
        vehicle: {
          select: {
            id: true,
            vehicleNumber: true,
            vehicleName: true,
            displayId: true,
            store: { select: { id: true, name: true } },
            assignedUsers: { select: { id: true, name: true, phone: true } }
          }
        }
      },
      orderBy: { date: 'desc' },
      take: 2000
    });

    const productIds = [...new Set(transactions.map(t => t.productId).filter(Boolean))];
    const vehicleIds = [...new Set(transactions.map(t => t.vehicleId).filter(Boolean))];

    // 2. Fetch product info
    const products = productIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            costPrice: true,
            category: { select: { name: true } }
          }
        })
      : [];
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    // 3. Fetch user info (staff who loaded)
    const userIds = [...new Set(transactions.map(t => t.userId).filter(Boolean))];
    const users = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, role: true }
        })
      : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    // 4. Fetch current live vehicle stock for comparison
    const vehicleStocks = await prisma.vehicleStock.findMany({
      where: {
        vehicleId: { in: vehicleIds },
        productId: { in: productIds }
      },
      select: {
        vehicleId: true,
        productId: true,
        quantity: true
      }
    });
    const liveStockMap = new Map();
    vehicleStocks.forEach(vs => {
      liveStockMap.set(`${vs.vehicleId}_${vs.productId}`, vs.quantity || 0);
    });

    let formatted = transactions.map(tx => {
      const prod = productMap[tx.productId] || {};
      const usr = userMap[tx.userId] || {};
      const price = Number(prod.price || 0);
      const openingQty = tx.quantity || 0;
      const openingVal = openingQty * price;
      const currentStock = liveStockMap.get(`${tx.vehicleId}_${tx.productId}`) || 0;

      return {
        id: tx.id,
        date: tx.date,
        vehicleId: tx.vehicleId,
        vehicleNumber: tx.vehicle?.vehicleNumber || 'Unknown Vehicle',
        vehicleName: tx.vehicle?.vehicleName || 'Substore',
        displayId: tx.vehicle?.displayId || '—',
        storeName: tx.vehicle?.store?.name || 'Unassigned',
        driverName: tx.vehicle?.assignedUsers?.[0]?.name || 'Unassigned',
        driverPhone: tx.vehicle?.assignedUsers?.[0]?.phone || '—',
        productId: tx.productId,
        productName: prod.name || 'Unknown Product',
        sku: prod.sku || '—',
        category: prod.category?.name || 'General',
        price,
        openingQuantity: openingQty,
        openingValue: openingVal,
        currentStock,
        currentValue: currentStock * price,
        loadedBy: usr.name || 'Warehouse Staff'
      };
    });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      formatted = formatted.filter(item =>
        item.productName.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.vehicleNumber.toLowerCase().includes(q) ||
        item.vehicleName.toLowerCase().includes(q)
      );
    }

    const totalOpeningQty = formatted.reduce((sum, item) => sum + item.openingQuantity, 0);
    const totalOpeningVal = formatted.reduce((sum, item) => sum + item.openingValue, 0);
    const uniqueVehicles = new Set(formatted.map(i => i.vehicleId)).size;
    const uniqueProducts = new Set(formatted.map(i => i.productId)).size;

    res.json({
      success: true,
      data: formatted,
      summary: {
        totalRecords: formatted.length,
        totalOpeningQuantity: totalOpeningQty,
        totalOpeningValue: totalOpeningVal,
        uniqueVehicles,
        uniqueProducts
      }
    });
  } catch (error) {
    console.error('[ReportController] Vehicle Opening Stock Report Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch opening stock report', error: error.message });
  }
};




