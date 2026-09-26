import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CartBar } from "@/components/ui/cart-bar";

function bar(props: Partial<Parameters<typeof CartBar>[0]> = {}) {
  return (
    <CartBar
      count={2}
      countLabel="2 items"
      label="View order"
      total={141000}
      actionLabel="Continue to order details"
      onAction={() => {}}
      {...props}
    />
  );
}

describe("CartBar", () => {
  it("shows the count, the total and the way on", async () => {
    const onAction = vi.fn();
    const { container } = render(bar({ onAction }));
    expect(screen.getByText("2 items")).toHaveClass("sr-only");
    expect(screen.getByText("View order")).toBeInTheDocument();
    expect(screen.getByText("₹1,410")).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("sticky");

    await userEvent.click(screen.getByRole("button", { name: "Continue to order details" }));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("holds back while there is nothing to go on with", () => {
    render(bar({ count: 0, countLabel: "No items", total: 0, actionLabel: "Continue", disabled: true }));
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("rises into place when it arrives, and ticks its total up as items land", () => {
    const { container, rerender } = render(bar({ arriving: true }));
    const card = container.firstElementChild?.firstElementChild;
    expect(card).toHaveClass("animate-arrive");
    rerender(bar({ count: 3, total: 186000 }));
    expect(card).not.toHaveClass("animate-arrive");
    expect(screen.getByText("₹1,860")).toHaveClass("animate-tick-up");
    expect(screen.getByText("3")).toHaveClass("animate-tick-up");
  });
});
