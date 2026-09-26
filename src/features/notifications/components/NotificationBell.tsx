"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/components/ui/cn";
import { NOTIFICATION_BADGE_MAX } from "@/constants/limits";
import { UI_TEXT } from "@/constants/messages";
import { NOTIFICATIONS_ROUTE } from "@/constants/navigation";

import { useUnreadNotifications } from "../hooks/useUnreadNotifications";

/** What the badge shows for a count: the number, up to the most it shows, then "9+". */
export function badgeCount(unread: number): string {
  return unread > NOTIFICATION_BADGE_MAX ? UI_TEXT.notifications.moreThan(NOTIFICATION_BADGE_MAX) : String(unread);
}

/**
 * The bell in the top bar (plan §139.5, §139.10). While anything waits
 * unread it carries how many — "1" to "9", then "9+" — and the badge pops as
 * the count changes. It goes to the inbox, and its name says exactly how many
 * wait, so the capped badge is only ever what is seen.
 */
export function NotificationBell() {
  const pathname = usePathname();
  const unread = useUnreadNotifications();
  const here = pathname === NOTIFICATIONS_ROUTE;
  const shown = badgeCount(unread);

  return (
    <Link
      href={NOTIFICATIONS_ROUTE}
      aria-label={UI_TEXT.notifications.bell(unread)}
      aria-current={here ? "page" : undefined}
      className={cn(
        "touch-target relative inline-flex size-11 items-center justify-center rounded-full transition hover:bg-surface-hover active:scale-95",
        here ? "text-primary" : "text-text",
      )}
    >
      <Bell size={22} strokeWidth={1.75} aria-hidden="true" />
      {unread > 0 && (
        <span
          key={shown}
          aria-hidden="true"
          data-unread-count
          className="animate-pop absolute left-[1.45rem] top-1 inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-danger px-1 text-[0.6875rem] font-semibold leading-none tabular-nums text-danger-text ring-2 ring-surface"
        >
          {shown}
        </span>
      )}
    </Link>
  );
}
