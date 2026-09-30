import { Check } from "lucide-react";

import { cn } from "@/components/ui/cn";

/**
 * A title that rises out of its own line as it scrolls into view, as the
 * headline does as the page arrives (globals.css, `.landing-rise-title`); the
 * window keeps room for descenders.
 */
export function RisingTitle({
  as: Tag,
  id,
  className,
  children,
}: {
  as: "h2" | "h3";
  id: string;
  className: string;
  children: string;
}) {
  return (
    <Tag id={id} className={cn(className, "landing-rise-title -mb-[0.14em] overflow-hidden pb-[0.14em]")}>
      <span className="block">{children}</span>
    </Tag>
  );
}

/**
 * One point, its check drawn as it scrolls into view, as a job is ticked off.
 * `marker` makes it a place the day's pinned phone turns at (`DayOnOnePhone`).
 */
export function Point({ children, marker = false }: { children: string; marker?: boolean }) {
  return (
    <li className="landing-point relative flex gap-3 text-[0.9375rem] leading-relaxed text-text">
      {marker && <span data-stop="" aria-hidden="true" className="day-marker" />}
      <Check
        size={18}
        strokeWidth={2.25}
        aria-hidden="true"
        className="landing-tick mt-[0.2rem] shrink-0 text-primary"
      />
      <span>{children}</span>
    </li>
  );
}
