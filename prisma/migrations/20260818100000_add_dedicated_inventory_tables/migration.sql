-- CreateTable
CREATE TABLE IF NOT EXISTS "StoreroomStock" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "rawStock" INTEGER NOT NULL DEFAULT 0,
    "inwardBatchNo" TEXT,
    "qualityStatus" TEXT NOT NULL DEFAULT 'PENDING_GRADING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreroomStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProductionStock" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "inProductionQty" INTEGER NOT NULL DEFAULT 0,
    "packedQty" INTEGER NOT NULL DEFAULT 0,
    "batchNumber" TEXT,
    "processingStage" TEXT NOT NULL DEFAULT 'GRADING_PACKING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LiveStockChannel" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "liveAvailable" INTEGER NOT NULL DEFAULT 0,
    "isOnline" BOOLEAN NOT NULL DEFAULT true,
    "isPos" BOOLEAN NOT NULL DEFAULT true,
    "isVehicle" BOOLEAN NOT NULL DEFAULT true,
    "channelNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveStockChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "OnlineAppStock" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "appPrice" DOUBLE PRECISION,
    "onlineStock" INTEGER NOT NULL DEFAULT 0,
    "minOrderQty" INTEGER NOT NULL DEFAULT 1,
    "maxOrderQty" INTEGER NOT NULL DEFAULT 50,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "badge" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnlineAppStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PosStoreStock" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "posPrice" DOUBLE PRECISION,
    "posStock" INTEGER NOT NULL DEFAULT 0,
    "barcode" TEXT,
    "shelfLocation" TEXT,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "isPosEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosStoreStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "InventoryStageTransfer" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "fromStage" TEXT NOT NULL,
    "toStage" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "performedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryStageTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX IF NOT EXISTS "StoreroomStock_productId_key" ON "StoreroomStock"("productId");
CREATE INDEX IF NOT EXISTS "StoreroomStock_warehouseId_idx" ON "StoreroomStock"("warehouseId");
CREATE INDEX IF NOT EXISTS "StoreroomStock_qualityStatus_idx" ON "StoreroomStock"("qualityStatus");

CREATE UNIQUE INDEX IF NOT EXISTS "ProductionStock_productId_key" ON "ProductionStock"("productId");
CREATE INDEX IF NOT EXISTS "ProductionStock_warehouseId_idx" ON "ProductionStock"("warehouseId");
CREATE INDEX IF NOT EXISTS "ProductionStock_processingStage_idx" ON "ProductionStock"("processingStage");

CREATE UNIQUE INDEX IF NOT EXISTS "LiveStockChannel_productId_key" ON "LiveStockChannel"("productId");
CREATE INDEX IF NOT EXISTS "LiveStockChannel_warehouseId_idx" ON "LiveStockChannel"("warehouseId");
CREATE INDEX IF NOT EXISTS "LiveStockChannel_isOnline_isPos_isVehicle_idx" ON "LiveStockChannel"("isOnline", "isPos", "isVehicle");

CREATE UNIQUE INDEX IF NOT EXISTS "OnlineAppStock_productId_key" ON "OnlineAppStock"("productId");
CREATE INDEX IF NOT EXISTS "OnlineAppStock_warehouseId_idx" ON "OnlineAppStock"("warehouseId");
CREATE INDEX IF NOT EXISTS "OnlineAppStock_isPublished_idx" ON "OnlineAppStock"("isPublished");

CREATE UNIQUE INDEX IF NOT EXISTS "PosStoreStock_productId_key" ON "PosStoreStock"("productId");
CREATE INDEX IF NOT EXISTS "PosStoreStock_warehouseId_idx" ON "PosStoreStock"("warehouseId");
CREATE INDEX IF NOT EXISTS "PosStoreStock_barcode_idx" ON "PosStoreStock"("barcode");
CREATE INDEX IF NOT EXISTS "PosStoreStock_isPosEnabled_idx" ON "PosStoreStock"("isPosEnabled");

CREATE INDEX IF NOT EXISTS "InventoryStageTransfer_productId_idx" ON "InventoryStageTransfer"("productId");
CREATE INDEX IF NOT EXISTS "InventoryStageTransfer_warehouseId_idx" ON "InventoryStageTransfer"("warehouseId");
CREATE INDEX IF NOT EXISTS "InventoryStageTransfer_fromStage_toStage_idx" ON "InventoryStageTransfer"("fromStage", "toStage");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StoreroomStock_productId_fkey') THEN
        ALTER TABLE "StoreroomStock" ADD CONSTRAINT "StoreroomStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductionStock_productId_fkey') THEN
        ALTER TABLE "ProductionStock" ADD CONSTRAINT "ProductionStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LiveStockChannel_productId_fkey') THEN
        ALTER TABLE "LiveStockChannel" ADD CONSTRAINT "LiveStockChannel_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OnlineAppStock_productId_fkey') THEN
        ALTER TABLE "OnlineAppStock" ADD CONSTRAINT "OnlineAppStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PosStoreStock_productId_fkey') THEN
        ALTER TABLE "PosStoreStock" ADD CONSTRAINT "PosStoreStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
