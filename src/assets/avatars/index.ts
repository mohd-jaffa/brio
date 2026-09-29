import type { StaticImageData } from "next/image";

import type { AvatarKey } from "@/constants/avatars";

import beagle from "./beagle.webp";
import blueBear from "./blue-bear.webp";
import bucketHat from "./bucket-hat.webp";
import cap from "./cap.webp";
import coffeeMug from "./coffee-mug.webp";
import creamHoodie from "./cream-hoodie.webp";
import creamKitten from "./cream-kitten.webp";
import curlyHair from "./curly-hair.webp";
import daydream from "./daydream.webp";
import dungarees from "./dungarees.webp";
import flowerClip from "./flower-clip.webp";
import fullBeard from "./full-beard.webp";
import gingerCat from "./ginger-cat.webp";
import goatee from "./goatee.webp";
import grandma from "./grandma.webp";
import grandpa from "./grandpa.webp";
import greenHoodie from "./green-hoodie.webp";
import greenShirt from "./green-shirt.webp";
import hamster from "./hamster.webp";
import headphones from "./headphones.webp";
import hoopEarrings from "./hoop-earrings.webp";
import husky from "./husky.webp";
import lowBun from "./low-bun.webp";
import navyHoodie from "./navy-hoodie.webp";
import pigtails from "./pigtails.webp";
import polarBear from "./polar-bear.webp";
import pomeranian from "./pomeranian.webp";
import purpleHoodie from "./purple-hoodie.webp";
import roundGlasses from "./round-glasses.webp";
import sunHat from "./sun-hat.webp";
import tiger from "./tiger.webp";
import topBun from "./top-bun.webp";
import wavyHair from "./wavy-hair.webp";

/**
 * Each profile picture's image, cut from the supplied sheets by
 * scripts/avatars.mjs: the animals (the user, 2026-09-27) and the people
 * (2026-09-28). Imported statically, so a missing file fails the build and
 * every URL is hashed and cached for good.
 */
export const AVATAR_IMAGES: Record<AvatarKey, StaticImageData> = {
  pomeranian: pomeranian,
  hamster: hamster,
  "blue-bear": blueBear,
  husky: husky,
  "polar-bear": polarBear,
  "cream-kitten": creamKitten,
  "ginger-cat": gingerCat,
  beagle: beagle,
  tiger: tiger,
  "green-hoodie": greenHoodie,
  "wavy-hair": wavyHair,
  "round-glasses": roundGlasses,
  "top-bun": topBun,
  "full-beard": fullBeard,
  "sun-hat": sunHat,
  "curly-hair": curlyHair,
  "flower-clip": flowerClip,
  headphones: headphones,
  "coffee-mug": coffeeMug,
  "green-shirt": greenShirt,
  "purple-hoodie": purpleHoodie,
  grandpa: grandpa,
  grandma: grandma,
  dungarees: dungarees,
  pigtails: pigtails,
  cap: cap,
  "hoop-earrings": hoopEarrings,
  "cream-hoodie": creamHoodie,
  daydream: daydream,
  goatee: goatee,
  "bucket-hat": bucketHat,
  "navy-hoodie": navyHoodie,
  "low-bun": lowBun,
};
