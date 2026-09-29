"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Mail, Smartphone, Trash2, TriangleAlert, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Medallion } from "@/components/ui/medallion";
import { PageHeader } from "@/components/ui/page-header";
import { useResponse } from "@/components/ui/response-card";
import { TextField } from "@/components/ui/text-field";
import { UI_TEXT } from "@/constants/messages";
import { useBusiness } from "@/features/business/hooks/useBusiness";
import { ApiError } from "@/lib/api/client";
import { useApiMutation } from "@/lib/query/useApiMutation";
import { deleteAccountSchema, type DeleteAccountInput, type DeleteAccountPayload } from "@/lib/validation";

import { useAuth } from "../AuthProvider";
import { PasswordField } from "./PasswordField";

const text = UI_TEXT.deleteAccount;

/** The refusals that belong beside the field they are about, rather than on a card. */
const FIELD_REFUSALS: Partial<Record<string, keyof DeleteAccountInput>> = {
  ACCOUNT_PHONE_MISMATCH: "phone",
  ACCOUNT_EMAIL_MISMATCH: "email",
  AUTH_PASSWORD_INCORRECT: "password",
};

/**
 * Deleting the account (plan §139.17.5, R8.10; the user, 2026-09-28: "fair
 * warnings heavy, and confirmation like ask to type in password twice along
 * with email and phone number").
 *
 * The screen says first, and plainly, what goes: the business with the
 * account, and everything recorded in it, for good. Then what to do before —
 * the bills to keep, and signing out for someone who only wants a break. The
 * owner types this account's sign-in number and email, and their password
 * twice; the server checks each. A confirm card asks once more, naming the
 * business, before anything is sent. Deleted, the browser forgets the account
 * and opens the sign-in screen, which says it is gone.
 */
export function DeleteAccount() {
  // Kept out of the React Compiler, as every react-hook-form screen is (R1.9).
  "use no memo";
  const { deleteAccount } = useAuth();
  const business = useBusiness();
  const respond = useResponse();
  const [leaving, setLeaving] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<DeleteAccountInput, unknown, DeleteAccountPayload>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { phone: "", email: "", password: "", confirmPassword: "" },
  });

  const { submit, submitting } = useApiMutation<DeleteAccountPayload, void>(deleteAccount, {
    onSuccess: () => setLeaving(true),
    onError: (failure) => {
      const field = failure instanceof ApiError ? FIELD_REFUSALS[failure.code] : undefined;
      if (field) {
        setError(field, { message: (failure as ApiError).message }, { shouldFocus: true });
        return;
      }
      respond.failure(failure, { title: text.notDeleted, fallback: "ACCOUNT_DELETE_FAILED" });
    },
  });

  const askThenDelete = async (values: DeleteAccountPayload) => {
    const sure = await respond.confirm({
      title: text.sureTitle,
      message: text.sureBody(business.data?.name ?? text.yourBusiness),
      confirmLabel: text.sureConfirm,
      cancelLabel: text.sureCancel,
      tone: "danger",
    });
    if (sure) await submit(values);
  };

  const busy = submitting || leaving;

  return (
    <div className="space-y-6">
      <PageHeader title={text.title} subtitle={text.subtitle} back="/settings" />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
        <div className="space-y-6">
          <section
            aria-labelledby="delete-warning"
            className="space-y-4 rounded-3xl border border-danger/30 bg-danger-bg p-5 shadow-card"
          >
            <div className="flex items-center gap-3">
              <Medallion icon={TriangleAlert} tone="danger" />
              <h2 id="delete-warning" className="font-heading text-xl font-medium leading-tight text-danger">
                {text.warningTitle}
              </h2>
            </div>
            <p className="text-sm font-medium text-danger">{text.warning}</p>
            <div>
              <h3 className="text-sm font-semibold text-text">{text.whatGoesTitle}</h3>
              <ul className="mt-2 space-y-2">
                {text.whatGoes.map((line) => (
                  <li key={line} className="flex gap-2 text-sm text-text">
                    <X size={16} strokeWidth={2.25} aria-hidden="true" className="mt-0.5 shrink-0 text-danger" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section
            aria-labelledby="delete-before"
            className="space-y-2 rounded-3xl border border-border bg-surface p-5 shadow-card"
          >
            <h2 id="delete-before" className="font-heading text-lg font-medium text-text">
              {text.beforeTitle}
            </h2>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-text-muted marker:text-border">
              {text.before.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        </div>

        <form
          aria-labelledby="delete-confirm"
          onSubmit={handleSubmit(askThenDelete)}
          noValidate
          className="space-y-4 rounded-3xl border border-border bg-surface p-5 shadow-card"
        >
          <div>
            <h2 id="delete-confirm" className="font-heading text-lg font-medium text-text">
              {text.confirmTitle}
            </h2>
            <p className="mt-1 text-sm text-text-muted">{text.confirmHint}</p>
          </div>

          <TextField
            label={text.phone}
            type="tel"
            inputMode="numeric"
            autoComplete="off"
            placeholder={UI_TEXT.fields.phonePlaceholder}
            required
            leading={<Smartphone size={18} strokeWidth={1.8} />}
            prefix={UI_TEXT.fields.phonePrefix}
            error={errors.phone?.message}
            {...register("phone")}
          />
          <TextField
            label={text.email}
            type="email"
            inputMode="email"
            autoComplete="off"
            placeholder={UI_TEXT.auth.emailPlaceholder}
            required
            leading={<Mail size={18} strokeWidth={1.8} />}
            error={errors.email?.message}
            {...register("email")}
          />
          <PasswordField
            label={text.password}
            autoComplete="current-password"
            required
            leading={<Lock size={18} strokeWidth={1.8} />}
            error={errors.password?.message}
            {...register("password")}
          />
          <PasswordField
            label={text.passwordAgain}
            autoComplete="off"
            required
            leading={<Lock size={18} strokeWidth={1.8} />}
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          <Button
            type="submit"
            variant="danger"
            size="lg"
            shape="pill"
            fullWidth
            icon={Trash2}
            loading={busy}
            label={busy ? text.deleting : text.submit}
          />
        </form>
      </div>
    </div>
  );
}
