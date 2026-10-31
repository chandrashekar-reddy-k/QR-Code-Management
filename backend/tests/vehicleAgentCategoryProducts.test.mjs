import test from 'node:test';
import assert from 'node:assert/strict';
import { getProducts, getVehicleCategories } from '../controllers/vsms/productController.js';
import { prisma } from '../config/prismaClient.js';

function createMockHttp({ params = {}, query = {}, body = {}, user = null } = {}) {
  let statusCode = 200;
  let responseData = null;
  let nextCalled = false;
  let nextError = null;
  let resolveDone;
  const donePromise = new Promise((resolve) => {
    resolveDone = resolve;
  });

  const req = {
    params,
    query,
    body,
    user,
    headers: {}
  };

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      resolveDone();
      return this;
    },
    getStatusCode: () => statusCode,
    getResponse: () => responseData
  };

  const next = (err) => {
    nextCalled = true;
    nextError = err;
    resolveDone();
  };

  return {
    req,
    res,
    next,
    waitForCompletion: () => donePromise,
    getStatusCode: () => statusCode,
    getResponse: () => responseData,
    getNextError: () => nextError,
    wasNextCalled: () => nextCalled
  };
}

test('PARTNER VSMS: Vehicle Agent Sales Category Grouping & In-Depth Details', async (t) => {
  // Find vehicle with stock
  const vehicle = await prisma.vehicle.findFirst({
    where: { status: true, stocks: { some: { quantity: { gt: 0 } } } },
    select: { id: true, vehicleNumber: true }
  });

  assert.ok(vehicle, 'Must have an active vehicle with stock');

  await t.test('1. getProducts with groupBy=category returns categories with in-depth product details', async () => {
    const mock = createMockHttp({
      query: { vehicleId: vehicle.id, groupBy: 'category' },
      user: { id: 'agent-1', role: 'SALES_AGENT', assignedVehicleId: vehicle.id }
    });

    await getProducts(mock.req, mock.res, mock.next);
    await mock.waitForCompletion();

    const data = mock.getResponse();
    assert.ok(Array.isArray(data), 'Response should be array of categories');
    assert.ok(data.length > 0, 'Should return at least 1 category for vehicle');

    for (const cat of data) {
      assert.ok(cat.id, 'Category must have id');
      assert.ok(cat.name, 'Category must have name');
      assert.ok(cat.productCount > 0, 'Category productCount must be > 0');
      assert.ok(Array.isArray(cat.products), 'Category must have products array');
      assert.ok(cat.products.length > 0, 'Category products array must not be empty');

      // Subcategories check: empty subcategories must not exist
      assert.ok(Array.isArray(cat.subCategories), 'Category must have subCategories array');
      for (const sub of cat.subCategories) {
        assert.ok(sub.productCount > 0, 'Subcategory productCount must be > 0');
        assert.ok(Array.isArray(sub.products), 'Subcategory must have products array');
        assert.ok(sub.products.length > 0, 'Subcategory products array must not be empty');
      }

      // In-depth product details check
      const sample = cat.products[0];
      assert.ok(sample.id, 'Product must have id');
      assert.ok(sample.name, 'Product must have name');
      assert.ok(sample.price !== undefined, 'Product must have price');
      assert.ok(sample.vehicleStock !== undefined, 'Product must have vehicleStock');
      assert.ok(sample.unit !== undefined, 'Product must have unit');
    }
  });

  await t.test('2. getVehicleCategories delegates to getProducts with groupBy=category', async () => {
    const mock = createMockHttp({
      query: { vehicleId: vehicle.id },
      user: { id: 'agent-1', role: 'SALES_AGENT', assignedVehicleId: vehicle.id }
    });

    await getVehicleCategories(mock.req, mock.res, mock.next);
    await mock.waitForCompletion();

    const data = mock.getResponse();
    assert.ok(Array.isArray(data));
    assert.ok(data.length > 0);
    assert.ok(data[0].products.length > 0);
  });
});
