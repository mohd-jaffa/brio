"use client";

import { Users } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { ListScreen } from "@/components/ui/list-screen";
import { PageHeader } from "@/components/ui/page-header";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { UI_TEXT } from "@/constants/messages";
import { ROLE_LABELS } from "@/constants/roles";
import { formatDate } from "@/lib/format/date";
import { dayKey } from "@/lib/dates/calendar";
import { formatPhoneDigits } from "@/lib/phone";
import { apiRoutes } from "@/lib/query/keys";
import { useApiPages } from "@/lib/query/useApiPages";

import type { AdminAccount } from "../types";

const text = UI_TEXT.admin;

/** A small label on an account: its role, or something outstanding on it. */
function Badge({ tone, children }: { tone: "primary" | "warning" | "danger"; children: string }) {
  const tones = {
    primary: "bg-primary-soft text-primary",
    warning: "bg-warning-bg text-warning",
    danger: "bg-danger-bg text-danger",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

function Account({ account }: { account: AdminAccount }) {
  return (
    <article className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
      <header className="flex items-center gap-3">
        <ProfileAvatar avatar={account.avatar} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-text">{account.name}</h2>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge tone="primary">{ROLE_LABELS[account.role]}</Badge>
            {!account.active && <Badge tone="danger">{text.inactive}</Badge>}
            {!account.emailConfirmedAt && <Badge tone="warning">{text.emailUnconfirmed}</Badge>}
            {account.mustChangePassword && <Badge tone="warning">{text.owesPasswordChange}</Badge>}
          </div>
        </div>
      </header>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0">
          <dt className="text-xs text-text-muted">{text.mobile}</dt>
          <dd className="truncate tabular-nums text-text">
            {UI_TEXT.fields.phonePrefix} {formatPhoneDigits(account.phone)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-text-muted">{text.email}</dt>
          <dd className="truncate text-text">{account.email}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-text-muted">{text.business}</dt>
          <dd className="truncate text-text">
            {account.business
              ? [account.business.name, account.business.city].filter(Boolean).join(", ")
              : text.noBusiness}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-text-muted">{text.joined}</dt>
          <dd className="text-text">{formatDate(dayKey(account.createdAt))}</dd>
        </div>
      </dl>
    </article>
  );
}

/** Every account on the platform, newest first, a page at a time (plan §37). Read-only. */
export function Accounts() {
  const accounts = useApiPages<AdminAccount>(apiRoutes.admin.users);
  return (
    <div className="space-y-6">
      <PageHeader title={text.usersTitle} subtitle={text.usersSubtitle} />
      <ListScreen
        query={accounts}
        loadFailed="ADMIN_USERS_LOAD_FAILED"
        data={accounts.data}
        empty={<EmptyState icon={Users} title={text.usersEmpty} />}
        keyOf={(account) => account.id}
        renderItem={(account) => <Account account={account} />}
      />
    </div>
  );
}
