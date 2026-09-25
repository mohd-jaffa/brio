"use client";

import type { ReactNode } from "react";

import { UI_TEXT } from "@/constants/messages";

import { cn } from "../cn";
import { ChartFrame, type ChartStateProps } from "./chart-frame";
import { ringSegments, shares, topWithOthers, type Slice } from "./geometry";
import { CHART_COLORS, CHART_UNITS, type ChartUnit } from "./units";

const SIZE = 148;
const THICKNESS = 22;
const GAP = 2;
// Past this many characters the full total no longer fits inside the ring,
// so the centre shows the compact form; the table still has it in full.
const CENTRE_FULL = 10;
const CENTRE_LARGE = 7;

/**
 * Shares of a whole as a ring (plan §139.11.11): expenses by category, sales
 * by category, orders by status. The total sits in the middle in the serif,
 * the legend names each slice and its share, and past the fifth slice the
 * rest are folded into Others. The legend stands beside the ring once the
 * card is as wide as it is on a 360 px phone, and beneath it on anything
 * narrower: 294 px is that card's inside — 360, less the page's 16 px gutters,
 * the card's 16 px padding and its 1 px border, each side.
 */
export function Donut({
  title,
  summary,
  slices,
  totalLabel,
  unit = "paise",
  action,
  labelHeading = UI_TEXT.charts.category,
  ...state
}: ChartStateProps & {
  title: string;
  summary: string;
  slices: Slice[];
  /** What the centre's total is: "Total expenses". */
  totalLabel: string;
  unit?: ChartUnit;
  action?: ReactNode;
  labelHeading?: string;
}) {
  const units = CHART_UNITS[unit];
  const shown = topWithOthers(slices, UI_TEXT.charts.others);
  const values = shown.map((slice) => slice.value);
  const total = values.reduce((sum, value) => sum + value, 0);
  const percents = shares(values);
  const radius = (SIZE - THICKNESS) / 2;
  const circumference = 2 * Math.PI * radius;
  const segments = ringSegments(values, circumference, GAP);

  const full = units.value(total);
  const centre = full.length > CENTRE_FULL ? units.axis(total) : full;

  return (
    <ChartFrame
      {...state}
      title={title}
      shape="donut"
      height={SIZE}
      action={action}
      empty={total === 0}
      table={{
        columns: [labelHeading, units.heading, UI_TEXT.charts.share],
        rows: shown.map((slice, index) => [
          slice.label,
          units.value(slice.value),
          UI_TEXT.charts.percent(percents[index]),
        ]),
      }}
    >
      <div className="flex flex-col items-center gap-5 @min-[294px]:flex-row">
        <div role="img" aria-label={summary} className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} className="chart-fade -rotate-90" aria-hidden="true">
            {segments.map((segment, index) => (
              <circle
                key={index}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={radius}
                fill="none"
                stroke={CHART_COLORS[index]}
                strokeWidth={THICKNESS}
                strokeDasharray={`${segment.length} ${circumference - segment.length}`}
                strokeDashoffset={-segment.start}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center px-7 text-center">
            <span
              className={cn(
                "font-heading font-semibold leading-tight tabular-nums text-text",
                centre.length > CENTRE_LARGE ? "text-base" : "text-xl",
              )}
            >
              {centre}
            </span>
            <span className="mt-0.5 text-[11px] font-medium leading-tight text-text-muted">{totalLabel}</span>
          </div>
        </div>
        {/* The table below carries the same names and shares for a screen reader. */}
        <ul aria-hidden="true" className="w-full min-w-0 flex-1 space-y-2.5">
          {shown.map((slice, index) => (
            <li key={slice.label} className="flex items-center gap-2.5 text-sm">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: CHART_COLORS[index] }} />
              <span className="min-w-0 flex-1 truncate font-medium text-text">{slice.label}</span>
              <span className="shrink-0 font-semibold tabular-nums text-text">
                {UI_TEXT.charts.percent(percents[index])}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartFrame>
  );
}
