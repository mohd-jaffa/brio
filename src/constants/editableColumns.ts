/**
 * The columns the app may UPDATE directly on tables.
 * These updates are built from these lists with pickColumns() — never from
 * a row read back or a form's whole state.
 */
export const EDITABLE_COLUMNS = {
  customers: ["name", "phone", "email", "address", "google_maps_link", "notes"],
  products: ["name", "description", "default_price", "unit", "icon_key", "is_active"],
  expenses: ["category", "description", "amount", "expense_date", "payment_method", "receipt_url"],
} as const;

export type EditableColumn<T extends keyof typeof EDITABLE_COLUMNS> = (typeof EDITABLE_COLUMNS)[T][number];
