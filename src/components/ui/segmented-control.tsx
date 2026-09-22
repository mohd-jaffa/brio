"use client";

import { cn } from "./cn";

/**
 * A choice between a few named views — Active and Past orders, say. A real
 * radiogroup, so it can be reached and changed from the keyboard
 * (AGENTS.md §21); it had been a pair of plain buttons.
 */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex rounded-xl border border-border bg-surface p-1 shadow-sm"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-bold transition-all",
              selected
                ? "bg-primary text-primary-text shadow-sm"
                : "text-text-muted hover:text-text",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
