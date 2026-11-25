-- DRAFT ONLY - DO NOT APPLY AUTOMATICALLY
-- Reference ideas for Dark CRM. Review, split, and test on an isolated Neon branch before any production use.
-- These drafts are intentionally outside prisma/migrations to avoid accidental Prisma pickup.

-- 1) Idempotency keys for deals / accounting / imports
CREATE TABLE IF NOT EXISTS "IdempotencyKey" (
  "id" TEXT PRIMARY KEY,
  "scope" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "entityType" TEXT,
  "entityId" TEXT,
  "response" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "IdempotencyKey_scope_key_key" ON "IdempotencyKey"("scope", "key");
CREATE INDEX IF NOT EXISTS "IdempotencyKey_entityType_entityId_idx" ON "IdempotencyKey"("entityType", "entityId");

-- 2) Financial reversal traceability
ALTER TABLE "FinancialTransaction"
  ADD COLUMN IF NOT EXISTS "reversalOfId" TEXT,
  ADD COLUMN IF NOT EXISTS "reversedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reversalReason" TEXT;
CREATE INDEX IF NOT EXISTS "FinancialTransaction_reversalOfId_idx" ON "FinancialTransaction"("reversalOfId");

-- 3) Session invalidation / authz version
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "authzVersion" INTEGER NOT NULL DEFAULT 0;

-- 4) Status history (generic, minimal)
CREATE TABLE IF NOT EXISTS "StatusHistory" (
  "id" TEXT PRIMARY KEY,
  "entity" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "reason" TEXT,
  "actorType" TEXT NOT NULL,
  "actorId" TEXT,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "StatusHistory_entity_entityId_createdAt_idx" ON "StatusHistory"("entity", "entityId", "createdAt");

-- 5) Installments (minimal shape - redesign before applying)
CREATE TABLE IF NOT EXISTS "PaymentPlan" (
  "id" TEXT PRIMARY KEY,
  "dealId" TEXT,
  "customerId" TEXT NOT NULL,
  "propertyId" TEXT,
  "totalAmount" DECIMAL(15,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EGP',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Installment" (
  "id" TEXT PRIMARY KEY,
  "paymentPlanId" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "paidAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'DUE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Installment_paymentPlanId_number_key" ON "Installment"("paymentPlanId", "number");

CREATE TABLE IF NOT EXISTS "Payment" (
  "id" TEXT PRIMARY KEY,
  "installmentId" TEXT,
  "paymentPlanId" TEXT,
  "amount" DECIMAL(15,2) NOT NULL,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "method" TEXT,
  "reference" TEXT,
  "idempotencyKey" TEXT,
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;
