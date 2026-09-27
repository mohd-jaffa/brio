"use client";

import { LogOut } from "lucide-react";

import { UI_TEXT } from "@/constants/messages";
import { ROLE_LABELS } from "@/constants/roles";

import { useAuth } from "../AuthProvider";
import { useSignOut } from "../hooks/useSignOut";

/**
 * Who is signed in, and the way out. It sits in the sidebar and in the More
 * sheet, so a baker can always see which account they are looking at — which
 * matters most on the one screen where it is easy to forget: a shared phone.
 */
export function AccountMenu({ onSignedOut }: { onSignedOut?: () => void } = {}) {
  const { profile } = useAuth();
  // Asked first, since it cannot be taken back (`useSignOut`).
  const { signingOut, signOut } = useSignOut(onSignedOut);

  if (!profile) return null;

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-text">{profile.name}</p>
        <p className="truncate text-[11px] font-medium uppercase tracking-wider text-text-muted">
          {ROLE_LABELS[profile.role]}
        </p>
      </div>

      <button
        type="button"
        onClick={() => void signOut()}
        disabled={signingOut}
        aria-busy={signingOut || undefined}
        className="touch-target flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-text-muted transition hover:bg-surface-hover hover:text-text active:scale-95 disabled:opacity-50"
      >
        <LogOut size={16} strokeWidth={2.5} aria-hidden="true" />
        {UI_TEXT.auth.signOut}
      </button>
    </div>
  );
}
