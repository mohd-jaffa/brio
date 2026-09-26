import Image from "next/image";
import type { ReactNode } from "react";

import { PLATES, PLATE_FOCUS, PLATE_QUALITY, type PlateName } from "@/assets/plates";

import { cn } from "./cn";

/**
 * The picture band at the top of a screen (plan §139.5): a line or two in the
 * serif, a short rule, a tracked line, and a photographic plate on the right
 * (§139.11.12). `hero` is the Home greeting; `band` is the compact strip on
 * Analytics and Expenses, low enough that their numbers stay above the fold.
 *
 * Text never sits on the photograph: the plate takes the right three-fifths
 * and fades in from nothing between 15 % and 70 % of its width; the words keep
 * to the left, over the sunken ground and the faint start of that fade. Every
 * word was measured at ≥ 4.5 : 1 against the darkest pixel behind it.
 */
export function Hero({
  lines,
  subtitle,
  tagline,
  plate,
  variant = "hero",
  priority = false,
  as: Title = "p",
  children,
}: {
  /** The serif words, one entry per line, as the composition breaks them. */
  lines: readonly string[];
  subtitle?: string;
  /** The small tracked line under the rule: "GROW · BAKE · REPEAT". */
  tagline?: string;
  plate?: PlateName;
  variant?: "hero" | "band";
  /** For the plate that is the screen's largest paint. */
  priority?: boolean;
  /** `h1` where the words are the screen's title, as the Home greeting is. */
  as?: "h1" | "p";
  children?: ReactNode;
}) {
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden rounded-2xl bg-sunken",
        variant === "hero" ? "min-h-52 sm:min-h-64" : "min-h-36 sm:min-h-40",
      )}
    >
      {plate && (
        <div
          className={cn(
            "absolute inset-y-0 right-0 -z-10 w-3/5",
            // On a wide screen the plate stops growing, so a portrait plate
            // is not cropped down to a sliver of its subject.
            variant === "hero" ? "max-w-2xl" : "max-w-md",
          )}
        >
          <Image
            src={PLATES[plate]}
            quality={PLATE_QUALITY}
            alt=""
            fill
            // Next 16 deprecates `priority` for these two.
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            sizes="(min-width: 1024px) 720px, 60vw"
            className="object-cover [mask-image:linear-gradient(to_right,transparent_15%,black_70%)]"
            style={{ objectPosition: PLATE_FOCUS[plate] }}
          />
        </div>
      )}
      <div
        className={cn(
          "flex flex-col justify-center",
          variant === "hero" ? "max-w-[56%] p-5 sm:p-8" : "max-w-[52%] p-4 sm:p-6",
        )}
      >
        <Title
          className={cn(
            "font-heading font-medium leading-[1.1] tracking-tight text-text",
            variant === "hero" ? "text-[1.75rem] sm:text-4xl" : "text-xl sm:text-2xl",
          )}
        >
          {lines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </Title>
        {subtitle && <p className="mt-2 text-sm text-text-muted sm:text-base">{subtitle}</p>}
        <span aria-hidden="true" className="mt-3 block h-px w-10 bg-primary" />
        {tagline && (
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted sm:tracking-[0.3em]">
            {tagline}
          </p>
        )}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </section>
  );
}
