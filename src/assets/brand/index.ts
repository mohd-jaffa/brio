import type { StaticImageData } from "next/image";

import icon from "./icon.webp";
import leaf from "./leaf.webp";
import wordmark from "./wordmark.webp";

/**
 * The app's own marks (the user, 2026-09-28: "these are the logos of the
 * app"), built from the supplied files by scripts/brand.mjs, with each one's
 * size as drawn. The same script builds the installed app's icons and the
 * favicon.
 *
 * - `icon`: the "b" and its leaf on dark green, a rounded square.
 * - `wordmark`: "Brio", its leaf over the i.
 * - `leaf`: the leaf alone, the smallest mark.
 */
export const BRAND = {
  icon: { src: icon, width: 192, height: 192 },
  wordmark: { src: wordmark, width: 441, height: 200 },
  leaf: { src: leaf, width: 107, height: 96 },
} as const satisfies Record<string, { src: StaticImageData; width: number; height: number }>;

/** A mark's width when drawn `height` px tall. */
export function brandWidth(mark: keyof typeof BRAND, height: number): number {
  return Math.round((BRAND[mark].width * height) / BRAND[mark].height);
}
