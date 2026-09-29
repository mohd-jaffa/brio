import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ItemsPanel } from "@/features/orders/components/ItemsPanel";
import type { Product } from "@/features/products/types";

const product = (id: string, name: string, defaultPrice: number): Product => ({
  id,
  name,
  defaultPrice,
  unit: "piece",
  isActive: true,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
});

const cake = product("p-cake", "Chocolate truffle cake", 125000);
const brownie = product("p-brownie", "Walnut brownie", 22000);

function show(props: Partial<Parameters<typeof ItemsPanel>[0]> = {}) {
  const all = {
    products: [cake, brownie],
    loading: false,
    quantityOf: (id: string) => (id === "p-cake" ? 2 : 0),
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    onAddCustom: vi.fn(),
    ...props,
  };
  render(<ItemsPanel {...all} />);
  return all;
}

describe("ItemsPanel", () => {
  it("shows every product with its price, and how many are already in the order", () => {
    show();
    const cards = screen.getAllByRole("listitem");
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByText("₹1,250")).toBeInTheDocument();
    expect(cards[0].querySelector("img")).toHaveAttribute("fetchpriority", "high");
    expect(cards[1].querySelector("img")).toHaveAttribute("loading", "lazy");
    expect(within(cards[0]).getByText("2 in the order")).toBeInTheDocument();
    expect(within(cards[1]).queryByText(/in the order/)).not.toBeInTheDocument();
  });

  it("offers a custom item above the search and the grid, however long the menu", () => {
    show();
    const custom = screen.getByRole("button", { name: /Add custom item/ });
    const search = screen.getByRole("searchbox");
    expect(custom.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("adds a product with its +, takes one off with its −, and hands over to a custom item", async () => {
    const onAddOrigin = vi.fn();
    const props = show({ onAddOrigin });
    const add = screen.getByRole("button", { name: "Add Walnut brownie" });
    await userEvent.click(add);
    expect(props.onAdd).toHaveBeenCalledWith("p-brownie");
    expect(onAddOrigin).toHaveBeenCalledWith("p-brownie", add);
    expect(screen.queryByRole("button", { name: "Remove one Walnut brownie" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove one Chocolate truffle cake" }));
    expect(props.onRemove).toHaveBeenCalledWith("p-cake");
    await userEvent.click(screen.getByRole("button", { name: /Add custom item/ }));
    expect(props.onAddCustom).toHaveBeenCalledOnce();
  });

  it("finds a product by name, and says when nothing matches", async () => {
    show();
    const search = screen.getByLabelText("Search products…");
    await userEvent.type(search, "  BROWN ");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Add Walnut brownie" })).toBeInTheDocument();

    await userEvent.clear(search);
    await userEvent.type(search, "pizza");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Nothing matches “pizza”");
  });

  it("holds the grid's place while loading, and offers a custom item when there are no products", () => {
    const { unmount } = render(
      <ItemsPanel
        products={[]}
        loading
        quantityOf={() => 0}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onAddCustom={vi.fn()}
      />,
    );
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    unmount();

    show({ products: [] });
    expect(screen.getByText("No products yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add custom item/ })).toBeInTheDocument();
  });

  it("ticks the count on the card as it changes", () => {
    const props = {
      products: [cake, brownie],
      loading: false,
      onAdd: vi.fn(),
      onRemove: vi.fn(),
      onAddCustom: vi.fn(),
    };
    const { rerender } = render(<ItemsPanel {...props} quantityOf={(id) => (id === "p-cake" ? 2 : 0)} />);
    const count = () => within(screen.getByText("Chocolate truffle cake").closest("li")!).getByText(/^\d+$/);
    expect(count()).toHaveTextContent("2");
    rerender(<ItemsPanel {...props} quantityOf={(id) => (id === "p-cake" ? 3 : 0)} />);
    expect(count()).toHaveClass("animate-tick-up");
    expect(screen.getByText("3 in the order")).toBeInTheDocument();
  });
});
