import { z } from "zod";

import { VALIDATION_MESSAGES } from "@/constants/messages";
import { toE164India } from "@/lib/phone";

import { optionalEmail, optionalText, optionalUrl } from "../primitives";

/** A customer as the form holds it, parsed into what is stored. */
export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, VALIDATION_MESSAGES.required("Name")).max(100),
  // Stored in one shape whichever way it was typed, so the same customer is
  // one row and a search on a number finds them (src/lib/phone.ts).
  phone: z
    .string()
    .trim()
    .transform((typed, ctx) => {
      const e164 = toE164India(typed);
      if (e164 === null) {
        ctx.addIssue({ code: "custom", message: VALIDATION_MESSAGES.phone });
        return z.NEVER;
      }
      return e164;
    }),
  email: optionalEmail("Email"),
  address: optionalText(500),
  googleMapsLink: optionalUrl("Google Maps link"),
  notes: optionalText(1000),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerInput = z.input<typeof createCustomerSchema>;
export type CreateCustomerPayload = z.output<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.input<typeof updateCustomerSchema>;
export type UpdateCustomerPayload = z.output<typeof updateCustomerSchema>;
