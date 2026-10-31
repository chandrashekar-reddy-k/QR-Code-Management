# Delivery Configuration – Missing APIs – Example Requests

Base URL: `GET /api/v1/partner/delivery-settings` (prefix for all below).  
All endpoints require **auth** and **partner** role (warehouse scoped to current user).

---

## 1. Route Pincode Management

### POST /route-pincodes

Attach pincodes to a route map (bulk). Duplicates for the same route are skipped.

**Request:**

```json
{
  "routeMapId": "uuid-of-route-map",
  "pincodes": ["500001", "500002", "500003"]
}
```

**Response (201):**

```json
{
  "status": true,
  "response": "Route pincodes created successfully",
  "data": {
    "created": 3,
    "skipped": 0,
    "createdIds": ["uuid-1", "uuid-2", "uuid-3"]
  }
}
```

**Validation:** `routeMapId` required (UUID); `pincodes` required (array, 1–500 items); each pincode non-empty string, max 20 chars.

---

### GET /route-pincodes?routeId=

List route pincodes for the partner's warehouse. Optional filter by route.

**Query:**

- `routeId` (optional): UUID of route map. If omitted, returns pincodes for all routes of the warehouse.

**Response (200):**

```json
{
  "status": true,
  "response": "Route pincodes fetched successfully",
  "data": [
    {
      "id": "uuid",
      "routeMapId": "uuid",
      "pincode": "500001",
      "createdAt": "2025-03-15T10:00:00.000Z"
    }
  ]
}
```

---

### DELETE /route-pincodes/:id

Remove a single route pincode by id.

**Params:** `id` – UUID of the RouteMapPincode record.

**Response (200):**

```json
{
  "status": true,
  "response": "Route pincode deleted successfully",
  "data": null
}
```

**Errors:** 404 if id not found or not belonging to partner's warehouse.

---

## 2. Pickup Slot Management (Partner)

### POST /pickup-slots

Create one or more pickup slots. With `repeat: true`, creates multiple rows for expanded dates (e.g. DAILY, WEEKLY).

**Request:**

```json
{
  "date": "2025-06-01",
  "startTime": "09:00",
  "endTime": "12:00",
  "slot": "Morning",
  "capacity": 10,
  "repeat": true,
  "repeatType": "DAILY",
  "customDays": []
}
```

Single slot (no repeat):

```json
{
  "date": "2025-06-15",
  "startTime": "14:00",
  "endTime": "18:00",
  "capacity": 5
}
```

**Response (201):**

```json
{
  "status": true,
  "response": "Pickup slot(s) created successfully",
  "data": {
    "created": 1,
    "ids": ["uuid-of-pickup-slot"]
  }
}
```

**Validation:** `date` (YYYY-MM-DD), `startTime`, `endTime` (HH:mm); `startTime` < `endTime`; optional `slot`, `capacity` (1–1000), `repeat`, `repeatType` (ONCE | DAILY | WEEKLY | MON_FRI | SUN | CUSTOM), `customDays` (for CUSTOM). Overlap with existing slot on same date returns 400.

---

### GET /pickup-slots?fromDate=&toDate=

List pickup slots for the partner's warehouse.

**Query:**

- `fromDate` (optional): YYYY-MM-DD
- `toDate` (optional): YYYY-MM-DD

**Response (200):**

```json
{
  "status": true,
  "response": "Pickup slots fetched successfully",
  "data": [
    {
      "id": "uuid",
      "warehouseId": "uuid",
      "date": "2025-06-01",
      "startTime": "09:00",
      "endTime": "12:00",
      "slot": "Morning",
      "capacity": 10,
      "booked": 0,
      "repeat": true,
      "repeatType": "DAILY",
      "customDays": [],
      "isActive": true,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

---

### GET /pickup-slots/:id

Get a single pickup slot by id.

**Params:** `id` – UUID of PickupSlot.

**Response (200):** Single PickupSlot object. 404 if not found or not in warehouse.

---

### PUT /pickup-slots/:id

Update a pickup slot. Capacity cannot be set below current `booked`. Overlap with another slot on the same date returns 400.

**Request (all fields optional):**

```json
{
  "date": "2025-06-20",
  "startTime": "10:00",
  "endTime": "13:00",
  "slot": "Late morning",
  "capacity": 15,
  "repeat": false,
  "isActive": true
}
```

**Response (200):** Updated PickupSlot object.

---

### DELETE /pickup-slots/:id

Delete or deactivate a pickup slot. If `booked > 0`, slot is soft-deactivated (`isActive: false`); otherwise row is deleted.

**Params:** `id` – UUID of PickupSlot.

**Response (200):** `data: null`. 404 if not found.

---

## 3. Warehouse Blackout Management

### POST /warehouse-blackouts

Add a blackout date for the partner's warehouse. Duplicate date returns 400/409.

**Request:**

```json
{
  "date": "2025-12-25",
  "reason": "Christmas"
}
```

**Response (201):**

```json
{
  "status": true,
  "response": "Blackout date created successfully",
  "data": {
    "id": "uuid",
    "warehouseId": "uuid",
    "date": "2025-12-25",
    "reason": "Christmas",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Validation:** `date` required (YYYY-MM-DD); `reason` optional, max 255 chars.

---

### GET /warehouse-blackouts?fromDate=&toDate=

List blackout dates for the partner's warehouse.

**Query:**

- `fromDate` (optional): YYYY-MM-DD
- `toDate` (optional): YYYY-MM-DD

**Response (200):**

```json
{
  "status": true,
  "response": "Blackout dates fetched successfully",
  "data": [
    {
      "id": "uuid",
      "warehouseId": "uuid",
      "date": "2025-12-25",
      "reason": "Christmas",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

---

### DELETE /warehouse-blackouts/:id

Remove a blackout date.

**Params:** `id` – UUID of WarehouseDeliveryBlackout.

**Response (200):** `data: null`. 404 if not found or not for partner's warehouse.
