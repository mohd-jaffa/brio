import { UI_TEXT } from "@/constants/messages";
import { formatPaise } from "@/lib/format/currency";

import type { Order } from "../types";
import { balanceDue } from "../view";

/**
 * What was ordered and what it comes to (plan §139.10, IMP-07): each line in
 * full — never cut short (§136 D5-5) — with its note for the bill, then the
 * subtotal, each discount and charge, the total, what has been paid and the
 * balance due.
 */
export function OrderLines({ order }: { order: Order }) {
  const text = UI_TEXT.orderDetail;
  const { pricing } = order;
  return (
    <section
      aria-labelledby="order-lines-heading"
      className="rounded-2xl border border-border bg-surface p-4 shadow-card"
    >
      <h2 id="order-lines-heading" className="mb-2 font-heading text-lg font-medium text-text">
        {text.items}
      </h2>
      <ul role="list" className="divide-y divide-border">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold text-text">
                {item.productName}
                {item.custom && (
                  <span className="ml-2 rounded-full bg-sunken px-2 py-0.5 align-middle text-xs font-medium text-text">
                    {UI_TEXT.newOrder.customMark}
                  </span>
                )}
              </p>
              <p className="text-sm tabular-nums text-text-muted">
                {text.each(item.quantity, formatPaise(item.unitPrice))}
              </p>
              {item.notes && <p className="mt-1 break-words text-sm italic text-text-muted">{item.notes}</p>}
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums text-text">{formatPaise(item.subtotal)}</p>
          </li>
        ))}
      </ul>

      <dl className="mt-2 space-y-2 border-t border-border pt-3 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-text-muted">{text.subtotal}</dt>
          <dd className="tabular-nums text-text">{formatPaise(pricing.subtotal)}</dd>
        </div>
        {order.adjustments.map((adjustment) => (
          <div key={adjustment.id} className="flex items-center justify-between">
            <dt className="text-text-muted">{adjustment.name}</dt>
            <dd className="tabular-nums text-text">
              {adjustment.type === "DISCOUNT" ? "−" : "+"}
              {formatPaise(adjustment.amount)}
            </dd>
          </div>
        ))}
        {pricing.tax > 0 && (
          <div className="flex items-center justify-between">
            <dt className="text-text-muted">{text.tax}</dt>
            <dd className="tabular-nums text-text">{formatPaise(pricing.tax)}</dd>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <dt className="font-semibold text-text">{text.total}</dt>
          <dd className="font-heading text-xl font-medium tabular-nums text-text">{formatPaise(pricing.total)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-text-muted">{text.paid}</dt>
          <dd className="tabular-nums text-text">{formatPaise(order.payment.paid)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="font-semibold text-text">{text.balanceDue}</dt>
          <dd className="font-semibold tabular-nums text-text">{formatPaise(balanceDue(order))}</dd>
        </div>
      </dl>
    </section>
  );
}
