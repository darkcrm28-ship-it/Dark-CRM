import { Prisma } from "@prisma/client";

export type OwnershipShareInput = { ownerId: string; percentage: unknown };
export type OwnershipShare = { ownerId: string; percentage: string };

/**
 * Validates a complete ownership split for one property.
 *
 * Percentages are handled as decimal strings, never as JS floats, so 33.33 +
 * 33.33 + 33.34 exactly equals 100. Duplicate owners are rejected.
 */
export function validateOwnershipSplit(
  input: OwnershipShareInput[]
): OwnershipShare[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error("يجب تحديد مالك واحد على الأقل");
  }

  const seen = new Set<string>();
  const shares: OwnershipShare[] = [];
  let total = new Prisma.Decimal(0);

  for (const item of input) {
    if (typeof item.ownerId !== "string" || !item.ownerId) {
      throw new Error("معرّف المالك غير صالح");
    }
    if (seen.has(item.ownerId)) {
      throw new Error("لا يمكن تكرار المالك في نفس التوزيع");
    }
    seen.add(item.ownerId);

    const numeric = Number(item.percentage);
    if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 100) {
      throw new Error("نسبة الملكية يجب أن تكون بين 0 و100");
    }
    const percentage = new Prisma.Decimal(String(item.percentage)).toDecimalPlaces(2);
    if (percentage.lte(0) || percentage.gt(100)) {
      throw new Error("نسبة الملكية غير صالحة");
    }
    total = total.plus(percentage);
    shares.push({ ownerId: item.ownerId, percentage: percentage.toFixed(2) });
  }

  if (!total.equals(100)) {
    throw new Error("مجموع نسب الملكية يجب أن يساوي 100%");
  }
  return shares;
}

/** Stable 32-bit advisory-lock key derived from a property id. */
export function propertyLockKey(propertyId: string): number {
  let hash = 0;
  for (let i = 0; i < propertyId.length; i += 1) {
    hash = ((hash << 5) - hash + propertyId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}
