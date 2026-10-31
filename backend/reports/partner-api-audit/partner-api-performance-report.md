# VillagKart Partner APIs — Performance & Reliability Audit

## 1. Audit Methodology & Environment
- **Environment:** Local Development (`http://localhost:3004`)
- **Database:** Local PostgreSQL 16 via Prisma ORM
- **Cache Layer:** In-Memory Fallback (`DISABLE_REDIS=true`)
- **Measurements:** Response latency captured on active Node.js HTTP dispatcher over loopback interface.

---

## 2. Latency & Response Benchmark Results

| Endpoint | Method | Sample Duration | Category | Observations |
| :--- | :--- | :--- | :--- | :--- |
| `/health` | GET | 56ms | Health | Baseline process response |
| `/api/v1/health` | GET | 3ms | Health | In-memory router hit |
| `/api/v1/check` | GET | 5ms | Health | Middleware overhead minimal |
| `/api/v1/warehouses` | GET | 78ms | Database Query | Prisma connection & query execution |
| `/api/v1/unit/getall` | GET | 31ms | Master Data | Cached/indexed relational lookup |
| `/api/v1/category/getCategoryList` | GET | 107ms | Catalog Query | Relational scan of categories |
| `/api/v1/subCategory/getSubCategoryList`| GET | 156ms | Catalog Query | Filtered join across category relations |
| `/api/v1/vsms/orders/:id` | GET | 140ms | Complex Order | Nested Prisma `include` (items, products, payments) |
| `/api/v1/vsms/orders/my-history` | GET | 4ms | Auth Guard | Fast 401 rejection prior to DB query |

---

## 3. Reliability & Architectural Observations

### A. Heavy Prisma `include` Queries
In `orderController.js` and `vsmsController.js`, queries for order details load extensive trees:
- `order_items`
- `product_variants`
- `customer`
- `vehicle`
- `payments`
While effective for single invoice rendering (140ms), applying similar unbounded `include` clauses on list endpoints (`GET /orders`) risks query degradation under high concurrency.
- **Recommendation:** Implement cursor-based pagination and project only summary columns in list endpoints.

### B. Redis In-Memory Fallback
With `DISABLE_REDIS=true`, cache helpers degrade gracefully to memory. In production, Redis clustering should be monitored for cache-stampede on product catalogs during peak shift start times.
