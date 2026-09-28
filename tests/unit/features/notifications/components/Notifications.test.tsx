import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppNotification } from "@/features/notifications/types";
import { ApiError } from "@/lib/api/client";

import { Providers } from "@tests/support/providers";

const fetcher = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  fetcher,
}));
const client = vi.hoisted(() => ({ markRead: vi.fn(), markAllRead: vi.fn() }));
vi.mock("@/features/notifications/api.client", () => ({ NotificationsClient: client }));

import { Notifications } from "@/features/notifications/components/Notifications";

const aNotification = (id: string, overrides: Partial<AppNotification> = {}): AppNotification => ({
  id,
  kind: "ORDER",
  title: "New order",
  body: `${id} placed for Priya Menon.`,
  actionUrl: `/orders/${id}`,
  read: false,
  createdAt: "2026-09-20T05:00:00Z",
  ...overrides,
});

let answers: Record<string, unknown>;

beforeEach(() => {
  answers = {
    "/api/notifications": {
      items: [aNotification("ORD-2"), aNotification("n-stock", { kind: "STOCK", title: "Low stock", body: "Brownies is down to 3 pieces.", actionUrl: "/inventory", read: true })],
      nextCursor: "20",
    },
    "/api/notifications?cursor=20": { items: [aNotification("ORD-1")], nextCursor: null },
    "/api/notifications?tab=CUSTOMERS": { items: [], nextCursor: null },
    "/api/notifications/unread": { unread: 2 },
  };
  fetcher.mockReset();
  fetcher.mockImplementation(async (key: string) => {
    const answer = answers[key];
    if (answer instanceof Error) throw answer;
    return answer;
  });
  client.markRead.mockReset().mockResolvedValue({ read: true });
  client.markAllRead.mockReset().mockResolvedValue({ read: 2 });
});

const open = () => render(<Notifications />, { wrapper: Providers });
const list = () => screen.findByRole("list", { name: "All" });

describe("Notifications", () => {
  it("lists what happened, newest first, a page at a time", async () => {
    open();
    expect(screen.getByRole("heading", { level: 1, name: "Notifications" })).toBeInTheDocument();
    const rows = within(await list()).getAllByRole("link");
    expect(rows.map((row) => row.getAttribute("href"))).toEqual(["/orders/ORD-2", "/inventory"]);

    await userEvent.click(screen.getByRole("button", { name: "Show more" }));
    await waitFor(() => expect(within(screen.getByRole("list", { name: "All" })).getAllByRole("link")).toHaveLength(3));
  });

  it("marks one read as it is opened, and asks the bell again", async () => {
    open();
    const row = within(await list()).getByRole("link", { name: /ORD-2 placed/ });
    row.addEventListener("click", (event) => event.preventDefault());
    await userEvent.click(row);
    await waitFor(() => expect(client.markRead).toHaveBeenCalledWith("ORD-2"));
    await waitFor(() => expect(fetcher.mock.calls.filter(([key]) => key === "/api/notifications/unread").length).toBeGreaterThan(1));
  });

  it("marks them all read", async () => {
    open();
    await list();
    const button = screen.getByRole("button", { name: "Mark all as read" });
    await waitFor(() => expect(button).toBeEnabled());
    answers["/api/notifications/unread"] = { unread: 0 };
    await userEvent.click(button);

    expect(client.markAllRead).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.getByRole("button", { name: "Mark all as read" })).toBeDisabled());
  });

  it("offers nothing to mark while nothing waits", async () => {
    answers["/api/notifications/unread"] = { unread: 0 };
    open();
    await list();
    expect(screen.getByRole("button", { name: "Mark all as read" })).toBeDisabled();
  });

  it("says so on a card when they could not be marked", async () => {
    client.markAllRead.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR", "Something went wrong.", "req_9"));
    open();
    await list();
    const button = screen.getByRole("button", { name: "Mark all as read" });
    await waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);
    const card = await screen.findByRole("alertdialog", { name: "Not marked as read" });
    expect(card).toHaveTextContent("Reference: req_9");
  });

  it("shows one tab's kinds, and says when it has none", async () => {
    open();
    await list();
    await userEvent.click(screen.getByRole("tab", { name: "Customers" }));
    expect(await screen.findByText("No new customers yet")).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledWith("/api/notifications?tab=CUSTOMERS");
  });

  it("shows the unread or the read on their own tabs, and says when there are none", async () => {
    answers["/api/notifications?tab=UNREAD"] = { items: [aNotification("ORD-2")], nextCursor: null };
    answers["/api/notifications?tab=READ"] = { items: [], nextCursor: null };
    open();
    await list();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["All", "Unread", "Read", "Orders", "Customers", "System"]);

    await userEvent.click(screen.getByRole("tab", { name: "Unread" }));
    const unread = await screen.findByRole("list", { name: "Unread" });
    expect(within(unread).getAllByRole("link")).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledWith("/api/notifications?tab=UNREAD");

    await userEvent.click(screen.getByRole("tab", { name: "Read" }));
    expect(await screen.findByText("Nothing read yet")).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledWith("/api/notifications?tab=READ");
  });

  it("says what shows up here, while nothing has", async () => {
    answers["/api/notifications"] = { items: [], nextCursor: null };
    open();
    expect(await screen.findByRole("heading", { name: "All quiet" })).toBeInTheDocument();
    expect(screen.getByText(/New orders, orders due, payments, low stock and new customers/)).toBeInTheDocument();
  });

  it("says when they could not be loaded, and tries again", async () => {
    answers["/api/notifications"] = new ApiError(500, "INTERNAL_ERROR", "Something went wrong.", "req_1");
    open();
    expect(await screen.findByText("Something went wrong.")).toBeInTheDocument();
    answers["/api/notifications"] = { items: [aNotification("ORD-3")], nextCursor: null };
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("link", { name: /ORD-3 placed/ })).toBeInTheDocument();
  });
});
