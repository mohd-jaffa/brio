import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Product } from "@/features/products/types";

import { InventoryClient } from "@/features/inventory/api.client";
import { InventoryAdjustmentSheet } from "@/features/inventory/components/InventoryAdjustmentSheet";

vi.mock("@/features/inventory/api.client", () => ({
  InventoryClient: { adjustStock: vi.fn() },
}));

const flour: Product = {
  id: "p-1",
  name: "Flour",
  defaultPrice: 5000,
  unit: "kg",
  isActive: true,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

function wrapper({ children }: { children: ReactNode }) {
  return <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>;
}

function open(props: Partial<Parameters<typeof InventoryAdjustmentSheet>[0]> = {}) {
  const all = { isOpen: true, onClose: vi.fn(), onSuccess: vi.fn(), product: flour, ...props };
  render(<InventoryAdjustmentSheet {...all} />, { wrapper });
  return all;
}

beforeEach(() => vi.clearAllMocks());

describe("InventoryAdjustmentSheet", () => {
  it("stays closed without a product to adjust, its form already in place", () => {
    const { container } = render(
      <InventoryAdjustmentSheet isOpen onClose={vi.fn()} onSuccess={vi.fn()} />,
      { wrapper },
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(container.querySelector("dialog")).not.toHaveAttribute("open");
    expect(container.querySelector("form")).toBeInTheDocument();
  });

  it("names the product and its unit, so the count is unambiguous", () => {
    open();
    expect(screen.getByRole("heading", { name: /Flour/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/Quantity \(in kgs\)/)).toBeInTheDocument();
  });

  it("adds stock in as a positive movement", async () => {
    vi.mocked(InventoryClient.adjustStock).mockResolvedValue({
      id: "t-1",
      productId: "p-1",
      type: "STOCK_IN",
      quantity: 10,
      createdAt: "2026-09-22T00:00:00Z",
    });
    const props = open();

    await userEvent.type(screen.getByLabelText(/Quantity/), "10");
    await userEvent.click(screen.getByRole("button", { name: "Confirm Adjustment" }));

    await waitFor(() =>
      expect(InventoryClient.adjustStock).toHaveBeenCalledWith({
        productId: "p-1",
        type: "STOCK_IN",
        quantity: 10,
        referenceType: "MANUAL",
      }),
    );
    expect(props.onSuccess).toHaveBeenCalledOnce();
  });

  it("takes wastage off stock, from a plain count — nobody types a minus sign", async () => {
    vi.mocked(InventoryClient.adjustStock).mockResolvedValue({
      id: "t-2",
      productId: "p-1",
      type: "WASTAGE",
      quantity: -3,
      createdAt: "2026-09-22T00:00:00Z",
    });
    open();

    await userEvent.selectOptions(screen.getByLabelText(/Adjustment Type/), "WASTAGE");
    await userEvent.type(screen.getByLabelText(/Quantity/), "3");
    await userEvent.click(screen.getByRole("button", { name: "Confirm Adjustment" }));

    await waitFor(() =>
      expect(InventoryClient.adjustStock).toHaveBeenCalledWith(
        expect.objectContaining({ type: "WASTAGE", quantity: -3 }),
      ),
    );
  });

  it("refuses a movement of nothing", async () => {
    open();

    await userEvent.type(screen.getByLabelText(/Quantity/), "0");
    await userEvent.click(screen.getByRole("button", { name: "Confirm Adjustment" }));

    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));
    expect(InventoryClient.adjustStock).not.toHaveBeenCalled();
  });

  it("offers only the movements a baker records by hand", () => {
    open();
    expect(screen.getByRole("option", { name: "Stock in" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Reserved for an order/ })).not.toBeInTheDocument();
  });
});
