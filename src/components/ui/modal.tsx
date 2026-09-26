"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";

import { cn } from "./cn";

// What can take focus inside the modal, in the order Tab would reach it.
const FOCUSABLE = "input, select, textarea, button, a[href], [tabindex]:not([tabindex='-1'])";

/**
 * A modal on the native `<dialog>` (BUG-25), placed as a bottom sheet on a
 * phone and centred from 768 px. The sheet and the response card are built on
 * it; what it owes a keyboard and a screen reader lives here once:
 *
 * - **The page behind is inert.** `showModal()` puts it in the top layer and
 *   makes everything else unreachable — by Tab, by a screen reader, by a
 *   pointer — and Tab goes round inside it, first to last and back.
 * - **Focus** moves in when it opens — to `initialFocus`, else the first
 *   field in `focusScope`, else the first control there — and goes back to
 *   whatever opened it when it closes.
 * - **Escape** and a tap on the backdrop call `onDismiss`, when there is one.
 * - **It stays mounted while closed.** A closed `<dialog>` is simply not
 *   drawn, so a form inside it keeps its state.
 * - **It fits the screen**: `dvh` heights, above the on-screen keyboard
 *   (`--keyboard-inset`), and the page does not scroll behind it.
 * - **It leaves as it came.** Closing is immediate — focus is back and the
 *   page live at once — while the browser plays it out on top.
 */
export function Modal({
  open,
  onDismiss,
  labelledBy,
  role = "dialog",
  initialFocus,
  focusScope,
  motion = "slide",
  className,
  children,
}: {
  open: boolean;
  /** Escape and the backdrop; without it, only a choice inside closes it. */
  onDismiss?: () => void;
  labelledBy: string;
  role?: "dialog" | "alertdialog";
  initialFocus?: RefObject<HTMLElement | null>;
  /** Where to look for the first field or control; the whole modal by default. */
  focusScope?: RefObject<HTMLElement | null>;
  /**
   * `slide` comes up from a phone's bottom edge and goes back down it (a
   * centred card rises and settles); `rise` is the response card's shorter
   * move. Each leaves as it came, and only fades under reduced motion
   * (`globals.css`, Sheets and cards).
   */
  motion?: "slide" | "rise";
  className?: string;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element || !open) return;

    const opener = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    if (!element.open) element.showModal();
    document.body.style.overflow = "hidden";

    const scope = focusScope?.current ?? element;
    const firstField = scope.querySelector<HTMLElement>("input, select, textarea");
    const firstControl = scope.querySelector<HTMLElement>(FOCUSABLE);
    (initialFocus?.current ?? firstField ?? firstControl)?.focus();

    return () => {
      if (element.open) element.close();
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus();
    };
  }, [open, initialFocus, focusScope]);

  return (
    <dialog
      ref={dialog}
      role={role === "alertdialog" ? "alertdialog" : undefined}
      aria-modal="true"
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        // Escape. The modal closes when its owner says so, not on its own.
        event.preventDefault();
        onDismiss?.();
      }}
      onClick={(event) => {
        // Only the backdrop is the dialog itself; the panel fills it.
        if (event.target === event.currentTarget) onDismiss?.();
      }}
      onKeyDown={(event) => {
        // Tab goes round inside. A modal dialog already keeps the page out of
        // reach; this also keeps focus from stepping out to the browser's own
        // toolbar between the last control and the first.
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
        motion === "slide" ? "modal-slide" : "modal-rise",
        "m-0 w-full max-w-none border border-border bg-surface p-0 text-text shadow-elevated",
        "fixed inset-x-0 top-auto bottom-[var(--keyboard-inset)] max-h-[calc(90dvh-var(--keyboard-inset))] rounded-t-3xl",
        "md:inset-0 md:m-auto md:h-fit md:max-h-[85dvh] md:max-w-md md:rounded-2xl",
        "backdrop:bg-[rgb(20_12_8/0.45)] backdrop:backdrop-blur-[2px]",
        className,
      )}
    >
      {children}
    </dialog>
  );
}
