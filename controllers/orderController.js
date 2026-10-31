// controllers/orderController.js
import { prisma } from '../config/prismaClient.js';
import logger from '../utils/logger.js';
import { errorResponse, successResponse, paginatedResponse } from '../utils/responseHelper.js';
const createOrder = async (req, res) => {
  try {
    const {
      consumerId,
      addressId,
      warehouseId,
      totalAmount,
      deliveryDate,
      specialInstructions,
      orderItems,    // array of { productId, quantity, price }
      deliveryType,
      fulfillmentType
    } = req.body;

    // ✅ Validate required fields
    if (!consumerId || !addressId || !warehouseId || !totalAmount) {
      return errorResponse(res, 400, "Missing required order fields");
    }
    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      return errorResponse(res, 400, "Order must have at least one item");
    }

    const orderNumber = `ORD-${Date.now()}`; // simple unique order number
    const isoDeliveryDate = deliveryDate
        ? new Date(deliveryDate).toISOString()  // convert "2025-09-12" → "2025-09-12T00:00:00.000Z"
        : null;


    // ✅ Transaction for Order + OrderItems
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          consumerId,
          addressId,
          warehouseId,
          totalAmount,
          deliveryDate: isoDeliveryDate,
          specialInstructions,
          deliveryType: deliveryType || 'FAST',
          fulfillmentType: fulfillmentType || 'HOME_DELIVERY'
        },
      });

      // createMany does not return created records, so loop if you need return
      await tx.orderItem.createMany({
        data: orderItems.map((item) => ({
          orderId: newOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
      });

      // ✅ Create a FulfillmentOrder as well, so it shows up in partner portals
      await tx.fulfillmentOrder.create({
        data: {
          fulfillmentOrderNo: `FUL-${orderNumber}`,
          orderId: newOrder.id,
          status: 'ALLOCATED',
          fulfillmentType: fulfillmentType || 'HOME_DELIVERY',
          assignedWarehouseId: warehouseId,
        }
      });

      return newOrder;
    });

    logger.info(`Order created with id: ${order.id}`);
    return successResponse(res, 201, "Order created successfully", order);

  } catch (error) {
    logger.error("Error creating order:", error);
    return errorResponse(res, 500, "Failed to create order");
  }
};

const getOrderList = async (req, res) => {
  try {
    let { page, limit, status, search } = req.query;

    page = parseInt(page) > 0 ? parseInt(page) : 1;
    limit = parseInt(limit) > 0 ? parseInt(limit) : 10;
    const skip = (page - 1) * limit;

    // Dynamic filters
    const whereClause = {};

    // Filter by status (if provided)
    if (status) {
      whereClause.status = status.toUpperCase();
    }

    // Search by orderId, customer (consumer.name), or warehouse.name
    if (search && search.trim() !== "") {
      whereClause.OR = [
        {
          orderNumber: { contains: search.trim(), mode: 'insensitive' },
        },
        {
          consumer: {
            name: { contains: search.trim(), mode: 'insensitive' },
          },
        },
        {
          warehouse: {
            name: { contains: search.trim(), mode: 'insensitive' },
          },
        },
      ];
    }

    // Fetch orders + count
    const [orders, total, countByStatus] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
            warehouse: { select: { name: true } },
            consumer: { select: { name: true } }, 
            agent: { select: { name: true } },
            items: { select: { quantity: true, unitPrice: true, totalPrice: true,
                product: { select: { name: true } }  
                } ,
            // include: { product: { select: { name: true } } }      
            },
        }
      }),
      prisma.order.count({ where: whereClause }),
      prisma.order.groupBy({
        by: ['status'],
        _count: {
          status: true,
        },
      }),
    ]);

    logger.info(`Fetched ${orders.length} orders (page ${page})`);

    // Transform groupBy result into a cleaner object
    const statusCounts = {};
    countByStatus.forEach(item => {
      statusCounts[item.status] = item._count.status;
    });

    return paginatedResponse(
      res,
      200,
        { orders, statusCounts },
        { total, page, limit },
      "Orders fetched successfully"
    );
  } catch (error) {
    logger.error(`Error fetching orders: ${error.message}`, { error });
    return errorResponse(res, 500, 'Something went wrong while fetching orders');
  }
};

/**
 * @deprecated Legacy partner route — bypassed centralized lifecycle. Disabled during backend stabilization.
 */
const updateOrderStatus = async (req, res) => {
  return errorResponse(
    res,
    410,
    'Deprecated: use partner order APIs under /api/v1/partner/orders or delivery-api order flows.'
  );
};

const getOrdersByOrderId = async (req, res) => {
    try {
        const { orderId } = req.params;

        logger.info(`Fetching order details for orderId: ${orderId}`);

        if (!orderId) {
            logger.warn('orderId missing in request params');
            return errorResponse(res, 400, 'orderId is required');
        }

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                consumer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true
                    }
                },
                items: {
                    select: {
                        id: true,
                        quantity: true,
                        unitPrice: true,
                        totalPrice: true,
                        product: {   // relation: OrderItem.productId -> Product.id
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                price: true,
                                mrp: true
                            }
                        }
                    }
                },
                payment: {  // relation: Payment.orderId -> Order.id
                    select: {
                        id: true,
                        amount: true,
                        method: true,
                        status: true,
                    },
                },
                delivery: {   // relation: Delivery.orderId -> Order.id
                    select: {
                        id: true,
                        status: true,
                        assignedAt: true,
                        pickedUpAt: true,
                        deliveredAt: true,
                        pickupLocation: true,
                        deliveryLocation: true
                    }
                },
                orderReturnHistory: true,
                refundTransactions: true,                    
            },
        });

        if (!order) {
            logger.warn(`No order found with id: ${orderId}`);
            return errorResponse(res, 404, 'Order not found');
        }

        logger.info(`Fetched order with ${order.items.length} items and delivery info for orderId: ${orderId}`);

        return successResponse(res, 200, order, 'Order fetched successfully');

    } catch (error) {
        logger.error(`Error fetching order: ${error.message}`);
        return errorResponse(res, 500, 'Failed to fetch order');
    }
};

export {
    createOrder,
    getOrderList,
    updateOrderStatus,
    getOrdersByOrderId
}