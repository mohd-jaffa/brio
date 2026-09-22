import { randomBytes } from "node:crypto";

const TEMPORARY_PASSWORD_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function normalizePhone(phone: string) {
  return phone.trim().replace(/[\s().-]/g, "").replace(/^00/, "+");
}

export function generateTemporaryPassword(length = 12) {
  if (length < 8) {
    throw new Error("Temporary password length must be at least 8 characters.");
  }

  const bytes = randomBytes(length);

  return Array.from(bytes, (byte) => TEMPORARY_PASSWORD_ALPHABET[byte % TEMPORARY_PASSWORD_ALPHABET.length]).join("");
}
