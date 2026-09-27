/**
 * The profile pictures (the user, 2026-09-27): nine animals that ship with the
 * app, for the owner's own account and nothing else — a customer keeps their
 * initials. Not an upload: only the key is stored (AGENTS.md §16). A new
 * account is given one at random (0026_profile_avatars), and the owner changes
 * it from Settings.
 *
 * A key is stored in the database, so it is permanent: never renamed, never
 * reused. The keys are also 0026's `avatar_keys()`; adding one is a migration.
 * The images are mapped in src/assets/avatars, kept apart so server code can
 * use the keys without loading images.
 */
export const AVATARS = {
  "pomeranian": { label: "Pomeranian" },
  "hamster": { label: "Hamster" },
  "blue-bear": { label: "Blue bear" },
  "husky": { label: "Husky" },
  "polar-bear": { label: "Polar bear" },
  "cream-kitten": { label: "Cream kitten" },
  "ginger-cat": { label: "Ginger cat" },
  "beagle": { label: "Beagle" },
  "tiger": { label: "Tiger" },
} as const satisfies Record<string, { label: string }>;

export type AvatarKey = keyof typeof AVATARS;

/** In the order the chooser shows them: the sheet's, row by row. */
export const AVATAR_KEYS = Object.keys(AVATARS) as [AvatarKey, ...AvatarKey[]];

export function isAvatarKey(value: string | null | undefined): value is AvatarKey {
  return value != null && Object.prototype.hasOwnProperty.call(AVATARS, value);
}

/** A stored key the app no longer has shows the first picture, never a broken image. */
export function avatarOr(value: string | null | undefined): AvatarKey {
  return isAvatarKey(value) ? value : AVATAR_KEYS[0];
}
