"use client";

import { useArrowSelection } from "@/hooks/useArrowSelection";

import { cn } from "./cn";

/**
 * Filters as a row of pills — All, Cakes, Cupcakes (plan §139.5). One is
 * chosen at a time, so it is a radiogroup with the arrow-key movement, and
 * the row scrolls sideways rather than wrapping when there are many. `wrap`
 * lays a short set out over lines instead, where every choice must be seen —
 * a payment's method, in a panel too narrow for the row.
 */
export function ChoiceChips<T extends string>({
  label,
  value,
  options,
  onChange,
  wrap = false,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  wrap?: boolean;
}) {
  const keys = useArrowSelection(
    options.map((option) => option.value),
    value,
    onChange,
  );
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={keys.onKeyDown}
      className={cn(
        "flex gap-2 py-1",
        wrap ? "flex-wrap" : "-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0",
      )}
    >
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
              "touch-target shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              selected
                ? "border-primary bg-primary text-primary-text"
                : "border-border bg-surface text-text hover:bg-surface-hover",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
