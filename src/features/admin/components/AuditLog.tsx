"use client";

import { ScrollText } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { ListScreen } from "@/components/ui/list-screen";
import { PageHeader } from "@/components/ui/page-header";
import { UI_TEXT } from "@/constants/messages";
import { formatDateTime } from "@/lib/format/date";
import { apiRoutes } from "@/lib/query/keys";
import { useApiPages } from "@/lib/query/useApiPages";

import type { AdminAuditEntry } from "../types";
import { JsonBlock } from "./JsonBlock";

const text = UI_TEXT.admin;

function Entry({ entry }: { entry: AdminAuditEntry }) {
  return (
    <article className="space-y-2 rounded-2xl border border-border bg-surface p-4 shadow-card">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="rounded-md bg-primary-soft px-2 py-0.5 font-mono text-xs font-semibold text-primary">
          {entry.action}
        </span>
        <h2 className="text-sm font-semibold text-text">{entry.entityType}</h2>
        <span className="min-w-0 truncate font-mono text-xs text-text-muted">{entry.entityId}</span>
        <time dateTime={entry.createdAt} className="ml-auto text-xs tabular-nums text-text-muted">
          {formatDateTime(entry.createdAt)}
        </time>
      </header>
      <p className="text-sm text-text-muted">
        {text.by(entry.actor ?? text.unknownActor)}
        {entry.business && ` · ${entry.business}`}
      </p>
      <details className="group">
        <summary className="touch-target flex cursor-pointer items-center text-sm font-medium text-primary">
          {text.beforeAndAfter}
        </summary>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <JsonBlock label={text.before} value={entry.before} />
          <JsonBlock label={text.after} value={entry.after} />
        </div>
      </details>
    </article>
  );
}

/**
 * The audit trail of every business, newest first (plan §5, §11, §37): what
 * was done, to what, by whom and for which business, with the values before
 * and after. It is the trail the app already keeps; nothing is added to it.
 */
export function AuditLog() {
  const entries = useApiPages<AdminAuditEntry>(apiRoutes.admin.audit);
  return (
    <div className="space-y-6">
      <PageHeader title={text.auditTitle} subtitle={text.auditSubtitle} />
      <ListScreen
        query={entries}
        loadFailed="ADMIN_AUDIT_LOAD_FAILED"
        data={entries.data}
        empty={<EmptyState icon={ScrollText} title={text.auditEmpty} />}
        keyOf={(entry) => entry.id}
        renderItem={(entry) => <Entry entry={entry} />}
      />
    </div>
  );
}
