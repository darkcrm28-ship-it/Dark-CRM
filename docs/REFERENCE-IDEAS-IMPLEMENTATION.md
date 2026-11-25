# Reference Ideas Implementation (Safe / Non-conflicting)

> Status: additive implementation started on 2026-11-25.  
> Constraint: no edits to existing hot files to avoid conflicts with other sessions.  
> No schema migration applied. No tests run against DB.

## What was added

| Idea | Status | Files | Notes |
|---|---|---|---|
| 1. State machines / status transitions | Implemented (code) | `src/lib/state-machines.ts` | Explicit transitions, required reasons, role/system guards, history event shape. Needs wiring into routes/services and a persisted history table. |
| 2. Idempotency keys | Implemented (helper + draft) | `src/lib/idempotency.ts`, `docs/migration-drafts/20261126_reference_ideas.sql` | Advisory-lock helper now; real protection requires unique DB key/table. |
| 3. Installments tables | Draft only | `docs/migration-drafts/20261126_reference_ideas.sql` | Minimal `PaymentPlan`/`Installment`/`Payment` draft. Needs proper Prisma design, FKs, Decimal policy, and UI/API. |
| 4. Accounting reversal | Implemented (code) | `src/lib/reversals.ts` | Reverses `FinancialTransaction` by creating opposite entry and marking original `REVERSED`; writes audit log. Works with current schema. |
| 5. Contract extraction with human approval | Implemented (scaffold) | `src/lib/contract-extraction.ts` | Typed extraction/review/apply model. No DB or UI yet; AI output must remain pending until approved. |
| 6. Centralized manager scope | Implemented (code) | `src/lib/access-scope.ts` | `customerScopeWhere`, `scopedCustomerWhere`, `dealScopeWhere`, `reminderScopeWhere`. Routes can adopt incrementally. |
| 7. Session invalidation on authz change | Draft only | `docs/migration-drafts/20261126_reference_ideas.sql` | Draft adds `User.authzVersion`. Wiring needs careful edit to `src/lib/auth.ts` and session issuance; deferred to avoid conflict. |

## Not touched (to avoid conflicts)

- `prisma/schema.prisma`
- `src/lib/auth.ts`
- existing API routes under `src/app/api/**`
- existing dashboard/UI components
- migrations in `prisma/migrations/**`

## Recommended next wiring (when safe)

1. Add `IdempotencyKey` table + unique constraints; wire deal create and accounting sync.
2. Add `StatusHistory` table; call `assertTransition()` in property/deal/customer/reminder/commission updates.
3. Wire `reverseFinancialTransaction()` into accounting management flow (GM/Accounting only).
4. Adopt `access-scope.ts` in customer/deal/reminder/search/report routes.
5. Add `authzVersion` to `User`, include it in session token, verify in `getSession()`, bump on role/active change.
6. Design installment Prisma models and migration on isolated Neon branch; backfill from legacy fields.
7. Create `ContractExtraction` model + upload/review UI; only apply approved fields.

## Risk notes

- Draft SQL is not production-ready; split by concern and test on isolated Neon branch.
- `FinancialTransaction.amount` is still `Float` in current schema; reversal helper rounds via existing `financial.ts` but Decimal migration remains needed.
- Status maps are initial; confirm with product before enforcing in all routes.
