import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

import { EMPTY_ART, type EmptyArtName } from "@/assets/empty";

import { Medallion } from "./medallion";

/**
 * What a list shows when it has nothing in it: what is missing, why it is
 * worth having, and the one action that starts it. Every list screen had
 * written its own; this is the shape they had all been converging on. The
 * title sits in the serif (plan §139.5), over a drawing of what is missing
 * (§139.21.4; the user, 2026-09-28) or, where there is none, an icon in the
 * kit's medallion. The drawing is decoration — the title carries the meaning —
 * and settles in with a short drop, only fading under reduced motion.
 */
export function EmptyState({
  title,
  hint,
  action,
  ...picture
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
} & ({ art: EmptyArtName; icon?: never } | { icon: LucideIcon; art?: never })) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
      {picture.art ? (
        // A fixed box: its place is kept while it loads, whatever the drawing's shape.
        <span className="animate-drop-in relative mb-5 block h-32 w-44">
          <Image src={EMPTY_ART[picture.art]} alt="" fill sizes="176px" className="object-contain" />
        </span>
      ) : (
        <Medallion icon={picture.icon} size="lg" className="mb-4" />
      )}
      <h3 className="mb-1 font-heading text-xl font-medium text-text">{title}</h3>
      {hint && <p className="mb-6 max-w-sm text-sm text-text-muted">{hint}</p>}
      {action}
    </div>
  );
}
