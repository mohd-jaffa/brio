import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { anyFilter, OrderFilterSheet, type OrderFilters } from "@/features/orders/components/OrderFilterSheet";

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
    await userEvent.type(screen.getByLabelText("Due from"), "2026-09-01");
    await userEvent.type(screen.getByLabelText("Due until"), "2026-09-30");
    expect(screen.getByLabelText("Due from")).toHaveAttribute("max", "2026-09-30");
    expect(screen.getByLabelText("Due until")).toHaveAttribute("min", "2026-09-01");
    await userEvent.click(screen.getByRole("radio", { name: "Unpaid" }));
    await userEvent.click(screen.getByRole("radio", { name: "Guests only" }));
    await userEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(onApply).toHaveBeenCalledWith({ from: "2026-09-01", to: "2026-09-30", payment: "UNPAID", guest: true });
    expect(onClose).toHaveBeenCalled();
  });

  it("starts from the filters on, and Any and Everyone are no filter", async () => {
    const { onApply } = open({ from: "2026-09-01", payment: "PAID", guest: true });
    expect(screen.getByLabelText("Due from")).toHaveValue("2026-09-01");
    expect(screen.getByRole("radio", { name: "Guests only" })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(screen.getByRole("radio", { name: "Any" }));
    await userEvent.click(screen.getByRole("radio", { name: "Everyone" }));
    await userEvent.clear(screen.getByLabelText("Due from"));
    await userEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(onApply).toHaveBeenCalledWith({ from: undefined, to: undefined, payment: undefined, guest: undefined });
  });

  it("clears every filter at once", async () => {
    const { onApply, onClose } = open({ to: "2026-09-30", payment: "PAID", guest: true });
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onApply).toHaveBeenCalledWith({});
    expect(onClose).toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: "Everyone" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText("Due until")).toHaveValue("");
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
