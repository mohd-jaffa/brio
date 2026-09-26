import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Orders } from "@/features/orders/components/Orders";
import type { OrderCounts } from "@/features/orders/types";
import { ApiError } from "@/lib/api/client";

import { anOrderListItem } from "@tests/support/orders";
import { Providers } from "@tests/support/providers";

const fetcher = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  fetcher,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const COUNTS: OrderCounts = { ALL: 2, PENDING: 1, IN_PROGRESS: 0, READY: 0, IN_TRANSIT: 0, DELIVERED: 1, CANCELLED: 0 };
const page = (items = [anOrderListItem()], nextCursor: string | null = null) => ({ items, nextCursor });

let answers: Record<string, unknown>;

function open() {
  return render(<Orders />, { wrapper: Providers });
}

/** The phone rows: the table beside them holds the same orders for a desktop. */
const rows = () => screen.findByRole("list", { name: "Orders" });

beforeEach(() => {
  answers = { "/api/orders": page(), "/api/orders/counts": COUNTS };
  fetcher.mockReset();
  fetcher.mockImplementation(async (key: string) => {
    const answer = key in answers ? answers[key] : key.startsWith("/api/orders/counts") ? COUNTS : page([]);
    if (answer instanceof Error) throw answer;
    return answer;
  });
});

describe("Orders: the list", () => {
  it("lists the orders as rows and as a table, with New order in the header (§139.10)", async () => {
    open();
    expect(screen.getByRole("heading", { level: 1, name: "Orders" })).toBeInTheDocument();
    expect(within(await rows()).getByRole("link", { name: /ORD-1006 · Meena Gupta/ })).toHaveAttribute("href", "/orders/o-1");
    expect(screen.getByRole("table", { name: "Orders" })).toHaveTextContent("Chocolate truffle cake");
    expect(screen.getAllByRole("link", { name: "New order" })[0]).toHaveAttribute("href", "/orders/new");
  });

  it("counts each tab, and reads a tab's own orders when it is chosen", async () => {
    open();
    await rows();
    const tabs = screen.getByRole("tablist", { name: "Orders by status" });
    await waitFor(() => expect(within(tabs).getByRole("tab", { name: "All 2" })).toHaveAttribute("aria-selected", "true"));
    expect(within(tabs).getByRole("tab", { name: "Out for delivery 0" })).toBeInTheDocument();

    answers["/api/orders?status=DELIVERED"] = page([anOrderListItem({ id: "o-9", orderNumber: "ORD-1009", status: "DELIVERED" })]);
    await userEvent.click(within(tabs).getByRole("tab", { name: "Delivered 1" }));
    expect(await within(await rows()).findByRole("link", { name: /ORD-1009/ })).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledWith("/api/orders?status=DELIVERED");
  });

  it("searches by number, customer or phone once typing pauses, counting the tabs the same way", async () => {
    open();
    await rows();
    answers["/api/orders?search=98765"] = page([anOrderListItem({ id: "o-5", orderNumber: "ORD-1005" })]);
    await userEvent.type(screen.getByRole("searchbox", { name: "Search orders, customers or phone" }), "98765");
    expect(await within(await rows()).findByRole("link", { name: /ORD-1005/ })).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledWith("/api/orders/counts?search=98765");
  });

  it("filters by due dates, payment and Guest orders, and marks the filter button while any is on", async () => {
    open();
    await rows();
    const button = screen.getByRole("button", { name: "Filter orders" });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(button);
    await userEvent.click(screen.getByRole("radio", { name: "Unpaid" }));
    await userEvent.click(screen.getByRole("radio", { name: "Guests only" }));
    await userEvent.click(screen.getByRole("button", { name: "Apply filters" }));

    await waitFor(() => expect(fetcher).toHaveBeenCalledWith("/api/orders?customer=guest&payment=UNPAID"));
    expect(fetcher).toHaveBeenCalledWith("/api/orders/counts?customer=guest&payment=UNPAID");
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByText("No orders here.")).toBeInTheDocument();
  });

  it("shows more when another page follows", async () => {
    answers["/api/orders"] = page([anOrderListItem()], "20");
    answers["/api/orders?cursor=20"] = page([anOrderListItem({ id: "o-21", orderNumber: "ORD-1021" })]);
    open();
    await rows();
    await userEvent.click(screen.getByRole("button", { name: "Show more" }));
    expect(await within(await rows()).findByRole("link", { name: /ORD-1021/ })).toBeInTheDocument();
  });
});

describe("Orders: nothing to show", () => {
  it("invites the first order when there are none at all", async () => {
    answers["/api/orders"] = page([]);
    open();
    expect(await screen.findByText("No orders yet")).toBeInTheDocument();
    expect(screen.getByText("Orders you create show up here, newest first.")).toBeInTheDocument();
  });

  it("says nothing matches a search, and nothing is in an empty tab", async () => {
    open();
    await rows();
    await userEvent.type(screen.getByRole("searchbox"), "Zara");
    expect(await screen.findByText("Nothing matches “Zara”.")).toBeInTheDocument();

    await userEvent.clear(screen.getByRole("searchbox"));
    await userEvent.click(screen.getByRole("tab", { name: /Ready/ }));
    expect(await screen.findByText("No orders here.")).toBeInTheDocument();
  });

  it("says the orders could not be loaded, and tries again", async () => {
    answers["/api/orders"] = new ApiError(500, "INTERNAL_ERROR", "Something went wrong.", "req_1");
    open();
    expect(await screen.findByText("Something went wrong.")).toBeInTheDocument();
    answers["/api/orders"] = page();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await rows()).toBeInTheDocument();
  });
});
