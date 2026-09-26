import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_MAX_ROWS, PAGE_SIZE } from "@/constants/limits";
import {
  createExpense,
  deleteExpense,
  getExpenseById,
  getExpenseSummary,
  listExpenses,
  updateExpense,
} from "@/features/expenses/api";
import { AppError } from "@/lib/errors/AppError";
import { fakeSupabase } from "@tests/support/supabase";
import { tenantOf } from "@tests/support/tenant";

const logActionSafe = vi.fn();
vi.mock("@/lib/audit/auditLog", () => ({ logActionSafe: (...args: unknown[]) => logActionSafe(...args) }));

beforeEach(() => logActionSafe.mockReset());

const now = new Date("2026-09-26T06:00:00Z");

const aRow = (id: string, expense_date: string, amount = 1000) => ({
  id,
  bakery_id: "b-1",
  category: "Packaging",
  description: "Cake boxes",
  amount,
  expense_date,
  payment_method: "UPI",
  receipt_url: null,
  created_at: `${expense_date}T05:00:00Z`,
  updated_at: `${expense_date}T05:00:00Z`,
});

describe("listExpenses", () => {
  it("reads a page of the period's expenses, newest day first", async () => {
    const fake = fakeSupabase(() => ({ data: [aRow("e-1", "2026-09-25")] }));
    const page = await listExpenses(tenantOf(fake.client), { range: "LAST_7_DAYS" }, now);

    expect(page).toEqual({
      items: [expect.objectContaining({ id: "e-1", category: "Packaging", amount: 1000, expenseDate: "2026-09-25" })],
      nextCursor: null,
    });
    const [query] = fake.queries;
    expect(query.table).toBe("expenses");
    expect(fake.argsOf(query, "eq")).toEqual([["bakery_id", "b-1"]]);
    expect(fake.argsOf(query, "gte")).toEqual([["expense_date", "2026-09-20"]]);
    expect(fake.argsOf(query, "lte")).toEqual([["expense_date", "2026-09-26"]]);
    expect(fake.argsOf(query, "order")).toEqual([
      ["expense_date", { ascending: false }],
      ["created_at", { ascending: false }],
      ["id", { ascending: true }],
    ]);
    expect(fake.argsOf(query, "range")).toEqual([[0, PAGE_SIZE]]);
  });

  it("narrows to one category, and says where the next page starts", async () => {
    const rows = Array.from({ length: PAGE_SIZE + 1 }, (_, index) => aRow(`e-${index}`, "2026-09-25"));
    const fake = fakeSupabase(() => ({ data: rows }));
    const page = await listExpenses(
      tenantOf(fake.client),
      { range: "CUSTOM", from: "2026-09-01", to: "2026-09-10", category: "Rent", cursor: PAGE_SIZE },
    );
    expect(page.items).toHaveLength(PAGE_SIZE);
    expect(page.nextCursor).toBe(String(PAGE_SIZE * 2));
    const [query] = fake.queries;
    expect(fake.argsOf(query, "eq")).toEqual([["bakery_id", "b-1"], ["category", "Rent"]]);
    expect(fake.argsOf(query, "gte")).toEqual([["expense_date", "2026-09-01"]]);
    expect(fake.argsOf(query, "range")).toEqual([[PAGE_SIZE, PAGE_SIZE * 2]]);
  });

  it("reads nothing as an empty page, and a failure in the app's own words", async () => {
    const empty = await listExpenses(tenantOf(fakeSupabase(() => ({ data: null })).client), { range: "LAST_7_DAYS" }, now);
    expect(empty).toEqual({ items: [], nextCursor: null });
    const failing = fakeSupabase(() => ({ error: { message: "boom", code: "XX000" } }));
    await expect(listExpenses(tenantOf(failing.client), { range: "LAST_7_DAYS" }, now)).rejects.toBeInstanceOf(AppError);
  });
});

describe("getExpenseSummary", () => {
  it("reads the period and the one before a window at a time, and sums them on the server", async () => {
    const fake = fakeSupabase((query) =>
      query.table === "expense_categories"
        ? { data: [{ name: "Flowers" }] }
        : { data: [aRow("now", "2026-09-22", 7000), aRow("before", "2026-09-15", 3500)] },
    );
    const summary = await getExpenseSummary(tenantOf(fake.client), { range: "LAST_7_DAYS" }, now);

    expect(summary.period).toEqual({ from: "2026-09-20", to: "2026-09-26" });
    expect(summary.previous).toEqual({ from: "2026-09-13", to: "2026-09-19" });
    expect(summary.interval).toBe("DAY");
    expect(summary.total).toEqual({ value: 7000, previous: 3500 });
    expect(summary.recent.map((expense) => expense.id)).toEqual(["now"]);
    // The business's own categories are summed beside the eight.
    expect(summary.byCategory.map((category) => category.category)).toContain("Flowers");
    expect(summary.byCategory).toHaveLength(9);

    const query = fake.queries.find((recorded) => recorded.table === "expenses")!;
    expect(fake.argsOf(query, "eq")).toEqual([["bakery_id", "b-1"]]);
    expect(fake.argsOf(query, "gte")).toEqual([["expense_date", "2026-09-13"]]);
    expect(fake.argsOf(query, "lte")).toEqual([["expense_date", "2026-09-26"]]);
    expect(fake.argsOf(query, "order")).toEqual([["id", { ascending: true }]]);
    expect(fake.argsOf(query, "range")).toEqual([[0, API_MAX_ROWS - 1]]);
  });

  it("groups by the interval asked for", async () => {
    const fake = fakeSupabase(() => ({ data: [] }));
    const summary = await getExpenseSummary(tenantOf(fake.client), { range: "THIS_MONTH", interval: "WEEK" });
    expect(summary.interval).toBe("WEEK");
  });
});

describe("one expense", () => {
  it("reads, records, changes and removes an expense of the caller's business, each change audited", async () => {
    const fake = fakeSupabase(() => ({ data: aRow("e-1", "2026-09-25") }));
    const tenant = tenantOf(fake.client);

    expect(await getExpenseById(tenant, "e-1")).toMatchObject({ id: "e-1", category: "Packaging" });
    await createExpense(tenant, {
      category: "Flowers",
      description: "Roses",
      amount: 45000,
      expenseDate: "2026-09-25",
      paymentMethod: "UPI",
      receiptUrl: null,
    });
    const insert = fake.queries.find((query) => fake.argsOf(query, "insert").length > 0)!;
    expect(fake.argsOf(insert, "insert")[0][0]).toMatchObject({ bakery_id: "b-1", category: "Flowers", expense_date: "2026-09-25" });

    await updateExpense(tenant, "e-1", { amount: 50000 });
    const update = fake.queries.find((query) => fake.argsOf(query, "update").length > 0)!;
    expect(fake.argsOf(update, "update")).toEqual([[{ amount: 50000 }]]);

    await deleteExpense(tenant, "e-1");
    expect(fake.queries.some((query) => fake.argsOf(query, "delete").length > 0)).toBe(true);
    expect(logActionSafe.mock.calls.map(([, entry]) => entry.action)).toEqual(["CREATE", "UPDATE", "DELETE"]);
  });
});
