"use client";

import { Heart, Info, KeyRound, MailCheck, Palette, Store } from "lucide-react";
import Image from "next/image";

import { PLATE_FOCUS, PLATES } from "@/assets/plates";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Medallion } from "@/components/ui/medallion";
import { PageHeader } from "@/components/ui/page-header";
import { useResponse } from "@/components/ui/response-card";
import { Row, RowList } from "@/components/ui/row";
import { ScreenNotice } from "@/components/ui/screen-notice";
import { SectionHeading } from "@/components/ui/section-heading";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import { UI_TEXT } from "@/constants/messages";
import { ROLE_LABELS } from "@/constants/roles";
import { AUTH_ROUTES } from "@/constants/routes";
import { useBusiness } from "@/features/business/hooks/useBusiness";
import { publicAppVersion } from "@/lib/env/public";
import { formatPhoneDigits } from "@/lib/phone";
import { useApiMutation } from "@/lib/query/useApiMutation";

import { AuthClient } from "../api.client";
import { useAuth } from "../AuthProvider";
import { SignOutRow } from "./SignOutRow";

const text = UI_TEXT.settings;
const PLATE = "drip-cake";

/** An email address not yet confirmed, and the link sent again to it (BUG-16). */
function Unconfirmed({ email }: { email: string }) {
  const respond = useResponse();
  const resend = useApiMutation<void, { queued: boolean }>(() => AuthClient.resendConfirmation(), {
    onSuccess: () =>
      respond.success({ title: UI_TEXT.outcomes.confirmationSent, message: UI_TEXT.auth.confirmationSentTo(email) }),
    onError: (failure) => respond.failure(failure, { title: UI_TEXT.outcomes.confirmationNotSent }),
  });
  return (
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
  );
}

/**
 * Settings (plan §139.10, R5.11), with the reference's Profile screen folded
 * in: who is signed in, for which business, and its catch phrase; then
 * Business details, the account — where the password is changed from, and an
 * unconfirmed email's link is sent again (BUG-16) — the theme, About with the
 * version and who made the app (the user, 2026-09-26, in place of Q16's
 * illustration credit), and Sign out. The profile
 * stays beside the rest on a desktop. Notifications joins with its screen
 * (R5.10), and the privacy policy with its page (R8.10).
 */
export function Settings() {
  const { profile } = useAuth();
  const business = useBusiness();

  if (!profile) return null;

  const role = ROLE_LABELS[profile.role];
  const account: [string, string][] = [
    [text.name, profile.name],
    [text.phone, `${UI_TEXT.fields.phonePrefix} ${formatPhoneDigits(profile.phone)}`],
    [text.email, profile.email],
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={text.title} subtitle={text.subtitle} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <section
          aria-label={profile.name}
          className="overflow-hidden rounded-3xl border border-border bg-surface shadow-card lg:sticky lg:top-24"
        >
          <div className="relative h-24">
            <Image
              src={PLATES[PLATE]}
              alt=""
              fill
              sizes="(min-width: 1024px) 20rem, 100vw"
              className="object-cover"
              style={{ objectPosition: PLATE_FOCUS[PLATE] }}
            />
          </div>
          <div className="relative -mt-8 px-5 pb-5">
            <Avatar name={profile.name} size="lg" className="ring-4 ring-surface" />
            <h2 className="mt-3 font-heading text-2xl font-medium leading-tight text-text">{profile.name}</h2>
            <p className="mt-0.5 text-sm text-text-muted">
              {business.data ? text.owner(role, business.data.name) : role}
            </p>
            {business.data?.tagline && (
              <blockquote className="mt-4 rounded-2xl bg-sunken px-4 py-3 text-center font-heading text-lg leading-snug text-text">
                <p>&ldquo;{business.data.tagline}&rdquo;</p>
              </blockquote>
            )}
          </div>
        </section>

        <div className="min-w-0 space-y-6">
          <section aria-labelledby="settings-business">
            <SectionHeading id="settings-business" title={text.business} />
            <RowList>
              <Row
                href="/business"
                leading={<Medallion icon={Store} size="sm" />}
                title={UI_TEXT.nav.places.business}
                subtitle={UI_TEXT.nav.hints.business}
              />
            </RowList>
          </section>

          <section aria-labelledby="settings-account" className="space-y-3">
            <SectionHeading id="settings-account" title={text.account} />
            {!profile.emailConfirmedAt && <Unconfirmed email={profile.email} />}
            <dl className="divide-y divide-border rounded-2xl border border-border bg-surface shadow-card">
              {account.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 px-4 py-3">
                  <dt className="shrink-0 text-sm text-text-muted">{label}</dt>
                  <dd className="min-w-0 truncate text-right text-sm font-semibold text-text">{value}</dd>
                </div>
              ))}
            </dl>
            <RowList>
              <Row
                href={AUTH_ROUTES.changePassword}
                leading={<Medallion icon={KeyRound} size="sm" />}
                title={text.changePassword}
                subtitle={text.changePasswordHint}
              />
            </RowList>
          </section>

          <section aria-labelledby="settings-appearance">
            <SectionHeading id="settings-appearance" title={text.appearance} />
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
              <Medallion icon={Palette} size="sm" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <ThemeSwitch />
                <p className="text-xs text-text-muted">{text.appearanceHint}</p>
              </div>
            </div>
          </section>

          <section aria-labelledby="settings-about">
            <SectionHeading id="settings-about" title={text.about} />
            <RowList>
              <Row
                leading={<Medallion icon={Info} tone="neutral" size="sm" />}
                title={text.version}
                trailing={<span className="tabular-nums">{publicAppVersion()}</span>}
              />
              <Row
                leading={<Medallion icon={Heart} tone="neutral" size="sm" />}
                title={text.craftedBy}
                trailing={text.maker}
              />
            </RowList>
          </section>

          <RowList>
            <SignOutRow />
          </RowList>
        </div>
      </div>
    </div>
  );
}
