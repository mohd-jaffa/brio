"use client";

import { CalendarDays, ChevronDown } from "lucide-react";
import { useId } from "react";

import { UI_TEXT } from "@/constants/messages";
import { DATE_RANGE_LABELS, DATE_RANGES, type DateRange, type DateRangePreset } from "@/constants/ranges";

/**
 * The period a screen reads over — "Last 30 days" (plan §139.5). A native
 * select dressed as the references' pill, so it opens the phone's own picker
 * and needs no menu of its own. Choosing Custom shows two dates beneath it,
 * which drop into place.
 */
export function RangePicker({ value, onChange }: { value: DateRange; onChange: (next: DateRange) => void }) {
  const id = useId();
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="relative">
        <label htmlFor={id} className="sr-only">
          {UI_TEXT.range.label}
        </label>
        <CalendarDays
          size={16}
          strokeWidth={1.75}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text"
        />
        <select
          id={id}
          value={value.preset}
          onChange={(event) => onChange({ ...value, preset: event.target.value as DateRangePreset })}
          className="touch-target appearance-none rounded-xl border border-border bg-surface py-2 pl-9 pr-9 text-sm font-medium text-text shadow-card"
        >
          {DATE_RANGES.map((preset) => (
            <option key={preset} value={preset}>
              {DATE_RANGE_LABELS[preset]}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text"
        />
      </div>
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
