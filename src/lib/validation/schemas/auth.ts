import { z } from "zod";
import { normalizePhone } from "@/features/auth/security";
import { USER_ROLES } from "@/features/auth/types";
import { VALIDATION_MESSAGES } from "@/constants/messages";

export const PHONE_REGEX = /^\+?[1-9]\d{9,14}$/;

const phoneSchema = z
  .string()
  .trim()
  .transform(normalizePhone)
  .refine((phone) => PHONE_REGEX.test(phone), VALIDATION_MESSAGES.phone);

const emailSchema = z.string().trim().email().max(254).transform((email) => email.toLowerCase());

const passwordSchema = z
  .string()
  .min(8, VALIDATION_MESSAGES.invalid)
  .max(72, VALIDATION_MESSAGES.tooLong("Password", 72));

export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    businessName: z.string().trim().min(2).max(160),
    phone: phoneSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, VALIDATION_MESSAGES.required("Password")),
});

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

export const changePasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"],
  });

export const roleSchema = z.enum(USER_ROLES);

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
