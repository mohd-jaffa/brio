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

/** The day after a given one, as a key. */
export function nextDayKey(key: string): string {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** Which bucket a due date falls in, for a list grouped by when things are due. */
export type DueBucket = "overdue" | "today" | "tomorrow" | "later";

export function dueBucket(due: string, now: Date = new Date()): DueBucket {
  const today = todayKey(now);
  const day = dayKey(due);
  if (day === today) return new Date(due).getTime() < now.getTime() ? "overdue" : "today";
  if (day < today) return "overdue";
  return day === nextDayKey(today) ? "tomorrow" : "later";
}

export const DUE_BUCKET_LABELS: Record<DueBucket, string> = {
  overdue: "Overdue",
  today: "Due today",
  tomorrow: "Tomorrow",
  later: "Later",
};
