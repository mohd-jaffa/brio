import { z } from "zod";

import { VALIDATION_MESSAGES } from "@/constants/messages";
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

export const orderItemSchema = z.object({
  productId: z.string().uuid(VALIDATION_MESSAGES.invalid),
  quantity: quantity(),
  notes: optionalLine("Item notes", 500),
});

export const orderAdjustmentSchema = z.object({
  type: z.enum(ADJUSTMENT_TYPES),
  name: requiredLine("Name", { max: 120 }),
  /** Whole paise, never negative; a DISCOUNT is subtracted by its type, not its sign. */
  amount: paiseAmount("Amount", { allowZero: true }),
});

/**
 * A whole order as the checkout builds it (AGENTS.md §12). The server recalculates
 * every total from the products it reads back — what arrives here is what was
 * asked for, never what is owed.
 */
export const createOrderSchema = z.object({
  customerId: z.string().uuid(VALIDATION_MESSAGES.invalid),
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
export type CreateOrderAdjustmentInput = z.input<typeof orderAdjustmentSchema>;

/**
 * A new order as the checkout screen holds it. Money is typed in rupees and
 * parsed to paise here; the datetime-local field gives a local wall-clock
 * string, which is turned into the instant that is stored.
 */
export const orderFormSchema = z.object({
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
});

export type OrderFormValues = z.input<typeof orderFormSchema>;
export type OrderFormPayload = z.output<typeof orderFormSchema>;
