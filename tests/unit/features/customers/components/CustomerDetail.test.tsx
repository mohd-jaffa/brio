import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CustomerDetail } from "@/features/customers/components/CustomerDetail";
import type { Customer, CustomerSummary } from "@/features/customers/types";
import { newDraft, type OrderDraft } from "@/features/orders/draft";
import { ApiError } from "@/lib/api/client";

import { anOrderListItem } from "@tests/support/orders";
import { Providers } from "@tests/support/providers";

const fetcher = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  fetcher,
}));
const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const auth = vi.hoisted(() => ({ profile: { id: "u-1" } as { id: string } | null }));
vi.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => auth }));
const update = vi.hoisted(() => vi.fn());
const useOrderDraft = vi.hoisted(() => vi.fn(() => ({ update })));
vi.mock("@/features/orders/hooks/useOrderDraft", () => ({ useOrderDraft }));
// The form has its own tests; here it only has to open on the customer and say it saved.
vi.mock("@/features/customers/components/CustomerFormSheet", () => ({
  CustomerFormSheet: ({ isOpen, initialData, onSuccess }: { isOpen: boolean; initialData?: Customer; onSuccess: () => void }) =>
    isOpen ? (
      <div role="dialog" aria-label={`Edit ${initialData?.name}`}>
        <button type="button" onClick={onSuccess}>
          Save
        </button>
      </div>
    ) : null,
}));

const anu: Customer = {
  id: "c-1",
  name: "Anu Sharma",
  phone: "+919812345678",
  email: "anu@example.com",
  address: "Flat 302, Sunrise Apartments",
  googleMapsLink: "https://maps.app.goo.gl/anu",
  notes: "Prefers less sugar",
  createdAt: "2026-01-15T05:00:00Z",
  updatedAt: "2026-01-15T05:00:00Z",
};

const summary = (changes: Partial<CustomerSummary> = {}): CustomerSummary => ({
  orders: 12,
  spent: 432000,
  balanceDue: 75000,
  lastOrderAt: "2026-09-24T05:00:00Z",
  segment: "REGULAR",
  addresses: [
    { address: "Flat 302, Sunrise Apartments", googleMapsLink: "https://maps.app.goo.gl/anu", lastUsed: "2026-09-24T05:00:00Z" },
    { address: "", googleMapsLink: "https://maps.app.goo.gl/office", lastUsed: "2026-09-10T05:00:00Z" },
  ],
  ...changes,
});

let answers: Record<string, unknown>;

beforeEach(() => {
  vi.clearAllMocks();
  auth.profile = { id: "u-1" };
  answers = {
    "/api/customers/c-1": anu,
    "/api/customers/c-1/summary": summary(),
    "/api/orders?customer=c-1": { items: [anOrderListItem({ customer: { id: "c-1", name: "Anu Sharma" } })], nextCursor: null },
  };
  fetcher.mockImplementation(async (key: string) => {
    const answer = answers[key];
    if (answer instanceof Error) throw answer;
    return typeof answer === "function" ? answer() : answer;
  });
});

function open() {
  return render(<CustomerDetail id="c-1" />, { wrapper: Providers });
}

const loaded = () => screen.findByRole("heading", { level: 1, name: "Anu Sharma" });

describe("CustomerDetail: who they are", () => {
  it("holds its place while the customer loads", () => {
    fetcher.mockReturnValue(new Promise(() => undefined));
    open();
    expect(screen.getByRole("status", { name: "Loading customer" })).toHaveAttribute("aria-busy", "true");
  });

  it("shows their segment and how to reach them, with Call, WhatsApp, Map and Edit (§139.10)", async () => {
    open();
    await loaded();
    const about = screen.getByRole("region", { name: "About this customer" });
    expect(await within(about).findByText("Regular")).toBeInTheDocument();
    // The number is there to read and copy; Call, below it, is the one way to dial.
    expect(within(about).getByText("+91 98123 45678")).toBeInTheDocument();
    expect(within(about).queryByRole("link", { name: "+91 98123 45678" })).not.toBeInTheDocument();
    expect(within(about).getByRole("link", { name: "anu@example.com" })).toHaveAttribute("href", "mailto:anu@example.com");
    expect(about).toHaveTextContent("Flat 302, Sunrise Apartments");
    expect(within(about).getByRole("link", { name: "Call Anu Sharma" })).toHaveAttribute("href", "tel:+919812345678");
    expect(within(about).getByRole("link", { name: "WhatsApp Anu Sharma" })).toHaveAttribute("href", expect.stringContaining("wa.me"));
    expect(within(about).getByRole("link", { name: "Anu Sharma’s place on a map" })).toHaveAttribute("href", anu.googleMapsLink);
    expect(screen.getByRole("link", { name: "Go back" })).toHaveAttribute("href", "/customers");
  });

  it("leaves out what they have not given, and the segment when they have none", async () => {
    answers["/api/customers/c-1"] = { ...anu, email: undefined, address: undefined, googleMapsLink: undefined, notes: undefined };
    answers["/api/customers/c-1/summary"] = summary({ segment: null });
    open();
    await loaded();
    const about = screen.getByRole("region", { name: "About this customer" });
    await waitFor(() => expect(screen.getByText("Total orders")).toBeInTheDocument());
    expect(within(about).queryByRole("link", { name: /on a map/ })).not.toBeInTheDocument();
    expect(within(about).queryByText("Regular")).not.toBeInTheDocument();
    expect(within(about).queryByRole("link", { name: /@/ })).not.toBeInTheDocument();
  });

  it("sums what they still owe first, then their orders, spend and since when", async () => {
    open();
    await loaded();
    expect(await screen.findByText("Total orders")).toBeInTheDocument();
    const figure = (label: string) => screen.getByText(label).nextSibling;
    const labels = [...document.querySelectorAll("dl dt")].map((term) => term.textContent);
    expect(labels.slice(0, 4)).toEqual(["Balance due", "Total orders", "Total spent", "Customer since"]);
    expect(figure("Total orders")).toHaveTextContent("12");
    expect(figure("Total spent")).toHaveTextContent("₹4,320");
    expect(figure("Customer since")).toHaveTextContent("Jan 2026");
    expect(figure("Balance due")).toHaveTextContent("₹750");
  });

  it("says when the customer could not be loaded", async () => {
    answers["/api/customers/c-1"] = new ApiError(404, "RECORD_NOT_FOUND", "That record could not be found.");
    open();
    expect(await screen.findByText("That record could not be found.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Customer" })).toBeInTheDocument();
  });

  it("says when their figures could not be loaded", async () => {
    answers["/api/customers/c-1/summary"] = new ApiError(500, "INTERNAL_ERROR", "Something went wrong.");
    open();
    await loaded();
    expect(await screen.findByText("Something went wrong.")).toBeInTheDocument();
  });
});

describe("CustomerDetail: the tabs", () => {
  it("lists their orders a page at a time, without their name on every row", async () => {
    open();
    await loaded();
    expect(screen.getByRole("tab", { name: "Orders" })).toHaveAttribute("aria-selected", "true");
    const orders = await screen.findByRole("list", { name: "Anu Sharma’s orders" });
    expect(within(orders).getByRole("link")).toHaveTextContent(/^ORD-1006Chocolate/);
  });

  it("says when they have no orders yet", async () => {
    answers["/api/orders?customer=c-1"] = { items: [], nextCursor: null };
    open();
    await loaded();
    expect(await screen.findByText("No orders yet. Create one below.")).toBeInTheDocument();
  });

  it("shows the notes kept on them, and edits them in the form", async () => {
    open();
    await loaded();
    await userEvent.click(screen.getByRole("tab", { name: "Notes" }));
    expect(screen.getByText("Prefers less sugar")).toBeInTheDocument();
    expect(screen.getByText("Only you see these; they are never on a bill.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Edit notes" }));
    expect(await screen.findByRole("dialog", { name: "Edit Anu Sharma" })).toBeInTheDocument();
  });

  it("says when there are no notes", async () => {
    answers["/api/customers/c-1"] = { ...anu, notes: undefined };
    open();
    await loaded();
    await userEvent.click(screen.getByRole("tab", { name: "Notes" }));
    expect(screen.getByText("No notes yet.")).toBeInTheDocument();
  });

  it("lists the places their deliveries went, each with its map", async () => {
    open();
    await loaded();
    await screen.findByText("Total orders");
    await userEvent.click(screen.getByRole("tab", { name: "Addresses" }));
    const places = screen.getByRole("list", { name: "Addresses" });
    const [home, office] = within(places).getAllByRole("listitem");
    expect(home).toHaveTextContent("Flat 302, Sunrise Apartments");
    expect(home).toHaveTextContent("Last delivered 24 Sep");
    expect(within(home).getByRole("link", { name: "Map: Flat 302, Sunrise Apartments" })).toHaveAttribute("href", anu.googleMapsLink);
    expect(office).toHaveTextContent("A map link");
  });

  it("holds the addresses' place while the figures load, and says when there are none", async () => {
    let resolve: (value: CustomerSummary) => void = () => undefined;
    answers["/api/customers/c-1/summary"] = () => new Promise<CustomerSummary>((done) => (resolve = done));
    open();
    await loaded();
    await userEvent.click(screen.getByRole("tab", { name: "Addresses" }));
    expect(screen.queryByRole("list", { name: "Addresses" })).not.toBeInTheDocument();
    resolve(summary({ addresses: [{ address: "Shop 4", lastUsed: "2026-09-01T05:00:00Z" }] }));
    const place = await screen.findByText("Shop 4");
    expect(within(place.closest("li")!).queryByRole("link")).not.toBeInTheDocument();
  });

  it("says when no delivery has gone anywhere yet", async () => {
    answers["/api/customers/c-1/summary"] = summary({ addresses: [] });
    open();
    await loaded();
    await screen.findByText("Total orders");
    await userEvent.click(screen.getByRole("tab", { name: "Addresses" }));
    expect(screen.getByText("No deliveries yet, so no addresses.")).toBeInTheDocument();
  });
});

describe("CustomerDetail: acting on them", () => {
  it("starts an order with them chosen, keeping what it holds, and opens it (IMP-04)", async () => {
    open();
    await loaded();
    await userEvent.click(screen.getByRole("button", { name: "Create an order for Anu Sharma" }));
    const change = update.mock.calls[0][0] as (draft: OrderDraft) => OrderDraft;
    const kept = { ...newDraft(), notes: "keep me" };
    expect(change(kept)).toMatchObject({ notes: "keep me", customer: { kind: "CUSTOMER", id: "c-1", name: "Anu Sharma" } });
    expect(push).toHaveBeenCalledWith("/orders/new");

    await userEvent.click(screen.getByRole("button", { name: "Create order" }));
    expect(update).toHaveBeenCalledTimes(2);
  });

  it("keeps the order being built for whoever is signed in, and for no one when signed out", async () => {
    const { unmount } = open();
    await loaded();
    expect(useOrderDraft).toHaveBeenCalledWith("u-1");
    unmount();
    auth.profile = null;
    open();
    await loaded();
    expect(useOrderDraft).toHaveBeenLastCalledWith(null);
  });

  it("edits them, then reads them and their figures again", async () => {
    open();
    await loaded();
    await userEvent.click(screen.getByRole("button", { name: "Edit Anu Sharma" }));
    fetcher.mockClear();
    await userEvent.click(within(screen.getByRole("dialog", { name: "Edit Anu Sharma" })).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledWith("/api/customers/c-1"));
    expect(fetcher).toHaveBeenCalledWith("/api/customers/c-1/summary");
  });
});
