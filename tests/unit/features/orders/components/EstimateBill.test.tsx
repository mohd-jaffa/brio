import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EstimateBill } from "@/features/orders/components/EstimateBill";
import type { OrderEstimate } from "@/features/orders/estimate";
import { ApiError } from "@/lib/api/client";

import { aBusiness } from "@tests/support/bills";
import { Providers } from "@tests/support/providers";

const fetcher = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  fetcher,
}));
const share = vi.hoisted(() => vi.fn());
const useBillShare = vi.hoisted(() => vi.fn());
vi.mock("@/features/receipts/hooks/useBillShare", () => ({ useBillShare }));

const estimate: OrderEstimate = {
  customer: { kind: "GUEST" },
  lines: [
    { productId: "p-1", name: "Red Velvet Cake", unitPrice: 98_000, quantity: 4, subtotal: 392_000, notes: null },
  ],
  adjustments: [],
  totals: { subtotal: 392_000, discount: 0, deliveryCharge: 0, tax: 0, total: 392_000 },
  delivery: { type: "PICKUP", date: "2026-09-27T04:30:00.000Z", address: null, googleMapsLink: null },
  payment: { status: "UNPAID", paid: 0, method: null, reference: null },
  balanceDue: 392_000,
  shortfalls: [],
  issuedAt: "2026-09-26T06:00:00.000Z",
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://ovenly.app");
  fetcher.mockResolvedValue(aBusiness());
  useBillShare.mockReturnValue({ share, sharing: false });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

function show(props: Partial<Parameters<typeof EstimateBill>[0]> = {}) {
  const handlers = { onClose: vi.fn(), onPlace: vi.fn() };
  render(<EstimateBill open estimate={estimate} placing={false} {...handlers} {...props} />, { wrapper: Providers });
  return handlers;
}

describe("EstimateBill (§139.11.5)", () => {
  it("is the estimate from the business, with Share and Place order", async () => {
    const { onPlace } = show();
    const sheet = screen.getByRole("dialog", { name: "Estimate" });
    const bill = await within(sheet).findByRole("article", { name: "Estimate · not yet confirmed" });
    expect(bill).toHaveTextContent("Sweet Delights Home Bakery");
    expect(bill).toHaveTextContent("Made with Ovenly · ovenly.app");
    expect(useBillShare).toHaveBeenLastCalledWith(expect.objectContaining({ kind: "ESTIMATE", orderNumber: null }));

    await userEvent.click(within(sheet).getByRole("button", { name: "Share" }));
    await userEvent.click(within(sheet).getByRole("button", { name: "Place order" }));
    expect(share).toHaveBeenCalledOnce();
    expect(onPlace).toHaveBeenCalledOnce();
  });

  it("holds its place while the draft is priced, with nothing to act on yet", () => {
    show({ estimate: undefined });
    expect(screen.getByRole("status", { name: "Building the bill" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Place order" })).toBeDisabled();
  });

  it("says what is short, and cannot be placed until the order changes", async () => {
    show({
      estimate: {
        ...estimate,
        shortfalls: [{ productId: "p-1", name: "Red Velvet Cake", available: 2, requested: 4 }],
      },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("Only 2 left of Red Velvet Cake.");
    await screen.findByRole("article");
    expect(screen.getByRole("button", { name: "Place order" })).toBeDisabled();
  });

  it("says so when the business could not be read, and draws nothing while it is closed", async () => {
    fetcher.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR", "Something went wrong.", "req_1"));
    show();
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong.");
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("builds no bill while it is closed, and shows placing as busy", () => {
    show({ open: false, placing: true });
    expect(useBillShare).toHaveBeenLastCalledWith(undefined);
  });
});
