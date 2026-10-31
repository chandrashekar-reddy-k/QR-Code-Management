import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Partner Portal VSMS & POS Sales - Order Source Classification & Integration Tests', () => {

  // Authoritative classification logic mirror (identical to AdminSales.tsx & backend vsmsRoutes)
  const classifyOrder = (order) => {
    if (!order) {
      return { source: 'POS', label: 'POS', isAppOrder: false, isVehicleOrder: false, isPosOrder: true };
    }

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

  it('1. Existing POS sales are classified as POS and NOT as App or Vehicle orders', () => {
    const posSale = {
      id: 'pos-ord-1',
      orderNumber: '1001',
      orderType: 'POS',
      fulfillmentType: 'STORE_PICKUP',
      totalAmount: 450,
      customerName: 'Suresh Kumar',
      mobile: '9876543210'
    };

    const result = classifyOrder(posSale);
    assert.equal(result.source, 'POS');
    assert.equal(result.label, 'POS');
    assert.equal(result.isPosOrder, true);
    assert.equal(result.isAppOrder, false);
    assert.equal(result.isVehicleOrder, false);
  });

  it('2. App Orders filter returns eligible consumer-app orders (orderType ONLINE)', () => {
    const appOrder = {
      id: 'app-ord-1',
      orderNumber: '2001',
      orderType: 'ONLINE',
      fulfillmentType: 'HOME_DELIVERY',
      deliveryType: 'HOME_DELIVERY',
      totalAmount: 850,
      consumer: { id: 'c-1', name: 'Ramesh Patel', phone: '9123456789' }
    };

    const result = classifyOrder(appOrder);
    assert.equal(result.source, 'APP');
    assert.equal(result.label, 'App');
    assert.equal(result.isAppOrder, true);
    assert.equal(result.isVehicleOrder, false);
    assert.equal(result.isPosOrder, false);
  });

  it('3. Vehicle Orders filter returns only correctly classified vehicle-fulfillment orders', () => {
    const vehicleOrder = {
      id: 'veh-ord-1',
      orderNumber: '3001',
      orderType: 'ONLINE',
      fulfillmentType: 'VEHICLE_PICKUP',
      vehicleId: 'veh-uuid-123',
      vehicle: { vehicleNumber: 'AP29BD1234' },
      routeId: 'route-uuid-456',
      totalAmount: 1200,
      consumer: { id: 'c-2', name: 'Lakshmi Devi', phone: '9888877777' }
    };

    const result = classifyOrder(vehicleOrder);
    assert.equal(result.source, 'VEHICLE');
    assert.equal(result.label, 'Vehicle App');
    assert.equal(result.isAppOrder, true);
    assert.equal(result.isVehicleOrder, true);
    assert.equal(result.isPosOrder, false);
  });

  it('4. Home-delivery orders are not incorrectly classified as vehicle orders even if assigned a vehicle', () => {
    const homeDeliveryWithVehicle = {
      id: 'hd-ord-1',
      orderNumber: '4001',
      orderType: 'ONLINE',
      fulfillmentType: 'HOME_DELIVERY',
      deliveryType: 'HOME_DELIVERY',
      vehicleId: 'delivery-van-999', // Delivery vehicle assigned later
      totalAmount: 600
    };

    const result = classifyOrder(homeDeliveryWithVehicle);
    // Must remain APP, NOT VEHICLE
    assert.equal(result.source, 'APP');
    assert.equal(result.label, 'App');
    assert.equal(result.isVehicleOrder, false);
    assert.equal(result.isAppOrder, true);
  });

  it('5. All Orders does not duplicate records and correctly partitions each order', () => {
    const dataset = [
      { id: '1', orderType: 'POS', fulfillmentType: 'STORE_PICKUP' },
      { id: '2', orderType: 'ONLINE', fulfillmentType: 'HOME_DELIVERY' },
      { id: '3', orderType: 'ONLINE', fulfillmentType: 'VEHICLE_PICKUP', vehicleId: 'v-1' },
      { id: '4', orderType: 'POS', fulfillmentType: 'STORE_PICKUP' }
    ];

    const allFiltered = dataset.map(classifyOrder);
    assert.equal(allFiltered.length, 4);

    const posOnly = dataset.filter(o => classifyOrder(o).isPosOrder);
    assert.equal(posOnly.length, 2);

    const appOnly = dataset.filter(o => classifyOrder(o).isAppOrder);
    assert.equal(appOnly.length, 2); // Includes generic app and vehicle app

    const vehicleOnly = dataset.filter(o => classifyOrder(o).isVehicleOrder);
    assert.equal(vehicleOnly.length, 1);
  });

  it('6. Does not infer order source from invoice prefix or customer name', () => {
    // Edge case: POS invoice with VK prefix or customer name containing App
    const posWithAppInName = {
      id: '5',
      orderNumber: 'APP-9999',
      orderType: 'POS',
      customerName: 'App User Mobile',
      fulfillmentType: 'STORE_PICKUP'
    };
    const result = classifyOrder(posWithAppInName);
    assert.equal(result.source, 'POS');
    assert.equal(result.isPosOrder, true);
  });
});
