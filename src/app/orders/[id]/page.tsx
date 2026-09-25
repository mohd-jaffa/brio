"use client";

import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { ArrowLeft, Clock, CreditCard, MapPin, Phone, Printer, ShoppingBag } from "lucide-react";

import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/ui/button";
import { ScreenNotice } from "@/components/ui/screen-notice";
import { SkeletonRows } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { optionsFrom, SelectField } from "@/components/ui/text-field";
import { useResponse } from "@/components/ui/response-card";
import { UI_TEXT } from "@/constants/messages";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUSES,
  type OrderStatus,
  type PaymentStatus,
} from "@/constants/statuses";
import type { Customer } from "@/features/customers/types";
import { OrdersClient } from "@/features/orders/api.client";
import type { Order } from "@/features/orders/types";
import { nextStatuses } from "@/features/orders/lifecycle";
import { isOverdue, paymentPill, statusPill } from "@/features/orders/view";
import { PaymentCollectionForm } from "@/features/payments/components/PaymentCollectionForm";
import type { Payment } from "@/features/payments/types";
import { ReceiptPrintView } from "@/features/receipts/components/ReceiptPrintView";
import type { ReceiptData } from "@/features/receipts/types";
import { formatPaise } from "@/lib/format/currency";
import { formatDateTime } from "@/lib/format/date";
import { sumPaise } from "@/lib/money";
import { apiRoutes } from "@/lib/query/keys";
import { useApiMutation } from "@/lib/query/useApiMutation";
import { useApiQuery } from "@/lib/query/useApiQuery";

/** A labelled block on the detail page — the page is a column of these. */
function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: typeof Clock;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
      <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
        {Icon && <Icon size={14} className="text-primary" aria-hidden="true" />}
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [showReceipt, setShowReceipt] = useState(false);
  const [collecting, setCollecting] = useState(false);

  const order = useApiQuery<Order>(apiRoutes.orders.detail(id));
  const customer = useApiQuery<Customer>(
    order.data ? apiRoutes.customers.detail(order.data.customerId) : null,
  );
  const payments = useApiQuery<Payment[]>(apiRoutes.orders.payments(id));
  // A receipt is built only when it is asked for, and never stored (AGENTS.md §15).
  const receipt = useApiQuery<ReceiptData>(showReceipt ? apiRoutes.orders.receipt(id) : null);

  const respond = useResponse();
  const update = useApiMutation<{ status?: OrderStatus; paymentStatus?: PaymentStatus }, Order>(
    (patch) => OrdersClient.updateStatus(id, patch),
    {
      revalidate: [apiRoutes.orders.detail(id), apiRoutes.orders.list],
      onSuccess: (updated) =>
        respond.success({
          title: updated.status === "CANCELLED" ? UI_TEXT.outcomes.orderCancelled : UI_TEXT.outcomes.orderUpdated,
        }),
      onError: (failure) =>
        respond.failure(failure, { title: UI_TEXT.outcomes.orderNotUpdated, fallback: "SAVE_FAILED" }),
    },
  );

  if (order.error) {
    return (
      <AppShell>
        <ScreenNotice>That order could not be loaded.</ScreenNotice>
        <Button label="Go back" variant="secondary" icon={ArrowLeft} onClick={() => router.back()} />
      </AppShell>
    );
  }

  if (!order.data) {
    return (
      <AppShell>
        <div role="status" aria-busy="true" aria-label="Loading order">
          <SkeletonRows rows={2} height="h-40" />
        </div>
      </AppShell>
    );
  }

  const current = order.data;
  const status = statusPill(current);
  const payment = paymentPill(current);
  const late = isOverdue(current);
  const paid = sumPaise((payments.data ?? []).map((line) => line.amount));
  // Only where this order may go from here (plan §139.11.8); a finished order goes nowhere.
  const statusChoices = [current.status, ...nextStatuses(current.status, current.delivery.type)];

  async function moveTo(next: OrderStatus) {
    // Cancelling cannot be undone and returns stock, so it is asked first.
    if (
      next === "CANCELLED" &&
      !(await respond.confirm({
        title: UI_TEXT.orders.cancelTitle(current.orderNumber),
        message: UI_TEXT.orders.cancelBody,
        confirmLabel: UI_TEXT.orders.cancelConfirm,
        cancelLabel: UI_TEXT.outcomes.keepOrder,
        tone: "danger",
      }))
    ) {
      return;
    }
    await update.submit({ status: next });
  }

  return (
    <>
      <AppShell>
        <div className="flex items-center justify-between">
          <Button label="Back" icon={ArrowLeft} variant="ghost" onClick={() => router.back()} />
          <Button
            label="Generate Receipt"
            icon={Printer}
            variant="secondary"
            onClick={() => setShowReceipt(true)}
          />
        </div>

        <section className="flex flex-col justify-between gap-6 rounded-3xl border border-border bg-gradient-to-br from-surface to-surface-hover p-6 shadow-elevated sm:flex-row sm:items-start sm:p-8">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Order {current.orderNumber}
              </span>
              <StatusPill label={status.label} tone={status.tone} />
            </div>
            <h1 className="mb-2 font-heading text-2xl font-bold text-text">
              {customer.data?.name ?? "—"}
            </h1>
            {customer.data && (
              <p className="flex items-center gap-2 text-sm font-medium text-text-muted">
                <Phone size={14} aria-hidden="true" /> {customer.data.phone}
              </p>
            )}
          </div>

          <div className="text-left sm:text-right">
            <span className="mb-1 block font-heading text-3xl font-bold text-text">
              {formatPaise(current.pricing.total)}
            </span>
            <StatusPill label={payment.label} tone={payment.tone} />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Panel title="Order Status" icon={ShoppingBag}>
            <SelectField
              label="Order Status"
              value={current.status}
              disabled={update.submitting || statusChoices.length === 1}
              options={optionsFrom(statusChoices, ORDER_STATUS_LABELS)}
              onChange={(event) => moveTo(event.target.value as OrderStatus)}
            />
          </Panel>

          <Panel title="Payment Status" icon={CreditCard}>
            <div className="space-y-3">
              <SelectField
                label="Payment Status"
                value={current.payment.status}
                disabled={update.submitting}
                options={optionsFrom(PAYMENT_STATUSES, PAYMENT_STATUS_LABELS)}
                onChange={(event) =>
                  update.submit({ paymentStatus: event.target.value as PaymentStatus })
                }
              />
              {current.payment.status !== "PAID" && (
                <Button
                  label="Collect Payment"
                  variant="secondary"
                  fullWidth
                  onClick={() => setCollecting(true)}
                />
              )}
            </div>
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Panel title="Delivery Details" icon={Clock}>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Type &amp; time
                </dt>
                <dd className={late ? "font-bold text-danger" : "font-medium text-text"}>
                  {current.delivery.type} on {formatDateTime(current.delivery.date)}
                </dd>
              </div>
              {current.delivery.address && (
                <div>
                  <dt className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    Address
                  </dt>
                  <dd className="font-medium leading-relaxed text-text">{current.delivery.address}</dd>
                </div>
              )}
            </dl>
            {current.delivery.googleMapsLink && (
              <a
                href={current.delivery.googleMapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center gap-1 text-sm font-bold text-primary hover:underline"
              >
                <MapPin size={14} aria-hidden="true" /> Open in Maps
              </a>
            )}
          </Panel>

          <Panel title="Notes">
            <p className="text-sm font-medium leading-relaxed text-text">
              {current.notes || "No special instructions."}
            </p>
          </Panel>
        </div>

        <Panel title="Order Items" icon={ShoppingBag}>
          <ul role="list" className="divide-y divide-dashed divide-border/50">
            {current.items.map((item) => (
              <li key={item.id} className="grid grid-cols-[3fr_1fr_2fr] items-center gap-4 py-3">
                <span className="truncate text-sm font-bold text-text">{item.productName}</span>
                <span className="text-sm font-medium tabular-nums text-text-muted">
                  ×{item.quantity}
                </span>
                <span className="text-right font-heading text-sm font-bold tabular-nums text-text">
                  {formatPaise(item.subtotal)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-3 border-t border-border pt-4 text-sm">
            <div className="flex items-center justify-between">
              <dt className="font-medium text-text-muted">Subtotal</dt>
              <dd className="font-heading font-bold tabular-nums text-text">
                {formatPaise(current.pricing.subtotal)}
              </dd>
            </div>

            {current.adjustments.map((adjustment) => (
              <div key={adjustment.id} className="flex items-center justify-between">
                <dt className="font-medium text-text-muted">{adjustment.name}</dt>
                <dd
                  className={`font-bold tabular-nums ${
                    adjustment.type === "DISCOUNT" ? "text-success" : "text-text"
                  }`}
                >
                  {adjustment.type === "DISCOUNT" ? "−" : "+"}
                  {formatPaise(adjustment.amount)}
                </dd>
              </div>
            ))}

            <div className="flex items-center justify-between">
              <dt className="font-medium text-text-muted">Tax</dt>
              <dd className="font-heading font-bold tabular-nums text-text">
                {formatPaise(current.pricing.tax)}
              </dd>
            </div>

            <div className="flex items-center justify-between border-t border-border/50 pt-4">
              <dt className="text-sm font-bold uppercase tracking-wider text-text">Total</dt>
              <dd className="rounded-lg border border-primary/10 bg-primary/5 px-3 py-1 font-heading text-xl font-bold tabular-nums text-text">
                {formatPaise(current.pricing.total)}
              </dd>
            </div>
          </dl>
        </Panel>
      </AppShell>

      {collecting && (
        <PaymentCollectionForm
          orderId={id}
          orderTotal={current.pricing.total}
          totalPaid={paid}
          onCancel={() => setCollecting(false)}
          onPaymentSuccess={() => {
            setCollecting(false);
            void order.mutate();
            void payments.mutate();
          }}
        />
      )}

      {showReceipt && receipt.data && (
        <ReceiptPrintView
          receipt={receipt.data}
          customerName={customer.data?.name}
          customerPhone={customer.data?.phone}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </>
  );
}
