import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "./cn";

/**
 * Rows share one card, split by hairlines (plan §139.5): a list of orders, of
 * customers, of expenses. Each child is a `Row`.
 */
export function RowList({ label, children, className }: { label?: string; children: ReactNode; className?: string }) {
  return (
    <ul
      role="list"
      aria-label={label}
      className={cn(
        "divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-card",
        className,
      )}
    >
      {children}
    </ul>
  );
}

/**
 * One line of a list: a tile or an avatar, a title with a line or two under
 * it, what it amounts to (an amount, a pill), and a chevron when it goes
 * somewhere. It is a link with `href` (and `onClick` runs as it is followed),
 * a button with only `onClick`, and plain otherwise; the whole row is the
 * target, so it is easy to hit.
 */
export function Row({
  leading,
  title,
  subtitle,
  meta,
  trailing,
  href,
  onClick,
  chevron = href !== undefined || onClick !== undefined,
  arriving = false,
}: {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  href?: string;
  onClick?: () => void;
  chevron?: boolean;
  /** It has just joined the list — a payment recorded a moment ago — and drops into place. */
  arriving?: boolean;
}) {
  const body = (
    <>
      {leading && <span className="shrink-0">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-text">{title}</span>
        {subtitle && <span className="mt-0.5 block truncate text-sm text-text-muted">{subtitle}</span>}
        {meta && <span className="mt-0.5 block truncate text-xs text-text-muted">{meta}</span>}
      </span>
      {trailing && (
        <span className="flex shrink-0 flex-col items-end gap-1.5 text-sm font-semibold text-text">{trailing}</span>
      )}
      {chevron && <ChevronRight size={18} strokeWidth={1.75} className="shrink-0 text-text-muted" aria-hidden="true" />}
    </>
  );
  const layout = "flex w-full items-center gap-3 px-4 py-3 text-left";
  const interactive = "focus-inset transition-colors hover:bg-surface-hover";

  return (
    <li className={arriving ? "animate-drop-in" : undefined}>
      {href !== undefined ? (
        <Link href={href} onClick={onClick} className={cn(layout, interactive)}>
          {body}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={cn(layout, interactive)}>
          {body}
        </button>
      ) : (
        <div className={layout}>{body}</div>
      )}
    </li>
  );
}
