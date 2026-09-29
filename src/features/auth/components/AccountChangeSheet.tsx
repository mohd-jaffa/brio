"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { FormSheet } from "@/components/ui/form-sheet";
import { useResponse, type Respond } from "@/components/ui/response-card";
import { TextField } from "@/components/ui/text-field";
import { UI_TEXT } from "@/constants/messages";
import { useKept } from "@/hooks/useKept";
import { useOpeningKey } from "@/hooks/useOpeningKey";
import { ApiError } from "@/lib/api/client";
import { formatPhoneDigits } from "@/lib/phone";
import { useApiMutation } from "@/lib/query/useApiMutation";
import {
  changeEmailSchema,
  changeNameSchema,
  changePhoneSchema,
  type ChangeEmailInput,
  type ChangeEmailPayload,
  type ChangeNameInput,
  type ChangeNamePayload,
  type ChangePhoneInput,
  type ChangePhonePayload,
} from "@/lib/validation";

import { AuthClient } from "../api.client";
import { useAuth } from "../AuthProvider";
import type { AuthProfile } from "../types";
import { PasswordField } from "./PasswordField";

const text = UI_TEXT.settings;

export type AccountField = "name" | "phone" | "email";

/** The refusals that belong beside a field rather than on a card: the value itself, or the password. */
const FIELD_REFUSALS: Partial<Record<string, "value" | "password">> = {
  PROFILE_VALUE_SAME: "value",
  AUTH_PHONE_ALREADY_EXISTS: "value",
  AUTH_EMAIL_ALREADY_EXISTS: "value",
  AUTH_PASSWORD_INCORRECT: "password",
};

/** A refusal beside the field it is about, where the form has that field; on a card otherwise. */
function refuse(
  failure: unknown,
  respond: Respond,
  besides: (where: "value" | "password", message: string) => boolean,
) {
  const where = failure instanceof ApiError ? FIELD_REFUSALS[failure.code] : undefined;
  if (where && besides(where, (failure as ApiError).message)) return;
  respond.failure(failure, { title: UI_TEXT.outcomes.detailNotChanged, fallback: "SAVE_FAILED" });
}

interface FormProps {
  open: boolean;
  onClose: () => void;
}

function NameForm({ open, onClose }: FormProps) {
  // Kept out of the React Compiler, as every react-hook-form sheet is (R1.9).
  "use no memo";
  const { profile, reload } = useAuth();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ChangeNameInput, unknown, ChangeNamePayload>({
    resolver: zodResolver(changeNameSchema),
    defaultValues: { name: profile?.name ?? "" },
  });
  const respond = useResponse();
  const { submit, submitting } = useApiMutation<ChangeNamePayload, AuthProfile>(AuthClient.changeName, {
    onSuccess: async () => {
      await reload();
      onClose();
      respond.success({ title: UI_TEXT.outcomes.nameChanged });
    },
    onError: (failure) =>
      refuse(failure, respond, (where, message) => {
        if (where !== "value") return false;
        setError("name", { message });
        return true;
      }),
  });

  return (
    <FormSheet
      open={open}
      title={text.change.name}
      onClose={onClose}
      onSubmit={handleSubmit((values) => submit(values))}
      submitLabel={text.save}
      submitting={submitting}
    >
      <TextField label={text.newName} required autoComplete="name" error={errors.name?.message} {...register("name")} />
      <p className="text-xs text-text-muted">{text.onceAMonth}</p>
    </FormSheet>
  );
}

function PhoneForm({ open, onClose }: FormProps) {
  "use no memo";
  const { reload } = useAuth();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ChangePhoneInput, unknown, ChangePhonePayload>({
    resolver: zodResolver(changePhoneSchema),
    defaultValues: { phone: "", password: "" },
  });
  const respond = useResponse();
  const { submit, submitting } = useApiMutation<ChangePhonePayload, AuthProfile>(AuthClient.changePhone, {
    onSuccess: async (saved) => {
      await reload();
      onClose();
      respond.success({
        title: UI_TEXT.outcomes.phoneChanged,
        message: UI_TEXT.outcomes.phoneChangedNote(`${UI_TEXT.fields.phonePrefix} ${formatPhoneDigits(saved.phone)}`),
      });
    },
    onError: (failure) =>
      refuse(failure, respond, (where, message) => {
        setError(where === "value" ? "phone" : "password", { message });
        return true;
      }),
  });

  return (
    <FormSheet
      open={open}
      title={text.change.phone}
      onClose={onClose}
      onSubmit={handleSubmit((values) => submit(values))}
      submitLabel={text.save}
      submitting={submitting}
    >
      <TextField
        label={text.newPhone}
        required
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder={UI_TEXT.fields.phonePlaceholder}
        prefix={UI_TEXT.fields.phonePrefix}
        hint={text.newPhoneNote}
        error={errors.phone?.message}
        {...register("phone")}
      />
      <PasswordField
        label={text.currentPassword}
        required
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <p className="text-xs text-text-muted">{text.onceAMonth}</p>
    </FormSheet>
  );
}

function EmailForm({ open, onClose }: FormProps) {
  "use no memo";
  const { reload } = useAuth();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ChangeEmailInput, unknown, ChangeEmailPayload>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: { email: "", password: "" },
  });
  const respond = useResponse();
  const { submit, submitting } = useApiMutation<ChangeEmailPayload, AuthProfile>(AuthClient.changeEmail, {
    onSuccess: async (saved) => {
      await reload();
      onClose();
      respond.success({
        title: UI_TEXT.outcomes.emailPending,
        message: UI_TEXT.outcomes.emailPendingNote(saved.pendingEmail ?? ""),
      });
    },
    onError: (failure) =>
      refuse(failure, respond, (where, message) => {
        setError(where === "value" ? "email" : "password", { message });
        return true;
      }),
  });

  return (
    <FormSheet
      open={open}
      title={text.change.email}
      onClose={onClose}
      onSubmit={handleSubmit((values) => submit(values))}
      submitLabel={text.save}
      submitting={submitting}
    >
      <TextField
        label={text.newEmail}
        required
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder={UI_TEXT.auth.emailPlaceholder}
        hint={text.newEmailNote}
        error={errors.email?.message}
        {...register("email")}
      />
      <PasswordField
        label={text.currentPassword}
        required
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <p className="text-xs text-text-muted">{text.onceAMonth}</p>
    </FormSheet>
  );
}

/**
 * One of the owner's own details changed (plan §139.10; the user,
 * 2026-09-26): the name; the sign-in number, or the email, each with the
 * current password. A new email waits for the link sent to it. A refusal
 * about the value or the password sits beside it; anything else is a card
 * over the sheet, which stays open to be put right. A fresh form for each
 * opening, and the sheet leaves showing the one it opened for.
 */
export function AccountChangeSheet({ field, onClose }: { field: AccountField | undefined; onClose: () => void }) {
  const open = field !== undefined;
  const shown = useKept(field, open);
  const opening = useOpeningKey(open);
  if (shown === "phone") return <PhoneForm key={opening} open={open} onClose={onClose} />;
  if (shown === "email") return <EmailForm key={opening} open={open} onClose={onClose} />;
  return <NameForm key={opening} open={open} onClose={onClose} />;
}
