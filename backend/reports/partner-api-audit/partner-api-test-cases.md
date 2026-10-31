# VillagKart Partner APIs — Reusable Test Catalog

## 1. Test Suite Structure
The test catalog is divided into layers:
- **Layer 1: Health & Infrastructure Checks**
- **Layer 2: Unauthenticated Public Endpoints**
- **Layer 3: Authentication & Authorization Guards**
- **Layer 4: Parameterized vs Static Route Delegation**
- **Layer 5: Financial & State Mutations (Sandbox)**

---

## 2. Test Cases

### TC-001: Backend Server Liveness Check
- **Module:** Core Infrastructure
- **Endpoint:** `GET /health`
- **Role/Tenant:** Public / No auth
- **Preconditions:** Server started on port 3004
- **Expected Status:** `200 OK`
- **Expected Response:** `{"status":"ok"}` or equivalent health JSON
- **Execution Status:** PASS (56ms)

### TC-002: API v1 Ping Check
- **Module:** Core Infrastructure
- **Endpoint:** `GET /api/v1/health`
- **Role/Tenant:** Public / No auth
- **Expected Status:** `200 OK`
- **Execution Status:** PASS (3ms)

### TC-003: Public Invoice Retrieval
- **Module:** VSMS POS
- **Endpoint:** `GET /api/v1/vsms/orders/:id`
- **Fixture:** Order UUID `4e971bb0-4018-42a3-b20f-055fa1db8ce2`
- **Expected Status:** `200 OK`
- **Assertions:**
  - `response.data.id` matches requested UUID
  - Items list present with quantities and unit prices
  - Internal tenant margins and sensitive customer data redacted
- **Execution Status:** PASS (140ms)

### TC-004: Agent Order History Route Delegation (Anti-Shadowing)
- **Module:** VSMS POS
- **Endpoint:** `GET /api/v1/vsms/orders/my-history`
- **Role/Tenant:** Requires Agent Token
- **Preconditions:** Tested unauthenticated to verify routing logic
- **Expected Status:** `401 Unauthorized` (Must NOT return 404 "Order not found")
- **Assertions:** Route is routed to `getMyOrderHistory` auth guard instead of `getOrderById`
- **Execution Status:** PASS (4ms)

### TC-005: Session Sales Route Delegation (Anti-Shadowing)
- **Module:** VSMS POS
- **Endpoint:** `GET /api/v1/vsms/orders/session-sales`
- **Role/Tenant:** Requires Agent Token
- **Expected Status:** `401 Unauthorized`
- **Execution Status:** PASS (14ms)

### TC-006: User Shifts Creation Route Delegation
- **Module:** User & Shift Management
- **Endpoint:** `GET /api/v1/vsms/users/shifts`
- **Expected Status:** `401 Unauthorized`
- **Execution Status:** PASS (11ms)

### TC-007: Notifications Read-All Route Delegation
- **Module:** Notifications
- **Endpoint:** `PUT /api/v1/vsms/notifications/read-all`
- **Expected Status:** `401 Unauthorized`
- **Execution Status:** PASS (20ms)

### TC-008: Master Categories Query
- **Module:** Master Data
- **Endpoint:** `GET /api/v1/category/getCategoryList`
- **Expected Status:** `200 OK`
- **Assertions:** Response contains array of master category objects
- **Execution Status:** PASS (107ms)

### TC-009: Master Units Query
- **Module:** Master Data
- **Endpoint:** `GET /api/v1/unit/getall`
- **Expected Status:** `200 OK`
- **Assertions:** Response contains array of unit specifications (e.g., kg, gm, pcs)
- **Execution Status:** PASS (31ms)

### TC-010: Cash Shift Status Guard
- **Module:** Cash Management
- **Endpoint:** `GET /api/v1/agent/cash/status`
- **Expected Status:** `401 Unauthorized`
- **Execution Status:** PASS (9ms)
