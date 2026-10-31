-- Remove failed migration record so Prisma migrate deploy will unblock
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20260610120000_merge_vsms_schemas'
  AND (finished_at IS NULL OR rolled_back_at IS NOT NULL);
