"use client";

import { ReceiptText } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { PageHeader } from "@/components/ui/page-header";
import { useResponse } from "@/components/ui/response-card";
import { RollingNumber } from "@/components/ui/rolling-number";
import { ScreenNotice } from "@/components/ui/screen-notice";
import { SkeletonRows } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { UI_TEXT } from "@/constants/messages";
import { orderStatusLabel, type OrderStatus } from "@/constants/statuses";
import type { Customer } from "@/features/customers/types";
import { PaymentCollectionForm } from "@/features/payments/components/PaymentCollectionForm";
import type { Payment } from "@/features/payments/types";
import { OrderBill } from "@/features/receipts/components/OrderBill";
import { errorMessage } from "@/lib/errors/errorMessage";
import { formatPaise } from "@/lib/format/currency";
import { formatDateTime } from "@/lib/format/date";
import { apiRoutes } from "@/lib/query/keys";
import { useApiMutation } from "@/lib/query/useApiMutation";
import { useApiQuery } from "@/lib/query/useApiQuery";

import { OrdersClient } from "../api.client";
import type { Order } from "../types";
import { balanceDue, deliveryLabel, paymentPill, statusPill } from "../view";
import { OrderAgain } from "./OrderAgain";
import { OrderContact } from "./OrderContact";
import { OrderLines } from "./OrderLines";
import { OrderPayments } from "./OrderPayments";
import { StatusActions } from "./StatusActions";

/**
 * One order (plan §139.10): its number, status and due date; the one next
 * step, with the other moves in a menu (IMP-06); who it is for, with Call,
 * WhatsApp and Map (IMP-02); the items and totals; the payments, the balance
 * due and Collect payment (IMP-07); and the bill, built when it is asked for
 * and never stored (AGENTS §15), shared from inside it.
 */
export function OrderDetail({ id }: { id: string }) {
  const text = UI_TEXT.orderDetail;
  const respond = useResponse();
  const [collecting, setCollecting] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  // The status it opened on: a move away from it pops the pill, a load does not.
  const [openedOn, setOpenedOn] = useState<OrderStatus | null>(null);

  const order = useApiQuery<Order>(apiRoutes.orders.detail(id));
  // A Guest order has no customer to read.
  const customerId = order.data?.customerId;
  const customer = useApiQuery<Customer>(customerId ? apiRoutes.customers.detail(customerId) : null);
  const payments = useApiQuery<Payment[]>(apiRoutes.orders.payments(id));

  const move = useApiMutation<OrderStatus, Order>((status) => OrdersClient.updateStatus(id, { status }), {
    revalidate: [apiRoutes.orders.detail(id), apiRoutes.orders.list],
    onSuccess: (moved) =>
      respond.success({
        title: moved.status === "CANCELLED" ? UI_TEXT.outcomes.orderCancelled : UI_TEXT.outcomes.orderUpdated,
        message: text.nowStatus(moved.orderNumber, orderStatusLabel(moved.status, moved.delivery.type)),
      }),
    onError: (failure) => {
      // It may have moved on another device: show where it is now.
      void order.mutate();
      respond.failure(failure, { title: UI_TEXT.outcomes.orderNotUpdated, fallback: "ORDER_STATUS_UPDATE_FAILED" });
    },
  });

  if (!order.data) {
    if (order.error) {
      return (
        <section className="space-y-4">
          <ScreenNotice>{errorMessage(order.error, "ORDER_LOAD_FAILED")}</ScreenNotice>
          <Button
            label={UI_TEXT.actions.retry}
            variant="secondary"
            loading={order.isValidating}
            onClick={() => void order.mutate()}
          />
        </section>
      );
    }
    return (
      <div role="status" aria-busy="true" aria-label={text.loading}>
        <SkeletonRows rows={3} height="h-32" />
      </div>
    );
  }

  const current = order.data;
  if (openedOn === null) setOpenedOn(current.status);
  const status = statusPill(current);
  const payment = paymentPill(current);
  const owed = balanceDue(current);

  return (
    <>
      <PageHeader
        title={current.orderNumber}
        subtitle={text.due(deliveryLabel(current), formatDateTime(current.delivery.date))}
        back="/orders"
      >
        <Button
          label={text.viewBill}
          icon={ReceiptText}
          variant="secondary"
          size="sm"
          onClick={() => setBillOpen(true)}
        />
      </PageHeader>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <section
          aria-label={current.orderNumber}
          className="space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-card lg:col-start-1"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <span
                key={current.status}
                className={cn("inline-flex", openedOn !== null && current.status !== openedOn && "animate-pop")}
              >
                <StatusPill label={status.label} tone={status.tone} />
              </span>
              <StatusPill label={payment.label} tone={payment.tone} />
            </div>
            <div className="text-right">
              <p className="font-heading text-3xl font-medium tabular-nums text-text">
                {formatPaise(current.pricing.total)}
              </p>
              {owed > 0 && (
                <p className="text-sm font-semibold tabular-nums text-text">
                  {text.balanceDue} <RollingNumber value={owed}>{formatPaise(owed)}</RollingNumber>
                </p>
              )}
            </div>
          </div>
          <StatusActions order={current} moving={move.submitting} onMove={(next) => void move.submit(next)} />
        </section>

        <div className="space-y-6 lg:col-start-2 lg:row-span-3 lg:row-start-1">
          <OrderContact order={current} customer={customer.data} loading={customer.isLoading} />
          {current.notes && (
            <section
              aria-labelledby="order-notes-heading"
              className="space-y-1 rounded-2xl border border-border bg-surface p-4 shadow-card"
            >
              <h2 id="order-notes-heading" className="font-heading text-lg font-medium text-text">
                {UI_TEXT.newOrder.internalNotes}
              </h2>
              <p className="text-xs text-text-muted">{UI_TEXT.newOrder.internalNotesHint}</p>
              <p className="whitespace-pre-line break-words text-sm text-text">{current.notes}</p>
            </section>
          )}
        </div>

        <div className="lg:col-start-1">
          <OrderLines order={current} action={<OrderAgain order={current} customer={customer.data} />} />
        </div>

        <div className="lg:col-start-1">
          <OrderPayments
            payments={payments.data}
            loading={payments.isLoading}
            error={payments.error}
            onRetry={() => void payments.mutate()}
            canCollect={owed > 0}
            onCollect={() => setCollecting(true)}
          />
        </div>
      </div>

      {collecting && (
        <PaymentCollectionForm
          orderId={id}
          orderTotal={current.pricing.total}
          totalPaid={current.payment.paid}
          onCancel={() => setCollecting(false)}
          onPaymentSuccess={() => setCollecting(false)}
        />
      )}

      <OrderBill orderId={id} orderNumber={current.orderNumber} open={billOpen} onClose={() => setBillOpen(false)} />
    </>
  );
}
