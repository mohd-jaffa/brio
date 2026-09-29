"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Mail } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { useResponse } from "@/components/ui/response-card";
import { TextField } from "@/components/ui/text-field";
import { UI_TEXT } from "@/constants/messages";
import { AUTH_ROUTES } from "@/constants/routes";
import { useApiMutation } from "@/lib/query/useApiMutation";
import {
  passwordResetRequestSchema,
  type PasswordResetRequestInput,
  type PasswordResetRequestPayload,
} from "@/lib/validation";

import { AuthClient } from "../api.client";

/**
 * Asking for a temporary password (plan §94). The answer is the same whether
 * or not the address belongs to an account — which is the point: this screen
 * must not become a way to find out who has one.
 */
export function ForgotPasswordForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetRequestInput, unknown, PasswordResetRequestPayload>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: { email: "" },
  });

  const respond = useResponse();
  const { submit, submitting } = useApiMutation<PasswordResetRequestPayload, { accepted: boolean }>(
    AuthClient.requestPasswordReset,
    {
      // Once it is sent there is nothing left to do here, so the card offers
      // the one step that follows.
      onSuccess: () =>
        respond.success({
          title: UI_TEXT.outcomes.resetEmailSent,
          message: UI_TEXT.auth.resetSent,
          primary: { label: UI_TEXT.auth.backToSignIn, href: AUTH_ROUTES.signIn },
        }),
      onError: (failure) =>
        respond.failure(failure, { title: UI_TEXT.outcomes.resetNotSent, fallback: "AUTH_RESET_REQUEST_FAILED" }),
    },
  );

  return (
    <form method="post" onSubmit={handleSubmit((values) => submit(values))} className="space-y-5" noValidate>
      <TextField
        label={UI_TEXT.auth.emailLabel}
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder={UI_TEXT.auth.emailPlaceholder}
        required
        leading={<Mail size={18} strokeWidth={1.8} />}
        error={errors.email?.message}
        {...register("email")}
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
        label={submitting ? UI_TEXT.actions.saving : UI_TEXT.auth.sendResetEmail}
      />
    </form>
  );
}
