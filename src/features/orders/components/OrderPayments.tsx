"use client";

import { Wallet } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Row, RowList } from "@/components/ui/row";
import { ScreenNotice } from "@/components/ui/screen-notice";
import { SkeletonRows } from "@/components/ui/skeleton";
import { UI_TEXT } from "@/constants/messages";
import { PAYMENT_METHOD_LABELS } from "@/constants/statuses";
import type { Payment } from "@/features/payments/types";
import { errorMessage } from "@/lib/errors/errorMessage";
import { formatPaise } from "@/lib/format/currency";
import { formatDateTime } from "@/lib/format/date";

/**
 * The payments recorded against an order (plan §139.10, §139.11.9) — they,
 * not a status set by hand, decide what is paid — and **Collect payment**
 * while a balance is due.
 */
export function OrderPayments({
  payments,
  loading,
  error,
  onRetry,
  canCollect,
  onCollect,
}: {
  payments?: readonly Payment[];
  loading: boolean;
  error?: unknown;
  onRetry: () => void;
  /** A balance is due and the order is not cancelled. */
  canCollect: boolean;
  onCollect: () => void;
}) {
  const text = UI_TEXT.orderDetail;
  // The payments there when the list first showed; one recorded since drops in.
  const [known, setKnown] = useState<ReadonlySet<string> | null>(null);
  if (payments && known === null) setKnown(new Set(payments.map((payment) => payment.id)));

  const list = payments ? (
    payments.length === 0 ? (
      <p className="text-sm text-text-muted">{text.noPayments}</p>
    ) : (
      <RowList label={text.payments}>
        {payments.map((payment) => (
          <Row
            key={payment.id}
            title={PAYMENT_METHOD_LABELS[payment.payment_method]}
            subtitle={formatDateTime(payment.paid_at)}
            meta={payment.reference ?? undefined}
            trailing={<span className="tabular-nums">{formatPaise(payment.amount)}</span>}
            arriving={known !== null && !known.has(payment.id)}
          />
        ))}
      </RowList>
    )
  ) : loading ? (
    <SkeletonRows rows={1} height="h-14" />
  ) : (
    <div className="space-y-3">
      <ScreenNotice>{errorMessage(error, "PAYMENTS_LOAD_FAILED")}</ScreenNotice>
      <Button label={UI_TEXT.actions.retry} variant="secondary" size="sm" onClick={onRetry} />
    </div>
  );

  return (
    <section aria-labelledby="order-payments-heading" className="space-y-3">
      <h2 id="order-payments-heading" className="font-heading text-lg font-medium text-text">
        {text.payments}
      </h2>
      {list}
      {canCollect && <Button label={text.collect} icon={Wallet} fullWidth onClick={onCollect} />}
    </section>
  );
}
