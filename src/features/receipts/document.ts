import { UI_TEXT } from "@/constants/messages";
import { DELIVERY_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/constants/statuses";
import { dayKey } from "@/lib/dates/calendar";
import { formatPaise } from "@/lib/format/currency";
import { formatDate, formatDateTime } from "@/lib/format/date";
import { formatPhoneDigits } from "@/lib/phone";

import type { Bill } from "./types";

export interface BillParty {
  label: string;
  value: string;
  /** Lines under the value: a delivery's address. */
  details: string[];
  link: { label: string; href: string } | null;
}

export interface BillTotal {
  label: string;
  amount: string;
  /** The total is set large in the theme's colour; the balance due is bold. */
  emphasis: "normal" | "total" | "strong";
}

/**
 * The bill in words — every label resolved, every amount and date written
 * out — in the order it reads. The on-screen bill, the image and the PDF each
 * draw this and decide nothing, so the three cannot say different things.
 */
export interface BillDocument {
  business: { name: string; tagline: string | null; contact: string[]; logoUrl: string | null };
  heading: { label: string; note: string | null; number: string | null; date: string };
  parties: BillParty[];
  lines: { name: string; detail: string; amount: string; note: string | null }[];
  totals: BillTotal[];
  thanks: string;
  footer: { credit: string; host: string | null; href: string | null };
}

const phoneLine = (phone: string) => `${UI_TEXT.fields.phonePrefix} ${formatPhoneDigits(phone)}`;

/** The app's web root as the footer shows it — "ovenly.app" — or nothing if it is not a URL. */
function appLink(appUrl: string): { host: string; href: string } | null {
  try {
    const url = new URL(appUrl);
    return { host: url.host, href: url.origin };
  } catch {
    return null;
  }
}

export function billDocument(bill: Bill): BillDocument {
  const text = UI_TEXT.bill;
  const { business, delivery } = bill;
  const estimate = bill.kind === "ESTIMATE";
  const place = delivery.type === "DELIVERY";
  const link = appLink(bill.appUrl);

  return {
    business: {
      name: business.name,
      tagline: business.tagline,
      // As Business details previews it (BillHeaderPreview).
      contact: [business.address, business.city, business.phone ? phoneLine(business.phone) : null].filter(
        (line): line is string => Boolean(line),
      ),
      logoUrl: business.logoUrl,
    },
    heading: {
      label: estimate ? text.estimateRibbon : text.ribbon,
      note: estimate ? text.notConfirmed : null,
      number: bill.orderNumber,
      date: formatDate(dayKey(bill.issuedAt)),
    },
    parties: [
      {
        label: text.billedTo,
        value:
          bill.billedTo.kind === "CUSTOMER" ? `${bill.billedTo.name} · ${phoneLine(bill.billedTo.phone)}` : text.guest,
        details: [],
        link: null,
      },
      {
        label: DELIVERY_TYPE_LABELS[delivery.type],
        value: formatDateTime(delivery.date),
        details: place && delivery.address ? [delivery.address] : [],
        link: place && delivery.googleMapsLink ? { label: text.mapLink, href: delivery.googleMapsLink } : null,
      },
    ],
    lines: bill.lines.map((line) => ({
      name: line.name,
      detail: text.each(line.quantity, formatPaise(line.unitPrice)),
      amount: formatPaise(line.subtotal),
      note: line.note ? `“${line.note}”` : null,
    })),
    totals: [
      { label: text.subtotal, amount: formatPaise(bill.subtotal), emphasis: "normal" },
      ...bill.adjustments.map((adjustment) => ({
        label: adjustment.name,
        amount: `${adjustment.type === "DISCOUNT" ? "−" : "+"}${formatPaise(adjustment.amount)}`,
        emphasis: "normal" as const,
      })),
      // Tax only where there is some (§139.11.6, D1-7).
      ...(bill.tax > 0 ? [{ label: text.tax, amount: formatPaise(bill.tax), emphasis: "normal" as const }] : []),
      { label: text.total, amount: formatPaise(bill.total), emphasis: "total" },
      ...bill.payments.map((payment) => ({
        label: text.paid(PAYMENT_METHOD_LABELS[payment.method], payment.reference),
        amount: formatPaise(payment.amount),
        emphasis: "normal" as const,
      })),
      { label: text.balanceDue, amount: formatPaise(bill.balanceDue), emphasis: "strong" },
    ],
    thanks: text.thanks,
    footer: { credit: text.madeWith(UI_TEXT.appName), host: link?.host ?? null, href: link?.href ?? null },
  };
}

/** Sent beside the image, and copied where a file cannot be shared. */
export function billShareText(bill: Bill): string {
  const what = bill.orderNumber ? UI_TEXT.bill.title(bill.orderNumber) : UI_TEXT.bill.estimateTitle;
  return UI_TEXT.bill.shareText(
    what,
    bill.business.name,
    formatPaise(bill.total),
    bill.balanceDue > 0 ? formatPaise(bill.balanceDue) : null,
  );
}
