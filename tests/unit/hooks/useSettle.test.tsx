import { render } from "@testing-library/react";
import { useRef, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Skeleton, SkeletonRows } from "@/components/ui/skeleton";
import { useSettle } from "@/hooks/useSettle";

function Region({ children }: { children: ReactNode }) {
  const region = useRef<HTMLElement>(null);
  useSettle(region);
  return <main ref={region}>{children}</main>;
}

// A MutationObserver answers in a microtask; this lets it.
const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

const animate = vi.fn();

afterEach(() => {
  animate.mockReset();
  Reflect.deleteProperty(Element.prototype, "animate");
  vi.unstubAllGlobals();
});

describe("useSettle", () => {
  it("fades in what replaces a placeholder", async () => {
    Element.prototype.animate = animate;
    const { rerender } = render(
      <Region>
        <section>
          <SkeletonRows />
        </section>
      </Region>,
    );
    rerender(
      <Region>
        <section>
          <p>Kitchen rent</p>
        </section>
      </Region>,
    );
    await settled();
    expect(animate).toHaveBeenCalledOnce();
    expect(animate.mock.contexts[0]).toHaveTextContent("Kitchen rent");
    expect(animate).toHaveBeenCalledWith([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out" });
  });

  it("leaves alone content that was not waited for, a placeholder that follows another, and a change beside one", async () => {
    Element.prototype.animate = animate;
    const { rerender } = render(
      <Region>
        <p>Cached</p>
        <div>
          <Skeleton />
        </div>
      </Region>,
    );
    rerender(
      <Region>
        <p>Also cached</p>
        <div>
          <SkeletonRows rows={2} />
        </div>
      </Region>,
    );
    rerender(
      <Region>
        <span>Changed</span>
        <div>
          <SkeletonRows rows={2} />
        </div>
      </Region>,
    );
    await settled();
    expect(animate).not.toHaveBeenCalled();
  });

  it("does nothing where the browser cannot animate, or cannot watch", async () => {
    const first = render(
      <Region>
        <SkeletonRows />
      </Region>,
    );
    first.rerender(<Region>Loaded</Region>);
    await settled();

    Element.prototype.animate = animate;
    vi.stubGlobal("MutationObserver", undefined);
    const second = render(
      <Region>
        <div>
          <SkeletonRows />
        </div>
      </Region>,
    );
    second.rerender(
      <Region>
        <div>
          <p>Loaded</p>
        </div>
      </Region>,
    );
    await settled();
    expect(animate).not.toHaveBeenCalled();
  });
});
