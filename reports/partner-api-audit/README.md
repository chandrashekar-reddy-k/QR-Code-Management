# VillagKart Partner APIs & Web — Audit & Testing Suite README

## 1. Overview
This directory (`reports/partner-api-audit/`) contains the complete audit deliverables, automated route scanners, test results, and defect logs for:
- Backend: `villagkart-partner-apis` (`develop` branch)
- Frontend: `villagkart-partner-web` (`develop` branch)

---

## 2. Directory Artifacts

| File | Description |
| :--- | :--- |
| `partner-api-inventory.json` | Complete machine-readable catalog of all 926 discovered backend endpoints with metadata. |
| `partner-api-failure-analysis.md` | Detailed defect investigations, root cause analyses, reproduction steps, and fixes. |
| `partner-api-coverage.md` | Parity matrix mapping backend routes to frontend consumers and automated tests. |
| `partner-test-report.md` | Executive summary report covering audit numbers, results, and findings. |
| `partner-api-test-cases.md` | Reusable test catalog with pre-conditions, payloads, assertions, and status. |
| `partner-api-fix-log.md` | Historical changelog of code fixes applied to the repositories. |
| `partner-api-openapi-gaps.md` | Gap analysis comparing code runtime routes against Swagger / OpenAPI docs. |
| `partner-api-security-report.md` | Security, tenant-isolation, RBAC, and public invoice analysis. |
| `partner-api-performance-report.md`| Latency benchmarks, Prisma query patterns, and reliability review. |
| `route-collisions.json` | Detailed raw collision list across Express router definitions. |
| `frontend-api-calls.json` | Complete extraction of all 754 frontend HTTP call sites. |
| `api-test-results.json` | Raw test run outputs from automated smoke runner. |

---

## 3. How to Run the Automated Scanners & Tests

### Step 1: Start Backend Server
Ensure your local database is running and launch the Express dev server:
```powershell
# From villagkart-partner-apis directory
cmd /c "npm run dev"
```

### Step 2: Re-run Route Discovery & Collision Detection
To rescan routes and update `partner-api-inventory.json`:
```powershell
node scripts/scanAllPartnerRoutes.mjs
node scripts/scanFrontendApiCalls.mjs
node scripts/reconcileAndGenerateInventory.mjs
```

### Step 3: Run Automated Smoke & Contract Tests
To execute automated API checks against the live server:
```powershell
node scripts/runSmokeAudit.mjs
```
