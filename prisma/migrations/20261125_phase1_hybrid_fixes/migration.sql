-- Phase 1 hybrid corrections.
-- Requires explicit authorization before applying to any production database.
BEGIN;

-- claimToken must be UNIQUE to match Prisma `claimToken String? @unique`.
DROP INDEX IF EXISTS "JobQueue_claimToken_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "JobQueue_claimToken_key" ON "JobQueue"("claimToken");

-- A dispatchKey is reused across the endpoints of the same user, so global
-- uniqueness is wrong. Replace it with a composite (dispatchKey, endpoint) key.
DROP INDEX IF EXISTS "PushDeliveryLog_dispatchKey_key";

ALTER TABLE "PushDeliveryLog"
    ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "PushDeliveryLog" ALTER COLUMN "updatedAt" DROP DEFAULT;

CREATE UNIQUE INDEX IF NOT EXISTS "PushDeliveryLog_dispatchKey_endpoint_key"
    ON "PushDeliveryLog"("dispatchKey", "endpoint");
CREATE INDEX IF NOT EXISTS "PushDeliveryLog_dispatchKey_idx"
    ON "PushDeliveryLog"("dispatchKey");

-- A browser endpoint belongs to one user; key subscriptions by (userId, endpoint)
-- so one caller cannot rebind another user's device.
DROP INDEX IF EXISTS "PushSubscription_endpoint_key";
CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_userId_endpoint_key"
    ON "PushSubscription"("userId", "endpoint");
CREATE INDEX IF NOT EXISTS "PushSubscription_endpoint_idx"
    ON "PushSubscription"("endpoint");

COMMIT;
