import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SkeletonRows } from "@/components/ui/skeleton";

describe("SkeletonRows", () => {
  it("draws the number of placeholders asked for, hidden from screen readers", () => {
    const { container } = render(<SkeletonRows rows={4} />);
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(4);
  });
});
