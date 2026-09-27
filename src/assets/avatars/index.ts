import type { StaticImageData } from "next/image";

import type { AvatarKey } from "@/constants/avatars";

import beagle from "./beagle.webp";
import blueBear from "./blue-bear.webp";
import creamKitten from "./cream-kitten.webp";
import gingerCat from "./ginger-cat.webp";
import hamster from "./hamster.webp";
import husky from "./husky.webp";
import polarBear from "./polar-bear.webp";
import pomeranian from "./pomeranian.webp";
import tiger from "./tiger.webp";

/**
 * Each profile picture's image, cut from the supplied sheet by
 * scripts/avatars.mjs (the user, 2026-09-27). Imported statically, so a
 * missing file fails the build and every URL is hashed and cached for good.
 */
export const AVATAR_IMAGES: Record<AvatarKey, StaticImageData> = {
  "pomeranian": pomeranian,
  "hamster": hamster,
  "blue-bear": blueBear,
  "husky": husky,
  "polar-bear": polarBear,
  "cream-kitten": creamKitten,
  "ginger-cat": gingerCat,
  "beagle": beagle,
  "tiger": tiger,
};
