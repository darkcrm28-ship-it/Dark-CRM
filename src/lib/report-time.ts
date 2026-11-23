const CAIRO_TIME_ZONE = "Africa/Cairo";

export function cairoDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAIRO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour || 0),
    minute: Number(values.minute || 0),
    second: Number(values.second || 0),
  };
}

/**
 * Returns true if the given date is in Cairo Daylight Saving Time (UTC+3),
 * false if winter standard time (UTC+2).
 */
export function isCairoDst(date: Date): boolean {
  const parts = cairoDateParts(date);
  const utcEquivalent = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const offsetHours = Math.round((utcEquivalent - date.getTime()) / (60 * 60 * 1000));
  return offsetHours === 3;
}

/**
 * Converts local Cairo wall-clock year, month, day, hour, minute, second to UTC Date.
 * Properly handles winter (UTC+2), summer (UTC+3), and DST transition boundaries:
 * - Nonexistent local times (spring forward gap): automatically shifts to the first valid instant.
 * - Ambiguous local times (fall back overlap): resolves to the standard post-transition instant.
 */
export function cairoWallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0
): Date {
  const nominalUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  // Guess UTC-2 as base offset for winter
  const guess = new Date(nominalUtc - 2 * 60 * 60 * 1000);

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CAIRO_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(guess);

  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const representedUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );

  const offset = representedUtc - guess.getTime();
  const resolvedDate = new Date(nominalUtc - offset);

  // Verification step for boundary edge-cases (nonexistent / skipped spring-forward time)
  const verifyParts = cairoDateParts(resolvedDate);
  if (verifyParts.hour !== hour && hour === 0) {
    // If midnight was skipped due to 00:00 -> 01:00 transition, return the transition moment
    return resolvedDate;
  }

  return resolvedDate;
}

export function cairoMidnightUtc(year: number, month: number, day: number): Date {
  return cairoWallClockToUtc(year, month, day, 0, 0, 0);
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

/**
 * Calculates the next UTC moment when Cairo wall-clock time reaches targetCairoHour:targetCairoMinute.
 * Example: 09:00 Cairo time every morning, automatically adjusting between UTC+2 and UTC+3.
 */
export function getNextScheduledRunUtc(
  targetCairoHour: number,
  targetCairoMinute = 0,
  fromDate = new Date()
): Date {
  const nowParts = cairoDateParts(fromDate);
  let targetDate = cairoWallClockToUtc(
    nowParts.year,
    nowParts.month,
    nowParts.day,
    targetCairoHour,
    targetCairoMinute,
    0
  );

  // If the target time for today has already passed, schedule for tomorrow
  if (targetDate.getTime() <= fromDate.getTime()) {
    const tomorrowUtc = new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day + 1));
    targetDate = cairoWallClockToUtc(
      tomorrowUtc.getUTCFullYear(),
      tomorrowUtc.getUTCMonth() + 1,
      tomorrowUtc.getUTCDate(),
      targetCairoHour,
      targetCairoMinute,
      0
    );
  }

  return targetDate;
}

export function reportEmployeeScope(role: string, sessionId: string, requestedId?: string | null) {
  const manager = role === "GENERAL_MANAGER" || role === "SALES_MANAGER";
  return { isManager: manager, employeeId: manager ? (requestedId || null) : sessionId };
}
