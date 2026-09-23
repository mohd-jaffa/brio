"use client";

import { KeyRound } from "lucide-react";

import { LinkButton } from "@/components/ui/button";
import { ScreenNotice } from "@/components/ui/screen-notice";
import { ROLE_LABELS } from "@/constants/roles";
import { AUTH_ROUTES } from "@/constants/routes";

import { useAuth } from "../AuthProvider";

/**
 * The account a baker is signed in as, on the Settings screen. It reads what
 * the session already knows, so it needs no endpoint of its own — and it is
 * where the password is changed from, rather than only after a reset.
 */
export function AccountSummary() {
  const { profile } = useAuth();

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
          How you sign in. Your bakery&rsquo;s own details are above.
        </p>
      </div>

      {!profile.emailConfirmedAt && (
        <ScreenNotice tone="info">
          Your email address is not confirmed yet. Use the link in the email we sent you.
        </ScreenNotice>
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
