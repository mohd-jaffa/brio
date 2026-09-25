import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LineTrend } from "@/components/ui/charts/line-trend";

import { days, sizeCharts } from "@tests/support/charts";

const SALES = days([1_200, 1_800, 6_240, 5_400]);

function trend(props: Partial<Parameters<typeof LineTrend>[0]> = {}) {
  return render(
    <LineTrend
      title="Sales trend"
      summary="Sales rose 12% to ₹14,640 over the last 4 days"
      points={SALES}
      emptyMessage="No sales in the last 4 days"
      {...props}
    />,
  );
}

const plot = () => screen.getByRole("img", { name: /Sales rose 12%/ });
const series = (name: string, container: HTMLElement) => container.querySelector(`[data-series="${name}"]`);

describe("LineTrend", () => {
  beforeEach(() => sizeCharts(320, 200));
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("draws the line, its fill and the axes, named by its summary", () => {
    const { container } = trend();
    expect(screen.getByRole("figure", { name: "Sales trend" })).toBeInTheDocument();
    expect(plot()).toBeInTheDocument();
    expect(series("current", container)?.getAttribute("d")).toMatch(/^M[\d.]+,[\d.]+C/);
    expect(container.querySelector('path[fill^="url(#line-fill-"]')).toBeInTheDocument();
    expect(series("previous", container)).toBeNull();
    // ₹0 to ₹8K on the value axis; every date fits at this width.
    const labels = [...container.querySelectorAll("text")].map((text) => text.textContent);
    expect(labels).toEqual(expect.arrayContaining(["₹0", "₹2K", "₹8K", "1 Sep", "4 Sep"]));
  });

  it("carries the same numbers in a table", () => {
    trend();
    const table = screen.getByRole("table", { name: "Sales trend" });
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["Date", "Amount"]);
    expect(within(table).getByRole("row", { name: "3 Sep ₹6,240" })).toBeInTheDocument();
  });

  it("marks the chosen point and names it", () => {
    trend();
    act(() => plot().focus());
    fireEvent.keyDown(plot(), { key: "ArrowLeft" });
    expect(screen.getByTestId("chart-mark")).toBeInTheDocument();
    expect(document.querySelector("[aria-live]")).toHaveTextContent("3 Sep: ₹6,240");
  });

  it("draws the previous period dashed beneath, with a legend and its own column", () => {
    const { container } = trend({ previous: days([1_000, 1_500, 2_000]), labelHeading: "Day" });
    expect(series("previous", container)).toHaveAttribute("stroke-dasharray", "4 4");
    // The legend, beside the table's own headers.
    expect(screen.getByText("This period", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Previous period", { selector: "span" })).toBeInTheDocument();

    const table = screen.getByRole("table", { name: "Sales trend" });
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "Day",
      "This period",
      "Previous period",
    ]);
    expect(within(table).getByRole("row", { name: "2 Sep ₹1,800 ₹1,500" })).toBeInTheDocument();
    // A previous period shorter than this one leaves the cell blank.
    expect(within(table).getByRole("row", { name: "4 Sep ₹5,400" })).toBeInTheDocument();
  });

  it("counts things when asked to", () => {
    const { container } = trend({ unit: "count", points: [{ label: "Mon", value: 3 }, { label: "Tue", value: 7 }] });
    const labels = [...container.querySelectorAll("text")].map((text) => text.textContent);
    expect(labels).toEqual(expect.arrayContaining(["0", "8"]));
    expect(screen.getByRole("columnheader", { name: "Count" })).toBeInTheDocument();
  });

  it("dots a lone point, which a line cannot show", () => {
    const { container } = trend({ points: days([500]) });
    expect(container.querySelector('circle[r="3"]')).toBeInTheDocument();
  });

  it("names the period when there is nothing in it", () => {
    trend({ points: days([0, 0, 0]) });
    expect(screen.getByText("No sales in the last 4 days")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("draws nothing until it knows its width", () => {
    vi.restoreAllMocks();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { container } = trend();
    expect(plot()).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeNull();
  });
});
