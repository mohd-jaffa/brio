"use client";

import { LayoutDashboard, LogOut, ScrollText, TriangleAlert, Users, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { BRAND } from "@/assets/brand";
import { cn } from "@/components/ui/cn";
import { Pending } from "@/components/ui/pending";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { UI_TEXT } from "@/constants/messages";
import { DEVELOPER_ROLES, ROLE_LABELS } from "@/constants/roles";
import { ADMIN_ROUTES, AUTH_ROUTES, HOME_ROUTE, signInPath } from "@/constants/routes";
import { useAuth } from "@/features/auth/AuthProvider";
import { useSignOut } from "@/features/auth/hooks/useSignOut";
import { formatPhoneDigits } from "@/lib/phone";

const text = UI_TEXT.admin;

const PLACES: { href: string; label: string; icon: LucideIcon }[] = [
  { href: ADMIN_ROUTES.overview, label: text.places.overview, icon: LayoutDashboard },
  { href: ADMIN_ROUTES.users, label: text.places.users, icon: Users },
  { href: ADMIN_ROUTES.logs, label: text.places.logs, icon: TriangleAlert },
  { href: ADMIN_ROUTES.audit, label: text.places.audit, icon: ScrollText },
];

/** Who is signed in, and Sign out — it asks first, as everywhere (`useSignOut`). */
function SignedIn() {
  const { profile } = useAuth();
  const { signingOut, signOut } = useSignOut();
  if (!profile) return null;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ProfileAvatar avatar={profile.avatar} />
      <div className="hidden min-w-0 text-right sm:block">
        <p className="truncate text-sm font-semibold text-text">{profile.name}</p>
        <p className="truncate text-xs text-text-muted">
          {ROLE_LABELS[profile.role]} · {UI_TEXT.fields.phonePrefix} {formatPhoneDigits(profile.phone)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void signOut()}
        disabled={signingOut}
        className="touch-target flex items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-text transition-colors hover:bg-surface-hover disabled:opacity-60"
      >
        <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
        <span>{UI_TEXT.auth.signOut}</span>
      </button>
    </div>
  );
}

/**
 * The developer console's frame (plan §37; the user, 2026-09-27): plain
 * white and blue (`data-theme="dev"`, globals.css), a top bar with the app's
 * icon and the console's name and who is signed in, and its places as tabs — the
 * overview, the accounts, the error log and the audit log. Read-only. The job queue has no
 * page while no worker runs (WORKER_ENABLED): nothing new is queued.
 *
 * It lets in only a developer: anyone signed out goes to sign in, anyone
 * owing a password change replaces it first, and an owner goes home. It is a
 * convenience, like `RequireAuth`: every console route checks the role
 * itself (`withDevRoute`).
 */
export function DevShell({ children }: { children: ReactNode }) {
  const { status, profile, requiresPasswordChange } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const developer = profile ? DEVELOPER_ROLES.includes(profile.role) : false;

  useEffect(() => {
    if (status === "anonymous") router.replace(signInPath(pathname));
    else if (status === "authenticated" && requiresPasswordChange) router.replace(AUTH_ROUTES.changePassword);
    else if (status === "authenticated" && !developer) router.replace(HOME_ROUTE);
  }, [status, requiresPasswordChange, developer, pathname, router]);

  const allowed = status === "authenticated" && developer && !requiresPasswordChange;

  return (
    <div data-theme="dev" className="min-h-dvh bg-background text-text">
      <header className="safe-top [--safe-pt:0.75rem] safe-x [--safe-px:1rem] sticky top-0 z-20 border-b border-border bg-surface md:[--safe-px:1.5rem]">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 pb-3">
          <div className="flex min-w-0 items-center gap-3">
            <Image src={BRAND.icon.src} alt="" width={36} height={36} className="size-9 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text">{text.product}</p>
              <p className="truncate text-xs font-medium text-primary">{text.console}</p>
            </div>
          </div>
          {allowed && <SignedIn />}
        </div>
        {allowed && (
          <nav aria-label={text.nav} className="mx-auto max-w-[1200px]">
            <ul role="list" className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none]">
              {PLACES.map(({ href, label, icon: Icon }) => {
                const current = href === ADMIN_ROUTES.overview ? pathname === href : pathname.startsWith(href);
                return (
                  <li key={href} className="shrink-0">
                    <Link
                      href={href}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "touch-target flex items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors",
                        current
                          ? "border-primary text-primary"
                          : "border-transparent text-text-muted hover:border-border hover:text-text",
                      )}
                    >
                      <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </header>
      <main className="safe-x [--safe-px:1rem] py-6 pb-[calc(var(--safe-bottom)+2rem)] md:[--safe-px:1.5rem]">
        <div className="mx-auto max-w-[1200px] space-y-6">
          {allowed ? children : <Pending message={UI_TEXT.auth.checkingSession} />}
        </div>
      </main>
    </div>
  );
}
