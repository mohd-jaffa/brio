import { describe, expect, it } from "vitest";

import {
  addDaysKey,
  bakeryHour,
  dayKey,
  dayStart,
  daysFrom,
  dueBucket,
  monthStartKey,
  nextDayKey,
  todayKey,
  weekStartKey,
} from "@/lib/dates/calendar";

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

  it("keeps a time already past today as today until the day ends (IMP-05)", () => {
    expect(dueBucket("2026-09-22T04:00:00Z", now)).toBe("today");
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

describe("the bakery's calendar arithmetic", () => {
  it("moves a day forward and back, across months and years", () => {
    expect(addDaysKey("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDaysKey("2026-01-01", -1)).toBe("2025-12-31");
    expect(nextDayKey("2026-02-28")).toBe("2026-03-01");
  });

  it("starts a day at India's midnight", () => {
    expect(dayStart("2026-09-22")).toBe("2026-09-21T18:30:00.000Z");
  });

  it("finds the Monday of a week and the first of a month", () => {
    expect(weekStartKey("2026-09-26")).toBe("2026-09-21"); // a Saturday
    expect(weekStartKey("2026-09-21")).toBe("2026-09-21"); // a Monday
    expect(weekStartKey("2026-09-27")).toBe("2026-09-21"); // a Sunday
    expect(monthStartKey("2026-09-26")).toBe("2026-09-01");
  });

  it("lists every day between two, both included", () => {
    expect(daysFrom("2026-09-29", "2026-10-01")).toEqual(["2026-09-29", "2026-09-30", "2026-10-01"]);
    expect(daysFrom("2026-09-29", "2026-09-28")).toEqual([]);
  });

  it("reads the hour on the bakery's clock, not the server's", () => {
    expect(bakeryHour(new Date("2026-09-22T06:00:00Z"))).toBe(11);
    expect(bakeryHour(new Date("2026-09-22T18:40:00Z"))).toBe(0);
  });
});
