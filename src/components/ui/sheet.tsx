"use client";

import { X } from "lucide-react";
import { useId, useRef, type ReactNode, type RefObject } from "react";

import { UI_TEXT } from "@/constants/messages";

import { cn } from "./cn";
import { Modal } from "./modal";

/**
 * A bottom sheet on a phone and a centred dialog from 768 px (plan §139.5):
 * a grab handle, the title with a close button, a scrolling body and a foot
 * for its actions, on the kit's `Modal` — which keeps the page behind inert,
 * moves focus in and back, and stays mounted while closed (BUG-25, R1.9).
 * Focus goes to the first field of the body, never the close button.
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
  role?: "dialog" | "alertdialog";
  /** Whether Escape, the backdrop and a close button can close it. */
  dismissible?: boolean;
  initialFocus?: RefObject<HTMLElement | null>;
  /** Pinned under the scrolling body — the sheet's actions. */
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const headingId = useId();
  const body = useRef<HTMLDivElement>(null);

  return (
    <Modal
      open={open}
      onDismiss={dismissible ? onClose : undefined}
      labelledBy={headingId}
      role={role}
      initialFocus={initialFocus}
      focusScope={body}
      className={className}
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

        <div
          ref={body}
          className={cn("min-h-0 flex-1 overflow-y-auto px-6", footer ? "pb-4" : "safe-bottom [--safe-pb:1.5rem]")}
        >
          {children}
        </div>

        {footer && (
          <div className="safe-bottom [--safe-pb:1.5rem] shrink-0 border-t border-border bg-surface px-6 pt-4">
            {footer}
          </div>
        )}
      </div>
    </Modal>
  );
}
