import { describe, expect, it } from "vitest";

import { BAKERY_ROLES, ROLE_LABELS, USER_ROLES } from "@/constants/roles";

describe("roles", () => {
  it("has exactly the two the plan approves", () => {
    expect(USER_ROLES).toEqual(["BAKER", "DEV"]);
  });

  it("names each one for a screen to show", () => {
    for (const role of USER_ROLES) {
      expect(ROLE_LABELS[role]).toBeTruthy();
    }
  });

  it("does not let DEV inherit access to a bakery's business data", () => {
    expect(BAKERY_ROLES).toEqual(["BAKER"]);
    expect(BAKERY_ROLES).not.toContain("DEV");
  });
});
