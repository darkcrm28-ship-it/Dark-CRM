-- Rollback Phase 1.1: Remove idempotency and lease fencing columns
BEGIN;

-- Drop indexes
DROP INDEX IF EXISTS "Notification_dedupKey_key";
DROP INDEX IF EXISTS "Notification_dedupAt_idx";
DROP INDEX IF EXISTS "PushDeliveryLog_dispatchKey_key";
DROP INDEX IF EXISTS "JobQueue_claimToken_idx";

-- Drop columns
ALTER TABLE "Notification" 
    DROP COLUMN IF EXISTS "dedupKey",
    DROP COLUMN IF EXISTS "dedupAt";

ALTER TABLE "PushDeliveryLog" 
    DROP COLUMN IF EXISTS "dispatchKey";

ALTER TABLE "JobQueue" 
    DROP COLUMN IF EXISTS "claimToken";

COMMIT;