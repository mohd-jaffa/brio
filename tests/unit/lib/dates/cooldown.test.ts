import { describe, expect, it } from "vitest";

import { changeReopensAt } from "@/lib/dates/cooldown";

const NOW = new Date("2026-09-26T10:00:00.000Z");

describe("changeReopensAt", () => {
  it("is nothing for a detail never changed", () => {
    expect(changeReopensAt(null, NOW)).toBeNull();
  });

  it("is 30 days after the last change while they last", () => {
    expect(changeReopensAt("2026-09-20T10:00:00.000Z", NOW)).toBe("2026-10-20T10:00:00.000Z");
  });

  it("is nothing once the 30 days are over", () => {
    expect(changeReopensAt("2026-08-27T10:00:00.000Z", NOW)).toBeNull();
    expect(changeReopensAt("2026-08-01T00:00:00.000Z")).toBeNull();
  });
});
