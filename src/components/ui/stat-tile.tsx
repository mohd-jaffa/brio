import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react";

import { UI_TEXT } from "@/constants/messages";

import { Sparkline } from "./charts/sparkline";
import { cn } from "./cn";
import { Medallion, type MedallionTone } from "./medallion";

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
  const good = change === 0 ? undefined : (change > 0) === (up === "good");
  const Arrow = change > 0 ? ArrowUp : ArrowDown;
  return (
    <dd className="order-4 mt-2 text-xs">
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
 */
export function StatTile({
  label,
  value,
  icon,
  tone = "primary",
  headline = false,
  delta,
  trend,
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
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-border bg-surface p-4 shadow-card">
      {icon && <Medallion icon={icon} tone={tone} size="sm" className="order-1 mb-3" />}
      <dt className="order-3 mt-0.5 text-sm text-text-muted">{label}</dt>
      <dd
        className={cn(
          "order-2 truncate text-2xl tabular-nums text-text",
          headline ? "font-heading font-medium" : "font-semibold",
        )}
      >
        {value}
      </dd>
      {delta && <DeltaLine delta={delta} />}
      {trend && <Sparkline values={trend} className="order-5 mt-3 hidden lg:block" />}
    </div>
  );
}
