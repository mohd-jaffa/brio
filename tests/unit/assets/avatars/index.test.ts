import { describe, expect, it } from "vitest";

import { AVATAR_IMAGES } from "@/assets/avatars";
import { AVATAR_KEYS } from "@/constants/avatars";

describe("the profile picture images", () => {
  it("map every key to its own file", () => {
    expect(Object.keys(AVATAR_IMAGES).sort()).toEqual([...AVATAR_KEYS].sort());
    for (const key of AVATAR_KEYS) expect(String(AVATAR_IMAGES[key])).toContain(`${key}.webp`);
  });
});
