import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Customers } from "@/features/customers/components/Customers";
import type { Customer, CustomerListItem, GuestSales } from "@/features/customers/types";

import { Providers } from "@tests/support/providers";

const fetcher = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  fetcher,
}));
const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
// The form has its own tests; here it only has to open, and say what it saved.
vi.mock("@/features/customers/components/CustomerFormSheet", () => ({
  CustomerFormSheet: ({ isOpen, onSuccess }: { isOpen: boolean; onSuccess: (customer: Customer) => void }) =>
    isOpen ? (
      <div role="dialog" aria-label="New Customer">
        <button type="button" onClick={() => onSuccess({ id: "c-new" } as Customer)}>
          Save
        </button>
      </div>
    ) : null,
}));

const customer = (changes: Partial<CustomerListItem> = {}): CustomerListItem => ({
  id: "c-1",
  name: "Priya Menon",
  phone: "+919847012345",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  orders: 12,
  lastOrderAt: "2026-09-24T05:00:00Z",
  segment: "REGULAR",
  balanceDue: 0,
  ...changes,
});

const guest = (changes: Partial<GuestSales> = {}): GuestSales => ({
  period: { from: "2026-08-28", to: "2026-09-26" },
  orders: 2,
  sales: 114000,
  items: [],
  nextCursor: null,
  ...changes,
});

let answers: Record<string, unknown>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-26T06:00:00Z"));
  vi.clearAllMocks();
  answers = {
    "/api/customers": {
      items: [customer(), customer({ id: "c-2", name: "Neha Suresh", orders: 0, lastOrderAt: null, segment: "NEW" })],
      nextCursor: null,
    },
    "/api/guest-sales?range=LAST_30_DAYS": guest(),
  };
  fetcher.mockImplementation(async (key: string) => answers[key] ?? { items: [], nextCursor: null });
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

function open() {
  return render(<Customers />, { wrapper: Providers });
}

const list = () => screen.findByRole("list", { name: "Customers" });

describe("Customers: the list", () => {
  it("lists each customer with their orders, when they last ordered, and their segment (§139.10)", async () => {
    open();
    expect(screen.getByRole("heading", { level: 1, name: "Customers" })).toBeInTheDocument();
    const [priya, neha] = within(await list()).getAllByRole("link");
    expect(priya).toHaveAttribute("href", "/customers/c-1");
    expect(priya).toHaveTextContent("Priya Menon");
    expect(priya).toHaveTextContent("Regular");
    expect(priya).toHaveTextContent("12 orders · last order 2 days ago");
    expect(neha).toHaveTextContent("NewNo orders yet");
  });

  it("pins Guest sales for the period Guest sales was last read for, above everyone", async () => {
    open();
    const pinned = await screen.findByRole("list", { name: "Guest sales for the period" });
    const row = within(pinned).getByRole("link");
    expect(row).toHaveAttribute("href", "/customers/guest");
    await waitFor(() => expect(row).toHaveTextContent("2 orders · ₹1,140 · Last 30 days"));
  });

  it("names a custom period by its dates, and waits for both before asking", async () => {
    localStorage.setItem(
      "brio_range_guest-sales",
      JSON.stringify({ preset: "CUSTOM", from: "2026-09-01", to: "2026-09-10" }),
    );
    answers["/api/guest-sales?range=CUSTOM&from=2026-09-01&to=2026-09-10"] = guest({
      period: { from: "2026-09-01", to: "2026-09-10" },
    });
    const { unmount } = open();
    const pinned = await screen.findByRole("list", { name: "Guest sales for the period" });
    await waitFor(() => expect(pinned).toHaveTextContent("1 Sep – 10 Sep"));
    unmount();

    localStorage.setItem("brio_range_guest-sales", JSON.stringify({ preset: "CUSTOM", from: "2026-09-01" }));
    fetcher.mockClear();
    open();
    await list();
    expect(fetcher).not.toHaveBeenCalledWith(expect.stringContaining("/api/guest-sales"));
    expect(screen.getByRole("list", { name: "Guest sales for the period" })).toHaveTextContent("Loading…");
  });

  it("keeps to a segment, where Guest sales is not pinned", async () => {
    open();
    await list();
    answers["/api/customers?segment=REGULAR"] = { items: [customer()], nextCursor: null };
    await userEvent.click(screen.getByRole("tab", { name: "Regular" }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledWith("/api/customers?segment=REGULAR"));
    expect(screen.queryByRole("list", { name: "Guest sales for the period" })).not.toBeInTheDocument();
  });

  it("keeps to those who still owe, the most first, each row saying how much, on every tab", async () => {
    answers["/api/customers"] = {
      items: [customer({ balanceDue: 95000 }), customer({ id: "c-2", name: "Neha Suresh", segment: "NEW" })],
      nextCursor: null,
    };
    open();
    const [priya, neha] = within(await list()).getAllByRole("link");
    expect(priya).toHaveTextContent("₹950 due");
    expect(neha).not.toHaveTextContent("due");

    answers["/api/customers?segment=DUE"] = { items: [customer({ balanceDue: 95000 })], nextCursor: null };
    await userEvent.click(screen.getByRole("tab", { name: "Balance due" }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledWith("/api/customers?segment=DUE"));
    expect(screen.queryByRole("list", { name: "Guest sales for the period" })).not.toBeInTheDocument();
  });

  it("searches by name or phone on the server once typing pauses, without the pinned row", async () => {
    open();
    await list();
    answers["/api/customers?search=98470"] = { items: [customer()], nextCursor: null };
    await userEvent.type(screen.getByRole("searchbox", { name: "Search by name or phone" }), "98470");
    await waitFor(() => expect(fetcher).toHaveBeenCalledWith("/api/customers?search=98470"));
    await waitFor(() =>
      expect(screen.queryByRole("list", { name: "Guest sales for the period" })).not.toBeInTheDocument(),
    );
  });
});

describe("Customers: nothing to show", () => {
  it("invites the first customer when there are none", async () => {
    answers["/api/customers"] = { items: [], nextCursor: null };
    open();
    expect(await screen.findByText("No customers yet")).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: "New customer" }).at(-1)!);
    expect(await screen.findByRole("dialog", { name: "New Customer" })).toBeInTheDocument();
  });

  it("says a segment is empty in its own words, and a search finds no one", async () => {
    open();
    await list();
    await userEvent.click(screen.getByRole("tab", { name: "Regular" }));
    expect(await screen.findByText("No regulars yet. Three orders make one.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "New" }));
    expect(await screen.findByText("No one added in the last 30 days.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Balance due" }));
    expect(await screen.findByText("Nothing to collect. Every customer is paid up.")).toBeInTheDocument();
    await userEvent.type(screen.getByRole("searchbox"), "Zara");
    expect(await screen.findByText("Nothing matches “Zara”.")).toBeInTheDocument();
  });
});

describe("Customers: adding one", () => {
  it("opens the new customer once they are saved", async () => {
    open();
    await list();
    await userEvent.click(screen.getAllByRole("button", { name: "New customer" })[0]);
    await userEvent.click(
      within(screen.getByRole("dialog", { name: "New Customer" })).getByRole("button", { name: "Save" }),
    );
    expect(push).toHaveBeenCalledWith("/customers/c-new");
  });
});
