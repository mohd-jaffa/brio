"use client";

import { ImageIcon, UploadCloud } from "lucide-react";
import { useId, useRef, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { useResponse } from "@/components/ui/response-card";
import { ERROR_MESSAGES, UI_TEXT } from "@/constants/messages";
import { LOGO_MIME_TYPES } from "@/constants/uploads";
import { apiRoutes } from "@/lib/query/keys";
import { useApiMutation } from "@/lib/query/useApiMutation";

import { BusinessClient } from "../api.client";
import type { BusinessProfile } from "../types";
import { checkLogoFile } from "../upload";
import { BusinessLogo } from "./BusinessLogo";

/**
 * The business's one upload: its logo (plan §56, AGENTS.md §16). Choosing a
 * file sends it at once; the old logo stays until the new one is stored, so a
 * failed upload changes nothing. The button is a real button that opens the
 * file chooser, so it is reached and announced like any other.
 */
export function LogoField({ logoUrl }: { logoUrl: string | null }) {
  const headingId = useId();
  const hintId = useId();
  const chooser = useRef<HTMLInputElement>(null);
  const respond = useResponse();

  const upload = useApiMutation<File, BusinessProfile>(BusinessClient.uploadLogo, {
    revalidate: [apiRoutes.business.profile],
    onSuccess: () => respond.success({ title: UI_TEXT.outcomes.logoUploaded }),
    onError: (failure) =>
      respond.failure(failure, { title: UI_TEXT.outcomes.logoNotUploaded, fallback: "UPLOAD_FAILED" }),
  });

  const onChoose = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Cleared, so choosing the same file again after a refusal still counts.
    event.target.value = "";
    if (!file) return;

    const problem = checkLogoFile(file);
    if (problem) {
      respond.error({ title: UI_TEXT.outcomes.logoNotUploaded, message: ERROR_MESSAGES[problem] });
      return;
    }
    void upload.submit(file);
  };

  return (
    <section aria-labelledby={headingId} className="rounded-3xl border border-border bg-surface p-5 shadow-card md:p-6">
      <h2 id={headingId} className="font-heading text-lg font-medium text-text">
        {UI_TEXT.business.logo}
      </h2>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        {logoUrl ? (
          <BusinessLogo src={logoUrl} size="lg" alt={UI_TEXT.business.currentLogo} />
        ) : (
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-border bg-background text-text-muted">
            <ImageIcon size={24} strokeWidth={1.75} aria-hidden="true" />
            <span className="sr-only">{UI_TEXT.business.noLogo}</span>
          </span>
        )}
        <div className="min-w-0 space-y-2">
          <Button
            label={logoUrl ? UI_TEXT.business.replaceLogo : UI_TEXT.business.uploadLogo}
            icon={UploadCloud}
            variant="secondary"
            loading={upload.submitting}
            aria-describedby={hintId}
            onClick={() => chooser.current?.click()}
          />
          <p id={hintId} className="text-xs text-text-muted">
            {UI_TEXT.business.logoHint}
          </p>
        </div>
      </div>
      <input
        ref={chooser}
        type="file"
        accept={LOGO_MIME_TYPES.join(",")}
        onChange={onChoose}
        hidden
        tabIndex={-1}
        aria-hidden="true"
      />
    </section>
  );
}
