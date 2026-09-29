import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ExpensesClient } from "@/features/expenses/api.client";
import { ExpenseCategories } from "@/features/expenses/components/ExpenseCategories";
import type { ExpenseCategoryItem } from "@/features/expenses/types";
import { ApiError } from "@/lib/api/client";

import { aSummary } from "@tests/support/expenses";
import { Providers } from "@tests/support/providers";

vi.mock("@/features/expenses/api.client", () => ({
  ExpensesClient: { setCategoryIcon: vi.fn(), deleteCategory: vi.fn() },
}));
// The sheet has its own tests; here it only has to open on the right category.
vi.mock("@/features/expenses/components/ExpenseCategorySheet", () => ({
  ExpenseCategorySheet: ({ isOpen, category }: { isOpen: boolean; category?: ExpenseCategoryItem }) =>
    isOpen ? (
      <div role="dialog" aria-label={category ? `Edit ${category.category} (${category.iconKey})` : "New category"} />
    ) : null,
}));

beforeEach(() => vi.clearAllMocks());

function open() {
  const onOpenCategory = vi.fn();
  const iconOf = (category: string) => (category === "Flowers" ? ("rose-bunch" as const) : null);
  render(<ExpenseCategories summary={aSummary()} iconOf={iconOf} onOpenCategory={onOpenCategory} />, {
    wrapper: Providers,
  });
  return { onOpenCategory };
}

const actionsFor = async (name: string) => {
  await userEvent.click(screen.getByRole("button", { name: new RegExp(`^${name}`) }));
  return screen.getByRole("dialog", { name });
};

describe("ExpenseCategories", () => {
  it("lists the eight and the business's own, each with its total, its count and its share", () => {
    open();
    const rows = within(screen.getByRole("list", { name: "Categories" })).getAllByRole("listitem");
    expect(rows).toHaveLength(9);
    expect(rows[0]).toHaveTextContent("Ingredients3 expenses · 75%₹3,000");
    expect(rows[1]).toHaveTextContent("Packaging1 expense · 25%₹1,000");
    expect(rows[2]).toHaveTextContent("Delivery0 expenses · 0%₹0");
    expect(rows[8]).toHaveTextContent("Flowers0 expenses · 0%₹0");
  });

  it("keeps the eight as they are: no picture to change, and a tap opens their expenses", async () => {
    const { onOpenCategory } = open();
    expect(screen.queryByRole("button", { name: "Change the picture for Packaging" })).not.toBeInTheDocument();
    expect(
      screen
        .getByRole("button", { name: /^Packaging/ })
        .querySelector("img")
        ?.getAttribute("src"),
    ).toMatch(/default-expense/);
    await userEvent.click(screen.getByRole("button", { name: /^Packaging/ }));
    expect(onOpenCategory).toHaveBeenCalledWith("Packaging");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("changes one of the business's own pictures from the library, and says so", async () => {
    vi.mocked(ExpensesClient.setCategoryIcon).mockResolvedValue({
      category: "Flowers",
      iconKey: "gift-box",
      custom: true,
    });
    open();
    await userEvent.click(screen.getByRole("button", { name: "Change the picture for Flowers" }));
    const picker = screen.getByRole("dialog", { name: "Choose a picture" });
    expect(within(picker).getByRole("radio", { name: "Bunch of roses" })).toHaveAttribute("aria-checked", "true");

    await userEvent.click(within(picker).getByRole("radio", { name: "Gift box" }));
    expect(ExpensesClient.setCategoryIcon).toHaveBeenCalledWith("Flowers", "gift-box");
    expect((await screen.findAllByText("Picture changed"))[0]).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Choose a picture" })).not.toBeInTheDocument());
  });

  it("says when a picture was not changed, and closes the picker untouched", async () => {
    vi.mocked(ExpensesClient.setCategoryIcon).mockRejectedValue(new ApiError(500, "SAVE_FAILED", "Could not save."));
    open();
    await userEvent.click(screen.getByRole("button", { name: "Change the picture for Flowers" }));
    await userEvent.click(
      within(screen.getByRole("dialog", { name: "Choose a picture" })).getByRole("radio", { name: "Donut" }),
    );
    expect((await screen.findAllByText("Picture not changed"))[0]).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Change the picture for Flowers" }));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Choose a picture" })).not.toBeInTheDocument());
    expect(ExpensesClient.setCategoryIcon).toHaveBeenCalledOnce();
  });

  it("offers one of the business's own its expenses, and editing its name and picture", async () => {
    const { onOpenCategory } = open();
    await userEvent.click(within(await actionsFor("Flowers")).getByRole("button", { name: "See its expenses" }));
    expect(onOpenCategory).toHaveBeenCalledWith("Flowers");

    await userEvent.click(within(await actionsFor("Flowers")).getByRole("button", { name: "Edit name and picture" }));
    expect(await screen.findByRole("dialog", { name: "Edit Flowers (rose-bunch)" })).toBeInTheDocument();
  });

  it("deletes one of the business's own once it is confirmed", async () => {
    vi.mocked(ExpensesClient.deleteCategory).mockResolvedValue({ deleted: true });
    open();
    await userEvent.click(within(await actionsFor("Flowers")).getByRole("button", { name: "Delete category" }));
    const confirm = await screen.findByRole("alertdialog", { name: "Delete Flowers?" });
    expect(confirm).toHaveTextContent("Only a category with no expenses can be deleted.");
    await userEvent.click(within(confirm).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(ExpensesClient.deleteCategory).toHaveBeenCalledWith("Flowers"));
    expect((await screen.findAllByText("Category deleted"))[0]).toBeInTheDocument();
  });

  it("deletes nothing when the owner thinks better of it, and says why when the server refuses", async () => {
    vi.mocked(ExpensesClient.deleteCategory).mockRejectedValue(
      new ApiError(422, "EXPENSE_CATEGORY_IN_USE", "This category has expenses, so it cannot be deleted."),
    );
    open();
    await userEvent.click(within(await actionsFor("Flowers")).getByRole("button", { name: "Delete category" }));
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Cancel" }));
    expect(ExpensesClient.deleteCategory).not.toHaveBeenCalled();

    await userEvent.click(within(await actionsFor("Flowers")).getByRole("button", { name: "Delete category" }));
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Delete" }));
    expect((await screen.findAllByText("Category not deleted"))[0]).toBeInTheDocument();
    expect(screen.getAllByText("This category has expenses, so it cannot be deleted.")[0]).toBeInTheDocument();
  });

  it("adds a category of the business's own from New category", async () => {
    open();
    await userEvent.click(screen.getByRole("button", { name: "New category" }));
    expect(screen.getByRole("dialog", { name: "New category" })).toBeInTheDocument();
  });
});
