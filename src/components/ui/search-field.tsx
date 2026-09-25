"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useId } from "react";

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
          className="w-full rounded-2xl border border-border bg-surface py-3 pl-11 pr-4 text-sm text-text shadow-card transition-colors placeholder:text-text-muted focus:border-primary"
        />
      </div>
      {filter && (
        <button
          type="button"
          aria-label={filter.label}
          aria-pressed={filter.active ?? false}
          onClick={filter.onClick}
          className="touch-target relative inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary transition-colors hover:bg-surface-hover"
        >
          <SlidersHorizontal size={20} strokeWidth={1.75} aria-hidden="true" />
          {filter.active && <span aria-hidden="true" className="absolute right-2.5 top-2.5 size-2 rounded-full bg-primary" />}
        </button>
      )}
    </div>
  );
}
