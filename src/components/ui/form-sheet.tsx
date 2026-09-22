"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

import { UI_TEXT } from "@/constants/messages";

import { Button } from "./button";
import { ScreenNotice } from "./screen-notice";

/**
 * The sheet a record is created or edited in: a bottom sheet on a phone, a
 * centred dialog from tablet up. Every feature had built its own copy of this
 * chrome — overlay, grab handle, title row, close button, scrolling body,
 * pinned footer — and each copy had a different set of the things a dialog
 * owes a keyboard user. Those live here now, once:
 *
 * - Escape closes it, and so does a click on the backdrop.
 * - Focus moves into the sheet when it opens and returns to whatever opened it
 *   when it closes.
 * - The heading names the dialog through aria-labelledby.
 * - The page behind it does not scroll while it is open (AGENTS.md §21).
 */
export function FormSheet({
  open,
  title,
  onClose,
  onSubmit,
  submitLabel,
  submitting = false,
  error,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  /** Wired to the footer button through the form's id, so the button can sit outside the scroll area. */
  onSubmit: () => void;
  submitLabel: string;
  submitting?: boolean;
  error?: string | null;
  children: ReactNode;
}) {
  const formId = useId();
  const headingId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    openerRef.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    // The first field, so typing can start straight away — not the close
    // button, which comes first in the markup.
    const sheet = sheetRef.current;
    const firstField = sheet?.querySelector<HTMLElement>("input, select, textarea");
    (firstField ?? sheet?.querySelector<HTMLElement>("button"))?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      openerRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="safe-bottom animate-slide-up fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col rounded-t-3xl border border-border bg-surface shadow-elevated md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl"
      >
        <div className="flex justify-center py-3 md:hidden">
          <div className="h-1.5 w-12 rounded-full bg-border" aria-hidden="true" />
        </div>

        <div className="flex items-center justify-between px-6 pb-4 md:pt-6">
          <h2 id={headingId} className="font-heading text-xl font-bold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={UI_TEXT.actions.close}
            className="touch-target flex items-center justify-center rounded-full p-2 text-text-muted transition-colors hover:bg-surface-hover hover:text-text active:scale-95"
          >
            <X size={20} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 pb-6">
          {error && (
            <div className="mb-4">
              <ScreenNotice>{error}</ScreenNotice>
            </div>
          )}
          <form
            id={formId}
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
            className="space-y-4"
            noValidate
          >
            {children}
          </form>
        </div>

        <div className="shrink-0 border-t border-border bg-surface p-6">
          <Button
            type="submit"
            form={formId}
            label={submitting ? UI_TEXT.actions.saving : submitLabel}
            loading={submitting}
            fullWidth
          />
        </div>
      </div>
    </>
  );
}
