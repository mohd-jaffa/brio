import { describe, expect, it } from "vitest";

import { bucketIndex, bucketStarts, intervalFor, previousPeriod, resolvePeriod } from "@/lib/dates/range";

const today = "2026-09-26";

describe("resolvePeriod", () => {
  it("works each preset out from today in the business's calendar", () => {
    expect(resolvePeriod({ preset: "LAST_7_DAYS" }, today)).toEqual({ from: "2026-09-20", to: today });
    expect(resolvePeriod({ preset: "LAST_30_DAYS" }, today)).toEqual({ from: "2026-08-28", to: today });
    expect(resolvePeriod({ preset: "THIS_MONTH" }, today)).toEqual({ from: "2026-09-01", to: today });
    expect(resolvePeriod({ preset: "LAST_MONTH" }, today)).toEqual({ from: "2026-08-01", to: "2026-08-31" });
    expect(resolvePeriod({ preset: "LAST_MONTH" }, "2026-03-10")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
  });

  it("takes a custom period's two dates, and today for one not given", () => {
    expect(resolvePeriod({ preset: "CUSTOM", from: "2026-09-02", to: "2026-09-09" }, today)).toEqual({
      from: "2026-09-02",
      to: "2026-09-09",
    });
    expect(resolvePeriod({ preset: "CUSTOM" }, today)).toEqual({ from: today, to: today });
  });
});

describe("previousPeriod", () => {
  it("compares a month with the month before, day for day (IMP-10)", () => {
    const thisMonth = { preset: "THIS_MONTH" } as const;
    expect(previousPeriod(thisMonth, { from: "2026-09-01", to: "2026-09-26" })).toEqual({
      from: "2026-08-01",
      to: "2026-08-26",
    });
    // March so far against all of February, which is shorter.
    expect(previousPeriod(thisMonth, { from: "2026-03-01", to: "2026-03-31" })).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
    expect(previousPeriod({ preset: "LAST_MONTH" }, { from: "2026-08-01", to: "2026-08-31" })).toEqual({
      from: "2026-07-01",
      to: "2026-07-31",
    });
  });

  it("compares anything else with as many days just before it", () => {
    expect(previousPeriod({ preset: "LAST_7_DAYS" }, { from: "2026-09-20", to: today })).toEqual({
      from: "2026-09-13",
      to: "2026-09-19",
    });
  });
});

describe("intervalFor and the groups", () => {
  const month = { from: "2026-09-01", to: "2026-09-30" };
  const quarter = { from: "2026-07-01", to: "2026-09-30" };

  it("draws a month or less by day and anything longer by week, unless asked", () => {
    expect(intervalFor(month)).toBe("DAY");
    expect(intervalFor(quarter)).toBe("WEEK");
    expect(intervalFor(month, "WEEK")).toBe("WEEK");
  });

  it("starts a group each day, or each seventh day from the period's start", () => {
    expect(bucketStarts({ from: "2026-09-01", to: "2026-09-03" }, "DAY")).toEqual([
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
    ]);
    expect(bucketStarts({ from: "2026-09-01", to: "2026-09-15" }, "WEEK")).toEqual([
      "2026-09-01",
      "2026-09-08",
      "2026-09-15",
    ]);
  });

  it("finds a day's group, or none outside the period", () => {
    expect(bucketIndex(month, "DAY", "2026-09-03")).toBe(2);
    expect(bucketIndex(month, "WEEK", "2026-09-08")).toBe(1);
    expect(bucketIndex(month, "WEEK", "2026-09-07")).toBe(0);
    expect(bucketIndex(month, "DAY", "2026-08-31")).toBe(-1);
    expect(bucketIndex(month, "DAY", "2026-10-01")).toBe(-1);
  });
});
