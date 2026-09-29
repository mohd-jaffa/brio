import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { api, key } = vi.hoisted(() => ({ api: { postJson: vi.fn() }, key: { value: "BAEC" } }));
vi.mock("@/lib/api/client", () => ({ postJson: api.postJson }));
vi.mock("@/lib/env/public", () => ({ publicVapidKey: () => key.value }));

import { renewWebPush, stopWebPush, turnOnWebPush, webPushPermission } from "@/lib/native/webPush";

const subscription = {
  toJSON: () => ({ endpoint: "https://push.example/d-1", keys: { p256dh: "key", auth: "auth" } }),
  unsubscribe: vi.fn(),
};

const browser = {
  permission: "default" as NotificationPermission,
  answer: "granted" as NotificationPermission,
  subscribed: null as typeof subscription | null,
  registration: true,
};
const pushManager = {
  getSubscription: vi.fn(async () => browser.subscribed),
  subscribe: vi.fn(async () => {
    browser.subscribed = subscription;
    return subscription;
  }),
};

beforeEach(() => {
  browser.permission = "default";
  browser.answer = "granted";
  browser.subscribed = null;
  browser.registration = true;
  key.value = "BAEC";
  api.postJson.mockReset().mockResolvedValue({ registered: true });
  subscription.unsubscribe.mockReset().mockImplementation(async () => {
    browser.subscribed = null;
    return true;
  });
  pushManager.getSubscription.mockClear();
  pushManager.subscribe.mockClear();
  vi.stubGlobal("PushManager", class {});
  const notification = Object.defineProperties(class {}, {
    permission: { get: () => browser.permission },
    requestPermission: { value: vi.fn(async () => (browser.permission = browser.answer)) },
  });
  vi.stubGlobal("Notification", notification);
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { getRegistration: vi.fn(async () => (browser.registration ? { pushManager } : undefined)) },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "serviceWorker");
});

describe("where web push can work", () => {
  it("is nowhere without push, without the app's key, or without a service worker in charge", async () => {
    browser.registration = false;
    expect(await webPushPermission()).toBe("UNSUPPORTED");
    expect(await turnOnWebPush()).toBe("UNSUPPORTED");

    browser.registration = true;
    key.value = "";
    expect(await webPushPermission()).toBe("UNSUPPORTED");

    key.value = "BAEC";
    vi.stubGlobal("PushManager", undefined);
    Reflect.deleteProperty(window, "PushManager");
    expect(await webPushPermission()).toBe("UNSUPPORTED");
  });
});

describe("webPushPermission", () => {
  it("is off until allowed and subscribed, on once both, and blocked once refused", async () => {
    expect(await webPushPermission()).toBe("OFF");
    browser.permission = "granted";
    expect(await webPushPermission()).toBe("OFF");
    browser.subscribed = subscription;
    expect(await webPushPermission()).toBe("ON");
    browser.permission = "denied";
    expect(await webPushPermission()).toBe("BLOCKED");
  });
});

describe("turnOnWebPush", () => {
  it("asks, subscribes with the app's key, and tells the server", async () => {
    expect(await turnOnWebPush()).toBe("ON");
    expect(pushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: Uint8Array.from([0x04, 0x01, 0x02]),
    });
    expect(api.postJson).toHaveBeenCalledWith("/api/notifications/devices", subscription.toJSON());
  });

  it("keeps a subscription the browser already has", async () => {
    browser.subscribed = subscription;
    expect(await turnOnWebPush()).toBe("ON");
    expect(pushManager.subscribe).not.toHaveBeenCalled();
  });

  it("subscribes to nothing when the browser is not allowed to", async () => {
    browser.answer = "denied";
    expect(await turnOnWebPush()).toBe("BLOCKED");
    browser.answer = "default";
    expect(await turnOnWebPush()).toBe("OFF");
    expect(pushManager.subscribe).not.toHaveBeenCalled();
    expect(api.postJson).not.toHaveBeenCalled();
  });

  it("drops the subscription again when the server cannot be told, and says so", async () => {
    api.postJson.mockRejectedValueOnce(new Error("offline"));
    await expect(turnOnWebPush()).rejects.toThrow("offline");
    expect(subscription.unsubscribe).toHaveBeenCalledOnce();
    expect(await webPushPermission()).toBe("OFF");
  });
});

describe("renewWebPush", () => {
  it("tells the server again as the app opens, only while on", async () => {
    await renewWebPush();
    expect(api.postJson).not.toHaveBeenCalled();

    browser.subscribed = subscription;
    browser.permission = "denied";
    await renewWebPush();
    expect(api.postJson).not.toHaveBeenCalled();

    browser.permission = "granted";
    await renewWebPush();
    expect(api.postJson).toHaveBeenCalledWith("/api/notifications/devices", subscription.toJSON());

    browser.registration = false;
    await expect(renewWebPush()).resolves.toBeUndefined();
  });
});

describe("stopWebPush", () => {
  it("stops this browser's pushes as the account leaves, and is quiet where there are none", async () => {
    await expect(stopWebPush()).resolves.toBeUndefined();
    browser.subscribed = subscription;
    await stopWebPush();
    expect(subscription.unsubscribe).toHaveBeenCalledOnce();
    expect(api.postJson).not.toHaveBeenCalled();
  });
});
