import { describe, expect, it } from "vitest";

import { MAX_RANGE_DAYS, rangeQuerySchema } from "@/lib/validation";

describe("rangeQuerySchema", () => {
  it("reads the last 30 days when nothing is asked", () => {
    expect(rangeQuerySchema.parse({})).toEqual({ range: "LAST_30_DAYS" });
  });

  it("takes a preset and how to group the trend", () => {
    expect(rangeQuerySchema.parse({ range: "THIS_MONTH", interval: "WEEK" })).toEqual({ range: "THIS_MONTH", interval: "WEEK" });
  });

  it("takes a custom period with both its dates, in order, up to a year", () => {
    expect(rangeQuerySchema.parse({ range: "CUSTOM", from: "2026-01-01", to: "2026-01-01" }).from).toBe("2026-01-01");
    expect(rangeQuerySchema.safeParse({ range: "CUSTOM", from: "2025-01-01", to: "2026-01-01" }).success).toBe(true);
  });

  it("refuses a custom period missing a date, backwards, or longer than a year", () => {
    const refused = (query: object, path: string) => {
      const result = rangeQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues[0].path).toEqual([path]);
    };
    refused({ range: "CUSTOM", to: "2026-01-01" }, "from");
    refused({ range: "CUSTOM", from: "2026-01-01" }, "to");
    refused({ range: "CUSTOM", from: "2026-01-02", to: "2026-01-01" }, "to");
    refused({ range: "CUSTOM", from: "2024-01-01", to: "2025-01-01" }, "to");
    expect(MAX_RANGE_DAYS).toBe(366);
  });

  it("refuses a preset, a date or an interval it does not know", () => {
    for (const query of [{ range: "YEAR" }, { range: "CUSTOM", from: "1/1/2026", to: "2026-01-02" }, { interval: "HOUR" }]) {
      expect(rangeQuerySchema.safeParse(query).success).toBe(false);
    }
  });
});
