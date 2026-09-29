import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RangePrompt } from "@/components/ui/range-prompt";

describe("RangePrompt (audit A4)", () => {
  it("says the one thing to do, politely, and nothing about loading", () => {
    render(<RangePrompt />);
    const prompt = screen.getByRole("status");
    expect(prompt).toHaveTextContent("Choose both dates");
    expect(prompt).toHaveTextContent("Pick a From and a To date above, and the figures for those days appear here.");
    expect(prompt).not.toHaveAttribute("aria-busy");
    expect(screen.getByRole("heading", { name: "Choose both dates" })).toBeInTheDocument();
  });
});
