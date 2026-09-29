"use client";

import { UI_TEXT } from "@/constants/messages";
import { BusinessLogo } from "@/features/business/components/BusinessLogo";
import { useBusiness } from "@/features/business/hooks/useBusiness";

import { cn } from "../ui/cn";

/**
 * The business's own mark, name and catch phrase, at the head of the phone's
 * top bar and the sidebar (plan §139.5, §139.11.2). Until the profile has
 * loaded, the words are a quiet placeholder rather than the app's name, so
 * the header does not flash the app's name before the business. If it cannot
 * be loaded, the app's own name and line stand in. With no logo, or no catch
 * phrase, the cake mark and a neutral line take their places.
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
  const { data: business, error } = useBusiness();
  const loading = business === undefined && !error;

  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <BusinessLogo src={business?.logoUrl ?? null} size={compact ? "sm" : "md"} eager />
      <span className={cn("min-w-0", textClassName)}>
        {loading ? (
          <span aria-busy="true" className="block">
            <span className="sr-only">{UI_TEXT.states.loading}</span>
            <span aria-hidden="true" className="block h-4 w-28 animate-pulse rounded bg-sunken" />
            <span aria-hidden="true" className="mt-1.5 block h-2.5 w-20 animate-pulse rounded bg-sunken" />
          </span>
        ) : (
          <>
            {/* The business leads (§139.11.2): a long name takes a second line
                rather than lose its end; past two, hovering shows all of it. */}
            <span
              title={business?.name}
              className={cn(
                "line-clamp-2 font-heading font-medium leading-tight text-balance break-words text-text",
                compact ? "text-base" : "text-lg",
              )}
            >
              {business?.name ?? UI_TEXT.appName}
            </span>
            <span className="block truncate text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-text-muted">
              {business ? (business.tagline ?? UI_TEXT.businessLine) : UI_TEXT.appTagline}
            </span>
          </>
        )}
      </span>
    </div>
  );
}
