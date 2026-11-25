-- Run against a disposable restored copy. Returns counts, never customer data.
BEGIN READ ONLY;

SELECT 'User.salaryBase' AS field,
       COUNT(*) FILTER (WHERE "salaryBaseDecimal" IS NULL AND "salaryBase" IS NOT NULL AND (ABS(ROUND("salaryBase"::numeric, 2)) < 10000000000000)) AS pending,
       COUNT(*) FILTER (WHERE "salaryBase" IS NOT NULL AND NOT (ABS(ROUND("salaryBase"::numeric, 2)) < 10000000000000)) AS out_of_range,
       COUNT(*) FILTER (WHERE "salaryBaseDecimal" IS NOT NULL AND "salaryBaseDecimal" IS DISTINCT FROM ROUND("salaryBase"::numeric, 2)) AS mismatched
FROM "User"
UNION ALL
SELECT 'Customer.askingPrice' AS field,
       COUNT(*) FILTER (WHERE "askingPriceDecimal" IS NULL AND "askingPrice" IS NOT NULL AND (ABS(ROUND("askingPrice"::numeric, 2)) < 10000000000000)) AS pending,
       COUNT(*) FILTER (WHERE "askingPrice" IS NOT NULL AND NOT (ABS(ROUND("askingPrice"::numeric, 2)) < 10000000000000)) AS out_of_range,
       COUNT(*) FILTER (WHERE "askingPriceDecimal" IS NOT NULL AND "askingPriceDecimal" IS DISTINCT FROM ROUND("askingPrice"::numeric, 2)) AS mismatched
FROM "Customer"
UNION ALL
SELECT 'Customer.remainingInstallments' AS field,
       COUNT(*) FILTER (WHERE "remainingInstallmentsDecimal" IS NULL AND "remainingInstallments" IS NOT NULL AND (ABS(ROUND("remainingInstallments"::numeric, 2)) < 10000000000000)) AS pending,
       COUNT(*) FILTER (WHERE "remainingInstallments" IS NOT NULL AND NOT (ABS(ROUND("remainingInstallments"::numeric, 2)) < 10000000000000)) AS out_of_range,
       COUNT(*) FILTER (WHERE "remainingInstallmentsDecimal" IS NOT NULL AND "remainingInstallmentsDecimal" IS DISTINCT FROM ROUND("remainingInstallments"::numeric, 2)) AS mismatched
FROM "Customer"
UNION ALL
SELECT 'Customer.budgetMin' AS field,
       COUNT(*) FILTER (WHERE "budgetMinDecimal" IS NULL AND "budgetMin" IS NOT NULL AND (ABS(ROUND("budgetMin"::numeric, 2)) < 10000000000000)) AS pending,
       COUNT(*) FILTER (WHERE "budgetMin" IS NOT NULL AND NOT (ABS(ROUND("budgetMin"::numeric, 2)) < 10000000000000)) AS out_of_range,
       COUNT(*) FILTER (WHERE "budgetMinDecimal" IS NOT NULL AND "budgetMinDecimal" IS DISTINCT FROM ROUND("budgetMin"::numeric, 2)) AS mismatched
FROM "Customer"
UNION ALL
SELECT 'Customer.budgetMax' AS field,
       COUNT(*) FILTER (WHERE "budgetMaxDecimal" IS NULL AND "budgetMax" IS NOT NULL AND (ABS(ROUND("budgetMax"::numeric, 2)) < 10000000000000)) AS pending,
       COUNT(*) FILTER (WHERE "budgetMax" IS NOT NULL AND NOT (ABS(ROUND("budgetMax"::numeric, 2)) < 10000000000000)) AS out_of_range,
       COUNT(*) FILTER (WHERE "budgetMaxDecimal" IS NOT NULL AND "budgetMaxDecimal" IS DISTINCT FROM ROUND("budgetMax"::numeric, 2)) AS mismatched
FROM "Customer"
UNION ALL
SELECT 'Customer.installmentAmount' AS field,
       COUNT(*) FILTER (WHERE "installmentAmountDecimal" IS NULL AND "installmentAmount" IS NOT NULL AND (ABS(ROUND("installmentAmount"::numeric, 2)) < 10000000000000)) AS pending,
       COUNT(*) FILTER (WHERE "installmentAmount" IS NOT NULL AND NOT (ABS(ROUND("installmentAmount"::numeric, 2)) < 10000000000000)) AS out_of_range,
       COUNT(*) FILTER (WHERE "installmentAmountDecimal" IS NOT NULL AND "installmentAmountDecimal" IS DISTINCT FROM ROUND("installmentAmount"::numeric, 2)) AS mismatched
FROM "Customer"
UNION ALL
SELECT 'Property.price' AS field,
       COUNT(*) FILTER (WHERE "priceDecimal" IS NULL AND "price" IS NOT NULL AND (ABS(ROUND("price"::numeric, 2)) < 10000000000000)) AS pending,
       COUNT(*) FILTER (WHERE "price" IS NOT NULL AND NOT (ABS(ROUND("price"::numeric, 2)) < 10000000000000)) AS out_of_range,
       COUNT(*) FILTER (WHERE "priceDecimal" IS NOT NULL AND "priceDecimal" IS DISTINCT FROM ROUND("price"::numeric, 2)) AS mismatched
FROM "Property"
UNION ALL
SELECT 'Property.monthlyInstallment' AS field,
       COUNT(*) FILTER (WHERE "monthlyInstallmentDecimal" IS NULL AND "monthlyInstallment" IS NOT NULL AND (ABS(ROUND("monthlyInstallment"::numeric, 2)) < 10000000000000)) AS pending,
       COUNT(*) FILTER (WHERE "monthlyInstallment" IS NOT NULL AND NOT (ABS(ROUND("monthlyInstallment"::numeric, 2)) < 10000000000000)) AS out_of_range,
       COUNT(*) FILTER (WHERE "monthlyInstallmentDecimal" IS NOT NULL AND "monthlyInstallmentDecimal" IS DISTINCT FROM ROUND("monthlyInstallment"::numeric, 2)) AS mismatched
FROM "Property"
UNION ALL
SELECT 'Property.installmentPercentage' AS field,
       COUNT(*) FILTER (WHERE "installmentPercentageDecimal" IS NULL AND "installmentPercentage" IS NOT NULL AND (ABS(ROUND("installmentPercentage"::numeric, 2)) < 1000)) AS pending,
       COUNT(*) FILTER (WHERE "installmentPercentage" IS NOT NULL AND NOT (ABS(ROUND("installmentPercentage"::numeric, 2)) < 1000)) AS out_of_range,
       COUNT(*) FILTER (WHERE "installmentPercentageDecimal" IS NOT NULL AND "installmentPercentageDecimal" IS DISTINCT FROM ROUND("installmentPercentage"::numeric, 2)) AS mismatched
FROM "Property"
UNION ALL
SELECT 'Deal.value' AS field,
       COUNT(*) FILTER (WHERE "valueDecimal" IS NULL AND "value" IS NOT NULL AND (ABS(ROUND("value"::numeric, 2)) < 10000000000000)) AS pending,
       COUNT(*) FILTER (WHERE "value" IS NOT NULL AND NOT (ABS(ROUND("value"::numeric, 2)) < 10000000000000)) AS out_of_range,
       COUNT(*) FILTER (WHERE "valueDecimal" IS NOT NULL AND "valueDecimal" IS DISTINCT FROM ROUND("value"::numeric, 2)) AS mismatched
FROM "Deal"
UNION ALL
SELECT 'Deal.commission' AS field,
       COUNT(*) FILTER (WHERE "commissionRateDecimal" IS NULL AND "commission" IS NOT NULL AND (ABS(ROUND("commission"::numeric, 2)) < 1000)) AS pending,
       COUNT(*) FILTER (WHERE "commission" IS NOT NULL AND NOT (ABS(ROUND("commission"::numeric, 2)) < 1000)) AS out_of_range,
       COUNT(*) FILTER (WHERE "commissionRateDecimal" IS NOT NULL AND "commissionRateDecimal" IS DISTINCT FROM ROUND("commission"::numeric, 2)) AS mismatched
FROM "Deal"
UNION ALL
SELECT 'Deal.commissionAmt' AS field,
       COUNT(*) FILTER (WHERE "commissionAmtDecimal" IS NULL AND "commissionAmt" IS NOT NULL AND (ABS(ROUND("commissionAmt"::numeric, 2)) < 10000000000000)) AS pending,
       COUNT(*) FILTER (WHERE "commissionAmt" IS NOT NULL AND NOT (ABS(ROUND("commissionAmt"::numeric, 2)) < 10000000000000)) AS out_of_range,
       COUNT(*) FILTER (WHERE "commissionAmtDecimal" IS NOT NULL AND "commissionAmtDecimal" IS DISTINCT FROM ROUND("commissionAmt"::numeric, 2)) AS mismatched
FROM "Deal"
UNION ALL
SELECT 'Deal.finalPrice' AS field,
       COUNT(*) FILTER (WHERE "finalPriceDecimal" IS NULL AND "finalPrice" IS NOT NULL AND (ABS(ROUND("finalPrice"::numeric, 2)) < 10000000000000)) AS pending,
       COUNT(*) FILTER (WHERE "finalPrice" IS NOT NULL AND NOT (ABS(ROUND("finalPrice"::numeric, 2)) < 10000000000000)) AS out_of_range,
       COUNT(*) FILTER (WHERE "finalPriceDecimal" IS NOT NULL AND "finalPriceDecimal" IS DISTINCT FROM ROUND("finalPrice"::numeric, 2)) AS mismatched
FROM "Deal"
UNION ALL
SELECT 'Commission.amount' AS field,
       COUNT(*) FILTER (WHERE "amountDecimal" IS NULL AND "amount" IS NOT NULL AND (ABS(ROUND("amount"::numeric, 2)) < 10000000000000)) AS pending,
       COUNT(*) FILTER (WHERE "amount" IS NOT NULL AND NOT (ABS(ROUND("amount"::numeric, 2)) < 10000000000000)) AS out_of_range,
       COUNT(*) FILTER (WHERE "amountDecimal" IS NOT NULL AND "amountDecimal" IS DISTINCT FROM ROUND("amount"::numeric, 2)) AS mismatched
FROM "Commission"
UNION ALL
SELECT 'FinancialTransaction.amount' AS field,
       COUNT(*) FILTER (WHERE "amountDecimal" IS NULL AND "amount" IS NOT NULL AND (ABS(ROUND("amount"::numeric, 2)) < 10000000000000)) AS pending,
       COUNT(*) FILTER (WHERE "amount" IS NOT NULL AND NOT (ABS(ROUND("amount"::numeric, 2)) < 10000000000000)) AS out_of_range,
       COUNT(*) FILTER (WHERE "amountDecimal" IS NOT NULL AND "amountDecimal" IS DISTINCT FROM ROUND("amount"::numeric, 2)) AS mismatched
FROM "FinancialTransaction"
UNION ALL
SELECT 'PropertyOwnership.percentage' AS field,
       COUNT(*) FILTER (WHERE "percentageDecimal" IS NULL AND "percentage" IS NOT NULL AND ("percentage" > 0 AND "percentage" <= 100 AND ROUND("percentage"::numeric, 2) > 0)) AS pending,
       COUNT(*) FILTER (WHERE "percentage" IS NOT NULL AND NOT ("percentage" > 0 AND "percentage" <= 100 AND ROUND("percentage"::numeric, 2) > 0)) AS out_of_range,
       COUNT(*) FILTER (WHERE "percentageDecimal" IS NOT NULL AND "percentageDecimal" IS DISTINCT FROM ROUND("percentage"::numeric, 2)) AS mismatched
FROM "PropertyOwnership";

SELECT 'commissions_without_deal' AS metric, COUNT(*) AS rows
FROM "Commission" WHERE "dealId" IS NULL
UNION ALL
SELECT 'orphan_push_subscriptions', COUNT(*)
FROM "PushSubscription" s LEFT JOIN "User" u ON u.id = s."userId"
WHERE u.id IS NULL
UNION ALL
SELECT 'legacy_ownership_rows_out_of_range', COUNT(*)
FROM "PropertyOwnership"
WHERE NOT (percentage > 0 AND percentage <= 100 AND
  ("percentageDecimal" IS NULL OR "percentageDecimal" BETWEEN 0.01 AND 100) AND
  ("effectiveTo" IS NULL OR "effectiveTo" >= "effectiveFrom"))
UNION ALL
SELECT 'properties_above_100_percent', COUNT(*)
FROM (
  SELECT "propertyId" FROM "PropertyOwnership"
  WHERE "isCurrent" AND "effectiveTo" IS NULL
  GROUP BY "propertyId"
  HAVING SUM(COALESCE("percentageDecimal", ROUND(percentage::numeric, 2))) > 100
) totals;

SELECT type, status, COUNT(*) AS movements,
       SUM(ROUND(amount::numeric, 2)) AS legacy_total,
       SUM(COALESCE("amountDecimal", ROUND(amount::numeric, 2))) AS decimal_total
FROM "FinancialTransaction"
WHERE ABS(ROUND(amount::numeric, 2)) < 10000000000000
GROUP BY type, status
ORDER BY type, status;

COMMIT;
