"use client";

import { Building2, ScrollText, Users } from "lucide-react";

import { LoadFailed } from "@/components/ui/list-screen";
import { PageHeader } from "@/components/ui/page-header";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { ScreenNotice } from "@/components/ui/screen-notice";
import { SkeletonRows } from "@/components/ui/skeleton";
import { StatTile } from "@/components/ui/stat-tile";
import { UI_TEXT } from "@/constants/messages";
import { ROLE_LABELS } from "@/constants/roles";
import { useAuth } from "@/features/auth/AuthProvider";
import { formatPhoneDigits } from "@/lib/phone";
import { apiRoutes } from "@/lib/query/keys";
import { useApiQuery } from "@/lib/query/useApiQuery";

import type { AdminOverview } from "../types";

const text = UI_TEXT.admin;

/** The developer signed in: who, how they sign in, and their role. */
function SignedInCard() {
  const { profile } = useAuth();
  if (!profile) return null;
  return (
    <section
      aria-label={text.signedInAs}
      className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-card"
    >
      <ProfileAvatar avatar={profile.avatar} size="lg" />
      <div className="min-w-0 space-y-0.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">{text.signedInAs}</p>
        <p className="truncate text-lg font-semibold text-text">{profile.name}</p>
        <p className="truncate text-sm text-text-muted">
          {ROLE_LABELS[profile.role]} · {UI_TEXT.fields.phonePrefix} {formatPhoneDigits(profile.phone)} · {profile.email}
        </p>
      </div>
    </section>
  );
}

/**
 * The console's first page (plan §37): who is signed in, and the platform at
 * a glance — how many accounts, owners and developers, businesses and audit
 * entries. It says plainly what is kept
 * and what is not (the user, 2026-09-27: "show whatever log is being saved
 * now").
 */
export function Overview() {
  const overview = useApiQuery<AdminOverview>(apiRoutes.admin.overview);
  const data = overview.data;

  return (
    <div className="space-y-6">
      <PageHeader title={text.overviewTitle} subtitle={text.overviewSubtitle} />
      <SignedInCard />
      {data ? (
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile icon={Users} label={text.totalUsers} value={String(data.users.total)} />
          <StatTile icon={Building2} label={text.businesses} value={String(data.businesses)} />
          <StatTile icon={ScrollText} label={text.auditEntries} value={String(data.audit.total)} />
        </dl>
      ) : overview.error ? (
        <LoadFailed query={overview} loadFailed="ADMIN_OVERVIEW_LOAD_FAILED" />
      ) : (
        <section aria-busy="true">
          <SkeletonRows rows={2} />
        </section>
      )}
      {data && (
        <p className="text-sm text-text-muted">
          {text.usersBreakdown(data.users.owners, data.users.developers)} · {text.auditLastDay(data.audit.lastDay)}
        </p>
      )}
      <ScreenNotice tone="info">{text.keptNote}</ScreenNotice>
    </div>
  );
}
