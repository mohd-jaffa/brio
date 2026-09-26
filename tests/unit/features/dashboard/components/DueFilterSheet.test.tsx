import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DueFilterSheet } from "@/features/dashboard/components/DueFilterSheet";

function open(value = {}) {
  const onApply = vi.fn();
  const onClose = vi.fn();
  render(<DueFilterSheet open value={value} onApply={onApply} onClose={onClose} />);
  return { onApply, onClose, sheet: screen.getByRole("dialog", { name: "Filter orders due" }) };
}

describe("DueFilterSheet", () => {
  it("combines how far along with how paid, and applies them together (§116)", async () => {
    const { onApply, onClose } = open();
    expect(screen.getByRole("radiogroup", { name: "Preparation" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: "Preparing" }));
    await userEvent.click(screen.getByRole("radio", { name: "Unpaid" }));
    await userEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(onApply).toHaveBeenCalledWith({ status: "IN_PROGRESS", payment: "UNPAID" });
    expect(onClose).toHaveBeenCalled();
  });

  it("starts from the filters on, and All is no filter", async () => {
    const { onApply } = open({ status: "READY", payment: "PAID" });
    expect(screen.getByRole("radio", { name: "Ready" })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(screen.getAllByRole("radio", { name: "All" })[1]);
    await userEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(onApply).toHaveBeenCalledWith({ status: "READY", payment: undefined });
  });

  it("filters on payment alone", async () => {
    const { onApply } = open();
    await userEvent.click(screen.getByRole("radio", { name: "Paid" }));
    await userEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(onApply).toHaveBeenCalledWith({ status: undefined, payment: "PAID" });
  });

  it("clears every filter at once", async () => {
    const { onApply, onClose } = open({ status: "READY", payment: "PAID" });
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onApply).toHaveBeenCalledWith({});
    expect(onClose).toHaveBeenCalled();
    expect(screen.getAllByRole("radio", { name: "All" })[0]).toHaveAttribute("aria-checked", "true");
  });
});
