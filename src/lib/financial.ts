/**
 * Dark CRM — Financial Precision & Currency Utilities
 * Precision: 2 decimal places (Egyptian Pound Piastres / قروش)
 * Avoids IEEE 754 binary floating-point representation artifacts.
 */

export const EGP_DECIMAL_PLACES = 2;
const FACTOR = Math.pow(10, EGP_DECIMAL_PLACES); // 100

/**
 * Rounds any monetary number to standard 2 decimal places (EGP piastres)
 * using half-up rounding.
 */
export function roundCurrency(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * FACTOR) / FACTOR;
}

/** Use the persisted decimal when present, with a legacy fallback during migration. */
export function readMoney(decimal: { toString(): string } | null | undefined, legacy: number | null | undefined) {
  const exact = decimal == null ? NaN : Number(decimal.toString());
  return Number.isFinite(exact) ? exact : roundCurrency(legacy ?? 0);
}

/**
 * Parses a string, number, or form input safely into a bounded positive currency amount.
 */
export function parseCurrency(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || isNaN(value)) return null;
    return roundCurrency(value);
  }
  const clean = String(value).replace(/,/g, "").trim();
  const n = parseFloat(clean);
  if (!Number.isFinite(n) || isNaN(n)) return null;
  return roundCurrency(n);
}

/**
 * Calculates commission amount from the effective transacted price and commission percentage.
 * Example: 2,500,000 EGP at 2.5% = 62,500.00 EGP
 */
export function calculateCommission(
  transactedPrice: number,
  commissionPercent: number
): number {
  if (!Number.isFinite(transactedPrice) || transactedPrice <= 0) return 0;
  if (!Number.isFinite(commissionPercent) || commissionPercent <= 0) return 0;

  // Compute via scaled cents to prevent fractional cent inaccuracy
  const priceCents = Math.round(transactedPrice * FACTOR);
  const commissionCents = Math.round((priceCents * commissionPercent) / 100);
  return commissionCents / FACTOR;
}

/**
 * Safe addition for currency values.
 */
export function safeAdd(a: number, b: number): number {
  const centsA = Math.round((a || 0) * FACTOR);
  const centsB = Math.round((b || 0) * FACTOR);
  return (centsA + centsB) / FACTOR;
}

/**
 * Safe subtraction for currency values.
 */
export function safeSub(a: number, b: number): number {
  const centsA = Math.round((a || 0) * FACTOR);
  const centsB = Math.round((b || 0) * FACTOR);
  return (centsA - centsB) / FACTOR;
}

/**
 * Formats a monetary number in EGP with proper thousands separators and decimals.
 */
export function formatCurrencyEGP(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "—";
  return amount.toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " ج.م";
}

/**
 * Resolves the true effective transacted deal price:
 * Prioritizes negotiated `finalPrice`; falls back to contract `value`.
 */
export function resolveEffectiveDealPrice(deal: {
  value: number;
  finalPrice?: number | null;
}): number {
  const effective = (deal.finalPrice !== null && deal.finalPrice !== undefined && deal.finalPrice > 0)
    ? deal.finalPrice
    : deal.value;
  return roundCurrency(effective);
}
