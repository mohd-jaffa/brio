import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { WELCOME_SCENES } from "@/assets/onboarding";

const DIR = path.join(process.cwd(), "src/assets/onboarding");
const MAX_BYTES = 200 * 1024;

describe("the welcome's pictures", () => {
  it("map every scene to its own file", () => {
    for (const [name, image] of Object.entries(WELCOME_SCENES)) expect(String(image)).toContain(`${name}.webp`);
  });

  it("ship every built file, each within 200 KB", () => {
    const files = fs.readdirSync(DIR).filter((file) => file.endsWith(".webp"));
    expect(files.map((file) => path.parse(file).name).sort()).toEqual(Object.keys(WELCOME_SCENES).sort());
    for (const file of files) expect(fs.statSync(path.join(DIR, file)).size).toBeLessThanOrEqual(MAX_BYTES);
  });
});
