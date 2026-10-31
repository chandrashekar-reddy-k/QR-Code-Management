-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "AuditScope" AS ENUM ('HUB_CONSOLIDATED', 'RAW_INVENTORY', 'REPACKING', 'READY_INVENTORY', 'VEHICLE', 'POS_CHANNEL', 'ONLINE_CHANNEL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "AuditCountingMethod" AS ENUM ('BLIND', 'SYSTEM_ASSISTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "AuditStatus" AS ENUM ('DRAFT', 'COUNT_SUBMITTED', 'NEEDS_RECONCILIATION', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ADJUSTMENT_POSTED', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "VarianceReason" AS ENUM ('DAMAGE', 'EXPIRED', 'PICKING_ERROR', 'UNRECORDED_TRANSFER', 'THEFT_SHORTAGE', 'SUPPLIER_MISMATCH', 'PROCESSING_LOSS', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "InventoryAudit" (
    "id" TEXT NOT NULL,
    "auditNumber" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'VK001',
    "storeId" TEXT,
    "scope" "AuditScope" NOT NULL,
    "vehicleId" TEXT,
    "countingMethod" "AuditCountingMethod" NOT NULL DEFAULT 'SYSTEM_ASSISTED',
    "status" "AuditStatus" NOT NULL DEFAULT 'DRAFT',
    "cutoffTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auditorId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "reviewNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "totalExpectedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCountedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalVarianceQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalVarianceVal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "InventoryAuditLine" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productVariantId" TEXT,
    "expectedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "countedQuantity" DOUBLE PRECISION,
    "varianceQuantity" DOUBLE PRECISION,
    "variancePercent" DOUBLE PRECISION,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "varianceValue" DOUBLE PRECISION,
    "reasonCode" "VarianceReason",
    "remarks" TEXT,
    "recountCount" INTEGER NOT NULL DEFAULT 0,
    "isAdjusted" BOOLEAN NOT NULL DEFAULT false,
    "adjustmentTxId" TEXT,

    CONSTRAINT "InventoryAuditLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryAudit_auditNumber_key" ON "InventoryAudit"("auditNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryAudit_tenantId_idx" ON "InventoryAudit"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryAudit_storeId_idx" ON "InventoryAudit"("storeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryAudit_scope_idx" ON "InventoryAudit"("scope");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryAudit_status_idx" ON "InventoryAudit"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryAudit_cutoffTime_idx" ON "InventoryAudit"("cutoffTime");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryAuditLine_auditId_idx" ON "InventoryAuditLine"("auditId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryAuditLine_productId_idx" ON "InventoryAuditLine"("productId");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "InventoryAudit" ADD CONSTRAINT "InventoryAudit_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "InventoryAudit" ADD CONSTRAINT "InventoryAudit_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "InventoryAudit" ADD CONSTRAINT "InventoryAudit_auditorId_fkey" FOREIGN KEY ("auditorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "InventoryAudit" ADD CONSTRAINT "InventoryAudit_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "InventoryAuditLine" ADD CONSTRAINT "InventoryAuditLine_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "InventoryAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "InventoryAuditLine" ADD CONSTRAINT "InventoryAuditLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
