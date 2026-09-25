import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { PLATE_FOCUS, PLATES } from "@/assets/plates";

const DIR = path.join(process.cwd(), "src/assets/plates");
const MAX_BYTES = 200 * 1024;

describe("the photographic plates", () => {
  it("map every name to its own file", () => {
    for (const [name, image] of Object.entries(PLATES)) expect(String(image)).toContain(`${name}.webp`);
  });

  it("ship every built file, each within 200 KB", () => {
    const files = fs.readdirSync(DIR).filter((file) => file.endsWith(".webp"));
    expect(files.map((file) => path.parse(file).name).sort()).toEqual(Object.keys(PLATES).sort());
    for (const file of files) expect(fs.statSync(path.join(DIR, file)).size).toBeLessThanOrEqual(MAX_BYTES);
  });
});

describe("PLATE_FOCUS", () => {
  it("gives every plate a focal point", () => {
    expect(Object.keys(PLATE_FOCUS).sort()).toEqual(Object.keys(PLATES).sort());
    for (const focus of Object.values(PLATE_FOCUS)) expect(focus).toMatch(/^\d+% \d+%$/);
  });
});
