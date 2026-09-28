import type { StaticImageData } from "next/image";

import barChart from "./bar-chart.webp";
import bell from "./bell.webp";
import clipboard from "./clipboard.webp";
import openBox from "./open-box.webp";
import people from "./people.webp";
import storefront from "./storefront.webp";

/**
 * The empty states' art (the user, 2026-09-28; plan §139.21.4), cut from the
 * supplied sheet by scripts/empty-art.mjs. Decorative wherever it is shown:
 * the empty state's title says what is missing.
 */
export const EMPTY_ART = {
  "open-box": openBox,
  "storefront": storefront,
  "clipboard": clipboard,
  "people": people,
  "bar-chart": barChart,
  "bell": bell,
} as const satisfies Record<string, StaticImageData>;

export type EmptyArtName = keyof typeof EMPTY_ART;
