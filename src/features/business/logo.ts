import { LOGO_MIME_TYPES, type LogoMimeType } from "@/constants/uploads";

/**
 * What a logo file really is, read from its first bytes (plan §56). The type a
 * browser declares is only the file's name talking, so it is never trusted:
 * a script renamed `logo.png` is not a PNG here.
 */
const startsWith = (bytes: Uint8Array, signature: readonly number[], at = 0) =>
  bytes.length >= at + signature.length && signature.every((byte, index) => bytes[at + index] === byte);

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const JPEG = [0xff, 0xd8, 0xff] as const;
const RIFF = [0x52, 0x49, 0x46, 0x46] as const; // "RIFF"
const WEBP = [0x57, 0x45, 0x42, 0x50] as const; // "WEBP", after the chunk size

export function sniffLogoType(bytes: Uint8Array): LogoMimeType | null {
  if (startsWith(bytes, PNG)) return "image/png";
  if (startsWith(bytes, JPEG)) return "image/jpeg";
  if (startsWith(bytes, RIFF) && startsWith(bytes, WEBP, 8)) return "image/webp";
  return null;
}

export function isLogoMimeType(type: string): type is LogoMimeType {
  return (LOGO_MIME_TYPES as readonly string[]).includes(type);
}

/**
 * Where a business's logo is stored: `bakeries/{business}/logo/{logo id}`
 * (plan §56). The database refuses a reference outside the business's own
 * folder, and the bucket's policies refuse to read or write one.
 */
export function logoPath(bakeryId: string, logoId: string): string {
  return `${logoFolder(bakeryId)}/${logoId}`;
}

/** The folder every logo a business has had is kept in. */
export function logoFolder(bakeryId: string): string {
  return `bakeries/${bakeryId}/logo`;
}

/** The id at the end of a logo's path, which is also its version. */
export function logoVersion(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

/**
 * How the logo is answered. A request naming the current version may keep it
 * for a year, because a new logo has a new version and so a new address; any
 * other request is answered but must ask again next time. Whatever the file
 * holds, the browser treats it only as the declared image and runs nothing
 * in it.
 */
export function logoResponse(
  file: Blob,
  { type, version, requested }: { type: LogoMimeType; version: string; requested: string | null },
): Response {
  return new Response(file, {
    headers: {
      "Content-Type": type,
      "Cache-Control": requested === version ? "private, max-age=31536000, immutable" : "private, no-cache",
      ETag: `"${version}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
