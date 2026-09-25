import { z } from "zod";

import { indianMobile, optionalLine, requiredLine, requiredLines } from "../primitives";

/**
 * The business profile, as Business details edits it (plan §139.11.2). The
 * whole profile is sent each time, so a catch phrase cleared and one left
 * alone stay different things. The limits match the database's checks
 * (0008_business_profile.sql).
 */
export const businessProfileSchema = z.object({
  name: requiredLine("Business name", { min: 2, max: 160 }),
  tagline: optionalLine("Catch phrase", 80),
  city: requiredLine("City", { min: 2, max: 80 }),
  address: requiredLines("Address", { max: 300 }),
  // Printed on the bill. It starts as the sign-in number and may differ from it.
  phone: indianMobile("Business phone"),
});

export type BusinessProfileInput = z.input<typeof businessProfileSchema>;
export type BusinessProfilePayload = z.output<typeof businessProfileSchema>;
