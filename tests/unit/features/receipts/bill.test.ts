import { describe, expect, it } from "vitest";

import type { OrderEstimate } from "@/features/orders/estimate";
import { billFileName, estimateBill, orderBill } from "@/features/receipts/bill";

import { aBusiness } from "@tests/support/bills";
import { anOrder, aPayment } from "@tests/support/orders";

const appUrl = "https://ovenly.app";

describe("orderBill (§139.11.6)", () => {
  it("is the order as its customer reads it, from the business's own profile", () => {
    const bill = orderBill({
      order: anOrder({ notes: "Ring twice" }),
      payments: [
        aPayment({
          id: "pay-2",
          amount: 20000,
          payment_method: "UPI",
          reference: "3248",
          paid_at: "2026-09-26T09:00:00Z",
        }),
        aPayment({ id: "pay-1", amount: 30000, paid_at: "2026-09-26T07:06:00Z" }),
      ],
      customer: { name: "Meena Gupta", phone: "+919834567890" },
      business: aBusiness(),
      appUrl,
    });

    expect(bill).toEqual({
      kind: "CONFIRMED",
      business: {
        name: "Sweet Delights Home Bakery",
        tagline: "Cakes for every celebration",
        address: "12 Rose Street",
        city: "Kochi",
        phone: "+919876543210",
        logoUrl: "/api/business/logo?v=logo-1",
      },
      orderNumber: "ORD-1006",
      issuedAt: "2026-09-26T00:00:00.000Z",
      billedTo: { kind: "CUSTOMER", name: "Meena Gupta", phone: "+919834567890" },
      delivery: {
        type: "DELIVERY",
        date: "2099-09-27T08:30:00.000Z",
        address: "Block B-404, Green Park",
        googleMapsLink: "https://maps.app.goo.gl/meena",
      },
      lines: [
        { name: "Red Velvet Cupcakes (Box of 6)", quantity: 2, unitPrice: 57500, subtotal: 115000, note: null },
        { name: "Name topper", quantity: 1, unitPrice: 15000, subtotal: 15000, note: "Gold, ‘Anu’" },
      ],
      subtotal: 130000,
      adjustments: [{ type: "DISCOUNT", name: "Festive", amount: 5000 }],
      tax: 0,
      total: 125000,
      // Oldest first.
      payments: [
        { method: "CASH", reference: null, amount: 30000 },
        { method: "UPI", reference: "3248", amount: 20000 },
      ],
      paid: 50000,
      balanceDue: 75000,
      appUrl,
    });
    expect(JSON.stringify(bill)).not.toContain("Ring twice");
  });

  it("reads Guest for an order with no customer, and never owes less than nothing", () => {
    const bill = orderBill({
      order: anOrder({
        customerId: null,
        delivery: { type: "PICKUP", date: "2099-09-27T08:30:00.000Z" },
        payment: { status: "PAID", paid: 130000 },
      }),
      payments: [],
      business: aBusiness(),
      appUrl,
    });
    expect(bill.billedTo).toEqual({ kind: "GUEST" });
    expect(bill.delivery).toEqual({
      type: "PICKUP",
      date: "2099-09-27T08:30:00.000Z",
      address: null,
      googleMapsLink: null,
    });
    expect(bill.balanceDue).toBe(0);
  });
});

describe("estimateBill (§139.11.5)", () => {
  const estimate: OrderEstimate = {
    customer: { kind: "CUSTOMER", id: "c-1", name: "Meena Gupta", phone: "+919834567890" },
    lines: [{ productId: null, name: "Name topper", unitPrice: 15000, quantity: 2, subtotal: 30000, notes: "Gold" }],
    adjustments: [{ type: "CHARGE", name: "Delivery", amount: 8000 }],
    totals: { subtotal: 30000, discount: 0, deliveryCharge: 8000, tax: 0, total: 38000 },
    delivery: { type: "DELIVERY", date: "2026-09-27T08:30:00.000Z", address: "12 MG Road", googleMapsLink: null },
    payment: { status: "PARTIALLY_PAID", paid: 10000, method: "UPI", reference: "U-1" },
    balanceDue: 28000,
    shortfalls: [],
    issuedAt: "2026-09-26T06:00:00.000Z",
  };

  it("has no number, is dated when it was made, and shows payment as chosen so far", () => {
    expect(estimateBill({ estimate, business: aBusiness(), appUrl })).toMatchObject({
      kind: "ESTIMATE",
      orderNumber: null,
      issuedAt: "2026-09-26T06:00:00.000Z",
      billedTo: { kind: "CUSTOMER", name: "Meena Gupta", phone: "+919834567890" },
      lines: [{ name: "Name topper", quantity: 2, unitPrice: 15000, subtotal: 30000, note: "Gold" }],
      adjustments: [{ type: "CHARGE", name: "Delivery", amount: 8000 }],
      subtotal: 30000,
      tax: 0,
      total: 38000,
      payments: [{ method: "UPI", reference: "U-1", amount: 10000 }],
      paid: 10000,
      balanceDue: 28000,
    });
  });

  it("lists no payment while it is unpaid, and bills a Guest as Guest", () => {
    const bill = estimateBill({
      estimate: {
        ...estimate,
        customer: { kind: "GUEST" },
        payment: { status: "UNPAID", paid: 0, method: null, reference: null },
        balanceDue: 38000,
      },
      business: aBusiness(),
      appUrl,
    });
    expect(bill.billedTo).toEqual({ kind: "GUEST" });
    expect(bill.payments).toEqual([]);
    expect(bill.balanceDue).toBe(38000);
  });
});

describe("billFileName (the user, 2026-09-26)", () => {
  it("is the order number, then the business", () => {
    expect(billFileName({ orderNumber: "ORD-1028", business: aBusiness() }, "png")).toBe(
      "ORD-1028 - Sweet Delights Home Bakery.png",
    );
  });

  it("calls an estimate an estimate, and drops what a file name cannot hold", () => {
    const business = aBusiness({ name: 'Cakes / Bakes: "The*Best"?\u0007  <Home>|' });
    expect(billFileName({ orderNumber: null, business }, "pdf")).toBe("Estimate - Cakes Bakes The Best Home.pdf");
  });
});
