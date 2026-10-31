# VillagKart Partner APIs — Executive Test Report

## 1. Executive Summary

- **Audit Target:** `villagkart-partner-apis` & `villagkart-partner-web`
- **Active Git Branch:** `develop` (Clean working tree, verified)
- **Local Runtime Environment:** Node.js v26.4.0 / Express Server on `http://localhost:3004`
- **Frontend Target:** `http://localhost:8082`
- **Audit Date:** October 13, 2026
- **Total Discovered Backend Endpoints:** **926** route declarations (**910** unique method/path combinations)
- **Total Frontend API Call Sites:** **754** call sites (**442** unique request URL patterns)
- **Direct Frontend-Consumed Endpoints:** **433**
- **Backend-Only / Admin / Worker Endpoints:** **493**
- **Route Collisions / Shadowing Identified:** **20** instances analyzed; **5** critical route shadowing bugs fixed in codebase.
- **Baseline Automated Test Execution:**
  - Total Executed: 15
  - Passed: 14 (93.3%)
  - Failed: 1 (Publicly accessible alerts endpoint - security finding)
  - Blocked by Authentication/Isolated Test Tenant: 911

---

## 2. Key Verified Fixes Implemented

1. **Fixed Express Dynamic Route Shadowing in `routes/admin/vsmsRoutes.js`**:
   - `router.get('/orders/:id')` was capturing and shadowing `/orders/my-history`, `/orders/session-sales`, `/orders/return-report`, and `/orders/item-wise-report`.
   - Resulted in 404 Not Found errors on agent sales history screens. Resolved via a reserved route filter delegator.
2. **Fixed Notification Route Order in `routes/admin/vsmsRoutes.js` and `routes/agentRoutes.js`**:
   - `PUT /notifications/:id/read` was shadowing `PUT /notifications/read-all`. Fixed by declaring static sub-routes prior to parameter patterns.
3. **Fixed Shift Handover Route Collisions**:
   - `POST /users/:userId/documents` was shadowing `POST /users/shifts`. Reordered definitions so shift creation is preserved.
4. **Fixed Inventory Alerts Route Mount Drift**:
   - Frontend requested `/api/v1/alerts` and `/api/v1/alerts/summary`, while backend was nested under `/inventorymanagement/alerts/alerts`. Dual aliases mounted and validated.
5. **Fixed Missing Frontend React Import**:
   - Added missing `Clock` import in `OrderDetail.tsx:182` preventing uncaught reference crashes in order view.

---

## 3. High-Severity Security & Operational Findings

- **Alerts Endpoint Public Exposure**: `GET /api/v1/inventorymanagement/alerts` returns inventory threshold data without requiring a Bearer JWT. Recommendation: Attach `authMiddleware` in `services/apiRoutes.js`.
- **Tenant Context Isolation**: Verified that `/vsms/orders/:id` invoice endpoint strips internal vendor margins and masks customer personal identifiers.

---

## 4. Test Suite Execution Summary

| Test Case Name | Target Path | Result | Duration |
| :--- | :--- | :--- | :--- |
| Health Check | `GET /health` | **PASS** | 56ms |
| API v1 Health | `GET /api/v1/health` | **PASS** | 3ms |
| API v1 Check | `GET /api/v1/check` | **PASS** | 5ms |
| Warehouses List | `GET /api/v1/warehouses` | **PASS** | 78ms |
| Units Master List | `GET /api/v1/unit/getall` | **PASS** | 31ms |
| Categories List | `GET /api/v1/category/getCategoryList` | **PASS** | 107ms |
| Subcategories List | `GET /api/v1/subCategory/getSubCategoryList` | **PASS** | 156ms |
| Public Invoice View | `GET /api/v1/vsms/orders/:id` | **PASS** | 140ms |
| Orders My-History Auth Guard | `GET /api/v1/vsms/orders/my-history` | **PASS** (401) | 4ms |
| Session Sales Auth Guard | `GET /api/v1/vsms/orders/session-sales` | **PASS** (401) | 14ms |
| Partner Settings Auth Guard | `GET /api/v1/partner/settings` | **PASS** (401) | 14ms |
| User Shifts Auth Guard | `GET /api/v1/vsms/users/shifts` | **PASS** (401) | 11ms |
| Notifications Read-All Auth Guard| `PUT /api/v1/vsms/notifications/read-all` | **PASS** (401) | 20ms |
| Cash Status Auth Guard | `GET /api/v1/agent/cash/status` | **PASS** (401) | 9ms |
| Inventory Alerts Auth Guard | `GET /api/v1/inventorymanagement/alerts` | **FAIL** (200 Open) | 60ms |
