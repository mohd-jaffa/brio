export type ExpenseCategory = 
  | 'Ingredients' 
  | 'Packaging' 
  | 'Delivery' 
  | 'Equipment' 
  | 'Utilities' 
  | 'Marketing' 
  | 'Rent' 
  | 'Other';

export type PaymentMethod = 
  | 'CASH' 
  | 'UPI' 
  | 'BANK_TRANSFER' 
  | 'CARD' 
  | 'OTHER';

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
  amount: number;
  expenseDate: string;
  paymentMethod: PaymentMethod;
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
}
