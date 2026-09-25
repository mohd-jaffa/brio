import { describe, expect, it } from "vitest";

import { BUSINESS_ROLES, ROLE_LABELS, USER_ROLES } from "@/constants/roles";

describe("roles", () => {
  it("has exactly the two the plan approves", () => {
    expect(USER_ROLES).toEqual(["USER", "DEV"]);
  });

  it("names each one for a screen to show, the business's owner as Owner", () => {
    for (const role of USER_ROLES) {
      expect(ROLE_LABELS[role]).toBeTruthy();
    }
    expect(ROLE_LABELS.USER).toBe("Owner");
  });

  it("does not let DEV inherit access to a business's data", () => {
    expect(BUSINESS_ROLES).toEqual(["USER"]);
    expect(BUSINESS_ROLES).not.toContain("DEV");
  });
});
