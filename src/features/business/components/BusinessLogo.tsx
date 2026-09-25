"use client";

import { Cake } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { cn } from "@/components/ui/cn";

const SIZES = {
  sm: { box: "size-9", px: 36, icon: 18 },
  md: { box: "size-10", px: 40, icon: 20 },
  lg: { box: "size-16", px: 64, icon: 28 },
} as const;

/**
 * The business's logo in a round frame, or the app's cake mark where it has
 * none — or where its logo fails to load, so a broken image is never shown.
 * The logo keeps its own proportions inside the frame: a wide wordmark is
 * fitted, not cropped. Decorative unless `alt` is given, because the business's
 * name is written beside it wherever it appears.
 */
export function BusinessLogo({
  src,
  size = "md",
  alt = "",
  eager = false,
}: {
  src: string | null;
  size?: keyof typeof SIZES;
  alt?: string;
  /** At the top of every screen, so it is fetched at once rather than when scrolled to. */
  eager?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const { box, px, icon } = SIZES[size];

  if (src && failed !== src) {
    return (
      <Image
        src={src}
        alt={alt}
        width={px}
        height={px}
        // Served by the app itself, for the signed-in owner only: the image
        // optimiser would fetch it without the session and be refused.
        unoptimized
        loading={eager ? "eager" : "lazy"}
        onError={() => setFailed(src)}
        className={cn(box, "shrink-0 rounded-full border border-border bg-surface object-contain p-0.5")}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(box, "flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-text shadow-card")}
    >
      <Cake size={icon} strokeWidth={1.75} />
    </span>
  );
}
