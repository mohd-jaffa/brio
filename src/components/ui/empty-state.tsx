import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Medallion } from "./medallion";

/**
 * What a list shows when it has nothing in it: what is missing, why it is
 * worth having, and the one action that starts it. Every list screen had
 * written its own; this is the shape they had all been converging on. The
 * icon sits in the kit's medallion and the title in the serif (plan §139.5).
 */
export function EmptyState({
  icon,
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
    <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
      <Medallion icon={icon} size="lg" className="mb-4" />
      <h3 className="mb-1 font-heading text-xl font-medium text-text">{title}</h3>
      {hint && <p className="mb-6 max-w-sm text-sm text-text-muted">{hint}</p>}
      {action}
    </div>
  );
}
