import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BillSheet } from "@/features/receipts/components/BillSheet";

import { aBill } from "@tests/support/bills";

describe("BillSheet", () => {
  it("is a dialog named for the bill, with the bill and its actions — and no print", () => {
    render(
      <BillSheet
        open
        onClose={vi.fn()}
        title="Bill ORD-1006"
        bill={aBill()}
        notice={<p>Only 2 left of Red Velvet Cake.</p>}
        actions={<button type="button">Share</button>}
      />,
    );
    const dialog = screen.getByRole("dialog", { name: "Bill ORD-1006" });
    expect(within(dialog).getByText("Only 2 left of Red Velvet Cake.")).toBeInTheDocument();
    expect(within(dialog).getByRole("article", { name: "Bill ORD-1006" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Share" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /print/i })).not.toBeInTheDocument();
  });

  it("holds its place while the bill is built, and closes", () => {
    const onClose = vi.fn();
    render(<BillSheet open onClose={onClose} title="Estimate" />);
    expect(screen.getByRole("status", { name: "Building the bill" })).toHaveAttribute("aria-busy", "true");
    screen.getByRole("button", { name: "Close" }).click();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
