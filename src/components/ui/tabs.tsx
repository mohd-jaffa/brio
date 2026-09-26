"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";

import { useArrowSelection } from "@/hooks/useArrowSelection";
import { canAnimate, travelIn } from "@/lib/motion";

import { cn } from "./cn";

const tabId = (id: string, value: string) => `${id}-tab-${value}`;
const panelId = (id: string, value: string) => `${id}-panel-${value}`;

/** The underline stops short of a tab's edges by this much, each side. */
const UNDERLINE_INSET = 8;

/**
 * The underline under the chosen tab, or none when no tab is chosen. Its first
 * placing is where it starts; after that, each new place is a glide.
 */
function placeUnderline(tabs: HTMLElement, underline: HTMLElement, placed: { current: boolean }) {
  const chosen = tabs.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
  underline.hidden = !chosen;
  if (!chosen) return;
  if (!placed.current) underline.style.transition = "none";
  underline.style.width = `${chosen.offsetWidth - 2 * UNDERLINE_INSET}px`;
  underline.style.transform = `translateX(${chosen.offsetLeft + UNDERLINE_INSET}px)`;
  if (!placed.current) {
    // Drawn where it starts before its glide is switched back on.
    underline.getBoundingClientRect();
    underline.style.transition = "";
    placed.current = true;
  }
}

/**
 * The views of one screen — Overview, Sales, Orders (plan §139.5): underlined,
 * scrolling sideways when they do not fit, each with an optional count. The
 * WAI-ARIA tabs pattern: the arrow keys move between tabs and show each as
 * they go, and every tab names the `TabPanel` it controls.
 *
 * One underline serves them all and glides from the tab left to the one
 * chosen, so the change reads as a move along the row — as the segmented
 * control's tile does. It is placed by measuring the chosen tab, again
 * whenever a tab changes size; under reduced motion it simply is there.
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
  const list = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);

  // After every render: the choice, or a count beside a label, may have moved it.
  useLayoutEffect(() => placeUnderline(list.current!, bar.current!, placed));

  // And whenever a tab changes size — a font that loaded, a count that grew.
  const tabs = options.map((option) => option.value).join();
  useEffect(() => {
    const element = list.current!;
    const underline = bar.current!;
    if (typeof ResizeObserver === "undefined") return;
    // Both are held from here: React lets go of its refs as the tabs leave,
    // before this effect is cleaned up, and a resize can land in between.
    const observer = new ResizeObserver(() => {
      if (element.isConnected) placeUnderline(element, underline, placed);
    });
    element.querySelectorAll('[role="tab"]').forEach((tab) => observer.observe(tab));
    return () => observer.disconnect();
  }, [tabs]);

  return (
    <div
      ref={list}
      role="tablist"
      aria-label={label}
      onKeyDown={keys.onKeyDown}
      className="relative -mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 [scrollbar-width:none] sm:mx-0 sm:px-0"
    >
      <span
        ref={bar}
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-0.5 rounded-full bg-primary transition-[transform,width] duration-300 ease-[var(--ease-out-expo)] motion-reduce:transition-none"
      />
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
              selected ? "font-semibold text-text" : "font-medium text-text-muted hover:text-text",
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

/**
 * What one tab shows; it is named by its tab. A new tab's view comes in a
 * little from its side — from the right for a tab further along, from the
 * left for one before — the way the underline went. Under reduced motion it
 * only fades.
 */
export function TabPanel({ id, value, children }: { id: string; value: string; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const shown = useRef(value);

  useLayoutEffect(() => {
    const before = shown.current;
    shown.current = value;
    const element = panel.current;
    if (before === value || !canAnimate(element)) return;
    const from = document.getElementById(tabId(id, before));
    const to = document.getElementById(tabId(id, value));
    const further = !from || !to || (from.compareDocumentPosition(to) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    travelIn(element, further, 8, 220);
  }, [id, value]);

  return (
    <div ref={panel} role="tabpanel" id={panelId(id, value)} aria-labelledby={tabId(id, value)} tabIndex={0}>
      {children}
    </div>
  );
}
