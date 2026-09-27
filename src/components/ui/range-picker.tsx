"use client";

import { CalendarDays } from "lucide-react";

import { UI_TEXT } from "@/constants/messages";
import { DATE_RANGE_LABELS, DATE_RANGES, type DateRange, type DateRangePreset } from "@/constants/ranges";

import { SelectMenu } from "./select-menu";

/**
 * The period a screen reads over — "Last 30 days" (plan §139.5): the
 * references' pill, opening the app's own list of periods (`SelectMenu`).
 * Choosing Custom shows two dates beneath it, which drop into place.
 */
export function RangePicker({ value, onChange }: { value: DateRange; onChange: (next: DateRange) => void }) {
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
            <label key={end} className="flex flex-col text-xs font-medium text-text-muted">
              {UI_TEXT.range[end]}
              <input
                type="date"
                value={value[end] ?? ""}
                min={end === "to" ? value.from : undefined}
                max={end === "from" ? value.to : undefined}
                onChange={(event) => onChange({ ...value, [end]: event.target.value || undefined })}
                className="mt-1 rounded-lg border border-border bg-sunken px-2 py-1.5 text-sm text-text"
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
