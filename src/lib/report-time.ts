const CAIRO_TIME_ZONE = "Africa/Cairo";

function cairoDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAIRO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day) };
}

function cairoMidnightUtc(year: number, month: number, day: number) {
  // Resolve local midnight through timezone rules (including DST transitions).
  const nominalUtc = Date.UTC(year, month - 1, day);
  const guess = new Date(nominalUtc - 2 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CAIRO_TIME_ZONE, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(guess);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const representedUtc = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute));
  const offset = representedUtc - guess.getTime();
  return new Date(nominalUtc - offset);
}

export function cairoDayRange(now = new Date()) {
  const { year, month, day } = cairoDateParts(now);
  const start = cairoMidnightUtc(year, month, day);
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
  const endExclusive = cairoMidnightUtc(nextDay.getUTCFullYear(), nextDay.getUTCMonth() + 1, nextDay.getUTCDate());
  return { start, endExclusive };
}

export function cairoDateRange(startText: string, endText: string) {
  const parse = (value: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const [, y, m, d] = match;
    const year = Number(y), month = Number(m), day = Number(d);
    const check = new Date(Date.UTC(year, month - 1, day));
    if (check.getUTCFullYear() !== year || check.getUTCMonth() + 1 !== month || check.getUTCDate() !== day) return null;
    return { year, month, day };
  };
  const start = parse(startText), end = parse(endText);
  if (!start || !end) return { error: "Invalid date. Use YYYY-MM-DD." as const };
  if (Date.UTC(start.year, start.month - 1, start.day) > Date.UTC(end.year, end.month - 1, end.day)) {
    return { error: "Start date must be on or before end date." as const };
  }
  const nextDay = new Date(Date.UTC(end.year, end.month - 1, end.day + 1));
  return {
    start: cairoMidnightUtc(start.year, start.month, start.day),
    endExclusive: cairoMidnightUtc(nextDay.getUTCFullYear(), nextDay.getUTCMonth() + 1, nextDay.getUTCDate()),
  };
}

export function reportEmployeeScope(role: string, sessionId: string, requestedId?: string | null) {
  const manager = role === "GENERAL_MANAGER" || role === "SALES_MANAGER";
  return { isManager: manager, employeeId: manager ? (requestedId || null) : sessionId };
}
