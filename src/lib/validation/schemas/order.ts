import { z } from "zod";
import { VALIDATION_MESSAGES } from "@/constants/messages";

export const orderItemSchema = z.object({
  productId: z.string().uuid(VALIDATION_MESSAGES.invalid),
  quantity: z.number().int(VALIDATION_MESSAGES.wholeNumber("Quantity")).min(1, VALIDATION_MESSAGES.moreThanZero("Quantity")),
  notes: z.string().optional(),
});

export const orderAdjustmentSchema = z.object({
  type: z.enum(["DISCOUNT", "CHARGE"]),
  name: z.string().min(1, VALIDATION_MESSAGES.required("Name")),
  amount: z.number().int(VALIDATION_MESSAGES.wholeNumber("Amount")).min(0, VALIDATION_MESSAGES.notNegative("Amount")),
});

export const createOrderSchema = z.object({
  customerId: z.string().uuid(VALIDATION_MESSAGES.invalid),
  items: z.array(orderItemSchema).min(1, VALIDATION_MESSAGES.chooseAtLeastOne("item")),
  adjustments: z.array(orderAdjustmentSchema).optional().default([]),
  
  delivery: z.object({
    type: z.enum(["DELIVERY", "PICKUP"]),
    date: z.string().datetime(VALIDATION_MESSAGES.invalid),
    address: z.string().optional(),
    googleMapsLink: z.string().url(VALIDATION_MESSAGES.invalid).optional().or(z.literal("")),
  }),
  
  payment: z.object({
    status: z.enum(["UNPAID", "PAID", "PARTIALLY_PAID"]),
    method: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CARD", "OTHER"]).optional(),
    reference: z.string().optional(),
  }),
  
  notes: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "IN_TRANSIT", "DELIVERED", "CANCELLED"]).optional(),
  paymentStatus: z.enum(["UNPAID", "PAID", "PARTIALLY_PAID"]).optional(),
});

export type CreateOrderInput = z.input<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.input<typeof updateOrderStatusSchema>;
export type CreateOrderItemInput = z.input<typeof orderItemSchema>;
export type CreateOrderAdjustmentInput = z.input<typeof orderAdjustmentSchema>;
