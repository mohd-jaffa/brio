import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { QuantityStepper } from "@/components/ui/quantity-stepper";

import { sizeCharts } from "@tests/support/charts";

function Stepper({ start = 2, min, max }: { start?: number; min?: number; max?: number }) {
  const [value, setValue] = useState(start);
  return <QuantityStepper value={value} onChange={setValue} label="Quantity of Brownie" min={min} max={max} />;
}

const field = () => screen.getByRole("spinbutton", { name: "Quantity of Brownie" });
const less = () => screen.getByRole("button", { name: "Decrease" });
const more = () => screen.getByRole("button", { name: "Increase" });

describe("QuantityStepper", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("is a spinbutton with its bounds, and buttons outside the Tab order", () => {
    render(<Stepper max={20} />);
    expect(field()).toHaveValue("2");
    expect(field()).toHaveAttribute("aria-valuenow", "2");
    expect(field()).toHaveAttribute("aria-valuemin", "1");
    expect(field()).toHaveAttribute("aria-valuemax", "20");
    expect(less()).toHaveAttribute("tabindex", "-1");
    expect(more()).toHaveClass("hit-area");
  });

  it("steps from the keyboard, by one, by ten and to either bound", async () => {
    render(<Stepper max={30} />);
    field().focus();
    await userEvent.keyboard("{ArrowUp}");
    expect(field()).toHaveValue("3");
    await userEvent.keyboard("{PageUp}");
    expect(field()).toHaveValue("13");
    await userEvent.keyboard("{ArrowDown}{PageDown}");
    expect(field()).toHaveValue("2");
    await userEvent.keyboard("{End}");
    expect(field()).toHaveValue("30");
    await userEvent.keyboard("{PageUp}");
    expect(field()).toHaveValue("30");
    await userEvent.keyboard("{Home}{ArrowDown}");
    expect(field()).toHaveValue("1");
    await userEvent.keyboard("{Tab}");
  });

  it("takes a typed number, kept within bounds, and ignores anything else", async () => {
    render(<Stepper max={50} />);
    await userEvent.clear(field());
    await userEvent.type(field(), "7a{Enter}");
    expect(field()).toHaveValue("7");
    await userEvent.clear(field());
    await userEvent.type(field(), "90");
    fireEvent.blur(field());
    expect(field()).toHaveValue("50");
    await userEvent.clear(field());
    fireEvent.blur(field());
    expect(field()).toHaveValue("50");
    fireEvent.blur(field());
    expect(field()).toHaveValue("50");
  });

  it("steps once for a click with no press behind it, as a screen reader clicks", () => {
    render(<Stepper />);
    fireEvent.click(more());
    expect(field()).toHaveValue("3");
    fireEvent.click(less());
    expect(field()).toHaveValue("2");
  });

  it("steps on a press, not again for its click, and repeats while held", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    sizeCharts();
    render(<Stepper max={9} />);
    fireEvent.pointerDown(more(), { button: 0 });
    expect(field()).toHaveValue("3");
    act(() => vi.advanceTimersByTime(399));
    expect(field()).toHaveValue("3");
    act(() => vi.advanceTimersByTime(1 + 80 * 3));
    expect(field()).toHaveValue("7");
    fireEvent.pointerUp(more());
    fireEvent.click(more());
    expect(field()).toHaveValue("7");
    act(() => vi.advanceTimersByTime(1000));
    expect(field()).toHaveValue("7");
    vi.useRealTimers();
  });

  it("stops at a bound, and on letting go by sliding off", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    sizeCharts();
    render(<Stepper start={3} max={5} />);
    fireEvent.pointerDown(more(), { button: 0 });
    act(() => vi.advanceTimersByTime(2000));
    expect(field()).toHaveValue("5");
    expect(more()).toBeDisabled();

    fireEvent.pointerDown(less(), { button: 0 });
    expect(field()).toHaveValue("4");
    fireEvent.pointerLeave(less());
    act(() => vi.advanceTimersByTime(2000));
    expect(field()).toHaveValue("4");
    // The slide-off left no press waiting to swallow the next click.
    fireEvent.click(less());
    expect(field()).toHaveValue("3");
    vi.useRealTimers();
  });

  it("ignores a press that is not the main button", () => {
    sizeCharts();
    render(<Stepper />);
    fireEvent.pointerDown(more(), { button: 2 });
    expect(field()).toHaveValue("2");
  });
});
