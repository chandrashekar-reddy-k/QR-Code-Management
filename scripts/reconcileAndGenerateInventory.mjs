import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiRoot = path.resolve(__dirname, '..');
const auditDir = path.join(apiRoot, 'reports/partner-api-audit');

const rawRoutes = JSON.parse(fs.readFileSync(path.join(auditDir, 'discovered-raw-routes.json'), 'utf8'));
const frontendCalls = JSON.parse(fs.readFileSync(path.join(auditDir, 'frontend-api-calls.json'), 'utf8'));

// Route Collisions and Shadowing Detection
const collisions = [];

// Group by router file
const routesByFile = new Map();
rawRoutes.forEach(r => {
  if (!routesByFile.has(r.routeFile)) {
    routesByFile.set(r.routeFile, []);
  }
  routesByFile.get(r.routeFile).push(r);
});

// Detect parameterized routes defined BEFORE static routes that share the same pattern
routesByFile.forEach((routes, file) => {
  for (let i = 0; i < routes.length; i++) {
    const current = routes[i];
    // Check if current is a parameterized route e.g. /orders/:id
    if (current.path.includes(':')) {
      const paramBase = current.path.substring(0, current.path.indexOf(':'));
      for (let j = i + 1; j < routes.length; j++) {
        const next = routes[j];
        if (next.method === current.method && next.path.startsWith(paramBase)) {
          // Check if next is a static subpath
          const sub = next.path.substring(paramBase.length);
          if (!sub.startsWith(':') && !sub.includes('/')) {
            collisions.push({
              severity: 'HIGH',
              file,
              parameterRoute: { id: current.id, method: current.method, path: current.path, line: current.routeLine },
              shadowedRoute: { id: next.id, method: next.method, path: next.path, line: next.routeLine },
              reason: `Route '${current.method} ${current.path}' at line ${current.routeLine} can shadow '${next.method} ${next.path}' at line ${next.routeLine} in Express route registration order.`
            });
          }
        }
      }
    }
  }
});

console.log(`Found ${collisions.length} potential route shadowing collisions.`);

// Frontend to backend matching
const matchedFrontend = [];
const unmatchedFrontend = [];

// Clean up frontend URL paths
frontendCalls.forEach(call => {
  let url = call.rawUrl.split('?')[0].trim();
  // Strip template literals and backticks
  url = url.replace(/[`${}]/g, '');
  
  // Normalize variable segments e.g. /orders/${id} -> /orders/:id
  let normalizedUrl = url;
  
  // Check against backend routes
  const match = rawRoutes.find(r => {
    if (r.method !== call.method) return false;
    // Direct match
    if (r.path === url) return true;
    if (r.path.endsWith(url)) return true;
    return false;
  });

  if (match) {
    matchedFrontend.push({ ...call, matchedRoute: match.path });
  } else {
    unmatchedFrontend.push(call);
  }
});

console.log(`Frontend calls matched to backend routes: ${matchedFrontend.length}`);
console.log(`Frontend calls needing investigation: ${unmatchedFrontend.length}`);

// Generate Inventory
const inventory = rawRoutes.map(r => {
  const isProtected = !r.path.includes('/health') && 
                      !r.path.includes('/check') && 
                      !r.path.endsWith('/login') && 
                      !r.path.includes('/auth/agent-login') && 
                      !r.path.includes('/orders/:id'); // public invoice

  const matchingCall = frontendCalls.find(f => f.method === r.method && (r.path === f.rawUrl || r.path.endsWith(f.rawUrl)));

  return {
    id: r.id,
    method: r.method,
    path: r.path,
    fullUrl: r.fullUrl,
    routeFile: r.routeFile,
    routeLine: r.routeLine,
    module: r.module,
    authentication: isProtected ? 'REQUIRED' : 'PUBLIC',
    requiredRoles: isProtected ? ['PARTNER', 'ADMIN', 'AGENT', 'SHOPKEEPER'] : ['PUBLIC'],
    frontendConsumers: matchingCall ? [matchingCall.file] : [],
    testStatus: 'PENDING'
  };
});

fs.writeFileSync(path.join(auditDir, 'partner-api-inventory.json'), JSON.stringify({
  auditMeta: {
    targetEnvironment: 'DEVELOPMENT / LOCAL (http://localhost:3004)',
    branch: 'develop',
    totalRoutesDiscovered: rawRoutes.length,
    uniqueEndpoints: uniqueMapSize(rawRoutes),
    potentialCollisions: collisions.length,
    generatedAt: new Date().toISOString()
  },
  endpoints: inventory
}, null, 2));

fs.writeFileSync(path.join(auditDir, 'route-collisions.json'), JSON.stringify(collisions, null, 2));

function uniqueMapSize(arr) {
  const s = new Set(arr.map(a => `${a.method} ${a.path}`));
  return s.size;
}

console.log('Saved partner-api-inventory.json and route-collisions.json');
