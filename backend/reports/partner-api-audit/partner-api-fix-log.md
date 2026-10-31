# VillagKart Partner APIs — Fix Log & Change History

## Overview
This log documents all source code modifications applied to `villagkart-partner-apis` and `villagkart-partner-web` during the audit on branch `develop`.

---

### Entry FIX-001: Order Sub-route Shadowing Prevention
- **Finding ID:** DEF-001
- **File Changed:** `villagkart-partner-apis/routes/admin/vsmsRoutes.js`
- **Description:** Added `RESERVED_ORDER_ROUTES` filter to `router.get('/orders/:id')` ensuring that requests to static subpaths (`my-history`, `session-sales`, `return-report`, `item-wise-report`) fall through via `next()` to their respective handlers.
- **Verification Command:** `node scripts/runSmokeAudit.mjs`
- **Result:** Before fix returned 404 "Order not found". After fix correctly routes to `getMyOrderHistory` returning 401 unauthenticated guard.
- **Status:** VERIFIED

---

### Entry FIX-002: Notification Read-All Ordering
- **Finding ID:** DEF-002
- **Files Changed:**
  - `villagkart-partner-apis/routes/admin/vsmsRoutes.js`
  - `villagkart-partner-apis/routes/agentRoutes.js`
- **Description:** Moved `PUT /notifications/read-all` prior to `PUT /notifications/:id/read` to prevent Express from parsing the string `"read-all"` as an `:id` parameter.
- **Verification Command:** `node scripts/runSmokeAudit.mjs`
- **Status:** VERIFIED

---

### Entry FIX-003: User Shifts Route Precedence
- **Finding ID:** DEF-003
- **File Changed:** `villagkart-partner-apis/routes/admin/vsmsRoutes.js`
- **Description:** Reordered user shift handlers (`POST /users/shifts`, `GET /users/shifts`) before dynamic `/users/:userId/*` endpoints.
- **Verification Command:** `node scripts/runSmokeAudit.mjs`
- **Status:** VERIFIED

---

### Entry FIX-004: Asset Action Routes Precedence
- **Finding ID:** DEF-004
- **File Changed:** `villagkart-partner-apis/routes/admin/vsmsRoutes.js`
- **Description:** Reordered parameterized `GET /assets/:id` after specific asset management actions (`assign`, `return`, `tracking`, `maintenance`).
- **Status:** VERIFIED

---

### Entry FIX-005: Alerts Route Mount & Subpath Aliasing
- **Finding ID:** DEF-005
- **Files Changed:**
  - `villagkart-partner-apis/services/apiRoutes.js`
  - `villagkart-partner-apis/routes/product&invManagement/alertsRoutes.js`
- **Description:** Mounted `app.use('/api/v1/alerts', alertsRoutes)` in addition to `/inventorymanagement/alerts`, and provided root paths (`/` and `/alerts`) to accommodate frontend hook variants (`useGetInventoryAlertsSummary`).
- **Verification Command:** `node scripts/runSmokeAudit.mjs`
- **Status:** VERIFIED

---

### Entry FIX-006: Frontend Missing Icon Import
- **Finding ID:** DEF-006
- **File Changed:** `villagkart-partner-web/src/pages/partner_pages/orders/OrderDetail.tsx`
- **Description:** Added `Clock` import from `lucide-react` to prevent client runtime `ReferenceError` when opening order details.
- **Status:** VERIFIED
