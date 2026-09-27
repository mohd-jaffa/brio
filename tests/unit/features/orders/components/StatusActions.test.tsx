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

const menu = () => screen.getByRole("dialog", { name: "Change status" });
const openMenu = () => userEvent.click(screen.getByRole("button", { name: "Change status" }));
const moves = () =>
  within(menu())
    .getAllByRole("button")
    .map((button) => button.textContent)
    .filter((label) => label !== "");

describe("StatusActions", () => {
  it("offers the next step in one tap (IMP-06)", async () => {
    const onMove = show(anOrder());
    await userEvent.click(screen.getByRole("button", { name: "Mark as Preparing" }));
    expect(onMove).toHaveBeenCalledWith("IN_PROGRESS");
  });

  it("offers every other status in Change status: on in one step, back, and Cancel last", async () => {
    const onMove = show(anOrder({ status: "IN_PROGRESS" }));
    expect(screen.getByRole("button", { name: "Mark as Ready" })).toBeInTheDocument();
    await openMenu();
    expect(moves()).toEqual(["Mark as Out for delivery", "Mark as Delivered", "Back to Pending", "Cancel order"]);

    await userEvent.click(within(menu()).getByRole("button", { name: "Back to Pending" }));
    expect(onMove).toHaveBeenCalledWith("PENDING");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await openMenu();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onMove).toHaveBeenCalledOnce();
  });

  it("goes from Pending straight to any later status", async () => {
    const onMove = show(anOrder());
    await openMenu();
    expect(moves()).toEqual(["Mark as Ready", "Mark as Out for delivery", "Mark as Delivered", "Cancel order"]);
    await userEvent.click(within(menu()).getByRole("button", { name: "Mark as Ready" }));
    expect(onMove).toHaveBeenCalledWith("READY");
  });

  it("puts right a move made by mistake, however far along", async () => {
    show(anOrder({ status: "IN_TRANSIT" }));
    await openMenu();
    expect(moves()).toEqual(["Back to Ready", "Back to Preparing", "Back to Pending", "Cancel order"]);
  });

  it("says Completed for a pickup, which never goes out for delivery", async () => {
    show(anOrder({ status: "READY", delivery: { type: "PICKUP", date: "2099-01-01T00:00:00.000Z" } }));
    expect(screen.getByRole("button", { name: "Mark as Completed" })).toBeInTheDocument();
    await openMenu();
    expect(moves()).toEqual(["Back to Preparing", "Back to Pending", "Cancel order"]);
  });

  it("asks before Delivered, which cannot be undone, from the button or the menu", async () => {
    const onMove = show(anOrder({ status: "IN_TRANSIT" }));
    await userEvent.click(screen.getByRole("button", { name: "Mark as Delivered" }));
    const confirm = screen.getByRole("alertdialog", { name: "Mark ORD-1006 as Delivered?" });
    expect(confirm).toHaveTextContent("This can’t be undone.");
    await userEvent.click(within(confirm).getByRole("button", { name: "Not yet" }));
    expect(onMove).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Mark as Delivered" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Mark as Delivered" }));
    expect(onMove).toHaveBeenCalledWith("DELIVERED");
  });

  it("asks before Completed chosen from the menu", async () => {
    const onMove = show(anOrder({ delivery: { type: "PICKUP", date: "2099-01-01T00:00:00.000Z" } }));
    await openMenu();
    await userEvent.click(within(menu()).getByRole("button", { name: "Mark as Completed" }));
    await userEvent.click(
      within(screen.getByRole("alertdialog", { name: "Mark ORD-1006 as Completed?" })).getByRole("button", {
        name: "Mark as Completed",
      }),
    );
    expect(onMove).toHaveBeenCalledWith("DELIVERED");
  });

  it("cancels only once that is confirmed", async () => {
    const onMove = show(anOrder());
    await openMenu();
    await userEvent.click(within(menu()).getByRole("button", { name: "Cancel order" }));
    const confirm = screen.getByRole("alertdialog", { name: "Cancel order ORD-1006?" });
    await userEvent.click(within(confirm).getByRole("button", { name: "Keep order" }));
    expect(onMove).not.toHaveBeenCalled();

    await openMenu();
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
