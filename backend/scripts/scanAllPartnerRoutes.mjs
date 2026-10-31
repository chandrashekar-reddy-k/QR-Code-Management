import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiRoot = path.resolve(__dirname, '..');
const webRoot = path.resolve(__dirname, '../../villagkart-partner-web');

const routesFile = path.join(apiRoot, 'services/apiRoutes.js');
const routesContent = fs.readFileSync(routesFile, 'utf8');

// Map of route variables to file paths
const routeMap = {
  shopkeeperRouter: 'routes/shopkeeperRoutes.js',
  router: 'routes/authRoutes.js',
  partnerAuthRouter: 'routes/partnerAuthRoutes.js',
  storeRouter: 'routes/storeRoutes.js',
  supplierRouter: 'routes/supplierRoutes.js',
  settingsRouter: 'routes/settingsRoutes.js',
  partnerOrderRouter: 'routes/partnerOrderRoutes.js',
  partnerReturnRequestRouter: 'routes/partnerReturnRequestRoutes.js',
  partnerRefundRouter: 'routes/partnerRefundRoutes.js',
  partnerDeliverySettingsRouter: 'routes/partnerDeliverySettingsRoutes.js',
  productRoutes: 'routes/product&invManagement/productRoutes.js',
  varientRoutes: 'routes/product&invManagement/varientRoutes.js',
  mediaRoutes: 'routes/product&invManagement/mediaRoutes.js',
  pricingRoutes: 'routes/product&invManagement/pricingRoutes.js',
  inventoryRoutes: 'routes/product&invManagement/inventoryRoutes.js',
  grnRoutes: 'routes/product&invManagement/grnRoutes.js',
  cycleCountRoutes: 'routes/product&invManagement/cycleCountRoutes.js',
  alertsRoutes: 'routes/product&invManagement/alertsRoutes.js',
  stockAdjustRoutes: 'routes/product&invManagement/stockAdjustRoutes.js',
  masterCategoryRoutes: 'routes/masterCategoryRoutes.js',
  deliveryAgentRoutes: 'routes/deliveryAgentRoutes.js',
  internalSyncRoutes: 'routes/internalSyncRoutes.js',
  internalRealtimeRoutes: 'routes/internalRealtimeRoutes.js',
  fileUploadRoutes: 'routes/product&invManagement/fileUploadRoutes.js',
  bannerRoutes: 'routes/bannerRoutes.js',
  campaignRoutes: 'routes/campaignRoutes.js',
  promoCodeRoutes: 'routes/promocodesRoutes.js',
  vsmsRouter: 'routes/admin/vsmsRoutes.js',
  procurementRouter: 'routes/procurementRoutes.js',
  agentRouter: 'routes/agentRoutes.js',
  agentTransferRoutes: 'routes/agentTransferRoutes.js',
  masterDataPackingRoutes: 'routes/packing/masterDataRoutes.js',
  workOrderPackingRoutes: 'routes/packing/workOrderRoutes.js',
  approvalPackingRoutes: 'routes/packing/approvalRoutes.js',
  workflowPackingRoutes: 'routes/packing/workflowRoutes.js',
  barcodePackingRoutes: 'routes/packing/barcodeRoutes.js',
  issuePackingRoutes: 'routes/packing/issueRoutes.js',
  authPackingRoutes: 'routes/packing/authPackingRoutes.js'
};

// Mount points from apiRoutes.js
const mounts = [
  { prefix: '/api/v1', routerVar: 'shopkeeperRouter', module: 'Shopkeeper' },
  { prefix: '/api/v1/user', routerVar: 'router', module: 'Auth & User' },
  { prefix: '/api/v1/partner/auth', routerVar: 'partnerAuthRouter', module: 'Partner Auth' },
  { prefix: '/api/v1/partner/store', routerVar: 'storeRouter', module: 'Store Management' },
  { prefix: '/api/v1/partner/supplier', routerVar: 'supplierRouter', module: 'Supplier Management' },
  { prefix: '/api/v1/partner/settings', routerVar: 'settingsRouter', module: 'Partner Settings' },
  { prefix: '/api/v1/partner/orders', routerVar: 'partnerOrderRouter', module: 'Partner OMS' },
  { prefix: '/api/v1/partner/return-requests', routerVar: 'partnerReturnRequestRouter', module: 'Returns' },
  { prefix: '/api/v1/partner/refunds', routerVar: 'partnerRefundRouter', module: 'Refunds' },
  { prefix: '/api/v1/orders', routerVar: 'partnerOrderRouter', module: 'Partner OMS' },
  { prefix: '/api/v1/partner/delivery-settings', routerVar: 'partnerDeliverySettingsRouter', module: 'Delivery Settings' },
  { prefix: '/api/v1/productmanagement/product', routerVar: 'productRoutes', module: 'Product Management' },
  { prefix: '/api/v1/product', routerVar: 'productRoutes', module: 'Product Management' },
  { prefix: '/api/v1/productmanagement/variant', routerVar: 'varientRoutes', module: 'Product Variants' },
  { prefix: '/api/v1/productmanagement/media', routerVar: 'mediaRoutes', module: 'Product Media' },
  { prefix: '/api/v1/pricing', routerVar: 'pricingRoutes', module: 'Pricing' },
  { prefix: '/api/v1/inventorymanagement/inventory', routerVar: 'inventoryRoutes', module: 'Warehouse Inventory' },
  { prefix: '/api/v1/inventorymanagement/grn', routerVar: 'grnRoutes', module: 'GRN Inwarding' },
  { prefix: '/api/v1/inventorymanagement/cyclecount', routerVar: 'cycleCountRoutes', module: 'Cycle Count' },
  { prefix: '/api/v1/inventorymanagement/alerts', routerVar: 'alertsRoutes', module: 'Inventory Alerts' },
  { prefix: '/api/v1/inventorymanagement/adjust', routerVar: 'stockAdjustRoutes', module: 'Stock Adjustment' },
  { prefix: '/api/v1/partner/categories', routerVar: 'masterCategoryRoutes', module: 'Category Management' },
  { prefix: '/api/v1/partner/deliveryagents', routerVar: 'deliveryAgentRoutes', module: 'Delivery Agents' },
  { prefix: '/api/v1/internal', routerVar: 'internalSyncRoutes', module: 'Internal Sync' },
  { prefix: '/api/v1/internal/realtime', routerVar: 'internalRealtimeRoutes', module: 'Internal Realtime' },
  { prefix: '/api/v1/files', routerVar: 'fileUploadRoutes', module: 'File Uploads' },
  { prefix: '/api/v1/partner/promotions/banners', routerVar: 'bannerRoutes', module: 'Promotions' },
  { prefix: '/api/v1/partner/promotions/campaigns', routerVar: 'campaignRoutes', module: 'Promotions' },
  { prefix: '/api/v1/partner/promotions/promocodes', routerVar: 'promoCodeRoutes', module: 'Promotions' },
  { prefix: '/api/v1/vsms', routerVar: 'vsmsRouter', module: 'VSMS Core & POS' },
  { prefix: '/api/v1/procurement', routerVar: 'procurementRouter', module: 'Procurement' },
  { prefix: '/api/v1/agent', routerVar: 'agentRouter', module: 'Agent Portal' },
  { prefix: '/api/v1/agent-routes', routerVar: 'agentRouter', module: 'Agent Portal' },
  { prefix: '/api/v1/agent-transfers', routerVar: 'agentTransferRoutes', module: 'Agent Transfers' },
  { prefix: '/api/v1/admin/agent-transfers', routerVar: 'agentTransferRoutes', module: 'Agent Transfers' },
  { prefix: '/api/v1/master-data', routerVar: 'masterDataPackingRoutes', module: 'Packing ERP' },
  { prefix: '/api/v1/work-orders', routerVar: 'workOrderPackingRoutes', module: 'Packing ERP' },
  { prefix: '/api/v1/approvals', routerVar: 'approvalPackingRoutes', module: 'Packing ERP' },
  { prefix: '/api/v1/workflows', routerVar: 'workflowPackingRoutes', module: 'Packing ERP' },
  { prefix: '/api/v1/barcodes', routerVar: 'barcodePackingRoutes', module: 'Packing ERP' },
  { prefix: '/api/v1/issues', routerVar: 'issuePackingRoutes', module: 'Packing ERP' },
  { prefix: '/api/v1/auth', routerVar: 'authPackingRoutes', module: 'Packing ERP' }
];

// In-line routes in apiRoutes.js
const inlineEndpoints = [
  { method: 'GET', path: '/api/v1/oms/orders/:id/timeline', file: 'services/apiRoutes.js', line: 74, module: 'Partner OMS' },
  { method: 'GET', path: '/api/v1/oms/orders/:id/audit-history', file: 'services/apiRoutes.js', line: 75, module: 'Partner OMS' },
  { method: 'GET', path: '/api/v1/debug-broadcasts/:agentId', file: 'services/apiRoutes.js', line: 116, module: 'Delivery Logistics' },
  { method: 'GET', path: '/api/v1/trigger-broadcasts', file: 'services/apiRoutes.js', line: 129, module: 'Delivery Logistics' },
  { method: 'GET', path: '/api/v1/category/getCategoryList', file: 'services/apiRoutes.js', line: 146, module: 'Category Management' },
  { method: 'GET', path: '/api/v1/unit/getall', file: 'services/apiRoutes.js', line: 187, module: 'Category Management' },
  { method: 'GET', path: '/api/v1/subCategory/getSubCategoryList', file: 'services/apiRoutes.js', line: 199, module: 'Category Management' },
  { method: 'GET', path: '/api/v1/warehouses', file: 'services/apiRoutes.js', line: 247, module: 'Warehouse Management' },
  { method: 'GET', path: '/health', file: 'services/apiRoutes.js', line: 260, module: 'Health' },
  { method: 'GET', path: '/api/v1/health', file: 'services/apiRoutes.js', line: 262, module: 'Health' },
  { method: 'GET', path: '/health/socket', file: 'services/apiRoutes.js', line: 263, module: 'Health' },
  { method: 'GET', path: '/api/v1/health/socket', file: 'services/apiRoutes.js', line: 264, module: 'Health' },
  { method: 'GET', path: '/health/firebase', file: 'services/apiRoutes.js', line: 265, module: 'Health' },
  { method: 'GET', path: '/api/v1/health/firebase', file: 'services/apiRoutes.js', line: 266, module: 'Health' },
  { method: 'GET', path: '/api/v1/check', file: 'services/apiRoutes.js', line: 269, module: 'Health' }
];

function parseRouteFile(relPath) {
  const fullPath = path.join(apiRoot, relPath);
  if (!fs.existsSync(fullPath)) return [];
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  const endpoints = [];

  // Match router.get('/path', ...), router.post(...), router.route('/path').get(...).post(...)
  const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*(['"`])([^'"`]+)\2/g;
  
  lines.forEach((line, index) => {
    let match;
    const lineNum = index + 1;
    // Simple line regex
    const simpleMatch = line.match(/router\.(get|post|put|delete|patch)\s*\(\s*(['"`])([^'"`]+)\2/i);
    if (simpleMatch) {
      endpoints.push({
        method: simpleMatch[1].toUpperCase(),
        subPath: simpleMatch[3],
        line: lineNum,
        rawLine: line.trim()
      });
    }
  });

  return endpoints;
}

const allEndpoints = [];
let endpointId = 1;

// 1. Process mounts
mounts.forEach(mount => {
  const relPath = routeMap[mount.routerVar];
  if (!relPath) return;
  const parsed = parseRouteFile(relPath);
  parsed.forEach(p => {
    let cleanSub = p.subPath.startsWith('/') ? p.subPath : '/' + p.subPath;
    if (cleanSub === '/') cleanSub = '';
    const fullPath = (mount.prefix + cleanSub).replace(/\/+$/, '') || '/';
    allEndpoints.push({
      id: `EP-${String(endpointId++).padStart(3, '0')}`,
      method: p.method,
      path: fullPath,
      fullUrl: `https://apierppartner.villagkart.com${fullPath}`,
      routeFile: relPath,
      routeLine: p.line,
      module: mount.module,
      subPath: p.subPath,
      rawLine: p.rawLine
    });
  });
});

// 2. Process inlines
inlineEndpoints.forEach(ep => {
  allEndpoints.push({
    id: `EP-${String(endpointId++).padStart(3, '0')}`,
    method: ep.method,
    path: ep.path,
    fullUrl: `https://apierppartner.villagkart.com${ep.path}`,
    routeFile: ep.file,
    routeLine: ep.line,
    module: ep.module,
    subPath: ep.path,
    rawLine: ''
  });
});

console.log(`Discovered ${allEndpoints.length} total route entries.`);

// Find duplicates & unique method/path combinations
const uniqueMap = new Map();
allEndpoints.forEach(ep => {
  const key = `${ep.method} ${ep.path}`;
  if (!uniqueMap.has(key)) {
    uniqueMap.set(key, []);
  }
  uniqueMap.get(key).push(ep);
});

console.log(`Unique method+path combinations: ${uniqueMap.size}`);

// Save to JSON
const outputDir = path.join(apiRoot, 'reports/partner-api-audit');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(
  path.join(outputDir, 'discovered-raw-routes.json'),
  JSON.stringify(allEndpoints, null, 2)
);

console.log('Saved to reports/partner-api-audit/discovered-raw-routes.json');
