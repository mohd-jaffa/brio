"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cake } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";

import { UI_TEXT } from "@/constants/messages";
import { BOTTOM_NAV, isActivePath, SIDEBAR_NAV } from "@/constants/navigation";
import { AccountMenu } from "@/features/auth/components/AccountMenu";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { useTheme, THEME_LABELS, type Theme } from "@/lib/theme/ThemeProvider";

import { MoreSheet } from "./MoreSheet";
import { cn } from "../ui/cn";

/**
 * The frame every screen sits in (plan §41): a sidebar from tablet up, a
 * header and a bottom bar on a phone, and the page's own content between them.
 * The content container lives here too — each page used to restate the same
 * spacing and the same bottom padding that keeps the last row clear of the
 * bottom bar, and they had drifted.
 *
 * Every screen in the app is drawn inside this, so the session gate lives here
 * too: no page has to remember to ask whether anyone is signed in.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AppFrame>{children}</AppFrame>
    </RequireAuth>
  );
}

function AppFrame({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const closeMore = useCallback(() => setMoreOpen(false), []);
  const nextTheme: Theme = theme === "golden" ? "peach" : "golden";
  const currentPage = SIDEBAR_NAV.find((item) => isActivePath(item.href, pathname));

  const themeToggle = (label: string) => (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      aria-label={`Switch to ${THEME_LABELS[nextTheme]} theme`}
      className="touch-target rounded-full border border-border bg-primary-soft px-4 py-1.5 text-xs font-bold text-primary transition-all hover:bg-surface-hover active:scale-95"
    >
      {label}
    </button>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-text md:flex-row">
      <aside className="hidden flex-shrink-0 flex-col border-r border-border bg-surface md:flex md:w-64">
        <div className="flex items-center gap-3 border-b border-border px-4 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary-soft bg-primary text-primary-text shadow-card">
            <Cake size={20} strokeWidth={2.5} aria-hidden="true" />
          </div>
          <div>
            <span className="block font-heading text-lg font-semibold leading-tight tracking-tight">
              {UI_TEXT.appName}
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
              {UI_TEXT.appTagline}
            </span>
          </div>
        </div>

        <nav aria-label="Main navigation" className="flex-1 px-3 py-4">
          <ul role="list" className="space-y-1">
            {SIDEBAR_NAV.map(({ id, label, icon: Icon, href }) => {
              const active = isActivePath(href, pathname);
              return (
                <li key={id}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "touch-target flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.98]",
                      active
                        ? "bg-primary text-primary-text shadow-md"
                        : "text-text-muted hover:bg-surface-hover hover:text-text",
                    )}
                  >
                    <Icon size={18} strokeWidth={active ? 2.5 : 2} className="shrink-0" aria-hidden="true" />
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="space-y-4 border-t border-border px-4 py-4">
          <AccountMenu />
          {themeToggle(`${THEME_LABELS[nextTheme]} Theme`)}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="safe-top sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface/85 px-4 py-3 shadow-sm backdrop-blur-md transition-colors md:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-text shadow-card">
              <Cake size={16} strokeWidth={2.5} aria-hidden="true" />
            </div>
            <span className="font-heading text-base font-bold tracking-tight">{UI_TEXT.appName}</span>
          </div>
          {themeToggle(THEME_LABELS[theme])}
        </header>

        <header className="sticky top-0 z-10 hidden items-center justify-between border-b border-border bg-surface/85 px-6 py-3 backdrop-blur-md md:flex">
          <span className="font-heading text-lg font-bold text-text">
            {currentPage?.label ?? "Dashboard"}
          </span>
        </header>

        <main className="animate-fade-in-up mx-auto w-full max-w-5xl flex-1 space-y-6 p-4 pb-24 md:p-6 md:pb-8 lg:space-y-8 lg:p-8">
          {children}
        </main>
      </div>

      <nav
        aria-label="Main navigation"
        className="safe-bottom fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-surface/85 px-2 py-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] backdrop-blur-md transition-colors md:hidden"
      >
        <ul role="list" className="flex items-center justify-around">
          {BOTTOM_NAV.map(({ id, label, icon: Icon, href }) => {
            const isMore = id === "more";
            const active = isMore ? moreOpen : isActivePath(href, pathname);
            const classes = cn(
              "touch-target flex min-w-16 flex-col items-center justify-center rounded-xl px-3 py-1.5 transition-all active:scale-95",
              active ? "bg-primary-soft font-bold text-primary" : "text-text-muted hover:text-text",
            );

            return (
              <li key={id}>
                {isMore ? (
                  <button
                    type="button"
                    onClick={() => setMoreOpen((open) => !open)}
                    aria-expanded={moreOpen}
                    aria-haspopup="dialog"
                    className={classes}
                  >
                    <Icon size={20} strokeWidth={active ? 2.5 : 2} className="mb-1" aria-hidden="true" />
                    <span className="text-[10px] tracking-tight">{label}</span>
                  </button>
                ) : (
                  <Link href={href} aria-current={active ? "page" : undefined} className={classes}>
                    <Icon size={20} strokeWidth={active ? 2.5 : 2} className="mb-1" aria-hidden="true" />
                    <span className="text-[10px] tracking-tight">{label}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <MoreSheet isOpen={moreOpen} onClose={closeMore} />
    </div>
  );
}
