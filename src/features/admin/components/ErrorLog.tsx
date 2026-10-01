"use client";

import { TriangleAlert } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { ListScreen } from "@/components/ui/list-screen";
import { PageHeader } from "@/components/ui/page-header";
import { SearchField } from "@/components/ui/search-field";
import { StatusPill } from "@/components/ui/status-pill";
import { UI_TEXT } from "@/constants/messages";
import { ERROR_SOURCE_LABELS } from "@/constants/statuses";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatDateTime } from "@/lib/format/date";
import { apiRoutes, withQuery } from "@/lib/query/keys";
import { useApiPages } from "@/lib/query/useApiPages";

import type { AdminErrorEntry } from "../types";
import { JsonBlock } from "./JsonBlock";

const text = UI_TEXT.admin;

/** A stored line of text as a developer reads it: the mono face, scrolling rather than breaking the page. */
function TextBlock({ label, value }: { label: string; value: string }) {
  return (
    <figure aria-label={label} className="min-w-0 space-y-1">
      <figcaption className="text-xs font-semibold uppercase tracking-wider text-text-muted">{label}</figcaption>
      <pre className="max-h-72 overflow-auto whitespace-pre rounded-lg border border-border bg-sunken p-3 font-mono text-xs leading-relaxed text-text">
        {value}
      </pre>
    </figure>
  );
}

function Entry({ entry }: { entry: AdminErrorEntry }) {
  const where = [entry.method, entry.path].filter(Boolean).join(" ");
  const what = [entry.code, entry.kind].filter(Boolean).join(" · ");
  const status = [ERROR_SOURCE_LABELS[entry.source], entry.httpStatus].filter(Boolean).join(" · ");
  const thrown = entry.detail || entry.stack || entry.context != null;
  return (
    <article className="space-y-2 rounded-2xl border border-border bg-surface p-4 shadow-card">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <StatusPill label={status} tone="cancelled" />
        <h2 className="min-w-0 text-sm font-semibold text-text">{entry.message}</h2>
        <time dateTime={entry.createdAt} className="ml-auto text-xs tabular-nums text-text-muted">
          {formatDateTime(entry.createdAt)}
        </time>
      </header>
      {where && <p className="break-all font-mono text-xs text-text">{where}</p>}
      {what && <p className="font-mono text-xs text-text-muted">{what}</p>}
      {entry.reference && (
        <p className="text-sm text-text-muted">
          {text.reference}: <span className="select-all break-all font-mono text-xs text-text">{entry.reference}</span>
        </p>
      )}
      <p className="text-sm text-text-muted">
        {entry.user ? text.by(entry.user) : text.signedOut}
        {entry.business && ` · ${entry.business}`}
      </p>
      {thrown && (
        <details className="group">
          <summary className="touch-target flex cursor-pointer items-center text-sm font-medium text-primary">
            {text.detailAndStack}
          </summary>
          <div className="mt-2 grid gap-3">
            {entry.detail && <TextBlock label={text.detail} value={entry.detail} />}
            {entry.stack && <TextBlock label={text.stack} value={entry.stack} />}
            {entry.context != null && <JsonBlock label={text.context} value={entry.context} />}
          </div>
        </details>
      )}
    </article>
  );
}

/**
 * What failed on the server, newest first (plan §37, §103; the user,
 * 2026-09-30): a request that could not be served, a screen that could not be
 * drawn, work that did not finish — where, which reference the person was
 * shown, who was asking and for which business, and what was thrown. A search
 * finds a quoted reference, or words of the message. Kept seven days.
 */
export function ErrorLog() {
  const [search, setSearch] = useState("");
  const searched = useDebouncedValue(search.trim());
  const entries = useApiPages<AdminErrorEntry>(withQuery(apiRoutes.admin.logs, { search: searched }));
  return (
    <div className="space-y-6">
      <PageHeader title={text.logsTitle} subtitle={text.logsSubtitle} />
      <SearchField value={search} onChange={setSearch} placeholder={text.logsSearch} />
      <ListScreen
        query={entries}
        loadFailed="ADMIN_LOGS_LOAD_FAILED"
        data={entries.data}
        empty={
          <EmptyState icon={TriangleAlert} title={searched ? UI_TEXT.states.noResults(searched) : text.logsEmpty} />
        }
        keyOf={(entry) => entry.id}
        renderItem={(entry) => <Entry entry={entry} />}
      />
    </div>
  );
}
