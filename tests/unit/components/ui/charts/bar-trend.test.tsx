import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BarTrend } from "@/components/ui/charts/bar-trend";

import { days, sizeCharts } from "@tests/support/charts";

function bars(props: Partial<Parameters<typeof BarTrend>[0]> = {}) {
  return render(
    <BarTrend
      title="Expense trend"
      summary="Expenses peaked at ₹2,410 on 3 Sep"
      points={days([300, 420, 2_410, 0, 380])}
      emptyMessage="No expenses in the last 5 days"
      {...props}
    />,
  );
}

const plot = () => screen.getByRole("img", { name: /Expenses peaked/ });
const strong = (container: HTMLElement) => container.querySelectorAll("[data-strong]");
const bar = (container: HTMLElement, index: number) => container.querySelectorAll("svg > path")[index];

describe("BarTrend", () => {
  beforeEach(() => sizeCharts(320, 200));
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("draws a round-topped bar for each day, the peak in the strong tone", () => {
    const { container } = bars();
    expect(screen.getByRole("figure", { name: "Expense trend" })).toBeInTheDocument();
    expect(strong(container)).toHaveLength(1);
    expect(bar(container, 2)).toHaveAttribute("fill", "var(--color-chart-1)");
    expect(bar(container, 0)).toHaveAttribute("fill", "var(--color-chart-soft)");
    expect(bar(container, 0).getAttribute("d")).toContain("A");
    // A day with nothing spent has no bar to draw.
    expect(bar(container, 3)).toHaveAttribute("d", "");
  });

  it("gives the strong tone to the chosen bar instead", () => {
    const { container } = bars();
    act(() => plot().focus());
    fireEvent.keyDown(plot(), { key: "Home" });
    expect(bar(container, 0)).toHaveAttribute("fill", "var(--color-chart-1)");
    expect(bar(container, 2)).toHaveAttribute("fill", "var(--color-chart-soft)");
    expect(document.querySelector("[aria-live]")).toHaveTextContent("1 Sep: ₹300");
  });

  it("labels every bar when each has room for its date", () => {
    const { container } = bars();
    const dates = [...container.querySelectorAll("text")]
      .map((text) => text.textContent)
      .filter((t) => t?.includes("Sep"));
    expect(dates).toEqual(["1 Sep", "2 Sep", "3 Sep", "4 Sep", "5 Sep"]);
  });

  it("labels a few, evenly, when the bars are narrow", () => {
    const { container } = bars({ points: days(Array.from({ length: 30 }, (_, index) => 100 + index)) });
    const dates = [...container.querySelectorAll("text")]
      .map((text) => text.textContent)
      .filter((t) => t?.includes("Sep"));
    expect(dates.length).toBeLessThan(7);
    expect(dates[0]).toBe("1 Sep");
    expect(dates.at(-1)).toBe("30 Sep");
  });

  it("carries the same numbers in a table, and counts things when asked", () => {
    bars({ unit: "count", points: [{ label: "Mon", value: 3 }], labelHeading: "Day" });
    const table = screen.getByRole("table", { name: "Expense trend" });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual(["Day", "Count"]);
    expect(within(table).getByRole("row", { name: "Mon 3" })).toBeInTheDocument();
  });

  it("names the period when there is nothing in it", () => {
    bars({ points: [] });
    expect(screen.getByText("No expenses in the last 5 days")).toBeInTheDocument();
  });

  it("draws nothing until it knows its width", () => {
    vi.restoreAllMocks();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { container } = bars();
    expect(plot()).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeNull();
  });
});
