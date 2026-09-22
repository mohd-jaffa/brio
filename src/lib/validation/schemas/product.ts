import { z } from "zod";

import { VALIDATION_MESSAGES } from "@/constants/messages";

import { optionalText, optionalUuid, paiseText } from "../primitives";

/** A product as the form holds it. Prices are whole paise — never a float (AGENTS.md §13). */
export const createProductSchema = z.object({
  categoryId: optionalUuid("Category"),
  name: z.string().trim().min(1, VALIDATION_MESSAGES.required("Name")).max(200),
  description: optionalText(2000),
  defaultPrice: z
    .number()
    .int(VALIDATION_MESSAGES.wholeNumber("Price"))
    .min(0, VALIDATION_MESSAGES.notNegative("Price")),
  unit: z.string().trim().min(1).default("piece"),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.input<typeof createProductSchema>;
export type CreateProductPayload = z.output<typeof createProductSchema>;
export type UpdateProductInput = z.input<typeof updateProductSchema>;
export type UpdateProductPayload = z.output<typeof updateProductSchema>;

/** The units a product can be sold in. */
export const PRODUCT_UNITS = ["piece", "kg", "gram", "box", "dozen"] as const;

export const PRODUCT_UNIT_LABELS: Record<(typeof PRODUCT_UNITS)[number], string> = {
  piece: "Piece (pc)",
  kg: "Kilogram (kg)",
  gram: "Gram (g)",
  box: "Box",
  dozen: "Dozen",
};

/**
 * A product as its form holds it: the price is typed in rupees and parsed to
 * paise here, so no component multiplies by 100 itself (AGENTS.md §13).
 */
export const productFormSchema = z.object({
  name: createProductSchema.shape.name,
  description: createProductSchema.shape.description,
  defaultPrice: paiseText("Price"),
  unit: z.enum(PRODUCT_UNITS),
  isActive: z.boolean(),
});

export type ProductFormValues = z.input<typeof productFormSchema>;
export type ProductFormPayload = z.output<typeof productFormSchema>;
