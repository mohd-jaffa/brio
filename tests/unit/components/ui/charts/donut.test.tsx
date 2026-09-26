import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Donut } from "@/components/ui/charts/donut";

const EXPENSES = [
  { label: "Packaging", value: 223_200 },
  { label: "Ingredients", value: 521_000 },
  { label: "Utilities", value: 148_800 },
];

function donut(props: Partial<Parameters<typeof Donut>[0]> = {}) {
  return render(
    <Donut
      title="Expenses by category"
      summary="Ingredients were 58% of ₹8,930"
      totalLabel="Total expenses"
      slices={EXPENSES}
      emptyMessage="No expenses in the last 30 days"
      {...props}
    />,
  );
}

const legend = (container: HTMLElement) =>
  [...container.querySelectorAll("ul li")].map((item) => item.textContent);

describe("Donut", () => {
  it("rings the slices largest first, with the total in the middle", () => {
    const { container } = donut();
    expect(screen.getByRole("figure", { name: "Expenses by category" })).toBeInTheDocument();
    const ring = screen.getByRole("img", { name: "Ingredients were 58% of ₹8,930" });
    expect(within(ring).getByText("₹8,930")).toBeInTheDocument();
    expect(within(ring).getByText("Total expenses")).toBeInTheDocument();

    const arcs = ring.querySelectorAll("circle");
    expect(arcs).toHaveLength(3);
    expect(arcs[0]).toHaveAttribute("stroke", "var(--color-chart-1)");
    expect(arcs[2]).toHaveAttribute("stroke", "var(--color-chart-3)");
    expect(legend(container)).toEqual(["Ingredients58%", "Packaging25%", "Utilities17%"]);
  });

  it("hides the legend from a screen reader, which reads the table instead", () => {
    const { container } = donut();
    expect(container.querySelector("ul")).toHaveAttribute("aria-hidden", "true");
    const table = screen.getByRole("table", { name: "Expenses by category" });
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "Category",
      "Amount",
      "Share",
    ]);
    expect(within(table).getByRole("row", { name: "Ingredients ₹5,210 58%" })).toBeInTheDocument();
  });

  it("names long slices in full, the legend beneath the ring until they fit beside it", () => {
    const slices = [
      { label: "Chocolate Truffle Cake (1 kg)", value: 120_000 },
      { label: "Red Velvet Cupcakes (Box of 6)", value: 45_000 },
    ];
    const { container } = donut({ slices });
    expect(legend(container)).toEqual(["Chocolate Truffle Cake (1 kg)73%", "Red Velvet Cupcakes (Box of 6)27%"]);
  });

  it("folds everything past the fifth slice into Others", () => {
    const slices = [7, 6, 5, 4, 3, 2, 1].map((value, index) => ({ label: `Status ${index + 1}`, value }));
    const { container } = donut({ slices, unit: "count", labelHeading: "Status" });
    expect(legend(container).at(-1)).toBe("Others11%");
    expect(screen.getByRole("row", { name: "Others 3 11%" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeInTheDocument();
  });

  it("sets a longer total smaller, and a total too long for the ring compact", () => {
    const { unmount } = donut({ slices: [{ label: "Cakes", value: 12_345_600 }] });
    expect(within(screen.getByRole("img")).getByText("₹1,23,456")).toHaveClass("text-base");
    unmount();
    donut({ slices: [{ label: "Cakes", value: 1_234_567_800 }] });
    expect(within(screen.getByRole("img")).getByText("₹1.2Cr")).toBeInTheDocument();
    expect(screen.getByRole("row", { name: "Cakes ₹1,23,45,678 100%" })).toBeInTheDocument();
  });

  it("names the period when there is nothing in it", () => {
    donut({ slices: [{ label: "Cakes", value: 0 }] });
    expect(screen.getByText("No expenses in the last 30 days")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
