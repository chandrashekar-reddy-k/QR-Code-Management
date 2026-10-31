-- AlterTable
ALTER TABLE "PackingWorkOrder" ADD COLUMN IF NOT EXISTS "sourceItems" JSONB,
ADD COLUMN IF NOT EXISTS "outputAllocations" JSONB,
ADD COLUMN IF NOT EXISTS "remarks" TEXT;
