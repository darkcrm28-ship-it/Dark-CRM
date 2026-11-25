import assert from "node:assert/strict";
import {
  assertTransition,
  InvalidStatusTransitionError,
  StatusReasonRequiredError,
} from "../src/lib/state-machines.ts";
import {
  commissionFromPrice,
  isReservationReleaseStatus,
  normalizeCycleStatus,
  resolveContractAmounts,
} from "../src/lib/deal-cycle-rules.ts";

function expectThrow(fn, ErrorClass) {
  let thrown = null;
  try {
    fn();
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof ErrorClass, `expected ${ErrorClass.name}, got ${thrown}`);
}

// Reservation transitions: approval needs a manager and a reason.
assertTransition({
  entity: "Reservation",
  from: "PENDING",
  to: "APPROVED",
  reason: "عميل جاد",
  actorRole: "SALES_MANAGER",
});
expectThrow(
  () => assertTransition({ entity: "Reservation", from: "PENDING", to: "APPROVED", actorRole: "SALES_MANAGER" }),
  StatusReasonRequiredError
);
expectThrow(
  () => assertTransition({
    entity: "Reservation",
    from: "PENDING",
    to: "APPROVED",
    reason: " ok ",
    actorRole: "SALES_EMPLOYEE",
  }),
  InvalidStatusTransitionError
);
expectThrow(
  () => assertTransition({ entity: "Reservation", from: "APPROVED", to: "PENDING", reason: "x" }),
  InvalidStatusTransitionError
);

// Contract signing path.
assertTransition({ entity: "Contract", from: "DRAFT", to: "PENDING_APPROVAL" });
assertTransition({ entity: "Contract", from: "PENDING_APPROVAL", to: "APPROVED", actorRole: "GENERAL_MANAGER" });
assertTransition({ entity: "Contract", from: "APPROVED", to: "SIGNED", actorRole: "SALES_MANAGER" });
assertTransition({ entity: "Contract", from: "SIGNED", to: "TERMINATED", reason: "فسخ", actorRole: "GENERAL_MANAGER" });
expectThrow(
  () => assertTransition({ entity: "Contract", from: "SIGNED", to: "TERMINATED", reason: "فسخ", actorRole: "SALES_EMPLOYEE" }),
  InvalidStatusTransitionError
);

// Property effects of the cycle.
assert.equal(canTransitionProperty("AVAILABLE", "RESERVED", "حجز"), true);
assert.equal(canTransitionProperty("RESERVED", "SOLD", "توقيع عقد"), true);
assert.equal(canTransitionProperty("SOLD", "AVAILABLE", "خطأ", "SALES_MANAGER"), false);

function canTransitionProperty(from, to, reason, actorRole = "SALES_MANAGER") {
  try {
    assertTransition({ entity: "Property", from, to, reason, actorRole });
    return true;
  } catch {
    return false;
  }
}

// Amounts are resolved deterministically and commission is never guessed.
assert.equal(commissionFromPrice(1000000, 2.5), 25000);
assert.deepEqual(
  resolveContractAmounts({
    terms: { finalPrice: "1000000", commission: "2.5" },
    propertyPrice: 900000,
    reservationAmount: "1000",
  }),
  { finalPrice: 1000000, nominalValue: 1000000, commissionPercent: 2.5, commissionAmt: 25000 }
);
assert.deepEqual(
  resolveContractAmounts({
    terms: {},
    propertyPrice: 750000,
    reservationAmount: { toString: () => "12500" },
  }),
  { finalPrice: 750000, nominalValue: 750000, commissionPercent: 0, commissionAmt: 0 }
);
assert.equal(
  resolveContractAmounts({
    terms: { price: 500000, commission: 1, commissionAmt: 9000 },
    propertyPrice: null,
    reservationAmount: null,
  }).commissionAmt,
  9000
);

assert.equal(normalizeCycleStatus(" signed "), "SIGNED");
assert.equal(isReservationReleaseStatus("RELEASED"), true);
assert.equal(isReservationReleaseStatus("APPROVED"), false);

console.log("Deal cycle tests passed (transitions + contract amounts).");
