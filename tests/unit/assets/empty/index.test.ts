import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { EMPTY_ART } from "@/assets/empty";

describe("the empty states' art", () => {
  it("maps each drawing to its own built file, and ships no other", () => {
    const built = fs
      .readdirSync(path.join(process.cwd(), "src/assets/empty"))
      .filter((file) => file.endsWith(".webp"))
      .map((file) => file.replace(/\.webp$/, ""))
      .sort();
    expect(Object.keys(EMPTY_ART).sort()).toEqual(built);
    for (const [name, image] of Object.entries(EMPTY_ART)) expect(String(image)).toContain(`${name}.webp`);
  });
});
