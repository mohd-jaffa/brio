import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { UI_TEXT } from "@/constants/messages";

/**
 * The title block at the top of a screen (plan §139.5): a way back, a serif
 * title, a line saying what the screen is for, and the one control that
 * belongs beside it — a range picker, or a way to add something. The title is
 * the screen's one first-level heading.
 *
 * The control stays beside the title while the title keeps at least 15rem;
 * a wider one — Mark all as read, a range picker — drops to its own line
 * under the subtitle on a phone rather than squeezing it. The block keeps
 * 24 px below it on every screen, so the title always stands clear of the
 * search and tabs that bind to the list beneath.
 */
export function PageHeader({
  title,
  subtitle,
  back,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Where the back arrow goes; no arrow on a top-level screen. */
  back?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start gap-x-2 gap-y-3">
      <div className="flex min-w-[min(100%,15rem)] flex-1 items-start gap-2">
        {back && (
          <Link
            href={back}
            aria-label={UI_TEXT.actions.back}
            className="touch-target -ml-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-text transition-colors hover:bg-surface-hover"
          >
            <ArrowLeft size={22} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        )}
        <div className="min-w-0 flex-1 pt-0.5">
          <h1 className="font-heading text-[1.75rem] font-medium leading-tight tracking-tight text-text sm:text-3xl">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-2 pt-0.5">{children}</div>}
    </div>
  );
}
