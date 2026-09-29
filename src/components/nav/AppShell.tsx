"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState, type ReactNode } from "react";

import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { ScreenSkeleton } from "@/components/ui/skeleton";
import { UI_TEXT } from "@/constants/messages";
import { BOTTOM_NAV, isActivePath, NAV_GROUPS } from "@/constants/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { OrderReminders } from "@/features/notifications/components/OrderReminders";
import { useNavigationPending } from "@/hooks/useNavigationPending";
import { useSettle } from "@/hooks/useSettle";

import { cn } from "../ui/cn";
import { AccountPopover } from "./AccountPopover";
import { BusinessMark } from "./BusinessMark";
import { InstallApp } from "./InstallApp";
import { MoreSheet } from "./MoreSheet";
import { OfflineBanner } from "./OfflineBanner";
import { SIDEBAR_LABEL_CLASSES, sidebarItemClasses } from "./navStyles";

/**
 * The frame every screen sits in (plan §139.5, §139.9):
 *
 * - **Phone (< 768 px):** a top bar with the business's mark, name and line,
 *   the bell and the account's picture; a five-item bottom bar with a tinted
 *   pill on the current place; More opens the rest.
 * - **Tablet (768–1023 px):** a 72 px icon rail, its labels shown as tooltips
 *   and read as each link's name, and a top bar with the bell and the account.
 * - **Desktop (≥ 1024 px):** the 248 px sidebar in the plan's three groups,
 *   the same top bar, and content up to 1200 px wide.
 *
 * Every edge pays its safe area. There is no global search (the user's
 * decision, 2026-09-25).
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
  // A screen with the round + (Fab) keeps its last row clear of it on a phone.
  const main = useRef<HTMLElement>(null);
  useSettle(main);
  // On the way to another screen: its skeleton in this one's place, the frame kept.
  const navigating = useNavigationPending(pathname);

  return (
    <div className="flex min-h-dvh bg-background text-text">
      <aside className="sticky top-0 z-30 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface pb-[var(--safe-bottom)] pl-[var(--safe-left)] md:flex md:w-[calc(72px+var(--safe-left))] lg:w-[calc(248px+var(--safe-left))]">
        <div className="flex items-center px-4 pb-5 pt-[calc(var(--safe-top)+1.25rem)] md:max-lg:justify-center md:max-lg:px-0">
          <BusinessMark textClassName="md:max-lg:sr-only" />
        </div>

        {/* The sidebar scrolls when it is taller than the screen. So does the
            rail, but only then — a phone on its side — since scrolling clips
            its tooltips; its places keep their names for a screen reader. */}
        <nav
          aria-label={UI_TEXT.nav.main}
          className="flex-1 px-3 pb-4 lg:overflow-y-auto [@media(max-height:46rem)]:overflow-y-auto"
        >
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
                    <Link href={href} aria-current={active ? "page" : undefined} className={sidebarItemClasses(active)}>
                      <Icon size={20} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
                      <span className={SIDEBAR_LABEL_CLASSES}>{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ))}
        </nav>
        <div className="px-3 pb-4">
          <InstallApp variant="sidebar" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="safe-top [--safe-pt:0.75rem] safe-x [--safe-px:1rem] sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-surface/90 pb-3 backdrop-blur-md md:hidden">
          <BusinessMark compact />
          <div className="flex shrink-0 items-center gap-1">
            <NotificationBell />
            {profile && (
              <Link
                href="/settings"
                aria-label={UI_TEXT.nav.account(profile.name)}
                className="touch-target flex items-center justify-center rounded-full"
              >
                <ProfileAvatar avatar={profile.avatar} />
              </Link>
            )}
          </div>
        </header>

        <header className="safe-top [--safe-pt:0.75rem] sticky top-0 z-20 hidden items-center justify-end gap-3 border-b border-border bg-surface/85 pb-3 pl-6 pr-[calc(var(--safe-right)+1.5rem)] backdrop-blur-md md:flex">
          <NotificationBell />
          <AccountPopover />
        </header>

        <main
          ref={main}
          aria-busy={navigating || undefined}
          data-navigating={navigating || undefined}
          className="animate-settle mx-auto w-full overflow-x-clip max-w-[1200px] flex-1 space-y-6 p-4 pb-[calc(var(--nav-height)+var(--safe-bottom)+1.5rem)] has-[[data-fab]]:pb-[calc(var(--nav-height)+var(--safe-bottom)+5.5rem)] md:p-6 md:pb-[calc(var(--safe-bottom)+2rem)] md:has-[[data-fab]]:pb-[calc(var(--safe-bottom)+2rem)] md:pr-[calc(var(--safe-right)+1.5rem)] lg:space-y-8 lg:p-8 lg:pr-[calc(var(--safe-right)+2rem)]"
        >
          <OfflineBanner />
          {navigating && <ScreenSkeleton label={UI_TEXT.states.loading} />}
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
        {/* Measured in px, like a native tab bar, so a larger text size cannot
            push the last place off the edge; a label is cut short only if a
            system text zoom makes it wider than its share. */}
        <ul role="list" className="flex items-center justify-around">
          {BOTTOM_NAV.map(({ id, label, icon: Icon, href }) => {
            const isMore = id === "more";
            const active = isMore ? moreOpen : isActivePath(href, pathname);
            const classes = cn(
              "touch-target flex min-w-[56px] max-w-full flex-col items-center justify-center gap-1 rounded-xl px-[10px] py-1.5 transition-colors",
              active ? "bg-primary-soft font-semibold text-primary" : "font-medium text-text-muted hover:text-text",
            );
            const inner = (
              <>
                <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
                <span className="max-w-full truncate text-[11px] leading-none">{label}</span>
              </>
            );
            return (
              <li key={id} className="min-w-0">
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
      <OrderReminders />
    </div>
  );
}
