BEGIN;

SET LOCAL lock_timeout = '5s';

-- Retain the legacy columns while older writers can still update them. A write
-- to a legacy value updates its decimal twin. Explicit consistent decimal
-- writes are accepted, and a deliberate decimal-only backfill stays intact.
CREATE FUNCTION dark_crm_sync_decimal_fields() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  current_row jsonb := to_jsonb(NEW);
  prior_row jsonb;
  legacy_key text;
  decimal_key text;
  expected numeric;
  supplied numeric;
  i integer;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    prior_row := to_jsonb(OLD);
  END IF;

  FOR i IN 0..TG_NARGS - 1 BY 2 LOOP
    legacy_key := TG_ARGV[i];
    decimal_key := TG_ARGV[i + 1];
    IF TG_OP = 'UPDATE' AND current_row->legacy_key IS NOT DISTINCT FROM prior_row->legacy_key THEN
      CONTINUE;
    END IF;

    expected := ROUND((current_row->>legacy_key)::numeric, 2);
    supplied := (current_row->>decimal_key)::numeric;
    IF expected IS NOT NULL AND expected::text IN ('NaN', 'Infinity', '-Infinity') THEN
      RAISE EXCEPTION 'Non-finite value in %.%', TG_TABLE_NAME, legacy_key USING ERRCODE = '22003';
    END IF;

    IF TG_OP = 'INSERT' THEN
      IF supplied IS NOT NULL AND supplied IS DISTINCT FROM expected THEN
        RAISE EXCEPTION 'Inconsistent decimal value in %.%', TG_TABLE_NAME, decimal_key USING ERRCODE = '23514';
      END IF;
    ELSIF current_row->decimal_key IS DISTINCT FROM prior_row->decimal_key
        AND supplied IS DISTINCT FROM expected THEN
      RAISE EXCEPTION 'Inconsistent decimal value in %.%', TG_TABLE_NAME, decimal_key USING ERRCODE = '23514';
    END IF;

    current_row := jsonb_set(current_row, ARRAY[decimal_key], COALESCE(to_jsonb(expected), 'null'::jsonb));
  END LOOP;
  RETURN jsonb_populate_record(NEW, current_row);
END;
$$;

-- Backfill only representable missing values. Existing decimals and invalid
-- historical rows remain intact for the read-only reconciliation report.
UPDATE "User" SET
  "salaryBaseDecimal" = COALESCE("salaryBaseDecimal", CASE WHEN ABS(ROUND("salaryBase"::numeric, 2)) < 10000000000000 THEN ROUND("salaryBase"::numeric, 2) END)
WHERE ("salaryBaseDecimal" IS NULL AND ABS(ROUND("salaryBase"::numeric, 2)) < 10000000000000);

UPDATE "Customer" SET
  "askingPriceDecimal" = COALESCE("askingPriceDecimal", CASE WHEN ABS(ROUND("askingPrice"::numeric, 2)) < 10000000000000 THEN ROUND("askingPrice"::numeric, 2) END),
  "remainingInstallmentsDecimal" = COALESCE("remainingInstallmentsDecimal", CASE WHEN ABS(ROUND("remainingInstallments"::numeric, 2)) < 10000000000000 THEN ROUND("remainingInstallments"::numeric, 2) END),
  "budgetMinDecimal" = COALESCE("budgetMinDecimal", CASE WHEN ABS(ROUND("budgetMin"::numeric, 2)) < 10000000000000 THEN ROUND("budgetMin"::numeric, 2) END),
  "budgetMaxDecimal" = COALESCE("budgetMaxDecimal", CASE WHEN ABS(ROUND("budgetMax"::numeric, 2)) < 10000000000000 THEN ROUND("budgetMax"::numeric, 2) END),
  "installmentAmountDecimal" = COALESCE("installmentAmountDecimal", CASE WHEN ABS(ROUND("installmentAmount"::numeric, 2)) < 10000000000000 THEN ROUND("installmentAmount"::numeric, 2) END)
WHERE ("askingPriceDecimal" IS NULL AND ABS(ROUND("askingPrice"::numeric, 2)) < 10000000000000)
   OR ("remainingInstallmentsDecimal" IS NULL AND ABS(ROUND("remainingInstallments"::numeric, 2)) < 10000000000000)
   OR ("budgetMinDecimal" IS NULL AND ABS(ROUND("budgetMin"::numeric, 2)) < 10000000000000)
   OR ("budgetMaxDecimal" IS NULL AND ABS(ROUND("budgetMax"::numeric, 2)) < 10000000000000)
   OR ("installmentAmountDecimal" IS NULL AND ABS(ROUND("installmentAmount"::numeric, 2)) < 10000000000000);

UPDATE "Property" SET
  "priceDecimal" = COALESCE("priceDecimal", CASE WHEN ABS(ROUND("price"::numeric, 2)) < 10000000000000 THEN ROUND("price"::numeric, 2) END),
  "monthlyInstallmentDecimal" = COALESCE("monthlyInstallmentDecimal", CASE WHEN ABS(ROUND("monthlyInstallment"::numeric, 2)) < 10000000000000 THEN ROUND("monthlyInstallment"::numeric, 2) END),
  "installmentPercentageDecimal" = COALESCE("installmentPercentageDecimal", CASE WHEN ABS(ROUND("installmentPercentage"::numeric, 2)) < 1000 THEN ROUND("installmentPercentage"::numeric, 2) END)
WHERE ("priceDecimal" IS NULL AND ABS(ROUND("price"::numeric, 2)) < 10000000000000)
   OR ("monthlyInstallmentDecimal" IS NULL AND ABS(ROUND("monthlyInstallment"::numeric, 2)) < 10000000000000)
   OR ("installmentPercentageDecimal" IS NULL AND ABS(ROUND("installmentPercentage"::numeric, 2)) < 1000);

UPDATE "Deal" SET
  "valueDecimal" = COALESCE("valueDecimal", CASE WHEN ABS(ROUND("value"::numeric, 2)) < 10000000000000 THEN ROUND("value"::numeric, 2) END),
  "commissionRateDecimal" = COALESCE("commissionRateDecimal", CASE WHEN ABS(ROUND("commission"::numeric, 2)) < 1000 THEN ROUND("commission"::numeric, 2) END),
  "commissionAmtDecimal" = COALESCE("commissionAmtDecimal", CASE WHEN ABS(ROUND("commissionAmt"::numeric, 2)) < 10000000000000 THEN ROUND("commissionAmt"::numeric, 2) END),
  "finalPriceDecimal" = COALESCE("finalPriceDecimal", CASE WHEN ABS(ROUND("finalPrice"::numeric, 2)) < 10000000000000 THEN ROUND("finalPrice"::numeric, 2) END)
WHERE ("valueDecimal" IS NULL AND ABS(ROUND("value"::numeric, 2)) < 10000000000000)
   OR ("commissionRateDecimal" IS NULL AND ABS(ROUND("commission"::numeric, 2)) < 1000)
   OR ("commissionAmtDecimal" IS NULL AND ABS(ROUND("commissionAmt"::numeric, 2)) < 10000000000000)
   OR ("finalPriceDecimal" IS NULL AND ABS(ROUND("finalPrice"::numeric, 2)) < 10000000000000);

UPDATE "Commission" SET
  "amountDecimal" = COALESCE("amountDecimal", CASE WHEN ABS(ROUND("amount"::numeric, 2)) < 10000000000000 THEN ROUND("amount"::numeric, 2) END)
WHERE ("amountDecimal" IS NULL AND ABS(ROUND("amount"::numeric, 2)) < 10000000000000);

UPDATE "FinancialTransaction" SET
  "amountDecimal" = COALESCE("amountDecimal", CASE WHEN ABS(ROUND("amount"::numeric, 2)) < 10000000000000 THEN ROUND("amount"::numeric, 2) END)
WHERE ("amountDecimal" IS NULL AND ABS(ROUND("amount"::numeric, 2)) < 10000000000000);

UPDATE "PropertyOwnership" SET
  "percentageDecimal" = COALESCE("percentageDecimal", CASE WHEN "percentage" > 0 AND "percentage" <= 100 AND ROUND("percentage"::numeric, 2) > 0 THEN ROUND("percentage"::numeric, 2) END)
WHERE ("percentageDecimal" IS NULL AND "percentage" > 0 AND "percentage" <= 100 AND ROUND("percentage"::numeric, 2) > 0);

-- Restrict each update trigger to legacy columns, so updating a decimal alone
-- during a supervised reconciliation does not overwrite that value.
CREATE TRIGGER "User_sync_decimal_fields"
BEFORE INSERT OR UPDATE OF "salaryBase" ON "User"
FOR EACH ROW EXECUTE FUNCTION dark_crm_sync_decimal_fields('salaryBase', 'salaryBaseDecimal');

CREATE TRIGGER "Customer_sync_decimal_fields"
BEFORE INSERT OR UPDATE OF "askingPrice", "remainingInstallments", "budgetMin", "budgetMax", "installmentAmount" ON "Customer"
FOR EACH ROW EXECUTE FUNCTION dark_crm_sync_decimal_fields('askingPrice', 'askingPriceDecimal', 'remainingInstallments', 'remainingInstallmentsDecimal', 'budgetMin', 'budgetMinDecimal', 'budgetMax', 'budgetMaxDecimal', 'installmentAmount', 'installmentAmountDecimal');

CREATE TRIGGER "Property_sync_decimal_fields"
BEFORE INSERT OR UPDATE OF "price", "monthlyInstallment", "installmentPercentage" ON "Property"
FOR EACH ROW EXECUTE FUNCTION dark_crm_sync_decimal_fields('price', 'priceDecimal', 'monthlyInstallment', 'monthlyInstallmentDecimal', 'installmentPercentage', 'installmentPercentageDecimal');

CREATE TRIGGER "Deal_sync_decimal_fields"
BEFORE INSERT OR UPDATE OF "value", "commission", "commissionAmt", "finalPrice" ON "Deal"
FOR EACH ROW EXECUTE FUNCTION dark_crm_sync_decimal_fields('value', 'valueDecimal', 'commission', 'commissionRateDecimal', 'commissionAmt', 'commissionAmtDecimal', 'finalPrice', 'finalPriceDecimal');

CREATE TRIGGER "Commission_sync_decimal_fields"
BEFORE INSERT OR UPDATE OF "amount" ON "Commission"
FOR EACH ROW EXECUTE FUNCTION dark_crm_sync_decimal_fields('amount', 'amountDecimal');

CREATE TRIGGER "FinancialTransaction_sync_decimal_fields"
BEFORE INSERT OR UPDATE OF "amount" ON "FinancialTransaction"
FOR EACH ROW EXECUTE FUNCTION dark_crm_sync_decimal_fields('amount', 'amountDecimal');

CREATE TRIGGER "PropertyOwnership_sync_decimal_fields"
BEFORE INSERT OR UPDATE OF "percentage" ON "PropertyOwnership"
FOR EACH ROW EXECUTE FUNCTION dark_crm_sync_decimal_fields('percentage', 'percentageDecimal');

CREATE INDEX "LoginAttempt_ip_createdAt_idx" ON "LoginAttempt"("ip", "createdAt");
CREATE INDEX "LoginAttempt_email_success_createdAt_idx" ON "LoginAttempt"("email", "success", "createdAt");

COMMIT;
