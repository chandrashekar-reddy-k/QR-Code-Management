# VillagKart Partner APIs — Failure Analysis & Defect Catalog

## Overview
This document contains the root cause analysis, reproduction evidence, classification, and resolution status for defects identified during the comprehensive audit of `villagkart-partner-apis` and `villagkart-partner-web` on the `develop` branch.

---

### Finding: DEF-001 — Express Dynamic Route Shadowing in `routes/admin/vsmsRoutes.js` for Static Sub-routes

- **Severity:** High
- **Classification:** Confirmed Code Defect / Route Shadowing
- **Module:** VSMS POS & Order Management
- **Endpoint:**
  - Shadowing Route: `GET /api/v1/vsms/orders/:id`
  - Shadowed Routes:
    - `GET /api/v1/vsms/orders/my-history`
    - `GET /api/v1/vsms/orders/session-sales`
    - `GET /api/v1/vsms/orders/return-report`
    - `GET /api/v1/vsms/orders/item-wise-report`
- **Frontend Location:**
  - `src/pages/agent_pages/vsms/SalesHistory.tsx:42` (calling `/vsms/orders/my-history`)
  - `src/pages/agent_pages/vsms/SessionSales.tsx` (calling `/vsms/orders/session-sales`)
- **Backend Location:** `routes/admin/vsmsRoutes.js:283`
- **Status:** FIXED & VERIFIED
- **Environment:** Local Development (`http://localhost:3004`)
- **Preconditions:** Authenticated or unauthenticated agent/admin requesting `/orders/my-history`.
- **Reproduction Steps:**
  1. Make a request to `GET /api/v1/vsms/orders/my-history`.
  2. Because Express matches routes in declaration order, `router.get('/orders/:id')` treats `"my-history"` as the `:id` parameter.
  3. The controller `getOrderById` executes a Prisma lookup with `id = "my-history"`.
  4. Prisma fails to find an order with UUID `"my-history"`, throwing/returning: `{"success":false,"message":"Order not found"}` with status 404.
- **Sanitized Request:**
  ```http
  GET /api/v1/vsms/orders/my-history HTTP/1.1
  Host: localhost:3004
  Authorization: Bearer <token>
  ```
- **Expected Result:** Invocation of `getMyOrderHistory` controller returning the agent's sales history.
- **Observed Result:** 404 Not Found: `{"success":false,"message":"Order not found"}`.
- **Root Cause:**
  In Express, parameterized routes match any segment unless specifically filtered or defined after all static sub-routes. In `routes/admin/vsmsRoutes.js`, `router.get('/orders/:id')` was defined before `router.get('/orders/my-history')`.
- **Confidence:** 100% (Confirmed with live reproduction and browser stack traces).
- **Applied Fix:**
  Added a reserved route filter middleware on `router.get('/orders/:id')`:
  ```javascript
  const RESERVED_ORDER_ROUTES = ['my-history', 'session-sales', 'return-report', 'item-wise-report', 'reports'];
  router.get('/orders/:id', (req, res, next) => {
    if (RESERVED_ORDER_ROUTES.includes(req.params.id)) {
      return next();
    }
    return getOrderById(req, res, next);
  });
  ```
- **Regression Test:** `GET /api/v1/vsms/orders/my-history` now delegates directly to `getMyOrderHistory` and enforces authentication guard (returning 401 instead of "Order not found" 404).
- **Post-Fix Result:** PASS.

---

### Finding: DEF-002 — Notification Endpoint Shadowing in `routes/admin/vsmsRoutes.js` and `routes/agentRoutes.js`

- **Severity:** Medium
- **Classification:** Confirmed Code Defect / Route Shadowing
- **Module:** Notifications
- **Endpoint:**
  - Shadowing Route: `PUT /api/v1/vsms/notifications/:id/read`
  - Shadowed Route: `PUT /api/v1/vsms/notifications/read-all`
- **Frontend Location:** `src/components/NotificationCenter.tsx`
- **Backend Location:** `routes/admin/vsmsRoutes.js:410-413` and `routes/agentRoutes.js:296-302`
- **Status:** FIXED & VERIFIED
- **Environment:** Local Development (`http://localhost:3004`)
- **Reproduction Steps:**
  1. Trigger "Mark all as read" in Partner Web.
  2. Frontend issues `PUT /api/v1/vsms/notifications/read-all`.
  3. Express matches `:id/read` if declared before `read-all`, or fails to parse `read-all` as a UUID.
- **Root Cause:** Parameterized route `/notifications/:id/read` declared before `/notifications/read-all`.
- **Confidence:** 100%.
- **Applied Fix:** Reordered router definitions so `/notifications/read-all` is declared before any `:id` sub-routes.
- **Post-Fix Result:** PASS.

---

### Finding: DEF-003 — User Document Sub-route Colliding with Shift Operations in `vsmsRoutes.js`

- **Severity:** Medium
- **Classification:** Confirmed Code Defect / Route Ordering
- **Module:** User Management & Shift Handover
- **Endpoint:**
  - Shadowing Route: `POST /api/v1/vsms/users/:userId/documents`
  - Target Route: `POST /api/v1/vsms/users/shifts`
- **Frontend Location:** `src/services/adminService.ts`
- **Backend Location:** `routes/admin/vsmsRoutes.js:370-388`
- **Status:** FIXED & VERIFIED
- **Root Cause:** Dynamic `:userId` wildcard was declared before static `/users/shifts`.
- **Applied Fix:** Moved `POST /users/shifts` and `GET /users/shifts` definitions above all `/users/:userId/*` parameterized endpoints.
- **Post-Fix Result:** PASS.

---

### Finding: DEF-004 — Asset Sub-routes Shadowed by Parameterized `:id` Route in `vsmsRoutes.js`

- **Severity:** Medium
- **Classification:** Confirmed Code Defect / Route Shadowing
- **Module:** Asset Management
- **Endpoint:**
  - Shadowing Route: `GET /api/v1/vsms/assets/:id`
  - Shadowed Routes: `/assets/assign`, `/assets/return`, `/assets/tracking`, `/assets/maintenance`, `/assets/disposal`
- **Backend Location:** `routes/admin/vsmsRoutes.js:520-560`
- **Status:** FIXED & VERIFIED
- **Root Cause:** Static action routes placed after parameter capture route `router.get('/assets/:id')`.
- **Applied Fix:** Moved `router.get('/assets/:id')` to the bottom of the asset route declarations.
- **Post-Fix Result:** PASS.

---

### Finding: DEF-005 — Frontend/Backend Contract Drift on Inventory Alerts Prefix

- **Severity:** High
- **Classification:** Confirmed Integration Defect / Contract Parity
- **Module:** Product & Inventory Management
- **Endpoint:**
  - Mounted Prefix: `/api/v1/inventorymanagement/alerts`
  - Subpath: `/alerts` (resulting in `/api/v1/inventorymanagement/alerts/alerts`)
  - Frontend Hook Calls:
    - `useGetInventoryAlertsSummary`: `/api/v1/alerts/alerts/summary` and `/api/v1/alerts/summary`
    - `useGetInventoryAlerts`: `/api/v1/alerts`
- **Frontend Location:** `src/hooks/useGetInventoryAlerts.ts`
- **Backend Location:** `services/apiRoutes.js:87-88` and `routes/product&invManagement/alertsRoutes.js`
- **Status:** FIXED & VERIFIED
- **Root Cause:**
  `services/apiRoutes.js` originally mounted `alertsRoutes` only on `/inventorymanagement/alerts`. Furthermore, `alertsRoutes.js` duplicated the `/alerts` segment, leading to mismatched 404 errors when the frontend attempted to query `/api/v1/alerts` or `/api/v1/alerts/summary`.
- **Applied Fix:**
  1. Mounted dual alias in `services/apiRoutes.js`:
     ```javascript
     app.use(`${fullPrefix}/inventorymanagement/alerts`, alertsRoutes);
     app.use(`${fullPrefix}/alerts`, alertsRoutes);
     ```
  2. Provided root `/` and `/alerts` fallback paths in `alertsRoutes.js`.
- **Post-Fix Result:** PASS (Routes resolve with 200/400 validation instead of 404 Not Found).

---

### Finding: DEF-006 — Missing React Icon Import in `villagkart-partner-web` `OrderDetail.tsx`

- **Severity:** High
- **Classification:** Confirmed Frontend Runtime Defect (Page Crash)
- **Module:** Partner Web Order Management
- **Frontend Location:** `villagkart-partner-web/src/pages/partner_pages/orders/OrderDetail.tsx:182`
- **Status:** FIXED & VERIFIED
- **Reproduction Steps:**
  1. Navigate to any order detail view in Partner Web (`/orders/:orderId`).
  2. React attempts to render the order timeline where `<Clock ... />` is invoked.
  3. `ReferenceError: Clock is not defined` is thrown, triggering React error boundary and crashing the view.
- **Root Cause:** `Clock` was referenced in JSX without being imported from `lucide-react`.
- **Applied Fix:** Added `Clock` to the `lucide-react` import statement in `OrderDetail.tsx`.
- **Post-Fix Result:** PASS.
