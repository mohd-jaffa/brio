import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useListMotion } from "@/hooks/useListMotion";

interface Item {
  key: string;
  y: number;
  x?: number;
}

/** A list laid out by hand, since jsdom lays nothing out: each item where its data says. */
function List({ items, hidden = false, height }: { items: Item[]; hidden?: boolean; height?: number }) {
  const list = useListMotion<HTMLUListElement>();
  return (
    <ul ref={list} data-h={height ?? items.length * 50} data-hidden={hidden || undefined}>
      {items.map((item) => (
        <li key={item.key} data-x={item.x ?? 0} data-y={item.y}>
          {item.key}
        </li>
      ))}
    </ul>
  );
}

/** Rows of 50 px, top to bottom. */
const rows = (...keys: string[]) => keys.map((key, index) => ({ key, y: index * 50 }));

interface Played {
  element: Element;
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
  cancel: ReturnType<typeof vi.fn>;
}

let played: Played[] = [];
const running = new WeakMap<Element, { id: string; cancel: () => void }[]>();

function stubBrowser() {
  played = [];
  const number = (element: HTMLElement, key: string) => Number(element.dataset[key] ?? 0);
  vi.spyOn(HTMLElement.prototype, "offsetTop", "get").mockImplementation(function (this: HTMLElement) {
    return number(this, "y");
  });
  vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockImplementation(function (this: HTMLElement) {
    return number(this, "x");
  });
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
    return number(this, "h");
  });
  vi.spyOn(Element.prototype, "getClientRects").mockImplementation(function (this: Element) {
    return (this.hasAttribute("data-hidden") ? [] : [{}]) as unknown as DOMRectList;
  });
  Element.prototype.animate = function (this: Element, keyframes, options) {
    const list = running.get(this) ?? [];
    const cancel = vi.fn(() => running.set(this, (running.get(this) ?? []).filter((one) => one !== animation)));
    const animation = { id: (options as KeyframeAnimationOptions).id ?? "", cancel };
    running.set(this, [...list, animation]);
    played.push({ element: this, keyframes: keyframes as Keyframe[], options: options as KeyframeAnimationOptions, cancel });
    return animation as unknown as Animation;
  };
  Element.prototype.getAnimations = function (this: Element) {
    return [...(running.get(this) ?? [])] as unknown as Animation[];
  };
  vi.stubGlobal(
    "DOMMatrixReadOnly",
    class {
      m41: number;
      m42: number;
      constructor(transform: string) {
        const found = /matrix\(1, 0, 0, 1, (-?[\d.]+), (-?[\d.]+)\)/.exec(transform);
        this.m41 = found ? Number(found[1]) : 0;
        this.m42 = found ? Number(found[2]) : 0;
      }
    },
  );
}

const reduceMotion = () => {
  window.matchMedia = vi.fn(() => ({ matches: true })) as unknown as typeof window.matchMedia;
};

const moves = () => played.filter((one) => String(one.keyframes[0].transform).startsWith("translate("));
const arrivals = () => played.filter((one) => one.keyframes[0].opacity === 0);

beforeEach(stubBrowser);

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(Element.prototype, "animate");
  Reflect.deleteProperty(Element.prototype, "getAnimations");
  Reflect.deleteProperty(window, "matchMedia");
});

describe("useListMotion", () => {
  it("plays nothing on the list's first showing, or when nothing changed", () => {
    const { rerender } = render(<List items={rows("a", "b")} />);
    rerender(<List items={rows("a", "b")} />);
    expect(played).toEqual([]);
  });

  it("drops an item that joins into place, and moves the ones it pushed down", () => {
    const { rerender, getByText } = render(<List items={rows("b", "c")} />);
    rerender(<List items={rows("a", "b", "c")} />);

    expect(arrivals()).toHaveLength(1);
    expect(arrivals()[0].element).toBe(getByText("a"));
    expect(arrivals()[0].keyframes).toEqual([
      { opacity: 0, transform: "translateY(-6px)" },
      { opacity: 1, transform: "none" },
    ]);
    expect(arrivals()[0].options).toMatchObject({ duration: 240, delay: 0, fill: "backwards", id: "list-motion" });
    expect(moves().map((one) => [one.element.textContent, one.keyframes[0].transform])).toEqual([
      ["b", "translate(0px, -50px)"],
      ["c", "translate(0px, -50px)"],
    ]);
  });

  it("staggers a few arrivals, a little each", () => {
    const { rerender } = render(<List items={rows("a")} />);
    rerender(<List items={rows("a", "b", "c", "d", "e", "f", "g")} />);
    expect(arrivals().map((one) => one.options.delay)).toEqual([0, 30, 60, 90, 120, 120]);
  });

  it("closes the gap an item leaves, drawing the list's edge up after it", () => {
    const { rerender, getByText } = render(<List items={rows("a", "b", "c")} />);
    rerender(<List items={rows("a", "c")} />);
    expect(moves()).toHaveLength(1);
    expect(moves()[0].element).toBe(getByText("c"));
    expect(moves()[0].keyframes[0].transform).toBe("translate(0px, 50px)");
    const edge = played.find((one) => one.keyframes[0].height !== undefined)!;
    expect(edge.keyframes).toEqual([{ height: "150px" }, { height: "100px" }]);
  });

  it("carries on an interrupted move from where it is drawn, and stops only its own motion", () => {
    const { rerender, getByText } = render(<List items={rows("a", "b", "c")} />);
    rerender(<List items={rows("b", "c")} />);
    const c = getByText("c");
    // Still 20 px short of its place as the list changes again.
    c.style.transform = "matrix(1, 0, 0, 1, 0, 20)";
    const own = c.getAnimations()[0];
    c.animate([], { id: "its-own" });
    const list = c.parentElement!;
    const edge = list.getAnimations()[0];
    played = [];

    rerender(<List items={rows("c")} />);
    expect(own.cancel).toHaveBeenCalled();
    expect(edge.cancel).toHaveBeenCalled();
    expect(c.getAnimations().map((one) => one.id)).toEqual(["its-own", "list-motion"]);
    expect(moves()[0].keyframes[0].transform).toBe("translate(0px, 70px)");
  });

  it("moves an item across as well as down, as a grid of cards reflows", () => {
    const { rerender } = render(
      <List
        items={[
          { key: "a", x: 0, y: 0 },
          { key: "b", x: 200, y: 0 },
        ]}
      />,
    );
    rerender(<List items={[{ key: "b", x: 0, y: 0 }]} />);
    expect(moves()[0].keyframes[0].transform).toBe("translate(200px, 0px)");
  });

  it("leaves an item its own arrival", () => {
    function Arriving({ items }: { items: Item[] }) {
      const list = useListMotion<HTMLUListElement>();
      return (
        <ul ref={list} data-h={items.length * 50}>
          {items.map((item) => (
            <li
              key={item.key}
              data-y={item.y}
              ref={(element) => {
                if (element && item.key === "new") element.animate([], { id: "drop-in" });
              }}
            >
              {item.key}
            </li>
          ))}
        </ul>
      );
    }
    const { rerender } = render(<Arriving items={rows("a")} />);
    played = [];
    rerender(<Arriving items={rows("a", "new")} />);
    expect(played.filter((one) => one.options.id === "list-motion")).toEqual([]);
  });

  it("only fades new items in when many come and go at once", () => {
    const { rerender } = render(<List items={rows("a", "b", "c", "d")} />);
    rerender(<List items={rows("e", "f", "g", "h")} />);
    expect(moves()).toEqual([]);
    expect(played).toHaveLength(4);
    expect(played[0].keyframes).toEqual([{ opacity: 0 }, { opacity: 1 }]);
    expect(played[0].options).toMatchObject({ duration: 160, id: "list-motion" });
  });

  it("moves nothing under reduced motion, and fades what joins", () => {
    reduceMotion();
    const { rerender } = render(<List items={rows("b", "c")} />);
    rerender(<List items={rows("a", "b")} />);
    expect(moves()).toEqual([]);
    expect(played.find((one) => one.keyframes[0].height !== undefined)).toBeUndefined();
    expect(arrivals()[0].keyframes).toEqual([{ opacity: 0 }, { opacity: 1 }]);
    expect(arrivals()[0].options).toMatchObject({ duration: 160, delay: 0 });
  });

  it("forgets a list that is not drawn, so it does not travel from nowhere when it next is", () => {
    const { rerender } = render(<List items={rows("a", "b")} />);
    rerender(<List items={rows("b")} hidden />);
    rerender(<List items={rows("c", "b")} />);
    expect(played).toEqual([]);
    rerender(<List items={rows("c", "b", "d")} />);
    expect(arrivals()).toHaveLength(1);
  });

  it("is measured again when its text wraps anew, so that is not played as a move", () => {
    let resized = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          resized = callback;
        }
        observe() {}
        disconnect = disconnect;
      },
    );
    const { rerender, getByText, unmount } = render(<List items={rows("a", "b")} />);
    getByText("b").dataset.y = "80";
    act(() => resized());
    rerender(
      <List
        items={[
          { key: "a", y: 0 },
          { key: "b", y: 80 },
        ]}
      />,
    );
    expect(played).toEqual([]);
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it("stays forgotten through a resize while it is not drawn", () => {
    let resized = () => {};
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          resized = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    const { rerender } = render(<List items={rows("a")} hidden />);
    act(() => resized());
    rerender(<List items={rows("b", "a")} />);
    expect(played).toEqual([]);
  });

  it("does nothing where the browser cannot animate", () => {
    Reflect.deleteProperty(Element.prototype, "animate");
    vi.stubGlobal("ResizeObserver", vi.fn());
    const { rerender } = render(<List items={rows("a")} />);
    rerender(<List items={rows("b", "a")} />);
    expect(played).toEqual([]);
    expect(ResizeObserver).not.toHaveBeenCalled();
  });
});
