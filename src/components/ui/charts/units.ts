import { UI_TEXT } from "@/constants/messages";
import { formatPaise, formatPaiseCompact } from "@/lib/format/currency";

/** What a chart counts: money in paise, or things — orders, customers. */
export type ChartUnit = "paise" | "count";

const formatCount = (value: number) => value.toLocaleString("en-IN");

/**
 * How each unit reads: in full where someone reads a value, compact on an
 * axis, and the smallest step its axis may take — a rupee, or one.
 */
export const CHART_UNITS: Record<
  ChartUnit,
  { value: (value: number) => string; axis: (value: number) => string; minStep: number; heading: string }
> = {
  paise: { value: formatPaise, axis: formatPaiseCompact, minStep: 100, heading: UI_TEXT.charts.amount },
  count: { value: formatCount, axis: formatCount, minStep: 1, heading: UI_TEXT.charts.count },
};

/** The palette in order, as the ring and its legend take it (`--color-chart-1` … `6`). */
export const CHART_COLORS = [1, 2, 3, 4, 5, 6].map((n) => `var(--color-chart-${n})`);
