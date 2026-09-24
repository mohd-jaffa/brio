import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { validationError } from "@/lib/errors";

import { createRequestId, normalizeApiError, readJson, withApiHandler } from "@/lib/api/handler";

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://x.test/api/thing", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("createRequestId", () => {
  it("keeps the id the caller sent, so one request has one id end to end", () => {
    expect(createRequestId(new Headers({ "x-request-id": "req_upstream" }))).toBe("req_upstream");
  });

  it("makes one when the caller sent none", () => {
    expect(createRequestId(new Headers())).toMatch(/^req_/);
  });
});

describe("readJson", () => {
  it("returns the parsed body when a schema is given", async () => {
    const schema = z.object({ name: z.string() });
    await expect(readJson(post({ name: "Meena" }), schema)).resolves.toEqual({ name: "Meena" });
  });

  it("refuses a body that is not JSON", async () => {
    await expect(readJson(post("{not json"))).rejects.toMatchObject({
      code: "VALIDATION_INVALID_JSON",
    });
  });

  it("lets a schema failure through as a ZodError", async () => {
    const schema = z.object({ name: z.string() });
    await expect(readJson(post({ name: 7 }), schema)).rejects.toBeInstanceOf(z.ZodError);
  });
});

describe("normalizeApiError", () => {
  it("turns a schema failure into a validation error naming each field", () => {
    const failure = z.object({ name: z.string() }).safeParse({});
    const error = normalizeApiError(failure.success ? null : failure.error);

    expect(error.kind).toBe("VALIDATION");
    expect(error.details).toEqual([{ path: "name", message: expect.any(String) }]);
  });

  it("passes an AppError through unchanged", () => {
    const original = validationError("VALIDATION_ERROR");
    expect(normalizeApiError(original)).toBe(original);
  });

  it("treats anything else as internal, keeping the cause off the response", () => {
    const error = normalizeApiError(new Error("a column is missing"));
    expect(error.kind).toBe("INTERNAL");
    expect(error.message).not.toContain("column");
  });
});

describe("withApiHandler", () => {
  it("answers success in the standard envelope", async () => {
    const response = await withApiHandler(post({}), async () => ({ id: "c-1" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, data: { id: "c-1" } });
  });

  it("uses the status the route asked for", async () => {
    const response = await withApiHandler(post({}), async () => ({ id: "c-1" }), {
      successStatus: 201,
    });
    expect(response.status).toBe(201);
  });

  it("answers a refusal in the failure envelope, with the request id", async () => {
    const request = post({}, { "x-request-id": "req_abc" });
    const response = await withApiHandler(request, async () => {
      throw validationError("VALIDATION_ERROR");
    });

    expect(response.status).toBe(400);
    expect(response.headers.get("x-request-id")).toBe("req_abc");
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "VALIDATION_ERROR", requestId: "req_abc" },
    });
  });

  it("never returns the internals of an unexpected failure", async () => {
    const response = await withApiHandler(post({}), async () => {
      throw new Error('relation "orders" does not exist');
    });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(JSON.stringify(body)).not.toContain("orders");
  });
});
