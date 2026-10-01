"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useId } from "react";

import { cn } from "./cn";

/**
 * The search box (plan §139.5; it replaces `search-input`). The placeholder
 * names the field for a screen reader too, since a placeholder stops being a
 * name the moment something is typed, and it and the icon are muted at full
 * strength — at 60 % they measured under 3 : 1 (BUG-24).
 *
 * `filter` adds the square button beside it that opens a list's filters.
 * Search lives in the lists that need it; there is no global search, on Home
 * or in the top bar (the user's decision, 2026-09-25).
 */
export function SearchField({
  value,
  onChange,
  placeholder,
  filter,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  filter?: { label: string; onClick: () => void; active?: boolean };
}) {
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <label htmlFor={id} className="sr-only">
          {placeholder}
        </label>
        <Search
          size={18}
          strokeWidth={1.75}
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          id={id}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          // 16 px, as every field is, or an iPhone zooms in on it (field-styles.ts).
          className="w-full rounded-2xl border border-field-edge bg-surface py-2.5 pl-11 pr-4 text-base text-text shadow-card transition-colors placeholder:text-text-muted focus:border-primary"
        />
      </div>
      {filter && <FilterButton {...filter} />}
    </div>
  );
}

/**
 * The square button that opens a list's filters, with a dot while any filter
 * is on — beside a search box, or over a list that has none.
 */
export function FilterButton({
  label,
  onClick,
  active = false,
  size = "md",
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  size?: "md" | "sm";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "touch-target relative inline-flex shrink-0 items-center justify-center bg-primary-soft text-primary transition-colors hover:bg-surface-hover",
        size === "md" ? "size-12 rounded-2xl" : "size-11 rounded-xl",
      )}
    >
      <SlidersHorizontal size={size === "md" ? 20 : 18} strokeWidth={1.75} aria-hidden="true" />
      {active && <span aria-hidden="true" className="absolute right-2.5 top-2.5 size-2 rounded-full bg-primary" />}
    </button>
  );
}
