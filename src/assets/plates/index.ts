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
