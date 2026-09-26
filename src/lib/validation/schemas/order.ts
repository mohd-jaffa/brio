import { z } from "zod";

import { VALIDATION_MESSAGES } from "@/constants/messages";

import {
  ADJUSTMENT_TYPES,
  DELIVERY_TYPES,
  ORDER_STATUSES,
  type DeliveryType,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from "@/constants/statuses";

import { cursorParam, searchParam } from "./list";
import { dayParam } from "./range";
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

/**
 * The sheet's own fields: the amount typed in rupees, and a description if
 * one is needed, which becomes the line's note on the bill (the user,
 * 2026-09-25).
 */
export const customItemFormSchema = z.object({
  name: requiredLine("Item name", { min: 2, max: 120 }),
  description: optionalLine("Description", 500),
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

/**
 * A delivery has somewhere to go: an address, a map link, or both (plan §96,
 * BUG-22). A pickup needs neither. Reported against the address field.
 */
function hasPlace(delivery: { type: DeliveryType; address: string | null; googleMapsLink: string | null }): boolean {
  return delivery.type !== "DELIVERY" || delivery.address !== null || delivery.googleMapsLink !== null;
}
const DELIVERY_PLACE = { message: VALIDATION_MESSAGES.deliveryNeedsPlace, path: ["address"] };

const paymentMethod = z.enum(PAYMENT_METHODS, { error: VALIDATION_MESSAGES.chooseOne("payment method") });

/**
 * What was paid when the order was placed (plan §139.11.9). Paid in full or
 * part paid records a payment; part paid says how much. The payment status
 * after that is derived from the payments, never chosen.
 */
export const orderPaymentSchema = z.discriminatedUnion(
  "status",
  [
    z.object({ status: z.literal("UNPAID") }),
    z.object({ status: z.literal("PAID"), method: paymentMethod, reference: optionalLine("Payment reference", 120) }),
    z.object({
      status: z.literal("PARTIALLY_PAID"),
      amount: paiseAmount("Amount paid"),
      method: paymentMethod,
      reference: optionalLine("Payment reference", 120),
    }),
  ],
  { error: VALIDATION_MESSAGES.chooseOne("payment status") },
);

/**
 * The payment as a form holds it: the amount typed in rupees, asked for only
 * when part paid, and the method kept even while Unpaid is chosen.
 */
export const orderPaymentFormSchema = z
  .object({
    status: z.enum(PAYMENT_STATUSES),
    method: paymentMethod,
    reference: optionalLine("Payment reference", 120),
    amount: z.string().optional(),
  })
  .transform((payment, ctx): z.output<typeof orderPaymentSchema> => {
    const { status, method, reference } = payment;
    if (status === "UNPAID") return { status };
    if (status === "PAID") return { status, method, reference };
    const amount = paiseText("Amount paid").safeParse(payment.amount ?? "");
    if (!amount.success) {
      ctx.addIssue({ code: "custom", message: amount.error.issues[0].message, path: ["amount"] });
      return z.NEVER;
    }
    if (amount.data === 0) {
      ctx.addIssue({ code: "custom", message: VALIDATION_MESSAGES.moreThanZero("Amount paid"), path: ["amount"] });
      return z.NEVER;
    }
    return { status, amount: amount.data, method, reference };
  });

/**
 * What narrows a list of orders (plan §139.10): whose they are — `guest`, or
 * one customer's id — how paid, when due, and what was searched for. The
 * dates are days in the business's calendar, either or both; the first may
 * not come after the second.
 */
const orderFilterFields = z.object({
  customer: z.union([z.literal("guest"), z.uuid()], { error: VALIDATION_MESSAGES.invalid }).optional(),
  payment: z.enum(PAYMENT_STATUSES, { error: VALIDATION_MESSAGES.invalid }).optional(),
  from: dayParam.optional(),
  to: dayParam.optional(),
  search: searchParam,
});

function datesInOrder(query: { from?: string; to?: string }, ctx: z.core.$RefinementCtx<{ from?: string; to?: string }>) {
  if (query.from && query.to && query.from > query.to) {
    ctx.addIssue({ code: "custom", path: ["to"], message: VALIDATION_MESSAGES.invalid });
  }
}

/** `GET /api/orders`: the filters, the tab's status, and where the page starts. */
export const orderListQuerySchema = orderFilterFields
  .extend({
    status: z.enum(ORDER_STATUSES, { error: VALIDATION_MESSAGES.invalid }).optional(),
    cursor: cursorParam,
  })
  .superRefine(datesInOrder);

/** `GET /api/orders/counts`: the same filters, counted for every tab at once. */
export const orderCountsQuerySchema = orderFilterFields.superRefine(datesInOrder);

/**
 * A whole order as the checkout builds it (AGENTS.md §12). The server recalculates
 * every total from the products it reads back — what arrives here is what was
 * asked for, never what is owed.
 */
export const createOrderSchema = z.object({
  customer: orderCustomerSchema,
  items: z.array(orderItemSchema).min(1, VALIDATION_MESSAGES.chooseAtLeastOne("item")),
  adjustments: z.array(orderAdjustmentSchema).optional().default([]),

  delivery: z
    .object({
      type: z.enum(DELIVERY_TYPES),
      date: z.string().datetime(VALIDATION_MESSAGES.invalid),
      address: optionalLines("Delivery address", 500),
      googleMapsLink: optionalUrl("Map link"),
    })
    .refine(hasPlace, DELIVERY_PLACE),

  payment: orderPaymentSchema,

  notes: optionalLines("Order notes", 1000),
});

/**
 * Where to move an order. The payment status is not accepted: the payments
 * decide it (BUG-06, §139.11.9).
 */
export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES, { error: VALIDATION_MESSAGES.chooseOne("status") }),
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
 * A new order as the order screen holds it (src/features/orders/draft.ts),
 * read into what `POST /api/orders` takes. Money is typed in rupees and read
 * to paise here; the datetime-local field gives the business's wall clock,
 * which is turned into the instant that is stored. The screen checks each
 * step against the issues under its own paths, and the server parses the
 * result again with `createOrderSchema`.
 */
export const orderFormSchema = z.object({
  customer: orderCustomerSchema.nullable().transform((customer, ctx) => {
    if (customer === null) {
      ctx.addIssue({ code: "custom", message: VALIDATION_MESSAGES.chooseOne("customer") });
      return z.NEVER;
    }
    return customer;
  }),
  items: z.array(orderItemSchema).min(1, VALIDATION_MESSAGES.chooseAtLeastOne("item")),
  adjustments: z.array(
    z.object({
      type: z.enum(ADJUSTMENT_TYPES),
      name: requiredLine("Name", { max: 120 }),
      amount: paiseText("Amount"),
    }),
  ),
  delivery: z
    .object({
      type: z.enum(DELIVERY_TYPES),
      date: z
        .string()
        .min(1, VALIDATION_MESSAGES.required("Date and time"))
        .transform((local, ctx) => {
          const when = new Date(local);
          if (Number.isNaN(when.getTime())) {
            ctx.addIssue({ code: "custom", message: VALIDATION_MESSAGES.invalid });
            return z.NEVER;
          }
          return when.toISOString();
        }),
      address: optionalLines("Delivery address", 500),
      googleMapsLink: optionalUrl("Map link"),
    })
    .refine(hasPlace, DELIVERY_PLACE),
  payment: orderPaymentFormSchema,
  notes: optionalLines("Order notes", 1000),
});

export type OrderFormValues = z.input<typeof orderFormSchema>;
export type OrderFormPayload = z.output<typeof orderFormSchema>;
export type OrderCustomer = z.output<typeof orderCustomerSchema>;
export type OrderPayment = z.output<typeof orderPaymentSchema>;
export type OrderPaymentFormValues = z.input<typeof orderPaymentFormSchema>;
export type OrderListQuery = z.output<typeof orderListQuerySchema>;
export type OrderCountsQuery = z.output<typeof orderCountsQuerySchema>;
