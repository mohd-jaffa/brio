import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { BILL_ACCENT, BILL_PAPER, billColor } from "@/features/receipts/palette";
import { THEMES } from "@/lib/theme/themes";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

/** A token's value in a rule whose selector list names `selector`. */
function token(selector: string, name: string): string | undefined {
  for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!selectors.split(",").some((each) => each.trim().endsWith(selector))) continue;
    const value = new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, "i").exec(body)?.[1];
    if (value) return value;
  }
  return undefined;
}

describe("the bill's palette", () => {
  it("is the paper and ink the page draws the bill with", () => {
    expect(token(":root", "--color-paper")).toBe(BILL_PAPER.paper);
    expect(token(":root", "--color-ink")).toBe(BILL_PAPER.ink);
    expect(token(":root", "--color-ink-muted")).toBe(BILL_PAPER.muted);
    expect(token(":root", "--color-paper-rule")).toBe(BILL_PAPER.rule);
  });

  it("takes each theme's primary for its accent", () => {
    for (const theme of THEMES) {
      expect(token(`[data-theme="${theme}"]`, "--color-primary")).toBe(BILL_ACCENT[theme]);
    }
  });

  it("names a colour by its role", () => {
    expect(billColor("accent", "peach")).toBe(BILL_ACCENT.peach);
    expect(billColor("muted", "golden")).toBe(BILL_PAPER.muted);
  });
});
