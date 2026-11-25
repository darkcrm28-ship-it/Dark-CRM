# Deal cycle (reservations + contracts)

The cycle uses the Foundation tables and adds no schema changes.

## Flow

1. `POST /api/reservations` creates a `PENDING` hold. Pending holds do not block the unit.
2. `PATCH /api/reservations/[id] { status: "APPROVED", reason }` (manager only):
   - a property advisory lock plus the partial unique index
     `Reservation_oneApprovedPerProperty_idx` prevent two approved holds on one unit;
   - the unit moves `AVAILABLE → RESERVED` through the shared state machine.
3. `POST /api/contracts` creates a `DRAFT` contract, optionally linked to an approved reservation.
4. Status path: `DRAFT → PENDING_APPROVAL → APPROVED → SIGNED`. Cancellation, rejection and
   termination use explicit transitions with a reason where required.
5. `PATCH /api/contracts/[id] { status: "SIGNED" }` (manager only), in one transaction:
   - the unit moves to `SOLD`;
   - the linked reservation becomes `CONVERTED`;
   - a linked deal is completed, or a new `COMPLETED` deal (and commission) is created;
   - the contract is linked to the deal.

Releasing, expiring or cancelling an approved reservation returns the unit to `AVAILABLE`
only if no other approved reservation still holds it.

## Behaviour change

`POST /api/deals` no longer creates a completed deal from customer + amount alone. It now
requires a `SIGNED` contract: pass `contractId`, or let the endpoint find an unused signed
contract for the same customer/unit. If none exists it returns `409 CONTRACT_REQUIRED`.
The normal path is signing a contract, which creates the deal automatically.

Contract amounts are read from `terms.finalPrice`, `terms.value`, `terms.commission` and
`terms.commissionAmt`, falling back to the property price and the reservation amount.
Commission is never inferred unless a percentage is supplied.

Dashboard: `/dashboard/deal-cycle`.
