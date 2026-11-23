-- Phase 0.2 Architecture Migration Rollback Script
-- Safe and completely reversible without affecting existing customer/deal data.

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
