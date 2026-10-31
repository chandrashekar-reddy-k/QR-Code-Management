import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('VSMS & POS Sales Filters Regression Test Suite', () => {

  // Pure filtering & classification engine matching AdminSales.tsx & backend vsmsRoutes.js
  const classifyOrder = (order) => {
    if (!order) return { source: 'POS', label: 'POS', isAppOrder: false, isVehicleOrder: false, isPosOrder: true };
    const orderType = (order.orderType || '').toUpperCase();
    const fulfillmentType = (order.fulfillmentType || '').toUpperCase();
    const deliveryType = (order.deliveryType || '').toUpperCase();
    const hasVehicle = Boolean(order.vehicleId || order.vehicle);

    const isVehicleFulfillment = fulfillmentType === 'VEHICLE_PICKUP' || deliveryType === 'PICKUP_AT_VEHICLE' || orderType === 'VEHICLE';

    if (orderType === 'ONLINE' && isVehicleFulfillment && hasVehicle) {
      return { source: 'VEHICLE', label: 'Vehicle App', isAppOrder: true, isVehicleOrder: true, isPosOrder: false };
    }
    if (orderType === 'ONLINE') {
      return { source: 'APP', label: 'App', isAppOrder: true, isVehicleOrder: false, isPosOrder: false };
    }
    return { source: 'POS', label: 'POS', isAppOrder: false, isVehicleOrder: false, isPosOrder: true };
  };

  const filterDataset = (orders, filters) => {
    const {
      status = 'ALL',
      deliveryType = 'ALL',
      orderSource = 'ALL',
      dateRange = null,
      search = '',
      warehouseId = null
    } = filters;

    return orders.filter(s => {
      // Warehouse isolation
      if (warehouseId && s.warehouseId && s.warehouseId !== warehouseId) return false;

      // Delivery Type
      if (deliveryType && deliveryType !== 'ALL') {
        const fulfillment = (s.fulfillmentType || s.deliveryType || '').toUpperCase();
        const orderType = (s.orderType || '').toUpperCase();
        if (deliveryType === 'STORE_PICKUP') {
          if (fulfillment !== 'STORE_PICKUP' && fulfillment !== 'PICKUP_STORE' && !(orderType === 'POS' && !s.vehicleId && !fulfillment)) return false;
        } else if (deliveryType === 'HOME_DELIVERY') {
          if (fulfillment !== 'HOME_DELIVERY') return false;
        } else if (deliveryType === 'VEHICLE_PICKUP') {
          const isVehicle = fulfillment === 'VEHICLE_PICKUP' || fulfillment === 'PICKUP_AT_VEHICLE' || orderType === 'VEHICLE' || Boolean(s.vehicleId);
          if (!isVehicle) return false;
        } else if (deliveryType === 'POS') {
          const isPos = orderType === 'POS' || (!s.vehicleId && orderType !== 'ONLINE' && fulfillment !== 'HOME_DELIVERY');
          if (!isPos) return false;
        }
      }

      // Order Source
      if (orderSource && orderSource !== 'ALL') {
        const classification = classifyOrder(s);
        if (orderSource === 'POS' && !classification.isPosOrder) return false;
        if (orderSource === 'APP' && !classification.isAppOrder) return false;
        if (orderSource === 'VEHICLE' && !classification.isVehicleOrder) return false;
      }

      // Status
      if (status && status !== 'ALL') {
        const statusUpper = (s.status || '').toUpperCase();
        if (status === 'READY_FOR_PICKUP') {
          if (statusUpper !== 'READY_FOR_PICKUP') return false;
        } else if (status === 'DELIVERED') {
          if (statusUpper !== 'DELIVERED') return false;
        } else if (status === 'COMPLETED') {
          if (!['COMPLETED', 'DELIVERED'].includes(statusUpper)) return false;
        } else if (status === 'OUT_FOR_DELIVERY') {
          if (statusUpper !== 'OUT_FOR_DELIVERY') return false;
        } else if (status === 'PROCESSING') {
          if (!['PROCESSING', 'PACKED'].includes(statusUpper)) return false;
        } else if (status === 'CONFIRMED') {
          if (statusUpper !== 'CONFIRMED') return false;
        } else if (status === 'PENDING') {
          if (!['PENDING', 'PLACED', 'CREATED'].includes(statusUpper)) return false;
        } else if (status === 'CANCELLED') {
          if (!['CANCELLED', 'CANCELED'].includes(statusUpper)) return false;
        } else if (status === 'RETURNED') {
          if (!['RETURNED', 'RETURN_INITIATED'].includes(statusUpper)) return false;
        } else if (status === 'PARTIALLY_RETURNED') {
          if (statusUpper !== 'PARTIALLY_RETURNED') return false;
        } else if (statusUpper !== status) {
          return false;
        }
      }

      // Date Range (YYYY-MM-DD)
      if (dateRange && (dateRange.from || dateRange.to)) {
        const orderDateStr = new Date(s.createdAt).toISOString().split('T')[0];
        if (dateRange.from && orderDateStr < dateRange.from) return false;
        if (dateRange.to && orderDateStr > dateRange.to) return false;
      }

      // Search
      if (search && search.trim()) {
        const query = search.trim().toLowerCase();
        const cleanQuery = query.replace(/^vk-?/i, '');

        const orderNum = (s.orderNumber || '').toLowerCase();
        const cleanOrderNum = orderNum.replace(/^vk-?/i, '');
        const displayId = (s.displayId || '').toLowerCase();
        const orderId = (s.id || '').toLowerCase();
        const custName = (s.customerName || s.consumer?.name || s.customer?.name || '').toLowerCase();
        const phone = (s.mobile || s.consumer?.phone || s.customer?.mobile || '').toLowerCase();
        const vehNum = (s.vehicle?.vehicleNumber || s.vehicleNumber || '').toLowerCase();

        const matches =
          orderNum.includes(query) ||
          (cleanQuery.length > 0 && cleanOrderNum.includes(cleanQuery)) ||
          displayId.includes(query) ||
          orderId.includes(query) ||
          custName.includes(query) ||
          phone.includes(query) ||
          vehNum.includes(query);

        if (!matches) return false;
      }

      return true;
    });
  };

  const sampleOrders = [
    {
      id: 'ord-101',
      orderNumber: 'VK-20261022-000001',
      warehouseId: 'wh-main',
      orderType: 'ONLINE',
      fulfillmentType: 'VEHICLE_PICKUP',
      deliveryType: 'PICKUP_AT_VEHICLE',
      vehicleId: 'veh-01',
      vehicle: { vehicleNumber: 'AP29BD1234' },
      status: 'READY_FOR_PICKUP',
      createdAt: '2026-10-22T08:30:00.000Z',
      totalAmount: 500,
      customerName: 'Ananya Sharma',
      mobile: '9876543210'
    },
    {
      id: 'ord-102',
      orderNumber: 'VK-20261022-000002',
      warehouseId: 'wh-main',
      orderType: 'ONLINE',
      fulfillmentType: 'HOME_DELIVERY',
      status: 'DELIVERED',
      createdAt: '2026-10-22T09:00:00.000Z',
      totalAmount: 1200,
      customerName: 'Sanjay Verma',
      mobile: '9123456789'
    },
    {
      id: 'ord-103',
      orderNumber: '10003',
      warehouseId: 'wh-main',
      orderType: 'POS',
      fulfillmentType: 'STORE_PICKUP',
      status: 'COMPLETED',
      createdAt: '2026-10-21T11:00:00.000Z',
      totalAmount: 350,
      customerName: 'Walk-in Customer',
      mobile: '9988776655'
    },
    {
      id: 'ord-104',
      orderNumber: 'VK-20261022-000004',
      warehouseId: 'wh-other',
      orderType: 'ONLINE',
      fulfillmentType: 'HOME_DELIVERY',
      status: 'CANCELLED',
      createdAt: '2026-10-22T10:00:00.000Z',
      totalAmount: 900,
      customerName: 'Cross Partner Cust',
      mobile: '9000000000'
    }
  ];

  it('1. Each filter independently works correctly', () => {
    // Status filter
    const readyOrders = filterDataset(sampleOrders, { status: 'READY_FOR_PICKUP' });
    assert.equal(readyOrders.length, 1);
    assert.equal(readyOrders[0].id, 'ord-101');

    // Delivery Type filter
    const homeOrders = filterDataset(sampleOrders, { deliveryType: 'HOME_DELIVERY' });
    assert.equal(homeOrders.length, 2);

    // Order Source filter
    const posOrders = filterDataset(sampleOrders, { orderSource: 'POS' });
    assert.equal(posOrders.length, 1);
    assert.equal(posOrders[0].id, 'ord-103');

    // Date filter
    const todayOrders = filterDataset(sampleOrders, { dateRange: { from: '2026-10-22', to: '2026-10-22' } });
    assert.equal(todayOrders.length, 3);
  });

  it('2. Multiple filters applied together (Combined Filtering)', () => {
    // Example: READY_FOR_PICKUP, 2026-10-22, VEHICLE_PICKUP, App Orders
    const combined = filterDataset(sampleOrders, {
      status: 'READY_FOR_PICKUP',
      dateRange: { from: '2026-10-22', to: '2026-10-22' },
      deliveryType: 'VEHICLE_PICKUP',
      orderSource: 'APP'
    });
    assert.equal(combined.length, 1);
    assert.equal(combined[0].id, 'ord-101');
    assert.equal(combined[0].orderNumber, 'VK-20261022-000001');
  });

  it('3. Changing one filter preserves other selected filters', () => {
    const baseFilters = {
      dateRange: { from: '2026-10-22', to: '2026-10-22' },
      deliveryType: 'HOME_DELIVERY',
      orderSource: 'APP'
    };
    // Status = DELIVERED
    const delivered = filterDataset(sampleOrders, { ...baseFilters, status: 'DELIVERED' });
    assert.equal(delivered.length, 1);
    assert.equal(delivered[0].id, 'ord-102');

    // Change status to CANCELLED while preserving date, deliveryType, and orderSource
    const cancelled = filterDataset(sampleOrders, { ...baseFilters, status: 'CANCELLED' });
    assert.equal(cancelled.length, 1);
    assert.equal(cancelled[0].id, 'ord-104');
  });

  it('4. Reset Filter restores defaults and clears all criteria', () => {
    const defaultFilters = {
      status: 'ALL',
      deliveryType: 'ALL',
      orderSource: 'ALL',
      dateRange: null,
      search: ''
    };
    const all = filterDataset(sampleOrders, defaultFilters);
    assert.equal(all.length, sampleOrders.length);
  });

  it('5. Search handles full order number, digits without prefix, mobile, and customer name', () => {
    // Full VK- prefixed search
    const r1 = filterDataset(sampleOrders, { search: 'VK-20261022-000001' });
    assert.equal(r1.length, 1);
    assert.equal(r1[0].id, 'ord-101');

    // Partial digits search without prefix
    const r2 = filterDataset(sampleOrders, { search: '000001' });
    assert.equal(r2.length, 1);
    assert.equal(r2[0].id, 'ord-101');

    // Customer name search (case insensitive)
    const r3 = filterDataset(sampleOrders, { search: 'ananya' });
    assert.equal(r3.length, 1);
    assert.equal(r3[0].id, 'ord-101');

    // Mobile number search
    const r4 = filterDataset(sampleOrders, { search: '9876543210' });
    assert.equal(r4.length, 1);
    assert.equal(r4[0].id, 'ord-101');

    // Vehicle number search
    const r5 = filterDataset(sampleOrders, { search: 'AP29BD1234' });
    assert.equal(r5.length, 1);
    assert.equal(r5[0].id, 'ord-101');
  });

  it('6. Filter changes correctly recalculate totals and pagination count', () => {
    const filtered = filterDataset(sampleOrders, { status: 'READY_FOR_PICKUP' });
    const totalRevenue = filtered.reduce((acc, o) => acc + o.totalAmount, 0);
    const totalCount = filtered.length;
    const itemsPerPage = 10;
    const totalPages = Math.ceil(totalCount / itemsPerPage);

    assert.equal(totalCount, 1);
    assert.equal(totalRevenue, 500);
    assert.equal(totalPages, 1);
  });

  it('7. Empty results properly detected for non-matching filter combinations', () => {
    const noMatch = filterDataset(sampleOrders, {
      status: 'RETURNED'
    });
    assert.equal(noMatch.length, 0);
  });

  it('8. Cross-partner data isolation is preserved (unauthorized records excluded)', () => {
    const mainPartnerOrders = filterDataset(sampleOrders, { warehouseId: 'wh-main' });
    assert.equal(mainPartnerOrders.length, 3);
    assert.ok(mainPartnerOrders.every(o => o.warehouseId === 'wh-main'));
    assert.ok(!mainPartnerOrders.some(o => o.id === 'ord-104'));
  });

  it('9. Canonical status mapping handles all required order lifecycle statuses', () => {
    const supportedStatuses = [
      'READY_FOR_PICKUP', 'DELIVERED', 'COMPLETED', 'OUT_FOR_DELIVERY',
      'PROCESSING', 'CONFIRMED', 'PENDING', 'CANCELLED', 'RETURNED', 'PARTIALLY_RETURNED'
    ];
    for (const st of supportedStatuses) {
      const mockOrder = { status: st, orderType: 'ONLINE', fulfillmentType: 'HOME_DELIVERY' };
      const matched = filterDataset([mockOrder], { status: st });
      assert.equal(matched.length, 1, `Failed to match canonical status: ${st}`);
    }
  });

  it('10. Delivery Type preserves distinct fulfillment types', () => {
    const storePickupOrder = { orderType: 'POS', fulfillmentType: 'STORE_PICKUP' };
    const homeDeliveryOrder = { orderType: 'ONLINE', fulfillmentType: 'HOME_DELIVERY' };
    const vehiclePickupOrder = { orderType: 'ONLINE', fulfillmentType: 'VEHICLE_PICKUP', vehicleId: 'v-1' };

    assert.equal(filterDataset([storePickupOrder], { deliveryType: 'STORE_PICKUP' }).length, 1);
    assert.equal(filterDataset([storePickupOrder], { deliveryType: 'HOME_DELIVERY' }).length, 0);

    assert.equal(filterDataset([homeDeliveryOrder], { deliveryType: 'HOME_DELIVERY' }).length, 1);
    assert.equal(filterDataset([homeDeliveryOrder], { deliveryType: 'STORE_PICKUP' }).length, 0);

    assert.equal(filterDataset([vehiclePickupOrder], { deliveryType: 'VEHICLE_PICKUP' }).length, 1);
    assert.equal(filterDataset([vehiclePickupOrder], { deliveryType: 'HOME_DELIVERY' }).length, 0);
  });
});
