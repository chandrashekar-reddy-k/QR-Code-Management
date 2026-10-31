import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiRoot = path.resolve(__dirname, '..');
const auditDir = path.join(apiRoot, 'reports/partner-api-audit');

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3004';

// Test runner for safe audit
async function runSmokeAudit() {
  console.log(`Starting automated API test audit against: ${BASE_URL}`);

  const testCases = [
    // Health & System
    { name: 'Health Check (GET /health)', method: 'GET', path: '/health', expectedStatus: 200 },
    { name: 'API v1 Health (GET /api/v1/health)', method: 'GET', path: '/api/v1/health', expectedStatus: 200 },
    { name: 'API v1 Check (GET /api/v1/check)', method: 'GET', path: '/api/v1/check', expectedStatus: 200 },
    { name: 'Warehouses List (GET /api/v1/warehouses)', method: 'GET', path: '/api/v1/warehouses', expectedStatus: 200 },
    { name: 'Units List (GET /api/v1/unit/getall)', method: 'GET', path: '/api/v1/unit/getall', expectedStatus: 200 },
    { name: 'Categories List (GET /api/v1/category/getCategoryList)', method: 'GET', path: '/api/v1/category/getCategoryList', expectedStatus: 200 },
    { name: 'Subcategories List (GET /api/v1/subCategory/getSubCategoryList)', method: 'GET', path: '/api/v1/subCategory/getSubCategoryList', expectedStatus: 200 },

    // Public / Protected Validation
    { name: 'Public Invoice View (GET /api/v1/vsms/orders/:id)', method: 'GET', path: '/api/v1/vsms/orders/4e971bb0-4018-42a3-b20f-055fa1db8ce2', expectedStatus: [200, 404] },
    { name: 'Orders My-History Auth Guard (GET /api/v1/vsms/orders/my-history unauthenticated)', method: 'GET', path: '/api/v1/vsms/orders/my-history', expectedStatus: 401 },
    { name: 'Session Sales Auth Guard (GET /api/v1/vsms/orders/session-sales unauthenticated)', method: 'GET', path: '/api/v1/vsms/orders/session-sales', expectedStatus: 401 },
    { name: 'Partner Settings Auth Guard (GET /api/v1/partner/settings unauthenticated)', method: 'GET', path: '/api/v1/partner/settings', expectedStatus: 401 },
    { name: 'Inventory Alerts Auth Guard (GET /api/v1/inventorymanagement/alerts unauthenticated)', method: 'GET', path: '/api/v1/inventorymanagement/alerts', expectedStatus: 401 },
    { name: 'User Shifts Auth Guard (GET /api/v1/vsms/users/shifts unauthenticated)', method: 'GET', path: '/api/v1/vsms/users/shifts', expectedStatus: 401 },
    { name: 'Notifications Read-All Auth Guard (PUT /api/v1/vsms/notifications/read-all unauthenticated)', method: 'PUT', path: '/api/v1/vsms/notifications/read-all', expectedStatus: 401 },
    { name: 'Cash Status Auth Guard (GET /api/v1/agent/cash/status unauthenticated)', method: 'GET', path: '/api/v1/agent/cash/status', expectedStatus: 401 }
  ];

  const results = [];

  for (const tc of testCases) {
    const url = `${BASE_URL}${tc.path}`;
    const start = Date.now();
    try {
      const res = await fetch(url, {
        method: tc.method,
        headers: { 'Content-Type': 'application/json' }
      });
      const duration = Date.now() - start;
      const expected = Array.isArray(tc.expectedStatus) ? tc.expectedStatus : [tc.expectedStatus];
      const passed = expected.includes(res.status);

      results.push({
        name: tc.name,
        method: tc.method,
        path: tc.path,
        status: res.status,
        durationMs: duration,
        passed,
        result: passed ? 'PASS' : 'FAIL',
        note: `Expected ${tc.expectedStatus}, got ${res.status}`
      });
      console.log(`[${passed ? 'PASS' : 'FAIL'}] ${tc.name} -> ${res.status} (${duration}ms)`);
    } catch (err) {
      results.push({
        name: tc.name,
        method: tc.method,
        path: tc.path,
        status: 'NETWORK_ERROR',
        durationMs: Date.now() - start,
        passed: false,
        result: 'BLOCKED',
        note: err.message
      });
      console.log(`[BLOCKED] ${tc.name} -> ${err.message}`);
    }
  }

  fs.writeFileSync(
    path.join(auditDir, 'api-test-results.json'),
    JSON.stringify(results, null, 2)
  );
  console.log(`Saved results to ${path.join(auditDir, 'api-test-results.json')}`);
}

runSmokeAudit();
