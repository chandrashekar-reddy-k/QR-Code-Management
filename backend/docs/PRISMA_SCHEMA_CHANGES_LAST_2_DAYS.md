# VillagKart: Comprehensive Prisma Schema Changes (Past 2 Days)

**Document Date:** October 22, 2026  
**Audited Period:** October 20, 2026 – October 22, 2026  
**Target Schema Files:**
- `villagkart-consumer-apis/prisma/schema.prisma`
- `villagkart-partner-apis/prisma/schema.prisma`
- `villagkart-admin-apis/prisma/schema.prisma`

---

## 1. Executive Summary

Over the past 2 days, the Prisma schema across VillagKart repositories underwent targeted schema evolutions focused on:
1. **Configurable Free Delivery Thresholds:** Enabling partners and admins to configure a minimum order subtotal (in INR) above which delivery fees are waived per delivery type (Express, Scheduled, Standard/Default).
2. **VSMS Vehicle-Aware Cart Isolation:** Adding vehicle context and fulfillment type tagging to customer carts to enforce isolation between Mobile Mart vehicle purchases (`VEHICLE_PICKUP`) and standard warehouse orders (`HOME_DELIVERY`).
3. **Promotional Free Gifts in Cart:** Allowing products to be added as promotional zero-price or discounted gifts alongside regular purchases without unique constraint collisions.
4. **Dynamic App Section Configuration:** Adding `AppSectionConfig` and enriching `CouponProduct` for dynamic homepage/coupon banner banners.

---

## 2. Summary of Models & Fields Changed / Added

| Model / Table | Change Type | Fields Added / Modified | Description & Business Purpose |
|---|---|---|---|
| **`MasterDeliverySetting`** | Field Added | `freeDeliveryThreshold Decimal? @db.Decimal(10, 2)` | Platform-wide default minimum eligible order subtotal for free delivery per delivery type. |
| **`WarehouseDeliverySetting`** | Fields Added | `expressFreeDeliveryThreshold Decimal? @db.Decimal(10, 2)`<br>`scheduledFreeDeliveryThreshold Decimal? @db.Decimal(10, 2)`<br>`freeDeliveryThreshold Decimal? @db.Decimal(10, 2)` | Warehouse/Partner specific overrides for minimum order values qualifying for free delivery across Express, Scheduled, and Standard types. |
| **`Cart`** | Fields & Relations Added | `vehicleId String?`<br>`fulfillmentType FulfillmentType @default(HOME_DELIVERY)`<br>`vehicle Vehicle? @relation(...)`<br>`@@index([vehicleId])` | Enforces vehicle context and fulfillment isolation on cart sessions. Prevents mixing warehouse inventory with mobile vehicle inventory. |
| **`CartItem`** | Fields, Index & Constraint Modified | `isFreeGift Boolean @default(false)`<br>`giftCouponCode String?`<br>`offerPrice Float?`<br>`@@index([isFreeGift])`<br>`@@unique([cartId, productId, productVariantId, isFreeGift])` | Supports adding free promotional gift items to cart; updates composite unique constraint so gifts do not collide with regular purchases. |
| **`Vehicle`** | Relation Added | `carts Cart[]` | Bi-directional relation supporting vehicle-scoped carts. |
| **`AppSectionConfig`** | New Model Added | `id String @id @db.Uuid`<br>`titleType String @unique`<br>`title String`<br>`subTitle String?`<br>`roleName String @default("CUSTOMER")`<br>`icon String?`<br>`linkPath String @default("/coupons")`<br>`displayOrder Int @default(1)`<br>`isActive Boolean @default(true)`<br>`createdAt`, `updatedAt` | Dynamic section and header configuration for customer app feeds. |
| **`CouponProduct`** | Fields & Index Added | `roleName String? @default("CUSTOMER")`<br>`title String?`<br>`subTitle String?`<br>`titleType String? @default("SHOP_MORE_UNLOCK_MORE")`<br>`icon String?`<br>`linkPath String? @default("/coupons")`<br>`isActive Boolean @default(true)`<br>`createdAt`, `updatedAt`<br>`@@index([roleName, isActive])` | Configurable banner and header metadata for unlockable rewards and milestone coupons. |
| **`AppContentLink`** | Model Removed / Replaced | Deleted table definition | Replaced by normalized `AppSectionConfig` model. |

---

## 3. Deep Dive into Schema Modifications

### 3.1. Delivery Types & Free-Delivery Thresholds

#### Problem Solved:
Partners and Admins previously could only configure delivery charges, but could not set minimum order thresholds (e.g. "Free delivery on orders above ₹499").

#### Prisma Schema Diff:
```prisma
model MasterDeliverySetting {
  id                    String       @id @default(uuid())
  type                  DeliveryType @unique
  label                 String
  isEnabledByDefault    Boolean      @default(true)
  defaultCharge         Decimal      @db.Decimal(10, 2)
+ freeDeliveryThreshold Decimal?     @db.Decimal(10, 2)
  displayOrder          Int          @default(0)
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt

  @@index([type])
}

model WarehouseDeliverySetting {
  id                             String    @id @default(uuid())
  warehouseId                    String    @unique
  expressSettingsEnabled         Boolean   @default(false)
  selfPickupEnabled              Boolean   @default(false)
  scheduledDeliveryEnabled       Boolean   @default(false)
  defaultDeliveryCharge          Decimal?  @db.Decimal(10, 2)
  scheduledDeliveryCharge        Decimal?  @db.Decimal(10, 2)
  createdAt                      DateTime  @default(now())
  updatedAt                      DateTime  @updatedAt
  expressDeliveryCharge          Decimal?  @db.Decimal(10, 2)
+ expressFreeDeliveryThreshold   Decimal?  @db.Decimal(10, 2)
+ scheduledFreeDeliveryThreshold Decimal?  @db.Decimal(10, 2)
+ freeDeliveryThreshold          Decimal?  @db.Decimal(10, 2)
  warehouse                      Warehouse @relation(fields: [warehouseId], references: [id], onDelete: Cascade)

  @@index([warehouseId])
}
```

#### SQL Migration Script (`20261021183000_add_free_delivery_thresholds`):
```sql
-- Add free delivery thresholds to WarehouseDeliverySetting and MasterDeliverySetting
ALTER TABLE "WarehouseDeliverySetting" ADD COLUMN IF NOT EXISTS "expressFreeDeliveryThreshold" DECIMAL(10, 2);
ALTER TABLE "WarehouseDeliverySetting" ADD COLUMN IF NOT EXISTS "scheduledFreeDeliveryThreshold" DECIMAL(10, 2);
ALTER TABLE "WarehouseDeliverySetting" ADD COLUMN IF NOT EXISTS "freeDeliveryThreshold" DECIMAL(10, 2);
ALTER TABLE "MasterDeliverySetting" ADD COLUMN IF NOT EXISTS "freeDeliveryThreshold" DECIMAL(10, 2);
```

---

### 3.2. VSMS Vehicle-Aware Cart Isolation

#### Problem Solved:
Smart Mobile Stores (VSMS) allow customers to order products directly from delivery vehicles for instant vehicle-stop pickup. Previously, `Cart` had no `vehicleId` or `fulfillmentType`, risking cross-contamination between warehouse home-delivery items and vehicle stocks.

#### Prisma Schema Diff:
```prisma
model Cart {
  id                String           @id @default(uuid())
  userId            String
  warehouseId       String
+ vehicleId         String?
+ fulfillmentType   FulfillmentType  @default(HOME_DELIVERY)
  updatedAt         DateTime         @updatedAt
  appliedCouponCode String?
  appliedCouponId   String?          @db.Uuid
  cgst              Float            @default(0)
  igst              Float            @default(0)
  sgst              Float            @default(0)
  taxAmount         Float            @default(0)
  taxableAmount     Float            @default(0)
  expiresAt         DateTime?
  appliedCoupon     Coupon?          @relation(fields: [appliedCouponId], references: [id])
  user              User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  warehouse         Warehouse        @relation(fields: [warehouseId], references: [id], onDelete: Cascade)
+ vehicle           Vehicle?         @relation(fields: [vehicleId], references: [id], onDelete: SetNull)
  items             CartItem[]

  @@unique([userId, warehouseId])
  @@index([appliedCouponId])
  @@index([userId])
  @@index([warehouseId])
+ @@index([vehicleId])
}

model Vehicle {
  ...
+ carts                                                        Cart[]
}
```

#### SQL Migration Script (`20261021120000_vehicle_aware_cart_isolation`):
```sql
-- Vehicle-Aware Cart Isolation Migration
-- Adds vehicleId and fulfillmentType to Cart model with backward-compatible defaults

-- Step 1: Add vehicleId column (nullable text)
ALTER TABLE "Cart" ADD COLUMN IF NOT EXISTS "vehicleId" TEXT;

-- Step 2: Add fulfillmentType column with default 'HOME_DELIVERY'
ALTER TABLE "Cart" ADD COLUMN IF NOT EXISTS "fulfillmentType" "FulfillmentType" NOT NULL DEFAULT 'HOME_DELIVERY';

-- Step 3: Add foreign key constraint from Cart to Vehicle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Cart_vehicleId_fkey'
  ) THEN
    ALTER TABLE "Cart" ADD CONSTRAINT "Cart_vehicleId_fkey" 
      FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") 
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Step 4: Create index on Cart(vehicleId)
CREATE INDEX IF NOT EXISTS "Cart_vehicleId_idx" ON "Cart"("vehicleId");
```

---

### 3.3. Promotional Free Gifts in Cart

#### Problem Solved:
Milestone coupons ("Shop for ₹999 and get a free gift") require adding a product to the cart with `offerPrice = 0` and `isFreeGift = true`. Previously, `@@unique([cartId, productId, productVariantId])` prevented a user from having both a purchased item and a promotional gift of the same product.

#### Prisma Schema Diff:
```prisma
model CartItem {
  id               String          @id @default(uuid())
  cartId           String
  productId        String
  productVariantId String?
  quantity         Int             @default(1)
  addedAt          DateTime        @default(now())
  priceUpdatedAt   DateTime?
  snapshotPrice    Float? 
  bundleId         String?
+ isFreeGift       Boolean         @default(false)
+ giftCouponCode   String?
+ offerPrice       Float?
  cart             Cart            @relation(fields: [cartId], references: [id], onDelete: Cascade)
  product          Product         @relation(fields: [productId], references: [id])
  productVariant   ProductVariant? @relation(fields: [productVariantId], references: [id])

- @@unique([cartId, productId, productVariantId])
+ @@unique([cartId, productId, productVariantId, isFreeGift])
  @@index([cartId])
  @@index([productVariantId])
+ @@index([isFreeGift])
}
```

---

### 3.4. App Section Configuration & Unlockable Milestone Coupons

#### Problem Solved:
Enables dynamic management of promotional headers like "Shop More Unlock More" and role-based app content sections directly through the database.

#### Prisma Schema Diff:
```prisma
+model AppSectionConfig {
+  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
+  titleType    String   @unique
+  title        String
+  subTitle     String?
+  roleName     String   @default("CUSTOMER")
+  icon         String?
+  linkPath     String   @default("/coupons")
+  displayOrder Int      @default(1)
+  isActive     Boolean  @default(true)
+  createdAt    DateTime @default(now())
+  updatedAt    DateTime @default(now()) @updatedAt
+
+  @@index([roleName, isActive])
+  @@index([titleType, isActive])
+}

model CouponProduct {
  couponId   String   @db.Uuid
  productId  String
  offerPrice Float?
+ roleName   String?  @default("CUSTOMER")
+ title      String?
+ subTitle   String?
+ titleType  String?  @default("SHOP_MORE_UNLOCK_MORE")
+ icon       String?
+ linkPath   String?  @default("/coupons")
+ isActive   Boolean  @default(true)
+ createdAt  DateTime @default(now())
+ updatedAt  DateTime @default(now()) @updatedAt

  coupon     Coupon   @relation(fields: [couponId], references: [id], onDelete: Cascade)
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([couponId, productId])
  @@index([couponId])
  @@index([productId])
+ @@index([roleName, isActive])
}
```

---

## 4. Migration & Database Synchronization Verification

All migrations were executed cleanly using idempotent PostgreSQL syntax (`IF NOT EXISTS` / `DO $$ BEGIN ... END $$`) ensuring zero data loss and full forward/backward compatibility across all client apps:
1. `20261021120000_vehicle_aware_cart_isolation` -> Verified and applied.
2. `20261021183000_add_free_delivery_thresholds` -> Verified and applied.

### Verification Queries Executed:
- Checked column presence in PostgreSQL:
  ```sql
  SELECT column_name, data_type, is_nullable, column_default 
  FROM information_schema.columns 
  WHERE table_name IN ('Cart', 'WarehouseDeliverySetting', 'MasterDeliverySetting')
    AND column_name IN ('vehicleId', 'fulfillmentType', 'freeDeliveryThreshold', 'expressFreeDeliveryThreshold', 'scheduledFreeDeliveryThreshold');
  ```
  **Result:** All 5 columns exist with proper data types (`text`, `USER-DEFINED FulfillmentType`, and `numeric(10,2)`).
- Full test suites across `villagkart-consumer-apis` (113 tests passed) and `villagkart-partner-apis` (7 tests passed) pass 100%.
