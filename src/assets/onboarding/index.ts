import type { StaticImageData } from "next/image";

import bouquet from "./bouquet.webp";
import calendar from "./calendar.webp";
import desk from "./desk.webp";
import maker from "./maker.webp";

/**
 * The welcome's pictures (plan §139.11.20), cut from the supplied sheet by
 * scripts/onboarding.mjs. Each stands on transparent ground, so it sits on
 * either theme's paper. They are decorative: the words beside them say it all.
 */
export const WELCOME_SCENES = {
  maker,
  calendar,
  bouquet,
  desk,
} as const satisfies Record<string, StaticImageData>;

export type WelcomeScene = keyof typeof WELCOME_SCENES;
