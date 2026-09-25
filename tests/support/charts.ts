import { vi } from "vitest";

// jsdom has no PointerEvent, so a pointer event would arrive without its
// position or its pointer type.
class PointerEventStub extends MouseEvent {
  readonly pointerType: string;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerType = init.pointerType ?? "mouse";
  }
}

/**
 * Gives every element a measured size, so a chart that draws at its
 * container's width has one to draw at in jsdom, which lays nothing out. The
 * canvas the axes measure with is absent, as it is in jsdom anyway, but
 * without the "not implemented" noise; pointer events carry their position.
 */
export function sizeCharts(width = 320, height = 200) {
  vi.stubGlobal("PointerEvent", PointerEventStub);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    width,
    height,
    left: 0,
    top: 0,
    right: width,
    bottom: height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
}

/** Money in paise for a list of rupee amounts, labelled 1 Sep, 2 Sep, … */
export const days = (rupees: number[]) =>
  rupees.map((value, index) => ({ label: `${index + 1} Sep`, value: value * 100 }));
