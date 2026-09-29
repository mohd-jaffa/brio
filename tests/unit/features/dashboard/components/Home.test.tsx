import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Home } from "@/features/dashboard/components/Home";
import type { Dashboard } from "@/features/dashboard/types";

import { authStub } from "@tests/support/auth";
import { sizeCharts } from "@tests/support/charts";
import { anOrderListItem } from "@tests/support/orders";
import { Providers } from "@tests/support/providers";

const fetcher = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  fetcher,
}));
const auth = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => auth.current }));

function aDashboard(changes: Partial<Dashboard> = {}): Dashboard {
  return {
    period: "TODAY",
    dueToday: 2,
    sales: 450000,
    toCollect: 191000,
    lowStockCount: 1,
    salesByDay: [
      { day: "2026-09-25", total: 0 },
      { day: "2026-09-26", total: 450000 },
    ],
    due: [
      {
        bucket: "overdue",
        orders: [anOrderListItem({ id: "o-late", orderNumber: "ORD-1004", dueAt: "2026-09-24T05:00:00Z" })],
      },
      {
        bucket: "today",
        orders: [anOrderListItem({ id: "o-today", orderNumber: "ORD-1007", dueAt: "2026-09-26T12:00:00Z" })],
      },
    ],
    moreDue: false,
    lowStock: [{ productId: "p-1", name: "Blueberry cheesecake", iconKey: null, unit: "piece", balance: 3 }],
    topProducts: [
      { productId: "p-1", name: "Truffle cake", iconKey: null, quantity: 4, sales: 480000 },
      { productId: null, name: "Custom items", iconKey: null, quantity: 1, sales: 15000 },
    ],
    ordersByStatus: [{ status: "PENDING", count: 2 }],
    recentCustomers: [{ id: "c-1", name: "Anu Sharma", orders: 3, lastOrderAt: "2026-09-26T05:00:00Z" }],
    ...changes,
  };
}

let answers: Record<string, unknown>;

function open() {
  return render(<Home />, { wrapper: Providers });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-26T03:00:00Z")); // 08:30 in India
  sizeCharts();
  auth.current = authStub();
  answers = {
    "/api/business": { name: "Sweet Delights", tagline: "Cakes for every celebration" },
    "/api/dashboard": aDashboard(),
  };
  fetcher.mockReset();
  fetcher.mockImplementation(async (key: string) => {
    const answer = key in answers ? answers[key] : answers["/api/dashboard"];
    if (answer instanceof Error) throw answer;
    return answer;
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Home: the greeting", () => {
  it("greets the person by first name for the time of day, over the catch phrase (§134 P2-1)", async () => {
    open();
    expect(screen.getAllByRole("heading", { level: 1, name: "Good morning, Asha" })).toHaveLength(2);
    expect(await screen.findAllByText("Cakes for every celebration")).toHaveLength(2);
    expect(screen.getByText("Saturday, 26 Sep 2026")).toBeInTheDocument();
  });

  it("says a neutral line where the business has no catch phrase", async () => {
    answers["/api/business"] = { name: "Sweet Delights", tagline: null };
    open();
    expect(await screen.findAllByText("Here’s what needs you today.")).toHaveLength(2);
  });
});

describe("Home: the tiles", () => {
  it("shows due today, the period's sales, what is owed and what is low", async () => {
    open();
    const tiles = await screen.findByRole("region", { name: "Period" });
    await waitFor(() => expect(within(tiles).getByText("₹4,500")).toBeInTheDocument());
    expect(within(tiles).getByText("Due today").nextSibling).toHaveTextContent("2");
    expect(within(tiles).getByText("Sales today")).toBeInTheDocument();
    expect(within(tiles).getByText("₹1,910")).toBeInTheDocument();
    expect(within(tiles).getByText("Low stock")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "New order" })[0]).toHaveAttribute("href", "/orders/new");
  });

  it("reads another period when it is chosen", async () => {
    open();
    await screen.findByText("Sales today");
    answers["/api/dashboard?period=WEEK"] = aDashboard({ period: "WEEK", sales: 900000 });
    await userEvent.click(screen.getByRole("radio", { name: "Week" }));
    expect(await screen.findByText("Sales this week")).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledWith("/api/dashboard?period=WEEK");
  });

  it("holds the tiles' place while it loads, and says so", () => {
    fetcher.mockImplementation(() => new Promise(() => {}));
    open();
    expect(screen.getByRole("status", { name: "Loading your day" })).toHaveAttribute("aria-busy", "true");
  });

  it("says why it could not load, and tries again", async () => {
    answers["/api/dashboard"] = new Error("offline");
    open();
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load your dashboard");
    answers["/api/dashboard"] = aDashboard();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Sales today")).toBeInTheDocument();
  });
});

describe("Home: what needs doing", () => {
  it("lists the orders due, overdue first, each opening its order", async () => {
    open();
    const due = await screen.findByRole("region", { name: "Orders due" });
    const [overdue, today] = within(due).getAllByRole("list");
    expect(overdue).toHaveAccessibleName("Overdue");
    expect(within(overdue).getByRole("link")).toHaveAttribute("href", "/orders/o-late");
    expect(today).toHaveAccessibleName("Due today");
    expect(within(due).getByRole("link", { name: "View all orders due" })).toHaveAttribute("href", "/orders");
  });

  it("filters the orders due by how far along and how paid", async () => {
    open();
    const due = await screen.findByRole("region", { name: "Orders due" });
    const filter = within(due).getByRole("button", { name: "Filter orders due" });
    expect(filter).toHaveAttribute("aria-pressed", "false");

    answers["/api/dashboard?status=IN_PROGRESS&payment=UNPAID"] = aDashboard({ due: [] });
    await userEvent.click(filter);
    await userEvent.click(screen.getByRole("radio", { name: "Preparing" }));
    await userEvent.click(screen.getByRole("radio", { name: "Unpaid" }));
    await userEvent.click(screen.getByRole("button", { name: "Apply filters" }));

    expect(await within(due).findByText("No orders due match these filters.")).toBeInTheDocument();
    expect(filter).toHaveAttribute("aria-pressed", "true");
  });

  it("says when nothing is due", async () => {
    answers["/api/dashboard"] = aDashboard({ due: [] });
    open();
    expect(await screen.findByText("Nothing is due today or tomorrow.")).toBeInTheDocument();
  });

  it("lists what is running low, or says nothing is", async () => {
    open();
    const low = await screen.findByRole("region", { name: "Low stock" });
    expect(within(low).getByRole("link", { name: /Blueberry cheesecake/ })).toHaveTextContent("3 pieces left");

    answers["/api/dashboard"] = aDashboard({ lowStock: [], lowStockCount: 0 });
    await userEvent.click(screen.getByRole("radio", { name: "Month" }));
    answers["/api/dashboard?period=MONTH"] = aDashboard({ period: "MONTH", lowStock: [] });
    expect(await screen.findByText("Nothing is running low.")).toBeInTheDocument();
  });
});

describe("Home: how the period is going (desktop)", () => {
  it("shows the sales by day, the orders by status, the best sellers and who ordered last", async () => {
    open();
    expect(await screen.findByRole("heading", { name: "Sales overview" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Order status" })).toBeInTheDocument();
    const top = screen.getByRole("region", { name: "Top products" });
    expect(within(top).getByText("Truffle cake")).toBeInTheDocument();
    expect(within(top).getByText("4 sold")).toBeInTheDocument();
    const customers = screen.getByRole("region", { name: "Recent customers" });
    expect(within(customers).getByRole("link", { name: /Anu Sharma/ })).toHaveAttribute("href", "/customers/c-1");
    expect(within(customers).getByText("3 orders")).toBeInTheDocument();
  });

  it("totals the chart's summary over the days it draws, not the shorter period's (audit A2)", async () => {
    answers["/api/dashboard"] = aDashboard({
      sales: 0,
      salesByDay: [
        { day: "2026-09-24", total: 146000 },
        { day: "2026-09-25", total: 304000 },
        { day: "2026-09-26", total: 0 },
      ],
    });
    open();
    expect(
      await screen.findByRole("img", { name: "Sales per day from 24 Sep to 26 Sep: ₹4,500 in all." }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sales today").closest("div")).toHaveTextContent("₹0");
  });

  it("says so when the period has no sales, no best sellers and no customers yet", async () => {
    answers["/api/dashboard"] = aDashboard({
      salesByDay: [],
      ordersByStatus: [],
      topProducts: [],
      recentCustomers: [],
    });
    open();
    expect(await screen.findByText("Nothing sold in this period yet.")).toBeInTheDocument();
    expect(screen.getByText("No customer has ordered yet.")).toBeInTheDocument();
    expect(screen.getByText("No sales in this period yet.")).toBeInTheDocument();
    expect(screen.getByText("No orders in this period yet.")).toBeInTheDocument();
  });
});
