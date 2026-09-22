import type { StatusTone } from "@/constants/statuses";

import { cn } from "./cn";

/**
 * The small word beside a row that says where something stands. The tone comes
 * from the constant maps in src/constants/statuses.ts, so the same status
 * cannot be amber on one screen and grey on another.
 */
const TONES: Record<StatusTone, string> = {
  neutral: "bg-text-muted/10 text-text-muted",
  info: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
};

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: StatusTone }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        TONES[tone],
      )}
    >
      {label}
    </span>
  );
}
