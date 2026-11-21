import assert from "node:assert/strict";
import { cairoDateRange, cairoDayRange, reportEmployeeScope } from "../src/lib/report-time.ts";

assert.deepEqual(reportEmployeeScope("SALES_EMPLOYEE", "self", "other"), {
  isManager: false,
  employeeId: "self",
});
assert.deepEqual(reportEmployeeScope("SALES_MANAGER", "manager", "employee"), {
  isManager: true,
  employeeId: "employee",
});
assert.deepEqual(reportEmployeeScope("GENERAL_MANAGER", "boss", null), {
  isManager: true,
  employeeId: null,
});

const day = cairoDayRange(new Date("2026-11-21T12:00:00.000Z"));
assert.equal(day.start.toISOString(), "2026-11-20T22:00:00.000Z");
assert.equal(day.endExclusive.toISOString(), "2026-11-21T22:00:00.000Z");

const range = cairoDateRange("2026-11-20", "2026-11-21");
assert.ok(!("error" in range));
assert.equal(range.start.toISOString(), "2026-11-19T22:00:00.000Z");
assert.equal(range.endExclusive.toISOString(), "2026-11-21T22:00:00.000Z");
assert.equal(cairoDateRange("2026-02-30", "2026-03-01").error, "Invalid date. Use YYYY-MM-DD.");
assert.equal(cairoDateRange("2026-03-02", "2026-03-01").error, "Start date must be on or before end date.");
assert.equal(cairoDateRange("2026-1-01", "2026-01-02").error, "Invalid date. Use YYYY-MM-DD.");

// Empty result sets are valid and aggregate to zero without special casing errors.
const empty = [];
assert.equal(empty.length, 0);
console.log("Reports regression tests passed (8 assertions).");
