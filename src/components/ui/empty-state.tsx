import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * What a list shows when it has nothing in it: what is missing, why it is
 * worth having, and the one action that starts it. Every list screen had
 * written its own; this is the shape they had all been converging on.
 */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-surface">
        <Icon size={32} strokeWidth={2} className="text-text-muted/40" aria-hidden="true" />
      </div>
      <h3 className="mb-1 font-heading text-lg font-bold text-text">{title}</h3>
      {hint && <p className="mb-6 max-w-sm text-sm text-text-muted">{hint}</p>}
      {action}
    </div>
  );
}
