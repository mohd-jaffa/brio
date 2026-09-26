import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Customer } from "@/features/customers/types";
import { OrderAgain } from "@/features/orders/components/OrderAgain";
import { addProduct, newDraft, type OrderDraft } from "@/features/orders/draft";

import { anOrder } from "@tests/support/orders";
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
const drafts = vi.hoisted(() => ({ current: null as OrderDraft | null, update: vi.fn(), clear: vi.fn(), user: "" as string | null }));
vi.mock("@/features/orders/hooks/useOrderDraft", () => ({
  useOrderDraft: (user: string | null) => {
    drafts.user = user;
    return { draft: user ? drafts.current : null, update: drafts.update, clear: drafts.clear };
  },
}));

const meena: Customer = {
  id: "c-1",
  name: "Meena Gupta",
  phone: "+919834567890",
  address: "Block B-404, Green Park",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

let products: unknown;

beforeEach(() => {
  vi.clearAllMocks();
  auth.profile = { id: "u-1" };
  drafts.current = newDraft();
  products = [{ id: "p-1", isActive: true }];
  fetcher.mockImplementation(async () => products);
});

const button = () => screen.getByRole("button", { name: "Order ORD-1006 again" });
/** The draft Order again put in place of the one being built. */
const placed = (): OrderDraft => drafts.update.mock.calls[0][0](newDraft());

describe("OrderAgain", () => {
  it("waits for the catalogue and the customer before it can start", async () => {
    const { rerender } = render(<OrderAgain order={anOrder()} />, { wrapper: Providers });
    expect(button()).toBeDisabled();
    rerender(<OrderAgain order={anOrder()} customer={meena} />);
    await waitFor(() => expect(button()).toBeEnabled());
  });

  it("cannot start for someone signed out, who has no order being built", async () => {
    auth.profile = null;
    render(<OrderAgain order={anOrder({ customerId: null })} />, { wrapper: Providers });
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(drafts.user).toBeNull();
    expect(button()).toBeDisabled();
  });

  it("starts the order over from this one and opens it, when nothing is being built (IMP-03)", async () => {
    render(<OrderAgain order={anOrder()} customer={meena} />, { wrapper: Providers });
    await waitFor(() => expect(button()).toBeEnabled());
    await userEvent.click(button());

    expect(drafts.clear).toHaveBeenCalled();
    expect(placed().lines).toHaveLength(2);
    expect(placed().customer).toMatchObject({ kind: "CUSTOMER", id: "c-1", name: "Meena Gupta" });
    expect(push).toHaveBeenCalledWith("/orders/new");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("asks before replacing an order being built, and keeps it when told to", async () => {
    drafts.current = addProduct(newDraft(), "p-9");
    render(<OrderAgain order={anOrder({ customerId: null })} />, { wrapper: Providers });
    await waitFor(() => expect(button()).toBeEnabled());

    await userEvent.click(button());
    expect(await screen.findByText("Start again from this order?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Keep building" }));
    expect(drafts.update).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();

    await userEvent.click(button());
    await userEvent.click(await screen.findByRole("button", { name: "Start again" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/orders/new"));
    expect(placed().customer).toEqual({ kind: "GUEST" });
  });

  it("says how much was left out because it is no longer on sale", async () => {
    products = [{ id: "p-1", isActive: false }];
    render(<OrderAgain order={anOrder()} customer={meena} />, { wrapper: Providers });
    await waitFor(() => expect(button()).toBeEnabled());
    await userEvent.click(button());
    expect(await screen.findByText("Some items are no longer on sale")).toBeInTheDocument();
    expect(screen.getAllByText(/1 item was left out/)[0]).toBeInTheDocument();
    expect(placed().lines).toHaveLength(1);
  });
});
