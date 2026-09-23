"use client";

import { Cake } from "lucide-react";
import type { ReactNode } from "react";

import { UI_TEXT } from "@/constants/messages";
import { THEME_LABELS, useTheme, type Theme } from "@/lib/theme/ThemeProvider";

/**
 * The frame the four authentication screens share (plan §21): the brand, one
 * heading that says where you are, and a card holding the form. Each screen
 * only supplies its own words and fields, so they cannot drift apart in
 * spacing, heading size or how the footer link reads.
 */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { theme, setTheme } = useTheme();
  const nextTheme: Theme = theme === "clean" ? "peach" : "clean";

  return (
    <div className="flex min-h-screen flex-col bg-background text-text">
      <header className="safe-top flex items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-text shadow-card">
            <Cake size={20} strokeWidth={2.5} aria-hidden="true" />
          </div>
          <div>
            <span className="block font-heading text-lg font-bold leading-tight tracking-tight">
              {UI_TEXT.appName}
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
              {UI_TEXT.appTagline}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setTheme(nextTheme)}
          aria-label={`Switch to ${THEME_LABELS[nextTheme]} theme`}
          className="touch-target rounded-full border border-accent-border bg-accent px-4 py-1.5 text-xs font-bold text-secondary transition-all hover:bg-accent/80 active:scale-95"
        >
          {THEME_LABELS[nextTheme]}
        </button>
      </header>

      <main className="animate-fade-in-up mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:px-0">
        <div className="mb-6 text-center">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-text sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1.5 text-sm font-medium text-text-muted">{subtitle}</p>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-6 shadow-card sm:p-8">
          {children}
        </div>

        {footer && (
          <p className="mt-6 text-center text-sm font-medium text-text-muted">{footer}</p>
        )}
      </main>
    </div>
  );
}
