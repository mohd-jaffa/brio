import type { StatusTone } from "@/constants/statuses";

import { cn } from "./cn";

// Each status colour at 12 % over the surface, the word and a 6 px dot in the
// full colour: every pair measures ≥ 4.5 : 1 in both themes (plan §139.4).
const TONES: Record<StatusTone, string> = {
  pending: "bg-[color-mix(in_oklab,var(--color-status-pending)_12%,var(--color-surface))] text-status-pending",
  preparing: "bg-[color-mix(in_oklab,var(--color-status-preparing)_12%,var(--color-surface))] text-status-preparing",
  ready: "bg-[color-mix(in_oklab,var(--color-status-ready)_12%,var(--color-surface))] text-status-ready",
  transit: "bg-[color-mix(in_oklab,var(--color-status-transit)_12%,var(--color-surface))] text-status-transit",
  delivered: "bg-[color-mix(in_oklab,var(--color-status-delivered)_12%,var(--color-surface))] text-status-delivered",
  cancelled: "bg-[color-mix(in_oklab,var(--color-status-cancelled)_12%,var(--color-surface))] text-status-cancelled",
  neutral: "bg-[color-mix(in_oklab,var(--color-status-neutral)_12%,var(--color-surface))] text-status-neutral",
};

/**
 * Where something stands — an order's status, a payment's — as a tinted pill
 * with a dot (plan §139.5). The tone comes from the maps in
 * src/constants/statuses.ts, so the same status cannot be amber on one screen
 * and grey on another. The word carries the meaning; the colour only repeats it.
 */
export function StatusPill({ label, tone = "neutral" }: { label: string; tone?: StatusTone }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        TONES[tone],
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
