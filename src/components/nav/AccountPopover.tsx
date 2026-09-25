"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { UI_TEXT } from "@/constants/messages";
import { AccountMenu } from "@/features/auth/components/AccountMenu";
import { useAuth } from "@/features/auth/AuthProvider";

import { ThemeSwitch } from "./ThemeSwitch";

/**
 * The account, at the right of the top bar from 768 px (plan §139.5): the
 * initials, and the name from 1024 px, opening who is signed in, the theme
 * and Sign out. A disclosure — Escape or a click elsewhere closes it, and
 * focus goes back to the button.
 */
export function AccountPopover() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  if (!profile) return null;

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-label={UI_TEXT.nav.account(profile.name)}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((shown) => !shown)}
        className="touch-target flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-surface-hover"
      >
        <Avatar name={profile.name} size="sm" />
        <span className="hidden max-w-40 truncate text-sm font-medium text-text lg:block">{profile.name}</span>
        <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" className="text-text-muted" />
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute right-0 top-full z-40 mt-2 w-72 space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-elevated"
      >
        <AccountMenu onSignedOut={() => setOpen(false)} />
        <ThemeSwitch />
      </div>
    </div>
  );
}
