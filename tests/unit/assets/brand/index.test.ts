import { describe, expect, it } from "vitest";

import { BRAND, brandWidth } from "@/assets/brand";

describe("the brand's marks", () => {
  it("map each mark to its built file", () => {
    for (const [name, mark] of Object.entries(BRAND)) expect(String(mark.src)).toContain(`${name}.webp`);
  });

  it("keep each mark's shape at any height", () => {
    expect(brandWidth("icon", 36)).toBe(36);
    expect(brandWidth("wordmark", 44)).toBe(97);
    expect(brandWidth("leaf", 16)).toBe(18);
  });
});
