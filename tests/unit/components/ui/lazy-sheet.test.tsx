import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { lazySheet } from "@/components/ui/lazy-sheet";

function Sheet({ open, title }: { open: boolean; title: string }) {
  return (
    <div role="dialog" aria-label={title} hidden={!open}>
      {title}
    </div>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("lazySheet", () => {
  it("draws nothing, and asks for nothing, until it is first opened; then it stays", async () => {
    const load = vi.fn(async () => Sheet);
    const Lazy = lazySheet(load, (props) => props.open);
    vi.stubGlobal("requestIdleCallback", undefined);

    const { rerender } = render(<Lazy open={false} title="New customer" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();

    rerender(<Lazy open title="New customer" />);
    expect(await screen.findByRole("dialog", { name: "New customer" })).toBeVisible();

    // Closed again, it is kept, so its closing motion can play.
    rerender(<Lazy open={false} title="New customer" />);
    expect(screen.getByText("New customer")).not.toBeVisible();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("fetches itself once the screen is idle, so opening it rarely waits", async () => {
    let idle: (() => void) | undefined;
    const cancel = vi.fn();
    vi.stubGlobal("requestIdleCallback", (task: () => void) => {
      idle = task;
      return 7;
    });
    vi.stubGlobal("cancelIdleCallback", cancel);
    const load = vi.fn(async () => Sheet);
    const Lazy = lazySheet(load, (props) => props.open);

    const { unmount } = render(<Lazy open={false} title="Record stock" />);
    expect(load).not.toHaveBeenCalled();
    act(() => idle?.());
    expect(load).toHaveBeenCalledTimes(1);
    await Lazy.preload();
    expect(load).toHaveBeenCalledTimes(1);

    unmount();
    expect(cancel).toHaveBeenCalledWith(7);
  });

  it("waits a moment instead where the browser cannot say when it is idle", () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestIdleCallback", undefined);
    const load = vi.fn(async () => Sheet);
    const Lazy = lazySheet(load, (props) => props.open);

    const { unmount } = render(<Lazy open={false} title="Bill" />);
    act(() => void vi.advanceTimersByTime(1_500));
    expect(load).toHaveBeenCalledTimes(1);
    unmount();
  });
});
