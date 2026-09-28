import { describe, expect, it } from "vitest";

import { billDocument, billShareText } from "@/features/receipts/document";

import { aBill, aBusiness } from "@tests/support/bills";

describe("billDocument (§139.11.6)", () => {
  it("writes the bill out in the order it reads, labels and all", () => {
    expect(billDocument(aBill())).toEqual({
      business: {
        name: "Sweet Delights Home Bakery",
        tagline: "Cakes for every celebration",
        contact: ["12 Rose Street", "Kochi", "+91 98765 43210"],
        logoUrl: "/api/business/logo?v=logo-1",
      },
      heading: { label: "Bill", note: null, number: "ORD-1006", date: "26 Sep 2026" },
      parties: [
        { label: "Billed to", value: "Meena Gupta · +91 98345 67890", details: [], link: null },
        {
          label: "Delivery",
          value: "27 Sep 2026, 2:00 PM",
          details: ["Block B-404, Green Park"],
          link: { label: "Map link", href: "https://maps.app.goo.gl/meena" },
        },
      ],
      lines: [
        { name: "Red Velvet Cupcakes (Box of 6)", detail: "2 × ₹575", amount: "₹1,150", note: null },
        { name: "Name topper", detail: "1 × ₹150", amount: "₹150", note: "“Happy birthday, Anu”" },
      ],
      totals: [
        { label: "Subtotal", amount: "₹1,300", emphasis: "normal" },
        { label: "Festive", amount: "−₹50", emphasis: "normal" },
        { label: "Delivery", amount: "+₹30", emphasis: "normal" },
        { label: "Total", amount: "₹1,280", emphasis: "total" },
        { label: "Paid · UPI · ref 3248", amount: "₹500", emphasis: "normal" },
        { label: "Balance due", amount: "₹780", emphasis: "strong" },
      ],
      thanks: "Thank you for your order!",
      footer: { credit: "Made with Brio", host: "brio.app", href: "https://brio.app" },
    });
  });

  it("marks an estimate, which has no number, and dates it in India even just after midnight there", () => {
    const heading = billDocument(
      aBill({ kind: "ESTIMATE", orderNumber: null, issuedAt: "2026-09-25T19:00:00Z" }),
    ).heading;
    expect(heading).toEqual({ label: "Estimate", note: "not yet confirmed", number: null, date: "26 Sep 2026" });
  });

  it("bills a Guest, and shows a pickup with no place and no map", () => {
    const document = billDocument(
      aBill({
        billedTo: { kind: "GUEST" },
        delivery: { type: "PICKUP", date: "2026-09-27T08:30:00.000Z", address: "kept", googleMapsLink: "https://x.y" },
      }),
    );
    expect(document.parties).toEqual([
      { label: "Billed to", value: "Guest", details: [], link: null },
      { label: "Pickup", value: "27 Sep 2026, 2:00 PM", details: [], link: null },
    ]);
  });

  it("prints tax only when there is some, a payment without a reference, and a delivery without a place", () => {
    const document = billDocument(
      aBill({
        tax: 1_000,
        payments: [{ method: "BANK_TRANSFER", reference: null, amount: 50_000 }],
        delivery: { type: "DELIVERY", date: "2026-09-27T08:30:00.000Z", address: null, googleMapsLink: null },
      }),
    );
    expect(document.totals.map(({ label }) => label)).toEqual([
      "Subtotal",
      "Festive",
      "Delivery",
      "Tax",
      "Total",
      "Paid · Bank transfer",
      "Balance due",
    ]);
    expect(document.parties[1]).toMatchObject({ details: [], link: null });
  });

  it("leaves out whatever of the header the business has not filled in, and a footer link that is not a URL", () => {
    const document = billDocument(
      aBill({ business: aBusiness({ tagline: null, address: null, city: null, phone: "" }), appUrl: "not a url" }),
    );
    expect(document.business).toMatchObject({ tagline: null, contact: [] });
    expect(document.footer).toEqual({ credit: "Made with Brio", host: null, href: null });
  });
});

describe("billShareText", () => {
  it("names the bill, the business, the total and what is still due", () => {
    expect(billShareText(aBill())).toBe(
      "Bill ORD-1006 from Sweet Delights Home Bakery — total ₹1,280, balance due ₹780.",
    );
  });

  it("says estimate before there is a number, and nothing is due once it is paid", () => {
    expect(billShareText(aBill({ kind: "ESTIMATE", orderNumber: null, balanceDue: 0 }))).toBe(
      "Estimate from Sweet Delights Home Bakery — total ₹1,280.",
    );
  });
});
