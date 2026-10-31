-- Add flashDealEnd column to Product table for Limited Time / Flash Deals feature
-- Uses IF NOT EXISTS so it is safe to run on environments where the column already exists (e.g. local dev)

-- AlterTable
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "flashDealEnd" TIMESTAMP(3);

-- CreateIndex for efficient querying of active flash deals
CREATE INDEX IF NOT EXISTS "Product_flashDealEnd_idx" ON "Product"("flashDealEnd");
