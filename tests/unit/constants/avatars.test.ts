import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { AVATAR_KEYS, AVATARS, avatarOr, isAvatarKey } from "@/constants/avatars";

const built = fs
  .readdirSync(path.join(process.cwd(), "src/assets/avatars"))
  .filter((file) => file.endsWith(".webp"))
  .map((file) => file.replace(/\.webp$/, ""))
  .sort();

describe("the profile pictures", () => {
  it("are nine, each with a built image and a name to be chosen by", () => {
    expect(AVATAR_KEYS).toHaveLength(9);
    expect([...AVATAR_KEYS].sort()).toEqual(built);
    for (const key of AVATAR_KEYS) expect(AVATARS[key].label.length).toBeGreaterThan(0);
  });

  it("use only keys shaped as the database stores them", () => {
    for (const key of AVATAR_KEYS) expect(key).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("know their own keys, and nothing else", () => {
    expect(isAvatarKey("tiger")).toBe(true);
    expect(isAvatarKey("toString")).toBe(false);
    expect(isAvatarKey("dragon")).toBe(false);
    expect(isAvatarKey(null)).toBe(false);
    expect(isAvatarKey(undefined)).toBe(false);
  });

  it("show the first picture for a key the app no longer has, or none", () => {
    expect(avatarOr("beagle")).toBe("beagle");
    expect(avatarOr("dragon")).toBe("pomeranian");
    expect(avatarOr(null)).toBe("pomeranian");
  });
});
