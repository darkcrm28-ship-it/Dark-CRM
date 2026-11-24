-- Phase 1.1: Add idempotency and lease fencing columns
BEGIN;

-- Notification: Add dedupKey and dedupAt for idempotency
ALTER TABLE "Notification" 
    ADD COLUMN IF NOT EXISTS "dedupKey" TEXT,
    ADD COLUMN IF NOT EXISTS "dedupAt" TIMESTAMP(3);

-- PushDeliveryLog: Add dispatchKey for idempotency
ALTER TABLE "PushDeliveryLog" 
    ADD COLUMN IF NOT EXISTS "dispatchKey" TEXT;

-- JobQueue: Add claimToken for lease fencing
ALTER TABLE "JobQueue" 
    ADD COLUMN IF NOT EXISTS "claimToken" TEXT;

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Notification_dedupKey_key" ON "Notification"("dedupKey");
CREATE INDEX IF NOT EXISTS "Notification_dedupAt_idx" ON "Notification"("dedupAt");
CREATE UNIQUE INDEX IF NOT EXISTS "PushDeliveryLog_dispatchKey_key" ON "PushDeliveryLog"("dispatchKey");
CREATE INDEX IF NOT EXISTS "JobQueue_claimToken_idx" ON "JobQueue"("claimToken");

COMMIT;