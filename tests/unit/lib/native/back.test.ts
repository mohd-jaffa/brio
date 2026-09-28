import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { goBack } from "@/lib/native/back";

let at: string;

beforeEach(() => {
  at = "/orders";
  vi.spyOn(window, "location", "get").mockReturnValue({ pathname: at } as Location);
  vi.spyOn(window.history, "back").mockImplementation(() => undefined);
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

const place = (pathname: string) => vi.spyOn(window, "location", "get").mockReturnValue({ pathname } as Location);

describe("goBack", () => {
  it("closes an open list first, as Escape would, from wherever focus is", () => {
    document.body.innerHTML = '<button>Period</button><div popover="manual"></div><dialog open></dialog>';
    const panel = document.querySelector<HTMLElement>("[popover]")!;
    vi.spyOn(panel, "matches").mockImplementation((selector) => selector === ":popover-open");
    const control = document.querySelector("button")!;
    control.focus();
    const keys = vi.fn();
    control.addEventListener("keydown", (event) => keys(event.key));

    expect(goBack(true)).toBe("CLOSED_LIST");
    expect(keys).toHaveBeenCalledWith("Escape");
    expect(window.history.back).not.toHaveBeenCalled();
  });

  it("then the card or sheet on top, as Escape would", () => {
    document.body.innerHTML = '<dialog open id="form"></dialog><dialog open id="picker"></dialog>';
    const cancelled: string[] = [];
    document.querySelectorAll("dialog").forEach((dialog) => dialog.addEventListener("cancel", () => cancelled.push(dialog.id)));
    expect(goBack(true)).toBe("CLOSED_LAYER");
    expect(cancelled).toEqual(["picker"]);
  });

  it("then goes back a screen", () => {
    expect(goBack(true)).toBe("WENT_BACK");
    expect(window.history.back).toHaveBeenCalledOnce();
  });

  it("leaves the app on Home, on signing in, or with nowhere to go back to", () => {
    place("/");
    expect(goBack(true)).toBe("LEAVE");
    place("/login");
    expect(goBack(true)).toBe("LEAVE");
    place("/orders");
    expect(goBack(false)).toBe("LEAVE");
    expect(window.history.back).not.toHaveBeenCalled();
  });

  it("sends Escape to the page when nothing has focus", () => {
    document.body.innerHTML = '<div popover="manual"></div>';
    const panel = document.querySelector<HTMLElement>("[popover]")!;
    vi.spyOn(panel, "matches").mockReturnValue(true);
    (document.activeElement as HTMLElement | null)?.blur();
    vi.spyOn(document, "activeElement", "get").mockReturnValue(null);
    const keys = vi.fn();
    document.body.addEventListener("keydown", (event) => keys(event.key));
    expect(goBack(true)).toBe("CLOSED_LIST");
    expect(keys).toHaveBeenCalledWith("Escape");
  });
});
