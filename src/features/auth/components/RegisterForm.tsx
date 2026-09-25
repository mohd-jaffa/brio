"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Lock, Mail, Smartphone, Store, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { useResponse } from "@/components/ui/response-card";
import { TextField } from "@/components/ui/text-field";
import { UI_TEXT } from "@/constants/messages";
import { AUTH_ROUTES } from "@/constants/routes";
import { useApiMutation } from "@/lib/query/useApiMutation";
import { registerSchema, type RegisterInput, type RegisterPayload } from "@/lib/validation";

import { AuthClient, type RegisteredAccount } from "../api.client";
import { PasswordField } from "./PasswordField";

const EMPTY: RegisterInput = {
  name: "",
  businessName: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
};

/**
 * Creating an account (plan §7). Registration deliberately does not sign
 * anyone in: a confirmation email has just been sent, and the next step is to
 * sign in with the number and password chosen here.
 *
 * The reference marks the phone number optional and omits the bakery's name.
 * Neither is possible: the number is the credential this account is signed in
 * with, and the bakery name is what the bakery row is created from.
 */
export function RegisterForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput, unknown, RegisterPayload>({
    resolver: zodResolver(registerSchema),
    defaultValues: EMPTY,
  });

  const respond = useResponse();
  const { submit, submitting } = useApiMutation<RegisterPayload, RegisteredAccount>(
    AuthClient.register,
    {
      onSuccess: () => {
        // The card outlives the move: the provider sits above every route.
        respond.success({ title: UI_TEXT.outcomes.accountCreated, message: UI_TEXT.auth.accountCreated });
        router.replace(AUTH_ROUTES.signIn);
      },
      onError: (failure) =>
        respond.failure(failure, { title: UI_TEXT.outcomes.accountNotCreated, fallback: "AUTH_REGISTRATION_FAILED" }),
    },
  );

  return (
    <form onSubmit={handleSubmit((values) => submit(values))} className="space-y-4" noValidate>

      <TextField
        label={UI_TEXT.auth.nameLabel}
        autoComplete="name"
        placeholder="Enter your full name"
        required
        leading={<User size={18} strokeWidth={1.8} />}
        error={errors.name?.message}
        {...register("name")}
      />

      <TextField
        label={UI_TEXT.auth.businessNameLabel}
        autoComplete="organization"
        placeholder="Sweet Delights"
        required
        leading={<Store size={18} strokeWidth={1.8} />}
        error={errors.businessName?.message}
        {...register("businessName")}
      />

      <TextField
        label={UI_TEXT.auth.emailLabel}
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="your@email.com"
        hint="Where your confirmation and password resets are sent."
        required
        leading={<Mail size={18} strokeWidth={1.8} />}
        error={errors.email?.message}
        {...register("email")}
      />

      <TextField
        label={UI_TEXT.auth.phoneLabel}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="98765 43210"
        hint="You will sign in with this number."
        required
        leading={<Smartphone size={18} strokeWidth={1.8} />}
        prefix={UI_TEXT.fields.phonePrefix}
        error={errors.phone?.message}
        {...register("phone")}
      />

      <PasswordField
        label={UI_TEXT.auth.passwordLabel}
        autoComplete="new-password"
        placeholder="Create a password"
        hint={UI_TEXT.auth.passwordHint}
        required
        leading={<Lock size={18} strokeWidth={1.8} />}
        error={errors.password?.message}
        {...register("password")}
      />

      <PasswordField
        label={UI_TEXT.auth.confirmPasswordLabel}
        autoComplete="new-password"
        placeholder="Repeat your password"
        required
        leading={<Lock size={18} strokeWidth={1.8} />}
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      <Button
        type="submit"
        variant="action"
        size="lg"
        shape="pill"
        fullWidth
        loading={submitting}
        icon={ArrowRight}
        iconPosition="end"
        label={submitting ? UI_TEXT.auth.creatingAccount : UI_TEXT.auth.createAccount}
      />
    </form>
  );
}
