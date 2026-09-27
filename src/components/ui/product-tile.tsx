import { DEFAULT_PRODUCT_ILLUSTRATION, type IllustrationKey } from "@/constants/illustrations";

import { cn } from "./cn";
import { Illustration } from "./illustration";

const SIZES = { sm: 40, md: 48, lg: 64 } as const;
// The picture asked for when the tile fills a card: cards run 110–180 px wide.
const FILL_IMAGE = 144;

/**
 * What stands for a product wherever it is listed (plan §139.5): its chosen
 * illustration on a well of the theme's sunken tone, or the price tag until
 * one is chosen. It replaces the typographic bake tile of §137.3. 40 px in a
 * row, 48 px in a desktop table, and the full width of a product card. An
 * expense category's picture uses the same tile, with the receipt as its
 * `fallback`.
 */
export function ProductTile({
  iconKey,
  size = "sm",
  fallback = DEFAULT_PRODUCT_ILLUSTRATION,
  className,
}: {
  iconKey?: string | null;
  size?: keyof typeof SIZES | "fill";
  fallback?: IllustrationKey;
  className?: string;
}) {
  if (size === "fill") {
    return (
      <span
        aria-hidden="true"
        // As tall as the picture asked for (FILL_IMAGE), and fixed at that: the
        // picture arriving cannot stretch it and move the name and price below.
        className={cn("flex h-36 w-full items-center justify-center rounded-xl bg-sunken", className)}
      >
        <Illustration
          name={iconKey}
          fallback={fallback}
          size={FILL_IMAGE}
          className="h-4/5 w-auto"
        />
      </span>
    );
  }
  const box = SIZES[size];
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex shrink-0 items-center justify-center rounded-xl bg-sunken", className)}
      style={{ width: box, height: box }}
    >
      <Illustration name={iconKey} fallback={fallback} size={Math.round(box * 0.8)} />
    </span>
  );
}
