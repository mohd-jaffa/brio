import type { MetadataRoute } from "next";

import { UI_TEXT } from "@/constants/messages";
import { DEFAULT_THEME, THEME_COLORS } from "@/lib/theme/themes";

/**
 * The installed app (plan §139.19 R7.1): its name, how it opens — standalone,
 * with no browser around it — and its icons, the "b" and its leaf on dark
 * green (`scripts/brand.mjs`), one of them shaped for Android's masks. The
 * splash and the status bar take the page ground of the default theme; once
 * open, the theme-color meta follows the chosen one.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: UI_TEXT.appTitle,
    short_name: UI_TEXT.appShortName,
    description: UI_TEXT.appDescription,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: THEME_COLORS[DEFAULT_THEME],
    theme_color: THEME_COLORS[DEFAULT_THEME],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
