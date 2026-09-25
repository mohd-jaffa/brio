import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductTile } from "@/components/ui/product-tile";

describe("ProductTile", () => {
  it("shows the product's illustration", () => {
    const { container } = render(<ProductTile iconKey="cupcake" />);
    expect(container.querySelector("img")?.getAttribute("src")).toMatch(/cupcake/);
  });

  it("shows the price tag until one is chosen", () => {
    const { container } = render(<ProductTile />);
    expect(container.querySelector("img")?.getAttribute("src")).toMatch(/default-product/);
  });

  it("is hidden from screen readers — the product's name beside it says it", () => {
    const { container } = render(<ProductTile iconKey="donut" />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("comes in the sizes a row, a table and a card draw", () => {
    const { container, rerender } = render(<ProductTile size="sm" />);
    expect(container.firstElementChild).toHaveStyle({ width: "40px", height: "40px" });
    rerender(<ProductTile size="lg" />);
    expect(container.firstElementChild).toHaveStyle({ width: "64px", height: "64px" });
  });

  it("fills a card's width, asking for a picture big enough", () => {
    const { container } = render(<ProductTile iconKey="donut" size="fill" />);
    expect(container.firstElementChild).toHaveClass("w-full", "aspect-[4/3]");
    expect(container.querySelector("img")).toHaveAttribute("width", "144");
  });
});
