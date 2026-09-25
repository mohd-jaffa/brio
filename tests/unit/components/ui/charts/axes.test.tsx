import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { linearScale } from "@/components/ui/charts/geometry";

// The measurer is kept once made, so each case loads the module afresh.
const load = () => import("@/components/ui/charts/axes");

const texts = (container: HTMLElement) => [...container.querySelectorAll("text")].map((text) => text.textContent);

describe("the chart axes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("measures a label in the page's font where a canvas can", async () => {
    const context = { font: "", measureText: (text: string) => ({ width: text.length * 5 }) };
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue(context as unknown as CanvasRenderingContext2D);
    const { labelWidth, valueAxisWidth } = await load();

    expect(labelWidth("₹8K")).toBe(15);
    expect(context.font).toMatch(/^11px /);
    expect(valueAxisWidth(["₹0", "₹8K"])).toBe(15 + 8);
    labelWidth("again");
    expect(getContext).toHaveBeenCalledTimes(1);
  });

  it("guesses from the length where nothing can measure", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { labelWidth } = await load();
    expect(labelWidth("1 Sep")).toBe(35);
  });

  it("guesses on the server, where there is no document", async () => {
    const { labelWidth } = await load();
    vi.stubGlobal("document", undefined);
    expect(labelWidth("₹8K")).toBe(21);
  });

  it("draws a gridline and a label for every value tick", async () => {
    const { ValueAxis } = await load();
    const y = linearScale([0, 800], [100, 0]);
    const { container } = render(
      <svg>
        <ValueAxis ticks={[0, 400, 800]} labels={["₹0", "₹4", "₹8"]} y={y} left={30} right={300} />
      </svg>,
    );
    expect(container.querySelectorAll("line")).toHaveLength(3);
    expect(texts(container)).toEqual(["₹0", "₹4", "₹8"]);
    expect(container.querySelector("line")).toHaveAttribute("y1", "100");
  });

  it("holds the end dates inside the plot and leaves out one that would touch", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { CategoryAxis } = await load();
    const labels = ["1 Sep", "2 Sep", "3 Sep", "4 Sep"];
    // 35 px labels: the last point sits 5 px from the edge, the third 30 px before it.
    const x = (index: number) => [0, 100, 165, 195][index];
    const { container } = render(
      <svg>
        <CategoryAxis indices={[0, 1, 2, 3]} labels={labels} x={x} y={190} width={200} />
      </svg>,
    );
    expect(texts(container)).toEqual(["1 Sep", "2 Sep", "4 Sep"]);
    const [first, , last] = container.querySelectorAll("text");
    expect(first).toHaveAttribute("x", "17.5");
    expect(last).toHaveAttribute("x", "182.5");
  });
});
