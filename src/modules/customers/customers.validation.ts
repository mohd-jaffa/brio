import { z } from "zod";
import { normalizePhone } from "@/modules/auth/auth.security";

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z
    .string()
    .min(10, "Valid phone number is required")
    .transform((val) => normalizePhone(val)),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  address: z.string().max(500).optional(),
  googleMapsLink: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  notes: z.string().max(1000).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerInput = z.input<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.input<typeof updateCustomerSchema>;
