import { z } from "zod";

import { indianMobile, optionalEmail, optionalText, optionalUrl, requiredText } from "../primitives";

/** A customer as the form holds it, parsed into what is stored. */
export const createCustomerSchema = z.object({
  name: requiredText("Name", 100),
  // Stored in one shape whichever way it was typed, so the same customer is
  // one row and a search on a number finds them (src/lib/validation/primitives.ts).
  phone: indianMobile("Phone"),
  email: optionalEmail("Email"),
  address: optionalText(500, "Address"),
  googleMapsLink: optionalUrl("Google Maps link"),
  notes: optionalText(1000, "Notes"),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerInput = z.input<typeof createCustomerSchema>;
export type CreateCustomerPayload = z.output<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.input<typeof updateCustomerSchema>;
export type UpdateCustomerPayload = z.output<typeof updateCustomerSchema>;
