import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

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

  it("shows another view of the screen when View all does something rather than going somewhere", async () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <SectionHeading id="recent" title="Recent expenses" viewAll={{ label: "View all", name: "View all expenses", onClick }} />,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "View all expenses" }));
    expect(onClick).toHaveBeenCalledOnce();

    // Without a name of its own, its label names it.
    rerender(<SectionHeading id="top" title="Top products" viewAll={{ label: "View all products", onClick }} />);
    expect(screen.getByRole("button", { name: "View all products" })).not.toHaveAttribute("aria-label");
  });

  it("can stand alone", () => {
    render(<SectionHeading id="top" title="Top products" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
