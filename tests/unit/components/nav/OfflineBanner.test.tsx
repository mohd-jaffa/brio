import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OfflineBanner } from "@/components/nav/OfflineBanner";

const online = (value: boolean) => vi.spyOn(navigator, "onLine", "get").mockReturnValue(value);

afterEach(() => vi.restoreAllMocks());

describe("OfflineBanner", () => {
  it("is not there while the connection holds, nor on the server", () => {
    online(true);
    const { container } = render(<OfflineBanner />);
    expect(container).toBeEmptyDOMElement();
    expect(renderToString(<OfflineBanner />)).toBe("");
  });

  it("says so when the connection drops, and goes when it comes back", () => {
    const status = online(true);
    render(<OfflineBanner />);
    status.mockReturnValue(false);
    act(() => void window.dispatchEvent(new Event("offline")));
    expect(screen.getByRole("status")).toHaveTextContent("You’re offline. What’s on screen may be out of date.");

    status.mockReturnValue(true);
    act(() => void window.dispatchEvent(new Event("online")));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("loads the screen afresh on Try again", async () => {
    online(false);
    const reload = vi.fn();
    const { location } = window;
    Object.defineProperty(window, "location", { configurable: true, value: { ...location, reload } });
    render(<OfflineBanner />);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reload).toHaveBeenCalledOnce();
    Object.defineProperty(window, "location", { configurable: true, value: location });
  });
});
