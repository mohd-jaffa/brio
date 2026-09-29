import { act, render, screen } from "@testing-library/react";
import { Component, type ReactNode } from "react";
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

  it("once fetched, is drawn in the same render that opens it — no suspended reveal held back", async () => {
    let idle: (() => void) | undefined;
    vi.stubGlobal("requestIdleCallback", (task: () => void) => {
      idle = task;
      return 1;
    });
    vi.stubGlobal("cancelIdleCallback", vi.fn());
    const Lazy = lazySheet(
      async () => Sheet,
      (props) => props.open,
    );

    const { rerender } = render(<Lazy open={false} title="Add product" />);
    await act(async () => {
      idle?.();
      await Lazy.preload();
    });
    rerender(<Lazy open title="Add product" />);
    // No await: it is there at once.
    expect(screen.getByRole("dialog", { name: "Add product" })).toBeVisible();
  });

  it("lets a failed fetch reach the screen's error boundary, and asks again on the next opening", async () => {
    class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
      state = { failed: false };
      static getDerivedStateFromError() {
        return { failed: true };
      }
      render() {
        return this.state.failed ? <p>Could not open</p> : this.props.children;
      }
    }
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("requestIdleCallback", undefined);
    const load = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(Sheet);
    const Lazy = lazySheet(load, (props: { open: boolean; title: string }) => props.open);

    render(
      <Boundary>
        <Lazy open title="New customer" />
      </Boundary>,
    );
    expect(await screen.findByText("Could not open")).toBeInTheDocument();

    render(<Lazy open title="New customer" />);
    expect(await screen.findByRole("dialog", { name: "New customer" })).toBeVisible();
    expect(load).toHaveBeenCalledTimes(2);
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
