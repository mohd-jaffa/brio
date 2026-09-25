"use client";

import type { ReactNode } from "react";

import { useArrowSelection } from "@/hooks/useArrowSelection";

import { cn } from "./cn";

const tabId = (id: string, value: string) => `${id}-tab-${value}`;
const panelId = (id: string, value: string) => `${id}-panel-${value}`;

/**
 * The views of one screen — Overview, Sales, Orders (plan §139.5): underlined,
 * scrolling sideways when they do not fit, each with an optional count. The
 * WAI-ARIA tabs pattern: the arrow keys move between tabs and show each as
 * they go, and every tab names the `TabPanel` it controls.
 */
export function Tabs<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  /** Ties the tabs to their panels; unique on the screen. */
  id: string;
  label: string;
  value: T;
  options: readonly { value: T; label: string; count?: number }[];
  onChange: (value: T) => void;
}) {
  const keys = useArrowSelection(
    options.map((option) => option.value),
    value,
    onChange,
  );
  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={keys.onKeyDown}
      className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 [scrollbar-width:none] sm:mx-0 sm:px-0"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={keys.register(option.value)}
            id={tabId(id, option.value)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId(id, option.value)}
            tabIndex={keys.tabIndex(option.value)}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 pb-3 pt-2 text-sm transition-colors",
              "after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full",
              selected
                ? "font-semibold text-text after:bg-primary"
                : "font-medium text-text-muted hover:text-text",
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tabular-nums",
                  selected ? "bg-primary-soft text-primary" : "bg-sunken text-text-muted",
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** What one tab shows; it is named by its tab. */
export function TabPanel({ id, value, children }: { id: string; value: string; children: ReactNode }) {
  return (
    <div role="tabpanel" id={panelId(id, value)} aria-labelledby={tabId(id, value)} tabIndex={0}>
      {children}
    </div>
  );
}
