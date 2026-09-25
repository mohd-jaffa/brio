import { Wheat } from "lucide-react";
import Image from "next/image";

import { PLATE_FOCUS, PLATES, type PlateName } from "@/assets/plates";

/**
 * A line to end a screen on, centred in the serif on the sunken ground, with
 * a sprig and, where there is room, a small plate (plan §139.5, §139.11.12).
 */
export function QuoteBlock({ quote, plate }: { quote: string; plate?: PlateName }) {
  return (
    <figure className="flex items-center gap-4 rounded-2xl bg-sunken px-5 py-4">
      <Wheat size={26} strokeWidth={1.5} className="shrink-0 text-primary" aria-hidden="true" />
      <blockquote className="flex-1 text-center font-heading text-lg leading-snug text-text">
        <p>&ldquo;{quote}&rdquo;</p>
      </blockquote>
      {plate && (
        <div className="relative hidden size-16 shrink-0 overflow-hidden rounded-xl min-[380px]:block">
          <Image
            src={PLATES[plate]}
            alt=""
            fill
            sizes="64px"
            className="object-cover"
            style={{ objectPosition: PLATE_FOCUS[plate] }}
          />
        </div>
      )}
    </figure>
  );
}
