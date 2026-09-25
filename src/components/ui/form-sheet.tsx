"use client";

import { useId, type ReactNode } from "react";

import { UI_TEXT } from "@/constants/messages";

import { Button, type ButtonVariant } from "./button";
import { ScreenNotice } from "./screen-notice";
import { Sheet } from "./sheet";

/**
 * The sheet a record is created or edited in: a `Sheet` holding a form, with
 * its submit button pinned in the foot. The button sits outside the scrolling
 * body and reaches the form through its id. The form stays mounted while the
 * sheet is closed, so nothing typed is lost to a re-render (R1.9).
 */
export function FormSheet({
  open,
  title,
  onClose,
  onSubmit,
  submitLabel,
  submitVariant = "primary",
  submitting = false,
  error,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  /** `danger` for a sheet that confirms something that cannot be undone. */
  submitVariant?: ButtonVariant;
  submitting?: boolean;
  error?: string | null;
  children: ReactNode;
}) {
  const formId = useId();
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <Button
          type="submit"
          form={formId}
          label={submitting ? UI_TEXT.actions.saving : submitLabel}
          loading={submitting}
          variant={submitVariant}
          fullWidth
        />
      }
    >
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
    </Sheet>
  );
}
