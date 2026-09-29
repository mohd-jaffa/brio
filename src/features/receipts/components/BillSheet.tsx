"use client";

import { useRef, type ReactNode } from "react";

import { Sheet } from "@/components/ui/sheet";
import { SkeletonRows } from "@/components/ui/skeleton";
import { UI_TEXT } from "@/constants/messages";

import { billDocument } from "../document";
import type { Bill } from "../types";
import { BillView } from "./BillView";

/**
 * The bill in a dialog (plan §139.11.6): a real dialog with a heading, the
 * bill itself, and its actions at the foot — Share first; there is no print
 * (the user, 2026-09-26). While the bill is being built the dialog holds its
 * place and says so.
 *
 * It opens at its top, with focus there: a bill is read from its head, and
 * what stops an estimate being placed is said above it. Left to find the
 * first control, the sheet would start at the link in the bill's foot,
 * scrolled past both.
 */
export function BillSheet({
  open,
  onClose,
  title,
  bill,
  notice,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Absent while it is being built. */
  bill?: Bill;
  /** Said above the bill: what would stop an estimate being placed. */
  notice?: ReactNode;
  actions?: ReactNode;
}) {
  const top = useRef<HTMLDivElement>(null);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      initialFocus={top}
      footer={actions && <div className="flex flex-wrap gap-3 [&>*]:min-w-[8rem] [&>*]:flex-1">{actions}</div>}
    >
      <div ref={top} tabIndex={-1} className="space-y-4 pb-2 focus-visible:shadow-none focus-visible:outline-none">
        {notice}
        {bill ? (
          <BillView document={billDocument(bill)} />
        ) : (
          <div role="status" aria-busy="true" aria-label={UI_TEXT.bill.loading}>
            <SkeletonRows rows={3} height="h-28" />
          </div>
        )}
      </div>
    </Sheet>
  );
}
