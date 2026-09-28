import { describe, expect, it } from "vitest";

import { SPLASH_ART } from "@/assets/splash";

describe("the launch splash's art", () => {
  it("has a picture for a screen held upright and one for a screen on its side", () => {
    expect(String(SPLASH_ART.portrait)).toContain("portrait.webp");
    expect(String(SPLASH_ART.landscape)).toContain("landscape.webp");
  });
});
