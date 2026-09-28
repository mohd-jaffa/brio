import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { AVATAR_GROUP_LABELS, AVATAR_GROUPS, AVATAR_KEYS, AVATARS, avatarOr, isAvatarKey } from "@/constants/avatars";

const built = fs
  .readdirSync(path.join(process.cwd(), "src/assets/avatars"))
  .filter((file) => file.endsWith(".webp"))
  .map((file) => file.replace(/\.webp$/, ""))
  .sort();

describe("the profile pictures", () => {
  it("are nine animals and 24 people, each with a built image and a name to be chosen by", () => {
    expect(AVATAR_KEYS).toHaveLength(33);
    const inGroup = (group: string) => AVATAR_KEYS.filter((key) => AVATARS[key].group === group);
    expect(inGroup("ANIMALS")).toHaveLength(9);
    expect(inGroup("PEOPLE")).toHaveLength(24);
    // The animals first, as they came, so the first picture is still the one shown for a key the app lacks.
    expect(AVATAR_KEYS.slice(0, 9).every((key) => AVATARS[key].group === "ANIMALS")).toBe(true);
    for (const group of AVATAR_GROUPS) expect(AVATAR_GROUP_LABELS[group].length).toBeGreaterThan(0);
    expect([...AVATAR_KEYS].sort()).toEqual(built);
    for (const key of AVATAR_KEYS) expect(AVATARS[key].label.length).toBeGreaterThan(0);
  });

  it("use only keys shaped as the database stores them", () => {
    for (const key of AVATAR_KEYS) expect(key).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("know their own keys, and nothing else", () => {
    expect(isAvatarKey("tiger")).toBe(true);
    expect(isAvatarKey("grandma")).toBe(true);
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
