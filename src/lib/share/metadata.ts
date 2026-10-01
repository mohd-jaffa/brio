import type { Metadata } from "next";

import { UI_TEXT } from "@/constants/messages";
import { publicAppUrl } from "@/lib/env/public";

/** Where a shared link points: the app's own address, so a preview's picture and link are whole. */
export function siteUrl(): URL {
  return new URL(publicAppUrl() || "http://localhost:3000");
}

/**
 * How a link to Brio looks once shared (the user, 2026-10-01: "add open graph
 * meta data for a better previews in social medias"): named Brio, with a line
 * of what it is, as a large card. The picture is the root segment's
 * `opengraph-image` and `twitter-image` (scripts/og-image.mts), which every
 * page shares; `path` is given where a page is the one meant to be shared.
 */
export function shareMetadata(description: string, path?: string): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      type: "website",
      siteName: UI_TEXT.appName,
      title: UI_TEXT.appTitle,
      description,
      locale: "en_IN",
      ...(path === undefined ? {} : { url: path }),
    },
    twitter: { card: "summary_large_image", title: UI_TEXT.appTitle, description },
  };
}
