"use client";

import Link from "next/link";
import { useEffect } from "react";
import { X } from "lucide-react";

import { SECONDARY_NAV } from "@/constants/navigation";
import { UI_TEXT } from "@/constants/messages";

/**
 * The rest of the app, on a phone (plan §9). Its items come from the one nav
 * list, so adding a screen adds it here and to the sidebar together.
 */
export function MoreSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="More navigation options"
        className="safe-bottom animate-slide-up fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-border bg-surface shadow-[0_-8px_30px_rgba(0,0,0,0.12)] md:hidden"
      >
        <div className="flex justify-center py-3">
          <div className="h-1.5 w-12 rounded-full bg-border" aria-hidden="true" />
        </div>

        <div className="flex items-center justify-between px-6 pb-4">
          <h2 className="font-heading text-xl font-bold">Menu</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={UI_TEXT.actions.close}
            className="touch-target flex items-center justify-center rounded-full p-2 text-text-muted transition-colors hover:bg-surface-hover hover:text-text active:scale-95"
          >
            <X size={20} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Secondary navigation">
          <ul role="list" className="space-y-1 px-4 pb-8">
            {SECONDARY_NAV.map(({ id, label, icon: Icon, href }) => (
              <li key={id}>
                <Link
                  href={href}
                  onClick={onClose}
                  className="touch-target flex items-center gap-4 rounded-2xl px-4 py-3.5 text-base font-semibold text-text transition-all hover:bg-surface-hover active:scale-[0.98]"
                >
                  <Icon size={22} strokeWidth={2} className="text-text-muted" aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}
