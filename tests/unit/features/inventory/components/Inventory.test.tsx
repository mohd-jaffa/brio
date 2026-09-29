import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSWRConfig } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Inventory } from "@/features/inventory/components/Inventory";
import type { InventoryBalance } from "@/features/inventory/types";
import type { Product } from "@/features/products/types";
import { ApiError } from "@/lib/api/client";

import { Providers } from "@tests/support/providers";

const fetcher = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  fetcher,
}));
// Both sheets have their own tests; here they only have to open on the right product.
vi.mock("@/features/inventory/components/StockLedgerSheet", () => ({
  StockLedgerSheet: ({
    product,
    level,
    onClose,
    onRecord,
  }: {
    product?: Product;
    level?: InventoryBalance;
    onClose: () => void;
    onRecord: (product: Product) => void;
  }) =>
    product ? (
      <div role="dialog" aria-label={`History of ${product.name}`}>
        {level ? `Balance ${level.balance}` : "No balance"}
        <button type="button" onClick={() => onRecord(product)}>
          Record stock
        </button>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    ) : null,
}));
vi.mock("@/features/inventory/components/InventoryAdjustmentSheet", () => ({
  InventoryAdjustmentSheet: ({ isOpen, product }: { isOpen: boolean; product?: Product }) =>
    isOpen ? <div role="dialog" aria-label={`Record stock for ${product?.name}`} /> : null,
}));

const product = (id: string, name: string, changes: Partial<Product> = {}): Product => ({
  id,
  name,
  defaultPrice: 10000,
  unit: "piece",
  isActive: true,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...changes,
});

let answers: Record<string, unknown>;

beforeEach(() => {
  vi.clearAllMocks();
  answers = {
    "/api/products": [
      product("p-cake", "Truffle cake", { unit: "kg" }),
      product("p-bun", "Cinnamon bun"),
      product("p-topper", "Cake topper"),
      product("p-old", "Old loaf", { isActive: false }),
      product("p-brownie", "Brownie box", { unit: "box" }),
    ],
    "/api/inventory/balance": [
      { productId: "p-cake", balance: 14, stocked: true, lastMovedAt: "2026-09-26T05:00:00Z" },
      { productId: "p-bun", balance: 2, stocked: true, lastMovedAt: "2026-09-26T05:00:00Z" },
      { productId: "p-brownie", balance: 2, stocked: true, lastMovedAt: "2026-09-26T05:00:00Z" },
      { productId: "p-topper", balance: -3, stocked: false, lastMovedAt: "2026-09-26T05:00:00Z" },
    ],
  };
  fetcher.mockImplementation(async (key: string) => {
    const answer = answers[key];
    if (answer instanceof Error) throw answer;
    return answer;
  });
});

// Reads everything again, as a recorded movement does.
const configs: ReturnType<typeof useSWRConfig>[] = [];
function Refresher() {
  configs.push(useSWRConfig());
  return null;
}
async function refresh() {
  const { cache, mutate } = configs.at(-1)!;
  await act(async () => void (await Promise.all([...cache.keys()].map((key) => mutate(key)))));
}

function open() {
  return render(
    <>
      <Refresher />
      <Inventory />
    </>,
    { wrapper: Providers },
  );
}

const rows = () => screen.findByRole("list", { name: "Stock" }).then((list) => within(list).getAllByRole("listitem"));

describe("Inventory", () => {
  it("lists the products on sale with their stock, kept ones emptiest first, and marks what is low (§139.10)", async () => {
    open();
    expect(screen.getByRole("heading", { level: 1, name: "Inventory" })).toBeInTheDocument();
    const [brownie, bun, cake, topper] = await rows();
    expect(brownie).toHaveTextContent("Brownie box2 boxes in stockLow stock");
    expect(bun).toHaveTextContent("Cinnamon bun2 pieces in stockLow stock");
    expect(cake).toHaveTextContent("Truffle cake14 kg in stock");
    expect(cake).not.toHaveTextContent("Low stock");
    // Made to order: nobody counts its stock, so it is never low.
    expect(topper).toHaveTextContent("Cake topperMade to order — stock not counted");
    expect(topper).not.toHaveTextContent("Low stock");
    expect(screen.queryByText("Old loaf")).not.toBeInTheDocument();
  });

  it("opens a product's history, and records stock for it from there", async () => {
    open();
    await rows();
    await userEvent.click(screen.getByRole("button", { name: /Truffle cake/ }));
    const history = await screen.findByRole("dialog", { name: "History of Truffle cake" });
    expect(history).toHaveTextContent("Balance 14");
    await userEvent.click(within(history).getByRole("button", { name: "Record stock" }));
    expect(await screen.findByRole("dialog", { name: "Record stock for Truffle cake" })).toBeInTheDocument();
    await userEvent.click(within(history).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: "History of Truffle cake" })).not.toBeInTheDocument();
  });

  it("shows stock recorded from a product's history as the history closes, where it can be seen", async () => {
    open();
    await rows();
    await userEvent.click(screen.getByRole("button", { name: /Brownie box/ }));
    const history = await screen.findByRole("dialog", { name: "History of Brownie box" });

    answers["/api/inventory/balance"] = [
      ...(answers["/api/inventory/balance"] as InventoryBalance[]).filter((level) => level.productId !== "p-brownie"),
      { productId: "p-brownie", balance: 20, stocked: true, lastMovedAt: "2026-09-29T05:00:00Z" },
    ];
    await refresh();
    // The history has the new stock; the list behind it keeps its own until it closes.
    expect(history).toHaveTextContent("Balance 20");
    expect((await rows())[0]).toHaveTextContent("Brownie box2 boxes in stockLow stock");

    await userEvent.click(within(history).getByRole("button", { name: "Close" }));
    // Once the sheet has left.
    await waitFor(async () => expect((await rows())[2]).toHaveTextContent("Brownie box20 boxes in stock"));
    const [bun, cake, brownie] = await rows();
    expect(bun).toHaveTextContent("Cinnamon bun");
    expect(cake).toHaveTextContent("Truffle cake");
    // It rolls up to its new count, and Low stock shrinks away, already gone to a screen reader.
    for (const count of within(brownie).getAllByText("20 boxes")) expect(count).toHaveClass("animate-tick-up");
    for (const pill of within(brownie).getAllByText("Low stock")) {
      expect(pill.parentElement).toHaveClass("animate-pop-out");
      expect(pill.parentElement).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("opens the history of a product with no movements yet", async () => {
    answers["/api/products"] = [product("p-new", "New tart")];
    open();
    await rows();
    await userEvent.click(screen.getByRole("button", { name: /New tart/ }));
    expect(screen.getByRole("dialog", { name: "History of New tart" })).toHaveTextContent("No balance");
  });

  it("finds a product by name, and says when none matches", async () => {
    open();
    await rows();
    await userEvent.type(screen.getByRole("searchbox", { name: "Search products on sale" }), "bun");
    expect(await rows()).toHaveLength(1);
    await userEvent.type(screen.getByRole("searchbox"), "zzz");
    expect(screen.getByText("Nothing matches “bunzzz”.")).toBeInTheDocument();
  });

  it("says there is nothing on sale yet", async () => {
    answers["/api/products"] = [product("p-old", "Old loaf", { isActive: false })];
    open();
    expect(await screen.findByText("No products on sale")).toBeInTheDocument();
  });

  it("says the stock could not be loaded, and tries both reads again", async () => {
    answers["/api/inventory/balance"] = new ApiError(500, "INTERNAL_ERROR", "Something went wrong.");
    open();
    expect(await screen.findByText("Something went wrong.")).toBeInTheDocument();
    answers["/api/inventory/balance"] = [];
    fetcher.mockClear();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await rows()).toHaveLength(4);
    expect(fetcher).toHaveBeenCalledWith("/api/products");
  });
});
