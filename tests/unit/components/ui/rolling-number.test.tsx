import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RollingNumber } from "@/components/ui/rolling-number";

const shown = () => screen.getByText(/\d/);

describe("RollingNumber", () => {
  it("shows the number still when it first appears", () => {
    render(<RollingNumber value={3} />);
    expect(shown()).toHaveTextContent("3");
    expect(shown()).not.toHaveClass("animate-tick-up");
    expect(shown()).not.toHaveClass("animate-tick-down");
  });

  it("rolls up as it grows and down as it shrinks, showing what it is given", () => {
    const { rerender } = render(<RollingNumber value={125000}>₹1,250</RollingNumber>);
    rerender(<RollingNumber value={250000}>₹2,500</RollingNumber>);
    expect(shown()).toHaveTextContent("₹2,500");
    expect(shown()).toHaveClass("animate-tick-up");

    rerender(<RollingNumber value={100000}>₹1,000</RollingNumber>);
    expect(shown()).toHaveClass("animate-tick-down");

    rerender(<RollingNumber value={100000}>₹1,000</RollingNumber>);
    expect(shown()).toHaveClass("animate-tick-down");
  });

  it("replaces the number with each change, so the roll plays again", () => {
    const { rerender } = render(<RollingNumber value={1} />);
    rerender(<RollingNumber value={2} />);
    const first = shown();
    rerender(<RollingNumber value={3} />);
    expect(shown()).not.toBe(first);
  });
});
