import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Customer } from "@/features/customers/types";
import { OrdersClient } from "@/features/orders/api.client";
import { OrderDetail } from "@/features/orders/components/OrderDetail";
import type { Order } from "@/features/orders/types";
import { PaymentsClient } from "@/features/payments/api.client";
import { ApiError } from "@/lib/api/client";

import { aBill } from "@tests/support/bills";
import { anOrder, aPayment } from "@tests/support/orders";
import { Providers } from "@tests/support/providers";

const fetcher = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  fetcher,
}));
vi.mock("@/features/orders/api.client", () => ({ OrdersClient: { updateStatus: vi.fn() } }));
vi.mock("@/features/payments/api.client", () => ({ PaymentsClient: { createPayment: vi.fn() } }));
// Order again reads the signed-in user's draft; it has its own test (OrderAgain.test.tsx).
vi.mock("@/features/orders/components/OrderAgain", () => ({
  OrderAgain: ({ order, customer }: { order: Order; customer?: Customer }) => (
    <button type="button">{`Order again ${order.orderNumber} for ${customer?.name ?? "Guest"}`}</button>
  ),
}));

const meena: Customer = {
  id: "c-1",
  name: "Meena Gupta",
  phone: "+919834567890",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

/** What the API answers for each read; a function answers per call. */
let answers: Record<string, unknown>;

function serve(order: Order = anOrder()) {
  answers = {
    "/api/orders/o-1": order,
    "/api/customers/c-1": meena,
    "/api/orders/o-1/payments": [aPayment()],
    "/api/orders/o-1/bill": aBill(),
  };
}

function open() {
  return render(<OrderDetail id="o-1" />, { wrapper: Providers });
}

const loaded = () => screen.findByRole("heading", { name: "ORD-1006", level: 1 });

beforeEach(() => {
  vi.clearAllMocks();
  serve();
  fetcher.mockImplementation(async (key: string) => {
    const answer = answers[key];
    if (answer instanceof Error) throw answer;
    return typeof answer === "function" ? answer() : answer;
  });
});

describe("OrderDetail: reading", () => {
  it("holds its place while the order loads", () => {
    fetcher.mockReturnValue(new Promise(() => undefined));
    open();
    expect(screen.getByRole("status", { name: "Loading order" })).toHaveAttribute("aria-busy", "true");
  });

  it("says when the order could not be loaded, and tries again", async () => {
    let calls = 0;
    answers["/api/orders/o-1"] = () => {
      calls += 1;
      if (calls === 1) throw new ApiError(404, "NOT_FOUND", "That order doesn't exist.");
      return anOrder();
    };
    open();
    expect(await screen.findByRole("alert")).toHaveTextContent("That order doesn't exist.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await loaded();
  });

  it("leads with the number, when it is due, the status, the money and the next step", async () => {
    open();
    await loaded();
    expect(screen.getByText("Delivery · due 27 Sep 2099, 2:00 PM")).toBeInTheDocument();
    const summary = screen.getByRole("region", { name: "ORD-1006" });
    expect(summary).toHaveTextContent("Pending");
    expect(summary).toHaveTextContent("Part paid");
    expect(summary).toHaveTextContent("₹1,250");
    expect(summary).toHaveTextContent("Balance due ₹750");
    expect(within(summary).getByRole("button", { name: "Mark as Preparing" })).toBeInTheDocument();

    expect(await screen.findByRole("link", { name: "Call Meena Gupta" })).toBeInTheDocument();
    const items = screen.getByRole("region", { name: "Items" });
    expect(items).toHaveTextContent("Name topper");
    expect(within(items).getByRole("button", { name: "Order again ORD-1006 for Meena Gupta" })).toBeInTheDocument();
    expect(await screen.findByRole("list", { name: "Payments" })).toHaveTextContent("₹500");
    expect(screen.queryByRole("region", { name: "Internal notes" })).not.toBeInTheDocument();
  });

  it("reads no customer for a Guest order, and shows the internal notes", async () => {
    serve(anOrder({ customerId: null, notes: "Ring twice" }));
    open();
    await loaded();
    expect(screen.getByRole("region", { name: "Customer" })).toHaveTextContent("Guest");
    expect(screen.getByRole("region", { name: "Internal notes" })).toHaveTextContent("Ring twice");
    expect(fetcher).not.toHaveBeenCalledWith(expect.stringContaining("/api/customers"));
  });

  it("offers no collecting and shows no balance on an order paid in full", async () => {
    serve(anOrder({ payment: { status: "PAID", paid: 125000 } }));
    open();
    await loaded();
    expect(screen.getByRole("region", { name: "ORD-1006" })).not.toHaveTextContent("Balance due");
    expect(screen.queryByRole("button", { name: "Collect payment" })).not.toBeInTheDocument();
  });

  it("offers Try again on the payments when they could not be read", async () => {
    let calls = 0;
    answers["/api/orders/o-1/payments"] = () => {
      calls += 1;
      if (calls === 1) throw new TypeError("offline");
      return [aPayment()];
    };
    open();
    await loaded();
    const payments = screen.getByRole("region", { name: "Payments" });
    await within(payments).findByRole("alert");
    await userEvent.click(within(payments).getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("list", { name: "Payments" })).toBeInTheDocument();
  });
});

describe("OrderDetail: moving it on", () => {
  it("moves it to the next step, says where it is now, and pops the new status into place", async () => {
    vi.mocked(OrdersClient.updateStatus).mockImplementation(async () => {
      answers["/api/orders/o-1"] = anOrder({ status: "IN_PROGRESS" });
      return anOrder({ status: "IN_PROGRESS" });
    });
    open();
    await loaded();
    const summary = screen.getByRole("region", { name: "ORD-1006" });
    expect(within(summary).getByText("Pending").parentElement).not.toHaveClass("animate-pop");

    await userEvent.click(screen.getByRole("button", { name: "Mark as Preparing" }));
    expect(OrdersClient.updateStatus).toHaveBeenCalledWith("o-1", { status: "IN_PROGRESS" });
    expect(await screen.findByText("ORD-1006 is now Preparing.")).toBeInTheDocument();
    expect(screen.getByText("Order updated")).toBeInTheDocument();
    await waitFor(() => expect(within(summary).getByText("Preparing").parentElement).toHaveClass("animate-pop"));
  });

  it("says it was cancelled once a cancel is confirmed", async () => {
    vi.mocked(OrdersClient.updateStatus).mockResolvedValue(anOrder({ status: "CANCELLED" }));
    open();
    await loaded();
    await userEvent.click(screen.getByRole("button", { name: "More actions" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel order" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel order" }));
    expect(await screen.findByText("Order cancelled")).toBeInTheDocument();
    expect(screen.getByText("ORD-1006 is now Cancelled.")).toBeInTheDocument();
  });

  it("reports a refused move in the API's words, and reads the order again", async () => {
    vi.mocked(OrdersClient.updateStatus).mockRejectedValue(
      new ApiError(409, "ORDER_STATUS_CHANGED", "This order was changed elsewhere.", "req_5"),
    );
    open();
    await loaded();
    const reads = fetcher.mock.calls.filter(([key]) => key === "/api/orders/o-1").length;
    await userEvent.click(screen.getByRole("button", { name: "Mark as Preparing" }));
    const card = await screen.findByRole("alertdialog", { name: "Order not updated" });
    expect(card).toHaveTextContent("This order was changed elsewhere.");
    await waitFor(() =>
      expect(fetcher.mock.calls.filter(([key]) => key === "/api/orders/o-1").length).toBeGreaterThan(reads),
    );
  });
});

describe("OrderDetail: payment and the bill", () => {
  it("collects a payment in its sheet, and closes it once recorded or dismissed", async () => {
    vi.mocked(PaymentsClient.createPayment).mockResolvedValue(aPayment({ id: "pay-2", amount: 75000 }));
    open();
    await loaded();
    await userEvent.click(screen.getByRole("button", { name: "Collect payment" }));
    const sheet = await screen.findByRole("dialog", { name: "Collect payment" });
    expect(within(sheet).getByLabelText(/Amount/)).toHaveValue("750.00");
    await userEvent.click(within(sheet).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: "Collect payment" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Collect payment" }));
    await userEvent.click(screen.getByRole("button", { name: "Record payment" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Collect payment" })).not.toBeInTheDocument());
    expect(PaymentsClient.createPayment).toHaveBeenCalledOnce();
  });

  it("opens the bill when asked, and closes it", async () => {
    open();
    await loaded();
    await userEvent.click(screen.getByRole("button", { name: "View bill" }));
    const dialog = await screen.findByRole("dialog", { name: "Bill ORD-1006" });
    expect(await within(dialog).findByRole("article", { name: "Bill ORD-1006" })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Bill ORD-1006" })).not.toBeInTheDocument());
    expect(fetcher).toHaveBeenCalledWith("/api/orders/o-1/bill");
  });

  it("says so when the bill could not be built", async () => {
    answers["/api/orders/o-1/bill"] = new TypeError("offline");
    open();
    await loaded();
    await userEvent.click(screen.getByRole("button", { name: "View bill" }));
    const card = await screen.findByRole("alertdialog", { name: "Bill not ready" });
    expect(card).toHaveTextContent("Could not build this bill.");
  });
});
