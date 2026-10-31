import { prisma } from './config/prismaClient.js';

async function main() {
  const statusCounts = await prisma.order.groupBy({
    by: ['status'],
    _count: true
  });
  console.log('Status counts:', statusCounts);

  const fulfillmentCounts = await prisma.order.groupBy({
    by: ['fulfillmentType'],
    _count: true
  });
  console.log('FulfillmentType counts:', fulfillmentCounts);

  const deliveryTypeCounts = await prisma.order.groupBy({
    by: ['deliveryType'],
    _count: true
  });
  console.log('deliveryType counts:', deliveryTypeCounts);

  const orderTypeCounts = await prisma.order.groupBy({
    by: ['orderType'],
    _count: true
  });
  console.log('orderType counts:', orderTypeCounts);

  const latestOrders = await prisma.order.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      fulfillmentType: true,
      deliveryType: true,
      orderType: true,
      createdAt: true
    }
  });
  console.log('Latest 10 orders:', latestOrders);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
