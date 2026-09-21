import { z } from "zod";

export const createProductSchema = z.object({
  categoryId: z.string().uuid("Invalid category ID").optional().or(z.literal("")),
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).optional(),
  defaultPrice: z.number().int("Price must be in whole paise").min(0, "Price cannot be negative"),
  unit: z.string().min(1).default("piece"),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.input<typeof createProductSchema>;
export type UpdateProductInput = z.input<typeof updateProductSchema>;
