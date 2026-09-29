import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TabPanel, Tabs } from "@/components/ui/tabs";

const OPTIONS = [
  { value: "overview", label: "Overview" },
  { value: "sales", label: "Sales", count: 12 },
  { value: "orders", label: "Orders" },
] as const;

function Screen({ start = "overview" }: { start?: string }) {
  const [tab, setTab] = useState(start as (typeof OPTIONS)[number]["value"]);
  return (
    <>
      <Tabs id="analytics" label="Analytics views" value={tab} options={OPTIONS} onChange={setTab} />
      <TabPanel id="analytics" value={tab}>
        Showing {tab}
      </TabPanel>
    </>
  );
}

describe("Tabs", () => {
  it("is a tablist whose chosen tab names the panel it shows", () => {
    render(<Screen />);
    expect(screen.getByRole("tablist", { name: "Analytics views" })).toBeInTheDocument();
    const overview = screen.getByRole("tab", { name: "Overview" });
    expect(overview).toHaveAttribute("aria-selected", "true");

    const panel = screen.getByRole("tabpanel", { name: "Overview" });
    expect(panel).toHaveTextContent("Showing overview");
    expect(overview).toHaveAttribute("aria-controls", panel.id);
  });

  it("shows a count beside a tab's name", () => {
    render(<Screen />);
    expect(screen.getByRole("tab", { name: "Sales 12" })).toBeInTheDocument();
  });

  it("switches by a tap, or by the arrow keys as it goes", async () => {
    render(<Screen />);
    await userEvent.click(screen.getByRole("tab", { name: "Orders" }));
    expect(screen.getByRole("tabpanel", { name: "Orders" })).toHaveTextContent("Showing orders");

    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Sales 12" })).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Showing sales");
    expect(screen.getByRole("tab", { name: "Sales 12" }).querySelector("span")).toHaveClass("bg-primary-soft");
  });
});

// jsdom lays nothing out: each tab is 80 px wide, 100 px from the last.
function layTabsOut() {
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(80);
  vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockImplementation(function (this: HTMLElement) {
    return (
      [...(this.parentElement?.children ?? [])].filter((child) => child.getAttribute("role") === "tab").indexOf(this) *
      100
    );
  });
}

const underline = () => screen.getByRole("tablist").querySelector<HTMLElement>('span[aria-hidden="true"]')!;

describe("Tabs' underline", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("sits under the chosen tab, then glides to the next one chosen", async () => {
    layTabsOut();
    render(<Screen />);
    expect(underline()).toHaveStyle({ width: "64px", transform: "translateX(8px)" });
    expect(underline().style.transition).toBe("");

    await userEvent.click(screen.getByRole("tab", { name: "Orders" }));
    expect(underline()).toHaveStyle({ transform: "translateX(208px)" });
    expect(underline().style.transition).toBe("");
  });

  it("is hidden while no tab is chosen", () => {
    render(<Screen start="nothing" />);
    expect(underline()).not.toBeVisible();
  });

  it("is placed again when a tab changes size, and stops watching when it goes", () => {
    layTabsOut();
    const watched: Element[] = [];
    let resized = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          resized = callback;
        }
        observe(element: Element) {
          watched.push(element);
        }
        disconnect = disconnect;
      },
    );
    const { unmount } = render(<Screen />);
    expect(watched).toHaveLength(3);

    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(120);
    act(() => resized());
    expect(underline()).toHaveStyle({ width: "104px" });

    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it("lets a resize that lands as the tabs leave pass by", () => {
    layTabsOut();
    let resized = () => {};
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          resized = callback;
        }
        observe() {}
        // Still delivered after the tabs have gone, as a browser may between React letting go of its refs and this cleanup.
        disconnect() {}
      },
    );
    const { unmount } = render(<Screen />);
    unmount();
    expect(() => resized()).not.toThrow();
  });
});

describe("TabPanel", () => {
  afterEach(() => {
    Reflect.deleteProperty(HTMLElement.prototype, "animate");
  });

  it("brings a later tab's view in from the right and an earlier one's from the left, never on first showing", async () => {
    const animate = vi.fn();
    HTMLElement.prototype.animate = animate;
    render(<Screen />);
    expect(animate).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("tab", { name: "Orders" }));
    expect(animate.mock.calls[0][0][0]).toEqual({ opacity: 0, transform: "translateX(8px)" });
    await userEvent.click(screen.getByRole("tab", { name: "Overview" }));
    expect(animate.mock.calls[1][0][0]).toEqual({ opacity: 0, transform: "translateX(-8px)" });
  });

  it("comes in from the right when there are no tabs to tell which way, and keeps still where nothing can animate", () => {
    const animate = vi.fn();
    HTMLElement.prototype.animate = animate;
    const { rerender } = render(
      <TabPanel id="lone" value="a">
        A
      </TabPanel>,
    );
    rerender(
      <TabPanel id="lone" value="b">
        B
      </TabPanel>,
    );
    expect(animate.mock.calls[0][0][0]).toEqual({ opacity: 0, transform: "translateX(8px)" });

    Reflect.deleteProperty(HTMLElement.prototype, "animate");
    expect(() =>
      rerender(
        <TabPanel id="lone" value="c">
          C
        </TabPanel>,
      ),
    ).not.toThrow();
  });
});
