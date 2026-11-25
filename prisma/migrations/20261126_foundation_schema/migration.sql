-- Foundation schema for Dark CRM.
-- Adds durable domain tables, Decimal shadow columns, and conflict guards.
-- Existing Float columns are retained for compatibility; explicit authorization is required.
BEGIN;

-- AlterTable
ALTER TABLE "Commission" ADD COLUMN     "amountDecimal" DECIMAL(15,2);

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "askingPriceDecimal" DECIMAL(15,2),
ADD COLUMN     "budgetMaxDecimal" DECIMAL(15,2),
ADD COLUMN     "budgetMinDecimal" DECIMAL(15,2),
ADD COLUMN     "campaignId" TEXT,
ADD COLUMN     "installmentAmountDecimal" DECIMAL(15,2),
ADD COLUMN     "remainingInstallmentsDecimal" DECIMAL(15,2);

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "commissionAmtDecimal" DECIMAL(15,2),
ADD COLUMN     "commissionRateDecimal" DECIMAL(5,2),
ADD COLUMN     "contractDate" TIMESTAMP(3),
ADD COLUMN     "dealNumber" TEXT,
ADD COLUMN     "discountAmount" DECIMAL(15,2),
ADD COLUMN     "finalPriceDecimal" DECIMAL(15,2),
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "valueDecimal" DECIMAL(15,2);

-- AlterTable
ALTER TABLE "FinancialTransaction" ADD COLUMN     "amountDecimal" DECIMAL(15,2),
ADD COLUMN     "reversalOfId" TEXT,
ADD COLUMN     "reversalReason" TEXT,
ADD COLUMN     "reversedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "JobQueue" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "installmentPercentageDecimal" DECIMAL(5,2),
ADD COLUMN     "monthlyInstallmentDecimal" DECIMAL(15,2),
ADD COLUMN     "priceDecimal" DECIMAL(15,2);

-- AlterTable
ALTER TABLE "PropertyOwnership" ADD COLUMN     "percentageDecimal" DECIMAL(5,2),
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "authzVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "salaryBaseDecimal" DECIMAL(15,2);

-- Backfill Decimal shadow columns using explicit two-decimal rounding.
-- Legacy Float columns are retained; later phases will dual-write and cut reads over.
UPDATE "User" SET "salaryBaseDecimal" = ROUND(COALESCE("salaryBase", 0)::numeric, 2) WHERE "salaryBaseDecimal" IS NULL;
UPDATE "Customer" SET
  "askingPriceDecimal" = ROUND("askingPrice"::numeric, 2),
  "remainingInstallmentsDecimal" = ROUND("remainingInstallments"::numeric, 2),
  "budgetMinDecimal" = ROUND(COALESCE("budgetMin", 0)::numeric, 2),
  "budgetMaxDecimal" = ROUND(COALESCE("budgetMax", 0)::numeric, 2),
  "installmentAmountDecimal" = ROUND(COALESCE("installmentAmount", 0)::numeric, 2)
WHERE "askingPriceDecimal" IS NULL AND "remainingInstallmentsDecimal" IS NULL
  AND "budgetMinDecimal" IS NULL AND "budgetMaxDecimal" IS NULL AND "installmentAmountDecimal" IS NULL;
UPDATE "Property" SET
  "priceDecimal" = ROUND("price"::numeric, 2),
  "monthlyInstallmentDecimal" = ROUND("monthlyInstallment"::numeric, 2),
  "installmentPercentageDecimal" = ROUND("installmentPercentage"::numeric, 2)
WHERE "priceDecimal" IS NULL AND "monthlyInstallmentDecimal" IS NULL AND "installmentPercentageDecimal" IS NULL;
UPDATE "Deal" SET
  "valueDecimal" = ROUND("value"::numeric, 2),
  "commissionRateDecimal" = ROUND("commission"::numeric, 2),
  "commissionAmtDecimal" = ROUND("commissionAmt"::numeric, 2),
  "finalPriceDecimal" = ROUND("finalPrice"::numeric, 2),
  "dealNumber" = 'DL-' || "id"
WHERE "valueDecimal" IS NULL AND "commissionRateDecimal" IS NULL
  AND "commissionAmtDecimal" IS NULL AND "finalPriceDecimal" IS NULL;
UPDATE "Commission" SET "amountDecimal" = ROUND("amount"::numeric, 2) WHERE "amountDecimal" IS NULL;
UPDATE "FinancialTransaction" SET "amountDecimal" = ROUND("amount"::numeric, 2) WHERE "amountDecimal" IS NULL;
UPDATE "PropertyOwnership" SET "percentageDecimal" = ROUND("percentage"::numeric, 2) WHERE "percentageDecimal" IS NULL;

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "entityType" TEXT,
    "entityId" TEXT,
    "response" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "reason" TEXT,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "sourceCode" TEXT NOT NULL,
    "budget" DECIMAL(15,2),
    "spend" DECIMAL(15,2),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerNeed" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "dealType" TEXT NOT NULL DEFAULT 'BUY',
    "propertyType" TEXT,
    "city" TEXT,
    "zone" TEXT,
    "project" TEXT,
    "budgetMin" DECIMAL(15,2),
    "budgetMax" DECIMAL(15,2),
    "areaMin" DOUBLE PRECISION,
    "areaMax" DOUBLE PRECISION,
    "bedrooms" INTEGER,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerNeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Owner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "nationalId" TEXT,
    "address" TEXT,
    "type" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Owner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyOwner" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "accessLevel" TEXT NOT NULL DEFAULT 'RESTRICTED',
    "uploadedById" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "dealId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "notes" TEXT,
    "createdById" TEXT,
    "approvedById" TEXT,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "dealId" TEXT,
    "reservationId" TEXT,
    "customerId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SALE',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "signedAt" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "documentKey" TEXT,
    "terms" JSONB,
    "createdById" TEXT,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentPlan" (
    "id" TEXT NOT NULL,
    "dealId" TEXT,
    "contractId" TEXT,
    "customerId" TEXT NOT NULL,
    "propertyId" TEXT,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "downPayment" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "planType" TEXT NOT NULL DEFAULT 'INSTALLMENTS',
    "installmentCount" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Installment" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "paidAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Installment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "planId" TEXT,
    "installmentId" TEXT,
    "dealId" TEXT,
    "customerId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "method" TEXT,
    "reference" TEXT,
    "receiptNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT,
    "reversalOfId" TEXT,
    "reversedAt" TIMESTAMP(3),
    "reversalReason" TEXT,
    "idempotencyKey" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "direction" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "accountCode" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "description" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'POSTED',
    "reversalOfId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'FOLLOW_UP',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "assignedToId" TEXT,
    "customerId" TEXT,
    "dealId" TEXT,
    "propertyId" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicListing" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "marketingDescription" TEXT,
    "publicImageKeys" JSONB,
    "submittedById" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryEvent" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fromValue" TEXT,
    "toValue" TEXT,
    "reason" TEXT,
    "relatedId" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IdempotencyKey_entityType_entityId_idx" ON "IdempotencyKey"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_scope_key_key" ON "IdempotencyKey"("scope", "key");

-- CreateIndex
CREATE INDEX "StatusHistory_entity_entityId_createdAt_idx" ON "StatusHistory"("entity", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "StatusHistory_actorId_idx" ON "StatusHistory"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_sourceCode_key" ON "Campaign"("sourceCode");

-- CreateIndex
CREATE INDEX "Campaign_channel_idx" ON "Campaign"("channel");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "CustomerNeed_customerId_idx" ON "CustomerNeed"("customerId");

-- CreateIndex
CREATE INDEX "CustomerNeed_status_idx" ON "CustomerNeed"("status");

-- CreateIndex
CREATE INDEX "CustomerNeed_city_zone_idx" ON "CustomerNeed"("city", "zone");

-- CreateIndex
CREATE INDEX "Owner_phone_idx" ON "Owner"("phone");

-- CreateIndex
CREATE INDEX "Owner_name_idx" ON "Owner"("name");

-- CreateIndex
CREATE INDEX "PropertyOwner_propertyId_isCurrent_idx" ON "PropertyOwner"("propertyId", "isCurrent");

-- CreateIndex
CREATE INDEX "PropertyOwner_ownerId_idx" ON "PropertyOwner"("ownerId");

-- CreateIndex
CREATE INDEX "PropertyOwner_effectiveFrom_effectiveTo_idx" ON "PropertyOwner"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "Document_storageKey_key" ON "Document"("storageKey");

-- CreateIndex
CREATE INDEX "Document_entityType_entityId_idx" ON "Document"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Document_type_idx" ON "Document"("type");

-- CreateIndex
CREATE INDEX "Document_uploadedById_idx" ON "Document"("uploadedById");

-- CreateIndex
CREATE INDEX "Reservation_propertyId_status_idx" ON "Reservation"("propertyId", "status");

-- CreateIndex
CREATE INDEX "Reservation_customerId_idx" ON "Reservation"("customerId");

-- CreateIndex
CREATE INDEX "Reservation_dealId_idx" ON "Reservation"("dealId");

-- CreateIndex
CREATE INDEX "Reservation_endAt_idx" ON "Reservation"("endAt");

-- CreateIndex
CREATE INDEX "Contract_dealId_idx" ON "Contract"("dealId");

-- CreateIndex
CREATE INDEX "Contract_customerId_idx" ON "Contract"("customerId");

-- CreateIndex
CREATE INDEX "Contract_propertyId_idx" ON "Contract"("propertyId");

-- CreateIndex
CREATE INDEX "Contract_status_idx" ON "Contract"("status");

-- CreateIndex
CREATE INDEX "Contract_reservationId_idx" ON "Contract"("reservationId");

-- CreateIndex
CREATE INDEX "PaymentPlan_dealId_idx" ON "PaymentPlan"("dealId");

-- CreateIndex
CREATE INDEX "PaymentPlan_contractId_idx" ON "PaymentPlan"("contractId");

-- CreateIndex
CREATE INDEX "PaymentPlan_customerId_idx" ON "PaymentPlan"("customerId");

-- CreateIndex
CREATE INDEX "PaymentPlan_status_idx" ON "PaymentPlan"("status");

-- CreateIndex
CREATE INDEX "Installment_status_dueDate_idx" ON "Installment"("status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Installment_planId_number_key" ON "Installment"("planId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_receiptNumber_key" ON "Payment"("receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Payment_planId_idx" ON "Payment"("planId");

-- CreateIndex
CREATE INDEX "Payment_installmentId_idx" ON "Payment"("installmentId");

-- CreateIndex
CREATE INDEX "Payment_customerId_paidAt_idx" ON "Payment"("customerId", "paidAt");

-- CreateIndex
CREATE INDEX "Payment_dealId_idx" ON "Payment"("dealId");

-- CreateIndex
CREATE INDEX "Payment_reversalOfId_idx" ON "Payment"("reversalOfId");

-- CreateIndex
CREATE INDEX "JournalEntry_date_idx" ON "JournalEntry"("date");

-- CreateIndex
CREATE INDEX "JournalEntry_sourceType_sourceId_idx" ON "JournalEntry"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "JournalEntry_reversalOfId_idx" ON "JournalEntry"("reversalOfId");

-- CreateIndex
CREATE INDEX "Task_assignedToId_status_idx" ON "Task"("assignedToId", "status");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateIndex
CREATE INDEX "Task_customerId_idx" ON "Task"("customerId");

-- CreateIndex
CREATE INDEX "Task_dealId_idx" ON "Task"("dealId");

-- CreateIndex
CREATE INDEX "Task_propertyId_idx" ON "Task"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicListing_propertyId_key" ON "PublicListing"("propertyId");

-- CreateIndex
CREATE INDEX "PublicListing_status_idx" ON "PublicListing"("status");

-- CreateIndex
CREATE INDEX "PublicListing_submittedById_idx" ON "PublicListing"("submittedById");

-- CreateIndex
CREATE INDEX "PublicListing_reviewedById_idx" ON "PublicListing"("reviewedById");

-- CreateIndex
CREATE INDEX "InventoryEvent_propertyId_createdAt_idx" ON "InventoryEvent"("propertyId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryEvent_type_idx" ON "InventoryEvent"("type");

-- CreateIndex
CREATE INDEX "Customer_campaignId_idx" ON "Customer"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "Deal_dealNumber_key" ON "Deal"("dealNumber");

-- CreateIndex
CREATE INDEX "FinancialTransaction_reversalOfId_idx" ON "FinancialTransaction"("reversalOfId");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "FinancialTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerNeed" ADD CONSTRAINT "CustomerNeed_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyOwner" ADD CONSTRAINT "PropertyOwner_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyOwner" ADD CONSTRAINT "PropertyOwner_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PaymentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PaymentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "Installment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicListing" ADD CONSTRAINT "PublicListing_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicListing" ADD CONSTRAINT "PublicListing_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicListing" ADD CONSTRAINT "PublicListing_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryEvent" ADD CONSTRAINT "InventoryEvent_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryEvent" ADD CONSTRAINT "InventoryEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- One approved hold per unit. Pending/expired history is preserved.
CREATE UNIQUE INDEX IF NOT EXISTS "Reservation_oneApprovedPerProperty_idx"
  ON "Reservation"("propertyId") WHERE "status" = 'APPROVED';

-- Database-level guard for the ownership-sum invariant. Application-level checks
-- remain in src/lib/property-ownership.ts for legacy Customer-based ownership.
CREATE OR REPLACE FUNCTION "enforce_property_owner_percentage"() RETURNS trigger AS $$
DECLARE
  v_total NUMERIC(12, 2);
BEGIN
  IF NEW."percentage" < 0 OR NEW."percentage" > 100 THEN
    RAISE EXCEPTION 'ownership percentage must be between 0 and 100' USING ERRCODE = '23514';
  END IF;

  IF NEW."isCurrent" THEN
    SELECT COALESCE(SUM("percentage"), 0) INTO v_total
    FROM "PropertyOwner"
    WHERE "propertyId" = NEW."propertyId"
      AND "isCurrent"
      AND (TG_OP = 'INSERT' OR "id" <> NEW."id");

    IF v_total + NEW."percentage" > 100 THEN
      RAISE EXCEPTION 'active ownership percentages for a property cannot exceed 100' USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "PropertyOwner_percentage_guard" ON "PropertyOwner";
CREATE TRIGGER "PropertyOwner_percentage_guard"
  BEFORE INSERT OR UPDATE OF "percentage", "isCurrent", "propertyId"
  ON "PropertyOwner"
  FOR EACH ROW EXECUTE FUNCTION "enforce_property_owner_percentage"();


COMMIT;
