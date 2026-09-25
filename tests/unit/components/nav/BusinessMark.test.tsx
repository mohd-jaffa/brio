import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BusinessMark } from "@/components/nav/BusinessMark";

describe("BusinessMark", () => {
  it("shows the mark, the name and the line", () => {
    const { container } = render(<BusinessMark />);
    expect(screen.getByText("Ovenly")).toBeInTheDocument();
    expect(screen.getByText("Home Bakery")).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).toHaveClass("size-10");
  });

  it("comes smaller, and can hide its words from sight but not from a screen reader", () => {
    const { container } = render(<BusinessMark compact textClassName="sr-only" className="px-2" />);
    expect(container.firstElementChild).toHaveClass("px-2");
    expect(container.querySelector('[aria-hidden="true"]')).toHaveClass("size-9");
    expect(screen.getByText("Ovenly").parentElement).toHaveClass("sr-only");
  });
});
