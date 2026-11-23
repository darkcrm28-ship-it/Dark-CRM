-- Phase 0.2 Additive Architecture Migration
-- Models: PropertyOwnership, JobQueue, PushDeliveryLog
-- Indexes: Property(status, createdAt), Property(projectName), Property(zone),
--          Deal(salesRepId), Deal(customerId), Deal(status), Deal(createdAt),
--          Commission(userId), Commission(status),
--          FinancialTransaction(date), FinancialTransaction(relatedId), FinancialTransaction(type)
-- DO NOT APPLY TO PRODUCTION WITHOUT EXPLICIT USER AUTHORIZATION

BEGIN;

-- 1. Create PropertyOwnership Table
CREATE TABLE IF NOT EXISTS "PropertyOwnership" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "transferReason" TEXT,
    "previousOwnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyOwnership_pkey" PRIMARY KEY ("id")
);

-- 2. Create JobQueue Table (Safe background job leasing & outbox)
CREATE TABLE IF NOT EXISTS "JobQueue" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobQueue_pkey" PRIMARY KEY ("id")
);

-- 3. Create PushDeliveryLog Table (Notification outbox & provider outcomes)
CREATE TABLE IF NOT EXISTS "PushDeliveryLog" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "statusCode" INTEGER,
    "errorDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushDeliveryLog_pkey" PRIMARY KEY ("id")
);

-- 4. Foreign Keys
ALTER TABLE "PropertyOwnership" 
    DROP CONSTRAINT IF EXISTS "PropertyOwnership_propertyId_fkey";
ALTER TABLE "PropertyOwnership" 
    ADD CONSTRAINT "PropertyOwnership_propertyId_fkey" 
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropertyOwnership" 
    DROP CONSTRAINT IF EXISTS "PropertyOwnership_customerId_fkey";
ALTER TABLE "PropertyOwnership" 
    ADD CONSTRAINT "PropertyOwnership_customerId_fkey" 
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. Indexes for PropertyOwnership
CREATE INDEX IF NOT EXISTS "PropertyOwnership_propertyId_isCurrent_idx" ON "PropertyOwnership"("propertyId", "isCurrent");
CREATE INDEX IF NOT EXISTS "PropertyOwnership_customerId_idx" ON "PropertyOwnership"("customerId");
CREATE INDEX IF NOT EXISTS "PropertyOwnership_effectiveFrom_effectiveTo_idx" ON "PropertyOwnership"("effectiveFrom", "effectiveTo");

-- 6. Indexes for JobQueue & PushDeliveryLog
CREATE INDEX IF NOT EXISTS "JobQueue_status_runAt_idx" ON "JobQueue"("status", "runAt");
CREATE INDEX IF NOT EXISTS "JobQueue_lockedAt_idx" ON "JobQueue"("lockedAt");
CREATE INDEX IF NOT EXISTS "PushDeliveryLog_userId_idx" ON "PushDeliveryLog"("userId");
CREATE INDEX IF NOT EXISTS "PushDeliveryLog_outcome_idx" ON "PushDeliveryLog"("outcome");
CREATE INDEX IF NOT EXISTS "PushDeliveryLog_createdAt_idx" ON "PushDeliveryLog"("createdAt");

-- 7. Query-Backed Performance Indexes on Existing Models
CREATE INDEX IF NOT EXISTS "Property_status_createdAt_idx" ON "Property"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Property_projectName_idx" ON "Property"("projectName");
CREATE INDEX IF NOT EXISTS "Property_zone_idx" ON "Property"("zone");

CREATE INDEX IF NOT EXISTS "Deal_salesRepId_idx" ON "Deal"("salesRepId");
CREATE INDEX IF NOT EXISTS "Deal_customerId_idx" ON "Deal"("customerId");
CREATE INDEX IF NOT EXISTS "Deal_status_idx" ON "Deal"("status");
CREATE INDEX IF NOT EXISTS "Deal_createdAt_idx" ON "Deal"("createdAt");

CREATE INDEX IF NOT EXISTS "Commission_userId_idx" ON "Commission"("userId");
CREATE INDEX IF NOT EXISTS "Commission_status_idx" ON "Commission"("status");

CREATE INDEX IF NOT EXISTS "FinancialTransaction_date_idx" ON "FinancialTransaction"("date");
CREATE INDEX IF NOT EXISTS "FinancialTransaction_relatedId_idx" ON "FinancialTransaction"("relatedId");
CREATE INDEX IF NOT EXISTS "FinancialTransaction_type_idx" ON "FinancialTransaction"("type");

COMMIT;
