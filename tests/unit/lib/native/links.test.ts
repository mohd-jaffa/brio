import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ app: true }));
vi.mock("@/lib/native/platform", () => ({ hasPlugins: (name: string) => state.app && name === "App" }));

type Opened = (event: { url: string }) => void;
const app = vi.hoisted(() => ({ opened: undefined as Opened | undefined, remove: vi.fn(), addListener: vi.fn() }));
vi.mock("@capacitor/app", () => ({ App: { addListener: app.addListener } }));

import { onAppLinkOpened } from "@/lib/native/links";

beforeEach(() => {
  state.app = true;
  app.opened = undefined;
  app.remove.mockReset();
  app.addListener.mockReset().mockImplementation(async (_event: string, handler: Opened) => {
    app.opened = handler;
    return { remove: app.remove };
  });
});

describe("onAppLinkOpened", () => {
  it("opens the page a link of this site names, with its query and fragment", async () => {
    const open = vi.fn();
    const stop = onAppLinkOpened(open);
    await vi.waitFor(() => expect(app.opened).toBeDefined());
    expect(app.addListener).toHaveBeenCalledWith("appUrlOpen", expect.any(Function));

    app.opened!({ url: `${window.location.origin}/confirm-email?type=magiclink#access_token=t-1` });
    expect(open).toHaveBeenCalledWith("/confirm-email?type=magiclink#access_token=t-1");

    stop();
    expect(app.remove).toHaveBeenCalledOnce();
  });

  it("opens nothing of another site, or what is not an address", async () => {
    const open = vi.fn();
    onAppLinkOpened(open);
    await vi.waitFor(() => expect(app.opened).toBeDefined());

    for (const url of ["https://elsewhere.example/confirm-email", "not an address", "brio://confirm-email"]) {
      app.opened!({ url });
    }
    expect(open).not.toHaveBeenCalled();
  });

  it("lets go of the listener even when stopped before it is there", async () => {
    onAppLinkOpened(vi.fn())();
    await vi.waitFor(() => expect(app.remove).toHaveBeenCalledOnce());
  });

  it("listens for nothing in a browser, where the link simply opens", () => {
    state.app = false;
    onAppLinkOpened(vi.fn())();
    expect(app.addListener).not.toHaveBeenCalled();
  });
});
