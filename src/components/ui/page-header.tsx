import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * The title block at the top of a screen: what it is, a line saying what it is
 * for, and the actions that start something new. Each screen had restyled this
 * by hand, so the headings had drifted apart in size and weight.
 */
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="flex items-center gap-2 font-heading text-2xl font-bold tracking-tight text-text sm:text-3xl">
          {Icon && <Icon size={28} strokeWidth={2.5} className="text-primary" aria-hidden="true" />}
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm font-medium text-text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap gap-2">{children}</div>}
    </section>
  );
}
