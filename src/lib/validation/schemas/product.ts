import { z } from "zod";
import { VALIDATION_MESSAGES } from "@/constants/messages";

export const createProductSchema = z.object({
  categoryId: z.string().uuid(VALIDATION_MESSAGES.invalid).optional().or(z.literal("")),
  name: z.string().min(1, VALIDATION_MESSAGES.required("Name")).max(200),
  description: z.string().max(2000).optional(),
  defaultPrice: z.number().int(VALIDATION_MESSAGES.wholeNumber("Price")).min(0, VALIDATION_MESSAGES.notNegative("Price")),
  unit: z.string().min(1).default("piece"),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.input<typeof createProductSchema>;
export type UpdateProductInput = z.input<typeof updateProductSchema>;
