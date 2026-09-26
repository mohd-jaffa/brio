import * as z from "zod";

import { VALIDATION_MESSAGES } from "@/constants/messages";

import {
  optionalIllustration,
  optionalLines,
  paiseAmount,
  paiseText,
  requiredLine,
} from "../primitives";

/** A product as the form holds it. Prices are whole paise — never a float (AGENTS.md §13). */
export const createProductSchema = z.object({
  name: requiredLine("Name", { max: 200 }),
  description: optionalLines("Description", 2000),
  defaultPrice: paiseAmount("Price", { allowZero: true }),
  unit: requiredLine("Unit", { max: 30 }).default("piece"),
  iconKey: optionalIllustration("picture"),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.input<typeof createProductSchema>;
export type CreateProductPayload = z.output<typeof createProductSchema>;
export type UpdateProductInput = z.input<typeof updateProductSchema>;
export type UpdateProductPayload = z.output<typeof updateProductSchema>;

/**
 * The units a product can be sold in. Set, bunch and pack are neutral enough
 * for hampers, flowers and gifts as well as bakes (Q8); their names are in
 * UI_TEXT.products.units.
 */
export const PRODUCT_UNITS = ["piece", "kg", "gram", "box", "dozen", "set", "bunch", "pack"] as const;
export type ProductUnit = (typeof PRODUCT_UNITS)[number];

/**
 * A product as its form holds it: the price is typed in rupees and parsed to
 * paise here, so no component multiplies by 100 itself (AGENTS.md §13).
 */
export const productFormSchema = z.object({
  name: createProductSchema.shape.name,
  description: createProductSchema.shape.description,
  defaultPrice: paiseText("Price"),
  unit: z.enum(PRODUCT_UNITS, { error: VALIDATION_MESSAGES.chooseOne("unit") }),
  iconKey: createProductSchema.shape.iconKey,
  isActive: z.boolean(),
});

export type ProductFormValues = z.input<typeof productFormSchema>;
export type ProductFormPayload = z.output<typeof productFormSchema>;
