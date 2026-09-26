import { describe, expect, it } from "vitest";

import { ALL_NAV, BOTTOM_NAV, isActivePath, MORE_NAV, NAV_GROUPS } from "@/constants/navigation";

const labels = (items: readonly { label: string }[]) => items.map((item) => item.label);

describe("the navigation lists", () => {
  it("matches the plan on a phone: Home · Orders · Products · Customers · More", () => {
    expect(labels(BOTTOM_NAV)).toEqual(["Home", "Orders", "Products", "Customers", "More"]);
  });

  it("groups the sidebar as the plan does", () => {
    expect(NAV_GROUPS.map(labels)).toEqual([
      ["Home", "Orders", "Products", "Customers"],
      ["Analytics", "Expenses"],
      ["Inventory", "Notifications", "Business details", "Settings"],
    ]);
  });

  it("puts behind More everything the bottom bar does not hold but the inbox, which the bell opens", () => {
    expect(labels(MORE_NAV)).toEqual(["Analytics", "Expenses", "Inventory", "Business details", "Settings"]);
  });

  it("gives every destination a unique id and href", () => {
    const ids = ALL_NAV.map((item) => item.id);
    const hrefs = ALL_NAV.map((item) => item.href);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("isActivePath", () => {
  it("matches Home only on Home", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/", "/orders")).toBe(false);
  });

  it("keeps a section highlighted on its own pages, and only its own", () => {
    expect(isActivePath("/orders", "/orders")).toBe(true);
    expect(isActivePath("/orders", "/orders/abc")).toBe(true);
    expect(isActivePath("/orders", "/customers")).toBe(false);
    expect(isActivePath("/orders", "/orders-archive")).toBe(false);
  });
});
