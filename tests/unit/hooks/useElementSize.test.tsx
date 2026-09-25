import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useElementSize } from "@/hooks/useElementSize";

function Probe() {
  const [ref, size] = useElementSize<HTMLDivElement>();
  return (
    <div ref={ref}>
      {size.width}×{size.height}
    </div>
  );
}

const rect = (width: number, height: number) => ({ width, height }) as DOMRect;

describe("useElementSize", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("measures the element and follows it as it resizes", () => {
    let notify: () => void = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          notify = callback;
        }
        observe() {}
        disconnect = disconnect;
      },
    );
    const measure = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(rect(320.4, 180));

    const { unmount } = render(<Probe />);
    expect(screen.getByText("320×180")).toBeInTheDocument();

    measure.mockReturnValue(rect(412, 180));
    act(() => notify());
    expect(screen.getByText("412×180")).toBeInTheDocument();

    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it("ignores a notification that changed nothing", () => {
    let notify: () => void = () => {};
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          notify = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(rect(100, 50));
    render(<Probe />);
    act(() => notify());
    expect(screen.getByText("100×50")).toBeInTheDocument();
  });

  it("measures once where there is no ResizeObserver", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(rect(200, 90));
    render(<Probe />);
    expect(screen.getByText("200×90")).toBeInTheDocument();
  });
});
