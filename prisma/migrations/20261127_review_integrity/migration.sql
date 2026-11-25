BEGIN;

ALTER TABLE "Commission" ADD COLUMN "dealId" TEXT;
CREATE UNIQUE INDEX "Commission_dealId_key" ON "Commission"("dealId");
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_dealId_fkey"
  FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enforce new writes without deleting or rewriting historical rows.
-- Validate the constraints after auditing legacy rows in a separate deployment step.
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
ALTER TABLE "PropertyOwnership" ADD CONSTRAINT "PropertyOwnership_percentage_range"
  CHECK (percentage > 0 AND percentage <= 100 AND
    ("percentageDecimal" IS NULL OR ("percentageDecimal" > 0 AND "percentageDecimal" <= 100))) NOT VALID;
ALTER TABLE "PropertyOwnership" ADD CONSTRAINT "PropertyOwnership_effective_dates"
  CHECK ("effectiveTo" IS NULL OR "effectiveTo" >= "effectiveFrom") NOT VALID;

COMMIT;
