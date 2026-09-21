import { z } from "zod";

export const orderItemSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  quantity: z.number().int("Quantity must be an integer").min(1, "Quantity must be at least 1"),
  notes: z.string().optional(),
});

export const orderAdjustmentSchema = z.object({
  type: z.enum(["DISCOUNT", "CHARGE"]),
  name: z.string().min(1, "Name is required"),
  amount: z.number().int("Amount must be in whole paise").min(0, "Amount cannot be negative"),
});

export const createOrderSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID"),
  items: z.array(orderItemSchema).min(1, "Order must have at least one item"),
  adjustments: z.array(orderAdjustmentSchema).optional().default([]),
  
  delivery: z.object({
    type: z.enum(["DELIVERY", "PICKUP"]),
    date: z.string().datetime("Must be a valid ISO datetime"),
    address: z.string().optional(),
    googleMapsLink: z.string().url("Must be a valid URL").optional().or(z.literal("")),
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
