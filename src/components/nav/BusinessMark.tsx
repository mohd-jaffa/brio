import { Cake } from "lucide-react";

import { UI_TEXT } from "@/constants/messages";

import { cn } from "../ui/cn";

/**
 * The business's mark, name and catch phrase, at the head of the phone's top
 * bar and the sidebar (plan §139.5). Until the business profile can be read
 * (R2.6) it shows the app's own name and line; the logo, once uploaded
 * (R2.7), takes the mark's place.
 */
export function BusinessMark({
  compact = false,
  className,
  textClassName,
}: {
  compact?: boolean;
  className?: string;
  /** The rail hides the words but keeps them for a screen reader. */
  textClassName?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-text shadow-card",
          compact ? "size-9" : "size-10",
        )}
      >
        <Cake size={compact ? 18 : 20} strokeWidth={1.75} />
      </span>
      <span className={cn("min-w-0", textClassName)}>
        <span className="block truncate font-heading text-lg font-medium leading-tight text-text">
          {UI_TEXT.appName}
        </span>
        <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
          {UI_TEXT.appTagline}
        </span>
      </span>
    </div>
  );
}
