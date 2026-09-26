import type { AdjustmentType, DeliveryType, PaymentMethod } from "@/constants/statuses";

/** Who the bill is from: the business profile, never a name written into the code (§133.2 B4). */
export interface BillBusiness {
  name: string;
  tagline: string | null;
  address: string | null;
  city: string | null;
  phone: string;
  /** A URL on this app for the signed-in owner, or null for the cake mark. */
  logoUrl: string | null;
}

export interface BillLine {
  name: string;
  quantity: number;
  /** Whole paise, as are every amount below. */
  unitPrice: number;
  subtotal: number;
  /** The customer-facing note printed under the line — a cake message. */
  note: string | null;
}

export interface BillPayment {
  method: PaymentMethod;
  reference: string | null;
  amount: number;
}

/**
 * The bill (plan §139.11.6): a placed order's, or the estimate before it is
 * placed (§139.11.5), which has no number yet. Built on demand from the order
 * or the draft and never stored (AGENTS.md §15). Internal notes are not part
 * of it, so no screen or file can print them.
 */
export interface Bill {
  kind: "CONFIRMED" | "ESTIMATE";
  business: BillBusiness;
  /** null on an estimate. */
  orderNumber: string | null;
  /** When the order was placed, or when the estimate was made. */
  issuedAt: string;
  billedTo: { kind: "GUEST" } | { kind: "CUSTOMER"; name: string; phone: string };
  delivery: { type: DeliveryType; date: string; address: string | null; googleMapsLink: string | null };
  lines: BillLine[];
  subtotal: number;
  adjustments: { type: AdjustmentType; name: string; amount: number }[];
  tax: number;
  total: number;
  payments: BillPayment[];
  paid: number;
  balanceDue: number;
  /** The app's web root, credited in the footer (§139.1 #9). */
  appUrl: string;
}
