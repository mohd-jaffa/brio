import { z } from "zod";
import { normalizePhone } from "@/features/auth/security";
import { VALIDATION_MESSAGES } from "@/constants/messages";

export const createCustomerSchema = z.object({
  name: z.string().min(1, VALIDATION_MESSAGES.required("Name")).max(100),
  phone: z
    .string()
    .min(10, VALIDATION_MESSAGES.phone)
    .transform((val) => normalizePhone(val)),
  email: z.string().email(VALIDATION_MESSAGES.email("Email")).optional().or(z.literal("")),
  address: z.string().max(500).optional(),
  googleMapsLink: z.string().url(VALIDATION_MESSAGES.invalid).optional().or(z.literal("")),
  notes: z.string().max(1000).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerInput = z.input<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.input<typeof updateCustomerSchema>;
