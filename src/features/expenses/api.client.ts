import { fetcher } from "@/shared/api/client";
import { type CreateExpenseInput, type UpdateExpenseInput } from "@/lib/validation";

export const ExpensesClient = {
  async createExpense(payload: CreateExpenseInput): Promise<{ id: string }> {
    return fetcher<{ id: string }>("/api/expenses", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateExpense(id: string, payload: UpdateExpenseInput): Promise<void> {
    return fetcher(`/api/expenses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};
