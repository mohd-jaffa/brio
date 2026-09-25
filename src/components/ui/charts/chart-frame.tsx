"use client";

import { RotateCw } from "lucide-react";
import { useId, type ReactNode } from "react";

import { UI_TEXT } from "@/constants/messages";

import { Button } from "../button";

export type ChartShape = "line" | "bar" | "donut";

/** What every chart takes besides its data: the states around it (plan §139.11.11). */
export interface ChartStateProps {
  loading?: boolean;
  /** Already worded, as `errorMessage` gives it; shown with Try again. */
  error?: string | null;
  onRetry?: () => void;
  /** Names the period: "No expenses in the last 7 days". */
  emptyMessage: string;
  /** The next step from an empty chart, such as adding an expense. */
  emptyAction?: ReactNode;
}

/** The numbers a chart draws, as a table only a screen reader meets. */
export interface ChartTableData {
  columns: string[];
  rows: string[][];
}

// Heights of the placeholder bars, as a share of the plot: a rough week.
const SKELETON_BARS = [0.45, 0.7, 0.35, 0.8, 0.55, 0.9, 0.4, 0.65, 0.5, 0.75, 0.3, 0.6];

function ChartSkeleton({ shape, height }: { shape: ChartShape; height: number }) {
  if (shape === "donut") {
    return (
      <div aria-hidden="true" className="flex animate-pulse items-center gap-5" style={{ minHeight: height }}>
        <div className="size-[148px] shrink-0 rounded-full border-[22px] border-sunken" />
        <div className="flex-1 space-y-3">
          {[0.8, 0.65, 0.7, 0.5].map((share) => (
            <div key={share} className="h-3 rounded-full bg-sunken" style={{ width: `${share * 100}%` }} />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div aria-hidden="true" className="relative animate-pulse" style={{ height }}>
      <div className="absolute inset-0 flex flex-col justify-between pb-6">
        {[0, 1, 2, 3].map((line) => (
          <div key={line} className="h-px bg-border" />
        ))}
      </div>
      {shape === "bar" ? (
        <div className="absolute inset-x-0 bottom-6 top-2 flex items-end justify-around px-2">
          {SKELETON_BARS.map((share, index) => (
            <div key={index} className="w-2.5 rounded-t-sm bg-sunken" style={{ height: `${share * 100}%` }} />
          ))}
        </div>
      ) : (
        <svg className="absolute inset-x-0 bottom-6 top-2 size-full" preserveAspectRatio="none" viewBox="0 0 100 40">
          <path
            d="M0,32 C15,30 20,22 35,24 S55,14 65,18 S85,6 100,10"
            fill="none"
            stroke="var(--color-sunken)"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
    </div>
  );
}

export function ChartTable({ caption, table }: { caption: string; table: ChartTableData }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {table.columns.map((column) => (
            <th key={column} scope="col">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row, index) => (
          <tr key={index}>
            {row.map((cell, column) =>
              column === 0 ? (
                <th key={column} scope="row">
                  {cell}
                </th>
              ) : (
                <td key={column}>{cell}</td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * The card every chart sits in: a `figure` named by its heading, an optional
 * control beside the heading (Daily / Weekly), and whichever of the four
 * states applies — a skeleton in the chart's own shape, an error with Try
 * again, an empty state that names the period, or the chart with its table.
 * Each state keeps the chart's height, so nothing below it jumps.
 */
export function ChartFrame({
  title,
  shape,
  height,
  action,
  legend,
  empty,
  table,
  loading = false,
  error,
  onRetry,
  emptyMessage,
  emptyAction,
  children,
}: ChartStateProps & {
  title: string;
  shape: ChartShape;
  height: number;
  action?: ReactNode;
  legend?: ReactNode;
  empty: boolean;
  table: ChartTableData;
  children: ReactNode;
}) {
  const headingId = useId();

  let body: ReactNode;
  if (loading) {
    body = (
      <>
        <ChartSkeleton shape={shape} height={height} />
        <p role="status" className="sr-only">
          {UI_TEXT.states.loading}
        </p>
      </>
    );
  } else if (error) {
    body = (
      <div
        role="alert"
        className="flex flex-col items-center justify-center gap-3 text-center"
        style={{ minHeight: height }}
      >
        <p className="max-w-xs text-sm font-medium text-danger">{error}</p>
        {onRetry && (
          <Button variant="ghost" size="sm" icon={RotateCw} label={UI_TEXT.actions.retry} onClick={onRetry} />
        )}
      </div>
    );
  } else if (empty) {
    body = (
      <div className="flex flex-col items-center justify-center gap-3 text-center" style={{ minHeight: height }}>
        <p className="max-w-xs text-sm font-medium text-text-muted">{emptyMessage}</p>
        {emptyAction}
      </div>
    );
  } else {
    body = (
      <>
        {legend}
        {children}
        <ChartTable caption={title} table={table} />
      </>
    );
  }

  return (
    <figure
      aria-labelledby={headingId}
      aria-busy={loading || undefined}
      className="@container min-w-0 rounded-2xl border border-border bg-surface p-4 shadow-card sm:p-5"
    >
      <div className="mb-3 flex min-h-9 items-center justify-between gap-3">
        <h2 id={headingId} className="font-heading text-base font-semibold text-text">
          {title}
        </h2>
        {action}
      </div>
      {body}
    </figure>
  );
}
