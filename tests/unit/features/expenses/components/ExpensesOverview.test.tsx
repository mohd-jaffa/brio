import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ExpensesOverview } from "@/features/expenses/components/ExpensesOverview";
import type { ExpenseSummary } from "@/features/expenses/types";

import { sizeCharts } from "@tests/support/charts";
import { aSummary } from "@tests/support/expenses";
import { choose } from "@tests/support/select";

beforeEach(() => sizeCharts());
afterEach(() => vi.restoreAllMocks());

function open(summary: ExpenseSummary = aSummary()) {
  const props = {
    summary,
    iconOf: vi.fn((category: string) => (category === "Packaging" ? "shopping-bags" : null)),
    onInterval: vi.fn(),
    onOpen: vi.fn(),
    onViewAll: vi.fn(),
  };
  render(<ExpensesOverview {...props} />);
  return props;
}

describe("ExpensesOverview", () => {
  it("shows the total and the daily average, a cost that rose read as bad news", () => {
    open();
    const total = screen.getByText("Total expenses", { selector: "dt" }).parentElement!;
    expect(total).toHaveTextContent("₹4,000");
    expect(total).toHaveTextContent("Up 25%");
    expect(within(total).getByText("25%").closest("[class*='text-']")?.className).toMatch(/danger|rose/);
    const average = screen.getByText("Daily average").parentElement!;
    expect(average).toHaveTextContent("₹2,000");
    expect(average).toHaveTextContent("Down 20%");
  });

  it("rolls each figure the way it moved when the expenses change", () => {
    const props = { iconOf: () => null, onInterval: vi.fn(), onOpen: vi.fn(), onViewAll: vi.fn() };
    const { rerender } = render(<ExpensesOverview {...props} summary={aSummary()} />);
    const total = screen.getByText("Total expenses", { selector: "dt" }).parentElement!;
    const average = screen.getByText("Daily average").parentElement!;
    expect(within(total).getByText("₹4,000")).not.toHaveClass("animate-tick-up");

    rerender(
      <ExpensesOverview
        {...props}
        summary={aSummary({ total: { value: 520000, previous: 320000 }, dailyAverage: { value: 90000, previous: 0 } })}
      />,
    );
    expect(within(total).getByText("₹5,200")).toHaveClass("animate-tick-up");
    expect(within(average).getByText("₹900")).toHaveClass("animate-tick-down");
  });

  it("leaves the change out when there was nothing before", () => {
    open(aSummary({ total: { value: 400000, previous: 0 } }));
    expect(screen.getByText("Total expenses", { selector: "dt" }).parentElement).not.toHaveTextContent("%");
  });

  it("rings the categories, draws the trend, and changes how it is grouped", async () => {
    const props = open();
    expect(screen.getByRole("img", { name: "Ingredients came to ₹3,000 of ₹4,000." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Expense trend" })).toBeInTheDocument();
    await choose("Group by", "Weekly");
    expect(props.onInterval).toHaveBeenCalledWith("WEEK");
  });

  it("lists the latest expenses with their categories' pictures, and opens one or all", async () => {
    const props = open();
    const recent = screen.getByRole("region", { name: "Recent expenses" });
    // Rows on a phone, and the same expenses as a table on a desktop.
    expect(within(recent).getByRole("table", { name: "Recent expenses" })).toHaveTextContent("Cake boxes");
    const boxes = within(within(recent).getByRole("list", { name: "Recent expenses" })).getByRole("button", {
      name: /Cake boxes/,
    });
    expect(boxes.querySelector("img")?.getAttribute("src")).toMatch(/shopping-bags/);
    await userEvent.click(boxes);
    expect(props.onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: "e-2" }));
    await userEvent.click(within(recent).getByRole("button", { name: "View all expenses" }));
    expect(props.onViewAll).toHaveBeenCalledOnce();
  });

  it("says so when nothing was spent", () => {
    open(
      aSummary({
        total: { value: 0, previous: 0 },
        byCategory: aSummary().byCategory.map((category) => ({ ...category, total: 0, count: 0 })),
        trend: [{ start: "2026-09-01", value: 0 }],
        recent: [],
      }),
    );
    expect(
      within(screen.getByRole("region", { name: "Recent expenses" })).getByText("No expenses in this period."),
    ).toBeInTheDocument();
    expect(screen.getByRole("figure", { name: "Expenses by category" })).toHaveTextContent(
      "No expenses in this period.",
    );
  });
});
