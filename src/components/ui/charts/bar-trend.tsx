"use client";

import { useState, type ReactNode } from "react";

import { UI_TEXT } from "@/constants/messages";
import { useElementSize } from "@/hooks/useElementSize";
import { useAnimatedValues } from "@/hooks/useAnimatedValues";

import { CATEGORY_GAP, CategoryAxis, ValueAxis, labelWidth, valueAxisWidth } from "./axes";
import { ChartFrame, type ChartStateProps } from "./chart-frame";
import { ChartPlot } from "./chart-plot";
import { linearScale, niceTicks, roundedTopBar, tickBudget, tickIndices } from "./geometry";
import type { TrendPoint } from "./line-trend";
import { CHART_UNITS, type ChartUnit } from "./units";

const TOP = 10;
const RIGHT = 4;
const BOTTOM = 26;
const BAR_SHARE = 0.6;
const MAX_BAR = 24;
const MIN_BAR = 2;
const RADIUS = 4;

/**
 * A trend as round-topped bars (plan §139.11.11): the expense trend, orders
 * per day. The peak stands in the strong tone and the rest in a lighter one;
 * once a bar is chosen it takes the strong tone instead. Whether a bar is a
 * day or a week is the data's business — the server groups them.
 */
export function BarTrend({
  title,
  summary,
  points,
  unit = "paise",
  height = 200,
  action,
  labelHeading = UI_TEXT.charts.date,
  ...state
}: ChartStateProps & {
  title: string;
  summary: string;
  points: TrendPoint[];
  unit?: ChartUnit;
  height?: number;
  action?: ReactNode;
  labelHeading?: string;
}) {
  const [plotRef, { width }] = useElementSize<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const units = CHART_UNITS[unit];
  const moving = useAnimatedValues(points.map((point, index) => ({ key: String(index), value: point.value })));
  const drawn = points.map((point, index) => ({ ...point, value: moving[index] ?? point.value }));

  const max = Math.max(0, ...points.map((point) => point.value), ...drawn.map((point) => point.value));
  const ticks = niceTicks(max, { minStep: units.minStep });
  const tickLabels = ticks.map(units.axis);
  const axis = valueAxisWidth(tickLabels);
  const baseline = height - BOTTOM;
  const y = linearScale([0, ticks[ticks.length - 1]], [baseline, TOP]);
  const span = Math.max(0, width - RIGHT - axis);
  const band = points.length > 0 ? span / points.length : 0;
  const barWidth = Math.max(MIN_BAR, Math.min(band * BAR_SHARE, MAX_BAR));
  const x = (index: number) => axis + band * (index + 0.5);
  // When every band holds its own date, every bar is labelled: a week shows
  // all seven days rather than skipping one.
  const labelEvery = band >= Math.max(0, ...points.map((point) => labelWidth(point.label))) + CATEGORY_GAP;

  const peak = points.reduce((best, point, index) => (point.value > points[best].value ? index : best), 0);
  const strong = active ?? peak;
  const targets = points.map((point, index) => ({
    x: x(index),
    y: y(drawn[index].value),
    label: point.label,
    value: units.value(point.value),
  }));

  return (
    <ChartFrame
      {...state}
      title={title}
      shape="bar"
      height={height}
      action={action}
      empty={points.every((point) => point.value === 0)}
      table={{
        columns: [labelHeading, units.heading],
        rows: points.map((point) => [point.label, units.value(point.value)]),
      }}
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
            <ValueAxis ticks={ticks} labels={tickLabels} y={y} left={axis} right={width} />
            <CategoryAxis
              indices={tickIndices(points.length, labelEvery ? points.length : tickBudget(span))}
              labels={points.map((point) => point.label)}
              x={x}
              y={height - 6}
              width={width}
            />
            {drawn.map((point, index) => (
              <path
                key={index}
                data-strong={index === strong || undefined}
                d={roundedTopBar({
                  x: x(index) - barWidth / 2,
                  width: barWidth,
                  top: y(point.value),
                  bottom: baseline,
                  radius: RADIUS,
                })}
                fill={index === strong ? "var(--color-chart-1)" : "var(--color-chart-soft)"}
                className="chart-rise"
              />
            ))}
          </svg>
        )}
      </ChartPlot>
    </ChartFrame>
  );
}
