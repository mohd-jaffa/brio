import { describe, expect, it } from "vitest";

import { CHART_COLORS, CHART_UNITS } from "@/components/ui/charts/units";

describe("CHART_UNITS", () => {
  it("reads money in full, compact on an axis, stepping by a rupee", () => {
    expect(CHART_UNITS.paise.value(624_000)).toBe("₹6,240");
    expect(CHART_UNITS.paise.axis(600_000)).toBe("₹6K");
    expect(CHART_UNITS.paise.minStep).toBe(100);
    expect(CHART_UNITS.paise.heading).toBe("Amount");
  });

  it("reads counts as whole numbers, stepping by one", () => {
    expect(CHART_UNITS.count.value(12_500)).toBe("12,500");
    expect(CHART_UNITS.count.axis(8)).toBe("8");
    expect(CHART_UNITS.count.minStep).toBe(1);
    expect(CHART_UNITS.count.heading).toBe("Count");
  });
});

describe("CHART_COLORS", () => {
  it("names the six palette tokens in order", () => {
    expect(CHART_COLORS).toEqual([1, 2, 3, 4, 5, 6].map((n) => `var(--color-chart-${n})`));
  });
});
