import { ArrowRight, ShoppingCart } from "lucide-react";

/**
 * What is in the order so far, and the way on (plan §139.5): a cart with its
 * count, the running total, and the dark go-on button. It stays at the foot
 * of the content column as the grid scrolls — above the bottom nav on a
 * phone, clear of the home indicator — and never needs to know how wide a
 * sidebar is.
 */
export function CartBar({
  count,
  countLabel,
  label,
  total,
  actionLabel,
  onAction,
  disabled = false,
}: {
  count: number;
  /** The count in words for a screen reader: "2 items". */
  countLabel: string;
  /** What the total is: "View order". */
  label: string;
  /** Already formatted: "₹1,410". */
  total: string;
  /** The go-on button's name: "Continue to order details". */
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="sticky bottom-[calc(var(--nav-height)+var(--safe-bottom)+0.75rem)] z-20 md:bottom-6">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-elevated">
        <span className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-sunken text-text">
          <ShoppingCart size={22} strokeWidth={1.75} aria-hidden="true" />
          <span
            aria-hidden="true"
            className="absolute -right-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold tabular-nums text-primary-text"
          >
            {count}
          </span>
          <span className="sr-only">{countLabel}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-text-muted">{label}</span>
          <span className="block truncate text-lg font-semibold tabular-nums text-text">{total}</span>
        </span>
        <button
          type="button"
          aria-label={actionLabel}
          onClick={onAction}
          disabled={disabled}
          className="touch-target inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-action text-action-text transition-colors hover:bg-action-hover active:scale-95 disabled:opacity-50"
        >
          <ArrowRight size={22} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
