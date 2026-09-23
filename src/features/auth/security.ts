import { randomBytes } from "node:crypto";

// Ambiguous glyphs (0/O, 1/l/I) are left out: this is read off a screen and
// typed by hand, and the plan asks for it to be usable, not just random (§94).
const TEMPORARY_PASSWORD_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/**
 * The password emailed after a reset request. Generated with the platform's
 * CSPRNG, never logged, and never returned in an API response (plan §94); the
 * account it belongs to is marked `must_change_password` at the same time.
 */
export function generateTemporaryPassword(length = 12) {
  if (length < 8) {
    throw new Error("Temporary password length must be at least 8 characters.");
  }

  const bytes = randomBytes(length);

  return Array.from(bytes, (byte) => TEMPORARY_PASSWORD_ALPHABET[byte % TEMPORARY_PASSWORD_ALPHABET.length]).join("");
}
