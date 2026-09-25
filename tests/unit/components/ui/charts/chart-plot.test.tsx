import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChartPlot, type PlotTarget } from "@/components/ui/charts/chart-plot";

import { sizeCharts } from "@tests/support/charts";

const point = (x: number, y: number, n: number): PlotTarget => ({ x, y, label: `${n} Sep`, value: `₹${n}00` });
// Three points across a 300 px plot, the middle one high.
const TARGETS = [point(20, 150, 1), point(150, 20, 2), point(280, 120, 3)];

function Plot({ targets = TARGETS, start = null }: { targets?: PlotTarget[]; start?: number | null }) {
  const [active, setActive] = useState<number | null>(start);
  return (
    <ChartPlot
      plotRef={() => {}}
      width={300}
      height={200}
      summary="Sales rose 12%"
      targets={targets}
      active={active}
      onActiveChange={setActive}
    >
      <svg />
    </ChartPlot>
  );
}

const plot = () => screen.getByRole("img", { name: "Sales rose 12%" });
const announced = () => document.querySelector("[aria-live]")?.textContent;
const bubble = () => screen.queryByText(/^₹\d00$/)?.parentElement;

describe("ChartPlot", () => {
  beforeEach(() => sizeCharts(300, 200));
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("is an image named by its summary, reachable from the keyboard", () => {
    render(<Plot />);
    expect(plot()).toHaveAttribute("tabindex", "0");
    expect(bubble()).toBeUndefined();
    expect(announced()).toBe("");
  });

  it("follows the pointer to the nearest point, and lets go when it leaves", () => {
    render(<Plot />);
    fireEvent.pointerMove(plot(), { clientX: 170, pointerType: "mouse" });
    expect(announced()).toBe("2 Sep: ₹200");
    expect(screen.getByText("₹200")).toBeInTheDocument();

    fireEvent.pointerLeave(plot(), { pointerType: "mouse" });
    expect(announced()).toBe("");
  });

  it("keeps a tapped point after the finger lifts", () => {
    render(<Plot />);
    fireEvent.pointerDown(plot(), { clientX: 10, pointerType: "touch" });
    fireEvent.pointerLeave(plot(), { pointerType: "touch" });
    expect(announced()).toBe("1 Sep: ₹100");
  });

  it("keeps the point while the plot has focus", () => {
    render(<Plot />);
    act(() => plot().focus());
    fireEvent.pointerMove(plot(), { clientX: 10, pointerType: "mouse" });
    fireEvent.pointerLeave(plot(), { pointerType: "mouse" });
    expect(announced()).toBe("1 Sep: ₹100");
  });

  it("starts at the latest point on focus, and moves with the keys", () => {
    render(<Plot />);
    act(() => plot().focus());
    expect(announced()).toBe("3 Sep: ₹300");

    const press = (key: string) => fireEvent.keyDown(plot(), { key });
    press("ArrowLeft");
    expect(announced()).toBe("2 Sep: ₹200");
    press("ArrowLeft");
    press("ArrowLeft");
    expect(announced()).toBe("1 Sep: ₹100");
    press("ArrowRight");
    expect(announced()).toBe("2 Sep: ₹200");
    press("End");
    press("ArrowRight");
    expect(announced()).toBe("3 Sep: ₹300");
    press("Home");
    expect(announced()).toBe("1 Sep: ₹100");
    press("Tab");
    expect(announced()).toBe("1 Sep: ₹100");
    press("Escape");
    expect(announced()).toBe("");
    press("ArrowRight");
    expect(announced()).toBe("3 Sep: ₹300");
    press("Escape");
    press("ArrowLeft");
    expect(announced()).toBe("3 Sep: ₹300");

    fireEvent.blur(plot());
    expect(announced()).toBe("");
  });

  it("keeps a chosen point when focus arrives", () => {
    render(<Plot start={0} />);
    fireEvent.focus(plot());
    expect(announced()).toBe("1 Sep: ₹100");
  });

  it("does nothing without points", () => {
    render(<Plot targets={[]} />);
    fireEvent.pointerMove(plot(), { clientX: 10, pointerType: "mouse" });
    fireEvent.keyDown(plot(), { key: "ArrowLeft" });
    fireEvent.focus(plot());
    expect(announced()).toBe("");
  });

  it("puts the bubble above a point, hanging inwards at the edges", () => {
    render(<Plot />);
    const place = (key: string) => {
      fireEvent.keyDown(plot(), { key });
      return bubble()!.style;
    };
    expect(place("Home").transform).toBe("translate(-14px, calc(-100% - 10px))");
    expect(place("End").transform).toBe("translate(calc(-100% + 14px), calc(-100% - 10px))");
    expect(place("End").top).toBe("120px");
  });

  it("puts the bubble beside a point too high for it, towards the middle", () => {
    const high = [point(20, 10, 1), point(150, 150, 2), point(280, 30, 3)];
    render(<Plot targets={high} />);
    fireEvent.keyDown(plot(), { key: "Home" });
    expect(bubble()!.style.transform).toBe("translate(10px, -50%)");
    expect(bubble()!.style.top).toBe("26px");
    fireEvent.keyDown(plot(), { key: "End" });
    expect(bubble()!.style.transform).toBe("translate(calc(-100% - 10px), -50%)");
    expect(bubble()!.style.top).toBe("30px");
    fireEvent.keyDown(plot(), { key: "ArrowLeft" });
    expect(bubble()!.style.transform).toBe("translate(-50%, calc(-100% - 10px))");
  });
});
