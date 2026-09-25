import type { AdjustmentType, DeliveryType, PaymentMethod, PaymentStatus } from "@/constants/statuses";
import { parseRupees } from "@/lib/money";
import type { OrderFormValues } from "@/lib/validation";

import { orderTotals, type OrderTotals } from "./totals";

/**
 * An order before it is placed (plan §110, §139.10): items first, then who it
 * is for and how it is handed over, then payment. It lives on this device
 * until it is placed or cleared, so a refresh or a back navigation loses
 * nothing (./hooks/useOrderDraft). Every change is a pure function here, so
 * the rules — above all the delivery autofill (§139.11.4) — are tested on
 * their own.
 */
export interface DraftLine {
  /** Stable across edits, for the list. */
  key: string;
  productId?: string;
  /** A special request: a name and the price of one, in paise (§139.11.7). */
  custom?: { name: string; unitPrice: number };
  quantity: number;
  /** Printed under the line on the bill: a cake message (§139.11.6). */
  notes: string;
}

/** A saved customer carries what the delivery autofill needs. */
export type DraftCustomer =
  | { kind: "GUEST" }
  | {
      kind: "CUSTOMER";
      id: string;
      name: string;
      phone: string;
      address: string;
      googleMapsLink: string;
    };

export interface DraftAdjustment {
  key: string;
  type: AdjustmentType;
  name: string;
  /** As typed, in rupees. */
  amount: string;
}

export interface DraftDelivery {
  type: DeliveryType;
  /** A datetime-local value: the business's wall clock, as the field shows it. */
  date: string;
  address: string;
  googleMapsLink: string;
  /** What the last autofill put in the two fields — how a typed value is told from a filled one. */
  filled: { address: string; googleMapsLink: string };
}

export interface OrderDraft {
  version: 1;
  lines: DraftLine[];
  customer: DraftCustomer | null;
  delivery: DraftDelivery;
  adjustments: DraftAdjustment[];
  payment: {
    status: PaymentStatus;
    method: PaymentMethod;
    reference: string;
    amount: string;
  };
  /** Internal notes: never on a bill. */
  notes: string;
}

export const DRAFT_VERSION = 1;

let counter = 0;
/** A key for a new line or adjustment, unique on this device. */
export function newKey(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter.toString(36)}`;
}

/** Tomorrow at this hour, as a datetime-local field wants it — worked out now, never when the module loaded (BUG-28). */
export function tomorrowAtThisHour(now: Date): string {
  const when = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  when.setMinutes(0, 0, 0);
  const offset = when.getTimezoneOffset() * 60_000;
  return new Date(when.getTime() - offset).toISOString().slice(0, 16);
}

export function newDraft(now: Date = new Date()): OrderDraft {
  return {
    version: DRAFT_VERSION,
    lines: [],
    customer: null,
    delivery: {
      type: "PICKUP",
      date: tomorrowAtThisHour(now),
      address: "",
      googleMapsLink: "",
      filled: { address: "", googleMapsLink: "" },
    },
    adjustments: [],
    payment: { status: "UNPAID", method: "UPI", reference: "", amount: "" },
    notes: "",
  };
}

/** A stored draft this build can still use, or null for a fresh one. */
export function readDraft(value: unknown): OrderDraft | null {
  if (typeof value !== "object" || value === null) return null;
  const draft = value as Partial<OrderDraft>;
  if (draft.version !== DRAFT_VERSION || !Array.isArray(draft.lines) || !draft.delivery || !draft.payment) return null;
  return draft as OrderDraft;
}

// ---------------------------------------------------------------- items

/** One more of a product: its line goes up by one, or a line is added. */
export function addProduct(draft: OrderDraft, productId: string): OrderDraft {
  const existing = draft.lines.find((line) => line.productId === productId);
  if (existing) return setQuantity(draft, existing.key, existing.quantity + 1);
  return {
    ...draft,
    lines: [...draft.lines, { key: newKey(), productId, quantity: 1, notes: "" }],
  };
}

/** A custom line; its description, if it has one, is the note printed under it. */
export function addCustom(
  draft: OrderDraft,
  { name, unitPrice, description }: { name: string; unitPrice: number; description?: string | null },
): OrderDraft {
  return {
    ...draft,
    lines: [
      ...draft.lines,
      {
        key: newKey(),
        custom: { name, unitPrice },
        quantity: 1,
        notes: description ?? "",
      },
    ],
  };
}

export function setQuantity(draft: OrderDraft, key: string, quantity: number): OrderDraft {
  return {
    ...draft,
    lines: draft.lines.map((line) => (line.key === key ? { ...line, quantity } : line)),
  };
}

export function setLineNote(draft: OrderDraft, key: string, notes: string): OrderDraft {
  return {
    ...draft,
    lines: draft.lines.map((line) => (line.key === key ? { ...line, notes } : line)),
  };
}

export function removeLine(draft: OrderDraft, key: string): OrderDraft {
  return { ...draft, lines: draft.lines.filter((line) => line.key !== key) };
}

/** How many things are in the order: 2 cakes and a topper is 3. */
export function itemCount(draft: OrderDraft): number {
  return draft.lines.reduce((count, line) => count + line.quantity, 0);
}

/** How many of a product are in the order already, for its card. */
export function quantityOf(draft: OrderDraft, productId: string): number {
  return draft.lines.find((line) => line.productId === productId)?.quantity ?? 0;
}

// ---------------------------------------------------------------- customer and delivery

/** The customer's address and map link, or nothing for a Guest or no one. */
function placeOf(customer: DraftCustomer | null): {
  address: string;
  googleMapsLink: string;
} {
  return customer?.kind === "CUSTOMER"
    ? { address: customer.address, googleMapsLink: customer.googleMapsLink }
    : { address: "", googleMapsLink: "" };
}

/**
 * The delivery autofill (plan §139.11.4). For a delivery, each field takes the
 * customer's value when it is empty or still holds the last autofill; a value
 * the owner typed is kept. A customer with no address fills nothing, and takes
 * away what the previous customer filled. A pickup is left alone until it
 * becomes a delivery. The order keeps its own copy — nothing here changes the
 * customer (§93).
 */
function autofill(delivery: DraftDelivery, customer: DraftCustomer | null): DraftDelivery {
  if (delivery.type !== "DELIVERY") return delivery;
  const place = placeOf(customer);
  const refill = (field: "address" | "googleMapsLink") =>
    delivery[field] === "" || delivery[field] === delivery.filled[field] ? place[field] : delivery[field];
  return {
    ...delivery,
    address: refill("address"),
    googleMapsLink: refill("googleMapsLink"),
    filled: place,
  };
}

export function chooseCustomer(draft: OrderDraft, customer: DraftCustomer): OrderDraft {
  return { ...draft, customer, delivery: autofill(draft.delivery, customer) };
}

export function setDeliveryType(draft: OrderDraft, type: DeliveryType): OrderDraft {
  return {
    ...draft,
    delivery: autofill({ ...draft.delivery, type }, draft.customer),
  };
}

export function setDelivery(
  draft: OrderDraft,
  changes: Partial<Pick<DraftDelivery, "date" | "address" | "googleMapsLink">>,
): OrderDraft {
  return { ...draft, delivery: { ...draft.delivery, ...changes } };
}

/**
 * Whether to offer "Use {name}'s address": a delivery for a customer who has
 * a place on file, when the order says something else — because the owner
 * typed over it.
 */
export function offersCustomerPlace(draft: OrderDraft): boolean {
  const place = placeOf(draft.customer);
  if (draft.delivery.type !== "DELIVERY" || (place.address === "" && place.googleMapsLink === "")) return false;
  return draft.delivery.address !== place.address || draft.delivery.googleMapsLink !== place.googleMapsLink;
}

export function takeCustomerPlace(draft: OrderDraft): OrderDraft {
  const place = placeOf(draft.customer);
  return { ...draft, delivery: { ...draft.delivery, ...place, filled: place } };
}

// ---------------------------------------------------------------- charges, payment, notes

export function addAdjustment(draft: OrderDraft, type: AdjustmentType, name: string): OrderDraft {
  return {
    ...draft,
    adjustments: [...draft.adjustments, { key: newKey(), type, name, amount: "" }],
  };
}

export function setAdjustment(
  draft: OrderDraft,
  key: string,
  changes: Partial<Pick<DraftAdjustment, "type" | "name" | "amount">>,
): OrderDraft {
  return {
    ...draft,
    adjustments: draft.adjustments.map((entry) => (entry.key === key ? { ...entry, ...changes } : entry)),
  };
}

export function removeAdjustment(draft: OrderDraft, key: string): OrderDraft {
  return {
    ...draft,
    adjustments: draft.adjustments.filter((entry) => entry.key !== key),
  };
}

export function setPayment(draft: OrderDraft, changes: Partial<OrderDraft["payment"]>): OrderDraft {
  return { ...draft, payment: { ...draft.payment, ...changes } };
}

export function setNotes(draft: OrderDraft, notes: string): OrderDraft {
  return { ...draft, notes };
}

// ---------------------------------------------------------------- totals and the request

/**
 * The running total as the draft stands, from the prices on screen — the same
 * formula the server applies (./totals), so nothing changes at the last step.
 * An amount still being typed counts as nothing, never "₹NaN" (BUG-10). The
 * server's figure is the one stored.
 */
export function draftTotals(draft: OrderDraft, priceOf: (productId: string) => number | undefined): OrderTotals {
  return orderTotals(
    draft.lines.map((line) => ({
      unitPrice: line.custom ? line.custom.unitPrice : line.productId ? (priceOf(line.productId) ?? 0) : 0,
      quantity: line.quantity,
    })),
    draft.adjustments.map((entry) => ({
      type: entry.type,
      amount: parseRupees(entry.amount) ?? 0,
    })),
  );
}

/** The draft as the order form's schema reads it (`orderFormSchema`). */
export function draftForm(draft: OrderDraft): OrderFormValues {
  return {
    customer:
      draft.customer === null
        ? null
        : draft.customer.kind === "GUEST"
          ? { kind: "GUEST" }
          : { kind: "CUSTOMER", id: draft.customer.id },
    items: draft.lines.map((line) =>
      line.custom
        ? { custom: line.custom, quantity: line.quantity, notes: line.notes }
        : {
            productId: line.productId,
            quantity: line.quantity,
            notes: line.notes,
          },
    ),
    adjustments: draft.adjustments.map(({ type, name, amount }) => ({
      type,
      name,
      amount,
    })),
    delivery: {
      type: draft.delivery.type,
      date: draft.delivery.date,
      address: draft.delivery.address,
      googleMapsLink: draft.delivery.googleMapsLink,
    },
    payment: draft.payment,
    notes: draft.notes,
  };
}
