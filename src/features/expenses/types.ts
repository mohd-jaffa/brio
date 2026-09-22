import type { ExpenseCategory, PaymentMethod } from "@/constants/statuses";

export type { ExpenseCategory, PaymentMethod };

export interface ExpenseRow {
  id: string;
  bakery_id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  expense_date: string;
  payment_method: PaymentMethod;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  /** Whole paise — never a float (AGENTS.md §13). */
  amount: number;
  expenseDate: string;
  paymentMethod: PaymentMethod;
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
}
