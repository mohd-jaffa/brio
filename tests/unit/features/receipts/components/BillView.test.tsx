import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BillView } from "@/features/receipts/components/BillView";
import { billDocument } from "@/features/receipts/document";

import { aBill, aBusiness } from "@tests/support/bills";

const show = (...changes: Parameters<typeof aBill>) => render(<BillView document={billDocument(aBill(...changes))} />);

describe("BillView (§139.11.6)", () => {
  it("reads in order: the business, which bill, for whom, what, and what is owed", () => {
    show();
    const bill = screen.getByRole("article", { name: "Bill ORD-1006" });
    expect(bill.textContent?.replace(/\s+/g, " ")).toMatch(
      /Sweet Delights Home Bakery.*Cakes for every celebration.*12 Rose Street.*Bill.*ORD-1006.*26 Sep 2026.*Billed to.*Meena Gupta.*Delivery.*Block B-404.*Red Velvet Cupcakes.*Name topper.*Happy birthday, Anu.*Subtotal.*Festive.*Total.*₹1,280.*Paid · UPI · ref 3248.*Balance due.*₹780.*Thank you for your order!.*Made with Ovenly · ovenly\.app/,
    );
    expect(screen.getByRole("link", { name: "Map link" })).toHaveAttribute("href", "https://maps.app.goo.gl/meena");
    expect(screen.getByRole("link", { name: "ovenly.app" })).toHaveAttribute("href", "https://ovenly.app");

    const items = within(screen.getByRole("list", { name: "Items" })).getAllByRole("listitem");
    expect(items[1]).toHaveTextContent("Name topper1 × ₹150₹150“Happy birthday, Anu”");
    const totals = within(screen.getByLabelText("Totals"));
    expect(totals.getAllByRole("term").map((term) => term.textContent)).toEqual([
      "Subtotal",
      "Festive",
      "Delivery",
      "Total",
      "Paid · UPI · ref 3248",
      "Balance due",
    ]);
    expect(totals.getAllByRole("definition").map((amount) => amount.textContent)).toEqual([
      "₹1,300",
      "−₹50",
      "+₹30",
      "₹1,280",
      "₹500",
      "₹780",
    ]);
  });

  it("marks an estimate on a band, with no number", () => {
    show({ kind: "ESTIMATE", orderNumber: null });
    expect(screen.getByRole("heading", { name: "Estimate · not yet confirmed" })).toBeInTheDocument();
    expect(screen.queryByText("ORD-1006")).not.toBeInTheDocument();
  });

  it("shows the cake mark and no tagline, contact lines or footer link where there are none", () => {
    const { container } = show({
      business: aBusiness({ logoUrl: null, tagline: null, address: null, city: null, phone: "" }),
      appUrl: "",
      delivery: { type: "PICKUP", date: "2026-09-27T08:30:00.000Z", address: null, googleMapsLink: null },
    });
    expect(container.querySelector("img")).toBeNull();
    expect(screen.queryByText("Cakes for every celebration")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Made with Ovenly")).toBeInTheDocument();
  });
});
