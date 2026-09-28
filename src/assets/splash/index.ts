import type { StaticImageData } from "next/image";

import landscape from "./landscape.webp";
import portrait from "./portrait.webp";

/**
 * The launch splash's art (the user, 2026-09-28), built by scripts/splash.mjs:
 * a bakery scene round a plain cream middle, where the splash sets its
 * wordmark, its line and its progress bar. One for a screen held upright, one
 * for a screen on its side.
 */
export const SPLASH_ART = { portrait, landscape } as const satisfies Record<string, StaticImageData>;
