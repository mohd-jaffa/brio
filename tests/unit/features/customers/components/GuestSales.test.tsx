import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GuestSales } from "@/features/customers/components/GuestSales";
import type { GuestSales as GuestSalesPage } from "@/features/customers/types";
import { ApiError } from "@/lib/api/client";

import { anOrderListItem } from "@tests/support/orders";
import { Providers } from "@tests/support/providers";
import { choose } from "@tests/support/select";
import { pickDate } from "@tests/support/date";

const fetcher = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  fetcher,
}));

const guestOrder = anOrderListItem({ customer: null, balanceDue: 0, paymentStatus: "PAID" });
const sales = (changes: Partial<GuestSalesPage> = {}): GuestSalesPage => ({
  period: { from: "2026-08-28", to: "2026-09-26" },
  orders: 2,
  sales: 114000,
  items: [guestOrder],
  nextCursor: null,
  ...changes,
});

let answers: Record<string, unknown>;

beforeEach(() => {
  answers = { "/api/guest-sales?range=LAST_30_DAYS": sales() };
  fetcher.mockReset();
  fetcher.mockImplementation(async (key: string) => {
    const answer = answers[key] ?? sales({ orders: 0, sales: 0, items: [] });
    if (answer instanceof Error) throw answer;
    return answer;
  });
});

afterEach(() => localStorage.clear());

function open() {
  return render(<GuestSales />, { wrapper: Providers });
}

describe("GuestSales", () => {
  it("shows the period's Guest orders and what they came to, then the orders (§139.11.3)", async () => {
    open();
    expect(screen.getByRole("heading", { level: 1, name: "Guest sales" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go back" })).toHaveAttribute("href", "/customers");
    expect(await screen.findByText("₹1,140")).toBeInTheDocument();
    expect(screen.getByText("Guest orders").nextSibling).toHaveTextContent("2");
    const list = screen.getByRole("list", { name: "Guest orders in this period" });
    expect(within(list).getByRole("link")).toHaveTextContent("ORD-1006 · Guest");
  });

  it("reads another period when one is chosen, and remembers it here", async () => {
    open();
    await screen.findByText("₹1,140");
    answers["/api/guest-sales?range=LAST_7_DAYS"] = sales({ orders: 1, sales: 38000 });
    await choose("Period", "Last 7 days");
    expect(await screen.findByText("₹380")).toBeInTheDocument();
    expect(localStorage.getItem("brio_range_guest-sales")).toContain("LAST_7_DAYS");
  });

  it("waits for both dates of a custom period before asking", async () => {
    open();
    await screen.findByText("₹1,140");
    fetcher.mockClear();
    await choose("Period", "Custom");
    expect(fetcher).not.toHaveBeenCalled();
    // Nothing is loading: it asks for the dates, and shows nothing busy (audit A4).
    expect(screen.getByText("Choose both dates").closest("[role='status']")).not.toBeNull();
    expect(document.querySelector("[aria-busy='true']")).toBeNull();
    expect(screen.queryByRole("region", { name: /Guest orders/ })).not.toBeInTheDocument();

    answers["/api/guest-sales?range=CUSTOM&from=2026-09-01&to=2026-09-10"] = sales({ orders: 5, sales: 250000 });
    await pickDate("From", "2026-09-01");
    await pickDate("To", "2026-09-10");
    expect(await screen.findByText("₹2,500")).toBeInTheDocument();
  });

  it("says when Guests bought nothing in the period", async () => {
    answers["/api/guest-sales?range=LAST_30_DAYS"] = sales({ orders: 0, sales: 0, items: [] });
    open();
    expect(await screen.findByText("No Guest orders in this period.")).toBeInTheDocument();
  });

  it("says Guest sales could not be loaded", async () => {
    answers["/api/guest-sales?range=LAST_30_DAYS"] = new ApiError(500, "INTERNAL_ERROR", "Something went wrong.");
    open();
    expect(await screen.findByText("Something went wrong.")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading Guest sales" })).not.toBeInTheDocument();
  });
});
