import { beforeEach, describe, expect, it, vi } from "vitest";

import { ERROR_LOG_LIMITS } from "@/constants/logs";

const { insert, from, logger, service } = vi.hoisted(() => {
  const insert = vi.fn();
  return {
    insert,
    from: vi.fn(() => ({ insert })),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    service: { fails: false },
  };
});
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceRoleClient: () => {
    if (service.fails) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing");
    return { from };
  },
}));
vi.mock("@/lib/logger", async (original) => ({
  ...(await original<typeof import("@/lib/logger")>()),
  logger,
}));

const { captureError } = await import("@/lib/audit/errorLog");

beforeEach(() => {
  vi.clearAllMocks();
  service.fails = false;
  insert.mockResolvedValue({ error: null });
});

const row = () => insert.mock.calls[0][0];

describe("captureError", () => {
  it("writes the failure through the server's own client, with where, who and what was thrown", async () => {
    const thrown = new Error("connection terminated");
    await captureError({
      source: "API",
      message: "API request failed",
      error: thrown,
      reference: "req_1",
      code: "INTERNAL_ERROR",
      kind: "internal",
      httpStatus: 500,
      method: "POST",
      path: "/api/orders",
      userId: "u-1",
      bakeryId: "b-1",
      context: { traceId: "t-1" },
    });
    expect(from).toHaveBeenCalledWith("error_logs");
    expect(row()).toEqual({
      source: "API",
      message: "API request failed",
      reference: "req_1",
      code: "INTERNAL_ERROR",
      kind: "internal",
      http_status: 500,
      method: "POST",
      path: "/api/orders",
      user_id: "u-1",
      bakery_id: "b-1",
      detail: "connection terminated",
      stack: thrown.stack,
      context: { traceId: "t-1" },
    });
    expect(logger.error).toHaveBeenCalledWith(
      "API request failed",
      expect.objectContaining({
        source: "API",
        code: "INTERNAL_ERROR",
        traceId: "t-1",
        detail: "connection terminated",
      }),
      "req_1",
    );
  });

  it("is the server's own work unless said, and leaves out what it was not told", async () => {
    await captureError({ message: "Could not send the confirmation email" });
    expect(row()).toEqual({
      source: "SERVER",
      message: "Could not send the confirmation email",
      reference: null,
      code: null,
      kind: null,
      http_status: null,
      method: null,
      path: null,
      user_id: null,
      bakery_id: null,
      detail: null,
      stack: null,
      context: null,
    });
  });

  it("writes out a thrown value that is not an Error", async () => {
    await captureError({ message: "a", error: "offline" });
    expect(row()).toMatchObject({ detail: "offline", stack: null });

    insert.mockClear();
    await captureError({ message: "b", error: { code: "08006", message: "connection lost" } });
    expect(row().detail).toBe('{"code":"08006","message":"connection lost"}');

    insert.mockClear();
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    await captureError({ message: "c", error: circular });
    expect(row().detail).toBe("[object Object]");
  });

  it("keeps a runaway message, path, detail or stack to its bound", async () => {
    const long = (length: number) => "x".repeat(length + 10);
    const thrown = new Error(long(ERROR_LOG_LIMITS.detail));
    thrown.stack = long(ERROR_LOG_LIMITS.stack);
    await captureError({ message: long(ERROR_LOG_LIMITS.message), path: long(ERROR_LOG_LIMITS.path), error: thrown });
    const written = row();
    expect(written.message).toHaveLength(ERROR_LOG_LIMITS.message);
    expect(written.message.endsWith("…")).toBe(true);
    expect(written.path).toHaveLength(ERROR_LOG_LIMITS.path);
    expect(written.detail).toHaveLength(ERROR_LOG_LIMITS.detail);
    expect(written.stack).toHaveLength(ERROR_LOG_LIMITS.stack);
  });

  it("never keeps a secret in the context", async () => {
    await captureError({
      message: "a",
      context: { password: "Password123!", nested: { accessToken: "t" }, jobId: "j-1" },
    });
    expect(row().context).toEqual({ password: "[Redacted]", nested: { accessToken: "[Redacted]" }, jobId: "j-1" });
  });

  it("never throws: a row that cannot be written is said in the output", async () => {
    insert.mockResolvedValue({ error: { code: "42501", message: "permission denied" } });
    await expect(captureError({ message: "a", reference: "req_2" })).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenLastCalledWith("Error log not written", { code: "42501" }, "req_2");

    service.fails = true;
    await expect(captureError({ message: "b" })).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenLastCalledWith(
      "Error log not written",
      { reason: "SUPABASE_SERVICE_ROLE_KEY is missing" },
      undefined,
    );

    service.fails = false;
    insert.mockRejectedValue("offline");
    await captureError({ message: "c" });
    expect(logger.error).toHaveBeenLastCalledWith("Error log not written", { reason: "offline" }, undefined);
  });
});
