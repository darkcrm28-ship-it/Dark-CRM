/**
 * Pure rules for the reservation / contract cycle.
 * Kept free of framework imports so it can be unit-tested directly.
 */

const FACTOR = 100;

function toAmount(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const text = String(value).replace(/,/g, "").trim();
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round((parsed + Number.EPSILON) * FACTOR) / FACTOR;
}

function termsObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function commissionFromPrice(price: number, percent: number): number {
  if (!Number.isFinite(price) || price <= 0) return 0;
  if (!Number.isFinite(percent) || percent <= 0) return 0;
  const priceCents = Math.round(price * FACTOR);
  return Math.round((priceCents * percent) / 100) / FACTOR;
}

/**
 * Contract amounts come from its terms, with property price and an approved
 * reservation as fallbacks. Commission is never inferred from price alone.
 */
export function resolveContractAmounts(source: {
  terms: unknown;
  propertyPrice: number | null;
  reservationAmount: unknown;
}): {
  finalPrice: number;
  nominalValue: number;
  commissionPercent: number;
  commissionAmt: number;
} {
  const terms = termsObject(source.terms);
  const fallbackPrice = toAmount(
    terms.finalPrice ?? terms.price ?? source.propertyPrice ?? source.reservationAmount ?? 0
  );
  const commissionPercent = Math.max(0, toAmount(terms.commission ?? 0));
  const explicitCommission = toAmount(terms.commissionAmt ?? 0);
  const commissionAmt = explicitCommission > 0
    ? explicitCommission
    : commissionFromPrice(fallbackPrice, commissionPercent);

  return {
    finalPrice: fallbackPrice,
    nominalValue: Math.max(0, toAmount(terms.value ?? terms.nominalValue ?? fallbackPrice)),
    commissionPercent,
    commissionAmt,
  };
}

export function normalizeCycleStatus(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

export function isReservationReleaseStatus(status: string): boolean {
  return ["RELEASED", "EXPIRED", "CANCELLED"].includes(status);
}

export const RESERVATION_TARGET_STATUSES = new Set([
  "APPROVED",
  "CANCELLED",
  "RELEASED",
  "EXPIRED",
  "CONVERTED",
]);

export const CONTRACT_TARGET_STATUSES = new Set([
  "PENDING_APPROVAL",
  "APPROVED",
  "SIGNED",
  "REJECTED",
  "CANCELLED",
  "TERMINATED",
]);
