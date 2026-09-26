import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The title over a part of a screen (plan §139.5): "Orders due", "Top
 * products", in the serif, with **View all** — or another control — at its
 * end. The heading names its section: give the section `aria-labelledby={id}`.
 */
export function SectionHeading({
  id,
  title,
  viewAll,
  children,
}: {
  id: string;
  title: string;
  /** Where the whole list is, and the link's words for a screen reader: "View all orders". */
  viewAll?: { href: string; label: string; name: string };
  /** Controls beside the title, before View all. */
  children?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 id={id} className="font-heading text-lg font-medium text-text">
        {title}
      </h2>
      <div className="flex shrink-0 items-center gap-2">
        {children}
        {viewAll && (
          <Link
            href={viewAll.href}
            aria-label={viewAll.name}
            className="touch-target inline-flex items-center gap-1 rounded-lg px-2 text-sm font-medium text-primary transition-colors hover:bg-surface-hover"
          >
            {viewAll.label}
            <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  );
}
