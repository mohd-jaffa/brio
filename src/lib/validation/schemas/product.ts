import { z } from "zod";

import { optionalLines, optionalUuid, paiseAmount, paiseText, requiredLine } from "../primitives";

/** A product as the form holds it. Prices are whole paise — never a float (AGENTS.md §13). */
export const createProductSchema = z.object({
  categoryId: optionalUuid("Category"),
  name: requiredLine("Name", { max: 200 }),
  description: optionalLines("Description", 2000),
  defaultPrice: paiseAmount("Price", { allowZero: true }),
  unit: requiredLine("Unit", { max: 30 }).default("piece"),
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
