import { describe, expect, it } from "vitest";

import { ERROR_MESSAGES } from "@/constants/messages";

import { AppError, KIND_STATUS } from "@/lib/errors/AppError";

describe("AppError", () => {
  it("takes its wording from the catalogue and its status from its kind", () => {
    const error = new AppError({ kind: "CONFLICT", code: "CONFLICT" });

    expect(error.message).toBe(ERROR_MESSAGES.CONFLICT);
    expect(error.httpStatus).toBe(KIND_STATUS.CONFLICT);
    expect(error.traceId).toBeTruthy();
  });

  it("serialises only what is safe to send: no cause, no details", () => {
    const error = new AppError({
      kind: "INTERNAL",
      code: "INTERNAL_ERROR",
      cause: new Error("connection string"),
      details: { table: "orders" },
    });

    expect(Object.keys(error.toJSON()).sort()).toEqual(["code", "message", "traceId"]);
    expect(JSON.stringify(error.toJSON())).not.toContain("orders");
  });
});
