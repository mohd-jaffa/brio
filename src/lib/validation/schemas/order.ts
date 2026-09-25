import { z } from "zod";

import { VALIDATION_MESSAGES } from "@/constants/messages";

/** The picker's value for a walk-in (plan §139.11.3). */
export const GUEST_CHOICE = "GUEST";
import {
  ADJUSTMENT_TYPES,
  DELIVERY_TYPES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from "@/constants/statuses";

import {
  optionalLine,
  optionalLines,
  optionalUrl,
  paiseAmount,
  paiseText,
  quantity,
  requiredLine,
} from "../primitives";

/** A line from the catalogue: the server reads its name and price back. */
export const catalogueItemSchema = z.object({
  productId: z.string().uuid(VALIDATION_MESSAGES.invalid),
  quantity: quantity(),
  notes: optionalLine("Item notes", 500),
});

/**
 * What a custom item is (plan §139.11.7, Q5): a name and the price of one,
 * typed on the order screen. Shared by the order and the sheet that adds one.
 */
export const customItemSchema = z.object({
  name: requiredLine("Item name", { min: 2, max: 120 }),
  unitPrice: paiseAmount("Amount"),
});

/** A line nothing in the catalogue covers — a special request. It moves no stock. */
export const customLineSchema = z.object({
  custom: customItemSchema,
  quantity: quantity(),
  notes: optionalLine("Item notes", 500),
});

type CatalogueLine = z.output<typeof catalogueItemSchema>;
type CustomLine = z.output<typeof customLineSchema>;

/**
 * An order line: from the catalogue, or custom (plan §139.11.7). A line with a
 * `custom` part is read as custom and anything else as a catalogue line, so a
 * mistake is reported against the kind of line it was meant to be — a union
 * would answer only "That value is not valid."
 */
export const orderItemSchema = z.unknown().transform((line, ctx): CatalogueLine | CustomLine => {
  const custom = typeof line === "object" && line !== null && "custom" in line;
  const result = (custom ? customLineSchema : catalogueItemSchema).safeParse(line);
  if (result.success) return result.data;
  for (const issue of result.error.issues) {
    ctx.addIssue({ code: "custom", message: issue.message, path: issue.path });
  }
  return z.NEVER;
});

/** The sheet's own fields: the amount typed in rupees. */
export const customItemFormSchema = z.object({
  name: requiredLine("Item name", { min: 2, max: 120 }),
  unitPrice: paiseText("Amount").pipe(
    z.number().refine((paise) => paise > 0, VALIDATION_MESSAGES.moreThanZero("Amount")),
  ),
});

export const orderAdjustmentSchema = z.object({
  type: z.enum(ADJUSTMENT_TYPES),
  name: requiredLine("Name", { max: 120 }),
  /** Whole paise, never negative; a DISCOUNT is subtracted by its type, not its sign. */
  amount: paiseAmount("Amount", { allowZero: true }),
});

/**
 * Who an order is for, always said out loud (plan §139.11.3): a saved customer
 * of this business, or Guest — never an accidental missing id.
 */
export const orderCustomerSchema = z.discriminatedUnion(
  "kind",
  [
    z.object({ kind: z.literal("GUEST") }),
    z.object({
      kind: z.literal("CUSTOMER"),
      id: z.string({ error: VALIDATION_MESSAGES.chooseOne("customer") }).uuid(VALIDATION_MESSAGES.chooseOne("customer")),
    }),
  ],
  { error: VALIDATION_MESSAGES.chooseOne("customer") },
);

/** What `GET /api/orders?customer=` accepts: `guest`, or one customer's id. */
export const orderListQuerySchema = z.object({
  customer: z.union([z.literal("guest"), z.string().uuid()]).optional(),
});

/**
 * A whole order as the checkout builds it (AGENTS.md §12). The server recalculates
 * every total from the products it reads back — what arrives here is what was
 * asked for, never what is owed.
 */
export const createOrderSchema = z.object({
  customer: orderCustomerSchema,
  items: z.array(orderItemSchema).min(1, VALIDATION_MESSAGES.chooseAtLeastOne("item")),
  adjustments: z.array(orderAdjustmentSchema).optional().default([]),

  delivery: z.object({
    type: z.enum(DELIVERY_TYPES),
    date: z.string().datetime(VALIDATION_MESSAGES.invalid),
    address: optionalLines("Delivery address", 500),
    googleMapsLink: optionalUrl("Google Maps link"),
  }),

  payment: z.object({
    status: z.enum(PAYMENT_STATUSES),
    method: z.enum(PAYMENT_METHODS).optional(),
    reference: optionalLine("Payment reference", 120),
  }),

  notes: optionalLines("Order notes", 1000),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
});

export type CreateOrderInput = z.input<typeof createOrderSchema>;
export type CreateOrderPayload = z.output<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.input<typeof updateOrderStatusSchema>;
export type UpdateOrderStatusPayload = z.output<typeof updateOrderStatusSchema>;
export type CreateOrderItemInput = z.input<typeof orderItemSchema>;
export type CreateOrderItemPayload = z.output<typeof orderItemSchema>;
export type CustomItemFormValues = z.input<typeof customItemFormSchema>;
export type CustomItemFormPayload = z.output<typeof customItemFormSchema>;
export type CreateOrderAdjustmentInput = z.input<typeof orderAdjustmentSchema>;

/**
 * A new order as the checkout screen holds it. Money is typed in rupees and
 * parsed to paise here; the datetime-local field gives a local wall-clock
 * string, which is turned into the instant that is stored.
 */
export const orderFormSchema = z.object({
  // A customer's id, or GUEST_CHOICE for a walk-in; sent as the customer union.
  customerId: z.string().min(1, VALIDATION_MESSAGES.chooseOne("customer")),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, VALIDATION_MESSAGES.chooseOne("product")),
        quantity: quantity(),
        notes: optionalLine("Item notes", 500),
      }),
    )
    .min(1, VALIDATION_MESSAGES.chooseAtLeastOne("item")),
  adjustments: z.array(
    z.object({
      type: z.enum(ADJUSTMENT_TYPES),
      name: requiredLine("Name", { max: 120 }),
      amount: paiseText("Amount"),
    }),
  ),
  delivery: z.object({
    type: z.enum(DELIVERY_TYPES),
    date: z
      .string()
      .min(1, VALIDATION_MESSAGES.required("Delivery date"))
      .transform((local, ctx) => {
        const when = new Date(local);
        if (Number.isNaN(when.getTime())) {
          ctx.addIssue({ code: "custom", message: VALIDATION_MESSAGES.invalid });
          return z.NEVER;
        }
        return when.toISOString();
      }),
    address: optionalLines("Delivery address", 500),
    googleMapsLink: optionalUrl("Google Maps link"),
  }),
  payment: z.object({
    status: z.enum(PAYMENT_STATUSES),
    method: z.enum(PAYMENT_METHODS).optional(),
    reference: optionalLine("Payment reference", 120),
  }),
  notes: optionalLines("Order notes", 1000),
}).transform(({ customerId, ...order }) => ({
  ...order,
  customer: customerId === GUEST_CHOICE ? { kind: "GUEST" as const } : { kind: "CUSTOMER" as const, id: customerId },
}));

export type OrderFormValues = z.input<typeof orderFormSchema>;
export type OrderFormPayload = z.output<typeof orderFormSchema>;
export type OrderCustomer = z.output<typeof orderCustomerSchema>;
export type OrderListQuery = z.output<typeof orderListQuerySchema>;
