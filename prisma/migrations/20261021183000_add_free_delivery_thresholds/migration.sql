-- Add free delivery thresholds to WarehouseDeliverySetting and MasterDeliverySetting
ALTER TABLE "WarehouseDeliverySetting" ADD COLUMN IF NOT EXISTS "expressFreeDeliveryThreshold" DECIMAL(10, 2);
ALTER TABLE "WarehouseDeliverySetting" ADD COLUMN IF NOT EXISTS "scheduledFreeDeliveryThreshold" DECIMAL(10, 2);
ALTER TABLE "WarehouseDeliverySetting" ADD COLUMN IF NOT EXISTS "freeDeliveryThreshold" DECIMAL(10, 2);
ALTER TABLE "MasterDeliverySetting" ADD COLUMN IF NOT EXISTS "freeDeliveryThreshold" DECIMAL(10, 2);
