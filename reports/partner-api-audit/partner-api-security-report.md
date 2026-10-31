# VillagKart Partner APIs — Security & Tenant Isolation Report

## 1. Executive Summary
Security validation was conducted across authentication middleware, role-based access control (RBAC), tenant data isolation, public invoice endpoints, and sensitive information exposure.

---

## 2. Findings & Audit Results

### A. Authentication & Route Guards
- **Mechanisms:** JWT verification with RSA public key (`IDENTITY_SERVICE_RSA_PUBLIC_KEY`) and fallback internal secrets.
- **Guard Validation:**
  - `GET /api/v1/vsms/orders/my-history` -> Properly rejected with `401 Unauthorized`.
  - `GET /api/v1/vsms/orders/session-sales` -> Properly rejected with `401 Unauthorized`.
  - `GET /api/v1/partner/settings` -> Properly rejected with `401 Unauthorized`.
  - `PUT /api/v1/vsms/notifications/read-all` -> Properly rejected with `401 Unauthorized`.
  - `GET /api/v1/agent/cash/status` -> Properly rejected with `401 Unauthorized`.

### B. Identified Vulnerabilities & Risks
1. **Unprotected Inventory Alerts Endpoint (SEC-001)**:
   - **Severity:** Medium
   - **Path:** `GET /api/v1/inventorymanagement/alerts` and `GET /api/v1/alerts`
   - **Observation:** Endpoint returned `200 OK` without requiring a valid Bearer token.
   - **Impact:** An unauthenticated visitor can query warehouse stock replenishment thresholds and out-of-stock items.
   - **Remediation:** Enforce `authMiddleware` in `services/apiRoutes.js` at the router mount level.

2. **Tenant ID Parameter Trust**:
   - In several partner order endpoints, `partnerId` is received from route parameters or request body instead of strictly deriving it from `req.user.partnerId`.
   - **Recommendation:** Implement strict tenant context middleware:
     ```javascript
     req.partnerId = req.user.partnerId;
     ```
     Reject client requests where the query/body `partnerId` contradicts the token claims.

### C. Public Invoice Security (`GET /api/v1/vsms/orders/:id`)
- **Inspection:** Evaluated whether an unauthenticated public user accessing an invoice link can observe confidential tenant data.
- **Findings:**
  - Tenant purchase prices and margin percentages are excluded from the public serializer.
  - Customer contact numbers are partially masked.
  - Invoice access is keyed by a 128-bit random UUID, mitigating sequential ID enumeration (IDOR).
- **Status:** PASS (Acceptable for customer PDF delivery).

### D. Sensitive Information in Logs & Repositories
- Verified that all `.env` secrets, database credentials, and RSA private keys are excluded from git and omitted from test reports.
