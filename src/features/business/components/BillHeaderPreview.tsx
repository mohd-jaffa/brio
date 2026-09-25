import { useId } from "react";

import { UI_TEXT } from "@/constants/messages";
import { formatPhoneDigits } from "@/lib/phone";

import { BusinessLogo } from "./BusinessLogo";

/**
 * The top of a bill as it will read, drawn from what is typed in Business
 * details as it is typed (plan §139.10). Only a preview: the bill itself is
 * built on demand from the saved profile (R4.1).
 */
export function BillHeaderPreview({
  name,
  tagline,
  address,
  city,
  phone,
  logoUrl,
}: {
  // As the form holds them: a field not yet touched may be empty or absent.
  name?: string | null;
  tagline?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  logoUrl: string | null;
}) {
  const captionId = useId();
  const typed = (value?: string | null) => value?.trim() ?? "";
  const digits = formatPhoneDigits(typed(phone));
  const lines = [typed(address), typed(city), digits ? `${UI_TEXT.fields.phonePrefix} ${digits}` : ""].filter(Boolean);

  return (
    <figure aria-labelledby={captionId} className="space-y-2">
      <figcaption id={captionId} className="text-xs font-semibold uppercase tracking-wider text-text-muted">
        {UI_TEXT.business.preview}
      </figcaption>
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
        <div className="flex items-center gap-4">
          <BusinessLogo src={logoUrl} size="lg" />
          <div className="min-w-0">
            <p className="break-words font-heading text-xl font-medium leading-tight text-text">
              {typed(name) || <span className="text-text-muted">{UI_TEXT.business.name}</span>}
            </p>
            {typed(tagline) && <p className="mt-1 break-words text-sm italic text-text-muted">{typed(tagline)}</p>}
          </div>
        </div>
        {lines.length > 0 && (
          <p className="mt-4 whitespace-pre-line break-words border-t border-border pt-4 text-sm leading-relaxed text-text-muted">
            {lines.join("\n")}
          </p>
        )}
      </div>
      <p className="text-xs text-text-muted">{UI_TEXT.business.previewNote}</p>
    </figure>
  );
}
