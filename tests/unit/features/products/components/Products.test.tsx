import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProductsClient } from "@/features/products/api.client";
import { Products } from "@/features/products/components/Products";
import type { Product } from "@/features/products/types";
import { ApiError } from "@/lib/api/client";

import { Providers } from "@tests/support/providers";

const fetcher = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  fetcher,
}));
vi.mock("@/features/products/api.client", () => ({
  ProductsClient: { createProduct: vi.fn(), updateProduct: vi.fn() },
}));
// Both sheets have their own tests; here they only have to open on the right product.
vi.mock("@/features/products/components/ProductFormSheet", () => ({
  ProductFormSheet: ({ isOpen, initialData }: { isOpen: boolean; initialData?: Product }) =>
    isOpen ? <div role="dialog" aria-label={initialData ? `Edit ${initialData.name}` : "New product"} /> : null,
}));
vi.mock("@/features/inventory/components/InventoryAdjustmentSheet", () => ({
  InventoryAdjustmentSheet: ({ isOpen, product }: { isOpen: boolean; product?: Product }) =>
    isOpen ? <div role="dialog" aria-label={`Stock for ${product?.name}`} /> : null,
}));

const product = (changes: Partial<Product> = {}): Product => ({
  id: "p-1",
  name: "Chocolate truffle cake",
  defaultPrice: 120000,
  unit: "kg",
  iconKey: "chocolate-cake-slice",
  isActive: true,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...changes,
});

let answer: unknown;

beforeEach(() => {
  vi.clearAllMocks();
  answer = [product(), product({ id: "p-2", name: "Rose bunch", defaultPrice: 30000, unit: "bunch", isActive: false })];
  fetcher.mockImplementation(async () => {
    if (answer instanceof Error) throw answer;
    return answer;
  });
});

function open() {
  return render(<Products />, { wrapper: Providers });
}

/** The phone rows; the desktop cards beside them hold the same products. */
const rows = () => screen.findAllByRole("list", { name: "Products" }).then((lists) => lists[0]);

describe("Products: the list", () => {
  it("lists each product with its price per unit and whether it is on sale (§139.10)", async () => {
    open();
    expect(screen.getByRole("heading", { level: 1, name: "Products" })).toBeInTheDocument();
    const [cake, roses] = within(await rows()).getAllByRole("listitem");
    expect(cake).toHaveTextContent("Chocolate truffle cake");
    expect(cake).toHaveTextContent("₹1,200 per kg");
    expect(cake).toHaveTextContent("Active");
    expect(roses).toHaveTextContent("₹300 per bunch");
    expect(roses).toHaveTextContent("Not on sale");
    // The same products as cards, for a desktop.
    expect(screen.getByRole("article", { name: "Rose bunch" })).toHaveTextContent("Not on sale");
  });

  it("finds a product by name", async () => {
    open();
    await rows();
    await userEvent.type(screen.getByRole("searchbox", { name: "Search products" }), "rose");
    expect(within(await rows()).getAllByRole("listitem")).toHaveLength(1);
    await userEvent.clear(screen.getByRole("searchbox"));
    await userEvent.type(screen.getByRole("searchbox"), "bread");
    expect(screen.getByText("Nothing matches “bread”.")).toBeInTheDocument();
  });

  it("invites the first product when there are none, and adds one from + too", async () => {
    answer = [];
    open();
    expect(await screen.findByText("No products yet")).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: "Add product" }).at(-1)!);
    expect(screen.getByRole("dialog", { name: "New product" })).toBeInTheDocument();
  });

  it("says the products could not be loaded", async () => {
    answer = new ApiError(500, "INTERNAL_ERROR", "Something went wrong.");
    open();
    expect(await screen.findByText("Something went wrong.")).toBeInTheDocument();
  });
});

describe("Products: one product's menu", () => {
  const menu = async (name: string) => {
    await rows();
    await userEvent.click(screen.getAllByRole("button", { name: `More for ${name}` })[0]);
    return screen.getByRole("dialog", { name });
  };

  it("adds a product from + in the header", async () => {
    open();
    await rows();
    await userEvent.click(screen.getAllByRole("button", { name: "Add product" })[0]);
    expect(screen.getByRole("dialog", { name: "New product" })).toBeInTheDocument();
  });

  it("opens the same menu from a desktop card", async () => {
    open();
    await rows();
    const card = screen.getByRole("article", { name: "Rose bunch" });
    await userEvent.click(within(card).getByRole("button", { name: "More for Rose bunch" }));
    expect(screen.getByRole("dialog", { name: "Rose bunch" })).toBeInTheDocument();
  });

  it("edits the product, or records stock for it", async () => {
    open();
    await userEvent.click(within(await menu("Chocolate truffle cake")).getByRole("button", { name: "Edit" }));
    expect(screen.getByRole("dialog", { name: "Edit Chocolate truffle cake" })).toBeInTheDocument();

    await userEvent.click(within(await menu("Chocolate truffle cake")).getByRole("button", { name: "Record stock" }));
    expect(screen.getByRole("dialog", { name: "Stock for Chocolate truffle cake" })).toBeInTheDocument();
  });

  it("takes a product off sale, and puts one back, saying what that means", async () => {
    vi.mocked(ProductsClient.updateProduct).mockImplementation(async (id, change) =>
      product({ id, name: id === "p-1" ? "Chocolate truffle cake" : "Rose bunch", isActive: Boolean(change.isActive) }),
    );
    open();
    await userEvent.click(within(await menu("Chocolate truffle cake")).getByRole("button", { name: "Take off sale" }));
    expect(ProductsClient.updateProduct).toHaveBeenCalledWith("p-1", { isActive: false });
    expect((await screen.findAllByText("Chocolate truffle cake no longer shows on the order screen."))[0]).toBeInTheDocument();

    await userEvent.click(within(await menu("Rose bunch")).getByRole("button", { name: "Put back on sale" }));
    await waitFor(() => expect(ProductsClient.updateProduct).toHaveBeenCalledWith("p-2", { isActive: true }));
    expect((await screen.findAllByText("Rose bunch can be ordered again."))[0]).toBeInTheDocument();
  });

  it("says when a product could not be changed", async () => {
    vi.mocked(ProductsClient.updateProduct).mockRejectedValue(new ApiError(500, "SAVE_FAILED", "Could not save."));
    open();
    await userEvent.click(within(await menu("Chocolate truffle cake")).getByRole("button", { name: "Take off sale" }));
    expect((await screen.findAllByText("Product not saved"))[0]).toBeInTheDocument();
  });
});
