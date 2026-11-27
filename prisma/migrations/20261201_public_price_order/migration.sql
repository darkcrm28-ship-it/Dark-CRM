BEGIN;

ALTER TABLE "Property" ADD COLUMN "publicAskingPrice" DOUBLE PRECISION;
UPDATE "Property"
SET "publicAskingPrice" = ("customData" #>> '{publicListing,askingPrice}')::double precision
WHERE jsonb_typeof("customData" #> '{publicListing,askingPrice}') = 'number'
  AND ("customData" #> '{publicListing,askingPrice}') > '0'::jsonb;

COMMIT;
