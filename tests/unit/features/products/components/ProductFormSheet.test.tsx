import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProductsClient } from "@/features/products/api.client";
import type { Product } from "@/features/products/types";
import { ProductFormSheet } from "@/features/products/components/ProductFormSheet";
import { ApiError } from "@/lib/api/client";

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
  const all = { isOpen: true, onClose: vi.fn(), ...props };
  render(<ProductFormSheet {...all} />, { wrapper });
  return all;
}

beforeEach(() => vi.clearAllMocks());

describe("ProductFormSheet", () => {
  it("is out of sight while it is closed", () => {
    const { container } = render(
      <ProductFormSheet isOpen={false} onClose={vi.fn()} />,
      { wrapper },
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(container.querySelector("dialog")).not.toHaveAttribute("open");
  });

  it("shows a stored price in rupees, because that is how a baker thinks of it", () => {
    open({ initialData: cake });

    expect(screen.getByRole("heading", { name: "Edit product" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Price \(₹\)/)).toHaveValue("250.00");
  });

  it("sends a typed price as whole paise", async () => {
    vi.mocked(ProductsClient.createProduct).mockResolvedValue(cake);
    open();

    await userEvent.type(screen.getByLabelText(/Product name/), "Brownie");
    await userEvent.type(screen.getByLabelText(/^Price \(₹\)/), "80.50");
    await userEvent.click(screen.getByRole("button", { name: "Save product" }));

    await waitFor(() =>
      expect(ProductsClient.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Brownie", defaultPrice: 8050, unit: "piece", isActive: true }),
      ),
    );
  });

  it("refuses a price that is not an amount", async () => {
    open();

    await userEvent.type(screen.getByLabelText(/Product name/), "Brownie");
    await userEvent.type(screen.getByLabelText(/^Price \(₹\)/), "free");
    await userEvent.click(screen.getByRole("button", { name: "Save product" }));

    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));
    expect(ProductsClient.createProduct).not.toHaveBeenCalled();
  });

  it("can take a product off the menu without deleting it", async () => {
    vi.mocked(ProductsClient.updateProduct).mockResolvedValue({ ...cake, isActive: false });
    open({ initialData: cake });

    await userEvent.click(screen.getByLabelText("On sale — shows on the order screen"));
    await userEvent.click(screen.getByRole("button", { name: "Save product" }));

    await waitFor(() =>
      expect(ProductsClient.updateProduct).toHaveBeenCalledWith(
        "p-1",
        expect.objectContaining({ isActive: false }),
      ),
    );
  });

  it("offers only the units the app knows about, neutral ones among them (Q8)", () => {
    open();
    expect(screen.getByRole("option", { name: "Kilogram (kg)" })).toBeInTheDocument();
    for (const unit of ["Set", "Bunch", "Pack"]) expect(screen.getByRole("option", { name: unit })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Litre" })).not.toBeInTheDocument();
  });

  it("starts from what a product has, and from a piece when its unit is one the form no longer offers", () => {
    open({ initialData: { ...cake, description: undefined, unit: "litre" } });
    expect(screen.getByLabelText(/Description/)).toHaveValue("");
    expect(screen.getByLabelText(/Unit/)).toHaveValue("piece");
  });

  it("keeps the sheet open, and says why, when a product is refused", async () => {
    vi.mocked(ProductsClient.createProduct).mockRejectedValue(new ApiError(409, "CONFLICT", "That was changed elsewhere."));
    const props = open();
    await userEvent.type(screen.getByLabelText(/Product name/), "Brownie");
    await userEvent.type(screen.getByLabelText(/^Price \(₹\)/), "80");
    await userEvent.click(screen.getByRole("button", { name: "Save product" }));
    expect((await screen.findAllByText("Product not saved"))[0]).toBeInTheDocument();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("closes once a product is saved, and says so", async () => {
    vi.mocked(ProductsClient.createProduct).mockResolvedValue(cake);
    const props = open();
    await userEvent.type(screen.getByLabelText(/Product name/), "Brownie");
    await userEvent.type(screen.getByLabelText(/^Price \(₹\)/), "80");
    await userEvent.click(screen.getByRole("button", { name: "Save product" }));
    await waitFor(() => expect(props.onClose).toHaveBeenCalledOnce());
    expect(await screen.findAllByText("Product saved")).not.toHaveLength(0);
  });
});

describe("ProductFormSheet: the picture (§139.11.10)", () => {
  it("starts a new product on the price tag, and saves the one chosen from the picker", async () => {
    vi.mocked(ProductsClient.createProduct).mockResolvedValue(cake);
    open();
    await userEvent.click(screen.getByRole("button", { name: "Picture: Price tag. Change" }));
    const picker = screen.getByRole("dialog", { name: "Choose a picture" });
    expect(within(picker).getByRole("radio", { name: "Price tag" })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(within(picker).getByRole("radio", { name: "Rose bouquet" }));

    expect(screen.getByRole("button", { name: "Picture: Rose bouquet. Change" })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Product name/), "Bouquet");
    await userEvent.type(screen.getByLabelText(/^Price \(₹\)/), "900");
    await userEvent.click(screen.getByRole("button", { name: "Save product" }));
    await waitFor(() =>
      expect(ProductsClient.createProduct).toHaveBeenCalledWith(expect.objectContaining({ iconKey: "rose-bouquet" })),
    );
  });

  it("shows a product's own picture, and one the library no longer has as the price tag", () => {
    const { unmount } = render(<ProductFormSheet isOpen onClose={vi.fn()} initialData={{ ...cake, iconKey: "cupcake" }} />, {
      wrapper,
    });
    expect(screen.getByRole("button", { name: "Picture: Cupcake. Change" })).toBeInTheDocument();
    unmount();
    open({ initialData: { ...cake, iconKey: "retired-key" } });
    expect(screen.getByRole("button", { name: "Picture: Price tag. Change" })).toBeInTheDocument();
  });
});
