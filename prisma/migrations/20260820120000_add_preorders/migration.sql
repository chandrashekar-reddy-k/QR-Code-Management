-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PreOrderStatus" AS ENUM ('RECEIVED', 'CONFIRMED', 'PACKED', 'LOADED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RESCHEDULED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PreOrderPaymentStatus" AS ENUM ('UNPAID', 'PARTIAL_ADVANCE', 'PAID');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PreOrderSource" AS ENUM ('VEHICLE_AGENT', 'PARTNER_PORTAL', 'PHONE_BOOKING', 'WALK_IN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable PreOrder
CREATE TABLE IF NOT EXISTS "PreOrder" (
    "id" TEXT NOT NULL,
    "preOrderNumber" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerMobile" TEXT NOT NULL,
    "villageName" TEXT,
    "deliveryAddress" TEXT,
    "landmark" TEXT,
    "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryDate" TIMESTAMP(3) NOT NULL,
    "deliverySlot" TEXT,
    "source" "PreOrderSource" NOT NULL DEFAULT 'VEHICLE_AGENT',
    "bookedByAgentId" TEXT,
    "bookedFromVehicleId" TEXT,
    "bookedRouteId" TEXT,
    "assignedVehicleId" TEXT,
    "assignedRouteId" TEXT,
    "assignedAgentId" TEXT,
    "status" "PreOrderStatus" NOT NULL DEFAULT 'RECEIVED',
    "cancellationReason" TEXT,
    "rescheduledDate" TIMESTAMP(3),
    "customNotes" TEXT,
    "receiptImageUrl" TEXT,
    "hasCustomItems" BOOLEAN NOT NULL DEFAULT false,
    "estimatedTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "advanceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "advancePaymentMode" TEXT,
    "balanceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" "PreOrderPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "finalPaymentMode" TEXT,
    "finalCollectedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveredAt" TIMESTAMP(3),
    "deliveredByAgentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable PreOrderItem
CREATE TABLE IF NOT EXISTS "PreOrderItem" (
    "id" TEXT NOT NULL,
    "preOrderId" TEXT NOT NULL,
    "productId" TEXT,
    "productVariantId" TEXT,
    "productName" TEXT NOT NULL,
    "productSku" TEXT,
    "unit" TEXT,
    "image" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isCustomItem" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreOrderItem_pkey" PRIMARY KEY ("id")
);

-- Unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "PreOrder_preOrderNumber_key" ON "PreOrder"("preOrderNumber");

-- Indexes for PreOrder
CREATE INDEX IF NOT EXISTS "PreOrder_tenantId_idx" ON "PreOrder"("tenantId");
CREATE INDEX IF NOT EXISTS "PreOrder_storeId_idx" ON "PreOrder"("storeId");
CREATE INDEX IF NOT EXISTS "PreOrder_customerId_idx" ON "PreOrder"("customerId");
CREATE INDEX IF NOT EXISTS "PreOrder_customerMobile_idx" ON "PreOrder"("customerMobile");
CREATE INDEX IF NOT EXISTS "PreOrder_deliveryDate_idx" ON "PreOrder"("deliveryDate");
CREATE INDEX IF NOT EXISTS "PreOrder_status_idx" ON "PreOrder"("status");
CREATE INDEX IF NOT EXISTS "PreOrder_bookedByAgentId_idx" ON "PreOrder"("bookedByAgentId");
CREATE INDEX IF NOT EXISTS "PreOrder_assignedVehicleId_idx" ON "PreOrder"("assignedVehicleId");
CREATE INDEX IF NOT EXISTS "PreOrder_assignedRouteId_idx" ON "PreOrder"("assignedRouteId");
CREATE INDEX IF NOT EXISTS "PreOrder_villageName_idx" ON "PreOrder"("villageName");

-- Indexes for PreOrderItem
CREATE INDEX IF NOT EXISTS "PreOrderItem_preOrderId_idx" ON "PreOrderItem"("preOrderId");
CREATE INDEX IF NOT EXISTS "PreOrderItem_productId_idx" ON "PreOrderItem"("productId");

-- Foreign Keys
DO $$ BEGIN
    ALTER TABLE "PreOrder" ADD CONSTRAINT "PreOrder_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "PreOrder" ADD CONSTRAINT "PreOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "PreOrder" ADD CONSTRAINT "PreOrder_bookedByAgentId_fkey" FOREIGN KEY ("bookedByAgentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "PreOrder" ADD CONSTRAINT "PreOrder_bookedFromVehicleId_fkey" FOREIGN KEY ("bookedFromVehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "PreOrder" ADD CONSTRAINT "PreOrder_bookedRouteId_fkey" FOREIGN KEY ("bookedRouteId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "PreOrder" ADD CONSTRAINT "PreOrder_assignedVehicleId_fkey" FOREIGN KEY ("assignedVehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "PreOrder" ADD CONSTRAINT "PreOrder_assignedRouteId_fkey" FOREIGN KEY ("assignedRouteId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "PreOrder" ADD CONSTRAINT "PreOrder_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "PreOrderItem" ADD CONSTRAINT "PreOrderItem_preOrderId_fkey" FOREIGN KEY ("preOrderId") REFERENCES "PreOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "PreOrderItem" ADD CONSTRAINT "PreOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "PreOrderItem" ADD CONSTRAINT "PreOrderItem_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
