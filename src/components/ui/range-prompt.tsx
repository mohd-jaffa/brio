import { CalendarDays } from "lucide-react";

import { UI_TEXT } from "@/constants/messages";

import { EmptyState } from "./empty-state";

/**
 * What a report shows while a custom period still has a date to choose
 * (audit A4): the one thing to do, and nothing that looks like loading —
 * nothing is being fetched until both days are there. Said politely, as the
 * owner's own choice of Custom brought it.
 */
export function RangePrompt() {
  return (
    <div role="status" className="rounded-2xl border border-border bg-surface shadow-card">
      <EmptyState icon={CalendarDays} title={UI_TEXT.range.incompleteTitle} hint={UI_TEXT.range.incompleteHint} />
    </div>
  );
}
