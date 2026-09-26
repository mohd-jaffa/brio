import { describe, expect, it } from "vitest";

import {
  createExpenseSchema,
  expenseCategoryFormSchema,
  expenseFormSchema,
  expenseListQuerySchema,
} from "@/lib/validation/index";

describe("expense", () => {
  it("the form takes rupees and hands over paise", () => {
    const parsed = expenseFormSchema.parse({
      category: "Ingredients",
      description: "Flour",
      amount: "250",
      expenseDate: "2026-09-22",
      paymentMethod: "CASH",
    });
    expect(parsed.amount).toBe(25000);
  });

  it("takes any category by name, since the database knows which the business has, but not a blank one", () => {
    const expense = { description: "x", amount: 100, expenseDate: "2026-09-22", paymentMethod: "CASH" };
    expect(createExpenseSchema.parse({ ...expense, category: "  Flowers " }).category).toBe("Flowers");
    expect(createExpenseSchema.safeParse({ ...expense, category: "x".repeat(41) }).success).toBe(false);
    expect(
      createExpenseSchema.safeParse({
        category: "   ",
        description: "x",
        amount: 100,
        expenseDate: "2026-09-22",
        paymentMethod: "CASH",
      }).success,
    ).toBe(false);
  });

  it("reads the Transactions tab's query: a period, a category and where the page starts", () => {
    expect(expenseListQuerySchema.parse({})).toEqual({ range: "LAST_30_DAYS" });
    expect(expenseListQuerySchema.parse({ range: "LAST_7_DAYS", category: "Rent", cursor: "20" })).toEqual({
      range: "LAST_7_DAYS",
      category: "Rent",
      cursor: 20,
    });
    // Any of the business's categories, its own too; a name no category could have is refused.
    expect(expenseListQuerySchema.parse({ category: "Flowers" }).category).toBe("Flowers");
    expect(expenseListQuerySchema.safeParse({ category: "x".repeat(41) }).success).toBe(false);
    expect(expenseListQuerySchema.safeParse({ range: "CUSTOM", from: "2026-09-01" }).success).toBe(false);
  });

  it("names a category of the business's own, never one of the eight", () => {
    expect(expenseCategoryFormSchema.parse({ name: "  Flowers  " })).toEqual({ name: "Flowers", iconKey: null });
    const refused = expenseCategoryFormSchema.safeParse({ name: "rent" });
    expect(refused.success).toBe(false);
    expect(refused.error?.issues[0].message).toBe("Every business already has that category.");
    expect(expenseCategoryFormSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("takes a picture from the library, or none for the default", () => {
    const named = { name: "Flowers" };
    expect(expenseCategoryFormSchema.parse({ ...named, iconKey: "shopping-bags" }).iconKey).toBe("shopping-bags");
    expect(expenseCategoryFormSchema.parse({ ...named, iconKey: null }).iconKey).toBeNull();
    expect(expenseCategoryFormSchema.safeParse({ ...named, iconKey: "not-in-the-library" }).success).toBe(false);
  });
});
