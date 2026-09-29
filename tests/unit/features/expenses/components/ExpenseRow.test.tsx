import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RowList } from "@/components/ui/row";
import { CategoryTile, ExpenseRow, ExpenseTable } from "@/features/expenses/components/ExpenseRow";

import { anExpense } from "@tests/support/expenses";

describe("CategoryTile", () => {
  it("shows the category's picture, and the receipt until one is chosen", () => {
    const { container, rerender } = render(<CategoryTile iconKey="shopping-bags" />);
    expect(container.querySelector("img")?.getAttribute("src")).toMatch(/shopping-bags/);
    rerender(<CategoryTile iconKey={null} size="md" />);
    expect(container.querySelector("img")?.getAttribute("src")).toMatch(/default-expense/);
    expect(container.firstElementChild).toHaveStyle({ width: "48px" });
  });
});

describe("ExpenseRow", () => {
  it("says what it was for, its category, its day and what it cost, and opens it", async () => {
    const onOpen = vi.fn();
    const expense = anExpense();
    render(
      <RowList>
        <ExpenseRow expense={expense} iconKey={null} onOpen={onOpen} />
      </RowList>,
    );
    const row = screen.getByRole("button");
    expect(row).toHaveTextContent("Flour and sugarIngredients12 Sep 2026₹2,450");
    await userEvent.click(row);
    expect(onOpen).toHaveBeenCalledWith(expense);
  });
});

describe("ExpenseTable", () => {
  it("lists the expenses in columns, each opened from its description or anywhere on its row", async () => {
    const onOpen = vi.fn();
    const flour = anExpense();
    const boxes = anExpense({ id: "e-2", category: "Packaging", description: "Cake boxes", amount: 96000 });
    const iconOf = vi.fn(() => null);
    render(<ExpenseTable label="Sep 2026" expenses={[flour, boxes]} iconOf={iconOf} onOpen={onOpen} />);

    const table = screen.getByRole("table", { name: "Sep 2026" });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual(["Description", "Category", "Date", "Amount"]);
    expect(iconOf).toHaveBeenCalledWith("Packaging");
    const [, first, second] = within(table).getAllByRole("row");
    expect(first).toHaveTextContent("Flour and sugarIngredients12 Sep 2026₹2,450");

    await userEvent.click(within(table).getByRole("button", { name: "Edit Flour and sugar" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenLastCalledWith(flour);
    await userEvent.click(within(second).getByText("Packaging"));
    expect(onOpen).toHaveBeenCalledTimes(2);
    expect(onOpen).toHaveBeenLastCalledWith(boxes);
  });
});
