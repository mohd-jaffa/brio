import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QuoteBlock } from "@/components/ui/quote-block";

describe("QuoteBlock", () => {
  it("quotes the line in the serif, with a small plate beside it", () => {
    const { container } = render(<QuoteBlock quote="A well-managed bakery rises higher." plate="brownies" />);
    expect(screen.getByRole("figure")).toBeInTheDocument();
    expect(screen.getByText("“A well-managed bakery rises higher.”").closest("blockquote")).toHaveClass("font-heading");
    const plate = container.querySelector("img");
    expect(plate).toHaveAttribute("alt", "");
    expect(plate?.getAttribute("src")).toMatch(/brownies/);
  });

  it("stands without a plate", () => {
    const { container } = render(<QuoteBlock quote="Consistency today." />);
    expect(container.querySelector("img")).toBeNull();
  });
});
