# Foundation Schema (2026-11-26)

This migration prepares the database for the remaining CRM modules without a
destructive cutover of existing money columns.

## Added domain tables

- `Owner` + `PropertyOwner`: independent owners, ownership percentages and history.
- `Document`: typed files for ownership proof, contracts, receipts, customers and deals.
- `Reservation` + `Contract`: unit holds and contract lifecycle.
- `PaymentPlan` + `Installment` + `Payment`: schedules, due dates and immutable receipts.
- `JournalEntry`: accounting lines with reversal links.
- `Campaign` + `CustomerNeed`: structured marketing attribution and customer requirements.
- `Task` + `PublicListing` + `InventoryEvent` + `StatusHistory` + `IdempotencyKey`.

All new money/rate fields use `Decimal(15,2)` / `Decimal(5,2)`.

## Existing money fields

Legacy `Float` columns are intentionally retained for compatibility. Each money
field gets a nullable `*Decimal` shadow column, backfilled with explicit
`ROUND(value::numeric, 2)`. Later phases will:

1. dual-write the legacy and Decimal columns using decimal strings,
2. reconcile per-row values and aggregates,
3. switch API/RSC reads to the Decimal columns,
4. only then remove legacy columns in a separate approved migration.

`Customer.unitSize` and `Customer.preferredSize` are areas, not money, and are
not converted. `Deal.commission` is a rate; its shadow column is `Decimal(5,2)`.

## Database guards

- One approved `Reservation` per property (partial unique index).
- `PropertyOwner` percentages: each row between 0 and 100, and active rows per
  property cannot exceed 100 (trigger).
- `Payment.receiptNumber`, `Payment.idempotencyKey` and
  `IdempotencyKey(scope, key)` are unique.

## Not included yet

The migration creates tables only. API routes, dashboards, upload/download
handlers, job types and UI for these models still need to be built in the
following phases.
