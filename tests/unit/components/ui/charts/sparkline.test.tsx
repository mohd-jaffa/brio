import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Sparkline } from "@/components/ui/charts/sparkline";

import { sizeCharts } from "@tests/support/charts";

describe("Sparkline", () => {
  beforeEach(() => sizeCharts(120, 32));
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("draws the line and a dot on its last point, hidden from screen readers", () => {
    const { container } = render(<Sparkline values={[3, 5, 4, 8]} className="mt-2" />);
    const box = container.firstElementChild!;
    expect(box).toHaveAttribute("aria-hidden", "true");
    expect(box).toHaveClass("mt-2");
    expect(container.querySelector("path")?.getAttribute("d")).toMatch(/^M3,29C/);
    // The high point sits at the top, the last point on the right edge.
    expect(container.querySelector("circle")).toHaveAttribute("cx", "117");
    expect(container.querySelector("circle")).toHaveAttribute("cy", "3");
  });

  it("runs a flat period through the middle", () => {
    const { container } = render(<Sparkline values={[2, 2, 2]} />);
    expect(container.querySelector("circle")).toHaveAttribute("cy", "16");
  });

  it("draws nothing for fewer than two points", () => {
    const { container } = render(<Sparkline values={[4]} />);
    expect(container.querySelector("svg")).toBeNull();
  });
});
