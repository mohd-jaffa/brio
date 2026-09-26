import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SectionHeading } from "@/components/ui/section-heading";

describe("SectionHeading", () => {
  it("titles its section, with View all named for a screen reader", () => {
    render(
      <section aria-labelledby="due">
        <SectionHeading id="due" title="Orders due" viewAll={{ href: "/orders", label: "View all", name: "View all orders due" }}>
          <button type="button">Filter</button>
        </SectionHeading>
      </section>,
    );
    expect(screen.getByRole("region", { name: "Orders due" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Orders due" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View all orders due" })).toHaveAttribute("href", "/orders");
    expect(screen.getByRole("button", { name: "Filter" })).toBeInTheDocument();
  });

  it("can stand alone", () => {
    render(<SectionHeading id="top" title="Top products" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
