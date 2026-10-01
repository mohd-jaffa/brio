"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { BRAND, brandWidth } from "@/assets/brand";
import { PLATES, PLATE_FOCUS, PLATE_QUALITY } from "@/assets/plates";
import { UI_TEXT } from "@/constants/messages";
import { LANDING_ROUTE } from "@/constants/routes";

const WORDMARK_HEIGHT = 44;

/**
 * The frame every authentication screen shares (plan §138, §139.10). Daylight
 * on a warm wall, the app's wordmark and its line set over it (the user,
 * 2026-09-28: Brio, "Made by you. Managed simply."), and a sheet that rises
 * from the bottom carrying the form.
 *
 * The photograph is the cake-table plate (§139.11.12): a bake and dried
 * florals against a warm wall, as the references show. It takes the right of
 * the upper scene and fades in from nothing on its left, at its head and at
 * its foot (`.auth-plate`), so no word sits on the photograph: every word was
 * measured at ≥ 4.5 : 1 against the darkest pixel behind it, at 360 to
 * 1280 px in both themes. It is the screen's largest paint, so it loads first.
 *
 * From 1024 px the scene and the sheet stand side by side (the user,
 * 2026-09-27): the scene on the left, the form on the right, both centred in
 * the height, so a long form such as Register is on screen whole rather than
 * below a scene stacked above it. The header spans both.
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
    // The whole screen is its content: there is no navigation to set apart.
    <main className="auth-canvas flex min-h-dvh flex-col text-text lg:grid lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:items-center lg:gap-x-16 lg:px-[max(2.5rem,calc(50%-36rem))]">
      <header className="safe-top [--safe-pt:1.25rem] mx-auto flex w-full max-w-xl items-start justify-between gap-4 px-6 lg:col-span-2 lg:max-w-none lg:self-start lg:px-0">
        {backHref ? (
          <Link
            href={backHref}
            aria-label={UI_TEXT.actions.back}
            className="touch-target -ml-2 flex items-center justify-center rounded-full text-text/80 transition-colors hover:text-text"
          >
            <ArrowLeft size={22} strokeWidth={2} aria-hidden="true" />
          </Link>
        ) : (
          <span aria-hidden="true" />
        )}

        {counterpart && (
          <p className="pt-1 text-right text-sm font-medium text-text-muted">
            {counterpart.question}{" "}
            <Link
              href={counterpart.href}
              className="font-semibold text-text underline decoration-primary/60 decoration-2 underline-offset-4 transition-colors hover:decoration-primary"
            >
              {counterpart.label}
            </Link>
          </p>
        )}
      </header>

      <div className="relative isolate mx-auto w-full max-w-xl flex-1 px-6 pb-10 pt-6 lg:mx-0 lg:flex-none lg:px-0 lg:py-10">
        {/* On a phone the headline runs across most of the width, so the plate
            keeps to the band above it, beside the mark; from 640 px it has the
            room to stand beside the words; from 1024 px it reaches into the gap
            before the form, and fades out there rather than over the bake. */}
        <div
          aria-hidden="true"
          className="auth-plate pointer-events-none absolute right-0 top-0 -z-10 h-44 w-[62%] sm:inset-y-0 sm:h-auto lg:-right-12"
        >
          <Image
            src={PLATES["cake-table"]}
            quality={PLATE_QUALITY}
            alt=""
            fill
            // The largest paint: fetched at once and first. (`priority` is
            // deprecated in Next 16.)
            loading="eager"
            fetchPriority="high"
            sizes="(min-width: 640px) 360px, 62vw"
            className="object-cover"
            style={{ objectPosition: PLATE_FOCUS["cake-table"] }}
          />
        </div>

        {/* The wordmark is the app's name: it is read as one. */}
        <Image
          src={BRAND.wordmark.src}
          alt={UI_TEXT.appName}
          width={brandWidth("wordmark", WORDMARK_HEIGHT)}
          height={WORDMARK_HEIGHT}
          loading="eager"
          className="block"
        />
        <p className="mt-2 text-[0.75rem] font-medium tracking-[0.12em] text-text-muted">{UI_TEXT.appTagline}</p>

        <h1 className="mt-9 max-w-[7.5em] font-display text-[2.75rem] font-semibold leading-[1.04] tracking-[-0.035em] text-balance">
          {headline.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>

        <span aria-hidden="true" className="mt-6 block h-px w-14 bg-primary/70" />

        <p className="mt-5 max-w-[22ch] text-[0.72rem] font-semibold uppercase leading-[1.7] tracking-[0.2em] text-text-muted">
          {intro}
        </p>
      </div>

      {/* The sheet keeps the phone's full-bleed edge, becomes a contained card
          from tablet up, and from 1024 px stands beside the scene. */}
      <div className="auth-sheet animate-rise safe-bottom [--safe-pb:2rem] mx-auto mt-auto w-full max-w-xl rounded-t-[2rem] px-6 pt-7 sm:mb-8 sm:rounded-[2rem] lg:my-10 lg:mr-0">
        <div className="mx-auto w-full max-w-md">
          {children}
          {footer && <div className="mt-7">{footer}</div>}
        </div>
      </div>
    </main>
  );
}

/** The way to the landing page, under the promise, for someone meeting Brio for the first time (§139.11.22). */
export function AuthAbout() {
  return (
    <p className="mt-2 text-center text-sm">
      <Link
        href={LANDING_ROUTE}
        className="touch-target inline-flex min-h-11 items-center font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
      >
        {UI_TEXT.auth.seeWhatBrioDoes}
      </Link>
    </p>
  );
}

/** The line the sheet closes on — a promise, not a legal footer. */
export function AuthPromise({ children }: { children: string }) {
  return (
    <p className="flex items-center justify-center gap-2.5 rounded-2xl bg-sunken px-4 py-3.5 text-center text-sm text-text-muted">
      <Image src={BRAND.leaf.src} alt="" width={brandWidth("leaf", 16)} height={16} className="shrink-0" />
      <span className="font-display italic">{children}</span>
    </p>
  );
}
