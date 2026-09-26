import type { DateRange } from "@/constants/ranges";

import { addDaysKey, daysFrom, monthStartKey } from "./calendar";

/** A period in the business's calendar, both ends included, as day keys. */
export interface Period {
  from: string;
  to: string;
}

/** How a period's trend is grouped: by day, or by seven days. */
export type Interval = "DAY" | "WEEK";

/** A period this long or shorter is drawn day by day (plan §139.11.11); anything longer, by week. */
export const DAILY_UP_TO = 31;

/** The last day of the month a day falls in. */
function monthEndKey(key: string): string {
  const next = new Date(`${monthStartKey(key)}T00:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return addDaysKey(next.toISOString().slice(0, 10), -1);
}

/** The first of the month before the one a day falls in. */
function previousMonthStart(key: string): string {
  return monthStartKey(addDaysKey(monthStartKey(key), -1));
}

/**
 * The days a chosen range covers, worked out from today in the business's
 * calendar (plan §139.11.11): the last 7 or 30 days, this month so far, last
 * month, or the two dates chosen. A custom range must have both dates, which
 * the schema has already made sure of.
 */
export function resolvePeriod(range: DateRange, today: string): Period {
  switch (range.preset) {
    case "LAST_7_DAYS":
      return { from: addDaysKey(today, -6), to: today };
    case "LAST_30_DAYS":
      return { from: addDaysKey(today, -29), to: today };
    case "THIS_MONTH":
      return { from: monthStartKey(today), to: today };
    case "LAST_MONTH": {
      const from = previousMonthStart(today);
      return { from, to: monthEndKey(from) };
    }
    case "CUSTOM":
      return { from: range.from ?? today, to: range.to ?? today };
  }
}

/**
 * What a period is compared against, for every delta (IMP-10): the month
 * before, day for day, for the month ranges — this month so far against the
 * same days of last month — and otherwise as many days just before it.
 */
export function previousPeriod(range: DateRange, period: Period): Period {
  if (range.preset === "THIS_MONTH" || range.preset === "LAST_MONTH") {
    const from = previousMonthStart(period.from);
    const end = monthEndKey(from);
    const sameDay = addDaysKey(from, daysFrom(period.from, period.to).length - 1);
    return { from, to: sameDay < end ? sameDay : end };
  }
  const length = daysFrom(period.from, period.to).length;
  return { from: addDaysKey(period.from, -length), to: addDaysKey(period.from, -1) };
}

/** The interval asked for, or by day for a month or less and by week beyond. */
export function intervalFor(period: Period, asked?: Interval): Interval {
  return asked ?? (daysFrom(period.from, period.to).length <= DAILY_UP_TO ? "DAY" : "WEEK");
}

/** The first day of each group of a period's trend: every day, or every seventh from its start. */
export function bucketStarts(period: Period, interval: Interval): string[] {
  const days = daysFrom(period.from, period.to);
  return interval === "DAY" ? days : days.filter((_, index) => index % 7 === 0);
}

/** Which group of `bucketStarts` a day falls in, or −1 outside the period. */
export function bucketIndex(period: Period, interval: Interval, day: string): number {
  if (day < period.from || day > period.to) return -1;
  const offset = daysFrom(period.from, day).length - 1;
  return interval === "DAY" ? offset : Math.floor(offset / 7);
}
