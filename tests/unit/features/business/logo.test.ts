import { Blob as NodeBlob } from "node:buffer";
import { describe, expect, it } from "vitest";

import { isLogoMimeType, logoFolder, logoPath, logoResponse, logoVersion, sniffLogoType } from "@/features/business/logo";

const bytes = (...values: number[]) => new Uint8Array(values);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0);
const WEBP = bytes(...Buffer.from("RIFF"), 1, 2, 3, 4, ...Buffer.from("WEBPVP8 "));

describe("sniffLogoType", () => {
  it("knows a PNG, a JPEG and a WebP by their first bytes", () => {
    expect(sniffLogoType(PNG)).toBe("image/png");
    expect(sniffLogoType(JPEG)).toBe("image/jpeg");
    expect(sniffLogoType(WEBP)).toBe("image/webp");
  });

  it("refuses anything else, whatever it was called", () => {
    expect(sniffLogoType(new TextEncoder().encode("<script>alert(1)</script>"))).toBeNull();
    expect(sniffLogoType(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
    expect(sniffLogoType(bytes(...Buffer.from("GIF89a")))).toBeNull();
    // A RIFF file that is not a WebP — a WAV, say.
    expect(sniffLogoType(bytes(...Buffer.from("RIFF"), 1, 2, 3, 4, ...Buffer.from("WAVE")))).toBeNull();
  });

  it("refuses a file too short to carry a signature, and an empty one", () => {
    expect(sniffLogoType(bytes(0x89, 0x50))).toBeNull();
    expect(sniffLogoType(bytes(...Buffer.from("RIFF")))).toBeNull();
    expect(sniffLogoType(new Uint8Array(0))).toBeNull();
  });
});

describe("isLogoMimeType", () => {
  it("accepts only the three image types", () => {
    expect(isLogoMimeType("image/webp")).toBe(true);
    expect(isLogoMimeType("image/svg+xml")).toBe(false);
    expect(isLogoMimeType("")).toBe(false);
  });
});

describe("logoPath and logoVersion", () => {
  it("keeps each logo in its business's own folder, and its id as its version", () => {
    const path = logoPath("b-1", "c9fe50e7-67e4-467c-95f5-f4a37c186e8a");
    expect(path).toBe("bakeries/b-1/logo/c9fe50e7-67e4-467c-95f5-f4a37c186e8a");
    expect(logoVersion(path)).toBe("c9fe50e7-67e4-467c-95f5-f4a37c186e8a");
    expect(path.startsWith(`${logoFolder("b-1")}/`)).toBe(true);
  });
});

describe("logoResponse", () => {
  // The route answers on Node, with the Blob storage hands it; jsdom's own
  // Blob is not one Node's Response can read.
  const file = new NodeBlob([PNG], { type: "image/png" }) as unknown as Blob;

  it("lets the current version be kept for a year, since a new logo has a new address", async () => {
    const response = logoResponse(file, { type: "image/png", version: "v1", requested: "v1" });
    expect(response.headers.get("cache-control")).toBe("private, max-age=31536000, immutable");
    expect(response.headers.get("etag")).toBe('"v1"');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(PNG);
  });

  it("makes any other request ask again next time", () => {
    const stale = logoResponse(file, { type: "image/png", version: "v2", requested: "v1" });
    const bare = logoResponse(file, { type: "image/png", version: "v2", requested: null });
    expect(stale.headers.get("cache-control")).toBe("private, no-cache");
    expect(bare.headers.get("cache-control")).toBe("private, no-cache");
  });

  it("is only ever the declared image: never sniffed, never run", () => {
    const response = logoResponse(file, { type: "image/jpeg", version: "v1", requested: "v1" });
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-security-policy")).toBe("default-src 'none'; sandbox");
  });
});
