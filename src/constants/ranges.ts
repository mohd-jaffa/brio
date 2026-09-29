/**
 * The periods Expenses and Analytics can be read over (plan §139.11.11). The
 * server works out each one's dates in the business's timezone; Custom takes
 * the two dates the person chose.
 */
export const DATE_RANGES = ["LAST_7_DAYS", "LAST_30_DAYS", "THIS_MONTH", "LAST_MONTH", "CUSTOM"] as const;
export type DateRangePreset = (typeof DATE_RANGES)[number];

export const DATE_RANGE_LABELS: Record<DateRangePreset, string> = {
  LAST_7_DAYS: "Last 7 days",
  LAST_30_DAYS: "Last 30 days",
  THIS_MONTH: "This month",
  LAST_MONTH: "Last month",
  CUSTOM: "Custom",
};

export const DEFAULT_DATE_RANGE: DateRangePreset = "LAST_30_DAYS";

/** A chosen period: a preset, or Custom with its two calendar dates (YYYY-MM-DD). */
export interface DateRange {
  preset: DateRangePreset;
  from?: string;
  to?: string;
}

/**
 * Home's period (plan §139.10), chosen on its Sales tile: today, this week
 * from its Monday, and this month from its first — each in the business's
 * calendar.
 */
export const HOME_PERIODS = ["TODAY", "WEEK", "MONTH"] as const;
export type HomePeriod = (typeof HOME_PERIODS)[number];

export const HOME_PERIOD_LABELS: Record<HomePeriod, string> = {
  TODAY: "Today",
  WEEK: "This week",
  MONTH: "This month",
};
