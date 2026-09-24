"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button, LinkButton } from "@/components/ui/button";
import { ScreenNotice } from "@/components/ui/screen-notice";
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
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetRequestInput, unknown, PasswordResetRequestPayload>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: { email: "" },
  });

  const { submit, submitting, error } = useApiMutation<
    PasswordResetRequestPayload,
    { accepted: boolean }
  >(AuthClient.requestPasswordReset, {
    fallback: "AUTH_RESET_REQUEST_FAILED",
    onSuccess: () => setSent(true),
  });

  // Once it has been sent there is nothing left to do here, so the screen
  // says so and offers the one step that follows rather than leaving the
  // baker on a dead form.
  if (sent) {
    return (
      <div className="space-y-5">
        <ScreenNotice tone="info">{UI_TEXT.auth.resetSent}</ScreenNotice>
        <LinkButton
          href={AUTH_ROUTES.signIn}
          variant="action"
          size="lg"
          shape="pill"
          fullWidth
          label={UI_TEXT.auth.backToSignIn}
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((values) => submit(values))} className="space-y-5" noValidate>
      {error && <ScreenNotice>{error}</ScreenNotice>}

      <TextField
        label={UI_TEXT.auth.emailLabel}
        labelCase="sentence"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="priya@example.com"
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
