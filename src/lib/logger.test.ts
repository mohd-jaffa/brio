import { afterEach, describe, expect, it, vi } from "vitest";

import { logger, redactSensitive } from "./logger";

afterEach(() => vi.restoreAllMocks());

describe("redactSensitive", () => {
  it("hides anything that looks like a credential, however deep", () => {
    expect(
      redactSensitive({
        phone: "+919876543210",
        password: "secret",
        nested: { accessToken: "t", service_role_key: "k", apiKey: "a" },
      }),
    ).toEqual({
      phone: "+919876543210",
      password: "[Redacted]",
      nested: { accessToken: "[Redacted]", service_role_key: "[Redacted]", apiKey: "[Redacted]" },
    });
  });

  it("walks into arrays", () => {
    expect(redactSensitive([{ token: "t" }])).toEqual([{ token: "[Redacted]" }]);
  });

  it("stops before a cycle can run away", () => {
    const deep = { level: 0, next: null as unknown };
    let node = deep;
    for (let depth = 1; depth < 12; depth += 1) {
      const child = { level: depth, next: null as unknown };
      node.next = child;
      node = child;
    }
    expect(JSON.stringify(redactSensitive(deep))).toContain("[MaxDepth]");
  });
});

describe("logger", () => {
  it("writes one structured line per record, carrying the request id", () => {
    const write = vi.spyOn(console, "info").mockImplementation(() => {});

    logger.info("customer created", { password: "secret" }, "req_1");

    const record = JSON.parse(write.mock.calls[0][0] as string);
    expect(record).toMatchObject({ level: "info", message: "customer created", requestId: "req_1" });
    expect(record.context.password).toBe("[Redacted]");
  });

  it("sends warnings and failures to their own streams", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.warn("slow query");
    logger.error("write failed");

    expect(warn).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledOnce();
  });
});
