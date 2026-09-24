"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { UI_TEXT } from "@/constants/messages";

import { BrandMark } from "./BrandMark";

/**
 * The frame every authentication screen shares (plan §137). Daylight on a
 * warm wall, the bakery's mark and promise set over it, and a cream sheet that
 * rises from the bottom carrying the form.
 *
 * The backdrop is built from light and colour rather than a photograph: the
 * references are mockups with the interface drawn into them, so there is no
 * plate to cut out, and a stand-in would read worse than the atmosphere does.
 * `--auth-photo` in globals.css is where a real one goes when there is one.
 */
export function AuthScene({
  headline,
  intro,
  counterpart,
  backHref,
  children,
  footer,
}: {
  /** Two or three words per line; the line breaks are the composition. */
  headline: readonly string[];
  intro: string;
  /** The other front door. The screens behind it have none. */
  counterpart?: { question: string; label: string; href: string };
  backHref?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="auth-canvas flex min-h-dvh flex-col text-ink">
      <header className="safe-top [--safe-pt:1.25rem] mx-auto flex w-full max-w-xl items-start justify-between gap-4 px-6">
        {backHref ? (
          <Link
            href={backHref}
            aria-label={UI_TEXT.actions.back}
            className="touch-target -ml-2 flex items-center justify-center rounded-full text-ink/80 transition-colors hover:text-ink"
          >
            <ArrowLeft size={22} strokeWidth={2} aria-hidden="true" />
          </Link>
        ) : (
          <span aria-hidden="true" />
        )}

        {counterpart && (
          <p className="pt-1 text-right text-sm font-medium text-ink-muted">
            {counterpart.question}{" "}
            <Link
              href={counterpart.href}
              className="font-semibold text-ink underline decoration-primary/60 decoration-2 underline-offset-4 transition-colors hover:decoration-primary"
            >
              {counterpart.label}
            </Link>
          </p>
        )}
      </header>

      <div className="mx-auto w-full max-w-xl flex-1 px-6 pb-10 pt-6">
        <span className="block text-primary">
          <BrandMark />
        </span>

        <p className="mt-3 font-display text-[1.75rem] font-semibold leading-none tracking-[-0.02em]">
          {UI_TEXT.appName}
        </p>
        <p className="mt-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-ink-muted">
          {UI_TEXT.appTagline}
        </p>

        <h1 className="mt-9 max-w-[7.5em] font-display text-[2.75rem] font-semibold leading-[1.04] tracking-[-0.035em] text-balance">
          {headline.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>

        <span aria-hidden="true" className="mt-6 block h-px w-14 bg-primary/70" />

        <p className="mt-5 max-w-[22ch] text-[0.72rem] font-semibold uppercase leading-[1.7] tracking-[0.2em] text-ink-muted">
          {intro}
        </p>
      </div>

      {/* The sheet keeps the phone's full-bleed edge and becomes a contained
          card from tablet up. The composed wide layout is plan §137.9. */}
      <div className="auth-sheet animate-rise safe-bottom [--safe-pb:2rem] mx-auto mt-auto w-full max-w-xl rounded-t-[2rem] px-6 pt-7 sm:mb-8 sm:rounded-[2rem]">
        <div className="mx-auto w-full max-w-md">
          {children}
          {footer && <div className="mt-7">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

/** The line the sheet closes on — the bakery's promise, not a legal footer. */
export function AuthPromise({ children }: { children: string }) {
  return (
    <p className="flex items-center justify-center gap-2.5 rounded-2xl bg-field px-4 py-3.5 text-center text-sm text-ink-muted">
      <span className="shrink-0 text-primary">
        <BrandMark size={17} />
      </span>
      <span className="font-display italic">{children}</span>
    </p>
  );
}
