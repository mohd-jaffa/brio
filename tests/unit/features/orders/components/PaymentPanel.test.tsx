import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { PaymentPanel } from "@/features/orders/components/PaymentPanel";
import { newDraft, type OrderDraft } from "@/features/orders/draft";

/** Every draft the screen has held, the last one being what it holds now. */
const seen = vi.fn<(draft: OrderDraft) => void>();
function latest(): OrderDraft {
  const call = seen.mock.lastCall;
  if (!call) throw new Error("The screen has not drawn yet.");
  return call[0];
}

function Screen({ errors = {} }: { errors?: Record<string, string> }) {
  const [draft, setDraft] = useState(newDraft);
  useEffect(() => seen(draft), [draft]);
  return (
    <PaymentPanel payment={draft.payment} errors={errors} update={(change) => setDraft((current) => change(current))} />
  );
}

const choice = (name: string) => screen.getByRole("radio", { name });

describe("PaymentPanel", () => {
  it("starts unpaid, asking nothing more", () => {
    render(<Screen />);
    expect(screen.getByRole("radiogroup", { name: "Payment" })).toBeInTheDocument();
    expect(choice("Unpaid")).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByRole("radiogroup", { name: "Method" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Reference/)).not.toBeInTheDocument();
  });

  it("takes the method and a reference for a payment in full", async () => {
    render(<Screen />);
    await userEvent.click(choice("Paid in full"));
    expect(screen.queryByLabelText(/Amount paid/)).not.toBeInTheDocument();
    await userEvent.click(choice("Cash"));
    await userEvent.type(screen.getByLabelText(/Reference/), "R-1");
    expect(latest().payment).toMatchObject({ status: "PAID", method: "CASH", reference: "R-1" });
  });

  it("asks how much for a part payment, and shows what is wrong with it", async () => {
    render(<Screen errors={{ "payment.amount": "Enter the amount paid." }} />);
    await userEvent.click(choice("Part paid"));
    expect(screen.getByLabelText(/Amount paid/)).toHaveAttribute("inputmode", "decimal");
    await userEvent.type(screen.getByLabelText(/Amount paid/), "500");
    expect(latest().payment).toMatchObject({ status: "PARTIALLY_PAID", amount: "500" });
    expect(screen.getByText("Enter the amount paid.")).toBeInTheDocument();
  });

  it("drops the payment's fields into place when they are chosen, and not when the draft brought them", async () => {
    render(<Screen />);
    await userEvent.click(choice("Part paid"));
    expect(screen.getByLabelText(/Amount paid/).closest(".animate-drop-in")).not.toBeNull();
  });
});
