import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { signImageKitPath } from "../src/lib/imagekit-private.ts";
import { propertyLockKey, validateOwnershipSplit } from "../src/lib/ownership.ts";

const privateKey = "test-private-key";
const urlEndpoint = "https://ik.imagekit.io/test_id";
const filePath = "/dark-crm/documents/title-deed.pdf";
const expiresAt = 1800000000;

const expected = createHmac("sha1", privateKey)
  .update(`dark-crm/documents/title-deed.pdf${expiresAt}`, "utf8")
  .digest("hex");

assert.equal(
  await signImageKitPath({ privateKey, urlEndpoint, filePath, expiresAt }),
  expected,
  "signed URL signature must match ImageKit's HMAC-SHA1 algorithm"
);

const split = validateOwnershipSplit([
  { ownerId: "o1", percentage: "33.33" },
  { ownerId: "o2", percentage: 33.33 },
  { ownerId: "o3", percentage: "33.34" },
]);
assert.deepEqual(split, [
  { ownerId: "o1", percentage: "33.33" },
  { ownerId: "o2", percentage: "33.33" },
  { ownerId: "o3", percentage: "33.34" },
]);

const invalidCases = [
  [{ ownerId: "o1", percentage: "50" }],
  [{ ownerId: "o1", percentage: "100" }, { ownerId: "o1", percentage: "0.01" }],
  [{ ownerId: "o1", percentage: "100.01" }],
  [{ ownerId: "o1", percentage: "abc" }],
];
for (const input of invalidCases) {
  assert.throws(() => validateOwnershipSplit(input));
}

assert.equal(propertyLockKey("property-1"), propertyLockKey("property-1"));
assert.notEqual(propertyLockKey("property-1"), propertyLockKey("property-2"));
assert.ok(propertyLockKey("") >= 1);

console.log("Documents/ownership tests passed (signature + split validation + lock keys).");
