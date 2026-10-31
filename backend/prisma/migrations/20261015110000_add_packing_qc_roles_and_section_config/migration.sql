-- AlterEnum UserRole
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PACKING_OPERATOR';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'QC_INSPECTOR';

-- AlterEnum OrderStatus
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_RETURNED';

-- AlterTable CouponProduct
ALTER TABLE "CouponProduct" ADD COLUMN IF NOT EXISTS "roleName" TEXT DEFAULT 'CUSTOMER',
ADD COLUMN IF NOT EXISTS "title" TEXT,
ADD COLUMN IF NOT EXISTS "subTitle" TEXT,
ADD COLUMN IF NOT EXISTS "titleType" TEXT DEFAULT 'SHOP_MORE_UNLOCK_MORE',
ADD COLUMN IF NOT EXISTS "icon" TEXT,
ADD COLUMN IF NOT EXISTS "linkPath" TEXT DEFAULT '/coupons',
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "CouponProduct_roleName_isActive_idx" ON "CouponProduct"("roleName", "isActive");

-- CreateTable AppSectionConfig
CREATE TABLE IF NOT EXISTS "AppSectionConfig" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "titleType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subTitle" TEXT,
    "roleName" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "icon" TEXT,
    "linkPath" TEXT DEFAULT '/coupons',
    "displayOrder" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppSectionConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AppSectionConfig_titleType_key" ON "AppSectionConfig"("titleType");
CREATE INDEX IF NOT EXISTS "AppSectionConfig_roleName_isActive_idx" ON "AppSectionConfig"("roleName", "isActive");
CREATE INDEX IF NOT EXISTS "AppSectionConfig_titleType_isActive_idx" ON "AppSectionConfig"("titleType", "isActive");
