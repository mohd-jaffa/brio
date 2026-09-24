import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";

import { PaymentsClient } from "@/features/payments/api.client";
import { PaymentCollectionForm } from "@/features/payments/components/PaymentCollectionForm";

vi.mock("@/features/payments/api.client", () => ({
  PaymentsClient: { createPayment: vi.fn() },
}));

function wrapper({ children }: { children: ReactNode }) {
  return <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>;
}

function open(props: Partial<Parameters<typeof PaymentCollectionForm>[0]> = {}) {
  const all = {
    orderId: "o-1",
    orderTotal: 120000,
    totalPaid: 20000,
    onPaymentSuccess: vi.fn(),
    onCancel: vi.fn(),
    ...props,
  };
  render(<PaymentCollectionForm {...all} />, { wrapper });
  return all;
}

beforeEach(() => vi.clearAllMocks());

describe("PaymentCollectionForm", () => {
  it("offers what is still owed, so the common case is one tap", () => {
    open();

    expect(screen.getByText("Still owed: ₹1,000")).toBeInTheDocument();
    expect(screen.getByLabelText(/Amount/)).toHaveValue("1000.00");
  });

  it("never offers a negative amount when an order is overpaid", () => {
    open({ orderTotal: 10000, totalPaid: 50000 });
    expect(screen.getByLabelText(/Amount/)).toHaveValue("0.00");
  });

  it("records the payment in whole paise, against the order it was opened on", async () => {
    vi.mocked(PaymentsClient.createPayment).mockResolvedValue({
      id: "pay-1",
      bakery_id: "b-1",
      order_id: "o-1",
      amount: 50000,
      payment_method: "UPI",
      reference: null,
      paid_at: "2026-09-22T00:00:00Z",
      created_at: "2026-09-22T00:00:00Z",
    });
    const props = open();

    const amount = screen.getByLabelText(/Amount/);
    await userEvent.clear(amount);
    await userEvent.type(amount, "500");
    await userEvent.click(screen.getByRole("button", { name: "Record Payment" }));

    await waitFor(() =>
      expect(PaymentsClient.createPayment).toHaveBeenCalledWith("o-1", {
        amount: 50000,
        payment_method: "UPI",
        reference: null,
      }),
    );
    expect(props.onPaymentSuccess).toHaveBeenCalledOnce();
  });

  it("refuses an amount that is not an amount", async () => {
    open();

    const amount = screen.getByLabelText(/Amount/);
    await userEvent.clear(amount);
    await userEvent.type(amount, "a lot");
    await userEvent.click(screen.getByRole("button", { name: "Record Payment" }));

    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));
    expect(PaymentsClient.createPayment).not.toHaveBeenCalled();
  });

  it("shows the server's refusal rather than swallowing it", async () => {
    vi.mocked(PaymentsClient.createPayment).mockImplementation(() =>
      Promise.reject(new ApiError(409, "CONFLICT", "This action conflicts with existing data.")),
    );
    const props = open();

    await userEvent.click(screen.getByRole("button", { name: "Record Payment" }));

    await waitFor(() =>
      expect(screen.getByText("This action conflicts with existing data.")).toBeInTheDocument(),
    );
    expect(props.onPaymentSuccess).not.toHaveBeenCalled();
  });

  it("can be closed without recording anything", async () => {
    const props = open();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(props.onCancel).toHaveBeenCalledOnce();
  });
});
