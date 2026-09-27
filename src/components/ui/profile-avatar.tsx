import Image from "next/image";

import { AVATAR_IMAGES } from "@/assets/avatars";
import { AVATARS, avatarOr } from "@/constants/avatars";

import { cn } from "./cn";

const SIZES = {
  sm: { px: 36, className: "size-9" },
  lg: { px: 80, className: "size-20" },
} as const;

/**
 * The owner's profile picture (the user, 2026-09-27): one of the nine animals
 * that ship with the app, on a soft round well. Only the owner's own account
 * wears one; a customer keeps their initials (`Avatar`). Beside the name it is
 * decoration and says nothing to a screen reader; where it stands alone — a
 * choice in the chooser — `labelled` gives it the animal's name.
 */
export function ProfileAvatar({
  avatar,
  size = "sm",
  labelled = false,
  className,
}: {
  avatar: string | null | undefined;
  size?: keyof typeof SIZES;
  labelled?: boolean;
  className?: string;
}) {
  const key = avatarOr(avatar);
  const { px, className: box } = SIZES[size];
  return (
    <span className={cn("inline-flex shrink-0 overflow-hidden rounded-full bg-primary-soft", box, className)}>
      <Image
        src={AVATAR_IMAGES[key]}
        alt={labelled ? AVATARS[key].label : ""}
        width={px}
        height={px}
        sizes={`${px}px`}
        className="size-full object-contain"
      />
    </span>
  );
}
