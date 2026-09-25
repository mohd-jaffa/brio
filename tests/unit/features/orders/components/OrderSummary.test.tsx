import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OrderSummary } from "@/features/orders/components/OrderSummary";
import type { DraftAdjustment } from "@/features/orders/draft";

const totals = { subtotal: 265000, discount: 10000, deliveryCharge: 5000, tax: 0, total: 260000 };
const adjustments: DraftAdjustment[] = [
  { key: "a", type: "DISCOUNT", name: "Festive", amount: "100" },
  { key: "b", type: "CHARGE", name: "", amount: "50" },
  { key: "c", type: "DISCOUNT", name: "", amount: "₹20" },
  { key: "d", type: "CHARGE", name: "Still typing", amount: "" },
];

const row = (term: string) => screen.getByText(term).nextElementSibling;

describe("OrderSummary", () => {
  it("lists the items, each discount and charge that counts, and the total", () => {
    render(<OrderSummary itemCount={3} totals={totals} adjustments={adjustments} />);
    expect(screen.getByRole("region", { name: "Order summary" })).toBeInTheDocument();
    expect(row("Items (3)")).toHaveTextContent("₹2,650");
    expect(row("Festive")).toHaveTextContent("−₹100");
    expect(row("Delivery")).toHaveTextContent("+₹50");
    expect(row("Discount")).toHaveTextContent("−₹20");
    expect(screen.queryByText("Still typing")).not.toBeInTheDocument();
    expect(row("Total amount")).toHaveTextContent("₹2,600");
    expect(screen.queryByText("Paid now")).not.toBeInTheDocument();
  });

  it("shows what is paid now and what is left, never below nothing", () => {
    const { rerender } = render(<OrderSummary itemCount={1} totals={totals} adjustments={[]} paid={50000} />);
    expect(row("Paid now")).toHaveTextContent("₹500");
    expect(row("Balance due")).toHaveTextContent("₹2,100");

    rerender(<OrderSummary itemCount={1} totals={totals} adjustments={[]} paid={300000} />);
    expect(row("Balance due")).toHaveTextContent("₹0");
  });
});
