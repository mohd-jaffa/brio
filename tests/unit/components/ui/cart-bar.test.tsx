import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CartBar } from "@/components/ui/cart-bar";

describe("CartBar", () => {
  it("shows the count, the total and the way on", async () => {
    const onAction = vi.fn();
    const { container } = render(
      <CartBar count={2} countLabel="2 items" label="View order" total="₹1,410" actionLabel="Continue to order details" onAction={onAction} />,
    );
    expect(screen.getByText("2 items")).toHaveClass("sr-only");
    expect(screen.getByText("View order")).toBeInTheDocument();
    expect(screen.getByText("₹1,410")).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("sticky");

    await userEvent.click(screen.getByRole("button", { name: "Continue to order details" }));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("holds back while there is nothing to go on with", () => {
    render(<CartBar count={0} countLabel="No items" label="View order" total="₹0" actionLabel="Continue" onAction={() => {}} disabled />);
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });
});
