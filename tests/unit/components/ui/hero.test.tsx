import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Hero } from "@/components/ui/hero";

describe("Hero", () => {
  it("sets its lines in the serif, with the subtitle, the rule and the plate", () => {
    const { container } = render(
      <Hero
        as="h1"
        lines={["Good morning,", "Sarah!"]}
        subtitle="Fresh bakes, happy customers."
        plate="cake-table"
        priority
      >
        <a href="/products">View products</a>
      </Hero>,
    );
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Good morning,Sarah!");
    expect(heading.children).toHaveLength(2);
    expect(screen.getByText("Fresh bakes, happy customers.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View products" })).toBeInTheDocument();

    const plate = container.querySelector("img");
    expect(plate).toHaveAttribute("alt", "");
    expect(plate?.getAttribute("src")).toMatch(/cake-table/);
    expect(plate?.style.objectPosition).toBe("68% 55%");
    expect(plate?.parentElement).toHaveClass("max-w-2xl");
    // The largest paint is fetched at once, and first.
    expect(plate).toHaveAttribute("loading", "eager");
    expect(plate).toHaveAttribute("fetchpriority", "high");
  });

  it("is a compact band with a tracked line, its words not a heading", () => {
    const { container } = render(
      <Hero
        variant="band"
        lines={["Good baking brings", "great numbers."]}
        tagline="Grow · Bake · Repeat"
        plate="drip-cake"
      />,
    );
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.getByText("Grow · Bake · Repeat")).toHaveClass("uppercase");
    // Each "·" holds to the word before it, so a wrapped line never begins with one.
    expect(screen.getByText("Grow · Bake · Repeat").textContent).toBe("Grow\u00a0· Bake\u00a0· Repeat");
    expect(container.firstElementChild).toHaveClass("min-h-36");
    expect(container.querySelector("img")?.parentElement).toHaveClass("max-w-md");
    // Not the largest paint: it waits to be needed.
    expect(container.querySelector("img")).toHaveAttribute("loading", "lazy");
  });

  it("stands without a plate", () => {
    const { container } = render(<Hero lines={["Hello"]} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.firstElementChild).toHaveClass("min-h-52");
  });
});
