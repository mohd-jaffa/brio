import type { LucideIcon } from "lucide-react";

import { cn } from "./cn";

/**
 * One number and what it means — the dashboard and the analytics page are
 * built from these. Both had their own copy of the same tile, which is how
 * they came to disagree about how a figure is set.
 */
export type StatTone = "neutral" | "success" | "warning" | "danger";

const TONES: Record<StatTone, { box: string; label: string; value: string }> = {
  neutral: { box: "border-border bg-background", label: "text-text-muted", value: "text-text" },
  success: {
    box: "border-success/20 bg-gradient-to-br from-success/10 to-success/5",
    label: "text-success",
    value: "text-success",
  },
  warning: { box: "border-border bg-background", label: "text-text-muted", value: "text-warning" },
  danger: { box: "border-danger/20 bg-danger-bg/50", label: "text-danger", value: "text-danger" },
};

export function StatTile({
  label,
  value,
  tone = "neutral",
  icon: Icon,
}: {
  label: string;
  /** Already formatted — "₹1,240" or "7" — so the tile never decides how money reads. */
  value: string;
  tone?: StatTone;
  icon?: LucideIcon;
}) {
  const styles = TONES[tone];
  return (
    <div
      className={cn(
        "relative flex flex-col justify-between overflow-hidden rounded-xl border p-3.5",
        styles.box,
      )}
    >
      <dt className={cn("mb-2 text-xs font-semibold uppercase tracking-wider", styles.label)}>
        {label}
      </dt>
      <dd className={cn("font-heading text-2xl font-bold", styles.value)}>{value}</dd>
      {Icon && (
        <Icon size={48} aria-hidden="true" className="absolute -bottom-2 -right-2 opacity-10" />
      )}
    </div>
  );
}
