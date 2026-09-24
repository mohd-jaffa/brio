import { describe, expect, it } from "vitest";

import { createExpenseSchema, expenseFormSchema } from "@/lib/validation/index";


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

  it("refuses a category the database would not accept", () => {
    expect(
      createExpenseSchema.safeParse({
        category: "Fireworks",
        description: "x",
        amount: 100,
        expenseDate: "2026-09-22",
        paymentMethod: "CASH",
      }).success,
    ).toBe(false);
  });
});
