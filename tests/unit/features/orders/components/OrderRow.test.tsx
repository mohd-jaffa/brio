import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RowList } from "@/components/ui/row";
import { OrderRow } from "@/features/orders/components/OrderRow";
import type { OrderListItem } from "@/features/orders/types";

import { anOrderListItem } from "@tests/support/orders";

const now = new Date("2026-09-26T06:00:00Z");

function show(order: OrderListItem) {
  render(
    <RowList>
      <OrderRow order={order} now={now} />
    </RowList>,
  );
  return screen.getByRole("link");
}

describe("OrderRow", () => {
  it("reads the number and who, the item, when it is due and what is left to pay (IMP-07)", () => {
    const row = show(anOrderListItem());
    expect(row).toHaveAttribute("href", "/orders/o-1");
    expect(row).toHaveTextContent("ORD-1006 · Meena Gupta");
    expect(row).toHaveTextContent("Chocolate truffle cake");
    expect(row).toHaveTextContent("Due 27 Sep · ₹750 to pay");
    expect(row).toHaveTextContent("₹1,250");
    expect(row).toHaveTextContent("Pending");
  });

  it("names the rest of the order as more, a Guest as Guest, and nothing to pay when paid", () => {
    const row = show(anOrderListItem({ customer: null, lineCount: 3, balanceDue: 0, paymentStatus: "PAID" }));
    expect(row).toHaveTextContent("ORD-1006 · Guest");
    expect(row).toHaveTextContent("Chocolate truffle cake +2 more");
    expect(row).not.toHaveTextContent("to pay");
  });

  it("says Overdue for an open order due on a day gone, and No items for an empty one", () => {
    const row = show(anOrderListItem({ dueAt: "2026-09-24T05:00:00Z", firstItem: null, lineCount: 0 }));
    expect(row).toHaveTextContent("Overdue");
    expect(row).toHaveTextContent("No items");
  });
});
