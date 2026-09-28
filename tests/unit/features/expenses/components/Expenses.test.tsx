import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Expenses } from "@/features/expenses/components/Expenses";
import type { Expense } from "@/features/expenses/types";
import { ApiError } from "@/lib/api/client";

import { sizeCharts } from "@tests/support/charts";
import { anExpense, aSummary } from "@tests/support/expenses";
import { Providers } from "@tests/support/providers";
import { choose } from "@tests/support/select";
import { pickDate } from "@tests/support/date";

const fetcher = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  fetcher,
}));
// The form has its own tests; here it only has to open on the right expense.
vi.mock("@/features/expenses/components/ExpenseFormSheet", () => ({
  ExpenseFormSheet: ({ isOpen, initialData }: { isOpen: boolean; initialData?: Expense }) =>
    isOpen ? <div role="dialog" aria-label={initialData ? `Edit ${initialData.description}` : "New expense"} /> : null,
}));

let answers: Record<string, unknown>;

beforeEach(() => {
  sizeCharts();
  answers = {
    "/api/expense-categories": [
      { category: "Packaging", iconKey: null, custom: false },
      { category: "Flowers", iconKey: "rose-bunch", custom: true },
    ],
    "/api/expenses/summary?range=LAST_30_DAYS": aSummary(),
    "/api/expenses?range=LAST_30_DAYS": { items: [anExpense()], nextCursor: null },
    "/api/expenses?range=LAST_30_DAYS&category=Packaging": {
      items: [anExpense({ id: "e-2", category: "Packaging", description: "Cake boxes" })],
      nextCursor: null,
    },
  };
  fetcher.mockReset();
  fetcher.mockImplementation(async (key: string) => {
    const answer = answers[key];
    if (answer instanceof Error) throw answer;
    return answer;
  });
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

const open = () => render(<Expenses />, { wrapper: Providers });

describe("Expenses", () => {
  it("opens on the overview for the period, with the band and the tabs", async () => {
    open();
    expect(screen.getByRole("heading", { level: 1, name: "Expenses" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Loading expenses" })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Expenses views" })).toBeInTheDocument();
    expect(await screen.findByText("Daily average")).toBeInTheDocument();
    expect(screen.getByText("Know your costs,")).toBeInTheDocument();
  });

  it("reads another period, remembers it, and groups the trend as asked", async () => {
    open();
    await screen.findByText("Daily average");
    answers["/api/expenses/summary?range=THIS_MONTH"] = aSummary();
    await choose("Period", "This month");
    expect(fetcher).toHaveBeenCalledWith("/api/expenses/summary?range=THIS_MONTH");
    expect(JSON.parse(localStorage.getItem("brio_range_expenses")!)).toEqual({ preset: "THIS_MONTH" });

    answers["/api/expenses/summary?range=THIS_MONTH&interval=WEEK"] = aSummary({ interval: "WEEK" });
    await screen.findByRole("combobox", { name: "Group by" });
    await choose("Group by", "Weekly");
    expect(fetcher).toHaveBeenCalledWith("/api/expenses/summary?range=THIS_MONTH&interval=WEEK");
  });

  it("waits for both dates of a custom period before asking", async () => {
    open();
    await screen.findByText("Daily average");
    await choose("Period", "Custom");
    expect(screen.getByRole("status", { name: "Loading expenses" })).toBeInTheDocument();

    answers["/api/expenses/summary?range=CUSTOM&from=2026-09-01&to=2026-09-02"] = aSummary();
    await pickDate("From", "2026-09-01");
    await pickDate("To", "2026-09-02");
    expect(await screen.findByText("Daily average")).toBeInTheDocument();
  });

  it("records the first expense of a period from Transactions", async () => {
    answers["/api/expenses?range=LAST_30_DAYS"] = { items: [], nextCursor: null };
    open();
    await userEvent.click(screen.getByRole("tab", { name: "Transactions" }));
    expect(await screen.findByText("No expenses in this period")).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: "Add expense" }).at(-1)!);
    expect(await screen.findByRole("dialog", { name: "New expense" })).toBeInTheDocument();
  });

  it("goes from the latest expenses to every one, and opens one to edit", async () => {
    open();
    await userEvent.click(await screen.findByRole("button", { name: "View all expenses" }));
    expect(screen.getByRole("tab", { name: "Transactions" })).toHaveAttribute("aria-selected", "true");
    const month = await screen.findByRole("list", { name: "Sep 2026" });
    await userEvent.click(within(month).getByRole("button", { name: /Flour and sugar/ }));
    expect(screen.getByRole("dialog", { name: "Edit Flour and sugar" })).toBeInTheDocument();
  });

  it("goes from a category to its transactions", async () => {
    open();
    await screen.findByText("Daily average");
    await userEvent.click(screen.getByRole("tab", { name: "Categories" }));
    const categories = screen.getByRole("list", { name: "Categories" });
    // The business's own categories show the picture it chose.
    expect(within(categories).getByRole("button", { name: "Change the picture for Flowers" }).querySelector("img")?.getAttribute("src")).toMatch(
      /rose-bunch/,
    );
    await userEvent.click(within(categories).getByRole("button", { name: /^Packaging/ }));
    expect(screen.getByRole("tab", { name: "Transactions" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("combobox", { name: "Category" })).toHaveTextContent("Packaging");
    expect(await screen.findByRole("list", { name: "Sep 2026" })).toHaveTextContent("Cake boxes");
  });

  it("records a new expense from +", async () => {
    open();
    await userEvent.click(screen.getAllByRole("button", { name: "Add expense" })[0]);
    expect(screen.getByRole("dialog", { name: "New expense" })).toBeInTheDocument();
  });

  it("says when the expenses could not be loaded", async () => {
    answers["/api/expenses/summary?range=LAST_30_DAYS"] = new ApiError(500, "INTERNAL_ERROR", "Something went wrong.");
    open();
    expect(await screen.findByText("Something went wrong.")).toBeInTheDocument();
  });
});
