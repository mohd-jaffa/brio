import { Loader2 } from "lucide-react";

/**
 * What a screen shows while it does not yet know who is asking. It is
 * announced, because the alternative is a blank page that says nothing to
 * anyone who cannot see the spinner (AGENTS.md §21).
 */
export function AuthPending({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-text-muted"
    >
      <Loader2 size={28} className="animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
