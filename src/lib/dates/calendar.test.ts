import { describe, expect, it } from "vitest";

import { dayKey, dueBucket, nextDayKey, todayKey } from "./calendar";

describe("dayKey", () => {
  it("answers in the bakery's timezone, not the browser's", () => {
    // 19:00 UTC on the 21st is already the 22nd in India (+05:30).
    expect(dayKey("2026-09-21T19:00:00Z")).toBe("2026-09-22");
  });

  it("is empty for something that is not a date", () => {
    expect(dayKey("not a date")).toBe("");
  });
});

describe("nextDayKey", () => {
  it("steps to the next day, across a month end", () => {
    expect(nextDayKey("2026-09-30")).toBe("2026-10-01");
    expect(nextDayKey("2026-12-31")).toBe("2027-01-01");
  });
});

describe("todayKey", () => {
  it("is the day the given instant falls on", () => {
    expect(todayKey(new Date("2026-09-22T06:00:00Z"))).toBe("2026-09-22");
  });
});

describe("dueBucket", () => {
  const now = new Date("2026-09-22T06:00:00Z"); // 11:30 in India

  it("calls a time already past today overdue", () => {
    expect(dueBucket("2026-09-22T04:00:00Z", now)).toBe("overdue");
  });

  it("calls a time still to come today due today", () => {
    expect(dueBucket("2026-09-22T10:00:00Z", now)).toBe("today");
  });

  it("calls an earlier day overdue", () => {
    expect(dueBucket("2026-09-20T10:00:00Z", now)).toBe("overdue");
  });

  it("recognises tomorrow", () => {
    expect(dueBucket("2026-09-23T04:00:00Z", now)).toBe("tomorrow");
  });

  it("puts anything further out in later", () => {
    expect(dueBucket("2026-09-30T04:00:00Z", now)).toBe("later");
  });
});
