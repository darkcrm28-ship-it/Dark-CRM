-- Rollback Phase 1 hybrid corrections.
-- After a manual rollback, run:
--   npx prisma migrate resolve --rolled-back 20261125_phase1_hybrid_fixes
BEGIN;

DROP INDEX IF EXISTS "PushDeliveryLog_dispatchKey_idx";
DROP INDEX IF EXISTS "PushDeliveryLog_dispatchKey_endpoint_key";
ALTER TABLE "PushDeliveryLog" DROP COLUMN IF EXISTS "updatedAt";
CREATE UNIQUE INDEX IF NOT EXISTS "PushDeliveryLog_dispatchKey_key"
    ON "PushDeliveryLog"("dispatchKey");

DROP INDEX IF EXISTS "JobQueue_claimToken_key";
CREATE INDEX IF NOT EXISTS "JobQueue_claimToken_idx" ON "JobQueue"("claimToken");

COMMIT;
