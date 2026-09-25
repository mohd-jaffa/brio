import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { UI_TEXT } from "@/constants/messages";

/**
 * The title block at the top of a screen (plan §139.5): a way back, a serif
 * title, a line saying what the screen is for, and the one control that
 * belongs beside it — a range picker, or a way to add something. The title is
 * the screen's one first-level heading.
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
    <div className="flex items-start gap-2">
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
      {children && <div className="flex shrink-0 items-center gap-2 pt-0.5">{children}</div>}
    </div>
  );
}
