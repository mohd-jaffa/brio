import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { OrderStatus } from "@/constants/statuses";
import { StatusActions } from "@/features/orders/components/StatusActions";
import type { Order } from "@/features/orders/types";

import { anOrder } from "@tests/support/orders";
import { Providers } from "@tests/support/providers";

function show(order: Order, moving = false) {
  const onMove = vi.fn<(status: OrderStatus) => void>();
  render(<StatusActions order={order} moving={moving} onMove={onMove} />, { wrapper: Providers });
  return onMove;
}

const menu = () => screen.getByRole("dialog", { name: "Move this order" });

describe("StatusActions", () => {
  it("offers the next step in one tap (IMP-06)", async () => {
    const onMove = show(anOrder());
    await userEvent.click(screen.getByRole("button", { name: "Mark as Preparing" }));
    expect(onMove).toHaveBeenCalledWith("IN_PROGRESS");
  });

  it("keeps the other moves in a menu, Cancel last", async () => {
    const onMove = show(anOrder({ status: "IN_PROGRESS" }));
    expect(screen.getByRole("button", { name: "Mark as Ready" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "More actions" }));
    const moves = within(menu())
      .getAllByRole("button")
      .filter((button) => button.textContent !== "");
    expect(moves.map((button) => button.textContent)).toEqual([
      "Mark as Out for delivery",
      "Mark as Delivered",
      "Cancel order",
    ]);
    await userEvent.click(within(menu()).getByRole("button", { name: "Mark as Delivered" }));
    expect(onMove).toHaveBeenCalledWith("DELIVERED");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "More actions" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onMove).toHaveBeenCalledOnce();
  });

  it("says Completed for a pickup, which never goes out for delivery", async () => {
    show(anOrder({ status: "READY", delivery: { type: "PICKUP", date: "2099-01-01T00:00:00.000Z" } }));
    expect(screen.getByRole("button", { name: "Mark as Completed" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "More actions" }));
    expect(within(menu()).queryByRole("button", { name: /Out for delivery/ })).not.toBeInTheDocument();
  });

  it("cancels only once that is confirmed", async () => {
    const onMove = show(anOrder());
    await userEvent.click(screen.getByRole("button", { name: "More actions" }));
    await userEvent.click(within(menu()).getByRole("button", { name: "Cancel order" }));
    const confirm = screen.getByRole("alertdialog", { name: "Cancel order ORD-1006?" });
    await userEvent.click(within(confirm).getByRole("button", { name: "Keep order" }));
    expect(onMove).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "More actions" }));
    await userEvent.click(within(menu()).getByRole("button", { name: "Cancel order" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel order" }));
    expect(onMove).toHaveBeenCalledWith("CANCELLED");
  });

  it("keeps Cancel in the menu even when it is the only other move", async () => {
    const onMove = show(anOrder({ status: "IN_TRANSIT" }));
    expect(screen.getByRole("button", { name: "Mark as Delivered" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "More actions" }));
    await userEvent.click(within(menu()).getByRole("button", { name: "Cancel order" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel order" }));
    expect(onMove).toHaveBeenCalledWith("CANCELLED");
  });

  it("waits while a move is on its way, and offers nothing for a finished order", () => {
    const { unmount } = render(<StatusActions order={anOrder()} moving onMove={vi.fn()} />, { wrapper: Providers });
    expect(screen.getByRole("button", { name: "Mark as Preparing" })).toHaveAttribute("aria-busy", "true");
    unmount();

    for (const status of ["DELIVERED", "CANCELLED"] as const) {
      const view = render(<StatusActions order={anOrder({ status })} moving={false} onMove={vi.fn()} />, {
        wrapper: Providers,
      });
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      view.unmount();
    }
  });
});
