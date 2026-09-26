import { describe, expect, it } from "vitest";

import { VALIDATION_MESSAGES } from "@/constants/messages";
import { dashboardQuerySchema, firstIssue } from "@/lib/validation";

describe("dashboardQuerySchema", () => {
  it("reads today with no filters when nothing is asked", () => {
    expect(dashboardQuerySchema.parse({})).toEqual({ period: "TODAY" });
  });

  it("takes a period and the two filters on the orders due", () => {
    expect(dashboardQuerySchema.parse({ period: "MONTH", status: "READY", payment: "PARTIALLY_PAID" })).toEqual({
      period: "MONTH",
      status: "READY",
      payment: "PARTIALLY_PAID",
    });
  });

  it("refuses a period, a finished status or a payment it does not know, in its own words", () => {
    for (const query of [{ period: "YEAR" }, { status: "DELIVERED" }, { payment: "OWED" }]) {
      const result = dashboardQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
      if (!result.success) expect(firstIssue(result.error)).toBe(VALIDATION_MESSAGES.invalid);
    }
  });
});
