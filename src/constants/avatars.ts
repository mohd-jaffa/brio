/**
 * The profile pictures: nine animals (the user, 2026-09-27) and 24 people
 * (2026-09-28) that ship with the app, for the owner's own account and nothing
 * else — a customer keeps their initials. Not an upload: only the key is
 * stored (AGENTS.md §16). A new account is given one at random
 * (0026_profile_avatars), and the owner changes it from Settings.
 *
 * A key is stored in the database, so it is permanent: never renamed, never
 * reused. The keys are also `avatar_keys()` in the database (0029 has them
 * all); adding one is a migration. The images are mapped in
 * src/assets/avatars, kept apart so server code can use the keys without
 * loading images.
 */
export const AVATAR_GROUPS = ["ANIMALS", "PEOPLE"] as const;
export type AvatarGroup = (typeof AVATAR_GROUPS)[number];

/** Each group's heading in the chooser. */
export const AVATAR_GROUP_LABELS: Record<AvatarGroup, string> = {
  ANIMALS: "Animals",
  PEOPLE: "People",
};

export const AVATARS = {
  pomeranian: { label: "Pomeranian", group: "ANIMALS" },
  hamster: { label: "Hamster", group: "ANIMALS" },
  "blue-bear": { label: "Blue bear", group: "ANIMALS" },
  husky: { label: "Husky", group: "ANIMALS" },
  "polar-bear": { label: "Polar bear", group: "ANIMALS" },
  "cream-kitten": { label: "Cream kitten", group: "ANIMALS" },
  "ginger-cat": { label: "Ginger cat", group: "ANIMALS" },
  beagle: { label: "Beagle", group: "ANIMALS" },
  tiger: { label: "Tiger", group: "ANIMALS" },
  "green-hoodie": { label: "Green hoodie", group: "PEOPLE" },
  "wavy-hair": { label: "Wavy hair", group: "PEOPLE" },
  "round-glasses": { label: "Round glasses", group: "PEOPLE" },
  "top-bun": { label: "Top bun", group: "PEOPLE" },
  "full-beard": { label: "Full beard", group: "PEOPLE" },
  "sun-hat": { label: "Sun hat", group: "PEOPLE" },
  "curly-hair": { label: "Curly hair", group: "PEOPLE" },
  "flower-clip": { label: "Flower clip", group: "PEOPLE" },
  headphones: { label: "Headphones", group: "PEOPLE" },
  "coffee-mug": { label: "Coffee mug", group: "PEOPLE" },
  "green-shirt": { label: "Green shirt", group: "PEOPLE" },
  "purple-hoodie": { label: "Purple hoodie", group: "PEOPLE" },
  grandpa: { label: "Grandpa", group: "PEOPLE" },
  grandma: { label: "Grandma", group: "PEOPLE" },
  dungarees: { label: "Dungarees", group: "PEOPLE" },
  pigtails: { label: "Pigtails", group: "PEOPLE" },
  cap: { label: "Cap", group: "PEOPLE" },
  "hoop-earrings": { label: "Hoop earrings", group: "PEOPLE" },
  "cream-hoodie": { label: "Cream hoodie", group: "PEOPLE" },
  daydream: { label: "Daydream", group: "PEOPLE" },
  goatee: { label: "Goatee", group: "PEOPLE" },
  "bucket-hat": { label: "Bucket hat", group: "PEOPLE" },
  "navy-hoodie": { label: "Navy hoodie", group: "PEOPLE" },
  "low-bun": { label: "Low bun", group: "PEOPLE" },
} as const satisfies Record<string, { label: string; group: AvatarGroup }>;

export type AvatarKey = keyof typeof AVATARS;

/** In the order the chooser shows them: each sheet's, row by row, the animals first. */
export const AVATAR_KEYS = Object.keys(AVATARS) as [AvatarKey, ...AvatarKey[]];

export function isAvatarKey(value: string | null | undefined): value is AvatarKey {
  return value != null && Object.prototype.hasOwnProperty.call(AVATARS, value);
}

/** A stored key the app no longer has shows the first picture, never a broken image. */
export function avatarOr(value: string | null | undefined): AvatarKey {
  return isAvatarKey(value) ? value : AVATAR_KEYS[0];
}
