import { describe, expect, it } from "vitest";

import { shellServer } from "@/lib/native/shell";

describe("shellServer", () => {
  it("loads a release from its HTTPS origin, whatever path was given", () => {
    expect(shellServer("https://app.brio.in/orders?x=1")).toEqual({
      url: "https://app.brio.in",
      host: "app.brio.in",
      cleartext: false,
    });
  });

  it("allows plain http only for a development server on a private address", () => {
    for (const address of [
      "http://10.0.2.2:3000",
      "http://localhost:3000",
      "http://192.168.1.20:3000",
      "http://172.20.0.5",
    ]) {
      expect(shellServer(address).cleartext).toBe(true);
    }
    expect(() => shellServer("http://app.brio.in")).toThrow(/only for a development server/);
    expect(() => shellServer("http://172.40.0.5")).toThrow(/only for a development server/);
  });

  it("says what is wrong with a missing or unusable address", () => {
    expect(() => shellServer(undefined)).toThrow(/ANDROID_APP_URL is not set/);
    expect(() => shellServer("")).toThrow(/ANDROID_APP_URL is not set/);
    expect(() => shellServer("app.brio.in")).toThrow(/not an address/);
    expect(() => shellServer("ftp://app.brio.in")).toThrow(/must be https/);
  });
});
