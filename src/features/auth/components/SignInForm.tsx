"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Lock, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { useResponse } from "@/components/ui/response-card";
import { TextField } from "@/components/ui/text-field";
import { UI_TEXT } from "@/constants/messages";
import { AUTH_ROUTES, RETURN_TO_PARAM, returnToPath } from "@/constants/routes";
import { useApiMutation } from "@/lib/query/useApiMutation";
import { loginSchema, type LoginInput, type LoginPayload } from "@/lib/validation";

import { useAuth } from "../AuthProvider";
import type { AuthSessionView } from "../types";
import { PasswordField } from "./PasswordField";

/**
 * Signing in (plan §7). A baker signs in with the mobile number their account
 * is keyed on, not an email address — the reference shows an email field, and
 * the product does not have one to sign in with.
 *
 * Where it goes next depends on the account: a baker still holding a temporary
 * password is sent to change it and nowhere else (§95); anyone else returns to
 * the screen that sent them here.
 */
export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();

  const returnTo = returnToPath(searchParams.get(RETURN_TO_PARAM));

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput, unknown, LoginPayload>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: "", password: "" },
  });

  const respond = useResponse();
  const { submit, submitting } = useApiMutation<LoginPayload, AuthSessionView>(signIn, {
    onSuccess: (session) => {
      router.replace(session.requiresPasswordChange ? AUTH_ROUTES.changePassword : returnTo);
    },
    onError: (failure) =>
      respond.failure(failure, { title: UI_TEXT.outcomes.signInFailed, fallback: "AUTH_INVALID_CREDENTIALS" }),
  });

  return (
    <form onSubmit={handleSubmit((values) => submit(values))} className="space-y-4" noValidate>

      <TextField
        label={UI_TEXT.auth.phoneLabel}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="98765 43210"
        required
        leading={<Smartphone size={18} strokeWidth={1.8} />}
        prefix={UI_TEXT.fields.phonePrefix}
        error={errors.phone?.message}
        {...register("phone")}
      />

      <PasswordField
        label={UI_TEXT.auth.passwordLabel}
        autoComplete="current-password"
        placeholder="Enter your password"
        required
        leading={<Lock size={18} strokeWidth={1.8} />}
        error={errors.password?.message}
        {...register("password")}
      />

      <div className="flex justify-end pt-0.5">
        <Link
          href={AUTH_ROUTES.forgotPassword}
          className="text-[0.8125rem] font-medium text-text-muted underline decoration-border underline-offset-4 transition-colors hover:text-text hover:decoration-primary"
        >
          {UI_TEXT.auth.forgotPassword}
        </Link>
      </div>

      <Button
        type="submit"
        variant="action"
        size="lg"
        shape="pill"
        fullWidth
        loading={submitting}
        icon={ArrowRight}
        iconPosition="end"
        label={submitting ? UI_TEXT.auth.signingIn : UI_TEXT.auth.signIn}
      />
    </form>
  );
}
