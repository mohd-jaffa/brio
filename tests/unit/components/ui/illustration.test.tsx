import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Illustration } from "@/components/ui/illustration";

describe("Illustration", () => {
  it("is decoration beside a name — nothing for a screen reader to read twice", () => {
    const { container } = render(<Illustration name="donut" fallback="default-product" size={40} />);
    const image = container.querySelector("img");
    expect(image).toHaveAttribute("alt", "");
    expect(image?.getAttribute("src")).toMatch(/donut/);
  });

  it("names itself where it stands alone", () => {
    render(<Illustration name="rose-bouquet" fallback="default-product" size={64} labelled />);
    expect(screen.getByRole("img", { name: "Rose bouquet" })).toBeInTheDocument();
  });

  it("shows the fallback for a key the library does not have, or none", () => {
    const { container, rerender } = render(<Illustration name="retired-key" fallback="default-expense" size={40} />);
    expect(container.querySelector("img")?.getAttribute("src")).toMatch(/default-expense/);

    rerender(<Illustration name={null} fallback="default-product" size={40} />);
    expect(container.querySelector("img")?.getAttribute("src")).toMatch(/default-product/);
  });

  it("asks for an image the size it is drawn", () => {
    const { container } = render(<Illustration name="taco" fallback="default-product" size={48} />);
    const image = container.querySelector("img");
    expect(image).toHaveAttribute("width", "48");
    expect(image).toHaveAttribute("height", "48");
  });

  it("fetches an expected largest paint immediately", () => {
    const { container } = render(<Illustration name="donut" fallback="default-product" size={144} priority />);
    const image = container.querySelector("img");
    expect(image).toHaveAttribute("loading", "eager");
    expect(image).toHaveAttribute("fetchpriority", "high");
  });
});
