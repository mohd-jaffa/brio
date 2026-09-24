import { describe, expect, it } from "vitest";

import { ILLUSTRATION_IMAGES } from "@/assets/illustrations";
import { ILLUSTRATION_KEYS } from "@/constants/illustrations";

describe("the illustration images", () => {
  it("map every key to its own file", () => {
    expect(Object.keys(ILLUSTRATION_IMAGES).sort()).toEqual([...ILLUSTRATION_KEYS].sort());
    for (const key of ILLUSTRATION_KEYS) expect(String(ILLUSTRATION_IMAGES[key])).toContain(`${key}.webp`);
  });
});
