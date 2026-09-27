import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { byMonth, ExpenseTransactions } from "@/features/expenses/components/ExpenseTransactions";
import { ApiError } from "@/lib/api/client";

import { anExpense } from "@tests/support/expenses";
import { Providers } from "@tests/support/providers";
import { choose } from "@tests/support/select";

const fetcher = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", async (original) => ({
  ...(await original<typeof import("@/lib/api/client")>()),
  fetcher,
}));

const september = anExpense();
const august = anExpense({ id: "e-3", category: "Rent", description: "Kitchen rent", expenseDate: "2026-08-30" });
let answers: Record<string, unknown>;

beforeEach(() => {
  answers = {
    "/api/expenses?range=LAST_30_DAYS": { items: [september, august], nextCursor: "20" },
    "/api/expenses?range=LAST_30_DAYS&cursor=20": { items: [], nextCursor: null },
  };
  fetcher.mockReset();
  fetcher.mockImplementation(async (key: string) => {
    const answer = answers[key];
    if (answer instanceof Error) throw answer;
    return answer;
  });
});

function open(props: Partial<Parameters<typeof ExpenseTransactions>[0]> = {}) {
  const all = {
    period: { range: "LAST_30_DAYS" },
    categories: ["Ingredients", "Rent", "Flowers"],
    category: undefined,
    onCategory: vi.fn(),
    iconOf: () => null,
    onOpen: vi.fn(),
    onAdd: vi.fn(),
    ...props,
  };
  render(<ExpenseTransactions {...all} />, { wrapper: Providers });
  return all;
}

describe("byMonth", () => {
  it("groups expenses by the month they fall in, keeping their order", () => {
    const groups = byMonth([september, anExpense({ id: "e-2", expenseDate: "2026-09-01" }), august]);
    expect(groups.map((group) => [group.month, group.expenses.map((expense) => expense.id)])).toEqual([
      ["Sep 2026", ["e-1", "e-2"]],
      ["Aug 2026", ["e-3"]],
    ]);
  });
});

describe("ExpenseTransactions", () => {
  it("lists the period's expenses by month, as rows and as a table, and opens one", async () => {
    const props = open();
    const sep = await screen.findByRole("region", { name: "Sep 2026" });
    expect(within(sep).getByRole("list", { name: "Sep 2026" })).toHaveTextContent("Flour and sugar");
    expect(within(sep).getByRole("table", { name: "Sep 2026" })).toHaveTextContent("Flour and sugar");
    expect(screen.getByRole("region", { name: "Aug 2026" })).toHaveTextContent("Kitchen rent");

    await userEvent.click(within(within(sep).getByRole("list")).getByRole("button"));
    expect(props.onOpen).toHaveBeenCalledWith(september);

    await userEvent.click(screen.getByRole("button", { name: "Show more" }));
    expect(fetcher).toHaveBeenCalledWith("/api/expenses?range=LAST_30_DAYS&cursor=20");
  });

  it("narrows to one category, and back to all", async () => {
    answers["/api/expenses?range=LAST_30_DAYS&category=Rent"] = { items: [august], nextCursor: null };
    const props = open({ category: "Rent" });
    expect(await screen.findByRole("region", { name: "Aug 2026" })).toHaveTextContent("Kitchen rent");
    expect(fetcher).toHaveBeenCalledWith("/api/expenses?range=LAST_30_DAYS&category=Rent");
    expect(screen.getByRole("combobox", { name: "Category" })).toHaveTextContent("Rent");

    // The business's own categories are there to filter by, beside the defaults.
    await choose("Category", "Flowers");
    expect(props.onCategory).toHaveBeenLastCalledWith("Flowers");
    await choose("Category", "All categories");
    expect(props.onCategory).toHaveBeenLastCalledWith(undefined);
  });

  it("says when a category had none in the period", async () => {
    answers["/api/expenses?range=LAST_30_DAYS&category=Rent"] = { items: [], nextCursor: null };
    open({ category: "Rent" });
    expect(await screen.findByText("No Rent expenses in this period.")).toBeInTheDocument();
  });

  it("invites the first expense when the period has none", async () => {
    answers["/api/expenses?range=LAST_30_DAYS"] = { items: [], nextCursor: null };
    const props = open();
    expect(await screen.findByText("No expenses in this period")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add expense" }));
    expect(props.onAdd).toHaveBeenCalledOnce();
  });

  it("waits while a custom period has no dates", () => {
    open({ period: null });
    expect(fetcher).not.toHaveBeenCalled();
    expect(document.querySelector("[aria-busy='true']")).not.toBeNull();
  });

  it("says when the expenses could not be loaded", async () => {
    answers["/api/expenses?range=LAST_30_DAYS"] = new ApiError(500, "INTERNAL_ERROR", "Something went wrong.");
    open();
    expect(await screen.findByText("Something went wrong.")).toBeInTheDocument();
  });
});
