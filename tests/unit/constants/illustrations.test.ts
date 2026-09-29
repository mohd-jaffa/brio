import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_EXPENSE_ILLUSTRATION,
  DEFAULT_PRODUCT_ILLUSTRATION,
  ILLUSTRATION_GROUPS,
  ILLUSTRATION_KEYS,
  ILLUSTRATIONS,
  illustrationOr,
  isIllustrationKey,
} from "@/constants/illustrations";

const files = (dir: string, ext: RegExp) =>
  fs
    .readdirSync(path.join(process.cwd(), dir))
    .filter((f) => ext.test(f))
    .map((f) => f.replace(ext, ""))
    .sort();

describe("the illustration catalogue", () => {
  it("has one entry for every master, and one master for every entry", () => {
    expect([...ILLUSTRATION_KEYS].sort()).toEqual(files("artwork/illustrations", /\.jpe?g$/));
  });

  it("has one built image for every entry", () => {
    expect([...ILLUSTRATION_KEYS].sort()).toEqual(files("src/assets/illustrations", /\.webp$/));
  });

  it("uses only keys the database accepts", () => {
    for (const key of ILLUSTRATION_KEYS) expect(key).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("puts every illustration in a known group, with a label", () => {
    for (const key of ILLUSTRATION_KEYS) {
      expect(ILLUSTRATION_GROUPS).toContain(ILLUSTRATIONS[key].group);
      expect(ILLUSTRATIONS[key].label.length).toBeGreaterThan(0);
    }
  });

  it("starts with the two defaults", () => {
    expect(ILLUSTRATION_KEYS.slice(0, 2)).toEqual([DEFAULT_PRODUCT_ILLUSTRATION, DEFAULT_EXPENSE_ILLUSTRATION]);
  });
});

describe("illustrationOr", () => {
  it("keeps a key the library has", () => {
    expect(isIllustrationKey("teddy-bear")).toBe(true);
    expect(illustrationOr("teddy-bear", DEFAULT_PRODUCT_ILLUSTRATION)).toBe("teddy-bear");
  });

  it("falls back for a retired key, nothing, or a prototype name", () => {
    expect(illustrationOr("retired", DEFAULT_PRODUCT_ILLUSTRATION)).toBe(DEFAULT_PRODUCT_ILLUSTRATION);
    expect(illustrationOr(null, DEFAULT_EXPENSE_ILLUSTRATION)).toBe(DEFAULT_EXPENSE_ILLUSTRATION);
    expect(isIllustrationKey("toString")).toBe(false);
  });
});
