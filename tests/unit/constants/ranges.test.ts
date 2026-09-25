import { describe, expect, it } from "vitest";

import { DATE_RANGE_LABELS, DATE_RANGES, DEFAULT_DATE_RANGE } from "@/constants/ranges";

describe("the date ranges", () => {
  it("names every period, and defaults to the last 30 days", () => {
    for (const range of DATE_RANGES) expect(DATE_RANGE_LABELS[range]).toBeTruthy();
    expect(DEFAULT_DATE_RANGE).toBe("LAST_30_DAYS");
  });
});
