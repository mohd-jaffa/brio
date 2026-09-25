import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OrderLines } from "@/features/orders/components/OrderLines";

import { anOrder } from "@tests/support/orders";

const amount = (term: string) => screen.getByText(term).nextElementSibling;

describe("OrderLines", () => {
  it("lists each line in full with its price, a custom one marked, with its note for the bill", () => {
    render(<OrderLines order={anOrder()} />);
    const [cupcakes, topper] = within(screen.getByRole("region", { name: "Items" })).getAllByRole("listitem");
    expect(cupcakes).toHaveTextContent("Red Velvet Cupcakes (Box of 6)");
    expect(cupcakes).toHaveTextContent("×2 · ₹575 each");
    expect(cupcakes).toHaveTextContent("₹1,150");
    expect(within(cupcakes).queryByText("Custom")).not.toBeInTheDocument();
    expect(within(topper).getByText("Custom")).toBeInTheDocument();
    expect(within(topper).getByText("Gold, ‘Anu’")).toBeInTheDocument();
  });

  it("adds it up: the discounts and charges, the total, what is paid and what is due", () => {
    const order = anOrder({
      adjustments: [
        { id: "a-1", type: "DISCOUNT", name: "Festive", amount: 5000 },
        { id: "a-2", type: "CHARGE", name: "Delivery", amount: 4000 },
      ],
    });
    render(<OrderLines order={order} />);
    expect(amount("Subtotal")).toHaveTextContent("₹1,300");
    expect(amount("Festive")).toHaveTextContent("−₹50");
    expect(amount("Delivery")).toHaveTextContent("+₹40");
    expect(screen.queryByText("Tax")).not.toBeInTheDocument();
    expect(amount("Total")).toHaveTextContent("₹1,250");
    expect(amount("Paid")).toHaveTextContent("₹500");
    expect(amount("Balance due")).toHaveTextContent("₹750");
  });

  it("shows tax only when there is some, and nothing due on a cancelled order", () => {
    const order = anOrder({
      status: "CANCELLED",
      pricing: { subtotal: 130000, discount: 5000, deliveryCharge: 0, tax: 1000, total: 126000 },
    });
    render(<OrderLines order={order} />);
    expect(amount("Tax")).toHaveTextContent("₹10");
    expect(amount("Balance due")).toHaveTextContent("₹0");
  });
});
