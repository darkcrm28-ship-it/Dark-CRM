-- Run with psql and ON_ERROR_STOP. The CSV contains only explicitly reviewed
-- commission_id,deal_id pairs; manual commissions may remain unlinked.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TEMP TABLE reviewed_commission_links (
  commission_id text PRIMARY KEY,
  deal_id       text NOT NULL UNIQUE
) ON COMMIT DROP;

\copy reviewed_commission_links (commission_id, deal_id) FROM 'reviewed-commissions.csv' WITH (FORMAT csv, HEADER true)

LOCK TABLE "Deal" IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE "Commission" IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM reviewed_commission_links r
    LEFT JOIN "Commission" c ON r.commission_id = c.id
    LEFT JOIN "Deal" d ON r.deal_id = d.id
    WHERE c.id IS NULL OR d.id IS NULL
       OR d."salesRepId" IS DISTINCT FROM c."userId"
       OR COALESCE(d."commissionAmtDecimal", ROUND(d."commissionAmt"::numeric, 2))
          IS DISTINCT FROM COALESCE(c."amountDecimal", ROUND(c.amount::numeric, 2))
       OR (c."dealId" IS NOT NULL AND c."dealId" <> r.deal_id)
       OR EXISTS (SELECT 1 FROM "Commission" linked WHERE linked."dealId" = r.deal_id AND linked.id <> c.id)
  ) THEN
    RAISE EXCEPTION 'Mapping rejected. Verify the commission, deal, sales representative, amount and existing links.';
  END IF;
END $$;

UPDATE "Commission" AS c
SET "dealId" = r.deal_id
FROM reviewed_commission_links AS r
WHERE c.id = r.commission_id AND c."dealId" IS NULL;

COMMIT;
