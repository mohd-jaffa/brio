import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DAY_STOPS, DayOnOnePhone, screenState, stopAt } from "@/components/landing/DayOnOnePhone";
import { UI_TEXT } from "@/constants/messages";

const text = UI_TEXT.landing;

let wide = true;
let frames: FrameRequestCallback[] = [];

beforeEach(() => {
  wide = true;
  frames = [];
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: wide })),
  );
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((frame) => frames.push(frame));
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
  // Every marker starts below the screen, as it does when the page opens.
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ top: 10_000, bottom: 400 } as DOMRect);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** The page scrolled so each marker's top is where given; then the frame the scroll asked for runs. */
function scrollTo(tops: number[], stageBottom = 400) {
  document.querySelectorAll<HTMLElement>("[data-stop]").forEach((marker, at) => {
    marker.getBoundingClientRect = () => ({ top: tops[at] }) as DOMRect;
  });
  document.querySelector<HTMLElement>(".day-stage")!.getBoundingClientRect = () => ({ bottom: stageBottom }) as DOMRect;
  fireEvent.scroll(window);
  act(() => frames.splice(0).forEach((frame) => frame(0)));
}

const screens = () => [...document.querySelectorAll<HTMLElement>(".day-screen")].map((each) => each.dataset.state);
const steps = () => screen.getAllByRole("listitem").filter((item) => item.classList.contains("day-step"));

describe("stopAt", () => {
  it("is the last stop whose marker has crossed the line, and the first before any has", () => {
    expect(stopAt([100, 300, 500], 384)).toBe(1);
    expect(stopAt([400, 500], 384)).toBe(0);
    expect(stopAt([-900, -400, 0], 384)).toBe(2);
  });
});

describe("screenState", () => {
  it("shows one screen, keeps those to come aside, and pushes those gone by aside — or leaves one under a sheet", () => {
    const bill = DAY_STOPS.findIndex((stop) => stop.enter === "sheet");
    expect(screenState(bill, bill)).toBe("current");
    expect(screenState(bill + 1, bill)).toBe("after");
    expect(screenState(bill - 1, bill)).toBe("under");
    expect(screenState(bill - 2, bill)).toBe("before");
    expect(screenState(bill, bill + 1)).toBe("before");
  });
});

describe("DayOnOnePhone", () => {
  it("lays out the day's five steps, with every point, beside a phone on its first screen", () => {
    render(<DayOnOnePhone />);
    expect(steps().map((step) => step.getAttribute("aria-labelledby"))).toEqual([
      "landing-order",
      "landing-due",
      "landing-bill",
      "landing-customers",
      "landing-numbers",
    ]);
    for (const [at, feature] of Object.values(text.features).entries()) {
      const step = screen.getByRole("listitem", { name: feature.title });
      expect(step).toHaveAttribute("data-state", at === 0 ? "current" : "next");
      for (const point of feature.points) expect(within(step).getByText(point)).toBeInTheDocument();
    }
    expect(screens()).toEqual(["current", "after", "after", "after", "after", "after"]);
    expect(screen.getByRole("img", { name: text.shots.order })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: text.shots.home })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: text.shots.home, hidden: true })).toBeInTheDocument();
  });

  it("marks what each screen is about, the bill's buttons with a pill", () => {
    const { container } = render(<DayOnOnePhone />);
    const spots = [...container.querySelectorAll<HTMLElement>(".day-spot")];
    expect(spots).toHaveLength(DAY_STOPS.length);
    expect(spots.map((spot) => spot.hasAttribute("data-pill"))).toEqual(
      DAY_STOPS.map((stop) => stop.enter === "sheet"),
    );
    expect(spots[0]).toHaveStyle({ left: "3.9%", top: "78.3%", width: "92.2%", height: "8.9%" });
  });

  it("turns the phone to each step as it crosses the middle of the screen, and back as the page scrolls up", () => {
    render(<DayOnOnePhone />);
    scrollTo([-500, 100, 300, 900, 1200, 1500]);
    expect(screens()).toEqual(["before", "under", "current", "after", "after", "after"]);
    expect(steps().map((step) => step.dataset.state)).toEqual(["done", "done", "current", "next", "next"]);
    expect(screen.getByRole("img", { name: text.shots.bill })).toBeInTheDocument();
    const dots = [...document.querySelectorAll(".day-dot")].map((dot) => dot.hasAttribute("data-current"));
    expect(dots).toEqual([false, false, true, false, false]);

    scrollTo([-2000, -1500, -1000, -600, -200, 100]);
    expect(screens()).toEqual(["before", "before", "before", "before", "before", "current"]);
    expect(steps().at(-1)).toHaveAttribute("data-state", "current");

    scrollTo([200, 900, 1200, 1500, 1800, 2100]);
    expect(screens()).toEqual(["current", "after", "after", "after", "after", "after"]);
  });

  it("on a phone, measures from the middle of the part under the pinned phone", () => {
    wide = false;
    render(<DayOnOnePhone />);
    // The screen is 768 high and the pinned phone ends at 400: the line is at 584.
    scrollTo([0, 500, 560, 700, 800, 900]);
    expect(screens()[2]).toBe("current");
    wide = true;
    scrollTo([0, 500, 560, 700, 800, 900]);
    expect(screens()[0]).toBe("current");
  });

  it("measures once a frame however much the page scrolls, and on a resize", () => {
    render(<DayOnOnePhone />);
    fireEvent.scroll(window);
    fireEvent.scroll(window);
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
    act(() => frames.splice(0).forEach((frame) => frame(0)));
    fireEvent(window, new Event("resize"));
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(2);
  });

  it("stops listening when it goes", () => {
    const { unmount } = render(<DayOnOnePhone />);
    fireEvent.scroll(window);
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);
    fireEvent.scroll(window);
    fireEvent(window, new Event("resize"));
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
  });
});
