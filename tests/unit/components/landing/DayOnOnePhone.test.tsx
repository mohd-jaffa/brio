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
  // The component keeps the query it asked for, and reads it as the screen changes.
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      get matches() {
        return wide;
      },
    })),
  );
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((frame) => frames.push(frame));
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
  // Every marker starts below the screen, as it does when the page opens.
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ top: 10_000 } as DOMRect);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const runFrames = () => act(() => frames.splice(0).forEach((frame) => frame(0)));

/** The page scrolled so each marker's top is where given, the day with them; then the frame the scroll asked for runs. */
function scrollTo(tops: number[]) {
  document.querySelector<HTMLElement>(".day")!.getBoundingClientRect = () => ({ top: tops[0] - 200 }) as DOMRect;
  document.querySelectorAll<HTMLElement>("[data-stop]").forEach((marker, at) => {
    marker.getBoundingClientRect = () => ({ top: tops[at] }) as DOMRect;
  });
  fireEvent.scroll(window);
  runFrames();
}

const screens = () => [...document.querySelectorAll<HTMLElement>(".day-screen")].map((each) => each.dataset.state);
const steps = () => screen.getAllByRole("listitem").filter((item) => item.classList.contains("day-step"));
const shelfOf = (title: string) =>
  screen.getByRole("listitem", { name: title }).querySelector<HTMLElement>(".day-shelf")!;

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
  it("lays out the day's six steps, with every point, and each step's own screens below it", () => {
    render(<DayOnOnePhone />);
    expect(steps().map((step) => step.getAttribute("aria-labelledby"))).toEqual([
      "landing-order",
      "landing-due",
      "landing-bill",
      "landing-customers",
      "landing-numbers",
      "landing-expenses",
    ]);
    for (const [at, feature] of Object.values(text.features).entries()) {
      const step = screen.getByRole("listitem", { name: feature.title });
      expect(step).toHaveAttribute("data-state", at === 0 ? "current" : "next");
      for (const point of feature.points) expect(within(step).getByText(point)).toBeInTheDocument();
    }
    expect(within(shelfOf(text.features.bill.title)).getByRole("img", { name: text.shots.bill })).toBeInTheDocument();
    // Knowing where you stand shows the stock and the numbers side by side.
    const numbers = within(shelfOf(text.features.numbers.title)).getAllByRole("img");
    expect(numbers.map((image) => image.getAttribute("alt"))).toEqual([text.shots.inventory, text.shots.analytics]);
    expect(numbers[0]).toHaveAttribute("loading", "lazy");
  });

  it("holds the phone beside the steps on a wide screen, every screen on hand by the time the day is near", () => {
    render(<DayOnOnePhone />);
    // Far down the page, only the first screen is drawn, and fetched when near.
    expect(screens()).toEqual(["current"]);
    scrollTo([700, 1200, 1700, 2200, 2700, 3200, 3700]);
    expect(screens()).toEqual(["current", "after", "after", "after", "after", "after", "after"]);
    const stage = document.querySelector<HTMLElement>(".day-stage")!;
    expect(within(stage).getByRole("img", { name: text.shots.order })).toHaveAttribute("loading", "lazy");
    expect(within(stage).queryByRole("img", { name: text.shots.home })).not.toBeInTheDocument();
    expect(within(stage).getByRole("img", { name: text.shots.home, hidden: true })).toHaveAttribute("loading", "eager");
  });

  it("draws only the first of the held phone's screens on a narrow screen, and none turns", () => {
    wide = false;
    render(<DayOnOnePhone />);
    expect(screens()).toEqual(["current"]);
    scrollTo([-600, -500, -400, -300, -200, -100, 0]);
    expect(screens()).toEqual(["current"]);
    expect(steps()[0]).toHaveAttribute("data-state", "current");

    // Turned on its side, or a window made wider: the rest come.
    wide = true;
    scrollTo([-600, -500, -400, -300, -200, -100, 0]);
    expect(screens()).toHaveLength(DAY_STOPS.length);
  });

  it("marks what each screen is about, the bill's buttons with a pill", () => {
    const { container } = render(<DayOnOnePhone />);
    scrollTo([700, 1200, 1700, 2200, 2700, 3200, 3700]);
    const spots = [...container.querySelectorAll<HTMLElement>(".day-spot")];
    expect(spots).toHaveLength(DAY_STOPS.length);
    expect(spots.map((spot) => spot.hasAttribute("data-pill"))).toEqual(
      DAY_STOPS.map((stop) => stop.enter === "sheet"),
    );
    expect(spots[0]).toHaveStyle({ left: "3.9%", top: "78.3%", width: "92.2%", height: "8.9%" });
  });

  it("turns the phone to each step as it crosses the middle of the screen, and back as the page scrolls up", () => {
    render(<DayOnOnePhone />);
    scrollTo([-500, 100, 300, 900, 1200, 1500, 1800]);
    expect(screens()).toEqual(["before", "under", "current", "after", "after", "after", "after"]);
    expect(steps().map((step) => step.dataset.state)).toEqual(["done", "done", "current", "next", "next", "next"]);
    const stage = document.querySelector<HTMLElement>(".day-stage")!;
    expect(within(stage).getByRole("img", { name: text.shots.bill })).toBeInTheDocument();

    // The numbers' two screens: the stock as the step comes, analytics as its lines are read.
    scrollTo([-2000, -1500, -1000, -600, 100, 500, 900]);
    expect(screens()).toEqual(["before", "before", "before", "before", "current", "after", "after"]);
    scrollTo([-2000, -1500, -1000, -600, -200, 100, 900]);
    expect(screens().at(5)).toBe("current");
    expect(steps().at(4)).toHaveAttribute("data-state", "current");

    scrollTo([-2400, -2000, -1500, -1000, -600, -300, 100]);
    expect(screens()).toEqual(["before", "before", "before", "before", "before", "before", "current"]);
    expect(steps().at(-1)).toHaveAttribute("data-state", "current");
    expect(
      within(document.querySelector<HTMLElement>(".day-stage")!).getByRole("img", { name: text.shots.expenses }),
    ).toBeInTheDocument();

    scrollTo([200, 900, 1200, 1500, 1800, 2100, 2400]);
    expect(screens()).toEqual(["current", "after", "after", "after", "after", "after", "after"]);
  });

  it("measures once a frame however much the page scrolls, and on a resize", () => {
    render(<DayOnOnePhone />);
    fireEvent.scroll(window);
    fireEvent.scroll(window);
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
    runFrames();
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
