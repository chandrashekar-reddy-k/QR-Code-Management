-- AlterTable
ALTER TABLE "StoreCashRegister" ADD COLUMN IF NOT EXISTS "openingRemarks" TEXT,
ADD COLUMN IF NOT EXISTS "lastClosingCash" DOUBLE PRECISION;
