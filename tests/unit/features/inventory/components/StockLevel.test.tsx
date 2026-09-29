import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InStock, LowStock } from "@/features/inventory/components/StockLevel";
import { EXIT_MS } from "@/lib/motion";

afterEach(() => vi.useRealTimers());

describe("InStock", () => {
  it("reads as the catalogue's line, and rolls only its count the way the stock moved", () => {
    const { container, rerender } = render(<InStock balance={12} unit="piece" />);
    expect(container).toHaveTextContent(/^12 pieces in stock$/);
    expect(screen.getByText("12 pieces")).not.toHaveClass("animate-tick-up");

    rerender(<InStock balance={17} unit="piece" />);
    expect(container).toHaveTextContent(/^17 pieces in stock$/);
    expect(screen.getByText("17 pieces")).toHaveClass("animate-tick-up");

    rerender(<InStock balance={3} unit="piece" />);
    expect(screen.getByText("3 pieces")).toHaveClass("animate-tick-down");
  });
});

describe("LowStock", () => {
  // What moves is the pill's wrapper, so the pill keeps its own look.
  const pill = () => screen.queryByText("Low stock")?.parentElement;

  it("stands still when the screen opens on it", () => {
    render(<LowStock low />);
    expect(pill()).toBeInTheDocument();
    expect(pill()).not.toHaveClass("animate-pop");
  });

  it("shows nothing while stock is not low", () => {
    render(<LowStock low={false} />);
    expect(pill()).toBeUndefined();
  });

  it("pops in when stock falls to the mark", () => {
    const { rerender } = render(<LowStock low={false} />);
    expect(pill()).toBeUndefined();
    rerender(<LowStock low />);
    expect(pill()).toHaveClass("animate-pop");
    expect(pill()).not.toHaveAttribute("aria-hidden");
  });

  it("shrinks away when stock is filled again, gone to a screen reader at once", () => {
    vi.useFakeTimers();
    const { rerender } = render(<LowStock low />);
    rerender(<LowStock low={false} />);
    expect(pill()).toHaveClass("animate-pop-out");
    expect(pill()).toHaveAttribute("aria-hidden", "true");
    act(() => vi.advanceTimersByTime(EXIT_MS));
    expect(pill()).toBeUndefined();
  });

  it("pops back in if stock falls again while it leaves", () => {
    vi.useFakeTimers();
    const { rerender } = render(<LowStock low />);
    rerender(<LowStock low={false} />);
    rerender(<LowStock low />);
    expect(pill()).toHaveClass("animate-pop");
    expect(pill()).not.toHaveClass("animate-pop-out");
    act(() => vi.advanceTimersByTime(EXIT_MS));
    expect(pill()).toBeInTheDocument();
  });
});
