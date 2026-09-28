import type { BusinessProfile } from "@/features/business/types";
import type { Bill } from "@/features/receipts/types";

/** Sweet Delights, with every part of the bill's header filled in and a logo. */
export function aBusiness(changes: Partial<BusinessProfile> = {}): BusinessProfile {
  return {
    id: "b-1",
    name: "Sweet Delights Home Bakery",
    tagline: "Cakes for every celebration",
    city: "Kochi",
    address: "12 Rose Street",
    phone: "+919876543210",
    logoUrl: "/api/business/logo?v=logo-1",
    nameChangedAt: null,
    ...changes,
  };
}

/**
 * ORD-1006 as its bill reads: Meena's delivery, two lines — one with a note —
 * ₹50 off and ₹80 delivery, part paid ₹500 by UPI of ₹1,280.
 */
export function aBill(changes: Partial<Bill> = {}): Bill {
  return {
    kind: "CONFIRMED",
    business: aBusiness(),
    orderNumber: "ORD-1006",
    issuedAt: "2026-09-26T04:30:00.000Z",
    billedTo: { kind: "CUSTOMER", name: "Meena Gupta", phone: "+919834567890" },
    delivery: {
      type: "DELIVERY",
      date: "2026-09-27T08:30:00.000Z",
      address: "Block B-404, Green Park",
      googleMapsLink: "https://maps.app.goo.gl/meena",
    },
    lines: [
      { name: "Red Velvet Cupcakes (Box of 6)", quantity: 2, unitPrice: 57_500, subtotal: 115_000, note: null },
      { name: "Name topper", quantity: 1, unitPrice: 15_000, subtotal: 15_000, note: "Happy birthday, Anu" },
    ],
    subtotal: 130_000,
    adjustments: [
      { type: "DISCOUNT", name: "Festive", amount: 5_000 },
      { type: "CHARGE", name: "Delivery", amount: 3_000 },
    ],
    tax: 0,
    total: 128_000,
    payments: [{ method: "UPI", reference: "3248", amount: 50_000 }],
    paid: 50_000,
    balanceDue: 78_000,
    appUrl: "https://brio.app",
    ...changes,
  };
}
