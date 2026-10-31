-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('RAW_MATERIAL', 'PACKAGING', 'FINISHED_GOOD');

-- CreateEnum
CREATE TYPE "WoStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'MATERIAL_ISSUED', 'PACKING_STARTED', 'PACKING_IN_PROGRESS', 'PACKING_COMPLETED', 'LABEL_APPLICATION_ASSIGNED', 'LABEL_APPLICATION_IN_PROGRESS', 'LABELS_APPLIED', 'QC_PENDING', 'QC_STARTED', 'QC_IN_PROGRESS', 'QC_PASSED', 'QC_FAILED', 'QC_HOLD', 'REPACKING_PENDING', 'REPACKING_IN_PROGRESS', 'REPACKING_COMPLETED', 'COMPLETED', 'CANCELLED', 'SCHEDULED', 'PAUSED');

-- CreateEnum
CREATE TYPE "WoPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('PENDING', 'ISSUED', 'PARTIAL', 'CANCELLED', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "QcResult" AS ENUM ('PASS', 'FAIL', 'CONDITIONAL_PASS', 'PARTIAL_PASS', 'REJECT', 'REWORK', 'DISCARD', 'HOLD');

-- CreateEnum
CREATE TYPE "QcSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'MINOR', 'MAJOR');

-- CreateEnum
CREATE TYPE "ApprovalType" AS ENUM ('WORK_ORDER', 'MATERIAL_ISSUE', 'PACKING_VARIANCE', 'QC_REWORK', 'REPACKING', 'BARCODE_REPRINT', 'FINISHED_GOODS', 'DISCARD', 'PARAMETER_OVERRIDE', 'REWORK', 'QUALITY_BYPASS');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'URGENT');

-- CreateEnum
CREATE TYPE "IssueType" AS ENUM ('EQUIPMENT_BREAKDOWN', 'MATERIAL_DEFECT', 'SAFETY_HAZARD', 'QUALITY_DEVIATION', 'LABEL_PRINTING', 'PACKAGING_DAMAGE', 'INVENTORY_SHORTAGE', 'OPERATOR_ERROR', 'MACHINE_ISSUE', 'MATERIAL_SHORTAGE', 'BARCODE_PROBLEM', 'DAMAGED_PRODUCT', 'PACKING_QUALITY_ISSUE', 'APP_SYSTEM_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "PrintJobType" AS ENUM ('INITIAL', 'REPRINT');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'ISSUE_REPORTED', 'COMPLETED', 'CANCELLED', 'PENDING', 'PAUSED');

-- DropForeignKey
ALTER TABLE "LoginHistory" DROP CONSTRAINT "LoginHistory_userId_fkey";

-- DropForeignKey
ALTER TABLE "OTP" DROP CONSTRAINT "OTP_userId_fkey";

-- DropForeignKey
ALTER TABLE "PasswordResetToken" DROP CONSTRAINT "PasswordResetToken_userId_fkey";

-- DropIndex
DROP INDEX "AgentTransferApproval_userId_idx";

-- DropIndex
DROP INDEX "GoodsReceiptItem_grnId_idx";

-- DropIndex
DROP INDEX "GoodsReceiptItem_productId_idx";

-- DropIndex
DROP INDEX "Notification_createdAt_idx";

-- DropIndex
DROP INDEX "Order_agentId_idx";

-- DropIndex
DROP INDEX "Order_routeId_idx";

-- DropIndex
DROP INDEX "Order_status_idx";

-- DropIndex
DROP INDEX "Order_vehicleId_idx";

-- DropIndex
DROP INDEX "Product_brandId_idx";

-- DropIndex
DROP INDEX "Product_categoryId_idx";

-- DropIndex
DROP INDEX "Product_status_idx";

-- DropIndex
DROP INDEX "Product_subCategoryId_idx";

-- DropIndex
DROP INDEX "StockTransferItem_productId_idx";

-- DropIndex
DROP INDEX "StockTransferItem_transferId_idx";

-- DropIndex
DROP INDEX "SuspendedSale_storeId_idx";

-- DropIndex
DROP INDEX "SuspendedSale_terminalId_idx";

-- DropIndex
DROP INDEX "User_assignedVehicleId_idx";

-- DropIndex
DROP INDEX "User_customRoleId_idx";

-- DropIndex
DROP INDEX "User_role_idx";

-- AlterTable
ALTER TABLE "Bundle" ALTER COLUMN "approvalStatus" SET NOT NULL;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "slaDeadline",
DROP COLUMN "version",
ALTER COLUMN "orderNumber" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PreOrder" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PreOrderItem" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "RefillRequest" ALTER COLUMN "vehicleId" SET NOT NULL,
ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "StockAudit" ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "UnitOfMeasure" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "WarehouseDeliverySetting" DROP COLUMN "shopkeeperSlaSeconds";

-- DropTable
DROP TABLE "BarcodePrintHistory";

-- DropTable
DROP TABLE "BarcodeScanHistory";

-- DropTable
DROP TABLE "CustomRole";

-- DropTable
DROP TABLE "IdSequence";

-- DropTable
DROP TABLE "LoginHistory";

-- DropTable
DROP TABLE "OTP";

-- DropTable
DROP TABLE "OrderReturn";

-- DropTable
DROP TABLE "POSTerminal";

-- DropTable
DROP TABLE "PasswordResetToken";

-- DropTable
DROP TABLE "Promotion";

-- DropTable
DROP TABLE "ServiceClient";

-- DropTable
DROP TABLE "SessionSales";

-- DropTable
DROP TABLE "SupplierBarcodeMapping";

-- DropTable
DROP TABLE "Tenant";

-- DropTable
DROP TABLE "WarehouseInventory";

-- DropTable
DROP TABLE "WorkOrder";

-- DropTable
DROP TABLE "WorkOrderItem";

-- DropEnum
DROP TYPE "DocumentStatus";

-- DropEnum
DROP TYPE "DocumentType";

-- DropEnum
DROP TYPE "ItemStatus";

-- DropEnum
DROP TYPE "KYCStatus";

-- DropEnum
DROP TYPE "LoginMethod";

-- DropEnum
DROP TYPE "OTPChannel";

-- DropEnum
DROP TYPE "OTPPurpose";

-- DropEnum
DROP TYPE "PromotionType";

-- DropEnum
DROP TYPE "SalesChannel";

-- DropEnum
DROP TYPE "TenantStatus";

-- DropEnum
DROP TYPE "UserStatus";

-- DropEnum
DROP TYPE "WorkOrderStatus";

-- CreateTable
CREATE TABLE "WarehouseSlaConfig" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "slaSeconds" INTEGER NOT NULL DEFAULT 1800,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseSlaConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorageLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackingWorkOrder" (
    "id" TEXT NOT NULL,
    "woNumber" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "status" "WoStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "WoPriority" NOT NULL DEFAULT 'MEDIUM',
    "requiredQty" DOUBLE PRECISION NOT NULL,
    "actualProduced" DOUBLE PRECISION,
    "actualRejected" DOUBLE PRECISION,
    "batchNumber" TEXT,
    "supervisorId" TEXT NOT NULL,
    "expectedDate" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "inspectorId" TEXT,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "operatorId" TEXT,
    "pauseReason" TEXT,
    "labelsPrinted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "labelsApplied" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "warehouseId" TEXT,

    CONSTRAINT "PackingWorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialIssue" (
    "id" TEXT NOT NULL,
    "issueNo" TEXT NOT NULL,
    "woId" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "status" "IssueStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityCheck" (
    "id" TEXT NOT NULL,
    "qcNumber" TEXT NOT NULL,
    "woId" TEXT NOT NULL,
    "inspectorId" TEXT NOT NULL,
    "checkedQty" DOUBLE PRECISION NOT NULL,
    "result" "QcResult" NOT NULL,
    "severity" "QcSeverity",
    "failureReason" TEXT,
    "remarks" TEXT,
    "checksPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualityCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinishedGoods" (
    "id" TEXT NOT NULL,
    "fgNumber" TEXT NOT NULL,
    "woId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "postedQty" DOUBLE PRECISION NOT NULL,
    "destination" TEXT NOT NULL,
    "costPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinishedGoods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepackingLog" (
    "id" TEXT NOT NULL,
    "rpNumber" TEXT NOT NULL,
    "sourceWoId" TEXT NOT NULL,
    "repackType" TEXT NOT NULL,
    "recoverableQty" DOUBLE PRECISION NOT NULL,
    "wasteQty" DOUBLE PRECISION NOT NULL,
    "newBatchNumber" TEXT,
    "targetRecipeId" TEXT,
    "loggedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REPACKING_PENDING',
    "remarks" TEXT,
    "requiresRelabeling" BOOLEAN NOT NULL DEFAULT false,
    "operatorId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepackingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "type" "ApprovalType" NOT NULL,
    "relatedEntityId" TEXT NOT NULL,
    "relatedEntityName" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "requestedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "priority" "Priority" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "existingValues" JSONB,
    "proposedValues" JSONB,
    "remarks" TEXT,
    "attachments" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalHistory" (
    "id" TEXT NOT NULL,
    "approvalRequestId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actionById" TEXT NOT NULL,
    "actionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comments" TEXT,

    CONSTRAINT "ApprovalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "type" "IssueType" NOT NULL,
    "description" TEXT NOT NULL,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "woId" TEXT,
    "reportedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabelPrintJob" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "barcodeType" TEXT NOT NULL,
    "printedQty" INTEGER NOT NULL,
    "printedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Printed',
    "reprintReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "labelTemplate" TEXT NOT NULL DEFAULT 'Retail Label',
    "printer" TEXT NOT NULL DEFAULT 'Unknown',
    "type" "PrintJobType" NOT NULL DEFAULT 'INITIAL',

    CONSTRAINT "LabelPrintJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabelApplicationTask" (
    "id" TEXT NOT NULL,
    "woId" TEXT NOT NULL,
    "printJobId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "requiredQuantity" DOUBLE PRECISION NOT NULL,
    "appliedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingQuantity" DOUBLE PRECISION NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "LabelApplicationTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "inAppNotifications" BOOLEAN NOT NULL DEFAULT true,
    "compactView" BOOLEAN NOT NULL DEFAULT false,
    "autoPrintLabels" BOOLEAN NOT NULL DEFAULT false,
    "defaultPrinter" TEXT DEFAULT 'Zebra-ZT230',
    "language" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseSlaConfig_warehouseId_key" ON "WarehouseSlaConfig"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_productId_warehouseId_key" ON "Inventory"("productId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "PackingWorkOrder_woNumber_key" ON "PackingWorkOrder"("woNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PackingWorkOrder_batchNumber_key" ON "PackingWorkOrder"("batchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialIssue_issueNo_key" ON "MaterialIssue"("issueNo");

-- CreateIndex
CREATE UNIQUE INDEX "QualityCheck_qcNumber_key" ON "QualityCheck"("qcNumber");

-- CreateIndex
CREATE UNIQUE INDEX "FinishedGoods_fgNumber_key" ON "FinishedGoods"("fgNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RepackingLog_rpNumber_key" ON "RepackingLog"("rpNumber");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- AddForeignKey
ALTER TABLE "WarehouseSlaConfig" ADD CONSTRAINT "WarehouseSlaConfig_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleStock" ADD CONSTRAINT "VehicleStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleStock" ADD CONSTRAINT "VehicleStock_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteAssignment" ADD CONSTRAINT "RouteAssignment_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteAssignment" ADD CONSTRAINT "RouteAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteAssignment" ADD CONSTRAINT "RouteAssignment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefillRequest" ADD CONSTRAINT "RefillRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefillRequest" ADD CONSTRAINT "RefillRequest_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefillRequest" ADD CONSTRAINT "RefillRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefillRequest" ADD CONSTRAINT "RefillRequest_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefillItem" ADD CONSTRAINT "RefillItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefillItem" ADD CONSTRAINT "RefillItem_refillRequestId_fkey" FOREIGN KEY ("refillRequestId") REFERENCES "RefillRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefillItem" ADD CONSTRAINT "RefillItem_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAudit" ADD CONSTRAINT "StockAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAudit" ADD CONSTRAINT "StockAudit_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAuditItem" ADD CONSTRAINT "StockAuditItem_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "StockAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAuditItem" ADD CONSTRAINT "StockAuditItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageLocation" ADD CONSTRAINT "StorageLocation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingWorkOrder" ADD CONSTRAINT "PackingWorkOrder_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingWorkOrder" ADD CONSTRAINT "PackingWorkOrder_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingWorkOrder" ADD CONSTRAINT "PackingWorkOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingWorkOrder" ADD CONSTRAINT "PackingWorkOrder_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingWorkOrder" ADD CONSTRAINT "PackingWorkOrder_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingWorkOrder" ADD CONSTRAINT "PackingWorkOrder_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssue" ADD CONSTRAINT "MaterialIssue_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssue" ADD CONSTRAINT "MaterialIssue_woId_fkey" FOREIGN KEY ("woId") REFERENCES "PackingWorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityCheck" ADD CONSTRAINT "QualityCheck_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityCheck" ADD CONSTRAINT "QualityCheck_woId_fkey" FOREIGN KEY ("woId") REFERENCES "PackingWorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishedGoods" ADD CONSTRAINT "FinishedGoods_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishedGoods" ADD CONSTRAINT "FinishedGoods_woId_fkey" FOREIGN KEY ("woId") REFERENCES "PackingWorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepackingLog" ADD CONSTRAINT "RepackingLog_sourceWoId_fkey" FOREIGN KEY ("sourceWoId") REFERENCES "PackingWorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalHistory" ADD CONSTRAINT "ApprovalHistory_actionById_fkey" FOREIGN KEY ("actionById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalHistory" ADD CONSTRAINT "ApprovalHistory_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_woId_fkey" FOREIGN KEY ("woId") REFERENCES "PackingWorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabelPrintJob" ADD CONSTRAINT "LabelPrintJob_printedById_fkey" FOREIGN KEY ("printedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabelPrintJob" ADD CONSTRAINT "LabelPrintJob_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "PackingWorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabelApplicationTask" ADD CONSTRAINT "LabelApplicationTask_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabelApplicationTask" ADD CONSTRAINT "LabelApplicationTask_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabelApplicationTask" ADD CONSTRAINT "LabelApplicationTask_printJobId_fkey" FOREIGN KEY ("printJobId") REFERENCES "LabelPrintJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabelApplicationTask" ADD CONSTRAINT "LabelApplicationTask_woId_fkey" FOREIGN KEY ("woId") REFERENCES "PackingWorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

