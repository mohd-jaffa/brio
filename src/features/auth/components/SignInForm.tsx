"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { ScreenNotice } from "@/components/ui/screen-notice";
import { TextField } from "@/components/ui/text-field";
import { UI_TEXT } from "@/constants/messages";
import { AUTH_ROUTES, RETURN_TO_PARAM, returnToPath } from "@/constants/routes";
import { useApiMutation } from "@/lib/query/useApiMutation";
import { loginSchema, type LoginInput, type LoginPayload } from "@/lib/validation";

import { useAuth } from "../AuthProvider";
import type { AuthSessionView } from "../types";
import { PasswordField } from "./PasswordField";

/**
 * Signing in (plan §7). Where it goes next depends on the account: a baker
 * still holding a temporary password is sent to change it and nowhere else
 * (§95); anyone else returns to the screen that sent them here.
 */
export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();

  const justRegistered = searchParams.get("registered") === "1";
  const returnTo = returnToPath(searchParams.get(RETURN_TO_PARAM));

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput, unknown, LoginPayload>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: "", password: "" },
  });

  const { submit, submitting, error } = useApiMutation<LoginPayload, AuthSessionView>(signIn, {
    fallback: "AUTH_INVALID_CREDENTIALS",
    onSuccess: (session) => {
      router.replace(session.requiresPasswordChange ? AUTH_ROUTES.changePassword : returnTo);
    },
  });

  return (
    <form onSubmit={handleSubmit((values) => submit(values))} className="space-y-5" noValidate>
      {justRegistered && !error && <ScreenNotice tone="info">{UI_TEXT.auth.accountCreated}</ScreenNotice>}
      {error && <ScreenNotice>{error}</ScreenNotice>}

      <TextField
        label={UI_TEXT.auth.phoneLabel}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="98765 43210"
        hint={UI_TEXT.auth.phoneHint}
        required
        error={errors.phone?.message}
        {...register("phone")}
      />

      <PasswordField
        label={UI_TEXT.auth.passwordLabel}
        autoComplete="current-password"
        required
        error={errors.password?.message}
        {...register("password")}
      />

      <div className="flex justify-end">
        <Link
          href={AUTH_ROUTES.forgotPassword}
          className="text-xs font-bold text-primary transition-colors hover:text-primary-hover hover:underline"
        >
          {UI_TEXT.auth.forgotPassword}
        </Link>
      </div>

      <Button
        type="submit"
        fullWidth
        loading={submitting}
        icon={ArrowRight}
        label={submitting ? UI_TEXT.auth.signingIn : UI_TEXT.auth.signIn}
      />
    </form>
  );
}
