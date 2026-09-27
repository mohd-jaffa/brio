/**
 * Days, as the bakery counts them. A bakery's day is the day in India, not the
 * day where the server happens to be running, so every "is this today?"
 * question is answered against Asia/Kolkata. Screens had been calling
 * `new Date(...)` and comparing, which is the browser's timezone and drifts.
 */
export const BAKERY_TIME_ZONE = "Asia/Kolkata";

const DAY_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: BAKERY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The calendar day an instant falls on in the bakery's timezone: "2026-09-22". */
export function dayKey(instant: string | Date): string {
  const date = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(date.getTime())) return "";
  return DAY_PARTS.format(date);
}

export function todayKey(now: Date = new Date()): string {
  return dayKey(now);
}

/**
 * India keeps one offset all year, with no summer time, so a day in the
 * bakery's calendar always begins at this offset's midnight.
 */
const BAKERY_UTC_OFFSET = "+05:30";

/** A day some days on from a given one (back, for a negative count), as a key. */
export function addDaysKey(key: string, days: number): string {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** The day after a given one, as a key. */
export function nextDayKey(key: string): string {
  return addDaysKey(key, 1);
}

/** The instant a day begins in the bakery's timezone, for a query's bounds. */
export function dayStart(key: string): string {
  return new Date(`${key}T00:00:00${BAKERY_UTC_OFFSET}`).toISOString();
}

/** The Monday of the week a day falls in. */
export function weekStartKey(key: string): string {
  const weekday = new Date(`${key}T00:00:00Z`).getUTCDay();
  return addDaysKey(key, -((weekday + 6) % 7));
}

/** The first of the month a day falls in. */
export function monthStartKey(key: string): string {
  return `${key.slice(0, 8)}01`;
}

/**
 * The same date some months on (back, for a negative count), kept inside a
 * shorter month: 31 Jan and one month is 28 Feb.
 */
export function addMonthsKey(key: string, months: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1 + months, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(day, last));
  return first.toISOString().slice(0, 10);
}

/**
 * The month a day falls in as weeks from Monday, as a calendar draws it: null
 * before its first day and after its last.
 */
export function monthWeeks(key: string): (string | null)[][] {
  const first = monthStartKey(key);
  const cells: (string | null)[] = Array.from({ length: (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7 }, () => null);
  for (let day = first; day.slice(0, 7) === first.slice(0, 7); day = nextDayKey(day)) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

/** Every day from one to another, both included, as keys. */
export function daysFrom(from: string, to: string): string[] {
  const days: string[] = [];
  for (let day = from; day <= to; day = nextDayKey(day)) days.push(day);
  return days;
}

const HOUR = new Intl.DateTimeFormat("en-GB", { timeZone: BAKERY_TIME_ZONE, hour: "numeric", hourCycle: "h23" });

/** The hour on the bakery's clock, 0–23 — what the Home greeting goes by (§134 P2-1). */
export function bakeryHour(now: Date = new Date()): number {
  return Number(HOUR.format(now));
}

/** Which bucket a due date falls in, for a list grouped by when things are due. */
export type DueBucket = "overdue" | "today" | "tomorrow" | "later";

/**
 * An order due today stays **today** until the day ends, rather than turning
 * overdue at the minute it was due (IMP-05, §134 P2-2): a baker delivers in
 * a day, not to the minute. Only an earlier day is overdue.
 */
export function dueBucket(due: string, now: Date = new Date()): DueBucket {
  const today = todayKey(now);
  const day = dayKey(due);
  if (day < today) return "overdue";
  if (day === today) return "today";
  return day === nextDayKey(today) ? "tomorrow" : "later";
}

export const DUE_BUCKET_LABELS: Record<DueBucket, string> = {
  overdue: "Overdue",
  today: "Due today",
  tomorrow: "Tomorrow",
  later: "Later",
};
