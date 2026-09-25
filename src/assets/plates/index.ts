import type { StaticImageData } from "next/image";

import brownies from "./brownies.webp";
import cakeTable from "./cake-table.webp";
import dripCake from "./drip-cake.webp";

/**
 * The photographic plates, built from the supplied photographs by
 * scripts/plates.mjs (plan §139.11.12). They are backgrounds only, so they are
 * decorative wherever they are shown, and text set on one needs a scrim.
 */
export const PLATES = {
  "cake-table": cakeTable,
  "drip-cake": dripCake,
  "brownies": brownies,
} as const satisfies Record<string, StaticImageData>;

export type PlateName = keyof typeof PLATES;

/** Where each plate's subject sits, so a crop to any shape keeps it in view. */
export const PLATE_FOCUS: Record<PlateName, string> = {
  "cake-table": "68% 55%",
  "drip-cake": "50% 45%",
  "brownies": "40% 55%",
};
