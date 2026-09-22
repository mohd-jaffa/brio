import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ReceiptData } from "../types";
import { ReceiptPrintView } from "./ReceiptPrintView";

const receipt: ReceiptData = {
  bakeryName: "Ovenly Bakery",
  generatedAt: "2026-09-22T10:30:00Z",
  order: {
    id: "o-1",
    customerId: "c-1",
    orderNumber: "#1024",
    status: "DELIVERED",
    payment: { status: "PAID", reference: "UPI-991" },
    pricing: { subtotal: 100000, discount: 10000, deliveryCharge: 4000, tax: 0, total: 94000 },
    delivery: { type: "DELIVERY", date: "2026-09-22T12:00:00Z" },
    items: [],
    adjustments: [
      { id: "a-1", type: "DISCOUNT", name: "Festive offer", amount: 10000 },
      { id: "a-2", type: "CHARGE", name: "Delivery", amount: 4000 },
    ],
    createdAt: "2026-09-21T10:00:00Z",
    updatedAt: "2026-09-22T10:00:00Z",
  },
  items: [
    { id: "i-1", productName: "Chocolate Truffle Cake", unitPrice: 50000, quantity: 2, subtotal: 100000 },
  ],
  payments: [
    {
      id: "pay-1",
      bakery_id: "b-1",
      order_id: "o-1",
      amount: 94000,
      payment_method: "UPI",
      reference: "UPI-991",
      paid_at: "2026-09-22T10:00:00Z",
      created_at: "2026-09-22T10:00:00Z",
    },
  ],
};

afterEach(() => {
  document.body.style.overflow = "";
});

describe("ReceiptPrintView", () => {
  it("bills the order to the customer it belongs to", () => {
    render(<ReceiptPrintView receipt={receipt} customerName="Meena Gupta" customerPhone="+919876543210" onClose={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Ovenly Bakery" })).toBeInTheDocument();
    expect(screen.getByText("#1024")).toBeInTheDocument();
    expect(screen.getByText("Meena Gupta")).toBeInTheDocument();
  });

  it("says who it is for even when the customer is not known", () => {
    render(<ReceiptPrintView receipt={receipt} onClose={vi.fn()} />);
    expect(screen.getByText("Walk-in Customer")).toBeInTheDocument();
  });

  it("shows every amount in rupees, from paise", () => {
    render(<ReceiptPrintView receipt={receipt} onClose={vi.fn()} />);

    // 100000 paise is ₹1,000 — it is both the line total and the subtotal.
    expect(screen.getAllByText("₹1,000")).toHaveLength(2);
    expect(screen.getByText("₹940")).toBeInTheDocument();
  });

  it("shows a discount as taken off and a charge as added on", () => {
    render(<ReceiptPrintView receipt={receipt} onClose={vi.fn()} />);

    expect(screen.getByText("Festive offer")).toBeInTheDocument();
    expect(screen.getByText("-₹100")).toBeInTheDocument();
    expect(screen.getByText("+₹40")).toBeInTheDocument();
  });

  it("lists what has been paid", () => {
    render(<ReceiptPrintView receipt={receipt} onClose={vi.fn()} />);
    expect(screen.getByText(/Payment: UPI/)).toBeInTheDocument();
  });

  it("prints on request", async () => {
    const print = vi.fn();
    vi.stubGlobal("print", print);
    render(<ReceiptPrintView receipt={receipt} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Print receipt" }));
    expect(print).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it("closes, and lets the page behind it scroll again", async () => {
    const onClose = vi.fn();
    const { unmount } = render(<ReceiptPrintView receipt={receipt} onClose={onClose} />);

    expect(document.body.style.overflow).toBe("hidden");
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();

    unmount();
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
