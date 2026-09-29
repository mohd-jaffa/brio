import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ app: true, step: "WENT_BACK" }));
const app = vi.hoisted(() => ({
  handler: undefined as ((event: { canGoBack: boolean }) => void) | undefined,
  remove: vi.fn(),
  exitApp: vi.fn(),
}));
vi.mock("@/lib/native/platform", () => ({ hasPlugins: (name: string) => state.app && name === "App" }));
vi.mock("@/lib/native/back", () => ({ goBack: vi.fn(() => state.step) }));
const reminders = vi.hoisted(() => ({ open: undefined as ((url: string) => void) | undefined, stop: vi.fn() }));
vi.mock("@/lib/native/reminders", () => ({
  onReminderTapped: (open: (url: string) => void) => {
    reminders.open = open;
    return reminders.stop;
  },
}));
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn(async (_event: string, handler: (event: { canGoBack: boolean }) => void) => {
      app.handler = handler;
      return { remove: app.remove };
    }),
    exitApp: app.exitApp,
  },
}));

import { goBack } from "@/lib/native/back";
import { NativeSetup } from "@/lib/native/NativeSetup";

beforeEach(() => {
  state.app = true;
  state.step = "WENT_BACK";
  app.handler = undefined;
  app.remove.mockClear();
  app.exitApp.mockClear();
  reminders.open = undefined;
  reminders.stop.mockClear();
  router.push.mockClear();
});

describe("NativeSetup", () => {
  it("steps the Android back button through goBack, and leaves the app where it says to", async () => {
    const { unmount } = render(<NativeSetup />);
    await waitFor(() => expect(app.handler).toBeDefined());

    app.handler!({ canGoBack: true });
    expect(goBack).toHaveBeenCalledWith(true);
    expect(app.exitApp).not.toHaveBeenCalled();

    state.step = "LEAVE";
    app.handler!({ canGoBack: false });
    expect(app.exitApp).toHaveBeenCalledOnce();

    unmount();
    expect(app.remove).toHaveBeenCalledOnce();
  });

  it("lets go of the listener even when it is taken down before the listener is there", async () => {
    const { unmount } = render(<NativeSetup />);
    unmount();
    await waitFor(() => expect(app.remove).toHaveBeenCalledOnce());
  });

  it("opens the order a tapped reminder is about, and stops listening when taken down", () => {
    const { unmount } = render(<NativeSetup />);
    reminders.open!("/orders/o-1");
    expect(router.push).toHaveBeenCalledWith("/orders/o-1");
    unmount();
    expect(reminders.stop).toHaveBeenCalledOnce();
  });

  it("does nothing in a browser", () => {
    state.app = false;
    const { container } = render(<NativeSetup />);
    expect(container).toBeEmptyDOMElement();
    expect(app.handler).toBeUndefined();
  });
});
