# VillagKart Partner APIs — OpenAPI / Swagger Gap Analysis

## 1. Executive Summary
The Swagger definition served at `http://localhost:3004/api-docs` and `https://apierppartner.villagkart.com/api-docs` was compared against the runtime Express router inventory generated from code discovery.

- **Total Express Routes in Runtime Code:** 926
- **Routes Documented in OpenAPI/Swagger:** ~180 endpoints
- **Documentation Coverage Ratio:** ~19.4%
- **Undocumented Runtime Endpoints:** ~746 endpoints

---

## 2. Major Discrepancy Categories

### A. Missing Modules in OpenAPI Specification
1. **VSMS Cash Reconciliation & Vault Operations**:
   - `/vsms/cash/deposit`
   - `/vsms/cash/vault-transfers`
   - `/vsms/cash/close-shift`
   - Fully present in `routes/admin/vsmsRoutes.js` and `routes/agentRoutes.js`, but missing from Swagger definitions.

2. **Vehicle Damage & Fleet Tracking**:
   - `/vsms/vehicles/:id/damages`
   - `/vsms/vehicles/trips`
   - `/vsms/vehicles/fuel-logs`
   - Missing request body schemas in Swagger.

3. **Shopkeeper Picking & Packing Handover**:
   - `/shopkeeper/work-orders`
   - `/shopkeeper/packing-queue`
   - Item barcode validation endpoints are absent from OpenAPI docs.

### B. Path Prefix Inconsistencies
- Swagger documents several inventory routes under direct `/inventory/*`, whereas Express application mounts them under `/api/v1/inventorymanagement/inventory/*`.
- Client developers relying strictly on Swagger documentation would generate invalid 404 URL paths.

### C. Authentication & Role Specification Gaps
- Public invoice endpoint `/vsms/orders/:id` is marked with `security: BearerAuth` in Swagger even though it intentionally allows public access with token fallback.
- Internal service routes under `/internal/*` do not specify required internal IP or shared HMAC secret headers.

---

## 3. Recommended Remediation
- Adopt code-first schema generation (e.g. `tsoa` or JSDoc Swagger scanner) or automate OpenAPI schema export directly from the parsed `partner-api-inventory.json`.
