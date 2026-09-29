"use client";

import type { Dispatch, KeyboardEvent, PointerEvent, ReactNode, SetStateAction } from "react";

import { UI_TEXT } from "@/constants/messages";

import { nearestIndex } from "./geometry";

/** A point the tooltip can rest on: where it is drawn, and what it says. */
export interface PlotTarget {
  x: number;
  y: number;
  label: string;
  value: string;
}

// Near an edge the bubble hangs to the inside, so it never leaves the chart.
const EDGE = 0.2;
const BUBBLE_GAP = 10;
// Room above a point for the bubble. A point higher than this has the bubble
// beside it instead, towards the middle, so it covers neither the point nor
// the line leading to it; half this keeps that bubble inside the top.
const BUBBLE_ROOM = 52;

function bubblePlacement(target: PlotTarget, width: number) {
  if (target.y < BUBBLE_ROOM) {
    const x = target.x > width / 2 ? `calc(-100% - ${BUBBLE_GAP}px)` : `${BUBBLE_GAP}px`;
    return { top: Math.max(target.y, BUBBLE_ROOM / 2), transform: `translate(${x}, -50%)` };
  }
  const x = target.x < width * EDGE ? "-14px" : target.x > width * (1 - EDGE) ? "calc(-100% + 14px)" : "-50%";
  return { top: target.y, transform: `translate(${x}, calc(-100% - ${BUBBLE_GAP}px))` };
}

/**
 * The drawing area of a line or bar chart, and how it is explored: hover or
 * drag with a pointer, tap on a phone, or focus it and use the arrow keys,
 * Home and End (plan §139.11.11). Anywhere across the plot picks the nearest
 * point, so every point's target is its whole column of the plot, however
 * narrow it is drawn. The bubble names the value and the date, and the same
 * words are announced for anyone who cannot see it.
 */
export function ChartPlot({
  plotRef,
  width,
  height,
  summary,
  targets,
  active,
  onActiveChange,
  children,
}: {
  plotRef: (node: HTMLDivElement | null) => void;
  width: number;
  height: number;
  /** One sentence that says what the chart shows, for its `role="img"`. */
  summary: string;
  targets: PlotTarget[];
  active: number | null;
  onActiveChange: Dispatch<SetStateAction<number | null>>;
  children: ReactNode;
}) {
  const last = targets.length - 1;
  const target = active === null ? undefined : targets[active];

  const pick = (event: PointerEvent<HTMLDivElement>) => {
    if (targets.length === 0) return;
    const left = event.currentTarget.getBoundingClientRect().left;
    onActiveChange(
      nearestIndex(
        targets.map((point) => point.x),
        event.clientX - left,
      ),
    );
  };

  const leave = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && document.activeElement !== event.currentTarget) onActiveChange(null);
  };

  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    if (last < 0) return;
    const steps: Record<string, (current: number | null) => number | null> = {
      ArrowRight: (current) => (current === null ? last : Math.min(current + 1, last)),
      ArrowLeft: (current) => (current === null ? last : Math.max(current - 1, 0)),
      Home: () => 0,
      End: () => last,
      Escape: () => null,
    };
    const step = steps[event.key];
    if (!step) return;
    event.preventDefault();
    onActiveChange(step);
  };

  return (
    <div className="relative">
      <div
        ref={plotRef}
        role="img"
        aria-label={summary}
        tabIndex={0}
        className="relative touch-pan-y select-none rounded-lg"
        style={{ height }}
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={leave}
        onKeyDown={move}
        onFocus={() => onActiveChange((current) => (current === null && last >= 0 ? last : current))}
        onBlur={() => onActiveChange(null)}
      >
        {children}
        {target && (
          <div
            className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 py-1.5 text-center shadow-elevated"
            style={{ left: target.x, ...bubblePlacement(target, width) }}
          >
            <span className="block text-sm font-bold tabular-nums text-text">{target.value}</span>
            <span className="block text-[11px] font-medium text-text-muted">{target.label}</span>
          </div>
        )}
      </div>
      <p aria-live="polite" className="sr-only">
        {target ? UI_TEXT.charts.point(target.label, target.value) : ""}
      </p>
    </div>
  );
}
