# Data architecture review — decision required before migrations

**Status:** review prepared; no schema change or migration approved/applied.

## Current verification gate

- `.env.test` is absent. The repository has only `.env.test.example`, which
  contains placeholders. No database connection was opened, and no test branch
  or production target was contacted.
- The configured `.env` target exactly matches `.env.production`; it is not a
  safe test target and was not used. A local PostgreSQL bootstrap failed because
  this sandbox cannot create the restricted process token and the bundled
  PostgreSQL package is missing `postgres.bki`. Docker has no running daemon.
- Creating a separate Render Postgres target was attempted on its free plan, but
  the provider returned HTTP 402 requiring billing information. No database was
  created. There is no Neon CLI/API token configured in the workspace.
- `pg_dump`, `pg_restore`, and `psql` are available locally, but a real dump and
  restore require an isolated source test branch and a second disposable restore
  target. Neither is currently configured.
- Therefore test isolation, restore integrity, and migration behavior remain
  unverified. Do not mark the phase gate complete based on the in-memory backup
  fixture or existing narrative checklists.

## Corrections needed in `FUTURE-DATA-ARCHITECTURE.md`

1. **Use the current domain names.** `Property` currently represents a unit
   record (unit number, building number, floor, area, price), not a development
   containing many units. Adding both `PropertyUnit` and a building-level
   `Property` without a canonical asset identity would duplicate concepts and
   break `Deal.propertyId`. Decide whether to keep `Property` as the unit or
   rename it through a staged compatibility plan before adding ownership.
2. **The sample schema is incomplete.** `PropertyType` is referenced but not
   declared; the proposed `PropertyUnit` relation has no model definition; and
   proposed relations to `Deal` and `User` need matching relation fields on
   those existing Prisma models.
3. **Ownership rules need transactional enforcement.**
   `@@unique([customerId, propertyId, status])` does not enforce one current
   ownership record per customer/property across status changes, nor a maximum
   aggregate share of 100%. Define one-active-ownership constraints and enforce
   total shares under a per-property transaction lock (or a database trigger).
   Transfer records must verify that source and destination ownership refer to
   the same property. Keep transfer history immutable.
4. **Choose one payment source of truth.** Storing `paidAmount` and
   `remainingAmount` beside payment allocations creates values that can drift.
   Prefer immutable receipts and allocation rows as the ledger, with balances
   and installment state derived transactionally. Define whether one receipt
   can allocate across several installments and whether one installment can
   have several receipts. Make receipt idempotency and financial-ledger linkage
   explicit.
5. **Correct the Decimal field inventory.** Existing fields are `Deal.value`,
   `Deal.finalPrice`, `Deal.commission` (rate), `Deal.commissionAmt`,
   `Property.price`, `Property.monthlyInstallment`, `Customer.askingPrice`,
   `Customer.budgetMin`, `Customer.budgetMax`, `Customer.installmentAmount`,
   `Commission.amount`, and `FinancialTransaction.amount`. The proposal names
   non-existent fields such as `Deal.dealValue`, `commissionRate`, and
   `Customer.budget`. `unitSize` and `preferredSize` are areas, not money.
6. **Replace the destructive Decimal cutover.** The sample step that drops the
   old column is not a non-destructive migration. Use additive shadow columns,
   backfill in bounded batches, compare per-row and aggregate values, dual-write
   using decimal strings (not JavaScript floating-point arithmetic), cut reads
   over only after reconciliation, and retain legacy columns through a separate
   approval and backup cycle. Specify the rounding rule before backfill.
7. **Separate published content from CRM inventory.** The current public DTO
   change prevents direct CRM serialization, but the durable target should be a
   separate `PublicListing` record with approved public copy/media, slug, and
   explicit status. Editing internal inventory should invalidate approval or
   create a new review revision. Public endpoints must read only published DTO
   rows and never fetch internal properties for serialization.
8. **Persist resumable import state server-side.** The current wizard retries a
   failed request during the active browser session, but a refresh loses the
   remaining rows and batch state. Do not put customer rows in `localStorage`.
   A resumable design needs an authorized server-side import-run/batch record
   with a stable run ID, per-batch payload or staged rows, content hash, status,
   attempt/result counts, owner, and retention policy. Resume must return only
   the authenticated manager's unfinished batches and use the existing
   idempotency rules to avoid double inserts. Review PII retention and backup
   treatment before adding that model.

## Actual role guard discrepancies found

These code observations contradict statements currently marked complete in
`CRM-REVIEW.md`; they are not claims about runtime-tested behavior:

| CRM review statement | Current guard found | Required follow-up |
| --- | --- | --- |
| Sales Manager can delete customers | `DELETE /api/customers` permits only `GENERAL_MANAGER` | Correct the matrix or explicitly change the policy after role-owner review |
| Only General Manager can delete a property | `DELETE /api/properties/:id` uses `SALES_MANAGER_ROLES`, which includes Sales Manager | Correct the matrix or narrow the route if intended |
| HR manages employee accounts | `GET /api/users` allows HR and GM; `POST` and `PUT /api/users` allow GM only | Treat HR as read-only until a specific edit scope is approved |
| Sales Employee can create own deals | Deal POST now permits sales employees only for customers assigned to them, and rechecks assignment inside the transaction | Runtime allow/deny tests remain pending an isolated database |
| Role list says Sales Agent | Code uses `SALES_EMPLOYEE` | Use one canonical role label in documentation and UI |

The current static role matrix is in `ROLE-PERMISSIONS.md`. Automated runtime
allow/deny checks still require the isolated test database and role fixtures.

## Recommended review order

1. Provision and prove the dedicated test branch; take a real backup and restore
   it into a separate disposable target.
2. Approve the canonical unit/property identity and ownership model.
3. Approve payment/receipt ledger semantics and Decimal rounding/cutover rules.
4. Approve the public-listing revision and invalidation lifecycle.
5. Only then generate additive migrations, apply them to the test branch, and
   reconcile all existing records before seeking production deployment approval.
