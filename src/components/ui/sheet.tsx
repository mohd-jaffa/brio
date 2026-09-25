"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";

import { UI_TEXT } from "@/constants/messages";

import { cn } from "./cn";

// What can take focus inside the sheet, in the order Tab would reach it.
const FOCUSABLE = "input, select, textarea, button, a[href], [tabindex]:not([tabindex='-1'])";

/**
 * A bottom sheet on a phone and a centred dialog from 768 px (plan §139.5),
 * built on the native modal `<dialog>` (BUG-25):
 *
 * - **The page behind is inert.** `showModal()` puts the sheet in the top
 *   layer and makes everything else unreachable — by Tab, by a screen reader,
 *   by a pointer — and Tab goes round inside it, first to last and back.
 * - **Focus** moves in when it opens — to `initialFocus`, else the first
 *   field, else the first control after the close button — and goes back to
 *   whatever opened it when it closes.
 * - **Escape** and a tap on the backdrop close it, unless it is not
 *   `dismissible` (a card that needs an answer).
 * - **It stays mounted while closed.** A closed `<dialog>` is simply not
 *   drawn, so a form inside it keeps its state: a form mounted only while open
 *   lost what was typed into it under the React Compiler (changelog, R0.3).
 * - **It fits the screen.** Its height is in `dvh`, it rides above the
 *   on-screen keyboard (`--keyboard-inset`) and its foot clears the home
 *   indicator.
 */
export function Sheet({
  open,
  onClose,
  title,
  role = "dialog",
  dismissible = true,
  initialFocus,
  footer,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  /** Names the dialog. */
  title: string;
  /** `alertdialog` for something that needs an answer (plan §139.6). */
  role?: "dialog" | "alertdialog";
  dismissible?: boolean;
  initialFocus?: RefObject<HTMLElement | null>;
  /** Pinned under the scrolling body — the sheet's actions. */
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const headingId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element || !open) return;

    const opener = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    if (!element.open) element.showModal();
    document.body.style.overflow = "hidden";

    const firstField = body.current?.querySelector<HTMLElement>("input, select, textarea");
    const firstControl = body.current?.querySelector<HTMLElement>(FOCUSABLE);
    (initialFocus?.current ?? firstField ?? firstControl)?.focus();

    return () => {
      if (element.open) element.close();
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus();
    };
  }, [open, initialFocus]);

  return (
    <dialog
      ref={dialog}
      role={role === "alertdialog" ? "alertdialog" : undefined}
      aria-modal="true"
      aria-labelledby={headingId}
      onCancel={(event) => {
        // Escape. The dialog closes when its owner says so, not on its own.
        event.preventDefault();
        if (dismissible) onClose();
      }}
      onClick={(event) => {
        // Only the backdrop is the dialog itself; the panel fills it.
        if (event.target === event.currentTarget && dismissible) onClose();
      }}
      onKeyDown={(event) => {
        // Tab goes round inside the sheet. A modal dialog already keeps the
        // page out of reach; this also keeps focus from stepping out to the
        // browser's own toolbar between the last control and the first.
        if (event.key !== "Tab") return;
        const stops = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
          (stop) => !stop.hasAttribute("disabled") && stop.getClientRects().length > 0,
        );
        const first = stops[0];
        const last = stops[stops.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      className={cn(
        "animate-slide-up m-0 w-full max-w-none border border-border bg-surface p-0 text-text shadow-elevated",
        "fixed inset-x-0 top-auto bottom-[var(--keyboard-inset)] max-h-[calc(90dvh-var(--keyboard-inset))] rounded-t-3xl",
        "md:inset-0 md:m-auto md:h-fit md:max-h-[85dvh] md:max-w-md md:rounded-2xl",
        "backdrop:bg-[rgb(20_12_8/0.45)] backdrop:backdrop-blur-[2px]",
        className,
      )}
    >
      <div className="flex max-h-[inherit] flex-col">
        <div className="flex justify-center pt-3 md:hidden" aria-hidden="true">
          <div className="h-1.5 w-12 rounded-full bg-border" />
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 px-6 pb-3 pt-3 md:pt-6">
          <h2 id={headingId} className="font-heading text-xl font-medium">
            {title}
          </h2>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label={UI_TEXT.actions.close}
              className="touch-target -mr-2 flex items-center justify-center rounded-full p-2 text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
            >
              <X size={20} strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
        </div>

        <div ref={body} className={cn("min-h-0 flex-1 overflow-y-auto px-6", footer ? "pb-4" : "safe-bottom [--safe-pb:1.5rem]")}>
          {children}
        </div>

        {footer && (
          <div className="safe-bottom [--safe-pb:1.5rem] shrink-0 border-t border-border bg-surface px-6 pt-4">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}
