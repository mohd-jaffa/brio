import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BusinessLogo } from "@/features/business/components/BusinessLogo";

describe("BusinessLogo", () => {
  it("shows the logo, decorative unless it is given a name", () => {
    const { container, rerender } = render(<BusinessLogo src="/api/business/logo?v=1" />);
    expect(container.querySelector("img")).toHaveAttribute("alt", "");

    rerender(<BusinessLogo src="/api/business/logo?v=1" size="lg" alt="Your current logo" />);
    expect(screen.getByRole("img", { name: "Your current logo" })).toHaveClass("size-16", "object-contain");
  });

  it("waits to be scrolled to, unless it is at the top of every screen", () => {
    const { container, rerender } = render(<BusinessLogo src="/api/business/logo?v=1" />);
    expect(container.querySelector("img")).toHaveAttribute("loading", "lazy");
    rerender(<BusinessLogo src="/api/business/logo?v=1" eager />);
    expect(container.querySelector("img")).toHaveAttribute("loading", "eager");
  });

  it("puts the cake mark in its place when there is none", () => {
    const { container } = render(<BusinessLogo src={null} size="sm" />);
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container.firstElementChild).toHaveClass("size-9");
  });

  it("never shows a broken image: a logo that fails to load gives way to the mark, and a new one is tried", () => {
    const { container, rerender } = render(<BusinessLogo src="/api/business/logo?v=1" />);
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).not.toBeInTheDocument();

    rerender(<BusinessLogo src="/api/business/logo?v=2" />);
    expect(container.querySelector("img")).toBeInTheDocument();
  });
});
