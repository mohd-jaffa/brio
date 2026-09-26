import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ExpensesClient } from "@/features/expenses/api.client";
import { ExpenseCategorySheet } from "@/features/expenses/components/ExpenseCategorySheet";
import type { ExpenseCategoryItem } from "@/features/expenses/types";
import { ApiError } from "@/lib/api/client";

import { Providers } from "@tests/support/providers";

vi.mock("@/features/expenses/api.client", () => ({ ExpensesClient: { createCategory: vi.fn(), updateCategory: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

function open(category?: ExpenseCategoryItem) {
  const props = { isOpen: true, onClose: vi.fn(), onSaved: vi.fn(), category };
  render(<ExpenseCategorySheet {...props} />, { wrapper: Providers });
  return props;
}

const nameField = () => screen.getByLabelText(/Category name/);

describe("ExpenseCategorySheet: a new category", () => {
  it("adds one of the business's own with the picture chosen, and says so", async () => {
    const flowers = { category: "Flowers", iconKey: "rose-bunch" as const, custom: true };
    vi.mocked(ExpensesClient.createCategory).mockResolvedValue(flowers);
    const props = open();
    expect(screen.getByRole("heading", { name: "New category" })).toBeInTheDocument();
    expect(screen.getByText("It sits beside the eight every business has, and only you see it.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Picture: Receipt. Change" }));
    await userEvent.click(within(screen.getByRole("dialog", { name: "Choose a picture" })).getByRole("radio", { name: "Bunch of roses" }));
    await userEvent.type(nameField(), "  Flowers ");
    await userEvent.click(screen.getByRole("button", { name: "Add category" }));

    await waitFor(() =>
      expect(ExpensesClient.createCategory).toHaveBeenCalledWith({ name: "Flowers", iconKey: "rose-bunch" }),
    );
    await waitFor(() => expect(props.onClose).toHaveBeenCalledOnce());
    expect(props.onSaved).toHaveBeenCalledWith(flowers);
    expect((await screen.findAllByText("Category added"))[0]).toBeInTheDocument();
  });

  it("refuses one of the eight before asking", async () => {
    open();
    await userEvent.type(nameField(), "rent");
    await userEvent.click(screen.getByRole("button", { name: "Add category" }));
    expect(await screen.findByText("Every business already has that category.")).toBeInTheDocument();
    expect(ExpensesClient.createCategory).not.toHaveBeenCalled();
  });

  it("keeps the sheet open, and says why, when the name is already taken", async () => {
    vi.mocked(ExpensesClient.createCategory).mockRejectedValue(
      new ApiError(409, "EXPENSE_CATEGORY_ALREADY_EXISTS", "You already have a category with this name."),
    );
    const props = open();
    await userEvent.type(nameField(), "Flowers");
    await userEvent.click(screen.getByRole("button", { name: "Add category" }));
    expect((await screen.findAllByText("Category not added"))[0]).toBeInTheDocument();
    expect(props.onClose).not.toHaveBeenCalled();
  });
});

describe("ExpenseCategorySheet: one of the business's own", () => {
  const flowers: ExpenseCategoryItem = { category: "Flowers", iconKey: "rose-bunch", custom: true };

  it("starts from its name and picture, and renames it", async () => {
    vi.mocked(ExpensesClient.updateCategory).mockResolvedValue({ ...flowers, category: "Blooms" });
    const props = open(flowers);
    expect(screen.getByRole("heading", { name: "Edit Flowers" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Picture: Bunch of roses. Change" })).toBeInTheDocument();
    expect(nameField()).toHaveValue("Flowers");

    await userEvent.clear(nameField());
    await userEvent.type(nameField(), "Blooms");
    await userEvent.click(screen.getByRole("button", { name: "Save category" }));
    await waitFor(() =>
      expect(ExpensesClient.updateCategory).toHaveBeenCalledWith("Flowers", { name: "Blooms", iconKey: "rose-bunch" }),
    );
    expect((await screen.findAllByText("Category saved"))[0]).toBeInTheDocument();
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it("says when a change was refused", async () => {
    vi.mocked(ExpensesClient.updateCategory).mockRejectedValue(new ApiError(500, "SAVE_FAILED", "Could not save."));
    open(flowers);
    await userEvent.click(screen.getByRole("button", { name: "Save category" }));
    expect((await screen.findAllByText("Category not saved"))[0]).toBeInTheDocument();
  });
});
