import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const captureError = vi.hoisted(() => vi.fn());
vi.mock("@/lib/audit/errorLog", () => ({ captureError }));

const { onRequestError } = await import("@/instrumentation");

type Context = Parameters<typeof onRequestError>[2];
const context = (routeType: Context["routeType"]): Context => ({
  routerKind: "App Router",
  routePath: "/orders/[id]",
  routeType,
  renderSource: "react-server-components",
  revalidateReason: undefined,
});
const request = { path: "/orders/o-1?search=Anu", method: "GET", headers: {} };

beforeEach(() => {
  captureError.mockClear();
  vi.stubEnv("NEXT_RUNTIME", "nodejs");
});
afterEach(() => vi.unstubAllEnvs());

describe("onRequestError", () => {
  it("writes a screen the server could not draw to the error log, under the digest the person is shown", async () => {
    const error = Object.assign(new Error("fetch failed"), { digest: "3141592653" });
    await onRequestError(error, request, context("render"));
    expect(captureError).toHaveBeenCalledWith({
      source: "SCREEN",
      message: "Server could not finish a request",
      error,
      reference: "3141592653",
      method: "GET",
      path: "/orders/o-1",
      context: { routePath: "/orders/[id]", routeType: "render", renderSource: "react-server-components" },
    });
  });

  it("names a route's failure a request's, and anything else the server's own", async () => {
    await onRequestError(new Error("a"), request, context("route"));
    expect(captureError).toHaveBeenLastCalledWith(expect.objectContaining({ source: "API", reference: undefined }));
    await onRequestError("b", request, context("proxy"));
    expect(captureError).toHaveBeenLastCalledWith(expect.objectContaining({ source: "SERVER", error: "b" }));
  });

  it("does nothing outside Node, where the error log cannot be reached", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");
    await onRequestError(new Error("a"), request, context("render"));
    expect(captureError).not.toHaveBeenCalled();
  });
});
