import { UI_TEXT } from "@/constants/messages";
import { formatPaise } from "@/lib/format/currency";
import { parseRupees } from "@/lib/money";

import type { DraftAdjustment } from "../draft";
import type { OrderTotals } from "../totals";

/**
 * What the order comes to as it stands (plan §139.10): the items, each
 * discount and charge by name, the total — and, on the payment step, what is
 * paid now and what will be left to pay.
 */
export function OrderSummary({
  itemCount,
  totals,
  adjustments,
  paid,
}: {
  itemCount: number;
  totals: OrderTotals;
  adjustments: readonly DraftAdjustment[];
  /** Whole paise paid as the order is placed; shown only on the payment step. */
  paid?: number;
}) {
  const text = UI_TEXT.newOrder;
  // Only what reads as an amount above nothing; a half-typed one counts for nothing.
  const counted = adjustments.flatMap((entry) => {
    const paise = parseRupees(entry.amount) ?? 0;
    return paise > 0 ? [{ ...entry, paise }] : [];
  });
  return (
    <section
      aria-labelledby="order-summary-heading"
      className="rounded-2xl border border-border bg-surface p-4 shadow-card"
    >
      <h2 id="order-summary-heading" className="mb-3 font-heading text-lg font-medium text-text">
        {text.summary}
      </h2>
      <dl className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-text-muted">{text.subtotal(itemCount)}</dt>
          <dd className="tabular-nums text-text">{formatPaise(totals.subtotal)}</dd>
        </div>
        {counted.map((entry) => (
          <div key={entry.key} className="flex items-center justify-between">
            <dt className="text-text-muted">
              {entry.name || (entry.type === "DISCOUNT" ? text.discountName : text.chargeName)}
            </dt>
            <dd className="tabular-nums text-text">
              {entry.type === "DISCOUNT" ? "−" : "+"}
              {formatPaise(entry.paise)}
            </dd>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <dt className="font-semibold text-text">{text.total}</dt>
          <dd className="font-heading text-xl font-medium tabular-nums text-text">{formatPaise(totals.total)}</dd>
        </div>
        {paid !== undefined && (
          <>
            <div className="flex items-center justify-between">
              <dt className="text-text-muted">{text.paidNow}</dt>
              <dd className="tabular-nums text-text">{formatPaise(paid)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-semibold text-text">{text.balanceDue}</dt>
              <dd className="font-semibold tabular-nums text-text">{formatPaise(Math.max(0, totals.total - paid))}</dd>
            </div>
          </>
        )}
      </dl>
    </section>
  );
}
