import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StepBar } from "@/features/orders/components/StepBar";

describe("StepBar", () => {
  it("holds a step's action at its foot, clear of the bottom navigation, on a phone and tablet only", () => {
    render(
      <StepBar>
        <button type="button">Save changes</button>
      </StepBar>,
    );
    const bar = screen.getByRole("button", { name: "Save changes" }).parentElement!;
    expect(bar).toHaveClass("sticky", "lg:hidden");
    expect(bar.className).toContain("bottom-[calc(var(--nav-height)+var(--safe-bottom)+0.75rem)]");
  });
});
