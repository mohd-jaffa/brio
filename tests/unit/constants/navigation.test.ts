import { describe, expect, it } from "vitest";

import { BOTTOM_NAV, isActivePath, PRIMARY_NAV, SECONDARY_NAV, SIDEBAR_NAV } from "@/constants/navigation";

describe("the navigation lists", () => {
  it("matches the plan: three destinations and More on a phone", () => {
    expect(BOTTOM_NAV.map((item) => item.label)).toEqual([
      "Dashboard",
      "Orders",
      "Customers",
      "More",
    ]);
  });

  it("puts everything in the sidebar, primary items first", () => {
    expect(SIDEBAR_NAV).toEqual([...PRIMARY_NAV, ...SECONDARY_NAV]);
  });

  it("gives every destination a unique id and href", () => {
    const ids = SIDEBAR_NAV.map((item) => item.id);
    const hrefs = SIDEBAR_NAV.map((item) => item.href);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("isActivePath", () => {
  it("matches the dashboard only on the dashboard", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/", "/orders")).toBe(false);
  });

  it("keeps a section highlighted on its own pages", () => {
    expect(isActivePath("/orders", "/orders/abc")).toBe(true);
    expect(isActivePath("/orders", "/customers")).toBe(false);
  });
});
