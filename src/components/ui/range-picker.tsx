"use client";

import { CalendarDays } from "lucide-react";
import { useId } from "react";

import { UI_TEXT } from "@/constants/messages";
import { DATE_RANGE_LABELS, DATE_RANGES, type DateRange, type DateRangePreset } from "@/constants/ranges";

import { DatePicker } from "./date-picker";
import { SelectMenu } from "./select-menu";

/**
 * The period a screen reads over — "Last 30 days" (plan §139.5): the
 * references' pill, opening the app's own list of periods (`SelectMenu`).
 * Choosing Custom shows two days beneath it, which drop into place, each
 * picked from the app's own calendar (`DatePicker`).
 */
export function RangePicker({ value, onChange }: { value: DateRange; onChange: (next: DateRange) => void }) {
  const id = useId();
  return (
    <div className="flex flex-col items-end gap-2">
      <SelectMenu
        label={UI_TEXT.range.label}
        variant="pill"
        leading={<CalendarDays size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-text" />}
        value={value.preset}
        options={DATE_RANGES.map((preset) => ({ value: preset, label: DATE_RANGE_LABELS[preset] }))}
        onChange={(preset) => onChange({ ...value, preset: preset as DateRangePreset })}
      />
      {value.preset === "CUSTOM" && (
        <div className="animate-drop-in flex gap-2">
          {(["from", "to"] as const).map((end) => (
            <div key={end} className="flex flex-col gap-1">
              <span id={`${id}-${end}`} className="text-xs font-medium text-text-muted">
                {UI_TEXT.range[end]}
              </span>
              <DatePicker
                label={UI_TEXT.range[end]}
                labelledBy={`${id}-${end}`}
                variant="compact"
                value={value[end] ?? ""}
                min={end === "to" ? value.from : undefined}
                max={end === "from" ? value.to : undefined}
                onChange={(day) => onChange({ ...value, [end]: day })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
