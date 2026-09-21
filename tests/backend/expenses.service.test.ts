/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { ExpensesService } from "../../src/modules/expenses/expenses.service";
import { ZodError } from "zod";

describe("ExpensesService", () => {
  it("enforces validation on createExpense", async () => {
    const mockRepo = {
      create: vi.fn(),
    };

    const service = new ExpensesService({} as any);
    (service as any).repository = mockRepo;

    // Test negative amount (should fail)
    await expect(
      service.createExpense("bakery-1", {
        category: "Ingredients",
        description: "Flour",
        amount: -500, // Invalid: must be positive
        expenseDate: "2026-09-21",
        paymentMethod: "CASH",
      })
    ).rejects.toThrow(ZodError);

    // Test invalid category (should fail)
    await expect(
      service.createExpense("bakery-1", {
        category: "InvalidCategory" as any,
        description: "Flour",
        amount: 500,
        expenseDate: "2026-09-21",
        paymentMethod: "CASH",
      })
    ).rejects.toThrow(ZodError);
    
    // Test valid payload
    mockRepo.create.mockResolvedValueOnce({
      id: "exp-1",
      category: "Ingredients",
      description: "Flour",
      amount: 500,
      expense_date: "2026-09-21",
      payment_method: "CASH",
      receipt_url: null,
      created_at: "2026-09-21T00:00:00Z",
      updated_at: "2026-09-21T00:00:00Z",
    });

    const expense = await service.createExpense("bakery-1", {
      category: "Ingredients",
      description: "Flour",
      amount: 500,
      expenseDate: "2026-09-21",
      paymentMethod: "CASH",
    });

    expect(expense.amount).toBe(500);
    expect(mockRepo.create).toHaveBeenCalledWith("bakery-1", {
      category: "Ingredients",
      description: "Flour",
      amount: 500,
      expense_date: "2026-09-21",
      payment_method: "CASH",
      receipt_url: null,
    });
  });
});
