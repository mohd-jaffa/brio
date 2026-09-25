"use client";

import { useArrowSelection } from "@/hooks/useArrowSelection";

import { cn } from "./cn";

/**
 * Filters as a row of pills — All, Cakes, Cupcakes (plan §139.5). One is
 * chosen at a time, so it is a radiogroup with the arrow-key movement, and
 * the row scrolls sideways rather than wrapping when there are many.
 */
export function ChoiceChips<T extends string>({
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
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={keys.onKeyDown}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:mx-0 sm:px-0"
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
