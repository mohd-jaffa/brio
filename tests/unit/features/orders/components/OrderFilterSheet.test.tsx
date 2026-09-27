import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { anyFilter, OrderFilterSheet, type OrderFilters } from "@/features/orders/components/OrderFilterSheet";
import { pickDate } from "@tests/support/date";

function open(value: OrderFilters = {}) {
  const onApply = vi.fn();
  const onClose = vi.fn();
  render(<OrderFilterSheet open value={value} onApply={onApply} onClose={onClose} />);
  return { onApply, onClose };
}

describe("OrderFilterSheet", () => {
  it("combines due dates, payment and Guest orders, and applies them together (§139.10)", async () => {
    const { onApply, onClose } = open();
    expect(screen.getByRole("dialog", { name: "Filter orders" })).toBeInTheDocument();
    expect(screen.getByLabelText("Due from")).toHaveTextContent("Any day");
    await pickDate("Due from", "2026-09-01");
    await pickDate("Due until", "2026-09-30");
    expect(screen.getByLabelText("Due from")).toHaveTextContent("1 Sep 2026");
    expect(screen.getByLabelText("Due until")).toHaveTextContent("30 Sep 2026");
    // Each bounds the other.
    await userEvent.click(screen.getByLabelText("Due until"));
    const until = screen.getByRole("dialog", { name: "Due until: pick a day" });
    expect(within(until).getByRole("button", { name: "Previous month" })).toBeDisabled();
    expect(within(until).getByRole("button", { name: "Tuesday, 1 Sep 2026" })).toBeEnabled();
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("radio", { name: "Unpaid" }));
    await userEvent.click(screen.getByRole("radio", { name: "Guests only" }));
    await userEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(onApply).toHaveBeenCalledWith({ from: "2026-09-01", to: "2026-09-30", payment: "UNPAID", guest: true });
    expect(onClose).toHaveBeenCalled();
  });

  it("starts from the filters on, and Any and Everyone are no filter", async () => {
    const { onApply } = open({ from: "2026-09-01", payment: "PAID", guest: true });
    expect(screen.getByLabelText("Due from")).toHaveTextContent("1 Sep 2026");
    expect(screen.getByRole("radio", { name: "Guests only" })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(screen.getByRole("radio", { name: "Any" }));
    await userEvent.click(screen.getByRole("radio", { name: "Everyone" }));
    await userEvent.click(screen.getByLabelText("Due from"));
    await userEvent.click(within(screen.getByRole("dialog", { name: "Due from: pick a day" })).getByRole("button", { name: "Clear" }));
    expect(screen.getByLabelText("Due from")).toHaveTextContent("Any day");
    await userEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(onApply).toHaveBeenCalledWith({ from: undefined, to: undefined, payment: undefined, guest: undefined });
  });

  it("clears every filter at once", async () => {
    const { onApply, onClose } = open({ to: "2026-09-30", payment: "PAID", guest: true });
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onApply).toHaveBeenCalledWith({});
    expect(onClose).toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: "Everyone" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText("Due until")).toHaveTextContent("Any day");
  });
});

describe("anyFilter", () => {
  it("is on while any one filter is", () => {
    expect(anyFilter({})).toBe(false);
    for (const on of [{ from: "2026-09-01" }, { to: "2026-09-01" }, { payment: "PAID" as const }, { guest: true }]) {
      expect(anyFilter(on)).toBe(true);
    }
  });
});
