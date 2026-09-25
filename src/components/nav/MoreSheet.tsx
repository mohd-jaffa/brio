"use client";

import Link from "next/link";

import { Sheet } from "@/components/ui/sheet";
import { UI_TEXT } from "@/constants/messages";
import { SECONDARY_NAV } from "@/constants/navigation";
import { AccountMenu } from "@/features/auth/components/AccountMenu";

/**
 * The rest of the app, on a phone (plan §9). Its items come from the one nav
 * list, so adding a screen adds it here and to the sidebar together. It is a
 * `Sheet`, so the page behind is inert while it is open and focus goes back
 * to the More button when it closes (BUG-25).
 */
export function MoreSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      title={UI_TEXT.nav.more}
      className="md:hidden"
      footer={<AccountMenu onSignedOut={onClose} />}
    >
      <nav aria-label={UI_TEXT.nav.secondary}>
        <ul role="list" className="-mx-2 space-y-1">
          {SECONDARY_NAV.map(({ id, label, icon: Icon, href }) => (
            <li key={id}>
              <Link
                href={href}
                onClick={onClose}
                className="touch-target flex items-center gap-4 rounded-2xl px-4 py-3.5 text-base font-semibold text-text transition-all hover:bg-surface-hover active:scale-[0.98]"
              >
                <Icon size={22} strokeWidth={1.75} className="text-text-muted" aria-hidden="true" />
                <span>{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </Sheet>
  );
}
