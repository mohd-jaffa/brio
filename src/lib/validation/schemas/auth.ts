import { z } from "zod";

import { VALIDATION_MESSAGES } from "@/constants/messages";
import { USER_ROLES } from "@/constants/roles";
import { indianMobile, requiredEmail } from "@/lib/validation/primitives";

/**
 * What the app accepts when someone signs up, signs in or changes a password
 * (plan §7, §94, §95). Each schema exports both shapes (AGENTS.md §22): the
 * `Input` a form or the browser sends, and the `Payload` the server works
 * with, which is what comes out after a phone number has been normalised and
 * an email lower-cased. Nothing below this parses again.
 */

/** The minimum Supabase Auth itself enforces; the maximum bcrypt can carry. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

const phoneSchema = indianMobile();

const emailSchema = requiredEmail("Email address");

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, VALIDATION_MESSAGES.tooShort("Password", PASSWORD_MIN_LENGTH))
  .max(PASSWORD_MAX_LENGTH, VALIDATION_MESSAGES.tooLong("Password", PASSWORD_MAX_LENGTH));

/** Both boxes have to agree, and the complaint belongs on the second one. */
const matching = <T extends { confirmPassword: string }>(
  field: keyof T & string,
): [(value: T) => boolean, { message: string; path: string[] }] => [
  (value) => (value[field] as unknown as string) === value.confirmPassword,
  { message: VALIDATION_MESSAGES.passwordsMustMatch, path: ["confirmPassword"] },
];

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, VALIDATION_MESSAGES.tooShort("Your name", 2))
      .max(120, VALIDATION_MESSAGES.tooLong("Your name", 120)),
    businessName: z
      .string()
      .trim()
      .min(2, VALIDATION_MESSAGES.tooShort("Bakery name", 2))
      .max(160, VALIDATION_MESSAGES.tooLong("Bakery name", 160)),
    phone: phoneSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(...matching<{ password: string; confirmPassword: string }>("password"));

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
  .refine(...matching<{ newPassword: string; confirmPassword: string }>("newPassword"));

/** The tokens a confirmation link hands back, posted so the server can use them. */
export const confirmEmailSchema = z.object({
  accessToken: z.string().min(1, VALIDATION_MESSAGES.required("Confirmation token")),
  refreshToken: z.string().min(1, VALIDATION_MESSAGES.required("Confirmation token")),
});

export const roleSchema = z.enum(USER_ROLES);

export type RegisterInput = z.input<typeof registerSchema>;
export type RegisterPayload = z.output<typeof registerSchema>;
export type LoginInput = z.input<typeof loginSchema>;
export type LoginPayload = z.output<typeof loginSchema>;
export type PasswordResetRequestInput = z.input<typeof passwordResetRequestSchema>;
export type PasswordResetRequestPayload = z.output<typeof passwordResetRequestSchema>;
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;
export type ChangePasswordPayload = z.output<typeof changePasswordSchema>;
export type ConfirmEmailInput = z.input<typeof confirmEmailSchema>;
export type ConfirmEmailPayload = z.output<typeof confirmEmailSchema>;
