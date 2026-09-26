"use client";

import { useArrowSelection } from "@/hooks/useArrowSelection";

import { cn } from "./cn";

/**
 * A choice between a few named views — Today, Week, Month; Active and Past
 * orders (plan §139.5 `segmented`). A real radiogroup: Tab reaches the chosen
 * one, and the arrow keys move the choice (AGENTS.md §21).
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
  const keys = useArrowSelection(
    options.map((option) => option.value),
    value,
    onChange,
  );
  const chosen = options.findIndex((option) => option.value === value);
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={keys.onKeyDown}
      className="relative flex rounded-xl bg-sunken p-1"
    >
      {/* The raised tile under the choice. It glides to a new one, so the
          change reads as a move from one to the other; under reduced motion it
          simply is there. The options share the width equally, so one tile's
          width is one step. */}
      {chosen >= 0 && (
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-1 rounded-lg bg-surface shadow-card transition-transform duration-300 ease-[var(--ease-out-expo)] motion-reduce:transition-none"
          style={{
            width: `calc((100% - 0.5rem) / ${options.length})`,
            transform: `translateX(${chosen * 100}%)`,
          }}
        />
      )}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={keys.register(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={keys.tabIndex(option.value)}
            onClick={() => onChange(option.value)}
            className={cn(
              "touch-target relative flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-200",
              selected ? "text-text" : "text-text-muted hover:text-text",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
