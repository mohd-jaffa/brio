"use client";

import { UI_TEXT } from "@/constants/messages";
import type { Interval } from "@/lib/dates/range";

import { SelectMenu } from "../select-menu";

const INTERVALS = ["DAY", "WEEK"] as const satisfies readonly Interval[];

/** Daily or Weekly, beside a trend (plan §139.11.11): the sales trend, the expense trend. */
export function IntervalSelect({ value, onChange }: { value: Interval; onChange: (next: Interval) => void }) {
  const text = UI_TEXT.charts;
  return (
    <SelectMenu
      label={text.interval}
      variant="compact"
      value={value}
      options={INTERVALS.map((interval) => ({ value: interval, label: text.intervals[interval] }))}
      onChange={(next) => onChange(next as Interval)}
    />
  );
}
