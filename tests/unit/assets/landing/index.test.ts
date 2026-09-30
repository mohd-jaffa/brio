import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { LANDING_SHOTS } from "@/assets/landing";

const DIR = path.join(process.cwd(), "src/assets/landing");
const MAX_BYTES = 120 * 1024;

describe("the landing page's screenshots", () => {
  it("map every shot to its own file", () => {
    for (const [name, image] of Object.entries(LANDING_SHOTS)) expect(String(image)).toContain(`${name}.webp`);
  });

  it("ship every file the script makes, each within 120 KB", () => {
    const files = fs.readdirSync(DIR).filter((file) => file.endsWith(".webp"));
    expect(files.map((file) => path.parse(file).name).sort()).toEqual(Object.keys(LANDING_SHOTS).sort());
    for (const file of files) expect(fs.statSync(path.join(DIR, file)).size).toBeLessThanOrEqual(MAX_BYTES);
  });
});
