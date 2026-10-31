import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.$executeRawUnsafe('ALTER TABLE "ProcurementGoodsReceiptItem" ADD COLUMN IF NOT EXISTS "isConfiguredToRaw" BOOLEAN NOT NULL DEFAULT false;');
  console.log('Column added');
}
main().finally(() => prisma.$disconnect());
