import { ChevronRight } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "./cn";

/**
 * A card-width row that opens something (plan §139.5): a mark, a title with
 * a line under it, and a chevron — Add custom item above the product grid, the
 * customer on an order. The whole row is the button.
 */
export function ActionRow({
  leading,
  title,
  subtitle,
  wrap = false,
  ...button
}: {
  /** The mark at its start, drawn by the caller: an icon tile, an avatar. */
  leading: ReactNode;
  title: string;
  subtitle: string;
  /** Lets the lines wrap instead of cutting them short — a hint that must be read whole. */
  wrap?: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "type" | "children" | "title">) {
  const line = wrap ? "block" : "block truncate";
  return (
    <button
      type="button"
      className="focus-inset flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left shadow-card transition-colors hover:bg-surface-hover"
      {...button}
    >
      {leading}
      <span className="min-w-0 flex-1">
        <span className={cn(line, "text-sm font-semibold text-text")}>{title}</span>
        <span className={cn(line, "text-sm text-text-muted")}>{subtitle}</span>
      </span>
      <ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-text-muted" />
    </button>
  );
}
