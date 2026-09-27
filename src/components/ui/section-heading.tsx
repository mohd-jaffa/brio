import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** Where the whole list is — another screen, or another view of this one. */
export type ViewAll = { label: string; name?: string } & ({ href: string } | { onClick: () => void });

const VIEW_ALL =
  "touch-target inline-flex items-center gap-1 rounded-lg px-2 text-sm font-medium text-primary transition-colors hover:bg-surface-hover";

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
  /**
   * Where the whole list is: a screen to go to, or a view of this one to show
   * (Transactions, from Recent expenses). `name` is its words for a screen
   * reader when the label alone is not enough: "View all orders".
   */
  viewAll?: ViewAll;
  /** Controls beside the title, before View all. */
  children?: ReactNode;
}) {
  return (
    // As tall as the View all link's target whether or not it has one, so
    // headings side by side line up.
    <div className="mb-3 flex min-h-11 items-center justify-between gap-3">
      <h2 id={id} className="font-heading text-lg font-medium text-text">
        {title}
      </h2>
      <div className="flex shrink-0 items-center gap-2">
        {children}
        {viewAll &&
          ("href" in viewAll ? (
            <Link href={viewAll.href} aria-label={viewAll.name} className={VIEW_ALL}>
              {viewAll.label}
              <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          ) : (
            <button type="button" onClick={viewAll.onClick} aria-label={viewAll.name} className={VIEW_ALL}>
              {viewAll.label}
              <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
            </button>
          ))}
      </div>
    </div>
  );
}
