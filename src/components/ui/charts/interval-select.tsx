"use client";

import { UI_TEXT } from "@/constants/messages";
import type { Interval } from "@/lib/dates/range";

/** Daily or Weekly, beside a trend (plan §139.11.11): the sales trend, the expense trend. */
export function IntervalSelect({ value, onChange }: { value: Interval; onChange: (next: Interval) => void }) {
  const text = UI_TEXT.charts;
  return (
    <label className="relative">
      <span className="sr-only">{text.interval}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as Interval)}
        className="touch-target rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text"
      >
        {(["DAY", "WEEK"] as const).map((interval) => (
          <option key={interval} value={interval}>
            {text.intervals[interval]}
          </option>
        ))}
      </select>
    </label>
  );
}
