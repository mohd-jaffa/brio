import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StockLedgerSheet } from "@/features/inventory/components/StockLedgerSheet";
import type { InventoryBalance, InventoryTransaction } from "@/features/inventory/types";
import type { Product } from "@/features/products/types";

import { Providers } from "@tests/support/providers";

const fetcher = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  fetcher,
}));

const brownies: Product = {
  id: "p-1",
  name: "Fudgy brownie box",
  defaultPrice: 38000,
  unit: "box",
  isActive: true,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};
const level: InventoryBalance = { productId: "p-1", balance: 9, stocked: true, lastMovedAt: "2026-09-26T11:39:00Z" };
const move = (changes: Partial<InventoryTransaction>): InventoryTransaction => ({
  id: "t-1",
  productId: "p-1",
  type: "STOCK_IN",
  quantity: 6,
  createdAt: "2026-09-26T11:39:00Z",
  ...changes,
});

let page: unknown;

beforeEach(() => {
  vi.clearAllMocks();
  page = {
    items: [
      move({}),
      move({ id: "t-2", type: "ORDER_RESERVATION", quantity: -2, referenceType: "ORDER", referenceId: "o-7" }),
    ],
    nextCursor: null,
  };
  fetcher.mockImplementation(async () => page);
});

function open(changes: { product?: Product; level?: InventoryBalance } = {}) {
  const onClose = vi.fn();
  const onRecord = vi.fn();
  render(
    <StockLedgerSheet
      product={"product" in changes ? changes.product : brownies}
      level={"level" in changes ? changes.level : level}
      onClose={onClose}
      onRecord={onRecord}
    />,
    { wrapper: Providers },
  );
  return { onClose, onRecord };
}

describe("StockLedgerSheet", () => {
  it("shows what is on the shelf, and the ledger that made it, signed and dated (§139.10)", async () => {
    open();
    const sheet = screen.getByRole("dialog", { name: "Fudgy brownie box" });
    expect(sheet).toHaveTextContent("On the shelf9 boxes");
    const list = await within(sheet).findByRole("list", { name: "Movements of Fudgy brownie box" });
    const [stockIn, reserved] = within(list).getAllByRole("listitem");
    expect(stockIn).toHaveTextContent("Stock in");
    expect(stockIn).toHaveTextContent("26 Sep 2026, 5:09 PM");
    expect(stockIn).toHaveTextContent("+6 boxes");
    expect(reserved).toHaveTextContent("Reserved for an order");
    expect(reserved).toHaveTextContent("−2 boxes");
    expect(within(reserved).getByRole("link", { name: "View order" })).toHaveAttribute("href", "/orders/o-7");
    expect(fetcher).toHaveBeenCalledWith("/api/inventory?product=p-1");
  });

  it("says a product made to order is not counted, and when nothing has been recorded", async () => {
    page = { items: [], nextCursor: null };
    open({ level: undefined });
    expect(screen.getByRole("dialog")).toHaveTextContent("Made to order — stock not counted");
    expect(await screen.findByText("Nothing recorded for it yet.")).toBeInTheDocument();
  });

  it("hands Record stock the product", async () => {
    const { onRecord } = open();
    await userEvent.click(screen.getByRole("button", { name: "Record stock" }));
    expect(onRecord).toHaveBeenCalledWith(brownies);
  });

  it("keeps its figure while Record stock is over it and leaving, then rolls it the way the stock moved", async () => {
    const sheet = (changes: { level: InventoryBalance; covered?: boolean }) => (
      <StockLedgerSheet product={brownies} onClose={vi.fn()} onRecord={vi.fn()} {...changes} />
    );
    const { rerender } = render(sheet({ level }), { wrapper: Providers });
    rerender(sheet({ level, covered: true }));
    // Five came in, recorded behind the form.
    rerender(sheet({ level: { ...level, balance: 14 }, covered: true }));
    expect(screen.getByRole("dialog")).toHaveTextContent("On the shelf9 boxes");

    rerender(sheet({ level: { ...level, balance: 14 } }));
    expect(screen.getByRole("dialog")).toHaveTextContent("On the shelf9 boxes");
    expect(await screen.findByText("14 boxes")).toHaveClass("animate-tick-up");
  });

  it("opens another product's stock still, rather than rolling from the last one's", () => {
    const sheet = (product: Product, balance: number) => (
      <StockLedgerSheet product={product} level={{ ...level, balance }} onClose={vi.fn()} onRecord={vi.fn()} />
    );
    const { rerender } = render(sheet(brownies, 9), { wrapper: Providers });
    rerender(sheet({ ...brownies, id: "p-2", name: "Lemon tart" }, 3));
    expect(screen.getByText("3 boxes")).not.toHaveClass("animate-tick-down");
  });

  it("reads nothing while closed", () => {
    open({ product: undefined, level: undefined });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
