import { Loader2 } from "lucide-react";

import { cn } from "@/components/ui/cn";

/**
 * What a screen shows while it does not yet know who is asking. It is
 * announced, because the alternative is a blank page that says nothing to
 * anyone who cannot see the spinner (AGENTS.md §21).
 *
 * `inline` is the same wait shown inside a form sheet rather than in place of
 * a whole screen — the confirmation screen waits with its scene already drawn
 * around it, so it must not paint its own background over it.
 */
export function AuthPending({ message, inline = false }: { message: string; inline?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-3",
        inline
          ? "justify-center rounded-2xl bg-surface px-4 py-6 text-text-muted"
          : "min-h-screen flex-col justify-center bg-background text-text-muted",
      )}
    >
      <Loader2 size={inline ? 20 : 28} className="animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
