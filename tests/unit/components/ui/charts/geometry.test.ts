import { describe, expect, it } from "vitest";

import {
  areaPath,
  linearScale,
  monotonePath,
  nearestIndex,
  niceTicks,
  ringSegments,
  roundedTopBar,
  shares,
  tickBudget,
  tickIndices,
  topWithOthers,
} from "@/components/ui/charts/geometry";

// Every number in a path, in order.
const numbers = (path: string) => (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

describe("linearScale", () => {
  it("maps the domain onto the range, upside down for a y axis", () => {
    const y = linearScale([0, 100], [200, 0]);
    expect(y(0)).toBe(200);
    expect(y(50)).toBe(100);
    expect(y(100)).toBe(0);
  });

  it("maps a flat domain to the start of the range", () => {
    expect(linearScale([5, 5], [10, 20])(5)).toBe(10);
  });
});

describe("niceTicks", () => {
  it("steps in round amounts up past the peak", () => {
    expect(niceTicks(700_000, { minStep: 100 })).toEqual([0, 200_000, 400_000, 600_000, 800_000]);
    expect(niceTicks(1_000)).toEqual([0, 250, 500, 750, 1_000]);
  });

  it("never steps by a fraction of the smallest unit", () => {
    expect(niceTicks(9)).toEqual([0, 5, 10]);
    expect(niceTicks(2)).toEqual([0, 1, 2]);
    expect(niceTicks(250, { minStep: 100 })).toEqual([0, 100, 200, 300]);
  });

  it("falls back to whole smallest steps when no round step is a multiple of it", () => {
    expect(niceTicks(10, { minStep: 3 })).toEqual([0, 3, 6, 9, 12]);
  });

  it("keeps an axis for an empty series", () => {
    expect(niceTicks(0)).toEqual([0, 1]);
    expect(niceTicks(Number.NaN, { minStep: 100 })).toEqual([0, 100]);
  });
});

describe("tickIndices and tickBudget", () => {
  it("labels every point when they all fit", () => {
    expect(tickIndices(5, 6)).toEqual([0, 1, 2, 3, 4]);
  });

  it("steps evenly, and labels the last point too", () => {
    expect(tickIndices(31, 6)).toEqual([0, 6, 12, 18, 24, 30]);
    expect(tickIndices(30, 6)).toEqual([0, 6, 12, 18, 24, 29]);
    expect(tickIndices(7, 6)).toEqual([0, 2, 4, 6]);
  });

  it("moves the last label to the last point rather than crowd it", () => {
    expect(tickIndices(14, 6)).toEqual([0, 3, 6, 9, 13]);
  });

  it("labels one point, or none", () => {
    expect(tickIndices(1, 6)).toEqual([0]);
    expect(tickIndices(0, 6)).toEqual([]);
  });

  it("fits two to six labels by width", () => {
    expect(tickBudget(60)).toBe(2);
    expect(tickBudget(260)).toBe(5);
    expect(tickBudget(900)).toBe(6);
  });
});

describe("nearestIndex", () => {
  it("finds the closest position", () => {
    expect(nearestIndex([0, 10, 20, 30], 14)).toBe(1);
    expect(nearestIndex([0, 10, 20, 30], 16)).toBe(2);
    expect(nearestIndex([0, 10, 20, 30], -50)).toBe(0);
    expect(nearestIndex([0, 10, 20, 30], 500)).toBe(3);
  });
});

describe("monotonePath", () => {
  it("draws nothing, a point, or a straight segment for short series", () => {
    expect(monotonePath([])).toBe("");
    expect(monotonePath([{ x: 1, y: 2 }])).toBe("M1,2");
    expect(
      monotonePath([
        { x: 0, y: 5 },
        { x: 10, y: 15 },
      ]),
    ).toBe("M0,5L10,15");
  });

  it("flattens at a peak, so the curve never rises above it", () => {
    const path = monotonePath([
      { x: 0, y: 10 },
      { x: 10, y: 0 },
      { x: 20, y: 10 },
    ]);
    const values = numbers(path);
    const ys = values.filter((_, index) => index % 2 === 1);
    expect(Math.min(...ys)).toBe(0);
    // The control points either side of the peak sit level with it.
    expect(path).toContain("6.67,0 10,0C13.33,0");
  });

  it("keeps a flat run flat", () => {
    const path = monotonePath([
      { x: 0, y: 4 },
      { x: 10, y: 4 },
      { x: 20, y: 4 },
      { x: 30, y: 0 },
    ]);
    expect(path.startsWith("M0,4C3.33,4 6.67,4 10,4")).toBe(true);
  });
});

describe("areaPath", () => {
  it("closes the line down to the baseline", () => {
    const path = areaPath(
      [
        { x: 0, y: 10 },
        { x: 10, y: 0 },
      ],
      50,
    );
    expect(path).toBe("M0,10L10,0L10,50L0,50Z");
  });

  it("has no area under fewer than two points", () => {
    expect(areaPath([{ x: 0, y: 10 }], 50)).toBe("");
  });
});

describe("roundedTopBar", () => {
  it("rounds the top corners and stands square on the baseline", () => {
    expect(roundedTopBar({ x: 10, width: 8, top: 20, bottom: 100, radius: 4 })).toBe(
      "M10,100V24A4,4 0 0 1 14,20H14A4,4 0 0 1 18,24V100Z",
    );
  });

  it("never rounds more than half the width or the height", () => {
    const path = roundedTopBar({ x: 0, width: 4, top: 99, bottom: 100, radius: 6 });
    expect(path).toContain("A1,1");
  });

  it("draws nothing for a zero or a zero-width bar", () => {
    expect(roundedTopBar({ x: 0, width: 8, top: 100, bottom: 100, radius: 4 })).toBe("");
    expect(roundedTopBar({ x: 0, width: 0, top: 10, bottom: 100, radius: 4 })).toBe("");
  });
});

describe("shares", () => {
  it("adds up to exactly 100", () => {
    const result = shares([1, 1, 1]);
    expect(result.reduce((sum, value) => sum + value, 0)).toBe(100);
    expect(result).toEqual([34, 33, 33]);
    expect(shares([42, 18, 12, 10, 8, 10])).toEqual([42, 18, 12, 10, 8, 10]);
  });

  it("gives nothing a share when there is nothing", () => {
    expect(shares([0, 0])).toEqual([0, 0]);
  });
});

describe("topWithOthers", () => {
  const slice = (label: string, value: number) => ({ label, value });

  it("keeps six or fewer as they are, largest first, without the empty ones", () => {
    expect(topWithOthers([slice("a", 1), slice("b", 3), slice("c", 0)], "Others")).toEqual([
      slice("b", 3),
      slice("a", 1),
    ]);
  });

  it("folds everything past the fifth into Others", () => {
    const slices = [7, 6, 5, 4, 3, 2, 1].map((value) => slice(`s${value}`, value));
    expect(topWithOthers(slices, "Others")).toEqual([
      slice("s7", 7),
      slice("s6", 6),
      slice("s5", 5),
      slice("s4", 4),
      slice("s3", 3),
      slice("Others", 3),
    ]);
  });
});

describe("ringSegments", () => {
  it("leaves a gap between neighbours and fills the ring between them", () => {
    const segments = ringSegments([3, 1], 100, 2);
    expect(segments).toEqual([
      { start: 1, length: 73 },
      { start: 76, length: 23 },
    ]);
  });

  it("closes the ring for a lone value, and draws nothing for nothing", () => {
    expect(ringSegments([5], 100, 2)).toEqual([{ start: 0, length: 100 }]);
    expect(ringSegments([0, 0], 100, 2)).toEqual([]);
  });

  it("never draws a negative length for a sliver smaller than the gap", () => {
    expect(ringSegments([1000, 1], 100, 2)[1].length).toBe(0);
  });
});
