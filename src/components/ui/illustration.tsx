import Image from "next/image";

import { ILLUSTRATION_IMAGES } from "@/assets/illustrations";
import { ILLUSTRATIONS, illustrationOr, type IllustrationKey } from "@/constants/illustrations";

import { cn } from "./cn";

/**
 * One picture from the illustration library (plan §139.11.10). Beside a name it
 * is decoration and says nothing to a screen reader; where it stands alone —
 * an option in the picker — `labelled` gives it its name. A key the library no
 * longer has shows the fallback, never a broken image.
 */
export function Illustration({
  name,
  fallback,
  size,
  labelled = false,
  priority = false,
  className,
}: {
  name: string | null | undefined;
  fallback: IllustrationKey;
  /** Drawn size in CSS pixels; the browser is sent a file sized to match. */
  size: number;
  labelled?: boolean;
  /** Fetch immediately when this picture is expected to be the screen's largest paint. */
  priority?: boolean;
  className?: string;
}) {
  const key = illustrationOr(name, fallback);
  return (
    <Image
      src={ILLUSTRATION_IMAGES[key]}
      alt={labelled ? ILLUSTRATIONS[key].label : ""}
      width={size}
      height={size}
      sizes={`${size}px`}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      className={cn("object-contain", className)}
    />
  );
}
