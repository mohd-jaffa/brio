/**
 * The vocabularies the app and the database share. Each list is written to
 * match the CHECK constraint on its column (supabase/migrations), so a value
 * the app offers is a value the database accepts. Nothing states one of these
 * strings inline — AGENTS.md §5.
 *
 * Each list has a label map beside it: the list is what is stored, the labels
 * are what a baker reads.
 */

/** How far along an order is (AGENTS.md §12). */
export const ORDER_STATUSES = ["PENDING", "IN_PROGRESS", "IN_TRANSIT", "DELIVERED", "CANCELLED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "Baking",
  IN_TRANSIT: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const PAYMENT_STATUSES = ["UNPAID", "PARTIALLY_PAID", "PAID"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Part paid",
  PAID: "Paid",
};

/** How money changed hands, for orders, payments and expenses alike. */
export const PAYMENT_METHODS = ["CASH", "UPI", "BANK_TRANSFER", "CARD", "OTHER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  UPI: "UPI",
  BANK_TRANSFER: "Bank transfer",
  CARD: "Card",
  OTHER: "Other",
};

export const DELIVERY_TYPES = ["DELIVERY", "PICKUP"] as const;
export type DeliveryType = (typeof DELIVERY_TYPES)[number];

export const DELIVERY_TYPE_LABELS: Record<DeliveryType, string> = {
  DELIVERY: "Delivery",
  PICKUP: "Pickup",
};

export const ADJUSTMENT_TYPES = ["DISCOUNT", "CHARGE"] as const;
export type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number];

/** The ledger's transaction types (AGENTS.md §14). Stock is never overwritten, only added to. */
export const INVENTORY_TRANSACTION_TYPES = [
  "STOCK_IN",
  "ORDER_RESERVATION",
  "ORDER_CONSUMPTION",
  "ADJUSTMENT",
  "WASTAGE",
  "RETURN",
] as const;
export type InventoryTransactionType = (typeof INVENTORY_TRANSACTION_TYPES)[number];

export const INVENTORY_TRANSACTION_LABELS: Record<InventoryTransactionType, string> = {
  STOCK_IN: "Stock in",
  ORDER_RESERVATION: "Reserved for an order",
  ORDER_CONSUMPTION: "Used by an order",
  ADJUSTMENT: "Adjustment",
  WASTAGE: "Wastage",
  RETURN: "Returned",
};

/** The types that only ever add to stock, and the ones that only ever take from it. */
export const STOCK_INCREASING_TYPES = ["STOCK_IN", "RETURN"] as const;
export const STOCK_DECREASING_TYPES = ["ORDER_RESERVATION", "ORDER_CONSUMPTION", "WASTAGE"] as const;

/** The types a baker may record by hand; the rest are posted by the order flow. */
export const MANUAL_INVENTORY_TYPES = ["STOCK_IN", "ADJUSTMENT", "WASTAGE", "RETURN"] as const;

export const EXPENSE_CATEGORIES = [
  "Ingredients",
  "Packaging",
  "Delivery",
  "Equipment",
  "Utilities",
  "Marketing",
  "Rent",
  "Other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/** How a badge for each status should read. Used by StatusBadge; no screen picks colours itself. */
export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

export const ORDER_STATUS_TONES: Record<OrderStatus, StatusTone> = {
  PENDING: "warning",
  IN_PROGRESS: "info",
  IN_TRANSIT: "info",
  DELIVERED: "success",
  CANCELLED: "danger",
};

export const PAYMENT_STATUS_TONES: Record<PaymentStatus, StatusTone> = {
  UNPAID: "danger",
  PARTIALLY_PAID: "warning",
  PAID: "success",
};
