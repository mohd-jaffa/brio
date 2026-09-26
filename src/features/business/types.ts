import type { LogoMimeType } from "@/constants/uploads";

/** The `bakeries` row, as far as the business profile reads it. */
export interface BusinessRow {
  id: string;
  business_name: string;
  tagline: string | null;
  city: string | null;
  address: string | null;
  phone: string;
  logo_path: string | null;
  logo_mime_type: LogoMimeType | null;
  name_changed_at: string | null;
}

/**
 * The business as its screens show it: the shell's mark, Business details and
 * the bill's header (plan §139.10). The logo is a URL on this app, never a
 * storage path (AGENTS.md §16); it changes whenever the logo does, so a cached
 * copy of the old one is never shown.
 */
export interface BusinessProfile {
  id: string;
  name: string;
  tagline: string | null;
  city: string | null;
  address: string | null;
  phone: string;
  logoUrl: string | null;
  /** When the name last changed; it changes once in 30 days (0021). */
  nameChangedAt: string | null;
}
