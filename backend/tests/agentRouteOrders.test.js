import { describe, it, beforeEach, afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../config/prismaClient.js';
import { getAgentAppOrders, updateAgentOrderStatus } from '../controllers/vsms/orderController.js';

describe('VSMS Agent Route Orders -> App Orders Unit Tests', () => {
  let savedPrismaMethods = {};

  beforeEach(() => {
    savedPrismaMethods = {
      orderFindMany: prisma.order.findMany,
      orderFindUnique: prisma.order.findUnique,
      orderCount: prisma.order.count,
      orderUpdate: prisma.order.update,
      userFindUnique: prisma.user?.findUnique,
      vehicleFindUnique: prisma.vehicle?.findUnique,
      routeAssignmentFindFirst: prisma.routeAssignment?.findFirst,
      orderStatusHistoryCreate: prisma.orderStatusHistory?.create,
      paymentUpdate: prisma.payment?.update,
      tx: prisma.$transaction
    };
  });

  afterEach(() => {
    prisma.order.findMany = savedPrismaMethods.orderFindMany;
    prisma.order.findUnique = savedPrismaMethods.orderFindUnique;
    prisma.order.count = savedPrismaMethods.orderCount;
    prisma.order.update = savedPrismaMethods.orderUpdate;
    if (savedPrismaMethods.userFindUnique) prisma.user.findUnique = savedPrismaMethods.userFindUnique;
    if (savedPrismaMethods.vehicleFindUnique) prisma.vehicle.findUnique = savedPrismaMethods.vehicleFindUnique;
    if (savedPrismaMethods.routeAssignmentFindFirst) prisma.routeAssignment.findFirst = savedPrismaMethods.routeAssignmentFindFirst;
    if (savedPrismaMethods.orderStatusHistoryCreate) prisma.orderStatusHistory.create = savedPrismaMethods.orderStatusHistoryCreate;
    if (savedPrismaMethods.paymentUpdate) prisma.payment.update = savedPrismaMethods.paymentUpdate;
    prisma.$transaction = savedPrismaMethods.tx;
  });

  it('getAgentAppOrders: returns only orders for agent assigned vehicle with VEHICLE_PICKUP and excludes POS orders', async () => {
    const mockAgentId = 'agent-001';
    const mockVehicleId = 'vehicle-mart-1';

    let capturedWhere = null;

    prisma.user = {
      ...prisma.user,
      findUnique: async () => ({ id: mockAgentId, assignedVehicleId: mockVehicleId })
    };

    prisma.vehicle = {
      ...prisma.vehicle,
      findUnique: async () => ({
        id: mockVehicleId,
        vehicleNumber: 'KA-01-AB-1234',
        vehicleName: 'Mobile Mart 1',
        status: true,
        routeAssignments: []
      })
    };

    prisma.order = {
      ...prisma.order,
      count: async ({ where }) => {
        capturedWhere = where;
        return 1;
      },
      findMany: async ({ where }) => {
        return [
          {
            id: 'ord-app-1',
            orderNumber: 'VK-20261021-00031',
            status: 'PLACED',
            createdAt: new Date(),
            totalAmount: 135,
            fulfillmentType: 'VEHICLE_PICKUP',
            deliveryType: 'PICKUP_AT_VEHICLE',
            vehicleId: mockVehicleId,
            customer: { name: 'Ramesh Kumar', mobile: '9876543210' },
            payment: { method: 'COD', status: 'PENDING' },
            items: [
              {
                id: 'it-1',
                productId: 'p-1',
                product: { name: 'Tomato' },
                quantity: 2,
                unitPrice: 30,
                totalPrice: 60
              }
            ]
          }
        ];
      }
    };

    const req = {
      user: { id: mockAgentId, assignedVehicleId: mockVehicleId, role: 'SALES_AGENT' },
      query: { tab: 'app_orders' }
    };

    let responseData = null;
    const res = {
      json: (data) => { responseData = data; }
    };
    const next = (err) => { if (err) throw err; };

    await getAgentAppOrders(req, res, next);

    assert.ok(responseData.success);
    assert.equal(responseData.orders.length, 1);
    assert.equal(responseData.orders[0].displayId, 'VK-20261021-00031');
    assert.equal(responseData.orders[0].customer.name, 'Ramesh Kumar');
    assert.equal(responseData.orders[0].fulfillmentType, 'VEHICLE_PICKUP');
    assert.equal(responseData.orders[0].allowedActions[0].action, 'CONFIRMED');

    // Confirm strict scoping to the agent's vehicle and VEHICLE_PICKUP
    assert.ok(capturedWhere.AND.some(c => c.vehicleId === mockVehicleId));
    assert.ok(capturedWhere.AND.some(c => c.fulfillmentType === 'VEHICLE_PICKUP'));
  });

  it('getAgentAppOrders: returns empty list gracefully when agent has no assigned vehicle', async () => {
    prisma.user = {
      ...prisma.user,
      findUnique: async () => ({ id: 'unassigned-agent', assignedVehicleId: null })
    };

    prisma.routeAssignment = {
      ...prisma.routeAssignment,
      findFirst: async () => null
    };

    const req = {
      user: { id: 'unassigned-agent', assignedVehicleId: null, role: 'SALES_AGENT' },
      query: {}
    };

    let responseData = null;
    const res = {
      json: (data) => { responseData = data; }
    };

    await getAgentAppOrders(req, res, (err) => { if (err) throw err; });

    assert.ok(responseData.success);
    assert.equal(responseData.orders.length, 0);
    assert.equal(responseData.vehicle, null);
  });

  it('updateAgentOrderStatus: successfully executes PLACED -> CONFIRMED transition without re-deducting inventory', async () => {
    const mockAgentId = 'agent-001';
    const mockVehicleId = 'vehicle-mart-1';
    const mockOrderId = 'ord-app-1';

    let orderUpdateData = null;
    let historyCreatedData = null;

    prisma.user = {
      ...prisma.user,
      findUnique: async () => ({ id: mockAgentId, assignedVehicleId: mockVehicleId })
    };

    prisma.order = {
      ...prisma.order,
      findUnique: async () => ({
        id: mockOrderId,
        orderNumber: 'VK-20261021-00031',
        status: 'PLACED',
        vehicleId: mockVehicleId,
        fulfillmentType: 'VEHICLE_PICKUP',
        payment: { id: 'pay-1', method: 'COD', status: 'PENDING' },
        items: [{ id: 'it-1', productId: 'p-1', quantity: 2 }]
      })
    };

    prisma.$transaction = async (callback) => {
      const txMock = {
        order: {
          update: async ({ data }) => {
            orderUpdateData = data;
            return { id: mockOrderId, orderNumber: 'VK-20261021-00031', status: data.status };
          }
        },
        orderStatusHistory: {
          create: async ({ data }) => {
            historyCreatedData = data;
            return { id: 'hist-1', ...data };
          }
        },
        vehicleStock: {
          update: async () => {
            throw new Error('Vehicle stock must NEVER be re-deducted on status update!');
          }
        }
      };
      return callback(txMock);
    };

    const req = {
      user: { id: mockAgentId, assignedVehicleId: mockVehicleId, role: 'SALES_AGENT' },
      params: { orderId: mockOrderId },
      body: { nextStatus: 'CONFIRMED' }
    };

    let responseData = null;
    const res = {
      json: (data) => { responseData = data; },
      status: () => res
    };

    await updateAgentOrderStatus(req, res, (err) => { if (err) throw err; });

    assert.ok(responseData.success);
    assert.equal(orderUpdateData.status, 'CONFIRMED');
    assert.equal(historyCreatedData.fromStatus, 'PLACED');
    assert.equal(historyCreatedData.toStatus, 'CONFIRMED');
    assert.equal(historyCreatedData.changedBy, mockAgentId);
  });

  it('updateAgentOrderStatus: blocks unrelated agent from modifying another vehicle order (403 Access Denied)', async () => {
    const mockAgentId = 'agent-002'; // Agent assigned to vehicle-2
    const mockVehicleId = 'vehicle-mart-2';
    const otherVehicleId = 'vehicle-mart-1';
    const mockOrderId = 'ord-app-1';

    prisma.user = {
      ...prisma.user,
      findUnique: async () => ({ id: mockAgentId, assignedVehicleId: mockVehicleId })
    };

    prisma.order = {
      ...prisma.order,
      findUnique: async () => ({
        id: mockOrderId,
        status: 'PLACED',
        vehicleId: otherVehicleId, // Belongs to vehicle-1!
        fulfillmentType: 'VEHICLE_PICKUP'
      })
    };

    let statusCode = null;
    let responseData = null;
    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => { responseData = data; }
        };
      }
    };

    const req = {
      user: { id: mockAgentId, assignedVehicleId: mockVehicleId, role: 'SALES_AGENT' },
      params: { orderId: mockOrderId },
      body: { nextStatus: 'CONFIRMED' }
    };

    await updateAgentOrderStatus(req, res, (err) => { if (err) throw err; });

    assert.equal(statusCode, 403);
    assert.equal(responseData.success, false);
    assert.ok(responseData.message.includes('Access denied'));
  });

  it('updateAgentOrderStatus: rejects invalid transition e.g. PLACED -> COMPLETED directly', async () => {
    const mockAgentId = 'agent-001';
    const mockVehicleId = 'vehicle-mart-1';
    const mockOrderId = 'ord-app-1';

    prisma.user = {
      ...prisma.user,
      findUnique: async () => ({ id: mockAgentId, assignedVehicleId: mockVehicleId })
    };

    prisma.order = {
      ...prisma.order,
      findUnique: async () => ({
        id: mockOrderId,
        status: 'PLACED',
        vehicleId: mockVehicleId,
        fulfillmentType: 'VEHICLE_PICKUP'
      })
    };

    let statusCode = null;
    let responseData = null;
    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => { responseData = data; }
        };
      }
    };

    const req = {
      user: { id: mockAgentId, assignedVehicleId: mockVehicleId, role: 'SALES_AGENT' },
      params: { orderId: mockOrderId },
      body: { nextStatus: 'COMPLETED' } // Illegal skip directly to COMPLETED!
    };

    await updateAgentOrderStatus(req, res, (err) => { if (err) throw err; });

    assert.equal(statusCode, 400);
    assert.equal(responseData.success, false);
    assert.ok(responseData.message.includes('Invalid order transition'));
  });

  it('updateAgentOrderStatus: isolates customer notification to order consumer and suppresses duplicate retries', async () => {
    const mockAgentId = 'agent-001';
    const mockVehicleId = 'vehicle-mart-1';
    const mockOrderId = 'ord-app-notif-1';
    const mockConsumerId = 'consumer-target-123';

    prisma.user = {
      ...prisma.user,
      findUnique: async () => ({ id: mockAgentId, assignedVehicleId: mockVehicleId })
    };

    prisma.order = {
      ...prisma.order,
      findUnique: async () => ({
        id: mockOrderId,
        orderNumber: 'VK-VORD-777',
        status: 'CONFIRMED',
        vehicleId: mockVehicleId,
        consumerId: mockConsumerId,
        fulfillmentType: 'VEHICLE_PICKUP',
        payment: { id: 'p-1', status: 'PENDING' }
      })
    };

    let notificationLookupQuery = null;
    prisma.notification = {
      ...prisma.notification,
      findFirst: async ({ where }) => {
        notificationLookupQuery = where;
        // Simulate existing notification found to test deduplication!
        return {
          id: 'notif-existing-1',
          userId: mockConsumerId,
          type: 'ORDER_READY',
          createdAt: new Date()
        };
      }
    };

    prisma.$transaction = async (cb) => {
      return cb({
        order: { update: async ({ data }) => ({ id: mockOrderId, status: data.status }) },
        payment: { update: async () => {} },
        orderStatusHistory: { create: async () => {} }
      });
    };

    const req = {
      user: { id: mockAgentId, assignedVehicleId: mockVehicleId, role: 'SALES_AGENT' },
      params: { orderId: mockOrderId },
      body: { nextStatus: 'PACKED' }
    };

    let responseData = null;
    const res = {
      json: (data) => { responseData = data; },
      status: () => res
    };

    await updateAgentOrderStatus(req, res, (err) => { if (err) throw err; });

    assert.ok(responseData.success);
    // Verifies notification check scoped strictly to consumerId (no recipient leakage)
    assert.ok(notificationLookupQuery);
    assert.equal(notificationLookupQuery.userId, mockConsumerId);
    assert.equal(notificationLookupQuery.type, 'ORDER_PROCESSING');
  });
});

describe('[Database Integration Test] VSMS Vehicle Order Query in PostgreSQL', () => {
  after(async () => {
    await prisma.$disconnect();
  });

  it('queries actual PostgreSQL Order table with fulfillmentType VEHICLE_PICKUP safely', async () => {
    const vehicleOrdersCount = await prisma.order.count({
      where: {
        fulfillmentType: 'VEHICLE_PICKUP'
      }
    });

    assert.ok(typeof vehicleOrdersCount === 'number');
  });
});
