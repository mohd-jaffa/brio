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
export const ORDER_STATUSES = ["PENDING", "IN_PROGRESS", "READY", "IN_TRANSIT", "DELIVERED", "CANCELLED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Where an order may go next (plan §139.11.8), the usual next step first.
 * Anything else is refused by the server — by the database itself, whose
 * `order_status_next` repeats this table (0016_change_order_status.sql, kept
 * equal by its test). Out for delivery exists only for a delivery order, and a
 * delivered or cancelled order is final: stock has already followed it, and
 * moving it again would move stock again.
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["READY", "IN_TRANSIT", "DELIVERED", "CANCELLED"],
  READY: ["IN_TRANSIT", "DELIVERED", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

/** The statuses only a delivery order can pass through. */
export const DELIVERY_ONLY_STATUSES: readonly OrderStatus[] = ["IN_TRANSIT"];

/** The finished statuses: nothing moves an order on from either (plan §139.11.8). */
export const FINAL_STATUSES: readonly OrderStatus[] = ["DELIVERED", "CANCELLED"];

/** The statuses of an order still being worked on, in the order it passes through them. */
export const OPEN_STATUSES = ["PENDING", "IN_PROGRESS", "READY", "IN_TRANSIT"] as const satisfies readonly OrderStatus[];
export type OpenStatus = (typeof OPEN_STATUSES)[number];

/** Orders' tabs (plan §139.10): every order, then one status each. */
export const ORDER_TABS = ["ALL", ...ORDER_STATUSES] as const;
export type OrderTab = (typeof ORDER_TABS)[number];

/**
 * How a status reads. "Preparing" rather than "Baking", since not every
 * business bakes (Q3, §139.1); DELIVERED reads "Completed" for a pickup — use
 * `orderStatusLabel`, which knows how the order is handed over.
 */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "Preparing",
  READY: "Ready",
  IN_TRANSIT: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

/** DELIVERED for an order collected in person. */
export const PICKUP_DELIVERED_LABEL = "Completed";

/** A status as it reads for this order: a pickup is Completed, a delivery Delivered. */
export function orderStatusLabel(status: OrderStatus, deliveryType: DeliveryType): string {
  return status === "DELIVERED" && deliveryType === "PICKUP" ? PICKUP_DELIVERED_LABEL : ORDER_STATUS_LABELS[status];
}

export const PAYMENT_STATUSES = ["UNPAID", "PARTIALLY_PAID", "PAID"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** What the order screen offers at placing, in the order a person reaches for them (plan §139.10). */
export const PAYMENT_CHOICES_AT_PLACING: readonly PaymentStatus[] = ["UNPAID", "PAID", "PARTIALLY_PAID"];

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

/**
 * The types that only ever add to stock, and the ones that only ever take from
 * it. A reservation is in neither: it is posted negative when an order is
 * placed and released by a positive line of the same type when the order is
 * delivered or cancelled (plan §139.11.8), so the ledger reads reserved, then
 * released, rather than hiding the release in an adjustment.
 */
export const STOCK_INCREASING_TYPES = ["STOCK_IN", "RETURN"] as const;
export const STOCK_DECREASING_TYPES = ["ORDER_CONSUMPTION", "WASTAGE"] as const;

/** The types a baker may record by hand; the rest are posted by the order flow. */
export const MANUAL_INVENTORY_TYPES = ["STOCK_IN", "ADJUSTMENT", "WASTAGE", "RETURN"] as const;

/**
 * The eight expense categories every business has (plan §22). They stay
 * fixed; a business may add its own beside them (the user, 2026-09-26,
 * `expense_categories`), so a category in general is any name.
 */
export const DEFAULT_EXPENSE_CATEGORIES = [
  "Ingredients",
  "Packaging",
  "Delivery",
  "Equipment",
  "Utilities",
  "Marketing",
  "Rent",
  "Other",
] as const;
export type DefaultExpenseCategory = (typeof DEFAULT_EXPENSE_CATEGORIES)[number];

/** A default, or a category the business made — its name. */
export type ExpenseCategory = string;

/** Whether a name is one of the defaults, as the database compares it: trimmed, any case. */
export function isDefaultExpenseCategory(name: string): boolean {
  const key = name.trim().toLowerCase();
  return DEFAULT_EXPENSE_CATEGORIES.some((category) => category.toLowerCase() === key);
}

/**
 * The colours a status pill can take (plan §139.4), one per status colour
 * token. They are named after the order statuses that own them; anything else
 * borrows the one whose meaning it shares — an unpaid order is red like a
 * cancelled one, an active product green like a delivered order. Used by
 * StatusPill; no screen picks colours itself.
 */
export const STATUS_TONES = ["pending", "preparing", "ready", "transit", "delivered", "cancelled", "neutral"] as const;
export type StatusTone = (typeof STATUS_TONES)[number];

export const ORDER_STATUS_TONES: Record<OrderStatus, StatusTone> = {
  PENDING: "pending",
  IN_PROGRESS: "preparing",
  READY: "ready",
  IN_TRANSIT: "transit",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

export const PAYMENT_STATUS_TONES: Record<PaymentStatus, StatusTone> = {
  UNPAID: "cancelled",
  PARTIALLY_PAID: "pending",
  PAID: "delivered",
};

/**
 * A customer's segment (plan §139.10), worked out from their orders and when
 * they were added — never stored. Regular reads green, like a delivered
 * order; New like a ready one.
 */
export const CUSTOMER_SEGMENTS = ["REGULAR", "NEW"] as const;
export type CustomerSegment = (typeof CUSTOMER_SEGMENTS)[number];

export const CUSTOMER_SEGMENT_TONES: Record<CustomerSegment, StatusTone> = {
  REGULAR: "delivered",
  NEW: "ready",
};

/**
 * What the Customers list can be narrowed to: a segment, or **DUE** — those
 * who still owe the business money (the user, 2026-09-27). Not a segment: a
 * Regular can owe too.
 */
export const CUSTOMER_FILTERS = [...CUSTOMER_SEGMENTS, "DUE"] as const;
export type CustomerFilter = (typeof CUSTOMER_FILTERS)[number];

/**
 * What a notification is about (plan §139.12 `…_notification_kind`;
 * 0022_notification_kind.sql).
 */
export const NOTIFICATION_KINDS = ["ORDER", "PAYMENT", "STOCK", "CUSTOMER", "SYSTEM"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/**
 * The inbox's tabs (plan §139.10: All · Orders · Customers · System) and the
 * kinds each shows: a payment is about an order, and stock is the business's
 * own, so it sits with the system's.
 */
export const NOTIFICATION_TABS = ["ALL", "ORDERS", "CUSTOMERS", "SYSTEM"] as const;
export type NotificationTab = (typeof NOTIFICATION_TABS)[number];

export const NOTIFICATION_TAB_KINDS: Record<NotificationTab, readonly NotificationKind[]> = {
  ALL: NOTIFICATION_KINDS,
  ORDERS: ["ORDER", "PAYMENT"],
  CUSTOMERS: ["CUSTOMER"],
  SYSTEM: ["STOCK", "SYSTEM"],
};
