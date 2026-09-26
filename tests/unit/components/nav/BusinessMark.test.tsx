import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BusinessProfile } from "@/features/business/types";

import { BusinessMark } from "@/components/nav/BusinessMark";

const { query } = vi.hoisted(() => ({
  query: { current: {} as { data?: BusinessProfile; error?: unknown } },
}));
vi.mock("@/features/business/hooks/useBusiness", () => ({ useBusiness: () => query.current }));

const business: BusinessProfile = {
  id: "b-1",
  name: "Sweet Delights Home Bakery",
  tagline: "Cakes for every celebration",
  city: "Pune",
  address: "12 MG Road",
  phone: "+919876543210",
  logoUrl: "/api/business/logo?v=c9fe50e7-67e4-467c-95f5-f4a37c186e8a",
  nameChangedAt: null,
};

/** next/image writes the address out in full; what matters is the path and version. */
function pathOf(image: Element) {
  const url = new URL(image.getAttribute("src")!, "http://localhost");
  return url.pathname + url.search;
}

beforeEach(() => {
  query.current = { data: business };
});

describe("BusinessMark", () => {
  it("shows the business's own logo, name and catch phrase", () => {
    const { container } = render(<BusinessMark />);
    expect(screen.getByText("Sweet Delights Home Bakery")).toHaveAttribute("title", "Sweet Delights Home Bakery");
    expect(screen.getByText("Cakes for every celebration")).toBeInTheDocument();
    // Decorative: the name is written beside it.
    const logo = container.querySelector("img");
    expect(pathOf(logo!)).toBe(business.logoUrl);
    expect(logo).toHaveAttribute("alt", "");
    expect(logo).toHaveClass("size-10");
    // At the top of every screen: fetched at once, not when scrolled to.
    expect(logo).toHaveAttribute("loading", "eager");
  });

  it("puts the cake mark and a neutral line where there is no logo or catch phrase", () => {
    query.current = { data: { ...business, logoUrl: null, tagline: null } };
    const { container } = render(<BusinessMark />);
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).toHaveClass("size-10");
    expect(screen.getByText("Home Business")).toBeInTheDocument();
  });

  it("holds a quiet placeholder while loading, rather than flashing the app's name", () => {
    query.current = {};
    render(<BusinessMark />);
    expect(screen.queryByText("Ovenly")).not.toBeInTheDocument();
    expect(screen.getByText("Loading…").parentElement).toHaveAttribute("aria-busy", "true");
  });

  it("falls back to the app's own name and line when the business cannot be loaded", () => {
    query.current = { error: new Error("offline") };
    render(<BusinessMark />);
    expect(screen.getByText("Ovenly")).toBeInTheDocument();
    expect(screen.getByText("Home Business")).toBeInTheDocument();
  });

  it("comes smaller, and can hide its words from sight but not from a screen reader", () => {
    const { container } = render(<BusinessMark compact textClassName="sr-only" className="px-2" />);
    expect(container.firstElementChild).toHaveClass("px-2");
    expect(container.querySelector("img")).toHaveClass("size-9");
    expect(screen.getByText("Sweet Delights Home Bakery").parentElement).toHaveClass("sr-only");
  });
});
