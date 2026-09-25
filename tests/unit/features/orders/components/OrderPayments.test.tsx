import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { OrderPayments } from "@/features/orders/components/OrderPayments";
import { ApiError } from "@/lib/api/client";

import { aPayment } from "@tests/support/orders";

function show(props: Partial<Parameters<typeof OrderPayments>[0]> = {}) {
  const all = { loading: false, onRetry: vi.fn(), canCollect: false, onCollect: vi.fn(), ...props };
  render(<OrderPayments {...all} />);
  return all;
}

describe("OrderPayments", () => {
  it("lists each payment: how, when, its reference and how much", () => {
    show({
      payments: [aPayment(), aPayment({ id: "pay-2", payment_method: "UPI", amount: 20000, reference: "UPI-77" })],
    });
    const [cash, upi] = within(screen.getByRole("list", { name: "Payments" })).getAllByRole("listitem");
    expect(cash).toHaveTextContent("Cash");
    expect(cash).toHaveTextContent("26 Sep 2026, 12:36 PM");
    expect(cash).toHaveTextContent("₹500");
    expect(upi).toHaveTextContent("UPI");
    expect(upi).toHaveTextContent("UPI-77");
    expect(upi).toHaveTextContent("₹200");
  });

  it("says when nothing has been paid, and collects while a balance is due", async () => {
    const props = show({ payments: [], canCollect: true });
    expect(screen.getByText("No payments yet")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Collect payment" }));
    expect(props.onCollect).toHaveBeenCalledOnce();
  });

  it("offers no collecting when nothing is due", () => {
    show({ payments: [aPayment()] });
    expect(screen.queryByRole("button", { name: "Collect payment" })).not.toBeInTheDocument();
  });

  it("holds its place while loading, and offers Try again when the payments could not be read", async () => {
    const { unmount } = render(<OrderPayments loading onRetry={vi.fn()} canCollect={false} onCollect={vi.fn()} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    unmount();

    const props = show({ error: new TypeError("offline") });
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load the payments on this order.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(props.onRetry).toHaveBeenCalledOnce();
  });

  it("shows the API's own words when it refused", () => {
    show({ error: new ApiError(404, "NOT_FOUND", "That order doesn’t exist.") });
    expect(screen.getByRole("alert")).toHaveTextContent("That order doesn’t exist.");
  });
});
