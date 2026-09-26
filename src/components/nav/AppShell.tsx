"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState, type ReactNode } from "react";

import { Avatar } from "@/components/ui/avatar";
import { UI_TEXT } from "@/constants/messages";
import { BOTTOM_NAV, isActivePath, NAV_GROUPS } from "@/constants/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { useSettle } from "@/hooks/useSettle";

import { cn } from "../ui/cn";
import { AccountPopover } from "./AccountPopover";
import { BusinessMark } from "./BusinessMark";
import { MoreSheet } from "./MoreSheet";

/**
 * The frame every screen sits in (plan §139.5, §139.9):
 *
 * - **Phone (< 768 px):** a top bar with the business's mark, name and line
 *   and the account's initials; a five-item bottom bar with a tinted pill on
 *   the current place; More opens the rest.
 * - **Tablet (768–1023 px):** a 72 px icon rail, its labels shown as tooltips
 *   and read as each link's name, and a top bar with the account.
 * - **Desktop (≥ 1024 px):** the 248 px sidebar in the plan's three groups,
 *   the same top bar, and content up to 1200 px wide.
 *
 * Every edge pays its safe area. The bell (R5.10) joins the top bar with its
 * feature; there is no global search (the user's decision, 2026-09-25).
 *
 * Every screen is drawn inside this, so the session gate lives here too: no
 * page has to remember to ask whether anyone is signed in.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AppFrame>{children}</AppFrame>
    </RequireAuth>
  );
}

function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const closeMore = useCallback(() => setMoreOpen(false), []);
  // Whatever replaces a loading placeholder, on any screen, fades in over it.
  const main = useRef<HTMLElement>(null);
  useSettle(main);

  return (
    <div className="flex min-h-dvh bg-background text-text">
      <aside className="sticky top-0 z-30 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface pb-[var(--safe-bottom)] pl-[var(--safe-left)] md:flex md:w-[calc(72px+var(--safe-left))] lg:w-[calc(248px+var(--safe-left))]">
        <div className="flex items-center px-4 pb-5 pt-[calc(var(--safe-top)+1.25rem)] md:max-lg:justify-center md:max-lg:px-0">
          <BusinessMark textClassName="md:max-lg:sr-only" />
        </div>

        <nav aria-label={UI_TEXT.nav.main} className="flex-1 px-3 pb-4 lg:overflow-y-auto">
          {NAV_GROUPS.map((group, index) => (
            <ul
              key={group[0].id}
              role="list"
              className={cn("space-y-1", index > 0 && "mt-3 border-t border-border pt-3")}
            >
              {group.map(({ id, label, icon: Icon, href }) => {
                const active = isActivePath(href, pathname);
                return (
                  <li key={id}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                        "md:max-lg:size-12 md:max-lg:justify-center md:max-lg:px-0",
                        active
                          ? "bg-primary-soft font-semibold text-primary"
                          : "font-medium text-text-muted hover:bg-surface-hover hover:text-text",
                      )}
                    >
                      <Icon size={20} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
                      <span
                        className={cn(
                          // On the rail the label is a tooltip — still the link's name.
                          "md:max-lg:pointer-events-none md:max-lg:absolute md:max-lg:left-full md:max-lg:ml-3 md:max-lg:whitespace-nowrap",
                          "md:max-lg:rounded-lg md:max-lg:bg-action md:max-lg:px-2.5 md:max-lg:py-1.5 md:max-lg:text-xs md:max-lg:font-medium md:max-lg:text-action-text md:max-lg:shadow-elevated",
                          "md:max-lg:opacity-0 md:max-lg:transition-opacity md:max-lg:group-hover:opacity-100 md:max-lg:group-focus-visible:opacity-100",
                        )}
                      >
                        {label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="safe-top [--safe-pt:0.75rem] safe-x [--safe-px:1rem] sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-surface/90 pb-3 backdrop-blur-md md:hidden">
          <BusinessMark compact />
          {profile && (
            <Link href="/settings" aria-label={UI_TEXT.nav.account(profile.name)} className="touch-target flex items-center justify-center rounded-full">
              <Avatar name={profile.name} size="sm" />
            </Link>
          )}
        </header>

        <header className="safe-top [--safe-pt:0.75rem] sticky top-0 z-20 hidden items-center justify-end gap-3 border-b border-border bg-surface/85 pb-3 pl-6 pr-[calc(var(--safe-right)+1.5rem)] backdrop-blur-md md:flex">
          <AccountPopover />
        </header>

        <main
          ref={main}
          className="animate-settle mx-auto w-full overflow-x-clip max-w-[1200px] flex-1 space-y-6 p-4 pb-[calc(var(--nav-height)+var(--safe-bottom)+1.5rem)] md:p-6 md:pb-[calc(var(--safe-bottom)+2rem)] md:pr-[calc(var(--safe-right)+1.5rem)] lg:space-y-8 lg:p-8 lg:pr-[calc(var(--safe-right)+2rem)]"
        >
          {children}
        </main>
      </div>

      {/* Exactly --nav-height above the inset, so whatever rests on it (the
          checkout bar, the cart bar) meets its edge rather than a guess at it. */}
      <nav
        aria-label={UI_TEXT.nav.main}
        data-bottom-nav
        className="safe-bottom [--safe-pb:0.5rem] safe-x [--safe-px:0.5rem] fixed inset-x-0 bottom-0 z-30 h-[calc(var(--nav-height)+var(--safe-bottom))] border-t border-border bg-surface/90 pt-2 backdrop-blur-md md:hidden"
      >
        <ul role="list" className="flex items-center justify-around">
          {BOTTOM_NAV.map(({ id, label, icon: Icon, href }) => {
            const isMore = id === "more";
            const active = isMore ? moreOpen : isActivePath(href, pathname);
            const classes = cn(
              "touch-target flex min-w-14 flex-col items-center justify-center gap-1 rounded-xl px-2.5 py-1.5 transition-colors",
              active ? "bg-primary-soft font-semibold text-primary" : "font-medium text-text-muted hover:text-text",
            );
            const inner = (
              <>
                <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
                <span className="text-[11px] leading-none">{label}</span>
              </>
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
                    {inner}
                  </button>
                ) : (
                  <Link href={href} aria-current={active ? "page" : undefined} className={classes}>
                    {inner}
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
