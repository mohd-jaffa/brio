/**
 * The one file a user may upload: their business's logo (plan §56, §118;
 * AGENTS.md §16). The database's bucket repeats both limits, so a write that
 * skips the app is held to them too (0008_business_profile.sql).
 */

/** 500 KB. */
export const MAX_LOGO_BYTES = 500 * 1024;

/** Read from the file's own first bytes on the server, never from what the browser says it is. */
export const LOGO_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type LogoMimeType = (typeof LOGO_MIME_TYPES)[number];

/** The private bucket it lives in. */
export const LOGO_BUCKET = "business-logos";
