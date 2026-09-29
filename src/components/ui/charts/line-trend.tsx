"use client";

import { useId, useState, type ReactNode } from "react";

import { UI_TEXT } from "@/constants/messages";
import { useElementSize } from "@/hooks/useElementSize";

import { CategoryAxis, ValueAxis, valueAxisWidth } from "./axes";
import { ChartFrame, type ChartStateProps } from "./chart-frame";
import { ChartPlot } from "./chart-plot";
import { areaPath, linearScale, monotonePath, niceTicks, tickBudget, tickIndices } from "./geometry";
import { CHART_UNITS, type ChartUnit } from "./units";

/** One step of a trend: its date as the axis and the bubble show it, and its value. */
export interface TrendPoint {
  label: string;
  value: number;
}

const TOP = 10;
const RIGHT = 18;
const BOTTOM = 26;
// The first point sits in from the value labels, so its date has room.
const INSET = 12;

/**
 * A trend as a smooth line with a soft fill beneath it (plan §139.11.11):
 * the sales trend on Analytics. `previous`, when given, is the period before,
 * drawn dashed and muted under the same dates, with a legend for the two.
 */
export function LineTrend({
  title,
  summary,
  points,
  previous,
  unit = "paise",
  height = 200,
  action,
  labelHeading = UI_TEXT.charts.date,
  ...state
}: ChartStateProps & {
  title: string;
  summary: string;
  points: TrendPoint[];
  previous?: TrendPoint[];
  unit?: ChartUnit;
  height?: number;
  action?: ReactNode;
  labelHeading?: string;
}) {
  const [plotRef, { width }] = useElementSize<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const fillId = `line-fill-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const units = CHART_UNITS[unit];
  const compared = previous?.slice(0, points.length);

  const max = Math.max(0, ...points.map((point) => point.value), ...(compared ?? []).map((point) => point.value));
  const ticks = niceTicks(max, { minStep: units.minStep });
  const tickLabels = ticks.map(units.axis);
  const axis = valueAxisWidth(tickLabels);
  const baseline = height - BOTTOM;
  const y = linearScale([0, ticks[ticks.length - 1]], [baseline, TOP]);
  const span = Math.max(0, width - RIGHT - axis - INSET);
  const x = (index: number) => axis + INSET + (points.length > 1 ? (index * span) / (points.length - 1) : span / 2);

  const line = points.map((point, index) => ({ x: x(index), y: y(point.value) }));
  const before = compared?.map((point, index) => ({ x: x(index), y: y(point.value) }));
  const targets = points.map((point, index) => ({
    ...line[index],
    label: point.label,
    value: units.value(point.value),
  }));
  const mark = active === null ? undefined : line[active];

  const table = compared
    ? {
        columns: [labelHeading, UI_TEXT.charts.thisPeriod, UI_TEXT.charts.previousPeriod],
        rows: points.map((point, index) => [
          point.label,
          units.value(point.value),
          index < compared.length ? units.value(compared[index].value) : "",
        ]),
      }
    : {
        columns: [labelHeading, units.heading],
        rows: points.map((point) => [point.label, units.value(point.value)]),
      };

  const legend = compared && (
    <div aria-hidden="true" className="mb-2 flex justify-end gap-4 text-[11px] font-medium text-text-muted">
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-4 rounded-full bg-chart-1" />
        {UI_TEXT.charts.thisPeriod}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-4 border-t-2 border-dashed border-text-muted/70" />
        {UI_TEXT.charts.previousPeriod}
      </span>
    </div>
  );

  return (
    <ChartFrame
      {...state}
      title={title}
      shape="line"
      height={height}
      action={action}
      legend={legend}
      empty={points.every((point) => point.value === 0)}
      table={table}
    >
      <ChartPlot
        plotRef={plotRef}
        width={width}
        height={height}
        summary={summary}
        targets={targets}
        active={active}
        onActiveChange={setActive}
      >
        {width > 0 && (
          <svg width={width} height={height} className="overflow-visible" aria-hidden="true">
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--color-chart-1)" stopOpacity={0.2} />
                <stop offset="1" stopColor="var(--color-chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <ValueAxis ticks={ticks} labels={tickLabels} y={y} left={axis} right={width} />
            <CategoryAxis
              indices={tickIndices(points.length, tickBudget(span))}
              labels={points.map((point) => point.label)}
              x={x}
              y={height - 6}
              width={width}
            />
            {before && (
              <path
                data-series="previous"
                d={monotonePath(before)}
                fill="none"
                stroke="var(--color-text-muted)"
                strokeOpacity={0.7}
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
            )}
            <path d={areaPath(line, baseline)} fill={`url(#${fillId})`} className="chart-fade" />
            <path
              data-series="current"
              d={monotonePath(line)}
              pathLength={1}
              fill="none"
              stroke="var(--color-chart-1)"
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="chart-draw"
            />
            {points.length === 1 && <circle cx={line[0].x} cy={line[0].y} r={3} fill="var(--color-chart-1)" />}
            {mark && (
              <g data-testid="chart-mark">
                <line
                  x1={mark.x}
                  x2={mark.x}
                  y1={TOP}
                  y2={baseline}
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                />
                <circle
                  cx={mark.x}
                  cy={mark.y}
                  r={5}
                  fill="var(--color-chart-1)"
                  stroke="var(--color-surface)"
                  strokeWidth={2.5}
                />
              </g>
            )}
          </svg>
        )}
      </ChartPlot>
    </ChartFrame>
  );
}
