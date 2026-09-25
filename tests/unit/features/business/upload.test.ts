import { describe, expect, it } from "vitest";

import { checkLogoFile } from "@/features/business/upload";

const file = (size: number, type: string) => new File([new Uint8Array(size)], "logo", { type });

describe("checkLogoFile", () => {
  it("lets through a PNG, JPEG or WebP up to 500 KB", () => {
    expect(checkLogoFile(file(500 * 1024, "image/png"))).toBeNull();
    expect(checkLogoFile(file(10, "image/jpeg"))).toBeNull();
    expect(checkLogoFile(file(10, "image/webp"))).toBeNull();
  });

  it("names what is wrong, so the card can say it", () => {
    expect(checkLogoFile(file(500 * 1024 + 1, "image/png"))).toBe("LOGO_TOO_LARGE");
    expect(checkLogoFile(file(10, "image/svg+xml"))).toBe("LOGO_TYPE_NOT_ALLOWED");
    expect(checkLogoFile(file(10, ""))).toBe("LOGO_TYPE_NOT_ALLOWED");
  });
});
