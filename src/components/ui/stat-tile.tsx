import { ArrowDown, ArrowUp, ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { UI_TEXT } from "@/constants/messages";

import { Sparkline } from "./charts/sparkline";
import { cn } from "./cn";
import { Medallion, type MedallionTone } from "./medallion";
import { RollingNumber } from "./rolling-number";

/** How a figure moved against the previous period. */
export interface StatDelta {
  /** Whole percent, signed: 12 for up 12 %. */
  change: number;
  /** Whether a rise is good news. A cost is `bad`: up reads rose, down green. */
  up?: "good" | "bad";
  /** What it is measured against, when the tile says so: "vs last month". */
  since?: string;
}

function DeltaLine({ delta }: { delta: StatDelta }) {
  const { change, up = "good", since } = delta;
  const good = change === 0 ? undefined : change > 0 === (up === "good");
  const Arrow = change > 0 ? ArrowUp : ArrowDown;
  return (
    <dd className="col-span-2 row-start-3 mt-2 text-xs @max-[8.5rem]:row-start-4 lg:row-start-4">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 font-semibold tabular-nums",
          good === undefined ? "text-text-muted" : good ? "text-success" : "text-danger",
        )}
      >
        {change === 0 ? (
          UI_TEXT.stats.unchanged
        ) : (
          <>
            <Arrow size={14} strokeWidth={2.25} aria-hidden="true" />
            <span className="sr-only">{change > 0 ? UI_TEXT.stats.up : UI_TEXT.stats.down} </span>
            {UI_TEXT.charts.percent(Math.abs(change))}
          </>
        )}
      </span>
      {since && <span className="mt-0.5 block text-text-muted">{since}</span>}
    </dd>
  );
}

/**
 * One number and what it means (plan §139.5): a medallion when it has an
 * icon, the figure (in the serif when it is a headline amount), its label,
 * how it moved on the previous period, and on a desktop the period's shape
 * as a sparkline. It is a label–value group, so it sits inside a `<dl>`, and
 * reads "Total sales, ₹45,280, up 12%".
 *
 * Below 1024 px the label sits beside the medallion, so a phone's two rows of
 * tiles leave room for what follows them; the figure keeps the tile's whole
 * width, so a long amount is not cut short. That row is always two lines
 * tall, so when one tile's label wraps ("Total expenses") the figures beside
 * each other still line up. A tile whose inside is narrower than 8.5 rem —
 * two to a row on a phone under 390 px — has no room for "Due today" beside
 * its medallion, and stacks as a desktop's does (a container query: the
 * tile's width, not the screen's). From 1024 px the label drops
 * under the figure, and the sparkline takes the medallion's row — so a tile
 * with one is exactly as tall as a tile without.
 *
 * A tile with `href` opens where its figure is looked into: the whole tile is
 * the target, named by its label, with a chevron as a row has one. `note`
 * takes the line under the figure that `delta` would — a tile has one of the
 * two: what needs seeing there ("6 late").
 */
export function StatTile({
  label,
  value,
  icon,
  tone = "primary",
  headline = false,
  delta,
  trend,
  motionValue,
  href,
  note,
}: {
  label: string;
  /** Already formatted — "₹1,240" or "7" — so the tile never decides how money reads. */
  value: string;
  icon?: LucideIcon;
  /** The medallion's tint. */
  tone?: MedallionTone;
  /** Sets the figure in the serif, as the references set a headline amount. */
  headline?: boolean;
  delta?: StatDelta;
  /** The period's values, drawn as a sparkline from 1024 px. */
  trend?: number[];
  /** The unformatted figure, used only to give a changed value its direction. */
  motionValue?: number;
  /** Where the figure is looked into. */
  href?: string;
  /** What needs seeing beside the figure — "6 late" — in the danger tone. */
  note?: string;
}) {
  return (
    <div
      className={cn(
        "@container grid min-w-0 grid-cols-[auto_minmax(0,1fr)] content-start gap-x-3 rounded-2xl border border-border bg-surface p-4 shadow-card",
        href && "relative transition-colors has-[a:hover]:bg-surface-hover",
      )}
    >
      {icon && <Medallion icon={icon} tone={tone} size="sm" className="col-start-1 row-start-1 self-center" />}
      <dt
        className={cn(
          "row-start-1 flex min-h-10 items-center text-sm text-text-muted lg:col-span-2 lg:col-start-1 lg:row-start-3 lg:mt-0.5 lg:block lg:min-h-0",
          // A tile too narrow for both — two to a row on a phone under 390 px — stacks as a desktop's does.
          "@max-[8.5rem]:col-span-2 @max-[8.5rem]:col-start-1 @max-[8.5rem]:row-start-3 @max-[8.5rem]:mt-0.5 @max-[8.5rem]:block @max-[8.5rem]:min-h-0",
          icon ? "col-start-2" : "col-span-2 col-start-1",
        )}
      >
        {href ? (
          // The whole tile is the link: its ::after covers it, and wears the focus ring.
          <Link
            href={href}
            className="flex w-full items-center justify-between gap-1 after:absolute after:inset-0 after:rounded-2xl focus-visible:shadow-none focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-primary"
          >
            {label}
            <ChevronRight size={16} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
          </Link>
        ) : (
          label
        )}
      </dt>
      <dd
        className={cn(
          "col-span-2 row-start-2 mt-2 truncate text-2xl tabular-nums text-text @max-[8.5rem]:mt-3 lg:mt-3",
          headline ? "font-heading font-medium" : "font-semibold",
        )}
      >
        {motionValue === undefined ? value : <RollingNumber value={motionValue}>{value}</RollingNumber>}
      </dd>
      {delta && <DeltaLine delta={delta} />}
      {note && (
        <dd className="col-span-2 row-start-3 mt-2 text-xs font-semibold text-danger @max-[8.5rem]:row-start-4 lg:row-start-4">
          {note}
        </dd>
      )}
      {trend && (
        <Sparkline
          values={trend}
          className="col-start-2 row-start-1 hidden w-24 self-center justify-self-end lg:block"
        />
      )}
    </div>
  );
}
