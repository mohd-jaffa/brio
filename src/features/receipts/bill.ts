import { UI_TEXT } from "@/constants/messages";
import type { BusinessProfile } from "@/features/business/types";
import type { Customer } from "@/features/customers/types";
import type { OrderEstimate } from "@/features/orders/estimate";
import type { Order } from "@/features/orders/types";
import type { Payment } from "@/features/payments/types";

import type { Bill, BillBusiness } from "./types";

/**
 * The bill's two sources (plan §139.11.5, §139.11.6): a placed order with its
 * payments, read on the server for `GET /api/orders/{id}/bill`, and the
 * estimate the server priced for a draft, put together in the browser. Both
 * come to the same shape, so one view, one image and one PDF draw them.
 */

function fromBusiness({ name, tagline, address, city, phone, logoUrl }: BusinessProfile): BillBusiness {
  return { name, tagline, address, city, phone, logoUrl };
}

export function orderBill({
  order,
  payments,
  customer,
  business,
  appUrl,
}: {
  order: Order;
  payments: readonly Payment[];
  /** The order's customer; absent for a Guest order. */
  customer?: Pick<Customer, "name" | "phone">;
  business: BusinessProfile;
  appUrl: string;
}): Bill {
  const paid = order.payment.paid;
  return {
    kind: "CONFIRMED",
    business: fromBusiness(business),
    orderNumber: order.orderNumber,
    issuedAt: order.createdAt,
    billedTo: customer ? { kind: "CUSTOMER", name: customer.name, phone: customer.phone } : { kind: "GUEST" },
    delivery: {
      type: order.delivery.type,
      date: order.delivery.date,
      address: order.delivery.address ?? null,
      googleMapsLink: order.delivery.googleMapsLink ?? null,
    },
    lines: order.items.map((item) => ({
      name: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
      note: item.notes ?? null,
    })),
    subtotal: order.pricing.subtotal,
    adjustments: order.adjustments.map(({ type, name, amount }) => ({ type, name, amount })),
    tax: order.pricing.tax,
    total: order.pricing.total,
    // Oldest first, the way they were taken.
    payments: [...payments]
      .sort((a, b) => a.paid_at.localeCompare(b.paid_at))
      .map((payment) => ({ method: payment.payment_method, reference: payment.reference, amount: payment.amount })),
    paid,
    balanceDue: Math.max(0, order.pricing.total - paid),
    appUrl,
  };
}

export function estimateBill({
  estimate,
  business,
  appUrl,
}: {
  estimate: OrderEstimate;
  business: BusinessProfile;
  appUrl: string;
}): Bill {
  const { customer, payment, totals } = estimate;
  return {
    kind: "ESTIMATE",
    business: fromBusiness(business),
    orderNumber: null,
    issuedAt: estimate.issuedAt,
    billedTo:
      customer.kind === "CUSTOMER" ? { kind: "CUSTOMER", name: customer.name, phone: customer.phone } : customer,
    delivery: estimate.delivery,
    lines: estimate.lines.map(({ name, quantity, unitPrice, subtotal, notes }) => ({
      name,
      quantity,
      unitPrice,
      subtotal,
      note: notes,
    })),
    subtotal: totals.subtotal,
    adjustments: estimate.adjustments,
    tax: totals.tax,
    total: totals.total,
    // Payment as chosen so far: nothing is recorded until the order is placed.
    payments:
      payment.method && payment.paid > 0
        ? [{ method: payment.method, reference: payment.reference, amount: payment.paid }]
        : [],
    paid: payment.paid,
    balanceDue: estimate.balanceDue,
    appUrl,
  };
}

/** Characters no file system takes in a name; control characters go too. */
const UNSAFE_IN_FILE_NAMES = /[/\\:*?"<>|]/g;

/**
 * What a shared or downloaded bill is called (the user, 2026-09-26):
 * `ORD-1028 - Sweet Delights Home Bakery.png`, and `Estimate - …` before the
 * order has a number.
 */
export function billFileName(bill: Pick<Bill, "orderNumber" | "business">, extension: "png" | "pdf"): string {
  const name = [...`${bill.orderNumber ?? UI_TEXT.bill.estimateFile} - ${bill.business.name}`]
    .filter((character) => character >= " ")
    .join("")
    .replace(UNSAFE_IN_FILE_NAMES, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `${name}.${extension}`;
}
