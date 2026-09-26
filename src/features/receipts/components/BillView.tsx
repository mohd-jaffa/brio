import { useId } from "react";

import { cn } from "@/components/ui/cn";
import { UI_TEXT } from "@/constants/messages";
import { BusinessLogo } from "@/features/business/components/BusinessLogo";

import type { BillDocument } from "../document";

/**
 * The bill on screen (plan §139.11.6): a white sheet with near-black ink in
 * either theme, the theme only in the header rule and the total, the serif
 * for the business's name and the total. It reads top to bottom to a screen
 * reader — who it is from, which bill, for whom, what, how much — and says
 * exactly what the image and the PDF say, since all three draw the same
 * document.
 */
export function BillView({ document }: { document: BillDocument }) {
  const headingId = useId();
  const { business, heading, parties, lines, totals, footer } = document;

  return (
    <article
      aria-labelledby={headingId}
      className="rounded-2xl border border-paper-rule bg-paper px-5 py-6 text-ink shadow-card sm:px-6"
    >
      <header>
        <div className="flex items-center gap-4">
          <BusinessLogo src={business.logoUrl} size="lg" />
          <div className="min-w-0">
            <p className="break-words font-heading text-xl font-medium leading-tight">{business.name}</p>
            {business.tagline && <p className="mt-1 break-words text-sm italic text-ink-muted">{business.tagline}</p>}
          </div>
        </div>
        <div className="mt-4 border-t-2 border-primary" />
        {business.contact.length > 0 && (
          <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-ink-muted">
            {business.contact.join("\n")}
          </p>
        )}
      </header>

      <div className="my-4 border-t border-dashed border-ink-muted/40" aria-hidden="true" />

      {/* An estimate says so on a band in the theme's colour: it is not yet an order. */}
      <div
        className={cn(
          "flex items-baseline justify-between gap-3",
          heading.note && "-mx-2 rounded-lg bg-primary/10 px-2 py-2",
        )}
      >
        <h3 id={headingId} className="min-w-0 font-body text-sm">
          <span
            className={cn(
              "text-xs font-semibold uppercase tracking-wider",
              heading.note ? "text-primary" : "text-ink-muted",
            )}
          >
            {heading.note ? `${heading.label} · ${heading.note}` : heading.label}
          </span>
          {heading.number && <span className="ml-2 font-semibold tabular-nums">{heading.number}</span>}
        </h3>
        <p className="shrink-0 text-sm tabular-nums text-ink-muted">{heading.date}</p>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        {parties.map((party) => (
          <div key={party.label} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3">
            <dt className="text-ink-muted">{party.label}</dt>
            <dd className="break-words">
              {party.value}
              {party.details.map((detail) => (
                <span key={detail} className="block text-ink-muted">
                  {detail}
                </span>
              ))}
              {party.link && (
                <a
                  href={party.link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block font-medium underline underline-offset-2"
                >
                  {party.link.label}
                </a>
              )}
            </dd>
          </div>
        ))}
      </dl>

      <div className="my-4 border-t border-dashed border-ink-muted/40" aria-hidden="true" />

      <ul role="list" aria-label={UI_TEXT.bill.items} className="space-y-3">
        {lines.map((line, index) => (
          <li key={index} className="text-sm">
            <p className="break-words font-semibold">{line.name}</p>
            <p className="flex items-baseline justify-between gap-3">
              <span className="tabular-nums text-ink-muted">{line.detail}</span>
              <span className="shrink-0 font-semibold tabular-nums">{line.amount}</span>
            </p>
            {line.note && <p className="mt-0.5 break-words italic text-ink-muted">{line.note}</p>}
          </li>
        ))}
      </ul>

      <dl aria-label={UI_TEXT.bill.totals} className="mt-4 space-y-2 border-t border-paper-rule pt-4 text-sm">
        {totals.map((total, index) => (
          <div
            key={index}
            className={cn(
              "flex items-baseline justify-between gap-3",
              total.emphasis === "total" && "border-t border-paper-rule pt-2",
            )}
          >
            <dt className={cn("min-w-0 break-words", total.emphasis === "normal" ? "text-ink-muted" : "font-semibold")}>
              {total.label}
            </dt>
            <dd
              className={cn(
                "shrink-0 tabular-nums",
                total.emphasis === "total" && "font-heading text-2xl font-medium text-primary",
                total.emphasis === "strong" && "font-semibold",
              )}
            >
              {total.amount}
            </dd>
          </div>
        ))}
      </dl>

      <div className="my-4 border-t border-dotted border-ink-muted/50" aria-hidden="true" />

      <footer className="space-y-1 text-center">
        <p className="text-sm font-medium">{document.thanks}</p>
        <p className="text-xs text-ink-muted">
          {footer.credit}
          {footer.host && footer.href && (
            <>
              {" · "}
              <a href={footer.href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                {footer.host}
              </a>
            </>
          )}
        </p>
      </footer>
    </article>
  );
}
