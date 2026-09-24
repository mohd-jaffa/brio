import { DEFAULT_PRODUCT_ILLUSTRATION } from "@/constants/illustrations";

import { cn } from "./cn";
import { Illustration } from "./illustration";

const SIZES = { sm: 40, md: 48, lg: 64 } as const;

/**
 * What stands for a product wherever it is listed (plan §139.5): its chosen
 * illustration on a well of the theme's sunken tone, or the price tag until
 * one is chosen. It replaces the typographic bake tile of §137.3.
 */
export function ProductTile({
  iconKey,
  size = "sm",
  className,
}: {
  iconKey?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const box = SIZES[size];
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex shrink-0 items-center justify-center rounded-xl bg-sunken", className)}
      style={{ width: box, height: box }}
    >
      <Illustration name={iconKey} fallback={DEFAULT_PRODUCT_ILLUSTRATION} size={Math.round(box * 0.8)} />
    </span>
  );
}
