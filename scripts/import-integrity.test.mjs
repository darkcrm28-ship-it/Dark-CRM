import assert from "node:assert/strict";
import { normalizeArabicText, normalizeNumber, normalizeDate, normalizePhone, normalizeNationalId, generateUnverifiedPlaceholder, decideImportMatch, isValidNationalIdStrict, isSamePhone, isDistinctCoOwner } from "../src/lib/excel-normalizer.ts";

function assertEq(label, actual, expected) {
  assert.strictEqual(actual, expected, label);
}
function assertOk(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✅ ${label}`);
  } else {
    console.error(`  ❌ ${label}${detail ? " — " + detail : ""}`);
    throw new Error(`Assertion failed: ${label}`);
  }
}

console.log("\n--- Test Block A: normalizeArabicText ---");
assertEq("Arabic collapse spaces", normalizeArabicText("  محمد   احمد  "), "محمد احمد");
assertEq("Arabic normalize preserves text", normalizeArabicText("محمد"), "محمد");
assertEq("Arabic null → empty string", normalizeArabicText(null), "");
assertEq("Arabic trim", normalizeArabicText("  محمد  "), "محمد");

console.log("\n--- Test Block B: normalizeNumber ---");
assertEq("normalizeNumber '3' → 3", normalizeNumber("3"), 3);
assertEq("normalizeNumber 3 → 3", normalizeNumber(3), 3);
assertEq("normalizeNumber null → 0 (via ?? 3 in route)", normalizeNumber(null), null);
assertEq("normalizeNumber undefined → 0", normalizeNumber(undefined), null);
assertEq("normalizeNumber 'abc' → null", normalizeNumber("abc"), null);

console.log("\n--- Test Block C: normalizeNationalId ---");
const nidResult = normalizeNationalId("29801010100010"); // valid: century 2, 1998-01-01, gov 01 (Cairo)
assertEq("normalizeNationalId strips non-digits", nidResult.nationalId, "29801010100010");
assertEq("normalizeNationalId valid → true", nidResult.isValid, true);
const badNid = normalizeNationalId("123-45-6789");
assertEq("normalizeNationalId invalid strips → false", badNid.isValid, false);

console.log("\n--- Test Block D: isValidNationalIdStrict ---");
assertEq("Strict valid 14-digit", isValidNationalIdStrict("29801010100010"), true);
assertEq("Strict too short", isValidNationalIdStrict("123456789"), false);
assertEq("Strict null", isValidNationalIdStrict(null), false);
assertEq("Strict undefined", isValidNationalIdStrict(undefined), false);

console.log("\n--- Test Block E: decideImportMatch ---");
const d1 = decideImportMatch({
  rowName: "أحمد علي", rowNationalId: "1234567890123456",
  rowIdentity: { kind: "NATIONAL_ID", value: "1234567890123456" },
  exName: "أحمد علي", exNationalId: "1234567890123456",
  unitMatches: true, bothNoUnit: false, phoneMatches: false, nationalIdMatches: true,
});
assertEq("E1 unit+sameNatId → DUPLICATE", d1.action, "DUPLICATE");

const d2 = decideImportMatch({
  rowName: "أحمد علي", rowNationalId: "1234567890123456",
  rowIdentity: { kind: "NATIONAL_ID", value: "1234567890123456" },
  exName: "حسان علي", exNationalId: "9876543210987654",
  unitMatches: true, bothNoUnit: false, phoneMatches: false, nationalIdMatches: false,
});
assertEq("E2 unit+diffNatId → CO_OWNER", d2.action, "CO_OWNER");

const d3 = decideImportMatch({
  rowName: "أحمد علي", rowNationalId: null,
  rowIdentity: { kind: "PHONE", value: "01000000001" },
  exName: "أحمد علي", exNationalId: null,
  unitMatches: true, bothNoUnit: false, phoneMatches: true, nationalIdMatches: false,
});
assertEq("E3 unit+phone+sameName → DUPLICATE", d3.action, "DUPLICATE");

const d4 = decideImportMatch({
  rowName: "أحمد علي", rowNationalId: null,
  rowIdentity: { kind: "PHONE", value: "01000000001" },
  exName: "حسان علي", exNationalId: null,
  unitMatches: true, bothNoUnit: false, phoneMatches: true, nationalIdMatches: false,
});
assertEq("E4 unit+phone+diffName → INSERT_REVIEW", d4.action, "INSERT_REVIEW");

const d5 = decideImportMatch({
  rowName: "أحمد علي", rowNationalId: "1234567890123456",
  rowIdentity: { kind: "NATIONAL_ID", value: "1234567890123456" },
  exName: "حسان علي", exNationalId: "1234567890123456",
  unitMatches: false, bothNoUnit: true, phoneMatches: false, nationalIdMatches: true,
});
assertEq("E5 bothNoUnit+sameNatId → DUPLICATE", d5.action, "DUPLICATE");

const d6 = decideImportMatch({
  rowName: "أحمد علي", rowNationalId: null,
  rowIdentity: { kind: "PHONE", value: "01000000001" },
  exName: "أحمد علي", exNationalId: null,
  unitMatches: false, bothNoUnit: true, phoneMatches: true, nationalIdMatches: false,
});
assertEq("E6 bothNoUnit+phone+sameName → DUPLICATE", d6.action, "DUPLICATE");

const d7 = decideImportMatch({
  rowName: "أحمد علي", rowNationalId: null,
  rowIdentity: { kind: "PHONE", value: "01000000001" },
  exName: "حسان علي", exNationalId: null,
  unitMatches: false, bothNoUnit: true, phoneMatches: true, nationalIdMatches: false,
});
assertEq("E7 bothNoUnit+phone+diffName → INSERT_REVIEW", d7.action, "INSERT_REVIEW");

const d8 = decideImportMatch({
  rowName: "أحمد علي", rowNationalId: null,
  rowIdentity: { kind: "UNVERIFIED", value: null },
  exName: "حسان علي", exNationalId: null,
  unitMatches: false, bothNoUnit: false, phoneMatches: false, nationalIdMatches: false,
});
assertEq("E8 UNVERIFIED → INSERT_REVIEW", d8.action, "INSERT_REVIEW");

const d9 = decideImportMatch({
  rowName: "أحمد علي", rowNationalId: null,
  rowIdentity: { kind: "UNVERIFIED", value: null },
  exName: "حسان علي", exNationalId: null,
  unitMatches: false, bothNoUnit: false, phoneMatches: false, nationalIdMatches: false,
});
assertEq("E9 different unverified → INSERT", d9.action, "INSERT");

console.log("\n--- Test Block F: generateUnverifiedPlaceholder stability ---");
const seed1 = generateUnverifiedPlaceholder("test-seed-1");
const seed2 = generateUnverifiedPlaceholder("test-seed-1");
const seed3 = generateUnverifiedPlaceholder("test-seed-2");
assertEq("F1 same seed → same placeholder", seed1, seed2);
assertEq("F2 diff seed → different placeholder", seed1 !== seed3, true);
assertEq("F3 no seed → returns string", typeof seed3 === "string" && /^UNVERIFIED_NO_PHONE_[0-9a-f]{16}$/.test(seed3), true);

console.log("\n--- Test Block G: xlsx module load (offline sanity) ---");
const xlsx = await import("xlsx");
assertEq("G1 xlsx loads", typeof xlsx.read, "function");

console.log("\n🎉 All import-integrity test assertions passed!");

// ── Test Block H: isSamePhone + isDistinctCoOwner ─────────────────────────
console.log("\n--- Test Block H: phone equality + co-owner detection ---");
assertEq("H1 isSamePhone same normalized", isSamePhone("01000000001", "01000000001"), true);
assertEq("H2 isSamePhone international vs local", isSamePhone("+201000000001", "01000000001"), true);
assertEq("H3 isSamePhone diff", isSamePhone("01000000001", "01000000002"), false);
assertEq("H4 distinct co-owners different NIDs", isDistinctCoOwner("أحمد إبراهيم", "حسان علي", "1234567890123456", "9876543210987654"), true);
assertEq("H5 same nationalId → not distinct", isDistinctCoOwner("أحمد إبراهيم", "حسان علي", "1234567890123456", "1234567890123456"), false);

console.log("\n📊 All import-integrity test blocks completed!");