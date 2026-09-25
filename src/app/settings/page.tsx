"use client";

import { Image as ImageIcon, UploadCloud } from "lucide-react";

import { AppShell } from "@/components/nav/AppShell";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { useResponse } from "@/components/ui/response-card";
import { UI_TEXT } from "@/constants/messages";
import { AccountSummary } from "@/features/auth/components/AccountSummary";

/**
 * The only file a baker may upload is their bakery's logo, at most 500 KB
 * (AGENTS.md §16). The size and type are checked here so a mistake is caught
 * before anything is sent; the server checks both again, because that is what
 * actually protects the bucket.
 *
 * The endpoint that stores it is not built yet, so the control says so rather
 * than reporting a success that did not happen — see the blocker in
 * changelog.md.
 */
export const MAX_LOGO_BYTES = 500 * 1024;
const ACCEPTED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function checkLogo(file: File): string | null {
  if (!ACCEPTED_LOGO_TYPES.includes(file.type)) return "Choose a PNG, JPG or WebP image.";
  if (file.size > MAX_LOGO_BYTES) return "That logo is larger than 500 KB.";
  return null;
}

export default function SettingsPage() {
  const respond = useResponse();

  const onPickLogo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    respond.error({
      title: UI_TEXT.outcomes.logoNotUploaded,
      message: checkLogo(file) ?? "Logo uploads are not available yet.",
    });
  };

  return (
    <AppShell>
      <PageHeader
        title="Settings"
        subtitle="Manage your bakery profile and preferences"
      />

      <section className="space-y-6 rounded-3xl border border-border bg-surface p-6 shadow-card">
        <div>
          <h2 className="mb-1 font-heading text-sm font-bold uppercase tracking-wider text-text">
            Brand Logo
          </h2>
          <p className="text-xs font-medium text-text-muted">
            This logo appears on your printed bills and shareable links.
          </p>
        </div>

        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div
            aria-hidden="true"
            className="flex h-24 w-24 flex-col items-center justify-center rounded-full border-2 border-dashed border-border bg-background text-text-muted"
          >
            <ImageIcon size={32} strokeWidth={2} className="mb-1" />
            <span className="text-[10px] font-bold uppercase">Logo</span>
          </div>

          <div className="flex-1 space-y-3">
            <label
              htmlFor="logo-upload"
              className="touch-target inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary bg-primary/5 px-5 py-2.5 text-sm font-bold text-primary transition-all hover:bg-primary/10 active:scale-95"
            >
              <UploadCloud size={18} strokeWidth={2.5} aria-hidden="true" />
              Upload New Logo
            </label>
            <input
              id="logo-upload"
              type="file"
              accept={ACCEPTED_LOGO_TYPES.join(",")}
              onChange={onPickLogo}
              className="sr-only"
            />
            <p className="inline-block rounded-lg bg-warning/10 p-2 text-[10px] font-bold tracking-wider text-warning">
              Max size 500 KB. PNG, JPG or WebP.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-border bg-surface p-6 shadow-card">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-text">
          Bakery Profile
        </h2>
        <p className="text-sm font-medium text-text-muted">
          Editing your bakery&rsquo;s name and business phone is not wired up yet. Until it is,
          this page shows only what can actually be changed.
        </p>
        <Button label="Save Details" disabled />
      </section>

      <AccountSummary />
    </AppShell>
  );
}
