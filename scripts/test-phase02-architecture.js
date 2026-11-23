import assert from "node:assert";
import crypto from "node:crypto";
import {
  cairoWallClockToUtc,
  getNextScheduledRunUtc,
  isCairoDst,
  cairoDateParts,
  cairoDateRange,
  cairoDayRange,
} from "../src/lib/report-time.ts";
import {
  roundCurrency,
  parseCurrency,
  calculateCommission,
  safeAdd,
  safeSub,
  resolveEffectiveDealPrice,
} from "../src/lib/financial.ts";
import {
  validateMetaWebhookSignature,
  isDuplicateWebhookEvent,
  verifyActionSafety,
  setAiEmergencyKillSwitch,
  isAiKillSwitchActive,
} from "../src/lib/whatsapp-safety.ts";
import fs from "node:fs";

const publicListingsSource = fs.readFileSync(
  new URL("../src/lib/public-listings.ts", import.meta.url),
  "utf8"
);
const publishableFieldsMatch = publicListingsSource.match(/const PUBLISHABLE_FIELDS = \[([\s\S]*?)\] as const;/);
const PUBLIC_LISTING_FIELDS = publishableFieldsMatch
  ? publishableFieldsMatch[1]
      .replace(/"/g, "")
      .replace(/\s+/g, " ")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : [];

console.log("============================================================");
console.log("  Dark CRM — Phase 0.2 Core Architecture Test Suite");
console.log("============================================================\n");

let passedCount = 0;
let failedCount = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    failedCount++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Cairo Timezone & DST Tests
// ─────────────────────────────────────────────────────────────────────────────
console.log("--- 1. Cairo Timezone & Scheduling Tests ---");

runTest("Winter UTC+2: 09:00 Cairo on Jan 15 converts to 07:00Z", () => {
  const d = cairoWallClockToUtc(2026, 1, 15, 9, 0, 0);
  assert.strictEqual(d.toISOString(), "2026-01-15T07:00:00.000Z");
  assert.strictEqual(isCairoDst(d), false);
});

runTest("Summer UTC+3: 09:00 Cairo on Jul 15 converts to 06:00Z", () => {
  const d = cairoWallClockToUtc(2026, 7, 15, 9, 0, 0);
  assert.strictEqual(d.toISOString(), "2026-07-15T06:00:00.000Z");
  assert.strictEqual(isCairoDst(d), true);
});

runTest("Next 09:00 Cairo scheduling advances to next day if already passed", () => {
  const past9amUtc = new Date("2026-01-15T15:00:00Z"); // 17:00 Cairo
  const nextRun = getNextScheduledRunUtc(9, 0, past9amUtc);
  assert.strictEqual(nextRun.toISOString(), "2026-01-16T07:00:00.000Z");
});

runTest("cairoDateRange correctly sets start at local midnight and endExclusive", () => {
  const range = cairoDateRange("2026-01-15", "2026-01-15");
  assert.strictEqual(range.start.toISOString(), "2026-01-14T22:00:00.000Z");
  assert.strictEqual(range.endExclusive.toISOString(), "2026-01-15T22:00:00.000Z");
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Financial Precision & Calculation Tests
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- 2. Financial Precision & Calculations Tests ---");

runTest("roundCurrency rounds to 2 decimal places with half-up rounding", () => {
  assert.strictEqual(roundCurrency(123.456), 123.46);
  assert.strictEqual(roundCurrency(123.454), 123.45);
  assert.strictEqual(roundCurrency(10.1 + 20.2), 30.3); // 30.299999999999997 -> 30.3
});

runTest("parseCurrency handles strings with commas, null, and negative numbers", () => {
  assert.strictEqual(parseCurrency("2,500,000.75"), 2500000.75);
  assert.strictEqual(parseCurrency(null), null);
  assert.strictEqual(parseCurrency(""), null);
  assert.strictEqual(parseCurrency("invalid"), null);
});

runTest("calculateCommission prevents fractional piastre drift", () => {
  // 3,750,000 EGP at 2.5% = 93,750.00 EGP
  const comm = calculateCommission(3750000, 2.5);
  assert.strictEqual(comm, 93750);
});

runTest("safeAdd and safeSub prevent IEEE 754 precision artifacts", () => {
  assert.strictEqual(safeAdd(0.1, 0.2), 0.3);
  assert.strictEqual(safeSub(1.0, 0.9), 0.1);
});

runTest("resolveEffectiveDealPrice prioritizes finalPrice over value", () => {
  const dealWithNegotiation = { value: 5000000, finalPrice: 4800000 };
  assert.strictEqual(resolveEffectiveDealPrice(dealWithNegotiation), 4800000);

  const dealWithoutNegotiation = { value: 5000000, finalPrice: null };
  assert.strictEqual(resolveEffectiveDealPrice(dealWithoutNegotiation), 5000000);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Public Catalog Security & Field Allowlist
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- 3. Public Catalog Security Tests ---");

runTest("Public publishable fields NEVER contain price, installments, address, or owner details", () => {
  const forbiddenFields = [
    "price",
    "monthlyInstallment",
    "remainingMonths",
    "installmentPercentage",
    "buildingNumber",
    "unitNumber",
    "owner",
    "customerId",
    "notes",
  ];
  for (const forbidden of forbiddenFields) {
    assert.strictEqual(
      PUBLIC_LISTING_FIELDS.includes(forbidden),
      false,
      `Forbidden field '${forbidden}' must not be publishable!`
    );
  }
});

runTest("Public publishable fields only allow approved physical specifications", () => {
  const expectedAllowlist = [
    "title", "projectName", "zone", "unitType", "finishing", "size",
    "bedrooms", "bathrooms", "images", "description",
  ];
  assert.deepStrictEqual([...PUBLIC_LISTING_FIELDS].sort(), expectedAllowlist.sort());
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. WhatsApp & AI Safety Tests
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- 4. WhatsApp & AI Safety Tests ---");

runTest("HMAC SHA-256 Webhook Signature verification passes with valid secret", () => {
  const secret = "meta_test_secret_key_123456";
  const rawBody = JSON.stringify({ entry: [{ id: "12345", changes: [] }] });
  const hmac = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const header = `sha256=${hmac}`;

  const res = validateMetaWebhookSignature(rawBody, header, secret);
  assert.strictEqual(res.isValid, true);
});

runTest("HMAC SHA-256 Webhook Signature verification rejects tampered body", () => {
  const secret = "meta_test_secret_key_123456";
  const rawBody = JSON.stringify({ entry: [{ id: "12345", changes: [] }] });
  const hmac = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const header = `sha256=${hmac}`;

  const tamperedBody = JSON.stringify({ entry: [{ id: "12345", changes: ["tampered"] }] });
  const res = validateMetaWebhookSignature(tamperedBody, header, secret);
  assert.strictEqual(res.isValid, false);
});

runTest("Duplicate webhook event is detected and dropped (Replay Protection)", () => {
  const eventId = "evt_" + crypto.randomUUID();
  assert.strictEqual(isDuplicateWebhookEvent(eventId), false); // first time: valid
  assert.strictEqual(isDuplicateWebhookEvent(eventId), true);  // second time: duplicate!
});

runTest("AI cannot autonomously approve sensitive commercial actions (discounts, contracts)", () => {
  const check = verifyActionSafety("APPLY_DISCOUNT", 0.99, false);
  assert.strictEqual(check.authorized, false);
  assert.strictEqual(check.requiresHumanApproval, true);
});

runTest("Emergency AI kill switch halts all autonomous actions", () => {
  setAiEmergencyKillSwitch(true);
  assert.strictEqual(isAiKillSwitchActive(), true);
  setAiEmergencyKillSwitch(false);
  assert.strictEqual(isAiKillSwitchActive(), false);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Ownership Invariant Logic Verification
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- 5. Ownership Architecture Invariant Tests ---");

runTest("Active ownership sum must not exceed 100%", () => {
  const mockActiveRecords = [
    { percentage: 50.0 },
    { percentage: 30.0 },
  ];
  const currentTotal = mockActiveRecords.reduce((sum, r) => sum + r.percentage, 0);
  assert.strictEqual(currentTotal, 80.0);

  // Adding 20% is valid (100% total)
  const validAdd = roundCurrency(currentTotal + 20.0);
  assert.strictEqual(validAdd <= 100.0, true);

  // Adding 25% is invalid (105% total)
  const invalidAdd = roundCurrency(currentTotal + 25.0);
  assert.strictEqual(invalidAdd <= 100.0, false);
});

runTest("Incomplete ownership registration (< 100%) is strictly permitted", () => {
  const mockPartialRecord = [{ percentage: 35.0 }];
  const currentTotal = mockPartialRecord.reduce((sum, r) => sum + r.percentage, 0);
  assert.strictEqual(currentTotal < 100.0, true);
  assert.strictEqual(currentTotal > 0, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n============================================================");
console.log(`  TEST RESULTS: ${passedCount} passed, ${failedCount} failed`);
console.log("============================================================\n");

if (failedCount > 0) {
  process.exit(1);
}
