import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrdersTable } from "@/features/orders/components/OrdersTable";

import { anOrderListItem } from "@tests/support/orders";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const now = new Date("2026-09-26T06:00:00Z");

beforeEach(() => push.mockReset());

describe("OrdersTable", () => {
  it("lays each order out under Order, Due, Customer, Items, Amount and Status (§139.10)", () => {
    render(
      <OrdersTable
        now={now}
        orders={[
          anOrderListItem({ lineCount: 2, dueAt: "2026-09-27T05:00:00Z" }),
          anOrderListItem({ id: "o-2", orderNumber: "ORD-1007", customer: null, balanceDue: 0, status: "DELIVERED" }),
        ]}
      />,
    );
    const table = screen.getByRole("table", { name: "Orders" });
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "Order",
      "Due",
      "Customer",
      "Items",
      "Amount",
      "Status",
    ]);
    const [, first, second] = within(table).getAllByRole("row");
    expect(within(first).getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
      "ORD-1006",
      "27 Sep10:30 AM",
      "Meena Gupta",
      "Chocolate truffle cake +1 more",
      "₹1,250₹750 to pay",
      "Pending",
    ]);
    expect(within(first).getByRole("link", { name: "ORD-1006" })).toHaveAttribute("href", "/orders/o-1");
    expect(second).toHaveTextContent("Guest");
    expect(second).not.toHaveTextContent("to pay");
    expect(second).toHaveTextContent("Delivered");
  });

  it("opens an order from a click anywhere on its row", async () => {
    render(<OrdersTable orders={[anOrderListItem()]} />);
    await userEvent.click(screen.getByRole("cell", { name: "Meena Gupta" }));
    expect(push).toHaveBeenCalledWith("/orders/o-1");
  });
});
