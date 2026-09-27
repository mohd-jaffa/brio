import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listenForInstall, stop, setUpServiceWorker, logger } = vi.hoisted(() => {
  const stop = vi.fn();
  return {
    stop,
    listenForInstall: vi.fn(() => stop),
    setUpServiceWorker: vi.fn(async () => {}),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  };
});
vi.mock("@/lib/pwa/install", () => ({ listenForInstall }));
vi.mock("@/lib/pwa/serviceWorker", () => ({ setUpServiceWorker }));
vi.mock("@/lib/logger", () => ({ logger }));

const { PwaSetup } = await import("@/lib/pwa/PwaSetup");

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_APP_VERSION", "0.1.0");
});

describe("PwaSetup", () => {
  it("listens for the browser's offer and sets up the worker for this release, drawing nothing", () => {
    const { container, unmount } = render(<PwaSetup />);
    expect(container).toBeEmptyDOMElement();
    expect(listenForInstall).toHaveBeenCalledOnce();
    expect(setUpServiceWorker).toHaveBeenCalledWith("0.1.0");
    unmount();
    expect(stop).toHaveBeenCalledOnce();
  });

  it("logs a worker that could not be set up, and carries on", async () => {
    setUpServiceWorker.mockRejectedValueOnce(new Error("blocked")).mockRejectedValueOnce("denied");
    const { unmount } = render(<PwaSetup />);
    await waitFor(() => expect(logger.warn).toHaveBeenCalledWith("The service worker could not be set up", { reason: "blocked" }));
    unmount();
    render(<PwaSetup />);
    await waitFor(() => expect(logger.warn).toHaveBeenLastCalledWith("The service worker could not be set up", { reason: "denied" }));
  });
});
