import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StartBar } from "@/components/landing/StartBar";

let frames: FrameRequestCallback[] = [];

beforeEach(() => {
  frames = [];
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((frame) => frames.push(frame));
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
});

afterEach(() => vi.restoreAllMocks());

const runFrames = () => act(() => frames.splice(0).forEach((frame) => frame(0)));

/** A page with a place to start at its top and another near its end, and the bar between. */
function show() {
  return render(
    <>
      <div id="hero-start" />
      <StartBar after="hero-start" until="closing-start">
        <a href="/register">Create account</a>
      </StartBar>
      <div id="closing-start" />
    </>,
  );
}

/** The page scrolled so the hero's buttons end, and the closing band's begin, where given; then the frame runs. */
function scrollTo(heroBottom: number, closingTop: number) {
  document.getElementById("hero-start")!.getBoundingClientRect = () => ({ bottom: heroBottom }) as DOMRect;
  document.getElementById("closing-start")!.getBoundingClientRect = () => ({ top: closingTop }) as DOMRect;
  fireEvent.scroll(window);
  runFrames();
}

const bar = () => screen.getByRole("link", { name: "Create account", hidden: true }).closest(".landing-start-bar")!;

describe("StartBar", () => {
  it("stays down, out of reach, while the hero's buttons are on the screen", () => {
    show();
    expect(bar()).not.toHaveAttribute("data-shown");
    expect(bar()).toHaveAttribute("inert");
    scrollTo(200, 4000);
    expect(bar()).not.toHaveAttribute("data-shown");
  });

  it("comes up once they have gone above the screen, and goes again at the closing band", () => {
    show();
    scrollTo(-10, 4000);
    expect(bar()).toHaveAttribute("data-shown");
    expect(bar()).not.toHaveAttribute("inert");

    scrollTo(-3000, 500);
    expect(bar()).not.toHaveAttribute("data-shown");
    expect(bar()).toHaveAttribute("inert");

    // Back up the page, past the band: it comes up again.
    scrollTo(-1500, window.innerHeight + 1);
    expect(bar()).toHaveAttribute("data-shown");
  });

  it("measures once a frame however much the page scrolls, and on a resize", () => {
    show();
    fireEvent.scroll(window);
    fireEvent.scroll(window);
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
    runFrames();
    fireEvent(window, new Event("resize"));
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(2);
  });

  it("stops listening when it goes", () => {
    const { unmount } = show();
    fireEvent.scroll(window);
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);
    fireEvent.scroll(window);
    fireEvent(window, new Event("resize"));
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it("never comes up on a page without both places", () => {
    render(
      <StartBar after="hero-start" until="closing-start">
        <a href="/register">Create account</a>
      </StartBar>,
    );
    fireEvent.scroll(window);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    expect(bar()).toHaveAttribute("inert");
  });
});
