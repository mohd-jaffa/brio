import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProductsClient } from "@/features/products/api.client";
import type { Product } from "@/features/products/types";
import { ProductFormSheet } from "@/features/products/components/ProductFormSheet";

import { Providers } from "@tests/support/providers";

vi.mock("@/features/products/api.client", () => ({
  ProductsClient: { createProduct: vi.fn(), updateProduct: vi.fn() },
}));

const cake: Product = {
  id: "p-1",
  name: "Chocolate Truffle Cake",
  description: "Rich dark chocolate",
  defaultPrice: 25000, // ₹250.00
  unit: "piece",
  isActive: true,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

function wrapper({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>;
}

function open(props: Partial<Parameters<typeof ProductFormSheet>[0]> = {}) {
  const all = { isOpen: true, onClose: vi.fn(), onSuccess: vi.fn(), ...props };
  render(<ProductFormSheet {...all} />, { wrapper });
  return all;
}

beforeEach(() => vi.clearAllMocks());

describe("ProductFormSheet", () => {
  it("is out of sight while it is closed", () => {
    const { container } = render(
      <ProductFormSheet isOpen={false} onClose={vi.fn()} onSuccess={vi.fn()} />,
      { wrapper },
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(container.querySelector("dialog")).not.toHaveAttribute("open");
  });

  it("shows a stored price in rupees, because that is how a baker thinks of it", () => {
    open({ initialData: cake });

    expect(screen.getByRole("heading", { name: "Edit Product" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Price/)).toHaveValue("250.00");
  });

  it("sends a typed price as whole paise", async () => {
    vi.mocked(ProductsClient.createProduct).mockResolvedValue(cake);
    open();

    await userEvent.type(screen.getByLabelText(/Product Name/), "Brownie");
    await userEvent.type(screen.getByLabelText(/Price/), "80.50");
    await userEvent.click(screen.getByRole("button", { name: "Save Product" }));

    await waitFor(() =>
      expect(ProductsClient.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Brownie", defaultPrice: 8050, unit: "piece", isActive: true }),
      ),
    );
  });

  it("refuses a price that is not an amount", async () => {
    open();

    await userEvent.type(screen.getByLabelText(/Product Name/), "Brownie");
    await userEvent.type(screen.getByLabelText(/Price/), "free");
    await userEvent.click(screen.getByRole("button", { name: "Save Product" }));

    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));
    expect(ProductsClient.createProduct).not.toHaveBeenCalled();
  });

  it("can take a product off the menu without deleting it", async () => {
    vi.mocked(ProductsClient.updateProduct).mockResolvedValue({ ...cake, isActive: false });
    open({ initialData: cake });

    await userEvent.click(screen.getByLabelText("Available for orders"));
    await userEvent.click(screen.getByRole("button", { name: "Save Product" }));

    await waitFor(() =>
      expect(ProductsClient.updateProduct).toHaveBeenCalledWith(
        "p-1",
        expect.objectContaining({ isActive: false }),
      ),
    );
  });

  it("offers only the units the app knows about", () => {
    open();
    expect(screen.getByRole("option", { name: "Kilogram (kg)" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Litre" })).not.toBeInTheDocument();
  });
});
