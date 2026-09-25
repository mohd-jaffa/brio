import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusPill } from "@/components/ui/status-pill";
import { STATUS_TONES } from "@/constants/statuses";

describe("StatusPill", () => {
  it.each(STATUS_TONES)("reads the word in the %s colour, on its own tint, with a dot", (tone) => {
    render(<StatusPill label="Preparing" tone={tone} />);
    const pill = screen.getByText("Preparing");
    expect(pill).toHaveClass(`text-status-${tone}`);
    expect(pill.className).toContain(`var(--color-status-${tone})_12%`);
    expect(pill.querySelector('[aria-hidden="true"]')).toHaveClass("bg-current");
  });

  it("is neutral by default", () => {
    render(<StatusPill label="Inactive" />);
    expect(screen.getByText("Inactive")).toHaveClass("text-status-neutral");
  });
});
