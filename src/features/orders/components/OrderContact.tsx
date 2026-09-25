"use client";

import { MapPin, MessageCircle, Phone, UserRound } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/button";
import { SkeletonRows } from "@/components/ui/skeleton";
import { UI_TEXT } from "@/constants/messages";
import type { Customer } from "@/features/customers/types";
import { formatDateTime } from "@/lib/format/date";
import { callHref, formatPhoneDigits, whatsAppHref } from "@/lib/phone";

import type { Order } from "../types";
import { deliveryLabel, isOverdue } from "../view";

const CARD = "space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-card";
const HEADING = "font-heading text-lg font-medium text-text";

/**
 * Who the order is for and how it is handed over (plan §139.10): the
 * customer with **Call** and **WhatsApp** — a `wa.me` link, no integration
 * (IMP-02) — or Guest, who has neither; then pickup or delivery, when, where,
 * and **Map** when the order has a map link.
 */
export function OrderContact({
  order,
  customer,
  loading,
}: {
  order: Order;
  /** The saved customer, once read; nothing for a Guest order. */
  customer?: Customer;
  loading: boolean;
}) {
  const text = UI_TEXT.orderDetail;
  const late = isOverdue(order);

  const who =
    order.customerId === null ? (
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-sunken text-text-muted"
        >
          <UserRound size={20} strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text">{UI_TEXT.orders.guest}</p>
          <p className="text-sm text-text-muted">{UI_TEXT.customerPicker.guestHint}</p>
        </div>
      </div>
    ) : customer ? (
      <>
        <div className="flex items-center gap-3">
          <Avatar name={customer.name} />
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold text-text">{customer.name}</p>
            <p className="text-sm tabular-nums text-text-muted">
              {UI_TEXT.fields.phonePrefix} {formatPhoneDigits(customer.phone)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <LinkButton
            href={callHref(customer.phone)}
            label={text.call}
            accessibleName={text.callName(customer.name)}
            icon={Phone}
            variant="secondary"
            size="sm"
          />
          <LinkButton
            href={whatsAppHref(customer.phone)}
            label={text.whatsApp}
            accessibleName={text.whatsAppName(customer.name)}
            icon={MessageCircle}
            variant="secondary"
            size="sm"
            newTab
          />
        </div>
      </>
    ) : loading ? (
      <SkeletonRows rows={1} height="h-12" />
    ) : (
      <p className="text-sm font-semibold text-text">{UI_TEXT.orders.unknownCustomer}</p>
    );

  return (
    <>
      <section aria-labelledby="order-customer-heading" className={CARD}>
        <h2 id="order-customer-heading" className={HEADING}>
          {text.customer}
        </h2>
        {who}
      </section>

      <section aria-labelledby="order-handover-heading" className={CARD}>
        <h2 id="order-handover-heading" className={HEADING}>
          {text.handOver}
        </h2>
        <p className={late ? "text-sm font-semibold text-danger" : "text-sm font-medium text-text"}>
          {deliveryLabel(order)} · {formatDateTime(order.delivery.date)}
          {late && ` · ${UI_TEXT.orders.overdue}`}
        </p>
        {order.delivery.address && (
          <p className="whitespace-pre-line break-words text-sm text-text">{order.delivery.address}</p>
        )}
        {order.delivery.googleMapsLink && (
          <LinkButton
            href={order.delivery.googleMapsLink}
            label={text.openMap}
            accessibleName={`${text.openMap}: ${text.openMapLabel}`}
            icon={MapPin}
            variant="ghost"
            size="sm"
            newTab
          />
        )}
      </section>
    </>
  );
}
