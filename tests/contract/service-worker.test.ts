import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The service worker's contract (public/sw.js; plan §139.19 R7.2): what it
 * keeps, what it never keeps, and when it answers with the offline page. The
 * file runs here in a scope shaped like a worker's, with caches and the
 * network faked.
 */
const SOURCE = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");
const ORIGIN = "https://app.test";

type Handler = (event: Record<string, unknown>) => void;

function worker(version = "0.1.0") {
  const handlers: Record<string, Handler> = {};
  const stores = new Map<string, Map<string, Response>>();
  const keyOf = (request: Request | string) => (typeof request === "string" ? new URL(request, ORIGIN).href : request.url);
  const store = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const entries = stores.get(name)!;
    return {
      match: async (request: Request | string) => entries.get(keyOf(request))?.clone(),
      put: async (request: Request | string, answer: Response) => void entries.set(keyOf(request), answer),
      add: async (request: Request | string) => {
        const answer = await network(typeof request === "string" ? new Request(new URL(request, ORIGIN)) : request);
        entries.set(keyOf(request), answer);
      },
    };
  };
  const caches = {
    open: async (name: string) => store(name),
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    match: async (request: Request | string) => {
      for (const entries of stores.values()) {
        const found = entries.get(keyOf(request));
        if (found) return found.clone();
      }
      return undefined;
    },
  };
  const network = vi.fn(async (request: Request) => {
    const answer = new Response(`from the network: ${new URL(request.url).pathname}`, { status: 200 });
    Object.defineProperty(answer, "type", { value: "basic" });
    return answer;
  });
  const self = {
    location: { href: `${ORIGIN}/sw.js?v=${version}`, origin: ORIGIN },
    addEventListener: (type: string, handler: Handler) => void (handlers[type] = handler),
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}) },
  };
  // A worker's Request reads a path against the worker's own address, as the browser's does.
  class WorkerRequest extends Request {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      super(typeof input === "string" ? new URL(input, ORIGIN) : input, init);
    }
  }
  runInNewContext(SOURCE, {
    self,
    caches,
    fetch: (request: Request) => network(request),
    URL,
    Request: WorkerRequest,
    Response,
    Promise,
  });

  /** Dispatches one event, and waits for what it asked the browser to wait for. */
  async function dispatch(type: string, extra: Record<string, unknown> = {}) {
    let waited: Promise<unknown> = Promise.resolve();
    let answered: Promise<Response> | undefined;
    handlers[type]({
      ...extra,
      waitUntil: (promise: Promise<unknown>) => void (waited = promise),
      respondWith: (promise: Promise<Response>) => void (answered = promise),
    });
    await waited;
    return answered;
  }

  return { dispatch, network, stores };
}

const get = (path: string, mode = "cors") => {
  const request = new Request(`${ORIGIN}${path}`);
  Object.defineProperty(request, "mode", { value: mode });
  return request;
};

let sw: ReturnType<typeof worker>;

beforeEach(() => {
  sw = worker();
});

describe("the service worker", () => {
  it("keeps the offline page as it installs, fetched without the session's cookies", async () => {
    await sw.dispatch("install");
    const [request] = sw.network.mock.calls[0];
    expect(new URL(request.url).pathname).toBe("/offline");
    expect(request.credentials).toBe("omit");
    expect([...sw.stores.keys()]).toEqual(["brio-static-0.1.0"]);
  });

  it("clears every other cache as it takes charge: an older release's, or one under an earlier name", async () => {
    const older = worker("0.0.9");
    await older.dispatch("install");
    const stores = older.stores;
    stores.set("brio-static-0.1.0", new Map());
    stores.set("earlier-static-0.0.8", new Map());
    // The new release's worker, over the same caches.
    const current = worker("0.1.0");
    for (const [name, entries] of stores) current.stores.set(name, entries);
    await current.dispatch("activate");
    expect([...current.stores.keys()]).toEqual(["brio-static-0.1.0"]);
  });

  it("keeps the app's own unchanging files, and serves them from the cache after", async () => {
    await sw.dispatch("install");
    const first = await sw.dispatch("fetch", { request: get("/_next/static/chunks/app.js") });
    expect(await first!.text()).toBe("from the network: /_next/static/chunks/app.js");
    sw.network.mockClear();
    const again = await sw.dispatch("fetch", { request: get("/_next/static/chunks/app.js") });
    expect(await again!.text()).toBe("from the network: /_next/static/chunks/app.js");
    expect(sw.network).not.toHaveBeenCalled();
    for (const path of ["/fonts/bill/Inter.ttf", "/icons/icon-512.png"]) {
      expect(await sw.dispatch("fetch", { request: get(path) })).toBeDefined();
    }
  });

  it("does not keep a file that did not come back whole", async () => {
    sw.network.mockResolvedValueOnce(new Response("gone", { status: 404 }));
    await sw.dispatch("fetch", { request: get("/_next/static/missing.js") });
    await sw.dispatch("fetch", { request: get("/_next/static/missing.js") });
    expect(sw.network).toHaveBeenCalledTimes(2);
  });

  it("never touches the API, another site's files, or anything but a read", async () => {
    expect(await sw.dispatch("fetch", { request: get("/api/orders") })).toBeUndefined();
    const elsewhere = new Request("https://cdn.example.com/_next/static/x.js");
    expect(await sw.dispatch("fetch", { request: elsewhere })).toBeUndefined();
    expect(await sw.dispatch("fetch", { request: new Request(`${ORIGIN}/api/orders`, { method: "POST" }) })).toBeUndefined();
  });

  it("asks the network for every screen, and keeps none of them", async () => {
    await sw.dispatch("install");
    const answer = await sw.dispatch("fetch", { request: get("/orders", "navigate") });
    expect(await answer!.text()).toBe("from the network: /orders");
    const kept = [...sw.stores.values()].flatMap((entries) => [...entries.keys()]);
    expect(kept).toEqual([`${ORIGIN}/offline`]);
  });

  it("answers a screen the network cannot reach with the offline page", async () => {
    await sw.dispatch("install");
    sw.network.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const answer = await sw.dispatch("fetch", { request: get("/customers", "navigate") });
    expect(await answer!.text()).toBe("from the network: /offline");
  });

  it("passes the failure on when it has no offline page to show yet", async () => {
    sw.network.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(sw.dispatch("fetch", { request: get("/customers", "navigate") })).rejects.toThrow("Failed to fetch");
  });

  it("keeps the files the page loaded before it ran — the app's own only, once each, whatever fails", async () => {
    await sw.dispatch("install");
    sw.network.mockClear();
    sw.network.mockRejectedValueOnce(new TypeError("offline"));
    await sw.dispatch("message", {
      data: {
        type: "KEEP_FILES",
        urls: [`${ORIGIN}/_next/static/broken.js`, `${ORIGIN}/_next/static/css/app.css`, `${ORIGIN}/api/orders`, 42],
      },
    });
    const fetched = sw.network.mock.calls.map(([request]) => new URL(request.url).pathname);
    expect(fetched).toEqual(["/_next/static/broken.js", "/_next/static/css/app.css"]);

    sw.network.mockClear();
    await sw.dispatch("message", { data: { type: "KEEP_FILES", urls: [`${ORIGIN}/_next/static/css/app.css`] } });
    expect(sw.network).not.toHaveBeenCalled();
  });

  it("ignores any other message", async () => {
    expect(await sw.dispatch("message", { data: { type: "SOMETHING_ELSE" } })).toBeUndefined();
    expect(await sw.dispatch("message", { data: null })).toBeUndefined();
    expect(sw.network).not.toHaveBeenCalled();
  });

  it("names its caches for version 0 when the page gave none", async () => {
    const unnamed = worker("");
    await unnamed.dispatch("install");
    expect([...unnamed.stores.keys()]).toEqual(["brio-static-0"]);
  });
});
