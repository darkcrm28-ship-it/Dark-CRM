-- Phase 0.2 Architecture Migration Rollback Script
-- Destructive rollback: dropping these tables removes stored ownership, jobs and delivery history.
-- Export the affected tables and validate recovery on a separate database before use.

BEGIN;

-- Drop newly added indexes on existing tables
DROP INDEX IF EXISTS "Property_status_createdAt_idx";
DROP INDEX IF EXISTS "Property_projectName_idx";
DROP INDEX IF EXISTS "Property_zone_idx";

DROP INDEX IF EXISTS "Deal_salesRepId_idx";
DROP INDEX IF EXISTS "Deal_customerId_idx";
DROP INDEX IF EXISTS "Deal_status_idx";
DROP INDEX IF EXISTS "Deal_createdAt_idx";

DROP INDEX IF EXISTS "Commission_userId_idx";
DROP INDEX IF EXISTS "Commission_status_idx";

DROP INDEX IF EXISTS "FinancialTransaction_date_idx";
DROP INDEX IF EXISTS "FinancialTransaction_relatedId_idx";
DROP INDEX IF EXISTS "FinancialTransaction_type_idx";

-- Drop additive tables
DROP TABLE IF EXISTS "PushDeliveryLog";
DROP TABLE IF EXISTS "JobQueue";
DROP TABLE IF EXISTS "PropertyOwnership";

COMMIT;
