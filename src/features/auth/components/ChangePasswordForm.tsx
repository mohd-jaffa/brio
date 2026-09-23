"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { ScreenNotice } from "@/components/ui/screen-notice";
import { UI_TEXT } from "@/constants/messages";
import { HOME_ROUTE } from "@/constants/routes";
import { useApiMutation } from "@/lib/query/useApiMutation";
import {
  changePasswordSchema,
  type ChangePasswordInput,
  type ChangePasswordPayload,
} from "@/lib/validation";

import { AuthClient } from "../api.client";
import { useAuth } from "../AuthProvider";
import type { AuthSessionView } from "../types";
import { PasswordField } from "./PasswordField";

/**
 * Replacing a password (plan §95). A baker sent here by a temporary password
 * cannot reach any other screen until this is done, so the reason is stated
 * rather than left to be inferred from the redirect.
 */
export function ChangePasswordForm() {
  const router = useRouter();
  const { requiresPasswordChange, adopt } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordInput, unknown, ChangePasswordPayload>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const { submit, submitting, error } = useApiMutation<ChangePasswordPayload, AuthSessionView>(
    AuthClient.changePassword,
    {
      fallback: "AUTH_PASSWORD_CHANGE_FAILED",
      onSuccess: async (session) => {
        await adopt(session);
        router.replace(HOME_ROUTE);
      },
    },
  );

  return (
    <form onSubmit={handleSubmit((values) => submit(values))} className="space-y-5" noValidate>
      {requiresPasswordChange && !error && (
        <ScreenNotice tone="info">{UI_TEXT.auth.temporaryPasswordNotice}</ScreenNotice>
      )}
      {error && <ScreenNotice>{error}</ScreenNotice>}

      <PasswordField
        label={UI_TEXT.auth.newPasswordLabel}
        autoComplete="new-password"
        hint={UI_TEXT.auth.passwordHint}
        required
        error={errors.newPassword?.message}
        {...register("newPassword")}
      />

      <PasswordField
        label={UI_TEXT.auth.confirmPasswordLabel}
        autoComplete="new-password"
        required
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      <Button
        type="submit"
        fullWidth
        loading={submitting}
        icon={KeyRound}
        label={submitting ? UI_TEXT.actions.saving : UI_TEXT.auth.setNewPassword}
      />
    </form>
  );
}
