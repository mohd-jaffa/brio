"use client";

import { KeyRound, MailCheck } from "lucide-react";

import { Button, LinkButton } from "@/components/ui/button";
import { useResponse } from "@/components/ui/response-card";
import { ScreenNotice } from "@/components/ui/screen-notice";
import { UI_TEXT } from "@/constants/messages";
import { ROLE_LABELS } from "@/constants/roles";
import { AUTH_ROUTES } from "@/constants/routes";
import { useApiMutation } from "@/lib/query/useApiMutation";

import { AuthClient } from "../api.client";
import { useAuth } from "../AuthProvider";

/**
 * The account a baker is signed in as, on the Settings screen. It reads what
 * the session already knows, so it needs no endpoint of its own — and it is
 * where the password is changed from, rather than only after a reset, and
 * where an unconfirmed email's link is sent again (BUG-16).
 */
export function AccountSummary() {
  const { profile } = useAuth();
  const respond = useResponse();
  const resend = useApiMutation<void, { queued: boolean }>(() => AuthClient.resendConfirmation(), {
    onSuccess: () =>
      respond.success({
        title: UI_TEXT.outcomes.confirmationSent,
        message: UI_TEXT.auth.confirmationSentTo(profile?.email ?? ""),
      }),
    onError: (failure) => respond.failure(failure, { title: UI_TEXT.outcomes.confirmationNotSent }),
  });

  if (!profile) return null;

  const details: Array<[string, string]> = [
    ["Name", profile.name],
    ["Mobile number", profile.phone],
    ["Email address", profile.email],
    ["Role", ROLE_LABELS[profile.role]],
  ];

  return (
    <section className="space-y-5 rounded-3xl border border-border bg-surface p-6 shadow-card">
      <div>
        <h2 className="mb-1 font-heading text-sm font-bold uppercase tracking-wider text-text">
          Your Account
        </h2>
        <p className="text-xs font-medium text-text-muted">
          How you sign in. Your business&rsquo;s own details are above.
        </p>
      </div>

      {!profile.emailConfirmedAt && (
        <div className="space-y-3">
          <ScreenNotice tone="info">{UI_TEXT.auth.notConfirmed}</ScreenNotice>
          <Button
            label={UI_TEXT.auth.resendConfirmation}
            variant="secondary"
            icon={MailCheck}
            loading={resend.submitting}
            onClick={() => void resend.submit()}
          />
        </div>
      )}

      <dl className="grid gap-4 sm:grid-cols-2">
        {details.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-bold uppercase tracking-wider text-text-muted">{label}</dt>
            <dd className="mt-0.5 text-sm font-semibold text-text">{value}</dd>
          </div>
        ))}
      </dl>

      <LinkButton
        href={AUTH_ROUTES.changePassword}
        label="Change password"
        variant="secondary"
        icon={KeyRound}
      />
    </section>
  );
}
