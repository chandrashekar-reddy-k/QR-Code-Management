-- CreateEnum if not exists
DO $$ BEGIN
    CREATE TYPE "SalesChannel" AS ENUM ('ONLINE_APP', 'POS_STORE', 'WHOLESALE', 'INSTANT_DELIVERY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE "SalesChannel" ADD VALUE IF NOT EXISTS 'ONLINE_APP';
    ALTER TYPE "SalesChannel" ADD VALUE IF NOT EXISTS 'POS_STORE';
    ALTER TYPE "SalesChannel" ADD VALUE IF NOT EXISTS 'WHOLESALE';
    ALTER TYPE "SalesChannel" ADD VALUE IF NOT EXISTS 'INSTANT_DELIVERY';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum if not exists
DO $$ BEGIN
    CREATE TYPE "TripShiftStatus" AS ENUM ('OPEN', 'RECONCILING', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ChannelInventory" (
    "id" TEXT NOT NULL,
    "channel" "SalesChannel" NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productVariantId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "channelPrice" DOUBLE PRECISION NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "discountType" "DiscountType",
    "discountValue" DOUBLE PRECISION,
    "promoCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "VehicleStockAssignment" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "agentId" TEXT,
    "shiftId" TEXT,
    "productId" TEXT NOT NULL,
    "productVariantId" TEXT,
    "openingQuantity" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "soldQuantity" INTEGER NOT NULL DEFAULT 0,
    "returnedQuantity" INTEGER NOT NULL DEFAULT 0,
    "status" "TripShiftStatus" NOT NULL DEFAULT 'OPEN',
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleStockAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ChannelInventory_productId_productVariantId_idx" ON "ChannelInventory"("productId", "productVariantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ChannelInventory_warehouseId_idx" ON "ChannelInventory"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ChannelInventory_channel_warehouseId_productId_productVaria_key" ON "ChannelInventory"("channel", "warehouseId", "productId", "productVariantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VehicleStockAssignment_vehicleId_idx" ON "VehicleStockAssignment"("vehicleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VehicleStockAssignment_agentId_idx" ON "VehicleStockAssignment"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "VehicleStockAssignment_vehicleId_productId_productVariantId_key" ON "VehicleStockAssignment"("vehicleId", "productId", "productVariantId");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ChannelInventory" ADD CONSTRAINT "ChannelInventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ChannelInventory" ADD CONSTRAINT "ChannelInventory_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "VehicleStockAssignment" ADD CONSTRAINT "VehicleStockAssignment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "VehicleStockAssignment" ADD CONSTRAINT "VehicleStockAssignment_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "VehicleStockAssignment" ADD CONSTRAINT "VehicleStockAssignment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
