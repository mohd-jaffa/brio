import { render, screen } from "@testing-library/react";
import { ShoppingBag } from "lucide-react";
import { describe, expect, it } from "vitest";

import { StatTile } from "@/components/ui/stat-tile";

const tile = (props: Parameters<typeof StatTile>[0]) =>
  render(
    <dl>
      <StatTile {...props} />
    </dl>,
  );

describe("StatTile", () => {
  it("opens where its figure is looked into: the whole tile, named by its label", () => {
    tile({ label: "Low stock", value: "3", href: "/inventory" });
    const link = screen.getByRole("link", { name: "Low stock" });
    expect(link).toHaveAttribute("href", "/inventory");
    // Its ::after is what covers the tile, and wears the focus ring.
    expect(link).toHaveClass("after:absolute", "after:inset-0");
    expect(link.closest("dl > div")).toHaveClass("relative");
  });

  it("says what needs seeing under the figure, in the danger tone", () => {
    tile({ label: "Due today", value: "0", note: "6 late" });
    expect(screen.getAllByRole("definition")[1]).toHaveTextContent("6 late");
    expect(screen.getByText("6 late")).toHaveClass("text-danger");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("is a term and its value — it never decides how money reads", () => {
    tile({ label: "Total sales", value: "₹45,280" });
    expect(screen.getByRole("term")).toHaveTextContent("Total sales");
    expect(screen.getByRole("definition")).toHaveTextContent("₹45,280");
    expect(screen.getByText("₹45,280")).toHaveClass("font-semibold");
  });

  it("sets a headline amount in the serif, with its medallion", () => {
    const { container } = tile({
      label: "Total sales",
      value: "₹45,280",
      headline: true,
      icon: ShoppingBag,
      tone: "success",
    });
    expect(screen.getByText("₹45,280")).toHaveClass("font-heading");
    expect(container.querySelector('[aria-hidden="true"]')).toHaveClass("bg-success-bg");
  });

  it("reads a rise as good news in green, and says so in words", () => {
    tile({ label: "Total sales", value: "₹45,280", delta: { change: 12, since: "vs last month" } });
    const [, delta] = screen.getAllByRole("definition");
    expect(delta).toHaveTextContent("Up 12%vs last month");
    expect(delta.firstElementChild).toHaveClass("text-success");
  });

  it("reads a rise in a cost as bad news, and a fall as good", () => {
    const { unmount } = tile({ label: "Total expenses", value: "₹12,400", delta: { change: 8, up: "bad" } });
    expect(screen.getAllByRole("definition")[1].firstElementChild).toHaveClass("text-danger");
    unmount();
    tile({ label: "Total expenses", value: "₹12,400", delta: { change: -8, up: "bad" } });
    const delta = screen.getAllByRole("definition")[1];
    expect(delta).toHaveTextContent("Down 8%");
    expect(delta.firstElementChild).toHaveClass("text-success");
  });

  it("says when nothing moved", () => {
    tile({ label: "Orders", value: "24", delta: { change: 0 } });
    const delta = screen.getAllByRole("definition")[1];
    expect(delta).toHaveTextContent("No change");
    expect(delta.firstElementChild).toHaveClass("text-text-muted");
  });

  it("carries the period's shape for a desktop", () => {
    const { container } = tile({ label: "Orders", value: "24", trend: [1, 3, 2, 4] });
    expect(container.querySelector('.lg\\:block[aria-hidden="true"]')).toBeInTheDocument();
  });

  it("rolls a figure in the direction its raw value moved", () => {
    const { rerender } = tile({ label: "Orders", value: "24", motionValue: 24 });
    rerender(
      <dl>
        <StatTile label="Orders" value="31" motionValue={31} />
      </dl>,
    );
    expect(screen.getByText("31")).toHaveClass("animate-tick-up");
  });
});
