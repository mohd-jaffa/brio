import { z } from "zod";

import { VALIDATION_MESSAGES } from "@/constants/messages";
import { USER_ROLES } from "@/constants/roles";
import { indianMobile, requiredEmail, requiredLine } from "@/lib/validation/primitives";

import { businessFields } from "./business";

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

/**
 * Both boxes have to agree, and the complaint belongs on the second one. It is
 * checked as soon as the two passwords are themselves valid, whatever else in
 * the form is not yet: Zod otherwise skips a whole-object check while any
 * field has an issue, and registration's first step would let two different
 * passwords through until the business had been filled in too.
 */
const matching = <T extends { confirmPassword: string }>(
  field: keyof T & string,
): [
  (value: T) => boolean,
  { message: string; path: PropertyKey[]; when: (payload: z.core.ParsePayload<unknown>) => boolean },
] => [
  (value) => (value[field] as unknown as string) === value.confirmPassword,
  {
    message: VALIDATION_MESSAGES.passwordsMustMatch,
    path: ["confirmPassword"],
    when: ({ value, issues }) =>
      typeof value === "object" &&
      value !== null &&
      !issues.some(({ path }) => !path?.length || path[0] === field || path[0] === "confirmPassword"),
  },
];

/**
 * Who you are and what your business is (plan §139.11.2). The form asks for
 * it in two steps, but sends it as one request, parsed once here.
 */
export const registerSchema = z
  .object({
    name: requiredLine("Your name", { min: 2, max: 120 }),
    phone: phoneSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string({ error: VALIDATION_MESSAGES.required("Confirm password") }),
    businessName: businessFields.name,
    tagline: businessFields.tagline,
    city: businessFields.city,
    address: businessFields.address,
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

/** The current password, asked for before the sign-in number or email changes; never altered. */
const currentPasswordSchema = z.string().min(1, VALIDATION_MESSAGES.required("Current password"));

/** The owner's name, changed from Settings (the user, 2026-09-26). */
export const changeNameSchema = z.object({
  name: requiredLine("Your name", { min: 2, max: 120 }),
});

/** A new sign-in number, with the current password (the user, 2026-09-26). */
export const changePhoneSchema = z.object({
  phone: phoneSchema,
  password: currentPasswordSchema,
});

/** A new email address, with the current password; it waits for its confirmation (the user, 2026-09-26). */
export const changeEmailSchema = z.object({
  email: emailSchema,
  password: currentPasswordSchema,
});

/** The token in the link that confirms a new email address. */
export const confirmEmailChangeSchema = z.object({
  token: z
    .string()
    .min(20, VALIDATION_MESSAGES.required("Confirmation token"))
    .max(200, VALIDATION_MESSAGES.required("Confirmation token")),
});

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
export type ChangeNameInput = z.input<typeof changeNameSchema>;
export type ChangeNamePayload = z.output<typeof changeNameSchema>;
export type ChangePhoneInput = z.input<typeof changePhoneSchema>;
export type ChangePhonePayload = z.output<typeof changePhoneSchema>;
export type ChangeEmailInput = z.input<typeof changeEmailSchema>;
export type ChangeEmailPayload = z.output<typeof changeEmailSchema>;
export type ConfirmEmailChangePayload = z.output<typeof confirmEmailChangeSchema>;
