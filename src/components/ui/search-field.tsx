"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useId, useRef, useSyncExternalStore } from "react";

import { cn } from "./cn";

const noSubscription = () => () => {};
const onApple = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/**
 * The search box (plan §139.5; it replaces `search-input`). The placeholder
 * names the field for a screen reader too, since a placeholder stops being a
 * name the moment something is typed, and it and the icon are muted at full
 * strength — at 60 % they measured under 3 : 1 (BUG-24).
 *
 * `filter` adds the square button beside it that opens a list's filters. The
 * `global` one is the top bar's: ⌘K, or Ctrl K off Apple, reaches it from
 * anywhere, and a desktop shows that shortcut in the field.
 */
export function SearchField({
  value,
  onChange,
  placeholder,
  filter,
  global = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  filter?: { label: string; onClick: () => void; active?: boolean };
  global?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  // The server cannot know the keyboard, so it renders the Apple key.
  const apple = useSyncExternalStore(noSubscription, onApple, () => true);

  useEffect(() => {
    if (!global) return;
    const reach = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", reach);
    return () => window.removeEventListener("keydown", reach);
  }, [global]);

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
          ref={input}
          id={id}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-keyshortcuts={global ? "Meta+K Control+K" : undefined}
          className={cn(
            "w-full rounded-2xl border border-border py-3 pl-11 text-sm text-text transition-colors placeholder:text-text-muted focus:border-primary",
            global ? "bg-sunken pr-4 lg:pr-16" : "bg-surface pr-4 shadow-card",
          )}
        />
        {global && (
          <kbd
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-surface px-1.5 py-0.5 font-body text-xs text-text-muted lg:block"
          >
            {apple ? "⌘K" : "Ctrl K"}
          </kbd>
        )}
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
