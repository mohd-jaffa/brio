import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { screen } from "@testing-library/react";

import { ScreenSkeleton, SkeletonRows } from "@/components/ui/skeleton";

describe("SkeletonRows", () => {
  it("draws the number of placeholders asked for, hidden from screen readers", () => {
    const { container } = render(<SkeletonRows rows={4} />);
    const blocks = container.querySelectorAll('[aria-hidden="true"]');
    expect(blocks).toHaveLength(4);
    expect(blocks[0]).toHaveClass("bg-sunken", "h-24");
  });
});

describe("ScreenSkeleton", () => {
  it("stands in for a screen on its way: one status for a screen reader, the shapes hidden from it", () => {
    render(<ScreenSkeleton label="Loading…" />);
    const status = screen.getByRole("status", { name: "Loading…" });
    expect(status).toHaveAttribute("data-screen-skeleton");
    expect(status.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
  });
});
